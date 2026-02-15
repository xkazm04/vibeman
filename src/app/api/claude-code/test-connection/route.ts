import { NextRequest, NextResponse } from 'next/server';
import { AnthropicClient } from '@/lib/llm/providers/anthropic-client';

interface ConnectionCheck {
  name: string;
  status: 'PASS' | 'FAIL';
  message: string;
  duration?: number;
  error?: string;
  models?: string[];
}

interface ConnectionTestResults {
  timestamp: string;
  checks: ConnectionCheck[];
}

/**
 * GET - Test Anthropic API connection
 * This endpoint helps diagnose connectivity issues
 */
export async function GET(request: NextRequest) {
  const results: ConnectionTestResults = {
    timestamp: new Date().toISOString(),
    checks: []
  };

  try {
    // 1. Check if API key is configured
    const apiKey = process.env.ANTHROPIC_API_KEY;
    results.checks.push({
      name: 'API Key Configuration',
      status: apiKey ? 'PASS' : 'FAIL',
      message: apiKey
        ? `API key is configured (${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)})`
        : 'ANTHROPIC_API_KEY not found in environment variables',
    });

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'API key not configured',
        results
      }, { status: 500 });
    }

    // 2. Test basic connectivity to Anthropic API
    const client = new AnthropicClient({ apiKey });

    results.checks.push({
      name: 'Anthropic Client Initialization',
      status: 'PASS',
      message: 'Client initialized successfully'
    });

    // 3. Test availability with timeout
    const startTime = Date.now();
    try {
      const isAvailable = await client.checkAvailability();
      const duration = Date.now() - startTime;

      results.checks.push({
        name: 'API Connectivity Test',
        status: isAvailable ? 'PASS' : 'FAIL',
        message: isAvailable
          ? `Successfully connected to Anthropic API (${duration}ms)`
          : `Failed to connect to Anthropic API (${duration}ms)`,
        duration
      });

      if (!isAvailable) {
        return NextResponse.json({
          success: false,
          error: 'Unable to connect to Anthropic API',
          results
        }, { status: 503 });
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      results.checks.push({
        name: 'API Connectivity Test',
        status: 'FAIL',
        message: 'API connectivity check failed',
        duration,
      });

      return NextResponse.json({
        success: false,
        error: 'Connectivity test failed',
        results
      }, { status: 503 });
    }

    // 4. Test getting available models
    try {
      const models = await client.getAvailableModels();
      results.checks.push({
        name: 'Available Models',
        status: 'PASS',
        message: `${models.length} models available`,
        models
      });
    } catch (error) {
      results.checks.push({
        name: 'Available Models',
        status: 'FAIL',
        message: error instanceof Error ? error.message : 'Failed to get models'
      });
    }

    // All checks passed
    return NextResponse.json({
      success: true,
      message: 'All connectivity checks passed',
      results
    });

  } catch (error) {
    results.checks.push({
      name: 'Overall Test',
      status: 'FAIL',
      message: 'Connection test failed',
    });

    return NextResponse.json({
      success: false,
      error: 'Connection test failed',
      results
    }, { status: 500 });
  }
}
