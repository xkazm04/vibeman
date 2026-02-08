/**
 * InterrogativeEngine<T>
 *
 * Reusable engine for the "interrogative development" pattern:
 * generate probing items → present to user → user decides → convert to actions.
 *
 * Features that use this pattern:
 * - Questions & Directions: generate questions, user answers, generate directions, user accepts
 * - Tinder: swipe-style accept/reject on ideas and directions
 * - DecisionQueue: sequential decision processing from scan results
 * - RefactorWizard: technique selection and package generation
 * - TechDebt/Security: prioritization and review flows
 * - Backlog proposals: accept/reject proposals
 *
 * Each feature instantiates the engine with domain-specific strategies.
 */

import type {
  InterrogativeItem,
  InterrogativeEngineConfig,
  AcceptResult,
  AnswerResult,
  ItemCounts,
  ItemStatus,
} from './types';

export class InterrogativeEngine<T extends InterrogativeItem, TGenConfig = unknown> {
  constructor(private readonly config: InterrogativeEngineConfig<T, TGenConfig>) {}

  get name(): string {
    return this.config.name;
  }

  // ==========================================================================
  // GENERATION
  // ==========================================================================

  /**
   * Generate new interrogative items using the configured generation strategy.
   * Items are saved to persistence and onGenerated hook is called.
   */
  async generate(genConfig: TGenConfig): Promise<T[]> {
    if (!this.config.generation) {
      throw new Error(`[InterrogativeEngine:${this.config.name}] No generation strategy configured`);
    }

    const items = await this.config.generation.generate(genConfig);

    // Save all generated items
    for (const item of items) {
      await this.config.persistence.save(item);
    }

    await this.config.hooks?.onGenerated?.(items);

    return items;
  }

  // ==========================================================================
  // DECISIONS
  // ==========================================================================

  /**
   * Accept an item. Calls decision strategy and updates status.
   * Protected by optional beforeAccept hook.
   */
  async accept(itemId: string): Promise<AcceptResult> {
    const item = await this.config.persistence.getById(itemId);
    if (!item) {
      return { success: false, error: 'Item not found' };
    }

    // Guard: beforeAccept hook can prevent acceptance
    const proceed = await this.config.hooks?.beforeAccept?.(item);
    if (proceed === false) {
      return { success: false, error: 'Acceptance blocked by hook' };
    }

    // Transition to processing (idempotency protection)
    await this.config.persistence.updateStatus(itemId, 'processing');

    try {
      const result = await this.config.decision.onAccept(item);

      if (result.success) {
        await this.config.persistence.updateStatus(itemId, 'accepted');
        await this.config.hooks?.afterAccept?.(item, result);
      } else {
        // Revert to pending on failure
        await this.config.persistence.updateStatus(itemId, 'pending');
      }

      return result;
    } catch (err) {
      // Revert to pending on error
      await this.config.persistence.updateStatus(itemId, 'pending');
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  /**
   * Reject an item. Calls optional decision strategy and updates status.
   */
  async reject(itemId: string): Promise<void> {
    const item = await this.config.persistence.getById(itemId);
    if (!item) return;

    await this.config.decision.onReject?.(item);
    await this.config.persistence.updateStatus(itemId, 'rejected');
    await this.config.hooks?.afterReject?.(item);
  }

  /**
   * Answer an item (for question-style flows).
   * Only available if the decision strategy provides onAnswer.
   */
  async answer(itemId: string, answerText: string): Promise<AnswerResult> {
    if (!this.config.decision.onAnswer) {
      return { success: false, error: 'Answer not supported by this engine' };
    }

    const item = await this.config.persistence.getById(itemId);
    if (!item) {
      return { success: false, error: 'Item not found' };
    }

    const result = await this.config.decision.onAnswer(item, answerText);

    if (result.success) {
      await this.config.persistence.updateStatus(itemId, 'answered');
      await this.config.hooks?.afterAnswer?.(item, answerText, result);
    }

    return result;
  }

  // ==========================================================================
  // QUERIES
  // ==========================================================================

  /** Get all items */
  async getAll(): Promise<T[]> {
    return this.config.persistence.getAll();
  }

  /** Get a single item by ID */
  async getById(id: string): Promise<T | null> {
    return this.config.persistence.getById(id);
  }

  /** Get items filtered by status */
  async getByStatus(status: ItemStatus): Promise<T[]> {
    const all = await this.config.persistence.getAll();
    return all.filter((item) => item.status === status);
  }

  /** Get pending items (awaiting user decision) */
  async getPending(): Promise<T[]> {
    return this.getByStatus('pending');
  }

  /** Count items by status */
  async getCounts(): Promise<ItemCounts> {
    const all = await this.config.persistence.getAll();
    const counts: ItemCounts = {
      pending: 0,
      answered: 0,
      accepted: 0,
      rejected: 0,
      processing: 0,
      total: all.length,
    };

    for (const item of all) {
      if (item.status in counts) {
        counts[item.status as keyof Omit<ItemCounts, 'total'>]++;
      }
    }

    return counts;
  }

  // ==========================================================================
  // BATCH OPERATIONS
  // ==========================================================================

  /** Accept multiple items */
  async acceptMany(itemIds: string[]): Promise<{ accepted: number; failed: number }> {
    let accepted = 0;
    let failed = 0;

    for (const id of itemIds) {
      const result = await this.accept(id);
      if (result.success) accepted++;
      else failed++;
    }

    return { accepted, failed };
  }

  /** Reject multiple items */
  async rejectMany(itemIds: string[]): Promise<number> {
    let rejected = 0;

    for (const id of itemIds) {
      await this.reject(id);
      rejected++;
    }

    return rejected;
  }

  /** Delete an item */
  async delete(itemId: string): Promise<boolean> {
    return !!(await this.config.persistence.delete(itemId));
  }

  // ==========================================================================
  // QUEUE PROCESSING (for sequential decision flows like DecisionQueue)
  // ==========================================================================

  /**
   * Get the next pending item (FIFO order by createdAt).
   * Useful for queue-style sequential processing.
   */
  async getNext(): Promise<T | null> {
    const pending = await this.getPending();
    if (pending.length === 0) return null;
    return pending.sort((a, b) => a.createdAt - b.createdAt)[0];
  }

  /**
   * Process the next pending item with the given decision.
   * Returns null if no pending items.
   */
  async processNext(
    decision: 'accept' | 'reject',
    answer?: string
  ): Promise<AcceptResult | AnswerResult | null> {
    const next = await this.getNext();
    if (!next) return null;

    if (answer !== undefined) {
      return this.answer(next.id, answer);
    }

    if (decision === 'accept') {
      return this.accept(next.id);
    }

    await this.reject(next.id);
    return { success: true } as AcceptResult;
  }
}
