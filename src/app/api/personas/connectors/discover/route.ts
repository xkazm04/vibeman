/**
 * Connector Discovery API
 * POST: Start a CLI-powered connector discovery
 */

import { NextResponse } from 'next/server';
import { generateConnectorId } from '@/lib/idGenerator';
import { runConnectorDiscovery } from '@/lib/personas/connectorDiscovery';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.serviceName) {
      return NextResponse.json(
        { error: 'serviceName is required' },
        { status: 400 }
      );
    }

    const discoveryId = generateConnectorId();

    runConnectorDiscovery({
      discoveryId,
      serviceName: body.serviceName,
      context: body.context,
    });

    return NextResponse.json({ discoveryId }, { status: 202 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to start discovery';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
