/**
 * Claude Code Requirement: Unused Component Integration Analysis
 *
 * This prompt instructs Claude Code to analyze unused components and determine
 * how they could be integrated into the codebase, creating requirements for
 * each potential integration opportunity.
 */

export interface UnusedFile {
  filePath: string;
  relativePath: string;
  exports: string[];
  reason: string;
}

export interface IntegrationPromptOptions {
  unusedFiles: UnusedFile[];
  stats?: {
    totalFiles: number;
    totalExports: number;
    unusedExports: number;
  };
}

export function generateIntegrationPrompt(options: IntegrationPromptOptions): string {
  const { unusedFiles, stats } = options;

  const fileList = unusedFiles.map((file, index) =>
    `${index + 1}. \`${file.relativePath}\`
   - Exports: ${file.exports.join(', ')}
   - Current Status: ${file.reason}`
  ).join('\n\n');

  return `# Unused Component Integration Analysis

## Objective
Analyze unused components to determine integration opportunities and create Claude Code requirements for implementing them into the codebase.

## Files to Analyze (${unusedFiles.length} total)

${fileList}

## Task Instructions

### Phase 1: Deep Component Analysis

For each unused component, analyze:

**1. Component Purpose & Functionality**
- Read the component code thoroughly
- Identify its primary purpose and capabilities
- Document its props interface and API
- Note any dependencies or integration requirements
- Assess code quality and maintainability

**2. Current Codebase Gaps**
- Search for similar functionality already implemented
- Identify areas where this component could add value
- Look for incomplete features that could use this component
- Find redundant implementations that could be replaced

**3. Integration Opportunities**
- Determine specific pages/features that could use this component
- Identify refactoring opportunities (replacing existing code)
- Assess potential for reusability across the app
- Consider whether component needs updates before integration

**4. Technical Feasibility**
- Check for breaking changes needed to integrate
- Verify compatibility with current tech stack
- Identify dependencies that need to be installed
- Assess impact on bundle size and performance

### Phase 2: Create Integration Requirements

For each component that has integration potential, create a separate Claude Code requirement file:

**Requirement File Naming:**
\`requirements/integrate-[component-name].md\`

**Requirement Template:**
\`\`\`markdown
# Integrate [Component Name] into [Feature/Page]

## Component Overview
**File:** \`[relative path]\`
**Exports:** [list exports]
**Purpose:** [Brief description]

## Why Integrate
[Explain the value this component adds and the gap it fills]

## Integration Plan

### 1. Pre-Integration Updates
- [ ] [Any component updates needed before integration]
- [ ] [Dependency installations]
- [ ] [Breaking changes to address]

### 2. Integration Points
**Primary Usage:**
- File: \`[target file path]\`
- Location: [Describe where in the file]
- Changes needed: [Describe modifications]

**Additional Usage:** (if applicable)
- [List other integration points]

### 3. Testing Requirements
- [ ] Unit tests for component
- [ ] Integration tests for new usage
- [ ] Manual testing checklist

### 4. Cleanup Tasks
- [ ] Remove redundant code (if replacing existing functionality)
- [ ] Update documentation
- [ ] Add component to component library/catalog

## Success Criteria
- ✅ Component integrated and working in target location(s)
- ✅ No regressions in existing functionality
- ✅ Tests passing
- ✅ Code reviewed and approved

## Estimated Impact
- **Code Quality:** [High/Medium/Low]
- **User Experience:** [High/Medium/Low]
- **Maintainability:** [High/Medium/Low]
- **Performance:** [Positive/Neutral/Negative]
\`\`\`

### Phase 3: Prioritization Matrix

Create a summary report ranking components by integration value:

**File:** \`docs/analysis/unused-components-integration-analysis.md\`

\`\`\`markdown
# Unused Components Integration Analysis

## Executive Summary
[High-level overview of findings]

## Integration Priority Matrix

### 🔴 High Priority (Implement Soon)
[Components with clear value and easy integration]

| Component | Integration Target | Value | Effort | Priority Score |
|-----------|-------------------|-------|--------|----------------|
| [Name] | [Where] | High | Low | 10 |

### 🟡 Medium Priority (Consider)
[Components with moderate value or complexity]

| Component | Integration Target | Value | Effort | Priority Score |
|-----------|-------------------|-------|--------|----------------|
| [Name] | [Where] | Medium | Medium | 5 |

### 🟢 Low Priority (Archive)
[Components with unclear value or high complexity]

| Component | Reason for Low Priority |
|-----------|------------------------|
| [Name] | [Explanation] |

## Recommendations

### Quick Wins (High Value, Low Effort)
[List of easy integrations that provide significant value]

### Strategic Integrations (High Value, High Effort)
[List of complex integrations worth the investment]

### Candidates for Deletion
[Components with no clear integration path]
\`\`\`

${stats ? `
## Current Statistics

- Total unused files: ${stats.totalFiles}
- Total unused exports: ${stats.unusedExports}
- Total exports in codebase: ${stats.totalExports}
` : ''}

## Analysis Guidelines

### Integration Value Assessment

**High Value Indicators:**
- ✅ Solves a current pain point or gap
- ✅ Replaces redundant/lower-quality code
- ✅ Enables new user-facing features
- ✅ Improves performance or accessibility
- ✅ Well-documented and tested

**Low Value Indicators:**
- ❌ Duplicates existing functionality
- ❌ Outdated or incompatible with current stack
- ❌ Poor code quality or lacking tests
- ❌ No clear use case
- ❌ Significant technical debt

### Effort Assessment

**Low Effort (1-2 hours):**
- Simple import and usage
- Minimal/no modifications needed
- No breaking changes

**Medium Effort (1-2 days):**
- Requires component updates
- Some refactoring of target code
- Testing infrastructure needed

**High Effort (3+ days):**
- Major refactoring required
- Breaking changes to multiple files
- Extensive testing needed
- Documentation updates

## Expected Deliverables

1. **Individual requirement files** for each component worth integrating
2. **Integration analysis report** with prioritization matrix
3. **Quick wins list** for immediate implementation
4. **Deletion recommendations** for components with no path forward

## Success Metrics

- Clear action plan for each unused component
- Prioritized backlog of integration work
- Informed decision-making on what to keep vs delete
- Reduced technical debt through strategic integration

🤖 Generated by Blueprint Unused Code Scan
`;
}
