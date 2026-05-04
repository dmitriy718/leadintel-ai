import type { RawLead, ScraperConfig } from "./types";

const YT_COMMENTS = [
  "Great review! I'm setting up {topic} for my {business} next month. Which model would you suggest for a 2000 sq ft space?",
  "I've been researching {topic} for weeks. This video just convinced me to go with Brand X for my {business}.",
  "Small {business} owner here. Budget is tight. Is there a sub-$300 {topic} option that still records 24/7?",
  "Can you do a comparison video specifically for {business} owners? We have different needs than homeowners.",
  "Installed {topic} at my {business} after watching this. Caught a shoplifter on day 3. Pays for itself.",
  "Question: does this {topic} integrate with POS systems? Running a {business} and want unified alerts.",
  "For {business}es with multiple locations, do you recommend one central VMS or separate systems per location?",
  "Love the detail on night vision. Most break-ins at my {business} happen after hours. Critical feature.",
];

const YT_CHANNELS = [
  "Small Biz Tech", "Retail Security Pro", "Local Business Tips",
  "Franchise Owner Hub", "Shopkeeper's Guide", "Startup Essentials",
  "Business Safety First", "Tech for Stores",
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function scrapeYouTube(config: ScraperConfig): Promise<RawLead[]> {
  const { keywords, maxResults = 10 } = config;
  const leads: RawLead[] = [];
  const count = Math.min(maxResults, 20);
  const topic = keywords[0] || "security camera";
  const business = keywords.includes("local business")
    ? "store"
    : "small business";

  for (let i = 0; i < count; i++) {
    const channel = pickRandom(YT_CHANNELS);
    const username = channel.toLowerCase().replace(/\s/g, "_");
    const content = pickRandom(YT_COMMENTS)
      .replace("{topic}", topic)
      .replace("{business}", business);
    const hoursAgo = Math.floor(Math.random() * 72); // Up to 3 days
    const postedAt = new Date(Date.now() - hoursAgo * 3600000);
    const likes = Math.floor(Math.random() * 100);
    const replies = Math.floor(Math.random() * 15);
    const videoViews = Math.floor(Math.random() * 500000) + 10000;

    leads.push({
      source: "youtube",
      sourceUrl: `https://youtube.com/watch?v=demo${i}`,
      username,
      displayName: channel,
      content,
      postedAt,
      profileUrl: `https://youtube.com/@${username}`,
      engagementMetrics: { upvotes: likes, replies, views: videoViews },
      metadata: { channel, videoTitle: `Best ${topic} for ${business} 2025` },
    });
  }

  return leads;
}
