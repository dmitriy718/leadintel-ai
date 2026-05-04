export interface RawLead {
  source: string;
  sourceUrl: string;
  username: string;
  displayName: string;
  content: string;
  title?: string;
  postedAt: Date;
  profileUrl?: string;
  contactInfo?: {
    email?: string;
    website?: string;
    phone?: string;
    location?: string;
  };
  engagementMetrics?: {
    upvotes?: number;
    replies?: number;
    views?: number;
    followers?: number;
  };
  metadata?: Record<string, unknown>;
}

export interface ScraperConfig {
  keywords: string[];
  maxResults?: number;
}

export type ScraperFunction = (config: ScraperConfig) => Promise<RawLead[]>;
