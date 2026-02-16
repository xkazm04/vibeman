/**
 * Integration Management API
 * Handles CRUD operations for external integrations
 */

import { NextResponse } from 'next/server';
import { integrationDb, webhookDb } from '@/app/db';
import type { IntegrationProvider, IntegrationEventType } from '@/app/db/models/integration.types';
import { isTableMissingError } from '@/app/db/repositories/repository.utils';
import { encryptField } from '@/lib/personas/credentialCrypto';

/**
 * GET /api/integrations
 * Get all integrations for a project
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const provider = searchParams.get('provider') as IntegrationProvider | null;

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId is required' },
        { status: 400 }
      );
    }

    let integrations;
    if (provider) {
      integrations = integrationDb.getByProvider(projectId, provider);
    } else {
      integrations = integrationDb.getByProject(projectId);
    }

    // Parse JSON fields for response
    const parsed = integrations.map((integration) => ({
      ...integration,
      config: safeJsonParse(integration.config, {}),
      enabled_events: safeJsonParse(integration.enabled_events, []),
      // Don't expose credentials in list response
      credentials: integration.credentials ? '[REDACTED]' : null,
    }));

    return NextResponse.json({ success: true, integrations: parsed });
  } catch (error) {
    if (isTableMissingError(error)) {
      return NextResponse.json(
        { success: false, error: 'Integrations feature requires database setup. Run migrations and restart the app.' },
        { status: 503 }
      );
    }
    console.error('Error fetching integrations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch integrations' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/integrations
 * Create a new integration
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      projectId,
      provider,
      name,
      description,
      config,
      credentials,
      enabledEvents,
      webhookUrl,
      webhookMethod,
      webhookHeaders,
      webhookSecret,
    } = body;

    // Validate required fields
    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId is required' },
        { status: 400 }
      );
    }
    if (!provider) {
      return NextResponse.json(
        { success: false, error: 'provider is required' },
        { status: 400 }
      );
    }
    if (!name) {
      return NextResponse.json(
        { success: false, error: 'name is required' },
        { status: 400 }
      );
    }

    // Create integration
    const integration = integrationDb.create({
      project_id: projectId,
      provider,
      name,
      description: description || null,
      status: 'pending',
      config: JSON.stringify(config || {}),
      credentials: credentials ? encryptField(JSON.stringify(credentials)) : null,
      enabled_events: JSON.stringify(enabledEvents || []),
      last_sync_at: null,
      last_error: null,
    });

    // Create webhook if this is a webhook integration
    if (provider === 'webhook' && webhookUrl) {
      webhookDb.create({
        integration_id: integration.id,
        project_id: projectId,
        url: webhookUrl,
        method: webhookMethod || 'POST',
        headers: webhookHeaders ? JSON.stringify(webhookHeaders) : null,
        secret: webhookSecret ? encryptField(webhookSecret) : null,
        retry_on_failure: 1,
        max_retries: 3,
        timeout_ms: 30000,
      });
    }

    return NextResponse.json({
      success: true,
      integration: {
        ...integration,
        config: safeJsonParse(integration.config, {}),
        enabled_events: safeJsonParse(integration.enabled_events, []),
        credentials: integration.credentials ? '[REDACTED]' : null,
      },
    });
  } catch (error) {
    if (isTableMissingError(error)) {
      return NextResponse.json(
        { success: false, error: 'Integrations feature requires database setup. Run migrations and restart the app.' },
        { status: 503 }
      );
    }
    console.error('Error creating integration:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create integration' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/integrations
 * Update an existing integration
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      name,
      description,
      status,
      config,
      credentials,
      enabledEvents,
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      );
    }

    const existing = integrationDb.getById(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Integration not found' },
        { status: 404 }
      );
    }

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (status !== undefined) updates.status = status;
    if (config !== undefined) updates.config = JSON.stringify(config);
    if (credentials !== undefined) updates.credentials = credentials ? encryptField(JSON.stringify(credentials)) : null;
    if (enabledEvents !== undefined) updates.enabled_events = JSON.stringify(enabledEvents);

    const updated = integrationDb.update(id, updates);

    return NextResponse.json({
      success: true,
      integration: updated ? {
        ...updated,
        config: safeJsonParse(updated.config, {}),
        enabled_events: safeJsonParse(updated.enabled_events, []),
        credentials: updated.credentials ? '[REDACTED]' : null,
      } : null,
    });
  } catch (error) {
    if (isTableMissingError(error)) {
      return NextResponse.json(
        { success: false, error: 'Integrations feature requires database setup. Run migrations and restart the app.' },
        { status: 503 }
      );
    }
    console.error('Error updating integration:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update integration' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/integrations
 * Delete an integration
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      );
    }

    const deleted = integrationDb.delete(id);

    return NextResponse.json({ success: true, deleted });
  } catch (error) {
    if (isTableMissingError(error)) {
      return NextResponse.json(
        { success: false, error: 'Integrations feature requires database setup. Run migrations and restart the app.' },
        { status: 503 }
      );
    }
    console.error('Error deleting integration:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete integration' },
      { status: 500 }
    );
  }
}

/**
 * Safely parse JSON with fallback
 */
function safeJsonParse<T>(json: string | null, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}
