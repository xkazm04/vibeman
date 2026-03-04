/**
 * Tests for unified API response envelope
 */

import { describe, it, expect } from 'vitest';
import { buildSuccessResponse, buildErrorResponse } from '@/lib/api-helpers/apiResponse';

describe('apiResponse', () => {
  describe('buildSuccessResponse', () => {
    it('should build basic success response', async () => {
      const response = buildSuccessResponse({ message: 'Hello' });
      const json = await response.json();

      // Verify structure
      expect(json).toHaveProperty('success', true);
      expect(json).toHaveProperty('data');
      expect(json.data).toEqual({ message: 'Hello' });
    });

    it('should include metadata when provided', async () => {
      const response = buildSuccessResponse(
        { signals: [] },
        { meta: { cached: true, version: 2 } }
      );
      const json = await response.json();

      expect(json).toHaveProperty('success', true);
      expect(json).toHaveProperty('data');
      expect(json).toHaveProperty('meta');
      expect(json.meta).toEqual({ cached: true, version: 2 });
    });

    it('should use default 200 status code', () => {
      const response = buildSuccessResponse({ data: 'test' });
      expect(response.status).toBe(200);
    });

    it('should allow custom status code', () => {
      const response = buildSuccessResponse({ data: 'created' }, { status: 201 });
      expect(response.status).toBe(201);
    });
  });

  describe('buildErrorResponse', () => {
    it('should build error response from string', async () => {
      const response = buildErrorResponse('Not found', { status: 404 });
      const json = await response.json();

      expect(json).toHaveProperty('success', false);
      expect(json).toHaveProperty('error', 'Not found');
      expect(response.status).toBe(404);
    });

    it('should build error response from Error object', async () => {
      const error = new Error('Database connection failed');
      const response = buildErrorResponse(error);
      const json = await response.json();

      expect(json).toHaveProperty('success', false);
      expect(json).toHaveProperty('error', 'Database connection failed');
    });

    it('should use default 500 status for errors', () => {
      const response = buildErrorResponse('Internal error');
      expect(response.status).toBe(500);
    });

    it('should include metadata in error response', async () => {
      const response = buildErrorResponse('Validation failed', {
        status: 400,
        meta: { field: 'email' },
      });
      const json = await response.json();

      expect(json).toHaveProperty('meta');
      expect(json.meta).toEqual({ field: 'email' });
    });
  });

  describe('response consistency', () => {
    it('should always include success field', async () => {
      const success = buildSuccessResponse({ test: true });
      const error = buildErrorResponse('Test error');

      expect(await success.json()).toHaveProperty('success');
      expect(await error.json()).toHaveProperty('success');
    });

    it('success response should not have error field', async () => {
      const response = buildSuccessResponse({ data: 'test' });
      const json = await response.json();

      expect(json).not.toHaveProperty('error');
    });

    it('error response should not have data field', async () => {
      const response = buildErrorResponse('Test error');
      const json = await response.json();

      expect(json).not.toHaveProperty('data');
    });
  });
});
