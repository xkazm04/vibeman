/**
 * API Route: Validate Direction Hypothesis Assertions
 *
 * GET  /api/directions/[id]/validate - Validate assertions against outcome data
 * POST /api/directions/[id]/validate - Save assertions to direction, optionally validate
 */

import { NextRequest, NextResponse } from 'next/server';
import { directionDb, directionOutcomeDb } from '@/app/db';
import {
  parseAssertions,
  validateAssertions,
  serializeAssertions,
  type HypothesisAssertion,
} from '@/lib/directions/hypothesisEngine';
import { createParamsRouteHandler } from '@/lib/api-helpers/createRouteHandler';

/**
 * GET /api/directions/[id]/validate
 * Validate stored assertions against the direction's outcome data
 */
async function handleGet(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

    const direction = directionDb.getDirectionById(id);
    if (!direction) {
      return NextResponse.json(
        { success: false, error: 'Direction not found' },
        { status: 404 }
      );
    }

    const assertions = parseAssertions(direction.hypothesis_assertions);
    if (assertions.length === 0) {
      return NextResponse.json({
        success: true,
        hasAssertions: false,
        validation: null,
        message: 'No hypothesis assertions defined for this direction',
      });
    }

    const outcome = directionOutcomeDb.getByDirectionId(id);
    const validation = validateAssertions(id, assertions, outcome);

  return NextResponse.json({
    success: true,
    hasAssertions: true,
    hasOutcome: !!outcome,
    validation,
  });
}

/**
 * POST /api/directions/[id]/validate
 * Save hypothesis assertions to a direction
 *
 * Body:
 * - assertions: HypothesisAssertion[] (required)
 * - validate?: boolean (optional, default false) - also run validation against outcome
 */
async function handlePost(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

    const direction = directionDb.getDirectionById(id);
    if (!direction) {
      return NextResponse.json(
        { success: false, error: 'Direction not found' },
        { status: 404 }
      );
    }

    const { assertions, validate = false } = body;

    if (!Array.isArray(assertions)) {
      return NextResponse.json(
        { success: false, error: 'assertions must be an array' },
        { status: 400 }
      );
    }

    // Save assertions to direction
    const serialized = serializeAssertions(assertions as HypothesisAssertion[]);
    directionDb.updateDirection(id, { hypothesis_assertions: serialized });

    const response: Record<string, unknown> = {
      success: true,
      message: `Saved ${assertions.length} hypothesis assertions`,
      assertionCount: assertions.length,
    };

    // Optionally validate immediately
    if (validate) {
      const outcome = directionOutcomeDb.getByDirectionId(id);
      response.validation = validateAssertions(id, assertions as HypothesisAssertion[], outcome);
      response.hasOutcome = !!outcome;
    }

  return NextResponse.json(response);
}

export const GET = createParamsRouteHandler(handleGet, {
  endpoint: '/api/directions/[id]/validate',
  method: 'GET',
});
export const POST = createParamsRouteHandler(handlePost, {
  endpoint: '/api/directions/[id]/validate',
  method: 'POST',
});
