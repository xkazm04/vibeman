/**
 * Tests for parseQueryInt utility
 * Validates numeric parameter parsing with bounds checking
 */

import { describe, it, expect } from 'vitest';
import { parseQueryInt } from '@/lib/api-helpers/parseQueryInt';

describe('parseQueryInt', () => {
  describe('basic parsing', () => {
    it('should parse valid integer strings', () => {
      expect(parseQueryInt('42', {})).toBe(42);
      expect(parseQueryInt('0', {})).toBe(0);
      expect(parseQueryInt('999', {})).toBe(999);
    });

    it('should parse negative integers', () => {
      expect(parseQueryInt('-10', {})).toBe(-10);
      expect(parseQueryInt('-1', {})).toBe(-1);
    });

    it('should handle leading/trailing whitespace', () => {
      expect(parseQueryInt('  42  ', {})).toBe(42);
    });

    it('should truncate decimals (parseInt behavior)', () => {
      expect(parseQueryInt('42.7', {})).toBe(42);
      expect(parseQueryInt('99.99', {})).toBe(99);
    });
  });

  describe('default values', () => {
    it('should return default when value is null', () => {
      expect(parseQueryInt(null, { default: 50 })).toBe(50);
    });

    it('should return default when value is empty string', () => {
      expect(parseQueryInt('', { default: 100 })).toBe(100);
    });

    it('should apply bounds to default value', () => {
      expect(parseQueryInt(null, { default: 150, min: 1, max: 100 })).toBe(100);
      expect(parseQueryInt(null, { default: -5, min: 0, max: 100 })).toBe(0);
    });
  });

  describe('required parameters (no default)', () => {
    it('should throw error when value is null and no default', () => {
      expect(() => parseQueryInt(null, {})).toThrow('parameter is required');
    });

    it('should throw error with custom param name', () => {
      expect(() => parseQueryInt(null, { paramName: 'windowDays' })).toThrow('windowDays is required');
    });

    it('should throw error when value is empty string and no default', () => {
      expect(() => parseQueryInt('', { paramName: 'limit' })).toThrow('limit is required');
    });
  });

  describe('NaN handling', () => {
    it('should throw error for non-numeric strings', () => {
      expect(() => parseQueryInt('abc', {})).toThrow('must be a valid integer');
      expect(() => parseQueryInt('hello', {})).toThrow('must be a valid integer');
    });

    it('should throw error for special values', () => {
      expect(() => parseQueryInt('NaN', {})).toThrow('must be a valid integer');
      expect(() => parseQueryInt('Infinity', {})).toThrow('must be a valid integer');
    });

    it('should include invalid value in error message', () => {
      expect(() => parseQueryInt('invalid', { paramName: 'limit' })).toThrow('got: invalid');
    });
  });

  describe('bounds clamping - minimum', () => {
    it('should clamp to minimum when value is below', () => {
      expect(parseQueryInt('5', { min: 10 })).toBe(10);
      expect(parseQueryInt('0', { min: 1 })).toBe(1);
      expect(parseQueryInt('-100', { min: 0 })).toBe(0);
    });

    it('should not clamp when value equals minimum', () => {
      expect(parseQueryInt('10', { min: 10 })).toBe(10);
    });

    it('should not clamp when value is above minimum', () => {
      expect(parseQueryInt('50', { min: 10 })).toBe(50);
    });
  });

  describe('bounds clamping - maximum', () => {
    it('should clamp to maximum when value is above', () => {
      expect(parseQueryInt('150', { max: 100 })).toBe(100);
      expect(parseQueryInt('1000', { max: 365 })).toBe(365);
    });

    it('should not clamp when value equals maximum', () => {
      expect(parseQueryInt('100', { max: 100 })).toBe(100);
    });

    it('should not clamp when value is below maximum', () => {
      expect(parseQueryInt('50', { max: 100 })).toBe(50);
    });
  });

  describe('bounds clamping - min and max', () => {
    it('should clamp to range when below minimum', () => {
      expect(parseQueryInt('5', { min: 10, max: 100 })).toBe(10);
    });

    it('should clamp to range when above maximum', () => {
      expect(parseQueryInt('150', { min: 10, max: 100 })).toBe(100);
    });

    it('should not clamp when value is within range', () => {
      expect(parseQueryInt('50', { min: 10, max: 100 })).toBe(50);
    });

    it('should handle edge case where min equals max', () => {
      expect(parseQueryInt('999', { min: 42, max: 42 })).toBe(42);
      expect(parseQueryInt('1', { min: 42, max: 42 })).toBe(42);
    });
  });

  describe('real-world use cases', () => {
    it('should handle limit parameter (signals route)', () => {
      expect(parseQueryInt('50', { default: 50, min: 1, max: 1000 })).toBe(50);
      expect(parseQueryInt('2000', { default: 50, min: 1, max: 1000 })).toBe(1000);
      expect(parseQueryInt('0', { default: 50, min: 1, max: 1000 })).toBe(1);
      expect(parseQueryInt(null, { default: 50, min: 1, max: 1000 })).toBe(50);
    });

    it('should handle windowDays parameter (effectiveness route)', () => {
      expect(parseQueryInt('90', { default: 90, min: 1, max: 365 })).toBe(90);
      expect(parseQueryInt('400', { default: 90, min: 1, max: 365 })).toBe(365);
      expect(parseQueryInt(null, { default: 90, min: 1, max: 365 })).toBe(90);
    });

    it('should handle minDirections parameter (effectiveness route)', () => {
      expect(parseQueryInt('3', { default: 3, min: 1, max: 100 })).toBe(3);
      expect(parseQueryInt('500', { default: 3, min: 1, max: 100 })).toBe(100);
      expect(parseQueryInt(null, { default: 3, min: 1, max: 100 })).toBe(3);
    });

    it('should handle days parameter (heatmap route)', () => {
      expect(parseQueryInt('90', { default: 90, min: 1, max: 365 })).toBe(90);
      expect(parseQueryInt('1000', { default: 90, min: 1, max: 365 })).toBe(365);
      expect(parseQueryInt(null, { default: 90, min: 1, max: 365 })).toBe(90);
    });

    it('should handle windowDays parameter (context route)', () => {
      expect(parseQueryInt('7', { default: 7, min: 1, max: 90 })).toBe(7);
      expect(parseQueryInt('200', { default: 7, min: 1, max: 90 })).toBe(90);
      expect(parseQueryInt(null, { default: 7, min: 1, max: 90 })).toBe(7);
    });
  });

  describe('edge cases', () => {
    it('should handle very large numbers', () => {
      expect(parseQueryInt('999999999', { max: 100 })).toBe(100);
    });

    it('should handle very negative numbers', () => {
      expect(parseQueryInt('-999999999', { min: -100 })).toBe(-100);
    });

    it('should handle zero bounds', () => {
      expect(parseQueryInt('-5', { min: 0 })).toBe(0);
      expect(parseQueryInt('5', { max: 0 })).toBe(0);
    });

    it('should handle partial numeric strings (parseInt behavior)', () => {
      expect(parseQueryInt('42abc', {})).toBe(42);
      expect(parseQueryInt('99.99.99', {})).toBe(99);
    });
  });

  describe('error messages', () => {
    it('should include parameter name in all error messages', () => {
      expect(() => parseQueryInt(null, { paramName: 'myParam' })).toThrow('myParam');
      expect(() => parseQueryInt('invalid', { paramName: 'myParam' })).toThrow('myParam');
    });

    it('should use default parameter name when not specified', () => {
      expect(() => parseQueryInt(null, {})).toThrow('parameter');
    });
  });
});
