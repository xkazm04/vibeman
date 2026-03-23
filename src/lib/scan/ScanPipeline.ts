/**
 * Scan Pipeline
 *
 * Composable middleware chain for the scan lifecycle.
 * Strategies build a pipeline of ScanMiddleware steps and execute them
 * with next() semantics, allowing steps to be skipped, reordered, or
 * wrapped with cross-cutting concerns (timing, logging, etc.).
 */

import type { ScanMiddleware, ScanContext } from './types';

/**
 * Executes a list of middleware in order using next() chaining.
 * Each middleware calls next() to invoke the remainder of the chain.
 */
export class ScanPipeline {
  private readonly middleware: ScanMiddleware[] = [];

  /** Append middleware to the end of the chain. */
  use(...mw: ScanMiddleware[]): this {
    this.middleware.push(...mw);
    return this;
  }

  /** Insert middleware at a specific position. */
  insertAt(index: number, mw: ScanMiddleware): this {
    this.middleware.splice(index, 0, mw);
    return this;
  }

  /** Insert middleware before the first middleware with the given name. */
  insertBefore(name: string, mw: ScanMiddleware): this {
    const idx = this.middleware.findIndex(m => m.name === name);
    if (idx === -1) {
      this.middleware.push(mw);
    } else {
      this.middleware.splice(idx, 0, mw);
    }
    return this;
  }

  /** Insert middleware after the first middleware with the given name. */
  insertAfter(name: string, mw: ScanMiddleware): this {
    const idx = this.middleware.findIndex(m => m.name === name);
    if (idx === -1) {
      this.middleware.push(mw);
    } else {
      this.middleware.splice(idx + 1, 0, mw);
    }
    return this;
  }

  /** Remove middleware by name. Returns true if found and removed. */
  remove(name: string): boolean {
    const idx = this.middleware.findIndex(m => m.name === name);
    if (idx !== -1) {
      this.middleware.splice(idx, 1);
      return true;
    }
    return false;
  }

  /** Get the list of middleware names (for debugging). */
  getNames(): string[] {
    return this.middleware.map(m => m.name);
  }

  /**
   * Execute the full middleware chain with the given context.
   * Builds a nested next() call stack and invokes it.
   */
  async execute(ctx: ScanContext): Promise<void> {
    let index = 0;

    const next = async (): Promise<void> => {
      if (index >= this.middleware.length) return;
      const mw = this.middleware[index++];
      await mw.handle(ctx, next);
    };

    await next();
  }
}
