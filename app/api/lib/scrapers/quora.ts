import type { RawLead, ScraperConfig } from "./types";

const QUORA_QUESTIONS = [
  "What is the best {topic} for a {business}?",
  "How much should a {business} spend on {topic}?",
  "What are the pros and cons of installing {topic} at a {business}?",
  "Which {topic} brand do you recommend for a {business} with 3 locations?",
  "How do I choose between wired and wireless {topic} for my {business}?",
  "Do insurance companies give discounts for {topic} at {business}es?",
  "What features matter most in a {topic} for a small {business}?",
  "Can I install {topic} myself or should I hire a professional for my {business}?",
];

const QUORA_ANSWERS = [
  "I run a {business} and installed {topic} last year. The peace of mind alone is worth it. I went with a mid-range system around $800.",
  "For {business}es, I always recommend cloud-based {topic}. You can monitor remotely and get alerts. Brand I like: [redacted].",
  "Budget $500-1500 for a decent {topic} setup for a small {business}. Key features: night vision, motion alerts, cloud backup.",
  "We compared 4 vendors for our {business} chain. Ended up choosing the one with the best mobile app. Staff adoption matters.",
  "DIY is possible but for a {business}, professional install ensures coverage and often includes warranty. My 2 cents.",
];

const QUORA_AUTHORS = [
  "Michael Chen, Retail Consultant", "Sarah Johnson, Small Biz Owner",
  "David Park, Security Installer", "Lisa Wong, Tech Advisor",
  "James Miller, Franchise Owner", "Emily Davis, Business Coach",
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function scrapeQuora(config: ScraperConfig): Promise<RawLead[]> {
  const { keywords, maxResults = 12 } = config;
  const leads: RawLead[] = [];
  const count = Math.min(maxResults, 20);
  const topic = keywords[0] || "security camera system";
  const business = keywords.includes("local business")
    ? "retail store"
    : "small business";

  for (let i = 0; i < count; i++) {
    const isQuestion = Math.random() > 0.4;
    const author = pickRandom(QUORA_AUTHORS);
    const username = author.split(",")[0].toLowerCase().replace(/\s/g, "_");
    const hoursAgo = Math.floor(Math.random() * 336); // Up to 2 weeks
    const postedAt = new Date(Date.now() - hoursAgo * 3600000);
    const upvotes = Math.floor(Math.random() * 500);
    const views = Math.floor(Math.random() * 15000) + 500;

    if (isQuestion) {
      const title = pickRandom(QUORA_QUESTIONS)
        .replace("{topic}", topic)
        .replace("{business}", business);
      leads.push({
        source: "quora",
        sourceUrl: `https://quora.com/What-is-the-best-${topic.replace(/\s/g, "-")}`,
        username,
        displayName: author,
        content: title,
        title,
        postedAt,
        profileUrl: `https://quora.com/profile/${username}`,
        engagementMetrics: { upvotes, views },
        metadata: { type: "question" },
      });
    } else {
      const content = pickRandom(QUORA_ANSWERS)
        .replace("{topic}", topic)
        .replace("{business}", business);
      const qTitle = pickRandom(QUORA_QUESTIONS)
        .replace("{topic}", topic)
        .replace("{business}", business);
      leads.push({
        source: "quora",
        sourceUrl: `https://quora.com/What-is-the-best-${topic.replace(/\s/g, "-")}`,
        username,
        displayName: author,
        content,
        title: qTitle,
        postedAt,
        profileUrl: `https://quora.com/profile/${username}`,
        engagementMetrics: { upvotes, views },
        metadata: { type: "answer" },
      });
    }
  }

  return leads;
}
