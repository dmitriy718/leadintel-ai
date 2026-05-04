import { eq, and, isNull, lte } from "drizzle-orm";
import { getDb } from "../queries/connection";
import { emailQueue, users } from "@db/schema";
import { sendEmail } from "./email";

export type SequenceType = "welcome" | "re_engagement";

interface SequenceStep {
  delayHours: number;
  subject: string;
  template: string;
  templateData?: Record<string, unknown>;
}

const SEQUENCES: Record<SequenceType, SequenceStep[]> = {
  welcome: [
    {
      delayHours: 0,
      subject: "Welcome to LeadIntel AI — Let's find some leads!",
      template: "welcome",
    },
    {
      delayHours: 24,
      subject: "Day 1: How to find your first 10 leads",
      template: "welcome_day1",
    },
    {
      delayHours: 72,
      subject: "Pro tip: Export leads directly to your CRM",
      template: "welcome_day3",
    },
    {
      delayHours: 168,
      subject: "You're halfway through your free month — here's what's next",
      template: "welcome_day7_upgrade",
    },
  ],
  re_engagement: [
    {
      delayHours: 0,
      subject: "We miss you — come back and find more leads",
      template: "reengagement",
    },
    {
      delayHours: 168,
      subject: "Your leads are waiting — here's what you missed",
      template: "reengagement_followup",
    },
  ],
};

