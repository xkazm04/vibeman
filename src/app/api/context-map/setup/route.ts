/**
 * API Route: Context Map Setup
 *
 * POST /api/context-map/setup
 * Copies the context-map-generator skill to target project and creates a requirement
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { logger } from '@/lib/logger';
import { validateProjectPath } from '@/lib/pathSecurity';

const SKILL_SOURCE_PATH = path.join(process.cwd(), '.claude', 'skills', 'context-map-generator.md');

const REQUIREMENT_CONTENT = `# Generate Context Map

Populate Vibeman's context database for this project, then let Vibeman export the
authoritative \`context-map.json\` (hyphen) at the project root — it is derived
from the database and re-written automatically on every context mutation. That
hyphen file is the single source of truth for any reader.

## Instructions

1. Read the skill file at \`.claude/skills/context-map-generator.md\`
2. Follow the instructions in the skill to:
   - Explore the project structure
   - Identify logical modules/contexts (business features, not layers)
   - Categorize files and write summaries for each context
   - Create the contexts via the skill's REST API calls (they write Vibeman's DB)
3. Vibeman then auto-exports the authoritative \`context-map.json\` (hyphen).

## Expected Output

Contexts persisted in Vibeman's database and the authoritative \`context-map.json\`
(hyphen) at the project root.

> Note: a legacy \`context_map.json\` (underscore, v1 schema with
> \`contexts[].filepaths\`) may exist in older projects. It is DEPRECATED — the
> hyphen \`context-map.json\` supersedes it and readers should prefer it.
`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectPath } = body;

    if (!projectPath) {
      return NextResponse.json(
        { error: 'projectPath is required' },
        { status: 400 }
      );
    }

    const pathError = validateProjectPath(projectPath);
    if (pathError) {
      return NextResponse.json(
        { error: pathError },
        { status: 403 }
      );
    }

    // Verify project path exists
    if (!fs.existsSync(projectPath)) {
      return NextResponse.json(
        { error: 'Project path does not exist' },
        { status: 400 }
      );
    }

    // Read the skill file
    if (!fs.existsSync(SKILL_SOURCE_PATH)) {
      return NextResponse.json(
        { error: 'Skill file not found in vibeman installation' },
        { status: 500 }
      );
    }

    const skillContent = fs.readFileSync(SKILL_SOURCE_PATH, 'utf-8');

    // Create .claude/skills directory in target project
    const targetSkillsDir = path.join(projectPath, '.claude', 'skills');
    if (!fs.existsSync(targetSkillsDir)) {
      fs.mkdirSync(targetSkillsDir, { recursive: true });
    }

    // Copy skill file to target project
    const targetSkillPath = path.join(targetSkillsDir, 'context-map-generator.md');
    fs.writeFileSync(targetSkillPath, skillContent, 'utf-8');

    // Create .claude/commands directory in target project
    const targetCommandsDir = path.join(projectPath, '.claude', 'commands');
    if (!fs.existsSync(targetCommandsDir)) {
      fs.mkdirSync(targetCommandsDir, { recursive: true });
    }

    // Create requirement file
    const requirementPath = path.join(targetCommandsDir, 'generate-context-map.md');
    fs.writeFileSync(requirementPath, REQUIREMENT_CONTENT, 'utf-8');

    logger.info('[API] Context map setup completed', {
      projectPath,
      skillPath: targetSkillPath,
      requirementPath
    });

    return NextResponse.json({
      success: true,
      skillPath: targetSkillPath,
      requirementPath,
      message: 'Skill and requirement files created successfully'
    });

  } catch (error) {
    logger.error('[API] Context map setup error:', { error });

    return NextResponse.json(
      {
        error: 'Failed to setup context map generator',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
