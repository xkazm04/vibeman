import { NextRequest, NextResponse } from 'next/server';
import { securityAlertDb } from '@/app/db';

/**
 * GET /api/security-intelligence/alerts
 * Get security alerts
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    const unacknowledgedOnly = searchParams.get('unacknowledgedOnly') === 'true';

    if (unacknowledgedOnly) {
      const alerts = securityAlertDb.getUnacknowledged(projectId || undefined);
      return NextResponse.json({ alerts });
    }

    if (projectId) {
      const alerts = securityAlertDb.getByProjectId(projectId);
      return NextResponse.json({ alerts });
    }

    // Return all unacknowledged alerts if no specific query
    const alerts = securityAlertDb.getUnacknowledged();
    return NextResponse.json({ alerts });
  } catch (error) {
    console.error('Error fetching security alerts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch security alerts' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/security-intelligence/alerts
 * Create a new security alert
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      alertType,
      severity,
      title,
      message,
      source,
    } = body;

    if (!projectId || !alertType || !severity || !title || !message || !source) {
      return NextResponse.json(
        { error: 'projectId, alertType, severity, title, message, and source are required' },
        { status: 400 }
      );
    }

    const validAlertTypes = ['critical_vulnerability', 'new_vulnerability', 'patch_available', 'ci_failure', 'risk_threshold', 'stale_branch'];
    if (!validAlertTypes.includes(alertType)) {
      return NextResponse.json(
        { error: `alertType must be one of: ${validAlertTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const validSeverities = ['critical', 'high', 'medium', 'low', 'info'];
    if (!validSeverities.includes(severity)) {
      return NextResponse.json(
        { error: `severity must be one of: ${validSeverities.join(', ')}` },
        { status: 400 }
      );
    }

    const id = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const alert = securityAlertDb.create({
      id,
      projectId,
      alertType,
      severity,
      title,
      message,
      source,
      acknowledged: false,
      acknowledgedAt: null,
      acknowledgedBy: null,
      resolved: false,
      resolvedAt: null,
    });

    return NextResponse.json({ alert });
  } catch (error) {
    console.error('Error creating security alert:', error);
    return NextResponse.json(
      { error: 'Failed to create security alert' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/security-intelligence/alerts
 * Update an alert (acknowledge or resolve)
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action, acknowledgedBy } = body;

    if (!id || !action) {
      return NextResponse.json(
        { error: 'id and action are required' },
        { status: 400 }
      );
    }

    if (action === 'acknowledge') {
      securityAlertDb.acknowledge(id, acknowledgedBy);
      return NextResponse.json({ success: true, action: 'acknowledged' });
    }

    if (action === 'resolve') {
      securityAlertDb.resolve(id);
      return NextResponse.json({ success: true, action: 'resolved' });
    }

    return NextResponse.json(
      { error: 'action must be either "acknowledge" or "resolve"' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating security alert:', error);
    return NextResponse.json(
      { error: 'Failed to update security alert' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/security-intelligence/alerts
 * Clean up old resolved alerts
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const daysOld = parseInt(searchParams.get('daysOld') || '30', 10);

    const deletedCount = securityAlertDb.deleteOldResolved(daysOld);

    return NextResponse.json({ success: true, deletedCount });
  } catch (error) {
    console.error('Error cleaning up security alerts:', error);
    return NextResponse.json(
      { error: 'Failed to clean up security alerts' },
      { status: 500 }
    );
  }
}
