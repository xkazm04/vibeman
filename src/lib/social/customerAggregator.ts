/**
 * Customer Aggregator
 * Builds unified customer profiles by aggregating identities across channels
 */

import type { FeedbackItem, KanbanChannel, Sentiment } from '@/app/features/Social/lib/types/feedbackTypes';
import type {
  UnifiedCustomer,
  CustomerChannelIdentity,
  CustomerMatch,
  ValueScoreFactors,
  InteractionHistoryEntry,
} from './types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Customer matching configuration
 */
export interface MatchingConfig {
  emailMatchWeight: number;
  handleMatchWeight: number;
  nameMatchWeight: number;
  minConfidenceThreshold: number;
}

const DEFAULT_MATCHING_CONFIG: MatchingConfig = {
  emailMatchWeight: 1.0, // Exact email match = 100% confidence
  handleMatchWeight: 0.9, // Handle match = 90% confidence
  nameMatchWeight: 0.6, // Name match = 60% confidence
  minConfidenceThreshold: 0.5, // Require 50% confidence to match
};

/**
 * Value scoring weights
 */
interface ValueScoringWeights {
  interactionFrequency: { max: number; weight: number };
  channelDiversity: { max: number; weight: number };
  engagement: { max: number; weight: number };
  sentiment: { weight: number };
  longevity: { maxDays: number; weight: number };
  influence: { maxFollowers: number; verifiedBonus: number; weight: number };
}

const VALUE_SCORING_WEIGHTS: ValueScoringWeights = {
  interactionFrequency: { max: 25, weight: 0.25 }, // Max 25 interactions = full score
  channelDiversity: { max: 15, weight: 0.15 }, // Max 5 channels * 3 = 15
  engagement: { max: 20, weight: 0.20 }, // Engagement score
  sentiment: { weight: 0.20 }, // Sentiment score
  longevity: { maxDays: 365, weight: 0.10 }, // 1 year = full longevity score
  influence: { maxFollowers: 10000, verifiedBonus: 5, weight: 0.10 }, // Influence
};

/**
 * CustomerAggregator class
 * Manages customer identity aggregation and value scoring
 */
export class CustomerAggregator {
  private matchingConfig: MatchingConfig;
  private customers: Map<string, UnifiedCustomer> = new Map();

  constructor(config: Partial<MatchingConfig> = {}) {
    this.matchingConfig = { ...DEFAULT_MATCHING_CONFIG, ...config };
  }

  /**
   * Process feedback items and aggregate into customer profiles
   */
  aggregateFromFeedback(items: FeedbackItem[]): UnifiedCustomer[] {
    for (const item of items) {
      const match = this.findCustomerMatch(item);

      if (match.customer && match.confidence >= this.matchingConfig.minConfidenceThreshold) {
        // Update existing customer
        this.updateCustomer(match.customer, item);
      } else {
        // Create new customer
        const newCustomer = this.createCustomerFromFeedback(item);
        this.customers.set(newCustomer.id, newCustomer);
      }
    }

    // Recalculate value scores
    for (const customer of this.customers.values()) {
      customer.valueScore = this.calculateValueScore(customer);
    }

    return Array.from(this.customers.values());
  }

  /**
   * Find matching customer for a feedback item
   */
  findCustomerMatch(item: FeedbackItem): CustomerMatch {
    const { author } = item;
    let bestMatch: UnifiedCustomer | null = null;
    let bestConfidence = 0;
    let matchedBy: CustomerMatch['matchedBy'] = 'none';

    for (const customer of this.customers.values()) {
      // Try email match
      if (author.email && customer.primaryEmail) {
        if (this.normalizeEmail(author.email) === this.normalizeEmail(customer.primaryEmail)) {
          return {
            customer,
            confidence: this.matchingConfig.emailMatchWeight,
            matchedBy: 'email',
          };
        }
      }

      // Check channel email identities
      for (const identity of customer.channels) {
        if (author.email && identity.email) {
          if (this.normalizeEmail(author.email) === this.normalizeEmail(identity.email)) {
            return {
              customer,
              confidence: this.matchingConfig.emailMatchWeight,
              matchedBy: 'email',
            };
          }
        }
      }

      // Try handle match
      if (author.handle && customer.primaryHandle) {
        if (this.normalizeHandle(author.handle) === this.normalizeHandle(customer.primaryHandle)) {
          const confidence = this.matchingConfig.handleMatchWeight;
          if (confidence > bestConfidence) {
            bestMatch = customer;
            bestConfidence = confidence;
            matchedBy = 'handle';
          }
        }
      }

      // Check channel handle identities
      for (const identity of customer.channels) {
        if (author.handle && identity.handle) {
          if (this.normalizeHandle(author.handle) === this.normalizeHandle(identity.handle)) {
            const confidence = this.matchingConfig.handleMatchWeight;
            if (confidence > bestConfidence) {
              bestMatch = customer;
              bestConfidence = confidence;
              matchedBy = 'handle';
            }
          }
        }
      }

      // Try name match (fuzzy)
      const nameSimilarity = this.calculateNameSimilarity(author.name, customer.displayName);
      if (nameSimilarity > 0.8) {
        const confidence = this.matchingConfig.nameMatchWeight * nameSimilarity;
        if (confidence > bestConfidence) {
          bestMatch = customer;
          bestConfidence = confidence;
          matchedBy = 'name';
        }
      }
    }

    return {
      customer: bestMatch,
      confidence: bestConfidence,
      matchedBy,
    };
  }

