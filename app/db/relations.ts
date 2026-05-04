import { relations } from "drizzle-orm";
import { users, campaigns, scrapingJobs, leads, authCredentials, usageLogs, subscriptions, payments, gamificationStats } from "./schema";

export const usersRelations = relations(users, ({ many, one }) => ({
  campaigns: many(campaigns),
  authCredential: one(authCredentials, {
    fields: [users.id],
    references: [authCredentials.userId],
  }),
  usageLogs: many(usageLogs),
  subscription: one(subscriptions, {
    fields: [users.id],
    references: [subscriptions.userId],
  }),
  payments: many(payments),
  gamificationStat: one(gamificationStats, {
    fields: [users.id],
    references: [gamificationStats.userId],
  }),
}));

export const authCredentialsRelations = relations(authCredentials, ({ one }) => ({
  user: one(users, {
    fields: [authCredentials.userId],
    references: [users.id],
  }),
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  user: one(users, {
    fields: [campaigns.userId],
    references: [users.id],
  }),
  leads: many(leads),
  jobs: many(scrapingJobs),
}));

export const scrapingJobsRelations = relations(scrapingJobs, ({ one, many }) => ({
  campaign: one(campaigns, {
    fields: [scrapingJobs.campaignId],
    references: [campaigns.id],
  }),
  leads: many(leads),
}));

export const leadsRelations = relations(leads, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [leads.campaignId],
    references: [campaigns.id],
  }),
  job: one(scrapingJobs, {
    fields: [leads.jobId],
    references: [scrapingJobs.id],
  }),
}));

export const usageLogsRelations = relations(usageLogs, ({ one }) => ({
  user: one(users, {
    fields: [usageLogs.userId],
    references: [users.id],
  }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, {
    fields: [payments.userId],
    references: [users.id],
  }),
}));

export const gamificationStatsRelations = relations(gamificationStats, ({ one }) => ({
  user: one(users, {
    fields: [gamificationStats.userId],
    references: [users.id],
  }),
}));
