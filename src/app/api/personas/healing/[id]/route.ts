import { NextResponse } from 'next/server';
import { healingIssueRepository } from '@/app/db/repositories/healingIssueRepository';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    healingIssueRepository.resolve(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