  /**
   * Create a new customer from a feedback item
   */
  private createCustomerFromFeedback(item: FeedbackItem): UnifiedCustomer {
    const { author, channel, timestamp } = item;
    const now = new Date().toISOString();

    const identity: CustomerChannelIdentity = {
      channel,
      handle: author.handle || null,
      email: author.email || null,
      name: author.name,
      verified: author.verified,
      followers: author.followers,
    };

    return {
      id: uuidv4(),
      primaryEmail: author.email || null,
      primaryHandle: author.handle || null,
      displayName: author.name,
      channels: [identity],
      valueScore: 0, // Will be calculated later
      totalInteractions: 1,
      firstInteractionAt: timestamp,
      lastInteractionAt: timestamp,
      averageSentiment: item.analysis?.sentiment || null,
      tags: [],
      notes: [],
      isVerified: author.verified || false,
      followers: author.followers || 0,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Update an existing customer with new feedback
   */
  private updateCustomer(customer: UnifiedCustomer, item: FeedbackItem): void {
    const { author, channel, timestamp } = item;

    // Update interaction count
    customer.totalInteractions += 1;

    // Update timestamps
    if (new Date(timestamp) > new Date(customer.lastInteractionAt)) {
      customer.lastInteractionAt = timestamp;
    }
    if (new Date(timestamp) < new Date(customer.firstInteractionAt)) {
      customer.firstInteractionAt = timestamp;
    }

    // Add channel identity if new
    const existingIdentity = customer.channels.find(c => c.channel === channel);
    if (!existingIdentity) {
      customer.channels.push({
        channel,
        handle: author.handle || null,
        email: author.email || null,
        name: author.name,
        verified: author.verified,
        followers: author.followers,
      });
    } else {
      // Update existing identity with latest info
      if (author.handle) existingIdentity.handle = author.handle;
      if (author.email) existingIdentity.email = author.email;
      if (author.followers) existingIdentity.followers = author.followers;
      if (author.verified !== undefined) existingIdentity.verified = author.verified;
    }

    // Update primary identifiers if not set
    if (!customer.primaryEmail && author.email) {
      customer.primaryEmail = author.email;
    }
    if (!customer.primaryHandle && author.handle) {
      customer.primaryHandle = author.handle;
    }

    // Update verification status (if any identity is verified)
    if (author.verified) {
      customer.isVerified = true;
    }

    // Update follower count (use highest)
    if (author.followers && author.followers > customer.followers) {
      customer.followers = author.followers;
    }

    // Update average sentiment (simple moving average)
    if (item.analysis?.sentiment) {
      customer.averageSentiment = this.updateAverageSentiment(
        customer.averageSentiment,
        item.analysis.sentiment,
        customer.totalInteractions
      );
    }

    customer.updatedAt = new Date().toISOString();
  }

  /**
   * Calculate customer value score (0-100)
   */
  calculateValueScore(customer: UnifiedCustomer): number {
    const factors = this.calculateValueFactors(customer);

    return Math.round(
      factors.interactionFrequency +
      factors.channelDiversity +
      factors.engagement +
      factors.sentiment +
      factors.longevity +
      factors.influence
    );
  }

  /**
   * Calculate individual value scoring factors
   */
  calculateValueFactors(customer: UnifiedCustomer): ValueScoreFactors {
    const w = VALUE_SCORING_WEIGHTS;

    // Interaction frequency (0-25)
    const interactionFrequency = Math.min(
      customer.totalInteractions / w.interactionFrequency.max,
      1
    ) * 25;

    // Channel diversity (0-15)
    const channelDiversity = Math.min(
      (customer.channels.length * 3) / w.channelDiversity.max,
      1
    ) * 15;

    // Engagement (based on followers) (0-20)
    const engagement = Math.min(
      customer.followers / w.engagement.max,
      1
    ) * 20;

    // Sentiment score (0-20, positive sentiment = higher)
    const sentiment = this.sentimentToScore(customer.averageSentiment) * 20;

    // Longevity (0-10)
    const daysSinceFirst = Math.floor(
      (Date.now() - new Date(customer.firstInteractionAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    const longevity = Math.min(daysSinceFirst / w.longevity.maxDays, 1) * 10;

    // Influence (0-10)
    const followerScore = Math.min(customer.followers / w.influence.maxFollowers, 1) * (10 - w.influence.verifiedBonus);
    const verifiedBonus = customer.isVerified ? w.influence.verifiedBonus : 0;
    const influence = followerScore + verifiedBonus;

    return {
      interactionFrequency,
      channelDiversity,
      engagement,
      sentiment,
      longevity,
      influence,
    };
  }

  /**
   * Convert sentiment to numeric score (0-1)
   */
  private sentimentToScore(sentiment: Sentiment | null): number {
    const sentimentScores: Record<Sentiment, number> = {
      angry: 0.0,
      frustrated: 0.2,
      disappointed: 0.3,
      mocking: 0.3,
      neutral: 0.5,
      constructive: 0.7,
      helpful: 1.0,
    };

    return sentiment ? sentimentScores[sentiment] : 0.5;
  }

  /**
   * Update average sentiment (weighted average)
   */
  private updateAverageSentiment(
    current: Sentiment | null,
    newSentiment: Sentiment,
    count: number
  ): Sentiment {
    if (!current) {
      return newSentiment;
    }

    // Simple: use the most common sentiment or the most recent
    // For a more sophisticated approach, we'd track counts of each sentiment
    return newSentiment;
  }

  /**
   * Normalize email for comparison
   */
  private normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  /**
   * Normalize handle for comparison
   */
  private normalizeHandle(handle: string): string {
    // Remove @ prefix and lowercase
    return handle.replace(/^@/, '').toLowerCase().trim();
  }

  /**
   * Calculate name similarity (simple Levenshtein-based)
   */
  private calculateNameSimilarity(name1: string, name2: string): number {
    const s1 = name1.toLowerCase().trim();
    const s2 = name2.toLowerCase().trim();

    if (s1 === s2) return 1;
    if (s1.length === 0 || s2.length === 0) return 0;

    // Simple containment check
    if (s1.includes(s2) || s2.includes(s1)) {
      return 0.85;
    }

    // Levenshtein distance-based similarity
    const distance = this.levenshteinDistance(s1, s2);
    const maxLen = Math.max(s1.length, s2.length);
    return 1 - distance / maxLen;
  }

  /**
   * Levenshtein distance calculation
   */
  private levenshteinDistance(s1: string, s2: string): number {
    const m = s1.length;
    const n = s2.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (s1[i - 1] === s2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
      }
    }

    return dp[m][n];
  }

  /**
   * Merge two customer profiles
   */
  mergeCustomers(customer1: UnifiedCustomer, customer2: UnifiedCustomer): UnifiedCustomer {
    // Keep the older customer as the base
    const [base, merging] = new Date(customer1.createdAt) < new Date(customer2.createdAt)
      ? [customer1, customer2]
      : [customer2, customer1];

    return {
      id: base.id,
      primaryEmail: base.primaryEmail || merging.primaryEmail,
      primaryHandle: base.primaryHandle || merging.primaryHandle,
      displayName: base.displayName || merging.displayName,
      channels: this.mergeChannelIdentities(base.channels, merging.channels),
      valueScore: 0, // Will be recalculated
      totalInteractions: base.totalInteractions + merging.totalInteractions,
      firstInteractionAt: new Date(base.firstInteractionAt) < new Date(merging.firstInteractionAt)
        ? base.firstInteractionAt
        : merging.firstInteractionAt,
      lastInteractionAt: new Date(base.lastInteractionAt) > new Date(merging.lastInteractionAt)
        ? base.lastInteractionAt
        : merging.lastInteractionAt,
      averageSentiment: base.averageSentiment, // Keep base sentiment
      tags: [...new Set([...base.tags, ...merging.tags])],
      notes: [...base.notes, ...merging.notes],
      isVerified: base.isVerified || merging.isVerified,
      followers: Math.max(base.followers, merging.followers),
      createdAt: base.createdAt,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Merge channel identities, avoiding duplicates
   */
  private mergeChannelIdentities(
    channels1: CustomerChannelIdentity[],
    channels2: CustomerChannelIdentity[]
  ): CustomerChannelIdentity[] {
    const merged = new Map<string, CustomerChannelIdentity>();

    for (const identity of channels1) {
      const key = `${identity.channel}-${identity.handle || identity.email || identity.name}`;
      merged.set(key, identity);
    }

    for (const identity of channels2) {
      const key = `${identity.channel}-${identity.handle || identity.email || identity.name}`;
      if (!merged.has(key)) {
        merged.set(key, identity);
      }
    }

    return Array.from(merged.values());
  }

  /**
   * Build interaction history for a customer from feedback items
   */
  buildInteractionHistory(
    customer: UnifiedCustomer,
    feedbackItems: FeedbackItem[]
  ): InteractionHistoryEntry[] {
    const history: InteractionHistoryEntry[] = [];

    // Filter items for this customer
    const customerItems = feedbackItems.filter(item => {
      const email = item.author.email?.toLowerCase();
      const handle = item.author.handle?.toLowerCase();

      if (email && customer.primaryEmail?.toLowerCase() === email) return true;
      if (handle && customer.primaryHandle?.toLowerCase() === handle) return true;

      for (const identity of customer.channels) {
        if (email && identity.email?.toLowerCase() === email) return true;
        if (handle && identity.handle?.toLowerCase() === handle) return true;
      }

      return false;
    });

    // Convert to history entries
    for (const item of customerItems) {
      // Add feedback entry
      history.push({
        id: uuidv4(),
        type: 'feedback',
        timestamp: item.timestamp,
        channel: item.channel,
        summary: item.content.excerpt || item.content.body.substring(0, 100),
        details: {
          status: item.status,
          priority: item.priority,
          sentiment: item.analysis?.sentiment,
        },
        relatedItemId: item.id,
      });

      // Add response entry if there's a customer response
      if (item.customerResponse) {
        history.push({
          id: uuidv4(),
          type: 'response',
          timestamp: item.timestamp, // We don't have separate response timestamp
          channel: item.channel,
          summary: item.customerResponse.message.substring(0, 100),
          details: {
            tone: item.customerResponse.tone,
          },
          relatedItemId: item.id,
        });
      }

      // Add ticket entry if linked
      if (item.linkedTickets && item.linkedTickets.length > 0) {
        history.push({
          id: uuidv4(),
          type: 'ticket_created',
          timestamp: item.timestamp,
          channel: item.channel,
          summary: `Linked to tickets: ${item.linkedTickets.join(', ')}`,
          relatedItemId: item.id,
        });
      }

      // Add resolved entry if resolved
      if (item.resolvedAt) {
        history.push({
          id: uuidv4(),
          type: 'ticket_resolved',
          timestamp: item.resolvedAt,
          channel: item.channel,
          summary: `Resolved by ${item.resolvedBy || 'unknown'}`,
          relatedItemId: item.id,
        });
      }
    }

    // Sort by timestamp (newest first)
    return history.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  /**
   * Get all customers
   */
  getCustomers(): UnifiedCustomer[] {
    return Array.from(this.customers.values());
  }

  /**
   * Get customer by ID
   */
  getCustomerById(id: string): UnifiedCustomer | undefined {
    return this.customers.get(id);
  }

  /**
   * Set customers (for loading from storage)
   */
  setCustomers(customers: UnifiedCustomer[]): void {
    this.customers.clear();
    for (const customer of customers) {
      this.customers.set(customer.id, customer);
    }
  }

  /**
   * Add note to customer
   */
  addNote(customerId: string, note: string): boolean {
    const customer = this.customers.get(customerId);
    if (!customer) return false;

    customer.notes.push(note);
    customer.updatedAt = new Date().toISOString();
    return true;
  }

  /**
   * Add tag to customer
   */
  addTag(customerId: string, tag: string): boolean {
    const customer = this.customers.get(customerId);
    if (!customer) return false;

    if (!customer.tags.includes(tag)) {
      customer.tags.push(tag);
      customer.updatedAt = new Date().toISOString();
    }
    return true;
  }

  /**
   * Remove tag from customer
   */
  removeTag(customerId: string, tag: string): boolean {
    const customer = this.customers.get(customerId);
    if (!customer) return false;

    const index = customer.tags.indexOf(tag);
    if (index !== -1) {
      customer.tags.splice(index, 1);
      customer.updatedAt = new Date().toISOString();
    }
    return true;
  }
}

// Export singleton instance with default config
export const customerAggregator = new CustomerAggregator();
