import {
  mysqlTable,
  serial,
  varchar,
  text,
  timestamp,
  json,
  float,
  bigint,
  mysqlEnum,
  boolean,
  date,
  int,
  index,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  passwordChangedAt: timestamp("passwordChangedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
  creditsBalance: int("creditsBalance").default(0).notNull(),
  referralCode: varchar("referralCode", { length: 20 }).unique(),
  referredBy: bigint("referredBy", { mode: "number", unsigned: true }),
  emailVerified: boolean("emailVerified").default(false).notNull(),
  trackingKey: varchar("trackingKey", { length: 32 }).unique(),
  apiKey: varchar("apiKey", { length: 64 }).unique(),
}, (table) => ({
  referralCodeIdx: uniqueIndex("referral_code_idx").on(table.referralCode),
  trackingKeyIdx: uniqueIndex("tracking_key_idx").on(table.trackingKey),
  apiKeyIdx: uniqueIndex("api_key_idx").on(table.apiKey),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const authCredentials = mysqlTable("auth_credentials", {
  userId: bigint("userId", { mode: "number", unsigned: true })
    .notNull()
    .primaryKey(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  mustChangePassword: boolean("mustChangePassword").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type AuthCredential = typeof authCredentials.$inferSelect;
export type InsertAuthCredential = typeof authCredentials.$inferInsert;

export const campaigns = mysqlTable("campaigns", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  keywords: json("keywords").notNull().$type<string[]>(),
  channels: json("channels").notNull().$type<string[]>(),
  status: mysqlEnum("status", ["active", "paused", "completed", "draft"])
    .default("draft")
    .notNull(),
  lastRunAt: timestamp("lastRunAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
}, (table) => ({
  userIdx: index("campaigns_user_idx").on(table.userId),
}));

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = typeof campaigns.$inferInsert;

export const scrapingJobs = mysqlTable("scraping_jobs", {
  id: serial("id").primaryKey(),
  campaignId: bigint("campaignId", { mode: "number", unsigned: true }).notNull(),
  status: mysqlEnum("status", ["pending", "running", "completed", "failed"])
    .default("pending")
    .notNull(),
  channelsScraped: json("channelsScraped").notNull().$type<string[]>(),
  leadsFound: bigint("leadsFound", { mode: "number", unsigned: true }).default(0),
  avgScore: float("avgScore"),
  errorMessage: text("errorMessage"),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
}, (table) => ({
  campaignIdx: index("scraping_jobs_campaign_idx").on(table.campaignId),
}));

export type ScrapingJob = typeof scrapingJobs.$inferSelect;
export type InsertScrapingJob = typeof scrapingJobs.$inferInsert;

export const leads = mysqlTable("leads", {
  id: serial("id").primaryKey(),
  campaignId: bigint("campaignId", { mode: "number", unsigned: true }).notNull(),
  jobId: bigint("jobId", { mode: "number", unsigned: true }).notNull(),
  source: varchar("source", { length: 50 }).notNull(),
  sourceUrl: text("sourceUrl").notNull(),
  username: varchar("username", { length: 255 }),
  displayName: varchar("displayName", { length: 255 }),
  content: text("content").notNull(),
  title: varchar("title", { length: 500 }),
  score: float("score").notNull(),
  keywordMatches: json("keywordMatches").notNull().$type<string[]>(),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  profileUrl: text("profileUrl"),
  contactInfo: json("contactInfo").$type<{
    email?: string;
    website?: string;
    phone?: string;
    location?: string;
  }>(),
  engagementMetrics: json("engagementMetrics").$type<{
    upvotes?: number;
    replies?: number;
    views?: number;
    followers?: number;
  }>(),
  isFavorite: boolean("isFavorite").default(false),
  isArchived: boolean("isArchived").default(false),
  notes: text("notes"),
  postedAt: timestamp("postedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  campaignIdx: index("leads_campaign_idx").on(table.campaignId),
  sourceIdx: index("leads_source_idx").on(table.source),
  scoreIdx: index("leads_score_idx").on(table.score),
}));

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

export const usageLogs = mysqlTable("usage_logs", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  date: date("date").notNull(),
  scrapesUsed: int("scrapesUsed").default(0).notNull(),
  scrapesPaid: int("scrapesPaid").default(0).notNull(),
  amountSpentCents: int("amountSpentCents").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
}, (table) => ({
  userIdx: index("usage_logs_user_idx").on(table.userId),
  dateIdx: index("usage_logs_date_idx").on(table.date),
}));

export type UsageLog = typeof usageLogs.$inferSelect;
export type InsertUsageLog = typeof usageLogs.$inferInsert;

export const subscriptions = mysqlTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull().unique(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  stripePriceId: varchar("stripePriceId", { length: 255 }),
  status: mysqlEnum("status", ["active", "canceled", "past_due", "unpaid"]).default("active").notNull(),
  planId: varchar("planId", { length: 50 }),
  currentPeriodStart: timestamp("currentPeriodStart"),
  currentPeriodEnd: timestamp("currentPeriodEnd"),
  cancelAtPeriodEnd: boolean("cancelAtPeriodEnd").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

export const payments = mysqlTable("payments", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  amountCents: int("amountCents").default(0).notNull(),
  currency: varchar("currency", { length: 3 }).default("usd").notNull(),
  type: mysqlEnum("type", ["subscription", "per_scrape", "credit_purchase"]).notNull(),
  description: varchar("description", { length: 255 }),
  status: mysqlEnum("status", ["pending", "succeeded", "failed"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

export const gamificationStats = mysqlTable("gamification_stats", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull().unique(),
  totalPoints: int("totalPoints").default(0).notNull(),
  currentStreak: int("currentStreak").default(0).notNull(),
  longestStreak: int("longestStreak").default(0).notNull(),
  lastScrapeDate: date("lastScrapeDate"),
  level: int("level").default(1).notNull(),
  badges: json("badges").notNull().$type<string[]>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type GamificationStat = typeof gamificationStats.$inferSelect;
export type InsertGamificationStat = typeof gamificationStats.$inferInsert;


export const referrals = mysqlTable("referrals", {
  id: serial("id").primaryKey(),
  referrerId: bigint("referrerId", { mode: "number", unsigned: true }).notNull(),
  referredId: bigint("referredId", { mode: "number", unsigned: true }).notNull().unique(),
  rewardGiven: boolean("rewardGiven").default(false).notNull(),
  creditsAwarded: int("creditsAwarded").default(50).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = typeof referrals.$inferInsert;


export const emailVerifications = mysqlTable("email_verifications", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  email: varchar("email", { length: 320 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EmailVerification = typeof emailVerifications.$inferSelect;
export type InsertEmailVerification = typeof emailVerifications.$inferInsert;


export const emailQueue = mysqlTable("email_queue", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  template: varchar("template", { length: 50 }).notNull(),
  templateData: json("templateData").$type<Record<string, unknown>>(),
  scheduledAt: timestamp("scheduledAt").notNull(),
  sentAt: timestamp("sentAt"),
  error: text("error"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EmailQueueItem = typeof emailQueue.$inferSelect;
export type InsertEmailQueueItem = typeof emailQueue.$inferInsert;


export const websiteVisitors = mysqlTable("website_visitors", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  ip: varchar("ip", { length: 45 }),
  country: varchar("country", { length: 2 }),
  city: varchar("city", { length: 100 }),
  org: varchar("org", { length: 255 }),
  domain: varchar("domain", { length: 255 }),
  page: text("page"),
  referrer: text("referrer"),
  userAgent: text("userAgent"),
  fingerprint: varchar("fingerprint", { length: 64 }),
  visitCount: int("visitCount").default(1).notNull(),
  lastSeenAt: timestamp("lastSeenAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("visitors_user_idx").on(table.userId),
  fingerprintIdx: index("visitors_fingerprint_idx").on(table.fingerprint),
}));

export type WebsiteVisitor = typeof websiteVisitors.$inferSelect;
export type InsertWebsiteVisitor = typeof websiteVisitors.$inferInsert;
