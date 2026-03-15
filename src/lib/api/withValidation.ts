/**
 * Request body validation middleware for Next.js App Router route handlers.
 *
 * Usage:
 *   export const POST = withValidation(MySchema, async (req, body) => {
 *     // body is fully typed and validated
 *   });
 */

import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

type ValidatedHandler<T> = (request: NextRequest, body: T) => Promise<NextResponse>;

/**
 * Wrap a route handler with Zod body validation.
 * Returns 400 for malformed JSON and 422 with structured `issues` for schema violations.
 */
export function withValidation<T>(
  schema: z.ZodType<T>,
  handler: ValidatedHandler<T>
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest) => {
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const result = schema.safeParse(raw);
    if (!result.success) {
      const issues = result.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      }));
      return NextResponse.json(
        { success: false, error: 'Validation failed', issues },
        { status: 422 }
      );
    }

    return handler(request, result.data);
  };
}
