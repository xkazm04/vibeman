/**
 * Single Connector Definition API
 * PUT: Update a connector definition
 * DELETE: Delete a non-builtin connector definition
 */

import { NextResponse } from 'next/server';
import { personaDb } from '@/app/db';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = personaDb.connectors.getById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Connector not found' }, { status: 404 });
    }

    const updated = personaDb.connectors.update(id, {
      name: body.name,
      label: body.label,
      icon_url: body.icon_url,
      color: body.color,
      category: body.category,
      fields: body.fields,
      healthcheck_config: body.healthcheck_config,
      services: body.services,
      events: body.events,
      metadata: body.metadata,
    });

    if (!updated) {
      return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }

    const connector = {
      id: updated.id,
      name: updated.name,
      label: updated.label,
      icon_url: updated.icon_url,
      color: updated.color,
      category: updated.category,
      fields: JSON.parse(updated.fields),
      healthcheck_config: updated.healthcheck_config ? JSON.parse(updated.healthcheck_config) : null,
      services: JSON.parse(updated.services),
      events: JSON.parse(updated.events),
      is_builtin: !!updated.is_builtin,
      created_at: updated.created_at,
      updated_at: updated.updated_at,
    };

    return NextResponse.json({ connector });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to update connector';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = personaDb.connectors.getById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Connector not found' }, { status: 404 });
    }

    if (existing.is_builtin) {
      return NextResponse.json(
        { error: 'Cannot delete builtin connector definitions' },
        { status: 403 }
      );
    }

    personaDb.connectors.delete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to delete connector';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
