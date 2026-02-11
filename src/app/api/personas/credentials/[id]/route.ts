import { NextRequest, NextResponse } from 'next/server';
import { personaDb } from '@/app/db';
import { encryptCredential } from '@/lib/personas/credentialCrypto';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, service_type, data } = body;

    // Get existing credential to verify it exists
    const existingCredential = personaDb.credentials.getById(id);
    if (!existingCredential) {
      return NextResponse.json(
        { error: 'Credential not found' },
        { status: 404 }
      );
    }

    // Build update object
    const updateData: any = {};

    if (name !== undefined) {
      updateData.name = name;
    }

    if (service_type !== undefined) {
      updateData.service_type = service_type;
    }

    // If data provided, re-encrypt
    if (data !== undefined) {
      const { encrypted, iv } = encryptCredential(JSON.stringify(data));
      updateData.encrypted_data = encrypted;
      updateData.iv = iv;
    }

    // Update credential
    const credential = await personaDb.credentials.update(id, updateData);

    if (!credential) {
      return NextResponse.json(
        { error: 'Failed to update credential' },
        { status: 500 }
      );
    }

    // Return credential metadata (without encrypted_data/iv)
    const { encrypted_data, iv: _iv, ...credentialMetadata } = credential;

    return NextResponse.json({ credential: credentialMetadata });
  } catch (error) {
    console.error('Error updating credential:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update credential' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify credential exists
    const existingCredential = personaDb.credentials.getById(id);
    if (!existingCredential) {
      return NextResponse.json(
        { error: 'Credential not found' },
        { status: 404 }
      );
    }

    const url = new URL(request.url);
    const force = url.searchParams.get('force') === 'true';

    // Check for linked credential events
    const linkedEvents = personaDb.credentialEvents.getByCredentialId(id);

    // Check for personas using this credential (notification channels + tool dependencies)
    const usingPersonas = personaDb.credentials.findPersonasUsing(id);

    if (!force && (linkedEvents.length > 0 || usingPersonas.length > 0)) {
      const parts: string[] = [];
      if (linkedEvents.length > 0) {
        parts.push(`${linkedEvents.length} linked event(s)`);
      }
      if (usingPersonas.length > 0) {
        const names = usingPersonas.map(p => `${p.name} (${p.usage})`).join(', ');
        parts.push(`used by: ${names}`);
      }
      return NextResponse.json(
        {
          error: `Cannot delete credential: ${parts.join('; ')}. Use force to delete anyway.`,
          event_count: linkedEvents.length,
          using_personas: usingPersonas,
        },
        { status: 409 }
      );
    }

    // Delete linked events first if forcing
    if (linkedEvents.length > 0) {
      personaDb.credentialEvents.deleteByCredentialId(id);
    }

    // Delete credential
    personaDb.credentials.delete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting credential:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete credential' },
      { status: 500 }
    );
  }
}
