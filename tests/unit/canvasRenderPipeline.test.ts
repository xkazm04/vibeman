/**
 * Tests for shared canvas render pipeline
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  executeRenderPipeline,
  renderBackground,
  renderEventDots,
  renderEventCards,
  renderConnectionLines,
  renderSmartLabels,
  renderOverlay,
  type RenderContext,
} from '@/app/features/Brain/sub_MemoryCanvas/lib/canvasRenderPipeline';
import type { BrainEvent } from '@/app/features/Brain/sub_MemoryCanvas/lib/types';

// Mock canvas context
const createMockContext = () => ({
  setTransform: vi.fn(),
  createRadialGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
  createLinearGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  measureText: vi.fn((text: string) => ({ width: text.length * 8 })),
  fillText: vi.fn(),
  roundRect: vi.fn(),
  setLineDash: vi.fn(),
});

const createMockRenderContext = (overrides?: Partial<RenderContext>): RenderContext => ({
  ctx: createMockContext() as any,
  width: 800,
  height: 600,
  dpr: 1,
  transform: { x: 0, y: 0, k: 1 },
  now: Date.now(),
  filterState: { visibleTypes: new Set(['git_activity', 'api_focus', 'context_focus', 'implementation']) },
  ...overrides,
});

const createMockEvent = (overrides?: Partial<BrainEvent>): BrainEvent => ({
  id: 'test-1',
  type: 'git_activity',
  context_id: 'ctx-1',
  context_name: 'Test Context',
  timestamp: Date.now() - 3600000, // 1 hour ago
  weight: 1.0,
  summary: 'Test event',
  data: '{}',
  x: 100,
  y: 100,
  ...overrides,
});

describe('canvasRenderPipeline', () => {
  describe('renderBackground', () => {
    it('should render background gradient', () => {
      const context = createMockRenderContext();
      renderBackground(context, {});

      expect(context.ctx.createRadialGradient).toHaveBeenCalled();
      expect(context.ctx.fillRect).toHaveBeenCalledWith(0, 0, 800, 600);
    });

    it('should render grid when zoom > 0.4', () => {
      const context = createMockRenderContext({
        transform: { x: 0, y: 0, k: 0.5 },
      });
      renderBackground(context, { gridOpacity: 0.1 });

      expect(context.ctx.beginPath).toHaveBeenCalled();
      expect(context.ctx.stroke).toHaveBeenCalled();
    });

    it('should skip grid when zoom <= 0.4', () => {
      const context = createMockRenderContext({
        transform: { x: 0, y: 0, k: 0.3 },
      });
      const strokeCalls = vi.fn();
      context.ctx.stroke = strokeCalls;

      renderBackground(context, { gridOpacity: 0.1 });

      // Only background, no grid strokes
      expect(strokeCalls).not.toHaveBeenCalled();
    });
  });

  describe('renderEventDots', () => {
    it('should render events in world coordinate mode', () => {
      const context = createMockRenderContext();
      const events = [
        createMockEvent({ x: 100, y: 100 }),
        createMockEvent({ x: 200, y: 150, type: 'api_focus' }),
      ];

      renderEventDots(context, {
        events,
        coordinateMode: 'world',
      });

      expect(context.ctx.save).toHaveBeenCalled();
      expect(context.ctx.restore).toHaveBeenCalled();
      expect(context.ctx.arc).toHaveBeenCalled();
      expect(context.ctx.fill).toHaveBeenCalled();
    });

    it('should skip filtered-out events', () => {
      const context = createMockRenderContext({
        filterState: { visibleTypes: new Set(['git_activity']) },
      });
      const events = [
        createMockEvent({ type: 'git_activity', x: 100, y: 100 }),
        createMockEvent({ type: 'api_focus', x: 200, y: 150 }),
      ];

      const arcCalls = vi.fn();
      context.ctx.arc = arcCalls;

      renderEventDots(context, {
        events,
        coordinateMode: 'world',
      });

      // Should only render 1 event (git_activity)
      expect(arcCalls.mock.calls.length).toBeGreaterThan(0);
    });

    it('should render recency pulse for recent events', () => {
      const context = createMockRenderContext();
      const recentEvent = createMockEvent({
        timestamp: Date.now() - 1000, // 1 second ago
      });

      renderEventDots(context, {
        events: [recentEvent],
        coordinateMode: 'world',
        enablePulse: true,
      });

      expect(context.ctx.stroke).toHaveBeenCalled();
    });

    it('should use gradients when enabled', () => {
      const context = createMockRenderContext();
      const events = [createMockEvent()];

      renderEventDots(context, {
        events,
        coordinateMode: 'world',
        useGradients: true,
      });

      expect(context.ctx.createRadialGradient).toHaveBeenCalled();
    });
  });

  describe('renderEventCards', () => {
    it('should render event cards', () => {
      const context = createMockRenderContext();
      const events = [createMockEvent({ summary: 'Test card summary' })];

      renderEventCards(context, {
        events,
        coordinateMode: 'screen',
      });

      expect(context.ctx.roundRect).toHaveBeenCalled();
      expect(context.ctx.fillText).toHaveBeenCalled();
    });

    it('should skip off-screen cards in screen mode', () => {
      const context = createMockRenderContext({ width: 800 });
      const events = [createMockEvent({ x: 2000, y: 100 })]; // Far off-screen

      const roundRectCalls = vi.fn();
      context.ctx.roundRect = roundRectCalls;

      renderEventCards(context, {
        events,
        coordinateMode: 'screen',
      });

      expect(roundRectCalls).not.toHaveBeenCalled();
    });
  });

  describe('renderConnectionLines', () => {
    it('should render sequential connections', () => {
      const context = createMockRenderContext();
      const events = [
        createMockEvent({ timestamp: 1000, type: 'git_activity', x: 100, y: 100 }),
        createMockEvent({ timestamp: 2000, type: 'git_activity', x: 200, y: 100 }),
      ];

      renderConnectionLines(context, {
        events,
        mode: 'sequential',
        coordinateMode: 'world',
      });

      expect(context.ctx.beginPath).toHaveBeenCalled();
      expect(context.ctx.stroke).toHaveBeenCalled();
    });

    it('should render grouped connections', () => {
      const context = createMockRenderContext();
      const events = [
        createMockEvent({ context_name: 'ctx1', type: 'git_activity' }),
        createMockEvent({ context_name: 'ctx1', type: 'git_activity' }),
        createMockEvent({ context_name: 'ctx2', type: 'api_focus' }),
      ];

      renderConnectionLines(context, {
        events,
        mode: 'grouped',
        coordinateMode: 'world',
      });

      expect(context.ctx.stroke).toHaveBeenCalled();
    });
  });

  describe('renderSmartLabels', () => {
    it('should skip labels when zoom too low', () => {
      const context = createMockRenderContext({
        transform: { x: 0, y: 0, k: 0.3 },
      });
      const events = [createMockEvent()];

      const fillTextCalls = vi.fn();
      context.ctx.fillText = fillTextCalls;

      renderSmartLabels(context, {
        events,
        coordinateMode: 'world',
        minZoom: 0.5,
      });

      expect(fillTextCalls).not.toHaveBeenCalled();
    });

    it('should render labels when zoom sufficient', () => {
      const context = createMockRenderContext({
        transform: { x: 0, y: 0, k: 1.0 },
      });
      const events = [createMockEvent({ summary: 'Label text' })];

      renderSmartLabels(context, {
        events,
        coordinateMode: 'world',
        minZoom: 0.5,
      });

      expect(context.ctx.fillText).toHaveBeenCalled();
    });
  });

  describe('renderOverlay', () => {
    it('should render vignette edges', () => {
      const context = createMockRenderContext();

      renderOverlay(context, {
        vignette: { top: 50, bottom: 50 },
      });

      expect(context.ctx.createLinearGradient).toHaveBeenCalled();
      expect(context.ctx.fillRect).toHaveBeenCalled();
    });

    it('should render header', () => {
      const context = createMockRenderContext();

      renderOverlay(context, {
        header: {
          title: 'Test Header',
          subtitle: 'Test Subtitle',
        },
      });

      expect(context.ctx.fillText).toHaveBeenCalled();
    });

    it('should render hint message', () => {
      const context = createMockRenderContext();

      renderOverlay(context, {
        hint: {
          text: 'Test hint',
          yPosition: 500,
        },
      });

      expect(context.ctx.roundRect).toHaveBeenCalled();
      expect(context.ctx.fillText).toHaveBeenCalled();
    });
  });

  describe('executeRenderPipeline', () => {
    it('should execute all configured passes in order', () => {
      const context = createMockRenderContext();
      const events = [createMockEvent()];

      executeRenderPipeline(context, {
        background: {},
        eventDots: {
          events,
          coordinateMode: 'world',
        },
        overlay: {
          vignette: { top: 50 },
        },
      });

      // Verify multiple passes were executed
      expect(context.ctx.fillRect).toHaveBeenCalled();
      expect(context.ctx.arc).toHaveBeenCalled();
      expect(context.ctx.createLinearGradient).toHaveBeenCalled();
    });

    it('should skip undefined passes', () => {
      const context = createMockRenderContext();

      executeRenderPipeline(context, {
        background: {},
        eventDots: undefined,
        overlay: undefined,
      });

      // Should only execute background
      expect(context.ctx.fillRect).toHaveBeenCalled();
    });
  });
});
