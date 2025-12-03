/**
 * Developer Mind-Meld Consistency API
 * Check code consistency and manage rules
 */

import { NextRequest, NextResponse } from 'next/server';
import { developerProfileDb, consistencyRuleDb } from '@/app/db';
import {
  checkCodeConsistency,
  getConsistencySuggestions,
  generateConsistencyInsight,
} from '@/app/features/DeveloperMindMeld/lib/consistencyChecker';

/**
 * GET /api/developer-mind-meld/consistency
 * Get consistency rules for a project
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const fileType = searchParams.get('fileType') as 'api' | 'component' | 'utility' | 'test' | 'hook' | 'store' | null;

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    const profile = developerProfileDb.getByProject(projectId);
    if (!profile) {
      return NextResponse.json({
        success: true,
        rules: [],
        suggestions: [],
      });
    }

    const rules = consistencyRuleDb.getEnabledByProfile(profile.id);
    const suggestions = fileType ? getConsistencySuggestions(profile.id, fileType) : [];

    return NextResponse.json({
      success: true,
      rules,
      suggestions,
    });
  } catch (error) {
    console.error('Error fetching consistency rules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch consistency rules' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/developer-mind-meld/consistency
 * Check code for consistency violations
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, code, filePath } = body;

    if (!projectId || !code || !filePath) {
      return NextResponse.json(
        { error: 'projectId, code, and filePath are required' },
        { status: 400 }
      );
    }

    const profile = developerProfileDb.getByProject(projectId);
    if (!profile || !profile.enabled) {
      return NextResponse.json({
        success: true,
        report: null,
        message: 'Mind-Meld is disabled',
      });
    }

    const report = checkCodeConsistency(profile.id, code, filePath);

    // Generate insights if violations found
    if (report.violations.length > 0 || report.patternDivergences.length > 0) {
      await generateConsistencyInsight(profile.id, projectId, report);
    }

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error('Error checking consistency:', error);
    return NextResponse.json(
      { error: 'Failed to check consistency' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/developer-mind-meld/consistency
 * Create or update a consistency rule
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      ruleId,
      ruleName,
      ruleType,
      description,
      patternTemplate,
      exampleCode,
      severity,
      autoSuggest,
      enabled,
    } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    const profile = developerProfileDb.getOrCreate(projectId);

    // Update existing rule
    if (ruleId) {
      const updates: Parameters<typeof consistencyRuleDb.update>[1] = {};
      if (ruleName !== undefined) updates.rule_name = ruleName;
      if (description !== undefined) updates.description = description;
      if (patternTemplate !== undefined) updates.pattern_template = patternTemplate;
      if (exampleCode !== undefined) updates.example_code = exampleCode;
      if (severity !== undefined) updates.severity = severity;
      if (autoSuggest !== undefined) updates.auto_suggest = autoSuggest;

      if (enabled !== undefined) {
        consistencyRuleDb.toggleEnabled(ruleId);
      }

      const updatedRule = consistencyRuleDb.update(ruleId, updates);
      return NextResponse.json({
        success: true,
        rule: updatedRule,
      });
    }

    // Create new rule
    if (!ruleName || !ruleType || !description || !patternTemplate) {
      return NextResponse.json(
        { error: 'ruleName, ruleType, description, and patternTemplate are required for new rules' },
        { status: 400 }
      );
    }

    const newRule = consistencyRuleDb.create({
      profile_id: profile.id,
      project_id: projectId,
      rule_name: ruleName,
      rule_type: ruleType,
      description,
      pattern_template: patternTemplate,
      example_code: exampleCode,
      severity,
      auto_suggest: autoSuggest,
    });

    return NextResponse.json({
      success: true,
      rule: newRule,
    });
  } catch (error) {
    console.error('Error managing consistency rule:', error);
    return NextResponse.json(
      { error: 'Failed to manage consistency rule' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/developer-mind-meld/consistency
 * Delete a consistency rule
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ruleId = searchParams.get('ruleId');

    if (!ruleId) {
      return NextResponse.json(
        { error: 'ruleId is required' },
        { status: 400 }
      );
    }

    consistencyRuleDb.delete(ruleId);

    return NextResponse.json({
      success: true,
      message: 'Rule deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting rule:', error);
    return NextResponse.json(
      { error: 'Failed to delete rule' },
      { status: 500 }
    );
  }
}
