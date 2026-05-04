import { Hono } from "hono";
import { eq, desc, and } from "drizzle-orm";
import { getDb } from "./queries/connection";
import { users, campaigns, leads, scrapingJobs } from "@db/schema";
import { getUserPlan, getMonthlyUsage, getTodayUsage, PLANS } from "./lib/usage";
import { canScrape, incrementUsage, deductCredit } from "./lib/usage";
import { runScrapingJob } from "./lib/scraping-orchestrator";

type Variables = {
  apiUserId: number;
};

const restApi = new Hono<{ Variables: Variables }>();

// API key auth middleware
restApi.use("/*", async (c, next) => {
  const auth = c.req.header("authorization");
  const apiKey = auth?.replace(/^Bearer\s+/i, "").trim();

  if (!apiKey) {
    return c.json({ error: "Missing API key. Use: Authorization: Bearer <key>" }, 401);
  }

  const db = getDb();
  const [user] = await db
    .select({ id: users.id, username: users.username, email: users.email, name: users.name, role: users.role })
    .from(users)
    .where(eq(users.apiKey, apiKey))
    .limit(1);

  if (!user) {
    return c.json({ error: "Invalid API key" }, 401);
  }

  c.set("apiUserId", user.id);
  await next();
});

// GET /api/v1/campaigns
restApi.get("/campaigns", async (c) => {
  const userId = c.get("apiUserId") as number;
  const db = getDb();
  const rows = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.userId, userId))
    .orderBy(desc(campaigns.createdAt));
  return c.json({ campaigns: rows });
});

// GET /api/v1/campaigns/:id
restApi.get("/campaigns/:id", async (c) => {
  const userId = c.get("apiUserId") as number;
  const campaignId = parseInt(c.req.param("id"));
  if (isNaN(campaignId)) return c.json({ error: "Invalid campaign ID" }, 400);

  const db = getDb();
  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId)))
    .limit(1);

  if (!campaign) return c.json({ error: "Campaign not found" }, 404);
  return c.json({ campaign });
});

// GET /api/v1/campaigns/:id/leads
restApi.get("/campaigns/:id/leads", async (c) => {
  const userId = c.get("apiUserId") as number;
  const campaignId = parseInt(c.req.param("id"));
  if (isNaN(campaignId)) return c.json({ error: "Invalid campaign ID" }, 400);

  const db = getDb();
  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId)))
    .limit(1);
  if (!campaign) return c.json({ error: "Campaign not found" }, 404);

  const limit = Math.min(100, Math.max(1, parseInt(c.req.query("limit") ?? "50")));
  const offset = Math.max(0, parseInt(c.req.query("offset") ?? "0"));

  const rows = await db
    .select()
    .from(leads)
    .where(eq(leads.campaignId, campaignId))
    .orderBy(desc(leads.score))
    .limit(limit)
    .offset(offset);

  return c.json({ leads: rows, limit, offset });
});

// POST /api/v1/campaigns/:id/scrape
restApi.post("/campaigns/:id/scrape", async (c) => {
  const userId = c.get("apiUserId") as number;
  const campaignId = parseInt(c.req.param("id"));
  if (isNaN(campaignId)) return c.json({ error: "Invalid campaign ID" }, 400);

  const quota = await canScrape(userId);
  if (!quota.allowed) {
    return c.json({ error: "Scrape limit reached", quota }, 429);
  }

  const usingCredits = quota.remaining === 0 && quota.creditsBalance > 0;
  if (quota.remaining === 0 && !usingCredits && quota.overageCost > 0) {
    return c.json({ error: "Quota exceeded. Buy credits or upgrade." }, 402);
  }

  const db = getDb();
  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId)))
    .limit(1);

  if (!campaign) return c.json({ error: "Campaign not found" }, 404);

  let body: { maxResultsPerChannel?: number } = {};
  try { body = await c.req.json(); } catch { /* ignore */ }
  const maxResults = Math.min(50, Math.max(1, body.maxResultsPerChannel ?? 15));

  const [jobResult] = await db.insert(scrapingJobs).values({
    campaignId,
    status: "running",
    channelsScraped: campaign.channels,
    leadsFound: 0,
  });

  const jobId = Number(jobResult.insertId);

  await incrementUsage(userId, usingCredits);
  if (usingCredits) await deductCredit(userId);

  runScrapingJob({
    campaignId,
    jobId,
    keywords: campaign.keywords,
    channels: campaign.channels,
    maxResultsPerChannel: maxResults,
    userId,
  }).catch(console.error);

  return c.json({ jobId, status: "running" });
});

// GET /api/v1/leads
restApi.get("/leads", async (c) => {
  const userId = c.get("apiUserId") as number;
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query("limit") ?? "50")));
  const offset = Math.max(0, parseInt(c.req.query("offset") ?? "0"));

  const db = getDb();
  const userCampaigns = await db
    .select({ id: campaigns.id })
    .from(campaigns)
    .where(eq(campaigns.userId, userId));

  const campaignIds = userCampaigns.map((c) => c.id);
  if (campaignIds.length === 0) return c.json({ leads: [], limit, offset });

  const rows = await db
    .select()
    .from(leads)
    .where(and(...campaignIds.map((id) => eq(leads.campaignId, id))))
    .orderBy(desc(leads.score))
    .limit(limit)
    .offset(offset);

  return c.json({ leads: rows, limit, offset });
});

// GET /api/v1/usage
restApi.get("/usage", async (c) => {
  const userId = c.get("apiUserId") as number;
  const planId = await getUserPlan(userId);
  const plan = PLANS[planId];
  const today = await getTodayUsage(userId);
  const monthly = await getMonthlyUsage(userId);

  return c.json({
    plan: { id: planId, name: plan.name, dailyLimit: plan.dailyScrapes, monthlyLimit: planId === "free" ? PLANS.free.monthlyScrapes : null },
    today: { used: today?.scrapesUsed ?? 0 },
    month: { used: monthly },
  });
});

// GET /api/v1/docs
restApi.get("/docs", (c) => {
  return c.json({
    name: "LeadIntel AI API",
    version: "1.0.0",
    baseUrl: "/api/v1",
    authentication: "Bearer token via Authorization header",
    endpoints: [
      { method: "GET", path: "/campaigns", description: "List all campaigns" },
      { method: "GET", path: "/campaigns/:id", description: "Get a campaign by ID" },
      { method: "GET", path: "/campaigns/:id/leads", description: "List leads for a campaign" },
      { method: "POST", path: "/campaigns/:id/scrape", description: "Start a scrape job" },
      { method: "GET", path: "/leads", description: "List all leads across campaigns" },
      { method: "GET", path: "/usage", description: "Get current usage stats" },
    ],
  });
});

export default restApi;
