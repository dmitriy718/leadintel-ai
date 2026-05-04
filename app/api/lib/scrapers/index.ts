import { scrapeReddit } from "./reddit";
import { scrapeHackerNews } from "./hackernews";
import { scrapeStackOverflow } from "./stackoverflow";
import { scrapeGitHub } from "./github";
import { scrapeTwitter } from "./twitter";
import { scrapeQuora } from "./quora";
import { scrapeYouTube } from "./youtube";
import { scrapeLinkedIn } from "./linkedin";
import { scrapeGoogleMaps } from "./googlemaps";

export const SCRAPERS = {
  reddit: scrapeReddit,
  hackernews: scrapeHackerNews,
  stackoverflow: scrapeStackOverflow,
  github: scrapeGitHub,
  twitter: scrapeTwitter,
  quora: scrapeQuora,
  youtube: scrapeYouTube,
  linkedin: scrapeLinkedIn,
  googlemaps: scrapeGoogleMaps,
} as const;

export type ChannelName = keyof typeof SCRAPERS;

export const CHANNEL_LABELS: Record<ChannelName, string> = {
  reddit: "Reddit",
  hackernews: "Hacker News",
  stackoverflow: "Stack Overflow",
  github: "GitHub",
  twitter: "Twitter / X",
  quora: "Quora",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  googlemaps: "Google Maps",
};

export * from "./types";
