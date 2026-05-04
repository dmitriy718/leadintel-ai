import { authRouter } from "./auth-router";
import { campaignRouter } from "./campaign-router";
import { leadRouter } from "./lead-router";
import { scrapeRouter } from "./scrape-router";
import { billingRouter } from "./billing-router";
import { gamificationRouter } from "./gamification-router";
import { adminRouter } from "./admin-router";
import { visitorRouter } from "./visitor-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  campaign: campaignRouter,
  lead: leadRouter,
  scrape: scrapeRouter,
  billing: billingRouter,
  gamification: gamificationRouter,
  admin: adminRouter,
  visitor: visitorRouter,
});

export type AppRouter = typeof appRouter;
