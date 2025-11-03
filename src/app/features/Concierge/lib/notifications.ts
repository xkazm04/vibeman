/**
 * Notification Service for AI Code Concierge
 * Sends notifications to developers about feature requests
 */

import { featureRequestDb, DbFeatureRequest, eventDb } from '@/app/db';
import { v4 as uuidv4 } from 'uuid';

export interface NotificationPayload {
  to: string[];
  subject: string;
  body: string;
  requestId: string;
  type: 'new_request' | 'code_generated' | 'committed' | 'approved' | 'rejected' | 'failed';
}

/**
 * Get base URL for notification links
 */
function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

/**
 * Get request URL for notifications
 */
function getRequestUrl(requestId: string): string {
  return `${getBaseUrl()}/concierge/requests/${requestId}`;
}

/**
 * Build notification footer
 */
function buildNotificationFooter(): string {
  return '\n---\nAI Code Concierge';
}

/**
 * Helper to log notification event
 */
function logNotificationEvent(
  projectId: string,
  title: string,
  description: string,
  eventType: 'info' | 'success' | 'error' = 'info'
) {
  eventDb.createEvent({
    id: uuidv4(),
    project_id: projectId,
    title,
    description,
    type: eventType,
    agent: 'concierge',
    message: title,
  });
}

/**
 * Create and send notification with logging
 */
async function sendNotificationWithLogging(
  to: string[],
  subject: string,
  body: string,
  request: DbFeatureRequest,
  type: NotificationPayload['type'],
  logTitle: string,
  logMessage: string,
  eventType: 'info' | 'success' | 'error' = 'info'
): Promise<void> {
  const fullBody = body.trim() + buildNotificationFooter();

  await sendNotification({
    to,
    subject,
    body: fullBody,
    requestId: request.id,
    type,
  });

  logNotificationEvent(
    request.project_id,
    logTitle,
    logMessage,
    eventType
  );
}

/**
 * Send notification about a feature request
 */
export async function sendNotification(payload: NotificationPayload): Promise<boolean> {
  const { to, subject, body, requestId, type } = payload;

  try {
    // Create notification records
    for (const email of to) {
      featureRequestDb.createNotification({
        id: uuidv4(),
        feature_request_id: requestId,
        recipient_email: email,
        notification_type: type,
        delivery_status: 'pending',
      });
    }

    // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
    // await emailService.send({ to, subject, body });

    return true;
  } catch (error) {
    // TODO: Integrate with proper logging service
    return false;
  }
}

/**
 * Notify developers about a new feature request
 */
export async function notifyNewRequest(
  request: DbFeatureRequest,
  developerEmails: string[]
): Promise<void> {
  const subject = `New Feature Request: ${request.natural_language_description.substring(0, 50)}...`;
  const body = `
A new feature request has been submitted by ${request.requester_name}.

Priority: ${request.priority.toUpperCase()}

Description:
${request.natural_language_description}

View details: ${getRequestUrl(request.id)}`;

  await sendNotificationWithLogging(
    developerEmails,
    subject,
    body,
    request,
    'new_request',
    'Notification Sent',
    `Notified ${developerEmails.length} developer(s) about new feature request`,
    'info'
  );
}

/**
 * Notify developers that code has been generated
 */
export async function notifyCodeGenerated(
  request: DbFeatureRequest,
  developerEmails: string[]
): Promise<void> {
  const subject = `Code Generated: ${request.natural_language_description.substring(0, 50)}...`;
  const body = `
AI has generated code for a feature request.

Request: ${request.natural_language_description}
Requested by: ${request.requester_name}
Priority: ${request.priority.toUpperCase()}

The generated code is ready for review and approval.

View and approve: ${getRequestUrl(request.id)}

AI Analysis:
${request.ai_analysis || 'No analysis available'}`;

  await sendNotificationWithLogging(
    developerEmails,
    subject,
    body,
    request,
    'code_generated',
    'Code Generation Notification Sent',
    `Notified ${developerEmails.length} developer(s) about generated code`,
    'success'
  );
}

/**
 * Notify requestor that code has been committed
 */
export async function notifyCodeCommitted(request: DbFeatureRequest): Promise<void> {
  if (!request.requester_email) return;

  const subject = `Your Feature Request Has Been Implemented`;
  const commitInfo = [
    request.commit_url ? `View commit: ${request.commit_url}` : '',
    request.commit_sha ? `Commit SHA: ${request.commit_sha}` : ''
  ].filter(Boolean).join('\n');

  const body = `
Good news! Your feature request has been implemented and committed to the repository.

Request: ${request.natural_language_description}

${commitInfo}

The code is now available in the repository and will be included in the next deployment.

Thank you for using AI Code Concierge!`;

  await sendNotificationWithLogging(
    [request.requester_email],
    subject,
    body,
    request,
    'committed',
    'Commit Notification Sent',
    `Notified ${request.requester_name} about code commit`,
    'success'
  );
}

/**
 * Notify requestor that their request failed
 */
export async function notifyRequestFailed(request: DbFeatureRequest): Promise<void> {
  if (!request.requester_email) return;

  const subject = `Feature Request Failed`;
  const body = `
Unfortunately, we encountered an issue processing your feature request.

Request: ${request.natural_language_description}

Error: ${request.error_message || 'Unknown error'}

A developer will review this request manually. You may be contacted for additional information.`;

  await sendNotificationWithLogging(
    [request.requester_email],
    subject,
    body,
    request,
    'failed',
    'Failure Notification Sent',
    `Notified ${request.requester_name} about request failure`,
    'error'
  );
}

/**
 * Process pending notifications
 * This should be called periodically (e.g., via a cron job)
 */
export async function processPendingNotifications(): Promise<void> {
  const pending = featureRequestDb.getPendingNotifications();

  for (const notification of pending) {
    try {
      // TODO: Actually send the email using an email service
      // Mark as sent
      featureRequestDb.updateNotification(notification.id, 'sent');
    } catch (error) {
      // TODO: Integrate with proper logging service
      featureRequestDb.updateNotification(
        notification.id,
        'failed',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }
}
