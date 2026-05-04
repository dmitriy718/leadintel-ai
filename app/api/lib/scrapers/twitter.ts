import type { RawLead, ScraperConfig } from "./types";

const TWITTER_TEMPLATES = [
  "Looking for recommendations on {topic} for my {business}. Any suggestions?",
  "Just installed a new {topic} at the shop. Impressed with the clarity so far!",
  "Small {business} owners: what's your experience with {topic}? Worth the investment?",
  "Need help choosing a {topic} system. Budget is around $500. What do you recommend?",
  "Our {business} got broken into last week. Looking at {topic} options now. Priorities?",
  "Reviewing {topic} vendors for our franchise locations. DM me if you have recs.",
  "Does anyone use {topic} for their {business}? Pros and cons?",
  "Setting up {topic} for a new location. Cloud storage vs local NVR?",
  "Just compared 5 different {topic} brands. Thread below on what I found.",
  "Local {business} owners meetup: discussed {topic} and insurance discounts.",
];

const USERNAMES = [
  "smb_owner_mike", "retail_guru", "tech_savvy_owner", "security_first",
  "smallbiz_sarah", "franchise_dave", "shopkeeper_jane", "startup_tom",
  "local_biz_lisa", "owner_operator", "biztech_daily", "protect_my_biz",
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateTwitterContent(keywords: string[]): string {
  const template = pickRandom(TWITTER_TEMPLATES);
  const topic = keywords[0] || "security system";
  const business = keywords.includes("local business")
    ? "store"
    : keywords.includes("restaurant")
    ? "restaurant"
    : "small business";

  return template
    .replace("{topic}", topic)
    .replace("{business}", business);
}

export async function scrapeTwitter(config: ScraperConfig): Promise<RawLead[]> {
  const { keywords, maxResults = 12 } = config;
  const leads: RawLead[] = [];
  const count = Math.min(maxResults, 20);

  for (let i = 0; i < count; i++) {
    const username = pickRandom(USERNAMES) + (Math.floor(Math.random() * 99));
    const content = generateTwitterContent(keywords);
    const hoursAgo = Math.floor(Math.random() * 168); // Up to 1 week ago
    const postedAt = new Date(Date.now() - hoursAgo * 3600000);
    const likes = Math.floor(Math.random() * 200);
    const replies = Math.floor(Math.random() * 30);
    const followers = Math.floor(Math.random() * 5000) + 100;

    leads.push({
      source: "twitter",
      sourceUrl: `https://twitter.com/${username}/status/demo${i}`,
      username,
      displayName: username.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      content,
      postedAt,
      profileUrl: `https://twitter.com/${username}`,
      engagementMetrics: { upvotes: likes, replies, followers },
      metadata: { verified: Math.random() > 0.8 },
    });
  }

  return leads;
}
