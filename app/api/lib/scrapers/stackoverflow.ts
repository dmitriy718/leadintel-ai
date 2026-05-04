import type { RawLead, ScraperConfig } from "./types";

interface SOItem {
  question_id: number;
  title: string;
  body: string;
  owner: {
    display_name: string;
    link: string;
    reputation?: number;
  };
  creation_date: number;
  link: string;
  score: number;
  answer_count: number;
  view_count: number;
  tags: string[];
}

interface SOResponse {
  items: SOItem[];
}

export async function scrapeStackOverflow(config: ScraperConfig): Promise<RawLead[]> {
  const { keywords, maxResults = 15 } = config;
  const leads: RawLead[] = [];
  const query = keywords.join(" ");

  try {
    const res = await fetch(
      `https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=creation&q=${encodeURIComponent(query)}&site=stackoverflow&pagesize=${Math.min(maxResults, 30)}`,
      { headers: { "User-Agent": "LeadIntelBot/1.0" } }
    );

    if (res.ok) {
      const data = await res.json() as SOResponse;
      const items = data.items || [];

      for (const item of items) {
        if (!item.owner?.display_name) continue;

        leads.push({
          source: "stackoverflow",
          sourceUrl: item.link,
          username: item.owner.display_name,
          displayName: item.owner.display_name,
          content: item.body ? stripHtml(item.body) : item.title,
          title: item.title,
          postedAt: new Date(item.creation_date * 1000),
          profileUrl: item.owner.link,
          engagementMetrics: {
            upvotes: item.score,
            replies: item.answer_count,
            views: item.view_count,
          },
          metadata: { tags: item.tags, reputation: item.owner.reputation },
        });
      }
    }
  } catch (error) {
    console.error("StackOverflow scraping error:", error);
  }

  return leads.slice(0, maxResults);
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
