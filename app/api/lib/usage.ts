import { eq, and, sql } from "drizzle-orm";
import { getDb } from "../queries/connection";
import { usageLogs, subscriptions, users } from "@db/schema";

export const PLANS = {
  free: { id: "free", name: "Free", price: 0, dailyScrapes: 5, monthlyScrapes: 150, overageRate: 200 }, // cents
  starter: { id: "starter", name: "Starter", price: 2900, dailyScrapes: 50, overageRate: 100 },
  pro: { id: "pro", name: "Pro", price: 7900, dailyScrapes: 200, overageRate: 50 },
  enterprise: { id: "enterprise", name: "Enterprise", price: 19900, dailyScrapes: Infinity, overageRate: 0 },
} as const;

export type PlanId = keyof typeof PLANS;

function getTodayDate() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getTodayUsage(userId: number) {
  const db = getDb();
  const today = getTodayDate();

  const rows = await db
    .select()
    .from(usageLogs)
    .where(and(eq(usageLogs.userId, userId), eq(usageLogs.date, today)))
    .limit(1);

  return rows[0] ?? null;
}

export async function getOrCreateTodayUsage(userId: number) {
  const db = getDb();
  const today = getTodayDate();

  const existing = await getTodayUsage(userId);
  if (existing) return existing;

  await db.insert(usageLogs).values({
    userId,
    date: today,
    scrapesUsed: 0,
    scrapesPaid: 0,
    amountSpentCents: 0,
  });

  const rows = await db
    .select()
    .from(usageLogs)
    .where(and(eq(usageLogs.userId, userId), eq(usageLogs.date, today)))
    .limit(1);

  return rows[0];
}

export async function incrementUsage(userId: number, isPaid: boolean = false, amountCents: number = 0) {
  const db = getDb();
  const today = getTodayDate();

  const updateData: Record<string, unknown> = {
    scrapesUsed: sql`${usageLogs.scrapesUsed} + 1`,
  };
  if (isPaid) {
    updateData.scrapesPaid = sql`${usageLogs.scrapesPaid} + 1`;
  }
  if (amountCents > 0) {
    updateData.amountSpentCents = sql`${usageLogs.amountSpentCents} + ${amountCents}`;
  }

  await db
    .update(usageLogs)
    .set(updateData as any)
    .where(and(eq(usageLogs.userId, userId), eq(usageLogs.date, today)));
}

export async function getUserPlan(userId: number): Promise<PlanId> {
  const db = getDb();
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  if (sub && sub.status === "active" && sub.planId && sub.planId in PLANS) {
    return sub.planId as PlanId;
  }

  return "free";
}

export async function getMonthlyUsage(userId: number) {
  const db = getDb();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const rows = await db
    .select({ total: sql<number>`COALESCE(SUM(${usageLogs.scrapesUsed}), 0)` })
    .from(usageLogs)
    .where(
      and(
        eq(usageLogs.userId, userId),
        sql`${usageLogs.date} >= ${startOfMonth}`
      )
    );

  return rows[0]?.total ?? 0;
}

export async function getCreditsBalance(userId: number) {
  const db = getDb();
  const [row] = await db
    .select({ creditsBalance: users.creditsBalance })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row?.creditsBalance ?? 0;
}

export async function deductCredit(userId: number) {
  const db = getDb();
  await db
    .update(users)
    .set({ creditsBalance: sql`${users.creditsBalance} - 1` })
    .where(eq(users.id, userId));
}

export async function canScrape(userId: number): Promise<{
  allowed: boolean;
  planId: PlanId;
  usage: number;
  limit: number;
  remaining: number;
  overageCost: number;
  period: "day" | "month";
  creditsBalance: number;
}> {
  const planId = await getUserPlan(userId);
  const plan = PLANS[planId];

  const creditsBalance = await getCreditsBalance(userId);

  // Free tier uses monthly quota; paid tiers use daily quota
  if (planId === "free") {
    const monthlyUsage = await getMonthlyUsage(userId);
    const monthlyLimit = PLANS.free.monthlyScrapes;
    const remaining = Math.max(0, monthlyLimit - monthlyUsage);

    if (remaining > 0) {
      return { allowed: true, planId, usage: monthlyUsage, limit: monthlyLimit, remaining, overageCost: 0, period: "month", creditsBalance };
    }

    // Out of monthly quota — can use credits
    if (creditsBalance > 0) {
      return { allowed: true, planId, usage: monthlyUsage, limit: monthlyLimit, remaining: 0, overageCost: 0, period: "month", creditsBalance };
    }

    return {
      allowed: true,
      planId,
      usage: monthlyUsage,
      limit: monthlyLimit,
      remaining: 0,
      overageCost: plan.overageRate,
      period: "month",
      creditsBalance,
    };
  }

  // Paid tiers: daily quota
  const usageRow = await getOrCreateTodayUsage(userId);
  const usage = usageRow.scrapesUsed;
  const remaining = Math.max(0, plan.dailyScrapes - usage);

  if (planId === "enterprise") {
    return { allowed: true, planId, usage, limit: plan.dailyScrapes, remaining: Infinity, overageCost: 0, period: "day", creditsBalance };
  }

  if (remaining > 0) {
    return { allowed: true, planId, usage, limit: plan.dailyScrapes, remaining, overageCost: 0, period: "day", creditsBalance };
  }

  // Out of daily quota — can use credits
  if (creditsBalance > 0) {
    return { allowed: true, planId, usage, limit: plan.dailyScrapes, remaining: 0, overageCost: 0, period: "day", creditsBalance };
  }

  return {
    allowed: true,
    planId,
    usage,
    limit: plan.dailyScrapes,
    remaining: 0,
    overageCost: plan.overageRate,
    period: "day",
    creditsBalance,
  };
}
