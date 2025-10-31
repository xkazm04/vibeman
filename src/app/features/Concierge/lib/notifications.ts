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

    // In a real implementation, you would integrate with an email service
    // For now, we'll just log the notification and mark as sent
    console.log('📧 Notification:', {
      to,
      subject,
      body: body.substring(0, 100) + '...',
    });

    // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
    // await emailService.send({ to, subject, body });

    return true;
  } catch (error) {
    console.error('Error sending notification:', error);
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

View details: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/concierge/requests/${request.id}

---
AI Code Concierge
  `.trim();

  await sendNotification({
    to: developerEmails,
    subject,
    body,
    requestId: request.id,
    type: 'new_request',
  });

  // Log event
  eventDb.createEvent({
    id: uuidv4(),
    project_id: request.project_id,
    title: 'Notification Sent',
    description: `Notified ${developerEmails.length} developer(s) about new feature request`,
    type: 'info',
    agent: 'concierge',
    message: 'New request notification sent',
  });
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

View and approve: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/concierge/requests/${request.id}

AI Analysis:
${request.ai_analysis || 'No analysis available'}

---
AI Code Concierge
  `.trim();

  await sendNotification({
    to: developerEmails,
    subject,
    body,
    requestId: request.id,
    type: 'code_generated',
  });

  // Log event
  eventDb.createEvent({
    id: uuidv4(),
    project_id: request.project_id,
    title: 'Code Generation Notification Sent',
    description: `Notified ${developerEmails.length} developer(s) about generated code`,
    type: 'success',
    agent: 'concierge',
    message: 'Code generation notification sent',
  });
}

/**
 * Notify requestor that code has been committed
 */
export async function notifyCodeCommitted(request: DbFeatureRequest): Promise<void> {
  if (!request.requester_email) return;

  const subject = `Your Feature Request Has Been Implemented`;
  const body = `
Good news! Your feature request has been implemented and committed to the repository.

Request: ${request.natural_language_description}

${request.commit_url ? `View commit: ${request.commit_url}` : ''}
${request.commit_sha ? `Commit SHA: ${request.commit_sha}` : ''}

The code is now available in the repository and will be included in the next deployment.

Thank you for using AI Code Concierge!

---
AI Code Concierge
  `.trim();

  await sendNotification({
    to: [request.requester_email],
    subject,
    body,
    requestId: request.id,
    type: 'committed',
  });

  // Log event
  eventDb.createEvent({
    id: uuidv4(),
    project_id: request.project_id,
    title: 'Commit Notification Sent',
    description: `Notified ${request.requester_name} about code commit`,
    type: 'success',
    agent: 'concierge',
    message: 'Code commit notification sent',
  });
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

A developer will review this request manually. You may be contacted for additional information.

---
AI Code Concierge
  `.trim();

  await sendNotification({
    to: [request.requester_email],
    subject,
    body,
    requestId: request.id,
    type: 'failed',
  });

  // Log event
  eventDb.createEvent({
    id: uuidv4(),
    project_id: request.project_id,
    title: 'Failure Notification Sent',
    description: `Notified ${request.requester_name} about request failure`,
    type: 'error',
    agent: 'concierge',
    message: 'Failure notification sent',
  });
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
      console.log('Processing notification:', notification.id);

      // Mark as sent
      featureRequestDb.updateNotification(notification.id, 'sent');
    } catch (error) {
      console.error('Error processing notification:', error);
      featureRequestDb.updateNotification(
        notification.id,
        'failed',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }
}
