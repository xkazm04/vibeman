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

const SKILL_SOURCE_PATH = path.join(process.cwd(), '.claude', 'skills', 'context-map-generator.md');

const REQUIREMENT_CONTENT = `# Generate Context Map

Use the context-map-generator skill to create a context_map.json file for this project.

## Instructions

1. Read the skill file at \`.claude/skills/context-map-generator.md\`
2. Follow the instructions in the skill to:
   - Explore the project structure
   - Identify logical modules/contexts
   - Categorize files (ui, lib, api)
   - Write summaries for each context
3. Generate the \`context_map.json\` file at the project root

## Expected Output

A \`context_map.json\` file at the project root with the schema defined in the skill.
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
