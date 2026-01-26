import { NextRequest, NextResponse } from 'next/server';
import {
  getRoutingRules,
  getRoutingRule,
  saveRoutingRule,
  deleteRoutingRule,
  resetToDefaultRules,
  validateRoutingRule,
  getRoutingStats,
  type RoutingRule,
} from '@/app/features/Social/lib/feedbackRouter';

/**
 * GET /api/social/routing-rules
 * Get all routing rules or a specific rule by ID
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const includeStats = searchParams.get('stats') === 'true';

    if (id) {
      // Get specific rule
      const rule = getRoutingRule(id);
      if (!rule) {
        return NextResponse.json(
          { error: 'Rule not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ rule });
    }

    // Get all rules
    const rules = getRoutingRules();

    const response: {
      rules: RoutingRule[];
      count: number;
      activeCount: number;
      stats?: ReturnType<typeof getRoutingStats>;
    } = {
      rules,
      count: rules.length,
      activeCount: rules.filter((r) => r.enabled).length,
    };

    if (includeStats) {
      response.stats = getRoutingStats();
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching routing rules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch routing rules' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/social/routing-rules
 * Create a new routing rule
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rule } = body as { rule: Partial<RoutingRule> };

    if (!rule) {
      return NextResponse.json(
        { error: 'Rule object is required' },
        { status: 400 }
      );
    }

    // Validate the rule
    const validation = validateRoutingRule(rule);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid rule', details: validation.errors },
        { status: 400 }
      );
    }

    // Generate ID if not provided
    const newRule: RoutingRule = {
      id: rule.id || `rule-${Date.now()}`,
      name: rule.name!,
      description: rule.description,
      enabled: rule.enabled ?? true,
      priority: rule.priority ?? 50,
      conditions: rule.conditions!,
      conditionLogic: rule.conditionLogic || 'and',
      actions: rule.actions!,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: rule.createdBy,
      matchCount: 0,
    };

    saveRoutingRule(newRule);

    return NextResponse.json({
      success: true,
      rule: newRule,
    });
  } catch (error) {
    console.error('Error creating routing rule:', error);
    return NextResponse.json(
      { error: 'Failed to create routing rule' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/social/routing-rules
 * Update an existing routing rule
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { rule } = body as { rule: Partial<RoutingRule> & { id: string } };

    if (!rule || !rule.id) {
      return NextResponse.json(
        { error: 'Rule object with id is required' },
        { status: 400 }
      );
    }

    // Check if rule exists
    const existingRule = getRoutingRule(rule.id);
    if (!existingRule) {
      return NextResponse.json(
        { error: 'Rule not found' },
        { status: 404 }
      );
    }

    // Merge with existing rule
    const updatedRule: RoutingRule = {
      ...existingRule,
      ...rule,
      updatedAt: new Date().toISOString(),
    };

    // Validate the updated rule
    const validation = validateRoutingRule(updatedRule);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid rule', details: validation.errors },
        { status: 400 }
      );
    }

    saveRoutingRule(updatedRule);

    return NextResponse.json({
      success: true,
      rule: updatedRule,
    });
  } catch (error) {
    console.error('Error updating routing rule:', error);
    return NextResponse.json(
      { error: 'Failed to update routing rule' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/social/routing-rules
 * Delete a routing rule or reset to defaults
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const reset = searchParams.get('reset') === 'true';

    if (reset) {
      // Reset to default rules
      resetToDefaultRules();
      const rules = getRoutingRules();
      return NextResponse.json({
        success: true,
        message: 'Rules reset to defaults',
        rules,
        count: rules.length,
      });
    }

    if (!id) {
      return NextResponse.json(
        { error: 'Rule ID is required (or use ?reset=true to reset all)' },
        { status: 400 }
      );
    }

    // Delete specific rule
    const deleted = deleteRoutingRule(id);
    if (!deleted) {
      return NextResponse.json(
        { error: 'Rule not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Rule ${id} deleted`,
    });
  } catch (error) {
    console.error('Error deleting routing rule:', error);
    return NextResponse.json(
      { error: 'Failed to delete routing rule' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/social/routing-rules
 * Toggle rule enabled status
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, enabled } = body as { id: string; enabled: boolean };

    if (!id || enabled === undefined) {
      return NextResponse.json(
        { error: 'Rule id and enabled status are required' },
        { status: 400 }
      );
    }

    // Get existing rule
    const existingRule = getRoutingRule(id);
    if (!existingRule) {
      return NextResponse.json(
        { error: 'Rule not found' },
        { status: 404 }
      );
    }

    // Update enabled status
    const updatedRule: RoutingRule = {
      ...existingRule,
      enabled,
      updatedAt: new Date().toISOString(),
    };

    saveRoutingRule(updatedRule);

    return NextResponse.json({
      success: true,
      rule: updatedRule,
    });
  } catch (error) {
    console.error('Error toggling routing rule:', error);
    return NextResponse.json(
      { error: 'Failed to toggle routing rule' },
      { status: 500 }
    );
  }
}
