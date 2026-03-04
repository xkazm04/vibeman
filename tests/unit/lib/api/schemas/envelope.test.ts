/**
 * Tests for unified API response envelope unwrapping
 */

import { describe, it, expect } from 'vitest';
import { unwrapEnvelope, extractMeta } from '@/lib/api/schemas/common';

describe('envelope utilities', () => {
  describe('unwrapEnvelope', () => {
    it('should unwrap new envelope format', () => {
      const response = {
        success: true,
        data: {
          signals: [{ id: '1', type: 'git_activity' }],
          stats: { total: 1 },
        },
      };

      const signals = unwrapEnvelope(response, 'signals', []);
      expect(signals).toEqual([{ id: '1', type: 'git_activity' }]);

      const stats = unwrapEnvelope(response, 'stats', {});
      expect(stats).toEqual({ total: 1 });
    });

    it('should handle legacy flat format', () => {
      const response = {
        signals: [{ id: '1' }],
        stats: { total: 1 },
      };

      const signals = unwrapEnvelope(response, 'signals', []);
      expect(signals).toEqual([{ id: '1' }]);
    });

    it('should return fallback for missing keys', () => {
      const response = {
        success: true,
        data: {
          signals: [],
        },
      };

      const missing = unwrapEnvelope(response, 'nonexistent', 'default');
      expect(missing).toBe('default');
    });

    it('should return fallback for null/undefined responses', () => {
      expect(unwrapEnvelope(null, 'key', 'fallback')).toBe('fallback');
      expect(unwrapEnvelope(undefined, 'key', 'fallback')).toBe('fallback');
    });

    it('should handle nested data correctly', () => {
      const response = {
        success: true,
        data: {
          context: {
            projectId: '123',
            signals: [],
          },
        },
      };

      const context = unwrapEnvelope(response, 'context', null);
      expect(context).toEqual({
        projectId: '123',
        signals: [],
      });
    });
  });

  describe('extractMeta', () => {
    it('should extract metadata from envelope', () => {
      const response = {
        success: true,
        data: { test: 'value' },
        meta: { cached: true, version: 2 },
      };

      const meta = extractMeta(response);
      expect(meta).toEqual({ cached: true, version: 2 });
    });

    it('should return undefined when no meta exists', () => {
      const response = {
        success: true,
        data: { test: 'value' },
      };

      const meta = extractMeta(response);
      expect(meta).toBeUndefined();
    });

    it('should handle null/undefined responses', () => {
      expect(extractMeta(null)).toBeUndefined();
      expect(extractMeta(undefined)).toBeUndefined();
    });

    it('should return undefined for legacy responses', () => {
      const response = {
        signals: [],
        stats: {},
      };

      const meta = extractMeta(response);
      expect(meta).toBeUndefined();
    });
  });

  describe('backwards compatibility', () => {
    it('should handle both formats transparently', () => {
      const newFormat = {
        success: true,
        data: { insights: [{ id: '1' }] },
        meta: { cached: true },
      };

      const legacyFormat = {
        insights: [{ id: '1' }],
      };

      const fromNew = unwrapEnvelope(newFormat, 'insights', []);
      const fromLegacy = unwrapEnvelope(legacyFormat, 'insights', []);

      expect(fromNew).toEqual(fromLegacy);
    });
  });
});
