import { z } from "zod";
import { eq, desc, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getDb } from "./queries/connection";
import { campaigns, leads, scrapingJobs } from "@db/schema";
import { createRouter, authedQuery } from "./middleware";

export const campaignRouter = createRouter({
  list: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db.query.campaigns.findMany({
      where: eq(campaigns.userId, ctx.user.id),
      orderBy: desc(campaigns.createdAt),
      with: {
        jobs: {
          orderBy: desc(scrapingJobs.startedAt),
          limit: 1,
        },
      },
    });
  }),

  get: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const campaign = await db.query.campaigns.findFirst({
        where: and(
          eq(campaigns.id, input.id),
          eq(campaigns.userId, ctx.user.id)
        ),
        with: {
          jobs: {
            orderBy: desc(scrapingJobs.startedAt),
          },
        },
      });
      return campaign;
    }),

  create: authedQuery
    .input(
      z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        keywords: z.array(z.string().min(1)).min(1).max(20),
        channels: z.array(z.string().min(1)).min(1).max(9),
        status: z.enum(["active", "paused", "draft"]).default("draft"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      try {
        const [campaign] = await db.insert(campaigns).values({
          userId: ctx.user.id,
          name: input.name,
          description: input.description,
          keywords: input.keywords,
          channels: input.channels,
          status: input.status,
        });
        return { id: Number(campaign.insertId), ...input };
      } catch (error: any) {
        console.error("[campaign.create] Insert failed:", error);
        if (error?.cause) {
          console.error("[campaign.create] Underlying cause:", error.cause);
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Database error: ${error?.cause?.message || error?.message || "Unable to create campaign"}`,
        });
      }
    }),

  update: authedQuery
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        keywords: z.array(z.string().min(1)).min(1).max(20).optional(),
        channels: z.array(z.string().min(1)).min(1).max(9).optional(),
        status: z.enum(["active", "paused", "completed", "draft"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const { id, ...updates } = input;
      await db
        .update(campaigns)
        .set(updates)
        .where(and(eq(campaigns.id, id), eq(campaigns.userId, ctx.user.id)));
      return { success: true };
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      // Verify ownership first
      const campaign = await db.query.campaigns.findFirst({
        where: and(eq(campaigns.id, input.id), eq(campaigns.userId, ctx.user.id)),
      });
      if (!campaign) return { success: false };

      // Cascade delete leads and jobs first
      await db.delete(leads).where(eq(leads.campaignId, input.id));
      await db.delete(scrapingJobs).where(eq(scrapingJobs.campaignId, input.id));
      await db.delete(campaigns).where(eq(campaigns.id, input.id));
      return { success: true };
    }),
});
