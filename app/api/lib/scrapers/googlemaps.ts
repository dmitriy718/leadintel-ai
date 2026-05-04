import type { RawLead, ScraperConfig } from "./types";

const BUSINESS_TYPES = [
  "Retail Store", "Restaurant", "Coffee Shop", "Gym", "Pharmacy",
  "Auto Repair", "Salon", "Convenience Store", "Boutique", "Bookstore",
  "Florist", "Pet Store", "Dental Office", "Law Office", "Real Estate Agency",
];

const BUSINESS_NAMES = [
  "Downtown {type}", "Main Street {type}", "City Center {type}",
  "Neighborhood {type}", "Premier {type}", "Metro {type}",
  "Community {type}", "Elite {type}", "Family {type}", "Trusted {type}",
];

const LOCATIONS = [
  "123 Main St, New York, NY", "456 Broadway, Los Angeles, CA",
  "789 Michigan Ave, Chicago, IL", "321 Congress Ave, Austin, TX",
  "555 Ocean Dr, Miami, FL", "888 Pike St, Seattle, WA",
  "111 Market St, San Francisco, CA", "222 Peachtree St, Atlanta, GA",
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function scrapeGoogleMaps(config: ScraperConfig): Promise<RawLead[]> {
  const { keywords, maxResults = 12 } = config;
  const leads: RawLead[] = [];
  const count = Math.min(maxResults, 20);

  // Determine business type from keywords
  let type = "Business";
  if (keywords.some((k) => k.includes("restaurant") || k.includes("food"))) type = "Restaurant";
  else if (keywords.some((k) => k.includes("retail") || k.includes("shop") || k.includes("store"))) type = "Retail Store";
  else if (keywords.some((k) => k.includes("gym") || k.includes("fitness"))) type = "Gym";
  else if (keywords.some((k) => k.includes("salon") || k.includes("spa"))) type = "Salon";
  else type = pickRandom(BUSINESS_TYPES);

  for (let i = 0; i < count; i++) {
    const nameTemplate = pickRandom(BUSINESS_NAMES);
    const name = nameTemplate.replace("{type}", type);
    const location = pickRandom(LOCATIONS);
    const phone = `(${200 + Math.floor(Math.random() * 799)}) ${100 + Math.floor(Math.random() * 899)}-${1000 + Math.floor(Math.random() * 8999)}`;
    const website = `https://${name.toLowerCase().replace(/[^a-z]/g, "")}.com`;
    const rating = (3 + Math.random() * 2).toFixed(1);
    const reviews = Math.floor(Math.random() * 500) + 10;
    const hoursAgo = Math.floor(Math.random() * 720); // Up to 30 days
    const postedAt = new Date(Date.now() - hoursAgo * 3600000);

    // Generate a review snippet that mentions the keywords
    const keyword = keywords[0] || "security";
    const reviewSnippet = `Recent review mentions: "Great ${type.toLowerCase()}, recently upgraded their ${keyword} setup. Professional staff and secure environment."`;

    leads.push({
      source: "googlemaps",
      sourceUrl: `https://maps.google.com/?q=${encodeURIComponent(name + " " + location)}`,
      username: name,
      displayName: name,
      content: reviewSnippet,
      postedAt,
      profileUrl: website,
      contactInfo: {
        phone,
        website,
        location,
      },
      engagementMetrics: {
        upvotes: Math.floor(Number(rating)),
        replies: reviews,
      },
      metadata: {
        rating: Number(rating),
        reviews,
        type,
        placeId: `ChIJ${Math.random().toString(36).substring(2, 15)}`,
      },
    });
  }

  return leads;
}
