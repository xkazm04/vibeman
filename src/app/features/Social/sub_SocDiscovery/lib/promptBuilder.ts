/**
 * Prompt Builder for Grok Discovery Search
 * Converts natural language queries into structured search prompts
 */

import type { DiscoveredTweet } from './types';

export const DISCOVERY_SYSTEM_PROMPT = `You are a Twitter/X content discovery assistant. Your job is to help find relevant tweets based on user queries.

When given a natural language description of what content to find, you should:
1. Understand the user's intent and topics of interest
2. Search for recent, relevant tweets matching their criteria
3. Return results in a specific JSON format

IMPORTANT: Return ONLY valid JSON, no additional text or markdown.

Response format:
{
  "tweets": [
    {
      "id": "tweet_id",
      "text": "full tweet text",
      "authorUsername": "username",
      "authorName": "Display Name",
      "createdAt": "ISO timestamp",
      "metrics": {
        "likes": 0,
        "retweets": 0,
        "replies": 0
      },
      "url": "https://x.com/username/status/tweet_id"
    }
  ],
  "searchQuery": "the interpreted search query used"
}`;

export function buildDiscoveryPrompt(naturalLanguageQuery: string): string {
  return `Find 10 recent tweets matching this description:

"${naturalLanguageQuery}"

Focus on:
- Recent and relevant content (last 7 days preferred)
- High engagement tweets when possible
- Diverse perspectives on the topic
- Original content (not just retweets)

Return exactly 10 tweets in the specified JSON format.`;
}

export function parseGrokResponse(response: string): {
  tweets: DiscoveredTweet[];
  searchQuery: string;
} {
  // Try to extract JSON from the response
  let jsonStr = response.trim();

  // Remove markdown code blocks if present
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
  }

  try {
    const parsed = JSON.parse(jsonStr);
    return {
      tweets: (parsed.tweets || []).map((tweet: Record<string, unknown>) => {
        const metrics = (tweet.metrics || {}) as Record<string, unknown>;
        return {
          id: String(tweet.id || ''),
          text: String(tweet.text || ''),
          authorUsername: String(tweet.authorUsername || ''),
          authorName: String(tweet.authorName || ''),
          authorProfileImage: tweet.authorProfileImage as string | undefined,
          createdAt: String(tweet.createdAt || new Date().toISOString()),
          metrics: {
            likes: Number(metrics.likes) || 0,
            retweets: Number(metrics.retweets) || 0,
            replies: Number(metrics.replies) || 0,
          },
          url: String(tweet.url || ''),
        };
      }),
      searchQuery: String(parsed.searchQuery || ''),
    };
  } catch {
    throw new Error('Failed to parse Grok response as JSON');
  }
}
