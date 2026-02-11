import { NextResponse } from 'next/server';
import { getAllCredentialTemplates } from '@/lib/personas/credentialTemplates';

export async function GET() {
  try {
    const templates = getAllCredentialTemplates();
    return NextResponse.json({ templates });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch credential templates' },
      { status: 500 }
    );
  }
}
