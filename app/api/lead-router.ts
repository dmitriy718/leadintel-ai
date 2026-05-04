import { z } from "zod";
import { eq, desc, and, gte, lte, like, or, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getDb } from "./queries/connection";
import { leads, campaigns } from "@db/schema";
import { createRouter, authedQuery } from "./middleware";

export const leadRouter = createRouter({
  list: authedQuery
    .input(
      z.object({
        campaignId: z.number().optional(),
        source: z.string().optional(),
        minScore: z.number().min(0).max(1).optional(),
        maxScore: z.number().min(0).max(1).optional(),
        isFavorite: z.boolean().optional(),
        search: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const conditions = [];

      if (input.campaignId) {
        conditions.push(eq(leads.campaignId, input.campaignId));
      }
      if (input.source) {
        conditions.push(eq(leads.source, input.source));
      }
      if (input.minScore !== undefined) {
        conditions.push(gte(leads.score, input.minScore));
      }
      if (input.maxScore !== undefined) {
        conditions.push(lte(leads.score, input.maxScore));
      }
      if (input.isFavorite !== undefined) {
        conditions.push(eq(leads.isFavorite, input.isFavorite));
      }
      if (input.search) {
        const s = `%${input.search}%`;
        conditions.push(
          or(
            like(leads.content, s),
            like(leads.username, s),
            like(leads.displayName, s),
            like(leads.title, s)
          )
        );
      }

      // Ensure user owns the campaign
      const userCampaigns = await db
        .select({ id: campaigns.id })
        .from(campaigns)
        .where(eq(campaigns.userId, ctx.user.id));
      const campaignIds: number[] = userCampaigns.map((c: { id: number }) => c.id);
      if (campaignIds.length === 0) return { leads: [], total: 0 };

      if (input.campaignId && !campaignIds.includes(input.campaignId)) {
        return { leads: [], total: 0 };
      }

      if (!input.campaignId) {
        const idPlaceholders = campaignIds.map((_id: number, idx: number) => sql`${campaignIds[idx]}`);
        conditions.push(sql`${leads.campaignId} IN (${sql.join(idPlaceholders, sql`, `)})`);
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const items = await db.query.leads.findMany({
        where: whereClause,
        orderBy: desc(leads.score),
        limit: input.limit,
        offset: input.offset,
      });

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(leads)
        .where(whereClause);

      return { leads: items, total: countResult[0]?.count || 0 };
    }),

  get: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const lead = await db.query.leads.findFirst({
        where: eq(leads.id, input.id),
      });
      if (!lead) return null;
      // Verify user owns the campaign this lead belongs to
      const campaign = await db.query.campaigns.findFirst({
        where: and(
          eq(campaigns.id, lead.campaignId),
          eq(campaigns.userId, ctx.user.id)
        ),
      });
      if (!campaign) return null;
      return lead;
    }),

  toggleFavorite: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const lead = await db.query.leads.findFirst({
        where: eq(leads.id, input.id),
      });
      if (!lead) return { success: false };

      const campaign = await db.query.campaigns.findFirst({
        where: and(eq(campaigns.id, lead.campaignId), eq(campaigns.userId, ctx.user.id)),
      });
      if (!campaign) throw new TRPCError({ code: "FORBIDDEN", message: "Not your lead" });

      await db
        .update(leads)
        .set({ isFavorite: !lead.isFavorite })
        .where(eq(leads.id, input.id));
      return { success: true, isFavorite: !lead.isFavorite };
    }),

  updateNotes: authedQuery
    .input(z.object({ id: z.number(), notes: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const lead = await db.query.leads.findFirst({
        where: eq(leads.id, input.id),
      });
      if (!lead) return { success: false };

      const campaign = await db.query.campaigns.findFirst({
        where: and(eq(campaigns.id, lead.campaignId), eq(campaigns.userId, ctx.user.id)),
      });
      if (!campaign) throw new TRPCError({ code: "FORBIDDEN", message: "Not your lead" });

      await db
        .update(leads)
        .set({ notes: input.notes })
        .where(eq(leads.id, input.id));
      return { success: true };
    }),

  stats: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const userCampaigns = await db
      .select({ id: campaigns.id })
      .from(campaigns)
      .where(eq(campaigns.userId, ctx.user.id));
    const campaignIds: number[] = userCampaigns.map((c: { id: number }) => c.id);
    if (campaignIds.length === 0) {
      return {
        totalLeads: 0,
        avgScore: 0,
        bySource: [],
        favoriteCount: 0,
        recentLeads: 0,
      };
    }

    const campaignIdFilter = sql`${leads.campaignId} IN (${sql.join(
      campaignIds.map((_id: number, idx: number) => sql`${campaignIds[idx]}`),
      sql`, `
    )})`;

    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(campaignIdFilter);

    const avgResult = await db
      .select({ avg: sql<number>`avg(${leads.score})` })
      .from(leads)
      .where(campaignIdFilter);

    const favoriteResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(and(campaignIdFilter, eq(leads.isFavorite, true)));

    const recentResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(
        and(
          campaignIdFilter,
          gte(leads.createdAt, sql`DATE_SUB(NOW(), INTERVAL 7 DAY)`)
        )
      );

    const bySource = await db
      .select({
        source: leads.source,
        count: sql<number>`count(*)`,
        avgScore: sql<number>`avg(${leads.score})`,
      })
      .from(leads)
      .where(campaignIdFilter)
      .groupBy(leads.source);

    return {
      totalLeads: totalResult[0]?.count || 0,
      avgScore: Math.round((avgResult[0]?.avg || 0) * 1000) / 1000,
      bySource,
      favoriteCount: favoriteResult[0]?.count || 0,
      recentLeads: recentResult[0]?.count || 0,
    };
  }),
});
