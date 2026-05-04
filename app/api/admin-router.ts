import { eq, sql, desc, and, isNull, lte } from "drizzle-orm";
import { createRouter, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { users, emailQueue, campaigns, leads, payments } from "@db/schema";
import { processEmailQueue } from "./lib/email-sequences";

export const adminRouter = createRouter({
  stats: adminQuery.query(async () => {
    const db = getDb();
    const [campaignCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(campaigns);
    const [leadCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(leads);
    const [userCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(users);
    const [revenue] = await db
      .select({ total: sql<number>`COALESCE(SUM(${payments.amountCents}), 0)` })
      .from(payments)
      .where(eq(payments.status, "succeeded"));

    return {
      campaigns: campaignCount?.count ?? 0,
      leads: leadCount?.count ?? 0,
      users: userCount?.count ?? 0,
      revenueCents: revenue?.total ?? 0,
    };
  }),

  users: adminQuery
    .input(
      (val: unknown) => {
        const v = val as Record<string, unknown>;
        return {
          limit: Math.min(100, Math.max(1, Number(v?.limit ?? 20))),
          offset: Math.max(0, Number(v?.offset ?? 0)),
        };
      }
    )
    .query(async ({ input }) => {
      const db = getDb();
      const rows = await db
        .select({
          id: users.id,
          username: users.username,
          name: users.name,
          email: users.email,
          role: users.role,
          emailVerified: users.emailVerified,
          creditsBalance: users.creditsBalance,
          createdAt: users.createdAt,
        })
        .from(users)
        .orderBy(desc(users.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return rows;
    }),

  emailQueue: adminQuery
    .input(
      (val: unknown) => {
        const v = val as Record<string, unknown>;
        return {
          limit: Math.min(100, Math.max(1, Number(v?.limit ?? 50))),
          offset: Math.max(0, Number(v?.offset ?? 0)),
          pendingOnly: Boolean(v?.pendingOnly),
        };
      }
    )
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = input.pendingOnly
        ? and(isNull(emailQueue.sentAt), lte(emailQueue.scheduledAt, new Date()))
        : undefined;

      const rows = await db
        .select()
        .from(emailQueue)
        .where(conditions)
        .orderBy(desc(emailQueue.scheduledAt))
        .limit(input.limit)
        .offset(input.offset);

      return rows;
    }),

  processEmailQueue: adminQuery.mutation(async () => {
    return processEmailQueue(50);
  }),
});
