/**
 * Connector Definitions API
 * GET: List all connector definitions
 * POST: Create a new connector definition
 */

import { NextResponse } from 'next/server';
import { personaDb } from '@/app/db';
import type { CredentialTemplateField, CredentialTemplateService, CredentialTemplateEvent } from '@/lib/personas/credentialTemplates';

export async function GET() {
  try {
    const raw = personaDb.connectors.getAll();

    // Parse JSON fields for frontend consumption
    const connectors = raw.map((c) => ({
      id: c.id,
      name: c.name,
      label: c.label,
      icon_url: c.icon_url,
      color: c.color,
      category: c.category,
      fields: JSON.parse(c.fields) as CredentialTemplateField[],
      healthcheck_config: c.healthcheck_config ? JSON.parse(c.healthcheck_config) : null,
      services: JSON.parse(c.services) as CredentialTemplateService[],
      events: JSON.parse(c.events) as CredentialTemplateEvent[],
      is_builtin: !!c.is_builtin,
      created_at: c.created_at,
      updated_at: c.updated_at,
    }));

    return NextResponse.json({ connectors });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch connectors';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.name || !body.label || !body.fields) {
      return NextResponse.json(
        { error: 'name, label, and fields are required' },
        { status: 400 }
      );
    }

    // Check for duplicate name
    const existing = personaDb.connectors.getByName(body.name);
    if (existing) {
      return NextResponse.json(
        { error: `Connector with name "${body.name}" already exists` },
        { status: 409 }
      );
    }

    const created = personaDb.connectors.create({
      name: body.name,
      label: body.label,
      icon_url: body.icon_url ?? null,
      color: body.color,
      category: body.category,
      fields: body.fields,
      healthcheck_config: body.healthcheck_config ?? null,
      services: body.services ?? [],
      events: body.events ?? [],
      metadata: body.metadata ?? null,
    });

    // Return parsed version
    const connector = {
      id: created.id,
      name: created.name,
      label: created.label,
      icon_url: created.icon_url,
      color: created.color,
      category: created.category,
      fields: JSON.parse(created.fields),
      healthcheck_config: created.healthcheck_config ? JSON.parse(created.healthcheck_config) : null,
      services: JSON.parse(created.services),
      events: JSON.parse(created.events),
      is_builtin: !!created.is_builtin,
      created_at: created.created_at,
      updated_at: created.updated_at,
    };

    return NextResponse.json({ connector }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to create connector';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
