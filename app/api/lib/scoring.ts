/**
 * ML Lead Scoring Engine
 * Produces a 0-1 relevance score based on semantic similarity,
 * keyword density, source authority, recency, and engagement.
 */

export interface ScoringInput {
  content: string;
  title?: string;
  keywords: string[];
  source: string;
  postedAt?: Date | null;
  engagement?: {
    upvotes?: number;
    replies?: number;
    views?: number;
    followers?: number;
  };
}

export interface ScoringResult {
  score: number;
  keywordMatches: string[];
  breakdown: {
    semanticSimilarity: number;
    keywordDensity: number;
    sourceWeight: number;
    recencyBoost: number;
    engagementBoost: number;
  };
}

// Source intent weights - higher = more buying/sales intent
const SOURCE_WEIGHTS: Record<string, number> = {
  reddit: 0.82,
  twitter: 0.75,
  quora: 0.92,
  github: 0.70,
  stackoverflow: 0.78,
  youtube: 0.65,
  hackernews: 0.88,
  linkedin: 0.95,
  googlemaps: 0.90,
};

// Common synonym expansions for semantic matching
const SYNONYM_MAP: Record<string, string[]> = {
  "security cam": ["security camera", "surveillance camera", "cctv", "ip camera", "webcam", "security system"],
  "system": ["platform", "solution", "software", "infrastructure", "setup", "environment"],
  "local business": ["small business", "smb", "store", "shop", "retail", "restaurant", "startup", "company"],
  "surveillance": ["monitoring", "security", "cctv", "watching", "tracking"],
  "camera": ["cam", "webcam", "ip cam", "recording device", "dvr", "nvr"],
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function stemWord(word: string): string {
  // Simple stemming rules
  if (word.endsWith("ing") && word.length > 5) return word.slice(0, -3);
  if (word.endsWith("ed") && word.length > 4) return word.slice(0, -2);
  if (word.endsWith("s") && word.length > 3) return word.slice(0, -1);
  if (word.endsWith("es") && word.length > 4) return word.slice(0, -2);
  if (word.endsWith("er") && word.length > 4) return word.slice(0, -2);
  if (word.endsWith("tion") && word.length > 6) return word.slice(0, -4);
  return word;
}

function getAllKeywordForms(keywords: string[]): string[] {
  const forms = new Set<string>();
  for (const kw of keywords) {
    forms.add(kw.toLowerCase());
    const tokens = kw.toLowerCase().split(/\s+/);
    for (const t of tokens) {
      forms.add(t);
      forms.add(stemWord(t));
    }
    // Add synonyms
    for (const [key, syns] of Object.entries(SYNONYM_MAP)) {
      if (kw.toLowerCase().includes(key) || key.includes(kw.toLowerCase())) {
        for (const syn of syns) {
          forms.add(syn);
          for (const st of syn.split(/\s+/)) {
            forms.add(st);
            forms.add(stemWord(st));
          }
        }
      }
    }
  }
  return Array.from(forms);
}

function computeTfIdfVector(text: string, vocabulary: string[]): Map<string, number> {
  const tokens = tokenize(text);
  const tokenStems = tokens.map(stemWord);
  const vector = new Map<string, number>();
  const totalTerms = tokens.length || 1;

  for (const term of vocabulary) {
    const termStem = stemWord(term);
    let tf = 0;
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i] === term || tokens[i] === termStem || tokenStems[i] === term || tokenStems[i] === termStem) {
        tf++;
      }
    }
    // Normalize by document length
    vector.set(term, tf / totalTerms);
  }
  return vector;
}

