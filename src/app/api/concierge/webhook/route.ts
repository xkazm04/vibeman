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

/**
 * POST - Receive feature request from external tool
 */
export async function POST(request: NextRequest) {
  try {
    const body: WebhookPayload = await request.json();

    const {
      source,
      projectId,
      requesterName,
      requesterEmail,
      description,
      priority = 'medium',
      metadata,
      webhookSecret,
    } = body;

    // Validate webhook secret (basic security)
    const expectedSecret = process.env.CONCIERGE_WEBHOOK_SECRET;
    if (expectedSecret && webhookSecret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Invalid webhook secret' },
        { status: 401 }
      );
    }

    // Validate required fields
    if (!source || !projectId || !requesterName || !description) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          details: 'source, projectId, requesterName, and description are required',
        },
        { status: 400 }
      );
    }

    // Validate source
    const validSources = ['notion', 'jira', 'confluence', 'slack', 'api'];
    if (!validSources.includes(source)) {
      return NextResponse.json(
        { error: `Invalid source. Must be one of: ${validSources.join(', ')}` },
        { status: 400 }
      );
    }

    // Create feature request
    const featureRequest = featureRequestDb.create({
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
    console.error('Error processing webhook:', error);
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
    documentation: {
      endpoint: '/api/concierge/webhook',
      method: 'POST',
      description: 'Submit feature requests from external tools like Notion, Jira, Confluence, or Slack',
      requiredFields: ['source', 'projectId', 'requesterName', 'description'],
      optionalFields: ['requesterEmail', 'priority', 'metadata', 'webhookSecret'],
      sources: ['notion', 'jira', 'confluence', 'slack', 'api'],
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
    },
  });
}
