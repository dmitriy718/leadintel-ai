import nodemailer from "nodemailer";
import { env } from "./env";

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;
  if (!env.smtpHost || !env.smtpUser || !env.smtpPass) {
    console.warn("[email] SMTP not configured. Emails will be logged to console only.");
    return null;
  }
  transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass,
    },
  });
  return transporter;
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  const t = getTransporter();

  if (!t) {
    // Dev mode: log to console
    console.log("\n========== EMAIL ==========");
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`From: ${env.smtpFrom}`);
    console.log("\n--- HTML ---\n" + options.html.slice(0, 2000));
    console.log("===========================\n");
    return;
  }

  await t.sendMail({
    from: env.smtpFrom,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function baseTemplate(title: string, body: string): string {
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
    .code { background: #27272a; padding: 16px; border-radius: 8px; font-family: monospace; font-size: 18px; letter-spacing: 2px; text-align: center; color: #fff; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">LeadIntel<span> AI</span></div>
    ${body}
    <div class="footer">
      LeadIntel AI — AI-Powered Lead Intelligence<br>
      If you didn't request this email, you can safely ignore it.
    </div>
  </div>
</body>
</html>`;
}

export function sendVerificationEmail(email: string, token: string): Promise<void> {
  const verifyUrl = `${env.appUrl}/verify-email?token=${token}`;
  const html = baseTemplate(
    "Verify Your Email",
    `<h1>Verify your email address</h1>
    <p>Thanks for signing up! Click the button below to verify your email and unlock your full account.</p>
    <p><a href="${verifyUrl}" class="button">Verify Email Address</a></p>
    <p style="font-size: 13px;">Or copy this link: <a href="${verifyUrl}" style="color: #6366f1;">${verifyUrl}</a></p>
    <p style="font-size: 13px;">This link expires in 24 hours.</p>`
  );

  return sendEmail({
    to: email,
    subject: "Verify your LeadIntel AI account",
    html,
    text: `Verify your email: ${verifyUrl} (expires in 24 hours)`,
  });
}

export function sendWelcomeEmail(email: string, name: string): Promise<void> {
  const safeName = escapeHtml(name || "there");
  const html = baseTemplate(
    "Welcome to LeadIntel AI",
    `<h1>Welcome aboard, ${safeName}!</h1>
    <p>You're now part of a community that's finding high-intent leads across 9 channels with AI-powered scoring.</p>
    <p><strong>Here's how to get started:</strong></p>
    <p>1. Create your first campaign<br>2. Add keywords and channels<br>3. Run a scrape and watch the leads roll in</p>
    <p><a href="${env.appUrl}/dashboard" class="button">Go to Dashboard</a></p>
    <p style="font-size: 13px;">Need help? Just reply to this email.</p>`
  );

  return sendEmail({
    to: email,
    subject: "Welcome to LeadIntel AI — Let's find some leads!",
    html,
    text: `Welcome! Get started at ${env.appUrl}/dashboard`,
  });
}

export function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const resetUrl = `${env.appUrl}/reset-password?token=${token}`;
  const html = baseTemplate(
    "Reset Your Password",
    `<h1>Password reset requested</h1>
    <p>We received a request to reset your password. Click the button below to set a new one.</p>
    <p><a href="${resetUrl}" class="button">Reset Password</a></p>
    <p style="font-size: 13px;">This link expires in 1 hour. If you didn't request this, you can safely ignore it.</p>`
  );

  return sendEmail({
    to: email,
    subject: "Reset your LeadIntel AI password",
    html,
    text: `Reset password: ${resetUrl} (expires in 1 hour)`,
  });
}
