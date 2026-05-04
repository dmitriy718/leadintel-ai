import * as cookie from "cookie";
import bcrypt from "bcrypt";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { Session } from "@contracts/constants";
import { getSessionCookieOptions } from "./lib/cookies";
import { signSessionToken } from "./lib/auth";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { users, authCredentials, emailVerifications } from "@db/schema";
import { findUserByUsername } from "./queries/users";
import { rateLimit, getClientIP } from "./lib/rate-limit";
import { generateUniqueReferralCode, processReferral, getReferralStats } from "./lib/referrals";
import { generateTrackingKey } from "./lib/tracking";
import { sendVerificationEmail } from "./lib/email";
import { scheduleSequence } from "./lib/email-sequences";
import { nanoid } from "nanoid";

export const authRouter = createRouter({
  register: publicQuery
    .input(
      z.object({
        username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/).transform(s => s.trim().toLowerCase()),
        name: z.string().min(1).max(255).transform(s => s.trim()),
        email: z.string().email().max(320).transform(s => s.trim().toLowerCase()),
        password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
        referralCode: z.string().max(20).optional().transform(s => s?.trim().toUpperCase()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      rateLimit(getClientIP(ctx.req.headers), "register", 3, 60 * 1000);
      const db = getDb();

      const existing = await findUserByUsername(input.username);
      if (existing) {
        throw new Error("Username already taken");
      }

      const passwordHash = await bcrypt.hash(input.password, 12);
      const referralCode = await generateUniqueReferralCode();
      const trackingKey = await generateTrackingKey();

      const [result] = await db.insert(users).values({
        username: input.username,
        name: input.name,
        email: input.email,
        role: "user",
        referralCode,
        trackingKey,
      });

      const userId = Number(result.insertId);

      await db.insert(authCredentials).values({
        userId,
        passwordHash,
        mustChangePassword: false,
      });

      // Process referral if code provided
      if (input.referralCode) {
        try {
          await processReferral(userId, input.referralCode);
        } catch (refErr) {
          console.error("[register] Referral processing failed:", refErr);
        }
      }

      // Send verification email (best effort — don't fail registration if email infra is down)
      try {
        const verifyToken = nanoid(32);
        await db.insert(emailVerifications).values({
          userId,
          token: verifyToken,
          email: input.email,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });
        await sendVerificationEmail(input.email, verifyToken);
      } catch (emailErr) {
        console.error("[register] Verification email failed:", emailErr);
      }

      // Schedule welcome email sequence (best effort)
      try {
        await scheduleSequence(userId, "welcome");
      } catch (seqErr) {
        console.error("[register] Welcome sequence scheduling failed:", seqErr);
      }

      const token = await signSessionToken({
        userId,
        username: input.username,
      });

      const opts = getSessionCookieOptions(ctx.req.headers);
      ctx.resHeaders.append(
        "set-cookie",
        cookie.serialize(Session.cookieName, token, {
          httpOnly: opts.httpOnly,
          path: opts.path,
          sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
          secure: opts.secure,
          maxAge: Session.maxAgeMs / 1000,
        })
      );

      return { success: true, userId };
    }),

  login: publicQuery
    .input(
      z.object({
        username: z.string().min(1).transform(s => s.trim().toLowerCase()),
        password: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      rateLimit(getClientIP(ctx.req.headers), "login", 5, 60 * 1000);
      const db = getDb();

      const user = await findUserByUsername(input.username);
      if (!user) {
        throw new Error("Invalid username or password");
      }

      const [cred] = await db
        .select()
        .from(authCredentials)
        .where(eq(authCredentials.userId, user.id))
        .limit(1);

      if (!cred) {
        throw new Error("Invalid username or password");
      }

      const valid = await bcrypt.compare(input.password, cred.passwordHash);
      if (!valid) {
        throw new Error("Invalid username or password");
      }

      await db
        .update(users)
        .set({ lastSignInAt: new Date() })
        .where(eq(users.id, user.id));

      const token = await signSessionToken({
        userId: user.id,
        username: user.username,
      });

      const opts = getSessionCookieOptions(ctx.req.headers);
      ctx.resHeaders.append(
        "set-cookie",
        cookie.serialize(Session.cookieName, token, {
          httpOnly: opts.httpOnly,
          path: opts.path,
          sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
          secure: opts.secure,
          maxAge: Session.maxAgeMs / 1000,
        })
      );

      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          email: user.email,
          role: user.role,
          mustChangePassword: cred.mustChangePassword,
        },
      };
    }),

  me: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const [cred] = await db
      .select()
      .from(authCredentials)
      .where(eq(authCredentials.userId, ctx.user.id))
      .limit(1);

    return {
      id: ctx.user.id,
      username: ctx.user.username,
      name: ctx.user.name,
      email: ctx.user.email,
      avatar: ctx.user.avatar,
      role: ctx.user.role,
      mustChangePassword: cred?.mustChangePassword ?? false,
      emailVerified: ctx.user.emailVerified,
    };
  }),

  logout: authedQuery.mutation(async ({ ctx }) => {
    const opts = getSessionCookieOptions(ctx.req.headers);
    ctx.resHeaders.append(
      "set-cookie",
      cookie.serialize(Session.cookieName, "", {
        httpOnly: opts.httpOnly,
        path: opts.path,
        sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
        secure: opts.secure,
        maxAge: 0,
      })
    );
    return { success: true };
  }),

  changePassword: authedQuery
    .input(
      z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
      })
    )
    .mutation(async ({ input, ctx }) => {
      rateLimit(String(ctx.user.id), "changePassword", 5, 60 * 1000);
      const db = getDb();

      const [cred] = await db
        .select()
        .from(authCredentials)
        .where(eq(authCredentials.userId, ctx.user.id))
        .limit(1);

      if (!cred) {
        throw new Error("Account not found");
      }

      const valid = await bcrypt.compare(input.currentPassword, cred.passwordHash);
      if (!valid) {
        throw new Error("Current password is incorrect");
      }

      const newHash = await bcrypt.hash(input.newPassword, 12);

      await db
        .update(authCredentials)
        .set({
          passwordHash: newHash,
          mustChangePassword: false,
        })
        .where(eq(authCredentials.userId, ctx.user.id));

      await db
        .update(users)
        .set({ passwordChangedAt: new Date() })
        .where(eq(users.id, ctx.user.id));

      return { success: true };
    }),

  updateProfile: authedQuery
    .input(
      z.object({
        name: z.string().min(1).max(255).optional().transform(s => s?.trim()),
        email: z.string().email().max(320).optional().transform(s => s?.trim().toLowerCase()),
        avatar: z.string().url().max(1000).optional().or(z.literal("")),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const updates: Record<string, unknown> = {};
      if (input.name !== undefined) updates.name = input.name;
      if (input.email !== undefined) updates.email = input.email;
      if (input.avatar !== undefined) updates.avatar = input.avatar || null;

      await db
        .update(users)
        .set(updates)
        .where(eq(users.id, ctx.user.id));

      return { success: true };
    }),

  getReferrals: authedQuery.query(async ({ ctx }) => {
    return getReferralStats(ctx.user.id);
  }),

  verifyEmail: publicQuery
    .input(z.object({ token: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [record] = await db
        .select()
        .from(emailVerifications)
        .where(eq(emailVerifications.token, input.token))
        .limit(1);

      if (!record) {
        throw new Error("Invalid or expired verification link");
      }

      if (record.usedAt) {
        throw new Error("This verification link has already been used");
      }

      if (new Date(record.expiresAt) < new Date()) {
        throw new Error("This verification link has expired");
      }

      await db
        .update(users)
        .set({ emailVerified: true })
        .where(eq(users.id, record.userId));

      await db
        .update(emailVerifications)
        .set({ usedAt: new Date() })
        .where(eq(emailVerifications.id, record.id));

      return { success: true };
    }),

  resendVerification: authedQuery.mutation(async ({ ctx }) => {
    const db = getDb();
    const user = ctx.user;

    if (user.emailVerified) {
      throw new Error("Email is already verified");
    }

    if (!user.email) {
      throw new Error("No email address on file");
    }

    // Invalidate previous tokens
    await db
      .update(emailVerifications)
      .set({ usedAt: new Date() })
      .where(eq(emailVerifications.userId, user.id));

    const verifyToken = nanoid(32);
    await db.insert(emailVerifications).values({
      userId: user.id,
      token: verifyToken,
      email: user.email,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    await sendVerificationEmail(user.email, verifyToken);
    return { success: true };
  }),

  getApiKey: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const [user] = await db
      .select({ apiKey: users.apiKey })
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1);
    return { apiKey: user?.apiKey ?? null };
  }),

  generateApiKey: authedQuery.mutation(async ({ ctx }) => {
    const db = getDb();
    const apiKey = `li_${nanoid(48)}`;
    await db
      .update(users)
      .set({ apiKey })
      .where(eq(users.id, ctx.user.id));
    return { apiKey };
  }),
});
