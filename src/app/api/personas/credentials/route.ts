import { NextRequest, NextResponse } from 'next/server';
import { personaDb } from '@/app/db';
import { encryptCredential } from '@/lib/personas/credentialCrypto';

export async function GET(request: NextRequest) {
  try {
    // List all credentials (metadata only)
    const credentials = personaDb.credentials.getAll();

    // Strip encrypted_data and iv from response
    const sanitizedCredentials = credentials.map(({ encrypted_data, iv, ...cred }) => cred);

    return NextResponse.json({ credentials: sanitizedCredentials });
  } catch (error) {
    console.error('Error getting credentials:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get credentials' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, service_type, data } = body;

    // Validate required fields
    if (!name || !service_type || !data) {
      return NextResponse.json(
        { error: 'Missing required fields: name, service_type, data' },
        { status: 400 }
      );
    }

    // Encrypt the credential data
    const { encrypted, iv } = encryptCredential(JSON.stringify(data));

    // Store encrypted credential
    const credential = personaDb.credentials.create({
      name,
      service_type,
      encrypted_data: encrypted,
      iv,
    });

    // Return credential metadata (without encrypted_data/iv)
    const { encrypted_data, iv: _iv, ...credentialMetadata } = credential;

    return NextResponse.json({ credential: credentialMetadata }, { status: 201 });
  } catch (error) {
    console.error('Error creating credential:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create credential' },
      { status: 500 }
    );
  }
}
