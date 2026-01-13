/**
 * API Test Utilities
 * Helpers for testing Next.js API routes
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Create a mock NextRequest for testing API routes
 */
export function createMockRequest(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  url: string,
  body?: Record<string, unknown>
): NextRequest {
  const fullUrl = url.startsWith('http') ? url : `http://localhost:3000${url}`;

  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body && method !== 'GET') {
    init.body = JSON.stringify(body);
  }

  return new NextRequest(fullUrl, init);
}

/**
 * Create a GET request with query parameters
 */
export function createGetRequest(
  basePath: string,
  params?: Record<string, string | number | boolean | null | undefined>
): NextRequest {
  let url = basePath;

  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== null && value !== undefined) {
        searchParams.append(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  return createMockRequest('GET', url);
}

/**
 * Create a POST request with JSON body
 */
export function createPostRequest(
  url: string,
  body: Record<string, unknown>
): NextRequest {
  return createMockRequest('POST', url, body);
}

/**
 * Create a PUT request with JSON body
 */
export function createPutRequest(
  url: string,
  body: Record<string, unknown>
): NextRequest {
  return createMockRequest('PUT', url, body);
}

/**
 * Create a PATCH request with JSON body
 */
export function createPatchRequest(
  url: string,
  body: Record<string, unknown>
): NextRequest {
  return createMockRequest('PATCH', url, body);
}

/**
 * Create a DELETE request with query parameters
 */
export function createDeleteRequest(
  basePath: string,
  params?: Record<string, string | number | boolean | null | undefined>
): NextRequest {
  let url = basePath;

  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== null && value !== undefined) {
        searchParams.append(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  return createMockRequest('DELETE', url);
}

/**
 * Parse the JSON body from a NextResponse
 */
export async function parseJsonResponse<T = Record<string, unknown>>(
  response: NextResponse
): Promise<T> {
  const text = await response.text();
  return JSON.parse(text) as T;
}

/**
 * Assert that a response has the expected status code
 */
export function assertStatus(response: NextResponse, expectedStatus: number): void {
  if (response.status !== expectedStatus) {
    throw new Error(
      `Expected status ${expectedStatus}, got ${response.status}`
    );
  }
}

/**
 * Assert that a response body matches expected structure
 */
export async function assertJsonEquals<T>(
  response: NextResponse,
  expected: T
): Promise<void> {
  const actual = await parseJsonResponse<T>(response);
  const actualStr = JSON.stringify(actual, null, 2);
  const expectedStr = JSON.stringify(expected, null, 2);

  if (actualStr !== expectedStr) {
    throw new Error(
      `Response body mismatch:\nExpected: ${expectedStr}\nActual: ${actualStr}`
    );
  }
}

/**
 * Assert that response contains expected fields
 */
export async function assertResponseContains<T extends Record<string, unknown>>(
  response: NextResponse,
  expectedFields: Partial<T>
): Promise<T> {
  const actual = await parseJsonResponse<T>(response);

  for (const [key, value] of Object.entries(expectedFields)) {
    if (actual[key] !== value) {
      throw new Error(
        `Field '${key}' mismatch: expected ${JSON.stringify(value)}, got ${JSON.stringify(actual[key])}`
      );
    }
  }

  return actual;
}

/**
 * Assert that response is an error with expected message
 */
export async function assertErrorResponse(
  response: NextResponse,
  expectedStatus: number,
  expectedErrorContains?: string
): Promise<void> {
  assertStatus(response, expectedStatus);

  if (expectedErrorContains) {
    const body = await parseJsonResponse<{ error?: string; message?: string }>(response);
    const errorMessage = body.error || body.message || '';

    if (!errorMessage.toLowerCase().includes(expectedErrorContains.toLowerCase())) {
      throw new Error(
        `Expected error to contain '${expectedErrorContains}', got '${errorMessage}'`
      );
    }
  }
}

/**
 * Assert that response is successful (2xx status)
 */
export function assertSuccess(response: NextResponse): void {
  if (response.status < 200 || response.status >= 300) {
    throw new Error(
      `Expected success status (2xx), got ${response.status}`
    );
  }
}

/**
 * Assert that response is a 404 Not Found
 */
export async function assertNotFound(response: NextResponse): Promise<void> {
  assertStatus(response, 404);
}

/**
 * Assert that response is a 400 Bad Request
 */
export async function assertBadRequest(response: NextResponse): Promise<void> {
  assertStatus(response, 400);
}

/**
 * Assert that response is a 201 Created
 */
export async function assertCreated(response: NextResponse): Promise<void> {
  assertStatus(response, 201);
}

/**
 * Type-safe response parser for specific response shapes
 */
export interface ListResponse<T> {
  [key: string]: T[];
}

export interface SingleResponse<T> {
  [key: string]: T;
}

export interface SuccessResponse {
  success: boolean;
  message?: string;
  deletedCount?: number;
}

export interface ErrorResponse {
  error: string;
  code?: string;
  details?: string;
}

/**
 * Parse a list response (e.g., { goals: [...] })
 */
export async function parseListResponse<T>(
  response: NextResponse,
  key: string
): Promise<T[]> {
  const body = await parseJsonResponse<Record<string, T[]>>(response);
  return body[key] || [];
}

/**
 * Parse a single item response (e.g., { goal: {...} })
 */
export async function parseSingleResponse<T>(
  response: NextResponse,
  key: string
): Promise<T> {
  const body = await parseJsonResponse<Record<string, T>>(response);
  return body[key];
}
