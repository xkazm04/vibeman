/**
 * API Route: Test Scenarios CRUD
 * GET /api/test-scenarios - List scenarios
 * POST /api/test-scenarios - Create scenario
 * PUT /api/test-scenarios - Update scenario
 * DELETE /api/test-scenarios - Delete scenario
 */

import { NextRequest, NextResponse } from 'next/server';
import { testScenarioDb } from '@/app/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const contextId = searchParams.get('contextId');
    const status = searchParams.get('status');
    const scenarioId = searchParams.get('id');

    if (scenarioId) {
      const scenario = testScenarioDb.getById(scenarioId);
      if (!scenario) {
        return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });
      }
      return NextResponse.json(scenario);
    }

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    let scenarios;
    if (contextId) {
      scenarios = testScenarioDb.getAllByContext(contextId);
    } else if (status) {
      scenarios = testScenarioDb.getByStatus(projectId, status);
    } else {
      scenarios = testScenarioDb.getAllByProject(projectId);
    }

    return NextResponse.json({ scenarios, count: scenarios.length });
  } catch (error) {
    console.error('Error fetching test scenarios:', error);
    return NextResponse.json(
      { error: 'Failed to fetch test scenarios' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { project_id, context_id, name, description, user_flows, created_by } = body;

    if (!project_id || !name || !user_flows) {
      return NextResponse.json(
        { error: 'project_id, name, and user_flows are required' },
        { status: 400 }
      );
    }

    const scenario = testScenarioDb.create({
      project_id,
      context_id,
      name,
      description,
      user_flows,
      created_by: created_by || 'manual'
    });

    return NextResponse.json(scenario);
  } catch (error) {
    console.error('Error creating test scenario:', error);
    return NextResponse.json(
      { error: 'Failed to create test scenario' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const updated = testScenarioDb.update(id, updates);
    if (!updated) {
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating test scenario:', error);
    return NextResponse.json(
      { error: 'Failed to update test scenario' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const deleted = testScenarioDb.delete(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting test scenario:', error);
    return NextResponse.json(
      { error: 'Failed to delete test scenario' },
      { status: 500 }
    );
  }
}
