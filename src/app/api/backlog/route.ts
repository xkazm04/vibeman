import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

// GET /api/backlog?projectId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('backlog_items')
      .select('*')
      .eq('project_id', projectId)
      .neq('status', 'rejected')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching backlog items:', error);
      return NextResponse.json({ error: 'Failed to fetch backlog items' }, { status: 500 });
    }

    return NextResponse.json({ backlogItems: data });
  } catch (error) {
    console.error('Error in GET /api/backlog:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/backlog
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      projectId, 
      goalId, 
      agent, 
      title, 
      description, 
      type = 'proposal', 
      impactedFiles = [],
      status = 'pending' 
    } = body;

    if (!projectId || !agent || !title || !description) {
      return NextResponse.json({ 
        error: 'Project ID, agent, title, and description are required' 
      }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from('backlog_items')
      .insert({
        project_id: projectId,
        goal_id: goalId || null,
        agent,
        title,
        description,
        type,
        impacted_files: impactedFiles,
        status
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating backlog item:', error);
      return NextResponse.json({ error: 'Failed to create backlog item' }, { status: 500 });
    }

    return NextResponse.json({ backlogItem: data });
  } catch (error) {
    console.error('Error in POST /api/backlog:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/backlog
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, goalId, title, description, impactedFiles } = body;

    if (!id) {
      return NextResponse.json({ error: 'Backlog item ID is required' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    const updateData: {
      status?: string;
      accepted_at?: string;
      rejected_at?: string;
      goal_id?: string | null;
      title?: string;
      description?: string;
      impacted_files?: string[];
    } = {};
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'accepted') {
        updateData.accepted_at = new Date().toISOString();
      } else if (status === 'rejected') {
        updateData.rejected_at = new Date().toISOString();
      }
    }
    if (goalId !== undefined) updateData.goal_id = goalId;
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (impactedFiles !== undefined) updateData.impacted_files = impactedFiles;

    const { data, error } = await supabase
      .from('backlog_items')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating backlog item:', error);
      return NextResponse.json({ error: 'Failed to update backlog item' }, { status: 500 });
    }

    return NextResponse.json({ backlogItem: data });
  } catch (error) {
    console.error('Error in PUT /api/backlog:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/backlog?id=xxx
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Backlog item ID is required' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    const { error } = await supabase
      .from('backlog_items')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting backlog item:', error);
      return NextResponse.json({ error: 'Failed to delete backlog item' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/backlog:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 