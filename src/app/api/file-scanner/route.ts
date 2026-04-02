import { NextRequest, NextResponse } from 'next/server';
import { withObservability } from '@/lib/observability/middleware';
import { handleApiError } from '@/lib/api-errors';
import { actionHandlers } from './actions';

async function handlePost(request: NextRequest) {
  try {
    const params = await request.json();
    const handler = actionHandlers[params.action];

    if (!handler) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return handler(params);
  } catch (error) {
    return handleApiError(error, 'File scanner');
  }
}

async function handleGet(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectPath = searchParams.get('projectPath');

  if (!projectPath) {
    return NextResponse.json(
      { error: 'Project path is required' },
      { status: 400 }
    );
  }

  try {
    const projectInfo = {
      path: projectPath,
    };

    return NextResponse.json(projectInfo);
  } catch (error) {
    return handleApiError(error, 'File scanner GET');
  }
}

export const POST = withObservability(handlePost, '/api/file-scanner');
export const GET = withObservability(handleGet, '/api/file-scanner');
