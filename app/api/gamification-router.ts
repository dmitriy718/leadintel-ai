import { eq, desc } from "drizzle-orm";
import { getDb } from "./queries/connection";
import { gamificationStats, users } from "@db/schema";
import { createRouter, publicQuery, authedQuery } from "./middleware";

const BADGES = [
  { id: "first_scrape", name: "First Scrape", description: "Complete your first scrape", condition: (s: any) => s.totalPoints >= 10 },
  { id: "hunter", name: "Hunter", description: "Complete 10 scrapes", condition: (s: any) => s.totalPoints >= 100 },
  { id: "lead_master", name: "Lead Master", description: "Complete 100 scrapes", condition: (s: any) => s.totalPoints >= 1000 },
  { id: "streak_starter", name: "Streak Starter", description: "7-day scraping streak", condition: (s: any) => s.currentStreak >= 7 },
  { id: "unstoppable", name: "Unstoppable", description: "30-day scraping streak", condition: (s: any) => s.currentStreak >= 30 },
];

function calculateLevel(points: number): number {
  if (points >= 10000) return 5;
  if (points >= 5000) return 4;
  if (points >= 1500) return 3;
  if (points >= 500) return 2;
  return 1;
}

function calculateBadges(stats: any): string[] {
  return BADGES.filter(b => b.condition(stats)).map(b => b.id);
}

export async function ensureGamificationStats(userId: number) {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(gamificationStats)
    .where(eq(gamificationStats.userId, userId))
    .limit(1);

  if (!existing) {
    await db.insert(gamificationStats).values({
      userId,
      totalPoints: 0,
      currentStreak: 0,
      longestStreak: 0,
      level: 1,
      badges: [],
    });
    return db.select().from(gamificationStats).where(eq(gamificationStats.userId, userId)).limit(1).then(r => r[0]);
  }

  return existing;
}

export async function awardScrapePoints(userId: number) {
  const db = getDb();
  const stats = await ensureGamificationStats(userId);
  if (!stats) return;

  const lastDate = stats.lastScrapeDate;

  let newStreak = stats.currentStreak;
  if (lastDate) {
    const last = new Date(lastDate);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    if (last.getTime() === yesterday.getTime()) {
      newStreak += 1;
    } else if (last.getTime() < yesterday.getTime()) {
      newStreak = 1;
    }
    // If already scraped today, don't change streak
  } else {
    newStreak = 1;
  }

  const streakMultiplier = newStreak >= 30 ? 3 : newStreak >= 7 ? 2 : 1;
  const pointsEarned = 10 * streakMultiplier;
  const newPoints = stats.totalPoints + pointsEarned;
  const newLevel = calculateLevel(newPoints);
  const newBadges = calculateBadges({ ...stats, totalPoints: newPoints, currentStreak: newStreak });

  await db
    .update(gamificationStats)
    .set({
      totalPoints: newPoints,
      currentStreak: newStreak,
      longestStreak: Math.max(stats.longestStreak, newStreak),
      lastScrapeDate: new Date(),
      level: newLevel,
      badges: newBadges,
    })
    .where(eq(gamificationStats.userId, userId));
}

export const gamificationRouter = createRouter({
  me: authedQuery.query(async ({ ctx }) => {
    const stats = await ensureGamificationStats(ctx.user.id);
    if (!stats) return null;

    const levelNames: Record<number, string> = {
      1: "Novice",
      2: "Scout",
      3: "Hunter",
      4: "Expert",
      5: "Legend",
    };

    const nextLevelThreshold = [0, 500, 1500, 5000, 10000][stats.level] ?? 10000;

    return {
      ...stats,
      levelName: levelNames[stats.level] ?? "Legend",
      nextLevelThreshold,
      progress: stats.totalPoints / nextLevelThreshold,
      earnedBadges: BADGES.filter(b => stats.badges.includes(b.id)),
    };
  }),

  leaderboard: publicQuery.query(async () => {
    const db = getDb();
    const rows = await db
      .select({
        username: users.username,
        name: users.name,
        totalPoints: gamificationStats.totalPoints,
        level: gamificationStats.level,
        currentStreak: gamificationStats.currentStreak,
        badges: gamificationStats.badges,
      })
      .from(gamificationStats)
      .innerJoin(users, eq(gamificationStats.userId, users.id))
      .orderBy(desc(gamificationStats.totalPoints))
      .limit(20);

    return rows;
  }),
});
