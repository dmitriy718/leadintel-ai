import { eq, lt, and } from "drizzle-orm";
import { getDb } from "../queries/connection";
import { leads, scrapingJobs } from "@db/schema";
import { scoreLead } from "./scoring";
import { SCRAPERS, type ChannelName } from "./scrapers";
import { awardScrapePoints } from "../gamification-router";

export interface RunScrapeInput {
  campaignId: number;
  jobId: number;
  keywords: string[];
  channels: string[];
  maxResultsPerChannel?: number;
  userId?: number;
}

function makeLeadFingerprint(raw: { sourceUrl: string; username: string | null | undefined }): string {
  return `${raw.sourceUrl}::${raw.username ?? "anon"}`;
}

const SCRAPER_TIMEOUT_MS = 30000; // 30 seconds per channel

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

/** Mark jobs that have been running for too long as failed */
export async function recoverStuckJobs(maxAgeMinutes = 5) {
  const db = getDb();
  const cutoff = new Date(Date.now() - maxAgeMinutes * 60 * 1000);
  try {
    await db
      .update(scrapingJobs)
      .set({
        status: "failed",
        errorMessage: `Job timed out after ${maxAgeMinutes} minutes`,
        completedAt: new Date(),
      })
      .where(
        and(eq(scrapingJobs.status, "running"), lt(scrapingJobs.startedAt, cutoff))
      );
  } catch (e) {
    console.error("Failed to recover stuck jobs:", e);
  }
}

export async function runScrapingJob(input: RunScrapeInput) {
  const { campaignId, jobId, keywords, channels, maxResultsPerChannel = 15 } = input;
  const db = getDb();
  let totalLeads = 0;
  let totalScore = 0;

  try {
    // Preload existing lead fingerprints for this campaign to avoid duplicates
    const existingLeads = await db
      .select({ sourceUrl: leads.sourceUrl, username: leads.username })
      .from(leads)
      .where(eq(leads.campaignId, campaignId));
    const seen = new Set(existingLeads.map((l) => makeLeadFingerprint(l)));

    for (const channel of channels) {
      const scraper = SCRAPERS[channel as ChannelName];
      if (!scraper) continue;

      try {
        const rawLeads = await withTimeout(
          scraper({ keywords, maxResults: maxResultsPerChannel }),
          SCRAPER_TIMEOUT_MS,
          `Scraper ${channel}`
        );

        for (const raw of rawLeads) {
          const fingerprint = makeLeadFingerprint(raw);
          if (seen.has(fingerprint)) continue;
          seen.add(fingerprint);

          const scoringResult = scoreLead({
            content: raw.content,
            title: raw.title || "",
            keywords,
            source: raw.source,
            postedAt: raw.postedAt,
            engagement: raw.engagementMetrics,
          });

          if (scoringResult.score < 0.2) continue;

          await db.insert(leads).values({
            campaignId,
            jobId,
            source: raw.source,
            sourceUrl: raw.sourceUrl,
            username: raw.username,
            displayName: raw.displayName,
            content: raw.content,
            title: raw.title || null,
            score: scoringResult.score,
            keywordMatches: scoringResult.keywordMatches,
            metadata: {
              ...raw.metadata,
              scoreBreakdown: scoringResult.breakdown,
            },
            profileUrl: raw.profileUrl || null,
            contactInfo: raw.contactInfo || null,
            engagementMetrics: raw.engagementMetrics || null,
            postedAt: raw.postedAt,
          });

          totalLeads++;
          totalScore += scoringResult.score;
        }
      } catch (channelError) {
        console.error(`Scraper error for ${channel}:`, channelError);
        // Continue with other channels — partial success is still useful
      }
    }

    await db
      .update(scrapingJobs)
      .set({
        status: "completed",
        leadsFound: totalLeads,
        avgScore: totalLeads > 0 ? totalScore / totalLeads : 0,
        completedAt: new Date(),
      })
      .where(eq(scrapingJobs.id, jobId));

    if (input.userId) {
      await awardScrapePoints(input.userId).catch(console.error);
    }

    return { totalLeads, avgScore: totalLeads > 0 ? totalScore / totalLeads : 0 };
  } catch (fatalError) {
    console.error("Scraping job fatal error:", fatalError);
    await db
      .update(scrapingJobs)
      .set({
        status: "failed",
        errorMessage: fatalError instanceof Error ? fatalError.message : String(fatalError),
        completedAt: new Date(),
      })
      .where(eq(scrapingJobs.id, jobId));
    return { totalLeads, avgScore: 0, error: fatalError };
  }
}
