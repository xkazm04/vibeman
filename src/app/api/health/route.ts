/**
 * Health Check API Endpoint
 *
 * Provides system health status including database connectivity,
 * LLM provider availability, and general system health.
 */

import { NextResponse } from 'next/server';
import { getDbDriver } from '@/app/db/drivers';
import { logger } from '@/lib/logger';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: CheckResult;
    memory: CheckResult;
    [key: string]: CheckResult;
  };
}

interface CheckResult {
  status: 'pass' | 'fail' | 'warn';
  message: string;
  responseTime?: number;
  details?: Record<string, unknown>;
}

const startTime = Date.now();

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<CheckResult> {
  const start = performance.now();

  try {
    const driver = getDbDriver();
    const connection = driver.getConnection();

    // Try a simple query to verify connectivity
    const stmt = connection.prepare<{ count: number }>('SELECT 1 as count');
    const result = stmt.get();

    const responseTime = Math.round(performance.now() - start);

    if (result && result.count === 1) {
      return {
        status: 'pass',
        message: 'Database connection successful',
        responseTime,
        details: {
          driver: driver.getDriverType(),
        },
      };
    }

    return {
      status: 'warn',
      message: 'Database connection returned unexpected result',
      responseTime,
    };
  } catch (error) {
    const responseTime = Math.round(performance.now() - start);
    logger.error('Database health check failed:', error);

    return {
      status: 'fail',
      message: error instanceof Error ? error.message : 'Database connection failed',
      responseTime,
    };
  }
}

/**
 * Check memory usage
 */
function checkMemory(): CheckResult {
  try {
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const usagePercent = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);

    // Warn if memory usage is above 80%, fail if above 95%
    let status: CheckResult['status'] = 'pass';
    let message = 'Memory usage normal';

    if (usagePercent > 95) {
      status = 'fail';
      message = 'Critical memory usage';
    } else if (usagePercent > 80) {
      status = 'warn';
      message = 'High memory usage';
    }

    return {
      status,
      message,
      details: {
        heapUsedMB,
        heapTotalMB,
        usagePercent,
        rssMB: Math.round(memUsage.rss / 1024 / 1024),
      },
    };
  } catch (error) {
    return {
      status: 'fail',
      message: 'Failed to check memory',
    };
  }
}

/**
 * GET /api/health
 *
 * Returns system health status including database connectivity
 */
export async function GET(): Promise<NextResponse<HealthStatus>> {
  const databaseCheck = await checkDatabase();
  const memoryCheck = checkMemory();

  const checks = {
    database: databaseCheck,
    memory: memoryCheck,
  };

  // Determine overall status
  const checkValues = Object.values(checks);
  const hasFailure = checkValues.some((c) => c.status === 'fail');
  const hasWarning = checkValues.some((c) => c.status === 'warn');

  let overallStatus: HealthStatus['status'] = 'healthy';
  if (hasFailure) {
    overallStatus = 'unhealthy';
  } else if (hasWarning) {
    overallStatus = 'degraded';
  }

  const response: HealthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: Math.round((Date.now() - startTime) / 1000),
    version: process.env.npm_package_version || '1.0.0',
    checks,
  };

  // Return 503 Service Unavailable if unhealthy
  const httpStatus = overallStatus === 'unhealthy' ? 503 : 200;

  return NextResponse.json(response, { status: httpStatus });
}

/**
 * HEAD /api/health
 *
 * Quick health check for load balancers (just checks if server responds)
 */
export async function HEAD(): Promise<NextResponse> {
  return new NextResponse(null, { status: 200 });
}
