import type { RawLead, ScraperConfig } from "./types";

interface GitHubIssue {
  id: number;
  title: string;
  body: string | null;
  user: {
    login: string;
    html_url: string;
  };
  html_url: string;
  created_at: string;
  comments: number;
  reactions?: {
    total_count: number;
  };
  state: string;
}

export async function scrapeGitHub(config: ScraperConfig): Promise<RawLead[]> {
  const { keywords, maxResults = 15 } = config;
  const leads: RawLead[] = [];
  const query = keywords.join(" ");

  try {
    // Search issues and discussions via GitHub search API
    const res = await fetch(
      `https://api.github.com/search/issues?q=${encodeURIComponent(query)}+is:issue+sort:created-desc&per_page=${Math.min(maxResults, 30)}`,
      {
        headers: {
          "User-Agent": "LeadIntelBot/1.0",
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (res.ok) {
      const data = await res.json() as { items?: GitHubIssue[] };
      const items: GitHubIssue[] = data.items || [];

      for (const item of items) {
        if (!item.user?.login) continue;

        leads.push({
          source: "github",
          sourceUrl: item.html_url,
          username: item.user.login,
          displayName: item.user.login,
          content: item.body || item.title,
          title: item.title,
          postedAt: new Date(item.created_at),
          profileUrl: item.user.html_url,
          engagementMetrics: {
            replies: item.comments,
            upvotes: item.reactions?.total_count || 0,
          },
          metadata: { state: item.state, issueId: item.id },
        });
      }
    }
  } catch (error) {
    console.error("GitHub scraping error:", error);
  }

  return leads.slice(0, maxResults);
}
