import { NextRequest, NextResponse } from 'next/server';
import { startOAuthFlow, isGoogleOAuthConnector } from '@/lib/personas/googleOAuth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { client_id, client_secret, connector_name, extra_scopes } = body;

    if (!client_id || !client_secret) {
      return NextResponse.json(
        { error: 'client_id and client_secret are required' },
        { status: 400 }
      );
    }

    if (!connector_name || !isGoogleOAuthConnector(connector_name)) {
      return NextResponse.json(
        { error: `Unsupported connector: ${connector_name}` },
        { status: 400 }
      );
    }

    const { authUrl, sessionId } = await startOAuthFlow(
      client_id,
      client_secret,
      connector_name,
      extra_scopes
    );

    return NextResponse.json({ authUrl, sessionId });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to start OAuth flow', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
