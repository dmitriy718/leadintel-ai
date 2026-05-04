import type { RawLead, ScraperConfig } from "./types";

interface RedditPost {
  data: {
    title: string;
    selftext: string;
    author: string;
    permalink: string;
    created_utc: number;
    url: string;
    ups: number;
    num_comments: number;
    subreddit: string;
  };
}

interface RedditComment {
  data: {
    body: string;
    author: string;
    permalink: string;
    created_utc: number;
    ups: number;
  };
}

export async function scrapeReddit(config: ScraperConfig): Promise<RawLead[]> {
  const { keywords, maxResults = 15 } = config;
  const leads: RawLead[] = [];
  const query = keywords.join(" OR ");

  try {
    // Search posts
    const postRes = await fetch(
      `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=new&limit=${Math.min(maxResults, 25)}&t=week`,
      { headers: { "User-Agent": "LeadIntelBot/1.0" } }
    );

    if (postRes.ok) {
      const postData = await postRes.json() as { data?: { children?: RedditPost[] } };
      const posts: RedditPost[] = postData.data?.children || [];

      for (const post of posts) {
        const p = post.data;
        if (!p || !p.author || p.author === "[deleted]") continue;

        leads.push({
          source: "reddit",
          sourceUrl: `https://www.reddit.com${p.permalink}`,
          username: p.author,
          displayName: p.author,
          content: p.selftext || p.title,
          title: p.title,
          postedAt: new Date(p.created_utc * 1000),
          profileUrl: `https://www.reddit.com/user/${p.author}`,
          engagementMetrics: {
            upvotes: p.ups,
            replies: p.num_comments,
          },
          metadata: { subreddit: p.subreddit, type: "post" },
        });
      }
    }

    // Search comments via a specific subreddit search (general)
    const commentRes = await fetch(
      `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=new&limit=${Math.min(maxResults, 15)}&t=week&type=comment`,
      { headers: { "User-Agent": "LeadIntelBot/1.0" } }
    );

    if (commentRes.ok) {
      const commentData = await commentRes.json() as { data?: { children?: RedditComment[] } };
      const comments: RedditComment[] = commentData.data?.children || [];

      for (const comment of comments) {
        const c = comment.data;
        if (!c || !c.author || c.author === "[deleted]") continue;

        // Avoid duplicates
        if (leads.some((l) => l.username === c.author && l.content === c.body)) continue;

        leads.push({
          source: "reddit",
          sourceUrl: `https://www.reddit.com${c.permalink}`,
          username: c.author,
          displayName: c.author,
          content: c.body,
          postedAt: new Date(c.created_utc * 1000),
          profileUrl: `https://www.reddit.com/user/${c.author}`,
          engagementMetrics: { upvotes: c.ups },
          metadata: { type: "comment" },
        });
      }
    }
  } catch (error) {
    console.error("Reddit scraping error:", error);
  }

  return leads.slice(0, maxResults);
}
