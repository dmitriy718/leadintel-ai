import type { Context } from "hono";
import Stripe from "stripe";
import { eq, sql } from "drizzle-orm";
import { env } from "./lib/env";
import { getDb } from "./queries/connection";
import { subscriptions, payments, users } from "@db/schema";

const stripe = env.stripeSecretKey ? new Stripe(env.stripeSecretKey, { apiVersion: "2025-02-24.acacia" }) : null;

export async function handleStripeWebhook(c: Context) {
  if (!stripe) {
    return c.json({ error: "Stripe not configured" }, 500);
  }

  const signature = c.req.header("stripe-signature");
  if (!signature) {
    return c.json({ error: "Missing signature" }, 400);
  }

  const body = await c.req.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, env.stripeWebhookSecret);
  } catch (err: any) {
    return c.json({ error: `Webhook signature verification failed: ${err.message}` }, 400);
  }

  const db = getDb();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId ? parseInt(session.metadata.userId) : null;
      if (!userId) break;

      const mode = session.metadata?.mode ?? "subscription";

      if (mode === "payment") {
        // One-time credit purchase
        const lineItem = session.line_items?.data[0] ?? (await stripe.checkout.sessions.listLineItems(session.id)).data[0];
        const priceId = lineItem?.price?.id;
        const creditsToAdd = getCreditsFromPrice(priceId);

        if (creditsToAdd > 0) {
          await db.update(users)
            .set({ creditsBalance: sql`${users.creditsBalance} + ${creditsToAdd}` })
            .where(eq(users.id, userId));
        }

        await db.insert(payments).values({
          userId,
          stripePaymentIntentId: session.payment_intent as string,
          amountCents: session.amount_total ?? 0,
          currency: session.currency ?? "usd",
          type: "credit_purchase",
          description: `${creditsToAdd} scrape credits`,
          status: "succeeded",
        });
      } else {
        // Subscription
        const sub = await stripe.subscriptions.retrieve(session.subscription as string);
        const priceId = sub.items.data[0]?.price.id;
        const planId = priceId ? getPlanIdFromPrice(priceId) : null;

        await db.insert(subscriptions).values({
          userId,
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: sub.id,
          stripePriceId: priceId,
          status: sub.status as any,
          planId: planId ?? undefined,
          currentPeriodStart: new Date(sub.current_period_start * 1000),
          currentPeriodEnd: new Date(sub.current_period_end * 1000),
          cancelAtPeriodEnd: sub.cancel_at_period_end,
        }).onDuplicateKeyUpdate({
          set: {
            stripeSubscriptionId: sub.id,
            stripePriceId: priceId,
            status: sub.status as any,
            planId: planId ?? undefined,
            currentPeriodStart: new Date(sub.current_period_start * 1000),
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
            cancelAtPeriodEnd: sub.cancel_at_period_end,
          },
        });
      }
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : null;
      let userId = 0;
      if (subscriptionId) {
        const [sub] = await db
          .select({ userId: subscriptions.userId })
          .from(subscriptions)
          .where(eq(subscriptions.stripeSubscriptionId, subscriptionId))
          .limit(1);
        if (sub) userId = sub.userId;
      }
      await db.insert(payments).values({
        userId,
        stripePaymentIntentId: invoice.payment_intent as string,
        amountCents: invoice.amount_paid,
        currency: invoice.currency,
        type: "subscription",
        description: `Invoice ${invoice.number}`,
        status: "succeeded",
      });
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const [existing] = await db.select().from(subscriptions).where(eq(subscriptions.stripeSubscriptionId, sub.id)).limit(1);
      if (existing) {
        await db.update(subscriptions)
          .set({
            status: sub.status as any,
            cancelAtPeriodEnd: sub.cancel_at_period_end,
            currentPeriodStart: new Date(sub.current_period_start * 1000),
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
          })
          .where(eq(subscriptions.stripeSubscriptionId, sub.id));
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await db.update(subscriptions)
        .set({ status: "canceled" })
        .where(eq(subscriptions.stripeSubscriptionId, sub.id));
      break;
    }
  }

  return c.json({ received: true });
}

function getPlanIdFromPrice(priceId: string): string | null {
  const map: Record<string, string> = {
    [env.stripePriceIdStarter]: "starter",
    [env.stripePriceIdStarterAnnual]: "starter",
    [env.stripePriceIdPro]: "pro",
    [env.stripePriceIdProAnnual]: "pro",
    [env.stripePriceIdEnterprise]: "enterprise",
    [env.stripePriceIdEnterpriseAnnual]: "enterprise",
  };
  return map[priceId] ?? null;
}

function getCreditsFromPrice(priceId: string | undefined): number {
  if (!priceId) return 0;
  const map: Record<string, number> = {
    [env.stripePriceIdCreditsSmall]: 50,
    [env.stripePriceIdCreditsMedium]: 200,
  };
  return map[priceId] ?? 0;
}