export async function scheduleSequence(userId: number, type: SequenceType, baseTime: Date = new Date()) {
  const db = getDb();
  const sequence = SEQUENCES[type];
  if (!sequence) return;

  const items = sequence.map((step) => ({
    userId,
    type,
    subject: step.subject,
    template: step.template,
    templateData: step.templateData ?? {},
    scheduledAt: new Date(baseTime.getTime() + step.delayHours * 60 * 60 * 1000),
  }));

  await db.insert(emailQueue).values(items);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderTemplate(template: string, data: Record<string, unknown>): { html: string; text: string } {
  const name = escapeHtml((data.name as string) || "there");
  const appUrl = escapeHtml((data.appUrl as string) || "https://app.leadintel.ai");

  const templates: Record<string, { html: string; text: string }> = {
    welcome: {
      html: `<h1>Welcome aboard, ${name}!</h1><p>You're now part of a community finding high-intent leads across 9 channels with AI-powered scoring.</p><p><strong>Here's how to get started:</strong></p><p>1. Create your first campaign<br>2. Add keywords and channels<br>3. Run a scrape and watch the leads roll in</p><p><a href="${appUrl}/dashboard" class="button">Go to Dashboard</a></p>`,
      text: `Welcome! Get started at ${appUrl}/dashboard`,
    },
    welcome_day1: {
      html: `<h1>Day 1: Find your first 10 leads</h1><p>Hi ${name}, ready to see LeadIntel AI in action? Here's a quick playbook:</p><p><strong>Step 1:</strong> Create a campaign with 3-5 keywords<br><strong>Step 2:</strong> Select 2-3 channels (Reddit and HN are great starters)<br><strong>Step 3:</strong> Hit "Run Scrape" and watch the AI score each lead</p><p>Most users find 10+ qualified leads in their first scrape.</p><p><a href="${appUrl}/campaigns" class="button">Create a Campaign</a></p>`,
      text: `Day 1 tip: Create a campaign at ${appUrl}/campaigns`,
    },
    welcome_day3: {
      html: `<h1>Pro tip: Export to CSV</h1><p>Hi ${name}, you've probably found some great leads by now. Did you know you can export them all in one click?</p><p>From any campaign, click "Export to CSV" and get a spreadsheet with every lead's contact info, score, and keyword matches — ready to import into HubSpot, Salesforce, or your outreach tool.</p><p><a href="${appUrl}/campaigns" class="button">View My Campaigns</a></p>`,
      text: `Pro tip: Export leads to CSV at ${appUrl}/campaigns`,
    },
    welcome_day7_upgrade: {
      html: `<h1>You're halfway through your free month</h1><p>Hi ${name}, you've been using LeadIntel AI for a week now. How's it going?</p><p>If you're finding value, consider upgrading to Starter ($29/mo) for 50 scrapes/day, or Pro ($79/mo) for 200/day plus API access.</p><p>Remember: annual billing saves you 17% (2 months free).</p><p><a href="${appUrl}/billing" class="button">View Plans</a></p>`,
      text: `Upgrade your plan at ${appUrl}/billing`,
    },
    reengagement: {
      html: `<h1>We miss you, ${name}</h1><p>It's been a while since your last scrape. The leads haven't stopped appearing — they've just been waiting for you.</p><p>Take 2 minutes to run a fresh scrape and see what you've missed.</p><p><a href="${appUrl}/dashboard" class="button">Run a Scrape</a></p>`,
      text: `Come back and find more leads at ${appUrl}/dashboard`,
    },
    reengagement_followup: {
      html: `<h1>Your leads are waiting</h1><p>Hi ${name}, it's been two weeks since your last visit. Here's a reminder of what LeadIntel AI can do for you:</p><p>• Find high-intent leads across 9 channels<br>• AI scores every lead so you know who's worth contacting<br>• Export directly to your CRM</p><p>Your free account is still active with 150 scrapes per month.</p><p><a href="${appUrl}/dashboard" class="button">Jump Back In</a></p>`,
      text: `Your free account is waiting at ${appUrl}/dashboard`,
    },
  };

  return templates[template] ?? {
    html: `<h1>Hello from LeadIntel AI</h1><p>You have a new message.</p>`,
    text: `Hello from LeadIntel AI`,
  };
}

export async function processEmailQueue(batchSize: number = 50): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  const db = getDb();
  const now = new Date();

  const pending = await db
    .select()
    .from(emailQueue)
    .where(
      and(
        isNull(emailQueue.sentAt),
        lte(emailQueue.scheduledAt, now)
      )
    )
    .limit(batchSize);

  let succeeded = 0;
  let failed = 0;

  for (const item of pending) {
    try {
      const [user] = await db
        .select({ email: users.email, name: users.name })
        .from(users)
        .where(eq(users.id, item.userId))
        .limit(1);

      if (!user?.email) {
        await db
          .update(emailQueue)
          .set({ sentAt: now, error: "User has no email" })
          .where(eq(emailQueue.id, item.id));
        failed++;
        continue;
      }

      const { html, text } = renderTemplate(item.template, {
        ...item.templateData,
        name: user.name,
      });

      await sendEmail({
        to: user.email,
        subject: item.subject,
        html: baseEmailTemplate(item.subject, html),
        text,
      });

      await db
        .update(emailQueue)
        .set({ sentAt: now })
        .where(eq(emailQueue.id, item.id));

      succeeded++;
    } catch (err: any) {
      await db
        .update(emailQueue)
        .set({ error: err.message || String(err) })
        .where(eq(emailQueue.id, item.id));
      failed++;
    }
  }

  return { processed: pending.length, succeeded, failed };
}

function baseEmailTemplate(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0a; margin: 0; padding: 40px 20px; color: #e4e4e7; }
    .container { max-width: 480px; margin: 0 auto; background: #18181b; border-radius: 16px; padding: 40px; border: 1px solid #27272a; }
    .logo { font-size: 24px; font-weight: 700; margin-bottom: 24px; color: #fff; }
    .logo span { color: #6366f1; }
    h1 { font-size: 20px; font-weight: 600; margin: 0 0 16px; color: #fff; }
    p { font-size: 15px; line-height: 1.6; color: #a1a1aa; margin: 0 0 20px; }
    .button { display: inline-block; background: #6366f1; color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; }
    .button:hover { background: #4f46e5; }
    .footer { margin-top: 32px; padding-top: 24px; border-top: 1px solid #27272a; font-size: 12px; color: #71717a; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">LeadIntel<span> AI</span></div>
    ${bodyHtml}
    <div class="footer">
      LeadIntel AI — AI-Powered Lead Intelligence<br>
      <a href="https://app.leadintel.ai/unsubscribe" style="color: #71717a;">Unsubscribe</a>
    </div>
  </div>
</body>
</html>`;
}
