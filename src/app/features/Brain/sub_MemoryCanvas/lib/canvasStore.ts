/**
 * CanvasStore — External store for the D3 memory canvas.
 *
 * Uses the useSyncExternalStore pattern so React components can subscribe
 * to store changes declaratively. Events, groups, and layout data live
 * outside React state to avoid reconciliation on every frame, while still
 * triggering targeted re-renders via snapshot identity changes.
 *
 * Data flow:
 *   fetch → setEvents() → diff → layout (only if changed) → notify subscribers
 */

import type { BrainEvent, Group } from './types';
import { formGroups, runForceLayout, runForceLayoutAsync, packEventsInGroup, layoutFocusedGroup } from './canvasLayout';

// ── Snapshot type ────────────────────────────────────────────────────────

export interface CanvasSnapshot {
  events: BrainEvent[];
  groups: Group[];
  isEmpty: boolean;
  /** Monotonically increasing version — changes on every mutation */
  version: number;
}

// ── Store instance ───────────────────────────────────────────────────────

export class CanvasStore {
  // ── Internal data ──────────────────────────────────────────────────
  private _events: BrainEvent[] = [];
  private _groups: Group[] = [];
  private _isEmpty = true;
  private _version = 0;

  // ── Layout dimensions ──────────────────────────────────────────────
  width = 800;
  height = 500;

  // ── Diff tracking ──────────────────────────────────────────────────
  private eventIdSet = new Set<string>();

  // ── Worker cleanup ─────────────────────────────────────────────────
  private workerCleanup: (() => void) | null = null;

  // ── useSyncExternalStore plumbing ──────────────────────────────────
  private listeners = new Set<() => void>();
  private snapshot: CanvasSnapshot;

  constructor() {
    this.snapshot = this.buildSnapshot();
  }

  // ── Public accessors (for imperative reads in render callbacks) ────

  get events(): BrainEvent[] { return this._events; }
  get groups(): Group[] { return this._groups; }
  get isEmpty(): boolean { return this._isEmpty; }

  // ── useSyncExternalStore API ───────────────────────────────────────

  /** Subscribe to store changes. Returns unsubscribe function. */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  /** Return the current immutable snapshot. Identity changes on mutation. */
  getSnapshot = (): CanvasSnapshot => {
    return this.snapshot;
  };

  // ── Dimensions ─────────────────────────────────────────────────────

  setDimensions(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  // ── Event data management ──────────────────────────────────────────

  /**
   * Update events with diff detection.
   * Returns true if data actually changed (and layout was recalculated).
   */
  setEvents(newEvents: BrainEvent[], focusedGroupId: string | null): boolean {
    if (this.eventsUnchanged(newEvents)) return false;

    this._events = newEvents;
    this._isEmpty = newEvents.length === 0;
    this.eventIdSet = new Set(newEvents.map(e => e.id));
    this.recalculateLayout(focusedGroupId);
    this.emitChange();
    return true;
  }

  /**
   * Remove a single event (optimistic delete).
   * Returns the removed event or null if not found.
   */
  removeEvent(eventId: string, focusedGroupId: string | null): BrainEvent | null {
    const idx = this._events.findIndex(e => e.id === eventId);
    if (idx === -1) return null;

    const removed = this._events[idx];
    this._events = this._events.filter(e => e.id !== eventId);
    this.eventIdSet.delete(eventId);
    this._isEmpty = this._events.length === 0;
    this.recalculateLayout(focusedGroupId);
    this.emitChange();
    return removed;
  }

  /**
   * Re-add an event (undo delete).
   */
  restoreEvent(event: BrainEvent, focusedGroupId: string | null): void {
    if (this.eventIdSet.has(event.id)) return;
    this._events = [...this._events, event];
    this.eventIdSet.add(event.id);
    this._isEmpty = false;
    this.recalculateLayout(focusedGroupId);
    this.emitChange();
  }

  // ── Layout ─────────────────────────────────────────────────────────

  recalculateLayout(focusedGroupId: string | null) {
    const { width, height } = this;

    // Cancel any running worker
    if (this.workerCleanup) {
      this.workerCleanup();
      this.workerCleanup = null;
    }

    this._groups = formGroups(this._events);

    if (width > 0 && height > 0) {
      if (focusedGroupId) {
        // In focus mode, only layout the focused group
        const fg = this._groups.find(g => g.id === focusedGroupId);
        if (fg) layoutFocusedGroup(fg, width, height);
      } else {
        // Use worker-based async layout for overview mode
        this.workerCleanup = runForceLayoutAsync(
          this._groups,
          width,
          height,
          {
            onProgress: (groups) => {
              // Progressive rendering: update groups and notify subscribers
              this._groups = groups;
              this.emitChange();
            },
            onComplete: (groups) => {
              // Final pass: pack events within groups
              this._groups = groups;
              this._groups.forEach(packEventsInGroup);
              this.emitChange();
              this.workerCleanup = null;
            },
            totalTicks: 120,
            progressInterval: 10,
          }
        );
        return; // Don't emit here; worker will trigger it
      }
    }
  }

  /**
   * Cleanup method to be called when store is destroyed.
   */
  destroy() {
    if (this.workerCleanup) {
      this.workerCleanup();
      this.workerCleanup = null;
    }
    this.listeners.clear();
  }

  getFocusedGroup(focusedGroupId: string | null): Group | null {
    if (!focusedGroupId) return null;
    return this._groups.find(g => g.id === focusedGroupId) || null;
  }

  // ── Private helpers ────────────────────────────────────────────────

  private buildSnapshot(): CanvasSnapshot {
    return {
      events: this._events,
      groups: this._groups,
      isEmpty: this._isEmpty,
      version: this._version,
    };
  }

  /** Bump version, create new snapshot, notify all subscribers. */
  private emitChange() {
    this._version++;
    this.snapshot = this.buildSnapshot();
    for (const listener of this.listeners) {
      listener();
    }
  }

  private eventsUnchanged(newEvents: BrainEvent[]): boolean {
    if (newEvents.length !== this._events.length) return false;

    // Use a lightweight hash sum to detect mutations (like weight decay)
    // and set changes without deep comparison. Summing makes it
    // order-independent, improving layout stability if the API response
    // order fluctuates.
    let newHashSum = 0;
    let oldHashSum = 0;

    for (let i = 0; i < newEvents.length; i++) {
      newHashSum += this.getEventHash(newEvents[i]);
      oldHashSum += this.getEventHash(this._events[i]);
    }

    return newHashSum === oldHashSum;
  }

  private getEventHash(e: BrainEvent): number {
    let h = 0;
    const id = e.id;
    for (let i = 0; i < id.length; i++) {
      h = (h << 5) - h + id.charCodeAt(i);
      h |= 0;
    }
    // Multiply weight by 1000 to catch small decay changes in the integer sum
    return h + Math.round(e.weight * 1000);
  }
}

// ── React hook (import in component files) ──────────────────────────────
// Usage: useSyncExternalStore(store.subscribe, store.getSnapshot)
