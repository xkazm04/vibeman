import { NextRequest, NextResponse } from 'next/server';
import { testSelectorDb } from '@/app/db';

/**
 * DELETE /api/tester/selectors/[id] - Delete a single test selector by ID
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'Selector ID is required' },
        { status: 400 }
      );
    }

    const success = testSelectorDb.deleteSelector(id);

    if (!success) {
      return NextResponse.json(
        { error: 'Selector not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Test selector deleted successfully',
    });
  } catch (error) {
    console.error('Failed to delete test selector:', error);
    return NextResponse.json(
      { error: 'Failed to delete test selector' },
      { status: 500 }
    );
  }
}
