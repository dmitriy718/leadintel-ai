import { eq, desc, sql, gte, and } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { websiteVisitors } from "@db/schema";
import { ensureTrackingKey } from "./lib/tracking";

export const visitorRouter = createRouter({
  getTrackingKey: authedQuery.query(async ({ ctx }) => {
    const key = await ensureTrackingKey(ctx.user.id);
    return { trackingKey: key };
  }),

  list: authedQuery
    .input(
      (val: unknown) => {
        const v = val as Record<string, unknown>;
        return {
          limit: Math.min(100, Math.max(1, Number(v?.limit ?? 50))),
          offset: Math.max(0, Number(v?.offset ?? 0)),
        };
      }
    )
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const rows = await db
        .select()
        .from(websiteVisitors)
        .where(eq(websiteVisitors.userId, ctx.user.id))
        .orderBy(desc(websiteVisitors.lastSeenAt))
        .limit(input.limit)
        .offset(input.offset);

      return rows;
    }),

  stats: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const [total] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(websiteVisitors)
      .where(eq(websiteVisitors.userId, ctx.user.id));

    const [uniqueOrgs] = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${websiteVisitors.org})` })
      .from(websiteVisitors)
      .where(eq(websiteVisitors.userId, ctx.user.id));

    const [today] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(websiteVisitors)
      .where(
        and(eq(websiteVisitors.userId, ctx.user.id), gte(websiteVisitors.lastSeenAt, sql`CURDATE()`))
      );

    return {
      totalVisitors: total?.count ?? 0,
      uniqueCompanies: uniqueOrgs?.count ?? 0,
      todayVisitors: today?.count ?? 0,
    };
  }),
});
