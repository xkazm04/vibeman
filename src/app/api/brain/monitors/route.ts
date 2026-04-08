/**
 * API Route: Brain Anomaly Monitors
 *
 * GET    /api/brain/monitors?projectId=xxx            — List monitors + active events
 * POST   /api/brain/monitors                          — Create a monitor
 * PUT    /api/brain/monitors?id=xxx                   — Update a monitor
 * DELETE /api/brain/monitors?id=xxx                   — Delete a monitor
 * PATCH  /api/brain/monitors                          — Update event status (acknowledge/snooze/resolve) or evaluate monitors
 */

import { NextRequest, NextResponse } from 'next/server';
import { anomalyMonitorRepository } from '@/app/db/repositories/anomaly-monitor.repository';
import { withObservability } from '@/lib/observability/middleware';
import { generateId } from '@/app/db/repositories/repository.utils';
import { detectAnomalies } from '@/lib/brain/anomalyDetector';
import type { MonitorMetric, MonitorCondition, MonitorEventStatus } from '@/app/db/models/brain.types';

const VALID_METRICS: MonitorMetric[] = ['signal_z_score', 'success_rate', 'failure_rate', 'activity_count', 'decay_weighted_activity'];
const VALID_CONDITIONS: MonitorCondition[] = ['gt', 'lt', 'gte', 'lte', 'abs_gt'];
const VALID_EVENT_STATUSES: MonitorEventStatus[] = ['triggered', 'acknowledged', 'snoozed', 'resolved'];

