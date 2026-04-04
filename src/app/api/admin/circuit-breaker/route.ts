import { NextRequest, NextResponse } from 'next/server';
import { getCircuitBreakerManager } from '@/lib/llm/circuitBreaker';
import { logger } from '@/lib/logger';

/**
 * POST /api/admin/circuit-breaker/reset
 * 
 * Manual control endpoint for circuit breaker management
 * 
 * Request body:
 * {
 *   provider?: 'openai' | 'anthropic' | 'groq' (if omitted, resets all)
 *   action: 'reset' | 'open' | 'close' | 'status'
 * }
 * 
 * Response:
 * {
 *   success: boolean
 *   message: string
 *   metrics?: { state: string; ... }
 *   error?: string
 * }
 */

interface CircuitBreakerRequest {
  provider?: string;
  action: 'reset' | 'open' | 'close' | 'status';
}

interface CircuitBreakerResponse {
  success: boolean;
  message: string;
  metrics?: Record<string, any>;
  error?: string;
}

async function handlePost(request: NextRequest): Promise<NextResponse<CircuitBreakerResponse>> {
  try {
    // Auth check: require Bearer token or admin key header.
    // Do NOT trust x-forwarded-for/x-real-ip — those headers are trivially spoofable.
    const authHeader = request.headers.get('authorization');
    const adminKey = request.headers.get('x-admin-key');
    const envAdminKey = process.env.ADMIN_API_KEY;

    if (!authHeader?.includes('Bearer') && !(adminKey && envAdminKey && adminKey === envAdminKey)) {
      // In development without ADMIN_API_KEY set, allow all requests (localhost-only app)
      if (process.env.NODE_ENV !== 'development' || envAdminKey) {
        return NextResponse.json(
          {
            success: false,
            message: 'Unauthorized',
            error: 'Authentication required'
          },
          { status: 401 }
        );
      }
    }

    const body: CircuitBreakerRequest = await request.json();
    const manager = getCircuitBreakerManager();

    if (!body.action) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing action parameter',
          error: 'action is required: reset, open, close, or status'
        },
        { status: 400 }
      );
    }

    let message = '';
    let metrics: Record<string, any> | undefined;

    if (body.action === 'reset') {
      if (body.provider) {
        manager.reset(body.provider as any);
        message = `Circuit breaker reset for provider: ${body.provider}`;
        metrics = manager.getMetrics(body.provider as any) || {};
      } else {
        manager.resetAll();
        message = 'All circuit breakers reset';
        metrics = manager.getAllMetrics();
      }
      logger.info('Circuit breaker reset', { provider: body.provider });
    } else if (body.action === 'status') {
      if (body.provider) {
        message = `Circuit breaker status for ${body.provider}`;
        metrics = manager.getMetrics(body.provider as any) || {};
      } else {
        message = 'All circuit breaker status';
        metrics = manager.getAllMetrics();
      }
    } else if (body.action === 'open') {
      // Note: Cannot directly open via API - would require direct access to breaker instance
      message = 'Direct state manipulation not allowed via API. Use reset to recover.';
      if (body.provider) {
        metrics = manager.getMetrics(body.provider as any) || {};
      }
    } else if (body.action === 'close') {
      message = 'Use reset action to transition to closed state';
      if (body.provider) {
        metrics = manager.getMetrics(body.provider as any) || {};
      }
    }

    return NextResponse.json({
      success: true,
      message,
      metrics
    });
  } catch (error) {
    logger.error('Circuit breaker control failed', { error });
    return NextResponse.json(
      {
        success: false,
        message: 'Circuit breaker control failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export const POST = handlePost;
