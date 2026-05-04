import type { RawLead, ScraperConfig } from "./types";

interface HNHit {
  objectID: string;
  title: string | null;
  story_text: string | null;
  comment_text: string | null;
  author: string;
  created_at: string;
  points: number | null;
  num_comments: number | null;
  url: string | null;
  _tags: string[];
}

interface HNResponse {
  hits: HNHit[];
}

export async function scrapeHackerNews(config: ScraperConfig): Promise<RawLead[]> {
  const { keywords, maxResults = 15 } = config;
  const leads: RawLead[] = [];
  const query = keywords.join(" ");

  try {
    const res = await fetch(
      `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(query)}&tags=(story,comment)&numericFilters=created_at_i>${Math.floor(Date.now() / 1000) - 604800}`,
      { headers: { "User-Agent": "LeadIntelBot/1.0" } }
    );

    if (res.ok) {
      const data = await res.json() as HNResponse;
      const hits = data.hits || [];

      for (const hit of hits) {
        if (!hit.author) continue;

        const isComment = hit._tags?.includes("comment");
        const content = hit.comment_text || hit.story_text || hit.title || "";
        const title = isComment ? undefined : hit.title || undefined;
        const sourceUrl = hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`;

        leads.push({
          source: "hackernews",
          sourceUrl,
          username: hit.author,
          displayName: hit.author,
          content,
          title,
          postedAt: new Date(hit.created_at),
          profileUrl: `https://news.ycombinator.com/user?id=${hit.author}`,
          engagementMetrics: {
            upvotes: hit.points || 0,
            replies: hit.num_comments || 0,
          },
          metadata: { type: isComment ? "comment" : "story", objectID: hit.objectID },
        });
      }
    }
  } catch (error) {
    console.error("HackerNews scraping error:", error);
  }

  return leads.slice(0, maxResults);
}