async function handleGet(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    if (!projectId) {
      return NextResponse.json({ success: false, error: 'projectId is required' }, { status: 400 });
    }

    const monitors = anomalyMonitorRepository.getMonitorsByProject(projectId);
    const activeEvents = anomalyMonitorRepository.getActiveEventsByProject(projectId);

    return NextResponse.json({
      success: true,
      monitors,
      activeEvents,
      counts: {
        total: monitors.length,
        enabled: monitors.filter(m => m.enabled).length,
        activeAlerts: activeEvents.filter(e => e.status === 'triggered').length,
        snoozed: activeEvents.filter(e => e.status === 'snoozed').length,
      },
    });
  } catch (error) {
    console.error('[API] Brain monitors GET error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, name, description, metric, condition, threshold, signalType, contextId, cooldownMinutes } = body;

    if (!projectId || !name || !metric || !condition || threshold === undefined) {
      return NextResponse.json(
        { success: false, error: 'projectId, name, metric, condition, and threshold are required' },
        { status: 400 },
      );
    }

    if (!VALID_METRICS.includes(metric)) {
      return NextResponse.json({ success: false, error: `Invalid metric. Must be one of: ${VALID_METRICS.join(', ')}` }, { status: 400 });
    }
    if (!VALID_CONDITIONS.includes(condition)) {
      return NextResponse.json({ success: false, error: `Invalid condition. Must be one of: ${VALID_CONDITIONS.join(', ')}` }, { status: 400 });
    }
    if (typeof threshold !== 'number' || !isFinite(threshold)) {
      return NextResponse.json({ success: false, error: 'threshold must be a finite number' }, { status: 400 });
    }

    const monitor = anomalyMonitorRepository.createMonitor({
      id: generateId('mon'),
      project_id: projectId,
      name,
      description,
      metric,
      condition,
      threshold,
      signal_type: signalType,
      context_id: contextId,
      cooldown_minutes: cooldownMinutes,
    });

    return NextResponse.json({ success: true, monitor });
  } catch (error) {
    console.error('[API] Brain monitors POST error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

async function handlePut(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }

    const body = await request.json();
    const { name, description, enabled, metric, condition, threshold, signalType, contextId, cooldownMinutes } = body;

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (enabled !== undefined) updates.enabled = enabled ? 1 : 0;
    if (metric !== undefined) {
      if (!VALID_METRICS.includes(metric)) {
        return NextResponse.json({ success: false, error: `Invalid metric` }, { status: 400 });
      }
      updates.metric = metric;
    }
    if (condition !== undefined) {
      if (!VALID_CONDITIONS.includes(condition)) {
        return NextResponse.json({ success: false, error: `Invalid condition` }, { status: 400 });
      }
      updates.condition = condition;
    }
    if (threshold !== undefined) updates.threshold = threshold;
    if (signalType !== undefined) updates.signal_type = signalType;
    if (contextId !== undefined) updates.context_id = contextId;
    if (cooldownMinutes !== undefined) updates.cooldown_minutes = cooldownMinutes;

    const monitor = anomalyMonitorRepository.updateMonitor(id, updates);
    if (!monitor) {
      return NextResponse.json({ success: false, error: 'Monitor not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, monitor });
  } catch (error) {
    console.error('[API] Brain monitors PUT error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

async function handleDelete(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }

    const deleted = anomalyMonitorRepository.deleteMonitor(id);
    return NextResponse.json({ success: true, deleted });
  } catch (error) {
    console.error('[API] Brain monitors DELETE error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

async function handlePatch(request: NextRequest) {
  try {
    const body = await request.json();

    // Event status update: { eventId, status, snoozeDurationMinutes? }
    if (body.eventId) {
      const { eventId, status, snoozeDurationMinutes } = body;
      if (!VALID_EVENT_STATUSES.includes(status)) {
        return NextResponse.json({ success: false, error: `Invalid status` }, { status: 400 });
      }
      const event = anomalyMonitorRepository.updateEventStatus(eventId, status, snoozeDurationMinutes);
      if (!event) {
        return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, event });
    }

    // Evaluate monitors: { action: 'evaluate', projectId }
    if (body.action === 'evaluate' && body.projectId) {
      const events = evaluateMonitors(body.projectId);
      return NextResponse.json({ success: true, triggeredEvents: events });
    }

    return NextResponse.json({ success: false, error: 'Invalid PATCH body' }, { status: 400 });
  } catch (error) {
    console.error('[API] Brain monitors PATCH error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

/**
 * Evaluate all enabled monitors for a project against current anomaly data.
 * Creates events for monitors whose thresholds are breached.
 */
function evaluateMonitors(projectId: string) {
  const monitors = anomalyMonitorRepository.getEnabledMonitorsByProject(projectId);
  if (monitors.length === 0) return [];

  const report = detectAnomalies(projectId, 30, 3);
  const now = Date.now();
  const triggeredEvents: ReturnType<typeof anomalyMonitorRepository.createEvent>[] = [];

  for (const monitor of monitors) {
    // Check cooldown
    if (monitor.last_triggered_at) {
      const lastTriggered = new Date(monitor.last_triggered_at).getTime();
      if (now - lastTriggered < monitor.cooldown_minutes * 60 * 1000) continue;
    }

    let currentValue: number | null = null;

    switch (monitor.metric) {
      case 'signal_z_score': {
        const matching = report.anomalies.find(
          a => (!monitor.signal_type || a.signalType === monitor.signal_type) &&
               (!monitor.context_id || a.contextId === monitor.context_id),
        );
        if (matching) currentValue = matching.zScore;
        break;
      }
      case 'success_rate':
      case 'failure_rate': {
        const implAnomaly = report.anomalies.find(a => a.kind === 'failure_spike');
        if (implAnomaly) {
          currentValue = monitor.metric === 'failure_rate'
            ? implAnomaly.currentValue
            : 1 - implAnomaly.currentValue;
        }
        break;
      }
      case 'activity_count': {
        const activityAnomaly = report.anomalies.find(
          a => (a.kind === 'activity_drop' || a.kind === 'activity_spike') &&
               (!monitor.signal_type || a.signalType === monitor.signal_type),
        );
        if (activityAnomaly) currentValue = activityAnomaly.currentValue;
        break;
      }
      case 'decay_weighted_activity': {
        const decayAnomaly = report.anomalies.find(
          a => (!monitor.signal_type || a.signalType === monitor.signal_type),
        );
        if (decayAnomaly) currentValue = decayAnomaly.currentValue;
        break;
      }
    }

    if (currentValue === null) continue;

    const breached = checkThreshold(currentValue, monitor.condition, monitor.threshold);
    if (!breached) continue;

    const severity = Math.abs(currentValue) >= monitor.threshold * 2 ? 'critical'
      : Math.abs(currentValue) >= monitor.threshold * 1.2 ? 'warning'
      : 'info';

    const nowIso = new Date().toISOString();
    const event = anomalyMonitorRepository.createEvent(
      monitor.id,
      projectId,
      severity,
      currentValue,
      monitor.threshold,
      `Monitor "${monitor.name}" triggered: ${monitor.metric} is ${currentValue.toFixed(2)} (threshold: ${monitor.condition} ${monitor.threshold})`,
    );
    anomalyMonitorRepository.setLastTriggered(monitor.id, nowIso);
    triggeredEvents.push(event);
  }

  return triggeredEvents;
}

function checkThreshold(value: number, condition: string, threshold: number): boolean {
  switch (condition) {
    case 'gt': return value > threshold;
    case 'lt': return value < threshold;
    case 'gte': return value >= threshold;
    case 'lte': return value <= threshold;
    case 'abs_gt': return Math.abs(value) > threshold;
    default: return false;
  }
}

export const GET = withObservability(handleGet, '/api/brain/monitors');
export const POST = withObservability(handlePost, '/api/brain/monitors');
export const PUT = withObservability(handlePut, '/api/brain/monitors');
export const DELETE = withObservability(handleDelete, '/api/brain/monitors');
export const PATCH = withObservability(handlePatch, '/api/brain/monitors');
