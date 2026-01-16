import { NextRequest, NextResponse } from 'next/server';
import type { UnifiedCustomer, ConversationThread, InteractionHistoryEntry } from '@/lib/social';

/**
 * GET /api/social/customers
 * Get all customers for a project with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const search = searchParams.get('search');
    const minValueScore = searchParams.get('minValueScore');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    // In a full implementation, this would query the database
    // For now, return empty array as customers are aggregated client-side
    // from feedback items
    const customers: UnifiedCustomer[] = [];

    return NextResponse.json({
      customers,
      total: 0,
      filters: {
        search: search || null,
        minValueScore: minValueScore ? parseInt(minValueScore, 10) : null,
      },
      pagination: {
        limit: limit ? parseInt(limit, 10) : 50,
        offset: offset ? parseInt(offset, 10) : 0,
      },
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/social/customers
 * Create or update a customer profile
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, customer } = body;

    if (!projectId || !customer) {
      return NextResponse.json(
        { error: 'projectId and customer data are required' },
        { status: 400 }
      );
    }

    // Validate required customer fields
    if (!customer.displayName) {
      return NextResponse.json(
        { error: 'customer.displayName is required' },
        { status: 400 }
      );
    }

    // In a full implementation, this would save to the database
    // For now, return the customer as-is since aggregation is client-side
    const savedCustomer: UnifiedCustomer = {
      ...customer,
      createdAt: customer.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({ customer: savedCustomer }, { status: 201 });
  } catch (error) {
    console.error('Error creating customer:', error);
    return NextResponse.json(
      { error: 'Failed to create customer' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/social/customers
 * Update customer notes or tags
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, customerId, action, data } = body;

    if (!projectId || !customerId || !action) {
      return NextResponse.json(
        { error: 'projectId, customerId, and action are required' },
        { status: 400 }
      );
    }

    // Handle different update actions
    switch (action) {
      case 'add_note':
        if (!data?.note) {
          return NextResponse.json(
            { error: 'data.note is required for add_note action' },
            { status: 400 }
          );
        }
        // In full implementation, would update database
        return NextResponse.json({
          success: true,
          action: 'add_note',
          customerId,
        });

      case 'add_tag':
        if (!data?.tag) {
          return NextResponse.json(
            { error: 'data.tag is required for add_tag action' },
            { status: 400 }
          );
        }
        return NextResponse.json({
          success: true,
          action: 'add_tag',
          customerId,
        });

      case 'remove_tag':
        if (!data?.tag) {
          return NextResponse.json(
            { error: 'data.tag is required for remove_tag action' },
            { status: 400 }
          );
        }
        return NextResponse.json({
          success: true,
          action: 'remove_tag',
          customerId,
        });

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error updating customer:', error);
    return NextResponse.json(
      { error: 'Failed to update customer' },
      { status: 500 }
    );
  }
}
