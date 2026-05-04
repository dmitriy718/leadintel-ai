import { z } from "zod";
import { eq, desc, and, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getDb } from "./queries/connection";
import { campaigns, scrapingJobs } from "@db/schema";
import { createRouter, authedQuery } from "./middleware";
import { runScrapingJob, recoverStuckJobs } from "./lib/scraping-orchestrator";
import { CHANNEL_LABELS } from "./lib/scrapers";
import { canScrape, incrementUsage, deductCredit } from "./lib/usage";

export const scrapeRouter = createRouter({
  run: authedQuery
    .input(
      z.object({
        campaignId: z.number(),
        maxResultsPerChannel: z.number().min(1).max(50).default(15),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      // Check usage quota
      const quota = await canScrape(ctx.user.id);
      if (!quota.allowed) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `${quota.period === "month" ? "Monthly" : "Daily"} scrape limit reached. Upgrade your plan to continue.`,
        });
      }

      // If over free limit, check credits or require payment
      const usingCredits = quota.remaining === 0 && quota.creditsBalance > 0;
      if (quota.remaining === 0 && !usingCredits && quota.overageCost > 0) {
        throw new TRPCError({
          code: "PAYMENT_REQUIRED",
          message: `You've used your ${quota.limit} free scrapes this ${quota.period}. Buy credits or upgrade your plan to continue.`,
        });
      }

      const campaign = await db.query.campaigns.findFirst({
        where: and(
          eq(campaigns.id, input.campaignId),
          eq(campaigns.userId, ctx.user.id)
        ),
      });

      if (!campaign) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Campaign not found",
        });
      }

      // Increment usage and deduct credit if used
      await incrementUsage(ctx.user.id, usingCredits);
      if (usingCredits) {
        await deductCredit(ctx.user.id);
      }

      // Update campaign lastRunAt
      await db.update(campaigns)
        .set({ lastRunAt: new Date() })
        .where(eq(campaigns.id, input.campaignId));

      // Create scraping job
      const [jobResult] = await db.insert(scrapingJobs).values({
        campaignId: input.campaignId,
        status: "running",
        channelsScraped: campaign.channels,
        leadsFound: 0,
      });
      const jobId = Number(jobResult.insertId);

      // Run scraping asynchronously (fire-and-forget is acceptable here)
      runScrapingJob({
        campaignId: input.campaignId,
        jobId,
        keywords: campaign.keywords,
        channels: campaign.channels,
        maxResultsPerChannel: input.maxResultsPerChannel,
        userId: ctx.user.id,
      }).catch(console.error);

      return { jobId, status: "running" };
    }),

  jobs: authedQuery
    .input(z.object({ campaignId: z.number() }).optional())
    .query(async ({ input, ctx }) => {
      const db = getDb();

      // Auto-recover jobs stuck in "running" for > 5 minutes
      await recoverStuckJobs(5);

      const userCampaigns = await db
        .select({ id: campaigns.id })
        .from(campaigns)
        .where(eq(campaigns.userId, ctx.user.id));
      const campaignIds: number[] = userCampaigns.map((c: { id: number }) => c.id);

      if (campaignIds.length === 0) return [];

      const conditions = [];
      if (input?.campaignId) {
        conditions.push(eq(scrapingJobs.campaignId, input.campaignId));
      } else if (campaignIds.length > 0) {
        conditions.push(inArray(scrapingJobs.campaignId, campaignIds));
      }

      return db.query.scrapingJobs.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        orderBy: desc(scrapingJobs.startedAt),
        limit: 50,
      });
    }),

  jobStatus: authedQuery
    .input(z.object({ jobId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const job = await db.query.scrapingJobs.findFirst({
        where: eq(scrapingJobs.id, input.jobId),
      });
      if (!job) return null;
      const campaign = await db.query.campaigns.findFirst({
        where: and(eq(campaigns.id, job.campaignId), eq(campaigns.userId, ctx.user.id)),
      });
      if (!campaign) throw new TRPCError({ code: "FORBIDDEN", message: "Not your job" });
      return job;
    }),

  channels: authedQuery.query(() => {
    return Object.entries(CHANNEL_LABELS).map(([key, label]) => ({
      id: key,
      name: label,
    }));
  }),
});
