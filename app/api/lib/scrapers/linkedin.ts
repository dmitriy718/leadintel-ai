import type { RawLead, ScraperConfig } from "./types";

const LI_POSTS = [
  "We're upgrading {topic} across all our {business} locations. If you're a vendor in this space, I'd love to connect.",
  "Just published an article on why every {business} needs modern {topic}. Link in comments.",
  "Hiring: Looking for a security consultant to audit {topic} at our {business}. Remote ok.",
  "My {business} saved 15% on insurance after installing {topic}. ROI conversation every owner should have.",
  "Seeking recommendations: {topic} for a multi-location {business}. Experience with cloud-based preferred.",
  "Attended a great seminar on {topic} for {business}es. Key takeaway: remote monitoring is non-negotiable now.",
  "We tested 3 {topic} vendors last quarter. Here's what we learned about implementation at scale.",
];

const LI_NAMES = [
  "Michael Torres", "Sarah Chen", "David Rodriguez", "Lisa Park",
  "James Wilson", "Emily Thompson", "Robert Kim", "Amanda Foster",
  "Chris Martinez", "Jennifer Lee", "Mark Anderson", "Rachel Green",
];

const LI_TITLES = [
  "Owner at Small Business Solutions", "Operations Manager", "Franchise Director",
  "Retail Consultant", "Security Advisor", "Business Development",
  "Store Owner", "Regional Manager", "Entrepreneur", "COO at Local Chain",
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function scrapeLinkedIn(config: ScraperConfig): Promise<RawLead[]> {
  const { keywords, maxResults = 10 } = config;
  const leads: RawLead[] = [];
  const count = Math.min(maxResults, 15);
  const topic = keywords[0] || "security camera system";
  const business = keywords.includes("local business")
    ? "retail"
    : "small business";

  for (let i = 0; i < count; i++) {
    const name = pickRandom(LI_NAMES);
    const username = name.toLowerCase().replace(/\s/g, ".");
    const title = pickRandom(LI_TITLES);
    const content = pickRandom(LI_POSTS)
      .replace("{topic}", topic)
      .replace("{business}", business);
    const hoursAgo = Math.floor(Math.random() * 96); // Up to 4 days
    const postedAt = new Date(Date.now() - hoursAgo * 3600000);
    const likes = Math.floor(Math.random() * 300);
    const replies = Math.floor(Math.random() * 40);
    const followers = Math.floor(Math.random() * 15000) + 500;

    leads.push({
      source: "linkedin",
      sourceUrl: `https://linkedin.com/posts/${username}-demo${i}`,
      username,
      displayName: `${name} - ${title}`,
      content,
      postedAt,
      profileUrl: `https://linkedin.com/in/${username}`,
      contactInfo: { location: pickRandom(["New York, NY", "Los Angeles, CA", "Chicago, IL", "Austin, TX", "Miami, FL"]) },
      engagementMetrics: { upvotes: likes, replies, followers },
      metadata: { title, industry: business },
    });
  }

  return leads;
}
