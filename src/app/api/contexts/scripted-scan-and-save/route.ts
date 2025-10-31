import { NextRequest, NextResponse } from 'next/server';
import { contextQueries } from '@/lib/queries/contextQueries';

interface SavedContext {
  id: string;
  name: string;
  filePaths: string[];
  groupId: string | null;
  groupName: string | null;
}

/**
 * POST /api/contexts/scripted-scan-and-save
 *
 * Orchestrates the complete scripted context scan workflow:
 * 1. Run scripted scan to discover contexts
 * 2. Generate metadata for each context using LLM
 * 3. Save contexts to database
 *
 * Request body:
 * {
 *   projectId: string;
 *   projectPath: string;
 *   projectType: 'nextjs' | 'fastapi';
 *   provider?: string;         // LLM provider (default: 'ollama')
 *   model?: string;            // LLM model
 * }
 *
 * Response:
 * {
 *   success: boolean;
 *   savedContexts: Array<{
 *     id: string;
 *     name: string;
 *     filePaths: string[];
 *     groupId: string | null;
 *     groupName: string | null;
 *   }>;
 *   stats: {
 *     scanned: number;
 *     saved: number;
 *     failed: number;
 *     skippedDuplicates: number;
 *   };
 *   errors?: string[];
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, projectPath, projectType, provider, model } = body;

    // Validate input
    if (!projectId || !projectPath || !projectType) {
      return NextResponse.json(
        { success: false, error: 'projectId, projectPath, and projectType are required' },
        { status: 400 }
      );
    }

    const origin = request.nextUrl.origin;
    const savedContexts: SavedContext[] = [];
    const errors: string[] = [];

    // Step 1: Run scripted scan
    console.log('[Scan & Save] Step 1: Running scripted scan...');
    const scanResponse = await fetch(`${origin}/api/contexts/scripted`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        projectPath,
        projectType,
        dryRun: false,
      }),
    });

    if (!scanResponse.ok) {
      const errorData = await scanResponse.json();
      return NextResponse.json(
        { success: false, error: errorData.error || 'Scripted scan failed' },
        { status: 500 }
      );
    }

    const scanData = await scanResponse.json();

    if (!scanData.success || !scanData.contexts || scanData.contexts.length === 0) {
      return NextResponse.json({
        success: true,
        savedContexts: [],
        stats: {
          scanned: 0,
          saved: 0,
          failed: 0,
          skippedDuplicates: scanData.stats?.skippedDuplicates || 0,
        },
        message: 'No contexts found to process',
      });
    }

    console.log(`[Scan & Save] Found ${scanData.contexts.length} contexts to process`);

    // Step 2 & 3: For each context, generate metadata and save
    for (let i = 0; i < scanData.contexts.length; i++) {
      const context = scanData.contexts[i];
      const allFiles = [context.parentFile, ...context.dependencies];

      console.log(
        `[Scan & Save] Processing context ${i + 1}/${scanData.contexts.length}: ${context.parentFile}`
      );

      try {
        // Generate metadata via LLM
        console.log('[Scan & Save]   - Generating metadata...');
        const metadataResponse = await fetch(`${origin}/api/contexts/generate-metadata`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            projectPath,
            filePaths: allFiles,
            provider,
            model,
          }),
        });

        if (!metadataResponse.ok) {
          const errorData = await metadataResponse.json();
          errors.push(`Failed to generate metadata for ${context.parentFile}: ${errorData.error}`);
          continue;
        }

        const metadataData = await metadataResponse.json();

        if (!metadataData.success || !metadataData.metadata) {
          errors.push(`Failed to generate metadata for ${context.parentFile}`);
          continue;
        }

        const { title, description, groupId } = metadataData.metadata;

        console.log(`[Scan & Save]   - Metadata: "${title}"`);

        // Save context to database
        console.log('[Scan & Save]   - Saving to database...');
        const savedContext = await contextQueries.createContext({
          projectId,
          groupId: groupId || undefined,
          name: title,
          description: description || undefined,
          filePaths: allFiles,
        });

        savedContexts.push({
          id: savedContext.id,
          name: savedContext.name,
          filePaths: allFiles,
          groupId: groupId,
          groupName: metadataData.metadata.groupName,
        });

        console.log(`[Scan & Save]   ✓ Saved context: ${title} (${allFiles.length} files)`);
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Failed to process ${context.parentFile}: ${errorMsg}`);
        console.error(`[Scan & Save]   ✗ Error processing context:`, error);
      }
    }

    // Return results
    return NextResponse.json({
      success: true,
      savedContexts,
      stats: {
        scanned: scanData.contexts.length,
        saved: savedContexts.length,
        failed: scanData.contexts.length - savedContexts.length,
        skippedDuplicates: scanData.stats?.skippedDuplicates || 0,
      },
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully saved ${savedContexts.length} of ${scanData.contexts.length} contexts`,
    });
  } catch (error) {
    console.error('Scripted scan and save error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to scan and save contexts',
      },
      { status: 500 }
    );
  }
}
