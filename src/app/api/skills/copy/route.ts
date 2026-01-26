/**
 * Skills Copy API
 *
 * Copies a skill file from Vibeman's .claude/skills folder
 * to a target project's .claude/skills folder.
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface CopySkillRequest {
  skillName: string;
  targetProjectPath: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CopySkillRequest;
    const { skillName, targetProjectPath } = body;

    if (!skillName || !targetProjectPath) {
      return NextResponse.json(
        { success: false, error: 'skillName and targetProjectPath are required' },
        { status: 400 }
      );
    }

    // Source: Vibeman's .claude/skills folder
    const sourcePath = path.join(process.cwd(), '.claude', 'skills', `${skillName}.md`);

    // Check if source exists
    if (!fs.existsSync(sourcePath)) {
      return NextResponse.json(
        { success: false, error: `Skill file not found: ${skillName}.md` },
        { status: 404 }
      );
    }

    // Target: Project's .claude/skills folder
    const targetDir = path.join(targetProjectPath, '.claude', 'skills');
    const targetPath = path.join(targetDir, `${skillName}.md`);

    // Create directory if needed
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Copy file
    fs.copyFileSync(sourcePath, targetPath);

    return NextResponse.json({
      success: true,
      targetPath,
      message: `Skill ${skillName} copied to ${targetProjectPath}`,
    });
  } catch (error) {
    console.error('Error copying skill file:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to copy skill file',
      },
      { status: 500 }
    );
  }
}
