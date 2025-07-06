import { NextRequest, NextResponse } from 'next/server';
import { CopilotIntegration } from '@/lib/copilot-integration';
import { CopilotTask } from '@/types/copilot';

const copilot = new CopilotIntegration('http://localhost:5678/webhook/create-copilot-task');

export async function POST(request: NextRequest) {
  try {
    const task: CopilotTask = await request.json();
    
    // Validate required fields
    if (!task.title || !task.description) {
      return NextResponse.json({ 
        error: 'Missing required fields: title and description' 
      }, { status: 400 });
    }

    const result = await copilot.createCopilotTask(task);
    
    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 