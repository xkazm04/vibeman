/**
 * CanvasStore — Imperative render-state manager for the D3 memory canvas.
 *
 * Holds events, groups, and layout data outside of React state so canvas
 * redraws never trigger React reconciliation. The component reads from
 * this store via refs; React state is reserved for UI-only concerns
 * (drawer, toolbar, undo toasts).
 *
 * Data flow:
 *   fetch → setEvents() → diff → layout (only if changed) → requestRender()
 */

import type { BrainEvent, Group, FilterState, SignalType } from './types';
import { formGroups, runForceLayout, runForceLayoutAsync, packEventsInGroup, layoutFocusedGroup } from './canvasLayout';

type RenderCallback = () => void;

export class CanvasStore {
  // ── Render data (read by canvas draw calls) ──────────────────────
  events: BrainEvent[] = [];
  groups: Group[] = [];
  isEmpty = true;

  // ── Layout dimensions ────────────────────────────────────────────
  width = 800;
  height = 500;

  // ── Tracking for diff-aware updates ──────────────────────────────
  private eventIdSet = new Set<string>();

  // ── Render trigger ───────────────────────────────────────────────
  private renderCb: RenderCallback | null = null;

  // ── Worker cleanup ───────────────────────────────────────────────
  private workerCleanup: (() => void) | null = null;

  onRender(cb: RenderCallback) {
    this.renderCb = cb;
  }

  requestRender() {
    this.renderCb?.();
  }

  // ── Dimensions ───────────────────────────────────────────────────

  setDimensions(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  // ── Event data management ────────────────────────────────────────

  /**
   * Update events with diff detection.
   * Returns true if data actually changed (and layout was recalculated).
   */
  setEvents(newEvents: BrainEvent[], focusedGroupId: string | null): boolean {
    if (this.eventsUnchanged(newEvents)) return false;

    this.events = newEvents;
    this.isEmpty = newEvents.length === 0;
    this.eventIdSet = new Set(newEvents.map(e => e.id));
    this.recalculateLayout(focusedGroupId);
    this.requestRender();
    return true;
  }

  /**
   * Remove a single event (optimistic delete).
   * Returns the removed event or null if not found.
   */
  removeEvent(eventId: string, focusedGroupId: string | null): BrainEvent | null {
    const idx = this.events.findIndex(e => e.id === eventId);
    if (idx === -1) return null;

    const removed = this.events[idx];
    this.events = this.events.filter(e => e.id !== eventId);
    this.eventIdSet.delete(eventId);
    this.isEmpty = this.events.length === 0;
    this.recalculateLayout(focusedGroupId);
    this.requestRender();
    return removed;
  }

  /**
   * Re-add an event (undo delete).
   */
  restoreEvent(event: BrainEvent, focusedGroupId: string | null): void {
    if (this.eventIdSet.has(event.id)) return;
    this.events = [...this.events, event];
    this.eventIdSet.add(event.id);
    this.isEmpty = false;
    this.recalculateLayout(focusedGroupId);
    this.requestRender();
  }

  // ── Layout ───────────────────────────────────────────────────────

  recalculateLayout(focusedGroupId: string | null) {
    const { width, height } = this;

    // Cancel any running worker
    if (this.workerCleanup) {
      this.workerCleanup();
      this.workerCleanup = null;
    }

    this.groups = formGroups(this.events);

    if (width > 0 && height > 0) {
      if (focusedGroupId) {
        // In focus mode, only layout the focused group
        const fg = this.groups.find(g => g.id === focusedGroupId);
        if (fg) layoutFocusedGroup(fg, width, height);
      } else {
        // Use worker-based async layout for overview mode
        this.workerCleanup = runForceLayoutAsync(
          this.groups,
          width,
          height,
          {
            onProgress: (groups, tick, totalTicks) => {
              // Progressive rendering: update groups and request redraw
              this.groups = groups;
              this.requestRender();
            },
            onComplete: (groups) => {
              // Final pass: pack events within groups
              this.groups = groups;
              this.groups.forEach(packEventsInGroup);
              this.requestRender();
              this.workerCleanup = null;
            },
            totalTicks: 120,
            progressInterval: 10, // Update every 10 ticks
          }
        );
        return; // Don't request render here; worker will trigger it
      }
    }
  }

  /**
   * Cleanup method to be called when store is destroyed
   */
  destroy() {
    if (this.workerCleanup) {
      this.workerCleanup();
      this.workerCleanup = null;
    }
  }

  getFocusedGroup(focusedGroupId: string | null): Group | null {
    if (!focusedGroupId) return null;
    return this.groups.find(g => g.id === focusedGroupId) || null;
  }

  // ── Private helpers ──────────────────────────────────────────────

  private eventsUnchanged(newEvents: BrainEvent[]): boolean {
    if (newEvents.length !== this.events.length) return false;

    // Use a lightweight hash sum to detect mutations (like weight decay)
    // and set changes without deep comparison. Summing makes it 
    // order-independent, improving layout stability if the API response 
    // order fluctuates.
    let newHashSum = 0;
    let oldHashSum = 0;

    for (let i = 0; i < newEvents.length; i++) {
      newHashSum += this.getEventHash(newEvents[i]);
      oldHashSum += this.getEventHash(this.events[i]);
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
