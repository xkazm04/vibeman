/**
 * API Route: Generate Directions
 *
 * POST /api/directions/generate
 * Creates a Claude Code requirement file for direction generation
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import fs from 'fs';
import path from 'path';
import { ContextMapEntry } from '../../context-map/route';

interface AnsweredQuestion {
  id: string;
  question: string;
  answer: string;
}

interface GenerateDirectionsRequest {
  projectId: string;
  projectName: string;
  projectPath: string;
  selectedContexts: ContextMapEntry[];
  directionsPerContext?: number;
  userContext?: string;  // User's dilemma/topic description
  answeredQuestions?: AnsweredQuestion[];  // Selected answered questions for context
}

/**
 * Get the Vibeman API base URL for Claude Code to use
 */
function getVibemanApiUrl(): string {
  if (process.env.VIBEMAN_API_URL) {
    return process.env.VIBEMAN_API_URL;
  }
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  return 'http://localhost:3000';
}

/**
 * Build the Claude Code requirement content for direction generation
 */
function buildDirectionRequirement(config: {
  projectId: string;
  projectName: string;
  projectPath: string;
  selectedContexts: ContextMapEntry[];
  directionsPerContext: number;
  userContext?: string;
  answeredQuestions?: AnsweredQuestion[];
}): string {
  const { projectId, projectName, projectPath, selectedContexts, directionsPerContext, userContext, answeredQuestions = [] } = config;
  const apiUrl = getVibemanApiUrl();

  // Build context sections
  const contextSections = selectedContexts.map(ctx => {
    const allFiles = [
      ...(ctx.filepaths.ui || []),
      ...(ctx.filepaths.lib || []),
      ...(ctx.filepaths.api || [])
    ];

    return `### ${ctx.title} (${ctx.id})

**Summary**: ${ctx.summary}

**Files to analyze**:
${allFiles.map(f => `- \`${f}\``).join('\n')}
`;
  }).join('\n---\n\n');

  return `# Strategic Development Directions: ${projectName}

## Mission

Generate **ambitious, high-impact development directions** for each context area. Each direction should represent a **full Claude Code session worth of work** - a significant feature, architectural improvement, or capability enhancement that delivers substantial business value.

**Think like a Principal Engineer or VP of Engineering.** Focus on transformative improvements that will meaningfully advance the product, not incremental tweaks or small fixes.

## Scale of Impact

Each direction should be **substantial enough to warrant its own Claude Code session** (typically 30-90 minutes of AI-assisted development). This means:

- **NOT**: "Add a loading spinner" or "Fix typo in error message"
- **YES**: "Implement real-time collaboration for the editor" or "Add comprehensive undo/redo system"

## Project Information

- **Project ID**: ${projectId}
- **Project Path**: ${projectPath}
- **Directions per Context**: ${directionsPerContext}

${userContext ? `## User Focus Area

The user has provided the following context about their current focus or dilemma:

> ${userContext}

**Use this focus area to prioritize and guide your direction suggestions.** Ensure generated directions align with or address this specific concern.

` : ''}${answeredQuestions.length > 0 ? `## Strategic Input from Answered Questions

The user has answered the following strategic questions about the project. These represent their thinking about the project direction:

${answeredQuestions.map(q => `**Q:** ${q.question}
**A:** ${q.answer}`).join('\n\n')}

**Consider these answers when generating directions.** They provide valuable insight into the user's priorities and vision.

` : ''}## Context Map Entries to Analyze

${contextSections}

---

## Instructions

### Step 1: Strategic Analysis

For each context entry, perform deep analysis:

1. **Read ALL files thoroughly** - understand every component, hook, utility, and API endpoint
2. **Map the data flow** - how does state move through the system?
3. **Identify architectural patterns** - what patterns are used? What's missing?
4. **Evaluate user experience** - what are the friction points? What would delight users?
5. **Consider scale** - how would this handle 10x more data/users?

### Step 2: Identify High-Impact Opportunities

Look for opportunities in these strategic categories:

**Feature Expansion:**
- What major functionality is missing that users would expect?
- What would make this feature "complete" or "professional-grade"?
- What integrations would multiply the value?

**Architecture Evolution:**
- What patterns would improve maintainability at scale?
- Where are there tightly coupled components that should be decoupled?
- What abstractions would make future development faster?

**User Experience Transformation:**
- What workflows are awkward or multi-step that could be streamlined?
- What delightful features would differentiate this from competitors?
- What power-user features would make experts more productive?

**Data & Intelligence:**
- Where could analytics, caching, or optimization dramatically improve performance?
- What data could be surfaced that would provide insights?
- Where could AI/ML enhance the experience?

**Reliability & Quality:**
- What comprehensive error handling would make this bulletproof?
- What testing infrastructure would prevent regressions?
- What observability would help debug production issues?

### Step 3: Generate Strategic Directions

For each context, generate exactly ${directionsPerContext} ambitious directions.

**Each direction MUST include:**

1. **Summary** (compelling one-liner): Clear, ambitious title that conveys scope
2. **Direction content** (detailed markdown with sections):
   - **Vision**: What is the end state we're building toward?
   - **Business Value**: Why does this matter? What problem does it solve?
   - **Scope**: What's included and what's explicitly out of scope?
   - **Key Components**: What are the major pieces to build?
   - **Technical Approach**: High-level architecture and patterns to use
   - **Files to Create/Modify**: Specific paths
   - **Success Criteria**: How do we know when it's done?
   - **Potential Challenges**: What might be tricky?

### Step 4: Save Directions to Database

For each direction, make a POST request:

\`\`\`bash
curl -X POST ${apiUrl}/api/directions \\
  -H "Content-Type: application/json" \\
  -d '{
    "project_id": "${projectId}",
    "context_map_id": "<context_id>",
    "context_map_title": "<context_title>",
    "summary": "<compelling one-liner summary>",
    "direction": "<full markdown content with all sections>"
  }'
\`\`\`

## Direction Quality Guidelines

### EXCELLENT Directions (Strategic, High-Impact):

**Example 1:**
\`\`\`json
{
  "summary": "Implement comprehensive keyboard navigation and power-user shortcuts system",
  "direction": "## Keyboard Navigation & Power-User Shortcuts\\n\\n### Vision\\nTransform the application into a keyboard-first experience where power users can navigate, select, and execute actions without touching the mouse, dramatically improving productivity.\\n\\n### Business Value\\n- Power users can work 2-3x faster\\n- Accessibility compliance (WCAG 2.1 AA)\\n- Professional-grade UX expected by enterprise users\\n- Reduced repetitive strain from mouse usage\\n\\n### Scope\\n**Included:**\\n- Global keyboard shortcut system with customizable bindings\\n- Focus management across all interactive elements\\n- Command palette (Cmd+K) for quick actions\\n- Vim-style navigation mode (optional)\\n- Visual indicators for focused elements\\n- Shortcut hints in tooltips\\n\\n**Out of Scope:**\\n- Full vim emulation\\n- Voice commands\\n\\n### Key Components\\n1. **ShortcutManager** - Central registry for all shortcuts\\n2. **FocusManager** - Tracks and controls focus across the app\\n3. **CommandPalette** - Searchable action launcher\\n4. **ShortcutHints** - UI overlay showing available shortcuts\\n\\n### Technical Approach\\n- Use React context for shortcut state\\n- Implement focus trap patterns for modals\\n- Store user customizations in localStorage\\n- Use event delegation for performance\\n\\n### Files to Create/Modify\\n- Create: \`src/lib/shortcuts/ShortcutManager.ts\`\\n- Create: \`src/lib/shortcuts/FocusManager.ts\`\\n- Create: \`src/components/CommandPalette.tsx\`\\n- Modify: All interactive components for focus handling\\n\\n### Success Criteria\\n- Can navigate entire app without mouse\\n- Command palette finds all actions\\n- Custom shortcuts persist across sessions\\n- No focus traps or dead ends\\n\\n### Potential Challenges\\n- Conflict resolution between shortcuts\\n- Maintaining focus during dynamic content changes\\n- Browser shortcut conflicts"
}
\`\`\`

**Example 2:**
\`\`\`json
{
  "summary": "Build real-time collaborative editing with presence indicators and conflict resolution",
  "direction": "## Real-Time Collaborative Editing System\\n\\n### Vision\\nEnable multiple users to work on the same document simultaneously with live cursors, presence indicators, and intelligent conflict resolution - like Google Docs but for our domain.\\n\\n### Business Value\\n- Enables team workflows (currently single-user only)\\n- Eliminates version conflicts and lost work\\n- Creates stickiness through team adoption\\n- Premium feature for enterprise tier\\n\\n### Scope\\n**Included:**\\n- Real-time sync using WebSocket/CRDT\\n- User presence indicators (who's viewing/editing)\\n- Live cursor positions for other users\\n- Automatic conflict resolution\\n- Offline support with sync on reconnect\\n- Activity feed of recent changes\\n\\n**Out of Scope:**\\n- Video/voice chat\\n- Comments/threads (future enhancement)\\n\\n### Key Components\\n1. **CollaborationProvider** - WebSocket connection management\\n2. **PresenceManager** - Track who's online and where\\n3. **SyncEngine** - CRDT-based document synchronization\\n4. **ConflictResolver** - Merge strategy for concurrent edits\\n5. **ActivityFeed** - Real-time change notifications\\n\\n### Technical Approach\\n- Use Yjs or Automerge for CRDT implementation\\n- WebSocket server for presence and signaling\\n- IndexedDB for offline storage\\n- Optimistic UI with rollback on conflict\\n\\n### Files to Create/Modify\\n- Create: \`src/lib/collaboration/\` directory\\n- Create: \`src/hooks/useCollaboration.ts\`\\n- Create: \`src/components/PresenceAvatars.tsx\`\\n- Modify: Editor components for collaborative state\\n- Create: API routes for WebSocket handling\\n\\n### Success Criteria\\n- Two users can edit simultaneously without conflicts\\n- Changes appear in <100ms on other clients\\n- Offline edits sync correctly on reconnect\\n- Clear indication of who's editing what\\n\\n### Potential Challenges\\n- CRDT complexity for nested data structures\\n- Scaling WebSocket connections\\n- Mobile network reliability"
}
\`\`\`

### BAD Directions (Too Small or Vague):

- "Add loading spinner to button" (too small - single line change)
- "Improve performance" (too vague - no specific approach)
- "Fix the bug in the form" (reactive, not strategic)
- "Add TypeScript types" (incremental, not transformative)
- "Refactor this component" (no clear value proposition)

### The Strategic Litmus Test:

A good direction should:
1. **Require a full Claude Code session** (30-90 min) - not a quick fix
2. **Deliver measurable business value** - users or developers benefit significantly
3. **Be architecturally sound** - fits with existing patterns or improves them
4. **Have clear success criteria** - we know when it's done
5. **Be exciting** - something you'd be proud to ship

## Output Summary

After generating all directions, summarize:
- Total directions created: X
- Strategic themes identified
- Potential impact assessment (high/medium for each)
- Recommended priority order

---

**Remember**: Each accepted direction will spawn a full Claude Code implementation session. Make them worthy of that investment - ambitious, valuable, and transformative.
`;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateDirectionsRequest = await request.json();

    const {
      projectId,
      projectName,
      projectPath,
      selectedContexts,
      directionsPerContext = 3,
      userContext,
      answeredQuestions
    } = body;

    // Validate required fields
    if (!projectId || !projectName || !projectPath) {
      return NextResponse.json(
        { error: 'projectId, projectName, and projectPath are required' },
        { status: 400 }
      );
    }

    if (!selectedContexts || selectedContexts.length === 0) {
      return NextResponse.json(
        { error: 'At least one context must be selected' },
        { status: 400 }
      );
    }

    // Normalize the project path for the current OS
    const normalizedProjectPath = path.normalize(projectPath);

    // Verify project path exists
    if (!fs.existsSync(normalizedProjectPath)) {
      logger.error('[API] Project path does not exist:', { projectPath, normalizedProjectPath });
      return NextResponse.json(
        { error: `Project path does not exist: ${normalizedProjectPath}` },
        { status: 400 }
      );
    }

    // Build requirement content
    const requirementContent = buildDirectionRequirement({
      projectId,
      projectName,
      projectPath: normalizedProjectPath,
      selectedContexts,
      directionsPerContext,
      userContext,
      answeredQuestions
    });

    // Create requirement file with short name
    const timestamp = Date.now();
    const requirementName = `direction-gen-${timestamp}`;

    // Ensure .claude/commands directory exists
    const requirementsDir = path.join(normalizedProjectPath, '.claude', 'commands');
    logger.info('[API] Creating commands directory:', { requirementsDir });

    if (!fs.existsSync(requirementsDir)) {
      fs.mkdirSync(requirementsDir, { recursive: true });
      logger.info('[API] Created commands directory');
    }

    // Write requirement file
    const requirementPath = path.join(requirementsDir, `${requirementName}.md`);
    logger.info('[API] Writing requirement file:', { requirementPath, contentLength: requirementContent.length });

    fs.writeFileSync(requirementPath, requirementContent, 'utf-8');

    // Verify file was written
    const fileExists = fs.existsSync(requirementPath);
    const fileStats = fileExists ? fs.statSync(requirementPath) : null;

    logger.info('[API] Direction generation requirement created:', {
      requirementName,
      requirementPath,
      contextCount: selectedContexts.length,
      directionsPerContext,
      fileExists,
      fileSize: fileStats?.size
    });

    if (!fileExists) {
      return NextResponse.json(
        { error: 'Failed to write requirement file - file does not exist after write' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      requirementName,
      requirementPath,
      contextCount: selectedContexts.length,
      expectedDirections: selectedContexts.length * directionsPerContext
    });

  } catch (error) {
    logger.error('[API] Directions generate error:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
