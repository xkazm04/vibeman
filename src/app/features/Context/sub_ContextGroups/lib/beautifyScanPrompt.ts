/**
 * Beautify Scan Prompt Builder
 *
 * Builds the prompt for Claude Code CLI to beautify React/NextJS UI code.
 * Focus: Push prototype code toward production-polished UI.
 * Also generates strategic Directions for larger UI/UX improvements.
 *
 * Uses shared baseScanPrompt infrastructure for consistent Direction generation.
 */

import {
  buildBaseScanPrompt,
  parseBaseScanSummary,
  categorizeFiles,
  detectPatterns,
  type BaseScanPromptOptions,
  type ScanSpecificContent,
  type ContextGroupInfo,
} from './baseScanPrompt';

export interface BeautifyScanPromptOptions {
  groupName: string;
  groupId: string;
  projectId: string;
  projectPath: string;
  filePaths: string[];
  apiBaseUrl?: string;
  contextGroupInfo?: ContextGroupInfo;
}

/**
 * Build the beautify scan prompt for Claude Code CLI
 * Uses shared base infrastructure for consistent Direction generation
 */
export function buildBeautifyScanPrompt({
  groupName,
  groupId,
  projectId,
  projectPath,
  filePaths,
  apiBaseUrl = 'http://localhost:3000',
  contextGroupInfo,
}: BeautifyScanPromptOptions): string {
  // Build context group info from file paths if not provided
  const effectiveContextGroupInfo: ContextGroupInfo = contextGroupInfo || {
    filesByCategory: categorizeFiles(filePaths),
    detectedPatterns: detectPatterns(filePaths),
  };

  const baseOptions: BaseScanPromptOptions = {
    scanType: 'beautify',
    groupName,
    groupId,
    projectId,
    projectPath,
    filePaths,
    apiBaseUrl,
    projectType: 'nextjs', // Beautify is only for React/NextJS
    contextGroupInfo: effectiveContextGroupInfo,
  };

  const immediateActionsSection = `
### Beautification Categories

#### 1. Subtle Animations (AUTO-FIX)
Add tasteful, non-aggressive animations:
- Hover transitions on buttons and cards (scale, shadow, brightness)
- Subtle fade-in on component mount
- Smooth color transitions (transition-colors, transition-all)
- Focus ring animations for accessibility
- **AVOID**: Flashy, distracting, or bouncy animations

#### 2. Background Enhancements (AUTO-FIX)
Improve visual depth and polish:
- Add subtle gradients to solid color backgrounds
- Add glass morphism effects (backdrop-blur, semi-transparent bg)
- Add subtle patterns for visual depth
- **AVOID**: Heavy patterns that distract from content

#### 3. Border & Shadow Refinement (AUTO-FIX)
Polish edges and depth perception:
- Replace sharp borders with subtle rounded corners
- Add soft shadows for elevation (shadow-sm, shadow-md)
- Add subtle border glow effects on focus/hover
- Use border-opacity for softer visual separation
- **AVOID**: Hard drop shadows, excessive border widths

#### 4. Typography Improvements (AUTO-FIX)
Enhance readability and visual hierarchy:
- Ensure consistent font weights and sizes
- Add letter-spacing for headings (tracking-wide, tracking-tight)
- Use proper text colors with opacity for secondary text
- **AVOID**: Changing semantic heading structure

#### 5. Interactive States (AUTO-FIX)
Polish user interaction feedback:
- Add focus-visible rings for accessibility
- Add active/pressed states (scale-95, darker bg)
- Add disabled state styling (opacity, cursor)
- **AVOID**: Removing existing accessibility features

### Implementation Rules

**SAFE to modify:**
- Add Tailwind utility classes for transitions, shadows, borders
- Add framer-motion animations (if already using motion components)
- Enhance existing className strings
- Add hover:/focus:/active: pseudo-class modifiers

**DO NOT modify:**
- Component logic or state management
- Data fetching or API calls
- Event handlers (except adding transition classes)
- Component props or interfaces`;

  const content: ScanSpecificContent = {
    title: 'Beautify Scan',
    missionPart1: 'Immediate Polish: Apply subtle, non-breaking visual improvements',
    missionPart2: 'Strategic Directions: Identify larger UI/UX opportunities worthy of dedicated sessions',
    immediateActionsSection,
    directionCategories: [
      { name: 'Design System', description: 'Opportunities to establish consistent visual language (colors, spacing, typography tokens)' },
      { name: 'Motion Design', description: 'Patterns for animations, transitions, and micro-interactions that enhance UX' },
      { name: 'Responsive Layouts', description: 'Better approaches to handling different screen sizes and orientations' },
      { name: 'Component Polish', description: 'UI components that need systematic improvement (cards, buttons, forms)' },
      { name: 'Visual Feedback', description: 'Loading states, success/error messaging, progress indicators' },
      { name: 'Accessibility Enhancement', description: 'Systematic improvements to keyboard navigation, screen readers, color contrast' },
    ],
    excellentDirections: [
      'Implement comprehensive design system with consistent spacing, colors, and typography tokens',
      'Build animated page transitions with shared element animations',
      'Create responsive layout system that elegantly adapts from mobile to desktop',
      'Design and implement skeleton loading states across all data-fetching components',
      'Build micro-interaction library with consistent hover, click, and focus feedback',
    ],
    badDirections: [
      'Make it look better (too vague)',
      'Add a shadow (too small)',
      'Fix the colors (not actionable)',
      'Improve the design (not strategic)',
    ],
    whenToGenerateCriteria: [
      'Inconsistent visual patterns across components that need unification',
      'Missing loading/empty/error states that would improve UX',
      'Opportunity to introduce a cohesive animation language',
      'Components that could benefit from a more polished design',
      'Accessibility gaps that need systematic attention',
    ],
    maxDirections: '0-2',
    directionMarkdownSections: `## Vision
What this UI/UX improvement achieves and how it elevates the user experience.

## User Impact
- How users will benefit
- What friction points are eliminated

## Design Approach
- Visual language and principles
- Animation philosophy (easing, duration, purpose)
- Accessibility considerations

## Components Affected
1. Component 1 - what changes
2. Component 2 - what changes

## Implementation Strategy
Step-by-step approach to implementing the improvements.

## Files to Modify
- \`path/to/file1.tsx\` - change description
- \`path/to/file2.tsx\` - change description

## Success Criteria
- [ ] Visual criterion 1
- [ ] UX criterion 2
- [ ] Accessibility criterion 3

## Design References
- Relevant design patterns or examples to follow`,
    summaryJsonExample: `{
  "filesScanned": <number>,
  "filesBeautified": <number>,
  "enhancements": {
    "animations": <count>,
    "backgrounds": <count>,
    "borders": <count>,
    "typography": <count>,
    "interactiveStates": <count>
  },
  "directionsGenerated": <number>
}`,
  };

  return buildBaseScanPrompt(baseOptions, content);
}

/** Beautify scan summary type */
export interface BeautifyScanSummary {
  filesScanned: number;
  filesBeautified: number;
  enhancements: {
    animations: number;
    backgrounds: number;
    borders: number;
    typography: number;
    interactiveStates: number;
  };
  directionsGenerated: number;
}

/**
 * Parse the beautify scan summary from CLI output
 * Uses shared base parser for consistency
 */
export function parseBeautifyScanSummary(output: string): BeautifyScanSummary | null {
  return parseBaseScanSummary<BeautifyScanSummary>(output);
}
