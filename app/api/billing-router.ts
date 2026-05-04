import { z } from "zod";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import Stripe from "stripe";
import { getDb } from "./queries/connection";
import { subscriptions } from "@db/schema";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { env } from "./lib/env";
import { getUserPlan, getTodayUsage, getMonthlyUsage, getCreditsBalance, PLANS } from "./lib/usage";

const stripe = env.stripeSecretKey ? new Stripe(env.stripeSecretKey, { apiVersion: "2025-02-24.acacia" }) : null;

export const billingRouter = createRouter({
  getPriceIds: publicQuery.query(() => {
    return {
      starter: env.stripePriceIdStarter,
      starterAnnual: env.stripePriceIdStarterAnnual,
      pro: env.stripePriceIdPro,
      proAnnual: env.stripePriceIdProAnnual,
      enterprise: env.stripePriceIdEnterprise,
      enterpriseAnnual: env.stripePriceIdEnterpriseAnnual,
      creditsSmall: env.stripePriceIdCreditsSmall,
      creditsMedium: env.stripePriceIdCreditsMedium,
    };
  }),

  getPlan: authedQuery.query(async ({ ctx }) => {
    const planId = await getUserPlan(ctx.user.id);
    const plan = PLANS[planId];

    // Free tier shows monthly usage; paid tiers show daily usage
    const creditsBalance = await getCreditsBalance(ctx.user.id);

    if (planId === "free") {
      const monthlyUsage = await getMonthlyUsage(ctx.user.id);
      const monthlyLimit = PLANS.free.monthlyScrapes;
      return {
        planId,
        planName: plan.name,
        limit: monthlyLimit,
        usage: monthlyUsage,
        remaining: Math.max(0, monthlyLimit - monthlyUsage),
        price: plan.price,
        period: "month" as const,
        creditsBalance,
      };
    }

    const usage = await getTodayUsage(ctx.user.id);
    return {
      planId,
      planName: plan.name,
      limit: plan.dailyScrapes,
      usage: usage?.scrapesUsed ?? 0,
      remaining: plan.dailyScrapes === Infinity ? Infinity : Math.max(0, plan.dailyScrapes - (usage?.scrapesUsed ?? 0)),
      price: plan.price,
      period: "day" as const,
      creditsBalance,
    };
  }),

  createCheckoutSession: authedQuery
    .input(z.object({ priceId: z.string(), mode: z.enum(["subscription", "payment"]).default("subscription") }))
    .mutation(async ({ input, ctx }) => {
      if (!stripe) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Stripe not configured" });
      }

      const db = getDb();
      let customerId: string | undefined;

      const [sub] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, ctx.user.id))
        .limit(1);

      if (sub?.stripeCustomerId) {
        customerId = sub.stripeCustomerId;
      } else {
        const customer = await stripe.customers.create({
          email: ctx.user.email ?? undefined,
          name: ctx.user.name ?? undefined,
          metadata: { userId: String(ctx.user.id) },
        });
        customerId = customer.id;
      }

      const isPayment = input.mode === "payment";
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        line_items: [{ price: input.priceId, quantity: 1 }],
        mode: isPayment ? "payment" : "subscription",
        success_url: `${ctx.req.headers.get("origin")}/billing?success=1`,
        cancel_url: `${ctx.req.headers.get("origin")}/billing?canceled=1`,
        metadata: { userId: String(ctx.user.id), mode: input.mode },
      });

      return { url: session.url };
    }),

  createPortalSession: authedQuery.mutation(async ({ ctx }) => {
    if (!stripe) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Stripe not configured" });
    }

    const db = getDb();
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, ctx.user.id))
      .limit(1);

    if (!sub?.stripeCustomerId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "No active subscription" });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${ctx.req.headers.get("origin")}/billing`,
    });

    return { url: session.url };
  }),
});
