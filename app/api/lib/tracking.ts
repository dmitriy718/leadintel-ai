import { eq } from "drizzle-orm";
import { getDb } from "../queries/connection";
import { users } from "@db/schema";
import { nanoid } from "nanoid";

export async function generateTrackingKey(): Promise<string> {
  const db = getDb();
  let key = nanoid(16);
  let attempts = 0;

  while (attempts < 10) {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.trackingKey, key))
      .limit(1);

    if (!existing) return key;
    key = nanoid(16);
    attempts++;
  }

  return `${nanoid(16)}${Date.now().toString(36)}`;
}

export async function ensureTrackingKey(userId: number): Promise<string> {
  const db = getDb();
  const [user] = await db
    .select({ trackingKey: users.trackingKey })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (user?.trackingKey) return user.trackingKey;

  const key = await generateTrackingKey();
  await db
    .update(users)
    .set({ trackingKey: key })
    .where(eq(users.id, userId));

  return key;
}

interface IPInfo {
  ip: string;
  city?: string;
  region?: string;
  country?: string;
  org?: string;
  hostname?: string;
}

export async function enrichIP(ip: string): Promise<IPInfo | null> {
  try {
    const res = await fetch(`https://ipinfo.io/${ip}/json`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    return (await res.json()) as IPInfo;
  } catch {
    return null;
  }
}