function cosineSimilarity(v1: Map<string, number>, v2: Map<string, number>): number {
  let dot = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (const [key, val] of v1.entries()) {
    norm1 += val * val;
    const val2 = v2.get(key) || 0;
    dot += val * val2;
  }
  for (const val of v2.values()) {
    norm2 += val * val;
  }

  if (norm1 === 0 || norm2 === 0) return 0;
  return dot / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

function computeSemanticSimilarity(content: string, title: string, keywords: string[]): number {
  const allForms = getAllKeywordForms(keywords);
  const vocabulary = [...new Set([...tokenize(content), ...tokenize(title), ...allForms])];

  const keywordText = keywords.join(" ") + " " + allForms.join(" ");
  const fullContent = content + " " + title;

  const keywordVector = computeTfIdfVector(keywordText, vocabulary);
  const contentVector = computeTfIdfVector(fullContent, vocabulary);

  return cosineSimilarity(keywordVector, contentVector);
}

function computeKeywordDensity(content: string, title: string, keywords: string[]): { score: number; matches: string[] } {
  const fullText = (content + " " + title).toLowerCase();
  const tokens = tokenize(fullText);
  const matches: string[] = [];
  let matchCount = 0;
  let totalTokens = tokens.length || 1;

  for (const kw of keywords) {
    const kwLower = kw.toLowerCase();
    // Check exact phrase match
    if (fullText.includes(kwLower)) {
      matches.push(kw);
      // Count occurrences
      const regex = new RegExp(kwLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
      const occurrences = (fullText.match(regex) || []).length;
      matchCount += occurrences * 2; // Phrase matches weighted higher
    } else {
      // Check partial token matches
      const kwTokens = kwLower.split(/\s+/);
      let partialMatches = 0;
      for (const kt of kwTokens) {
        if (tokens.some((t) => t === kt || stemWord(t) === stemWord(kt))) {
          partialMatches++;
        }
      }
      if (partialMatches === kwTokens.length) {
        matches.push(kw);
        matchCount += 1;
      } else if (partialMatches > 0) {
        matchCount += partialMatches * 0.3;
      }
    }
  }

  // Check synonym matches
  for (const [key, syns] of Object.entries(SYNONYM_MAP)) {
    if (!matches.includes(key)) {
      for (const syn of syns) {
        if (fullText.includes(syn.toLowerCase())) {
          matchCount += 0.5;
          break;
        }
      }
    }
  }

  // Normalize: aim for 5-10% keyword density as ideal
  const density = matchCount / totalTokens;
  const idealDensity = 0.08;
  const score = Math.max(0, 1 - Math.abs(density - idealDensity) / idealDensity);

  return { score: Math.min(1, score + matches.length * 0.1), matches: [...new Set(matches)] };
}

function computeRecencyBoost(postedAt: Date | null | undefined): number {
  if (!postedAt) return 0.5;
  const now = new Date();
  const hoursAgo = (now.getTime() - postedAt.getTime()) / (1000 * 60 * 60);
  if (hoursAgo < 1) return 1.0;
  if (hoursAgo < 6) return 0.95;
  if (hoursAgo < 24) return 0.90;
  if (hoursAgo < 72) return 0.80;
  if (hoursAgo < 168) return 0.65; // 1 week
  if (hoursAgo < 720) return 0.45; // 1 month
  return 0.25;
}

function computeEngagementBoost(engagement?: ScoringInput["engagement"]): number {
  if (!engagement) return 0.5;
  let score = 0.5;

  if (engagement.upvotes !== undefined) {
    if (engagement.upvotes > 100) score += 0.25;
    else if (engagement.upvotes > 50) score += 0.2;
    else if (engagement.upvotes > 20) score += 0.15;
    else if (engagement.upvotes > 5) score += 0.1;
    else if (engagement.upvotes > 0) score += 0.05;
  }

  if (engagement.replies !== undefined) {
    if (engagement.replies > 50) score += 0.15;
    else if (engagement.replies > 20) score += 0.1;
    else if (engagement.replies > 5) score += 0.05;
  }

  if (engagement.views !== undefined) {
    if (engagement.views > 10000) score += 0.1;
    else if (engagement.views > 1000) score += 0.05;
  }

  if (engagement.followers !== undefined) {
    if (engagement.followers > 10000) score += 0.15;
    else if (engagement.followers > 1000) score += 0.1;
    else if (engagement.followers > 100) score += 0.05;
  }

  return Math.min(1, score);
}

export function scoreLead(input: ScoringInput): ScoringResult {
  const { content, title = "", keywords, source, postedAt, engagement } = input;

  // 1. Semantic Similarity (0-1) - 40% weight
  const semanticSimilarity = computeSemanticSimilarity(content, title, keywords);

  // 2. Keyword Density (0-1) - 30% weight
  const { score: keywordDensityScore, matches } = computeKeywordDensity(content, title, keywords);

  // 3. Source Weight (0-1) - 20% weight
  const sourceWeight = SOURCE_WEIGHTS[source.toLowerCase()] || 0.5;

  // 4. Recency Boost (0-1) - 10% weight (half of it)
  const recencyBoost = computeRecencyBoost(postedAt);

  // 5. Engagement Boost (0-1) - 10% weight (half of it)
  const engagementBoost = computeEngagementBoost(engagement);

  // Weighted composite
  const rawScore =
    semanticSimilarity * 0.40 +
    keywordDensityScore * 0.30 +
    sourceWeight * 0.15 +
    recencyBoost * 0.075 +
    engagementBoost * 0.075;

  // Apply sigmoid-like normalization to spread scores better
  const normalizedScore = 1 / (1 + Math.exp(-5 * (rawScore - 0.5)));

  // Ensure minimum score for any matched keyword
  const finalScore = matches.length > 0 ? Math.max(0.25, normalizedScore) : normalizedScore * 0.5;

  return {
    score: Math.round(finalScore * 1000) / 1000,
    keywordMatches: matches,
    breakdown: {
      semanticSimilarity: Math.round(semanticSimilarity * 1000) / 1000,
      keywordDensity: Math.round(keywordDensityScore * 1000) / 1000,
      sourceWeight: Math.round(sourceWeight * 1000) / 1000,
      recencyBoost: Math.round(recencyBoost * 1000) / 1000,
      engagementBoost: Math.round(engagementBoost * 1000) / 1000,
    },
  };
}
