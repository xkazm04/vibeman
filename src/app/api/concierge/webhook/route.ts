/**
 * Webhook API for External Integrations
 * Accepts feature requests from Notion, Jira, Confluence, Slack, etc.
 */

import { NextRequest, NextResponse } from 'next/server';
import { featureRequestDb } from '@/app/db';
import { v4 as uuidv4 } from 'uuid';

interface WebhookPayload {
  source: 'notion' | 'jira' | 'confluence' | 'slack' | 'api';
  projectId: string;
  requesterName: string;
  requesterEmail?: string;
  description: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  metadata?: Record<string, any>;
  webhookSecret?: string;
}

const VALID_SOURCES = ['notion', 'jira', 'confluence', 'slack', 'api'] as const;

/**
 * POST - Receive feature request from external tool
 */
export async function POST(request: NextRequest) {
  try {
    const body: WebhookPayload = await request.json();

    // Validate webhook secret
    const secretValidation = validateWebhookSecret(body.webhookSecret);
    if (secretValidation) {
      return secretValidation;
    }

    // Validate required fields
    const validationError = validateRequiredFields(body);
    if (validationError) {
      return validationError;
    }

    // Create feature request
    const featureRequest = createFeatureRequest(body);

    return NextResponse.json({
      success: true,
      message: 'Feature request received',
      data: {
        requestId: featureRequest.id,
        status: featureRequest.status,
        createdAt: featureRequest.created_at,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to process webhook',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Webhook health check and documentation
 */
export async function GET() {
  return NextResponse.json({
    service: 'AI Code Concierge Webhook',
    version: '1.0.0',
    status: 'operational',
    documentation: getDocumentation(),
  });
}

/**
 * Validate webhook secret
 */
function validateWebhookSecret(webhookSecret: string | undefined): NextResponse | null {
  const expectedSecret = process.env.CONCIERGE_WEBHOOK_SECRET;
  if (expectedSecret && webhookSecret !== expectedSecret) {
    return NextResponse.json(
      { error: 'Invalid webhook secret' },
      { status: 401 }
    );
  }
  return null;
}

/**
 * Validate required fields in webhook payload
 */
function validateRequiredFields(body: WebhookPayload): NextResponse | null {
  const { source, projectId, requesterName, description } = body;

  if (!source || !projectId || !requesterName || !description) {
    return NextResponse.json(
      {
        error: 'Missing required fields',
        details: 'source, projectId, requesterName, and description are required',
      },
      { status: 400 }
    );
  }

  if (!VALID_SOURCES.includes(source)) {
    return NextResponse.json(
      { error: `Invalid source. Must be one of: ${VALID_SOURCES.join(', ')}` },
      { status: 400 }
    );
  }

  return null;
}

/**
 * Create feature request in database
 */
function createFeatureRequest(body: WebhookPayload) {
  const {
    source,
    projectId,
    requesterName,
    requesterEmail,
    description,
    priority = 'medium',
    metadata,
  } = body;

  return featureRequestDb.create({
    id: uuidv4(),
    project_id: projectId,
    requester_name: requesterName,
    requester_email: requesterEmail,
    source,
    source_metadata: metadata ? JSON.stringify(metadata) : undefined,
    natural_language_description: description,
    status: 'pending',
    priority,
  });
}

/**
 * Get API documentation object
 */
function getDocumentation() {
  return {
    endpoint: '/api/concierge/webhook',
    method: 'POST',
    description: 'Submit feature requests from external tools like Notion, Jira, Confluence, or Slack',
    requiredFields: ['source', 'projectId', 'requesterName', 'description'],
    optionalFields: ['requesterEmail', 'priority', 'metadata', 'webhookSecret'],
    sources: VALID_SOURCES,
    priorities: ['low', 'medium', 'high', 'urgent'],
    examplePayload: {
      source: 'notion',
      projectId: 'project-123',
      requesterName: 'Jane Doe',
      requesterEmail: 'jane@example.com',
      description: 'Add a dark mode toggle to the settings page',
      priority: 'high',
      metadata: {
        notionPageId: 'abc-def-123',
        assignee: 'john@example.com',
      },
      webhookSecret: 'your-secret-here',
    },
  };
}
