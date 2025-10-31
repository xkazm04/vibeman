/**
 * Code Generation API
 * Analyzes feature requests and generates code using AI
 */

import { NextRequest, NextResponse } from 'next/server';
import { featureRequestDb, eventDb } from '@/app/db';
import { v4 as uuidv4 } from 'uuid';
import {
  generateCodeFromDescription,
  loadProjectContexts,
  validateGeneratedCode,
} from '@/app/features/Concierge/lib/codeGenerator';

/**
 * POST - Generate code from a feature request
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { requestId, projectPath, projectType } = body;

    // Validate required fields
    if (!requestId || !projectPath) {
      return NextResponse.json(
        { error: 'requestId and projectPath are required' },
        { status: 400 }
      );
    }

    // Get the feature request
    const featureRequest = featureRequestDb.getById(requestId);
    if (!featureRequest) {
      return NextResponse.json(
        { error: 'Feature request not found' },
        { status: 404 }
      );
    }

    // Update status to analyzing
    featureRequestDb.update(requestId, { status: 'analyzing' });

    // Log event
    eventDb.createEvent({
      id: uuidv4(),
      project_id: featureRequest.project_id,
      title: 'Analyzing Feature Request',
      description: `AI is analyzing request: "${featureRequest.natural_language_description.substring(0, 100)}..."`,
      type: 'info',
      agent: 'concierge',
      message: 'Code generation started',
    });

    try {
      // Load project contexts
      const existingContexts = await loadProjectContexts(featureRequest.project_id);

      // Generate code using AI
      const result = await generateCodeFromDescription({
        projectId: featureRequest.project_id,
        naturalLanguageDescription: featureRequest.natural_language_description,
        projectPath,
        projectType,
        existingContexts,
      });

      // Validate the generated code
      const validation = validateGeneratedCode(result.generatedCode);

      if (!validation.valid) {
        throw new Error(`Generated code validation failed: ${validation.errors.join(', ')}`);
      }

      // Update feature request with generated code
      featureRequestDb.update(requestId, {
        status: 'code_generated',
        ai_analysis: result.analysis,
        generated_code: JSON.stringify(result.generatedCode),
        generated_tests: JSON.stringify(result.generatedTests),
        generated_documentation: result.documentation,
      });

      // Log success event
      eventDb.createEvent({
        id: uuidv4(),
        project_id: featureRequest.project_id,
        title: 'Code Generated Successfully',
        description: `Generated ${result.generatedCode.length} file(s) with ${result.confidence}% confidence`,
        type: 'success',
        agent: 'concierge',
        message: `Estimated effort: ${result.estimatedEffort}`,
      });

      return NextResponse.json({
        success: true,
        data: {
          ...result,
          validation,
          requestId,
        },
      });
    } catch (error) {
      console.error('Code generation error:', error);

      // Update status to failed
      featureRequestDb.update(requestId, {
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });

      // Log error event
      eventDb.createEvent({
        id: uuidv4(),
        project_id: featureRequest.project_id,
        title: 'Code Generation Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        type: 'error',
        agent: 'concierge',
        message: 'Code generation encountered an error',
      });

      throw error;
    }
  } catch (error) {
    console.error('Error in code generation API:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate code',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Get generation status for a request
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('requestId');

    if (!requestId) {
      return NextResponse.json(
        { error: 'requestId is required' },
        { status: 400 }
      );
    }

    const featureRequest = featureRequestDb.getById(requestId);
    if (!featureRequest) {
      return NextResponse.json(
        { error: 'Feature request not found' },
        { status: 404 }
      );
    }

    // Parse generated code if available
    let generatedCode = null;
    let generatedTests = null;

    if (featureRequest.generated_code) {
      try {
        generatedCode = JSON.parse(featureRequest.generated_code);
      } catch (e) {
        console.error('Error parsing generated code:', e);
      }
    }

    if (featureRequest.generated_tests) {
      try {
        generatedTests = JSON.parse(featureRequest.generated_tests);
      } catch (e) {
        console.error('Error parsing generated tests:', e);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        status: featureRequest.status,
        analysis: featureRequest.ai_analysis,
        generatedCode,
        generatedTests,
        documentation: featureRequest.generated_documentation,
        error: featureRequest.error_message,
      },
    });
  } catch (error) {
    console.error('Error getting generation status:', error);
    return NextResponse.json(
      {
        error: 'Failed to get generation status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
