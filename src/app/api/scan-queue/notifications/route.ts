/**
 * Scan Notifications API
 * GET: Get notifications for a project
 * PATCH: Mark notifications as read
 * DELETE: Delete a notification
 */

import { NextRequest, NextResponse } from 'next/server';
import { scanQueueDb } from '@/app/db';
import { withObservability } from '@/lib/observability/middleware';

async function handleGet(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    const notifications = scanQueueDb.getNotifications(projectId, unreadOnly);

    return NextResponse.json({ notifications });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch notifications', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function handlePatch(request: NextRequest) {
  try {
    const body = await request.json();
    const { notificationId, projectId, markAll } = body;

    if (markAll && projectId) {
      const count = scanQueueDb.markAllNotificationsRead(projectId);
      return NextResponse.json({ success: true, markedCount: count });
    } else if (notificationId) {
      const success = scanQueueDb.markNotificationRead(notificationId);
      if (!success) {
        return NextResponse.json(
          { error: 'Notification not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'Either notificationId or (projectId and markAll=true) is required' },
        { status: 400 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to mark notifications as read', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function handleDelete(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('notificationId');

    if (!notificationId) {
      return NextResponse.json(
        { error: 'notificationId is required' },
        { status: 400 }
      );
    }

    const success = scanQueueDb.deleteNotification(notificationId);

    if (!success) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete notification', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Export with observability tracking
export const GET = withObservability(handleGet, '/api/scan-queue/notifications');
export const PATCH = withObservability(handlePatch, '/api/scan-queue/notifications');
export const DELETE = withObservability(handleDelete, '/api/scan-queue/notifications');
