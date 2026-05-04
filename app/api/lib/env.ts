import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? "";
}

export const env = {
  appSecret: required("APP_SECRET"),
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: required("DATABASE_URL"),
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  stripePriceIdStarter: process.env.STRIPE_PRICE_ID_STARTER ?? "",
  stripePriceIdStarterAnnual: process.env.STRIPE_PRICE_ID_STARTER_ANNUAL ?? "",
  stripePriceIdPro: process.env.STRIPE_PRICE_ID_PRO ?? "",
  stripePriceIdProAnnual: process.env.STRIPE_PRICE_ID_PRO_ANNUAL ?? "",
  stripePriceIdEnterprise: process.env.STRIPE_PRICE_ID_ENTERPRISE ?? "",
  stripePriceIdEnterpriseAnnual: process.env.STRIPE_PRICE_ID_ENTERPRISE_ANNUAL ?? "",
  stripePriceIdCreditsSmall: process.env.STRIPE_PRICE_ID_CREDITS_SMALL ?? "",
  stripePriceIdCreditsMedium: process.env.STRIPE_PRICE_ID_CREDITS_MEDIUM ?? "",
  smtpHost: process.env.SMTP_HOST ?? "",
  smtpPort: parseInt(process.env.SMTP_PORT ?? "587"),
  smtpUser: process.env.SMTP_USER ?? "",
  smtpPass: process.env.SMTP_PASS ?? "",
  smtpFrom: process.env.SMTP_FROM ?? "LeadIntel AI <noreply@leadintel.ai>",
  appUrl: process.env.APP_URL ?? "http://localhost:3000",
};
