import { eq, sql } from "drizzle-orm";
import { getDb } from "../queries/connection";
import { users, referrals } from "@db/schema";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function generateUniqueReferralCode(): Promise<string> {
  const db = getDb();
  let code = generateCode();
  let attempts = 0;

  while (attempts < 10) {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.referralCode, code))
      .limit(1);

    if (!existing) return code;
    code = generateCode();
    attempts++;
  }

  // Fallback with timestamp suffix
  return `${generateCode()}${Date.now().toString(36).slice(-4).toUpperCase()}`;
}

export async function processReferral(referredUserId: number, referralCode: string | undefined) {
  if (!referralCode) return;

  const db = getDb();

  // Find referrer by code
  const [referrer] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.referralCode, referralCode.trim().toUpperCase()))
    .limit(1);

  if (!referrer || referrer.id === referredUserId) return;

  // Check if this referred user already has a referrer
  const [referredUser] = await db
    .select({ referredBy: users.referredBy })
    .from(users)
    .where(eq(users.id, referredUserId))
    .limit(1);

  if (referredUser?.referredBy) return; // Already referred by someone

  // Record referral and give rewards
  const REWARD_CREDITS = 50;

  await db.insert(referrals).values({
    referrerId: referrer.id,
    referredId: referredUserId,
    rewardGiven: true,
    creditsAwarded: REWARD_CREDITS,
  });

  // Update referred user's referrer
  await db
    .update(users)
    .set({ referredBy: referrer.id })
    .where(eq(users.id, referredUserId));

  // Award credits to both parties
  await db
    .update(users)
    .set({ creditsBalance: sql`${users.creditsBalance} + ${REWARD_CREDITS}` })
    .where(eq(users.id, referrer.id));

  await db
    .update(users)
    .set({ creditsBalance: sql`${users.creditsBalance} + ${REWARD_CREDITS}` })
    .where(eq(users.id, referredUserId));
}

export async function getReferralStats(userId: number) {
  const db = getDb();

  const [user] = await db
    .select({ referralCode: users.referralCode })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const referralList = await db
    .select({
      referredName: users.name,
      createdAt: referrals.createdAt,
      creditsAwarded: referrals.creditsAwarded,
    })
    .from(referrals)
    .innerJoin(users, eq(referrals.referredId, users.id))
    .where(eq(referrals.referrerId, userId));

  const totalEarned = referralList.reduce((sum, r) => sum + (r.creditsAwarded ?? 0), 0);

  return {
    referralCode: user?.referralCode ?? null,
    totalReferrals: referralList.length,
    totalEarned,
    referrals: referralList,
  };
}
