/**
 * Improved AI prompt for generating high-level vision documentation
 * Focuses on strategic overview, user value, and architectural vision
 * rather than technical implementation details
 *
 * @deprecated Use buildPrompt from @/lib/prompts instead
 */

import { buildPrompt, SectionBuilders } from '@/lib/prompts';

export function buildHighLevelDocsPrompt(projectName: string, analysis: any, userVision?: string): string {
  // Build user vision section if provided
  const visionSection = userVision ? `
## Creator's Vision

The project creator has shared their vision:

"${userVision}"

Use this vision as the foundation for your analysis. Ensure the documentation reflects and expands upon this stated vision, connecting it to the actual implementation you observe in the codebase.

---
` : '';

  const promptTemplate = `You are a senior product architect and strategic technical advisor. Your task is to create a HIGH-LEVEL VISION document that explains the strategic purpose, user value, and architectural philosophy of this software project.

This document should be readable by executives, product managers, and developers alike. Focus on the "why" and "what" more than the "how".

${visionSection}

# 🎯 Project Vision

## Mission Statement
Write your North Star naturally - just explain the vision to yourself:
- The core problem this software solves
- Who benefits from it
- The unique value it provides

## Strategic Goals
List 3-5 high-level strategic objectives this project aims to achieve.

## Target Audience
- **Primary Users**: Who are the main users?
- **Use Cases**: What are the top 3-5 use cases?
- **User Benefits**: What tangible benefits do users gain?

# 🏛️ Architecture Vision

## Design Philosophy
Explain the architectural thinking behind this project:
- What principles guide the architecture? (e.g., simplicity, scalability, modularity)
- What trade-offs were made and why?
- What makes this architecture appropriate for the problem domain?

## System Overview
Provide a birds-eye view of how the system works:
- **High-Level Components**: Major building blocks (not individual classes/files)
- **Data Flow**: How does information move through the system?
- **Integration Points**: Key external systems or APIs

## Technical Strategy
- **Tech Stack Rationale**: Why were specific technologies chosen?

# 🚀 Key Capabilities

Organize features by user value (not technical domains). Use the Feature Contexts provided below as a guide to understand the major capabilities.

For each capability/feature area:
- Summarize what users can accomplish
- Explain the business value
- Reference which context(s) implement this capability

## [Value Category 1] (e.g., "Productivity & Automation")
- **Capability**: What can users accomplish?
- **Business Value**: Why does this matter?
- **Implementation Contexts**: Which feature contexts provide this? (Brief summary)

## [Value Category 2] (e.g., "Collaboration & Communication")
- **Capability**: What can users accomplish?
- **Business Value**: Why does this matter?
- **Implementation Contexts**: Which feature contexts provide this? (Brief summary)

# 🎨 Innovation & Differentiation

## What Makes This Special
- What unique approaches or innovations does this project use?
- How does it differ from typical solutions in this space?
- What could others learn from this project?

## Future Potential
- What exciting opportunities exist for expansion?
- What emerging technologies could enhance this?
- What's the 1-2 year vision?

---

**Style Guidelines:**
- Write in clear, professional language (avoid excessive jargon)
- Focus on value and outcomes over implementation details
- Be honest about strengths AND areas for improvement
- Think strategically: what matters for the project's success?
- Use specific examples from the codebase to support your observations
- Make this document useful for decision-making

---`;

  // Build the analysis data section
  const analysisSection = buildAnalysisSection(projectName, analysis);

  return `${promptTemplate}

${analysisSection}

---

IMPORTANT: Create a strategic, high-level document that helps stakeholders understand the project's vision, value, and architecture at a conceptual level. Be specific and actionable in your recommendations, but keep the overall tone strategic rather than tactical.`;
}

function buildAnalysisSection(projectName: string, analysis: any): string {
  let section = `## Available Project Data\n\n**Project Name**: ${projectName}\n\n`;

  // Add technologies if available
  if (analysis?.stats?.technologies?.length > 0) {
    section += `**Technologies Detected**: ${analysis.stats.technologies.join(', ')}\n\n`;
  }

  // Add configuration files (essential for understanding stack)
  if (analysis?.codebase?.configFiles?.length > 0) {
    section += `**Configuration Files**:\n`;
    section += analysis.codebase.configFiles.slice(0, 5).map((f: any) => {
      const truncatedContent = f.content ? f.content.slice(0, 1000) : 'Content not available';
      return `\n### ${f.path}\n\`\`\`${f.type || 'text'}\n${truncatedContent}\n\`\`\``;
    }).join('\n');
    section += '\n\n';
  }

  // Add documentation files (contains valuable context)
  if (analysis?.codebase?.documentationFiles?.length > 0) {
    section += `**Existing Documentation**:\n`;
    section += analysis.codebase.documentationFiles.map((f: any) => {
      const truncatedContent = f.content ? f.content.slice(0, 2000) : 'Content not available';
      return `\n### ${f.path}\n\`\`\`markdown\n${truncatedContent}\n\`\`\``;
    }).join('\n');
    section += '\n\n';
  }

  // PRIORITY: Add contexts (organized feature groups with descriptions)
  // These provide the best insight into codebase organization and capabilities
  if (analysis?.codebase?.contexts?.length > 0) {
    section += `**Feature Contexts** (Organized codebase groups):\n\n`;
    section += `The codebase is organized into ${analysis.codebase.contexts.length} feature contexts. Each context represents a related group of functionality with its own documentation.\n\n`;

    analysis.codebase.contexts.forEach((ctx: any, index: number) => {
      section += `### Context ${index + 1}: ${ctx.name}\n\n`;

      // Add description (FULL, NO TRUNCATION as requested)
      if (ctx.description && ctx.description.trim()) {
        section += `**Description:**\n${ctx.description}\n\n`;
      } else {
        section += `**Description:** No description available\n\n`;
      }

      // Add file paths for reference
      if (ctx.file_paths && ctx.file_paths.length > 0) {
        section += `**Files in this context (${ctx.file_paths.length}):**\n`;
        // Show first 10 files, then count remaining
        const filesToShow = ctx.file_paths.slice(0, 10);
        section += filesToShow.map((f: string) => `- ${f}`).join('\n');
        if (ctx.file_paths.length > 10) {
          section += `\n- ...and ${ctx.file_paths.length - 10} more files`;
        }
        section += '\n\n';
      }

      section += '---\n\n';
    });
  } else {
    // Fallback: Add sample of main files (for understanding architecture) only if no contexts
    if (analysis?.codebase?.mainFiles?.length > 0) {
      section += `**Sample Code Files** (for architecture understanding):\n`;
      section += analysis.codebase.mainFiles.slice(0, 10).map((f: any) => {
        const truncatedContent = f.content ? f.content.slice(0, 1200) : 'Content not available';
        return `\n### ${f.path}\n\`\`\`${f.type || 'text'}\n${truncatedContent}\n\`\`\``;
      }).join('\n');
      section += '\n\n';
    }
  }

  // Add project structure if available
  if (analysis?.structure) {
    section += `**Project Structure Overview**:\n\`\`\`\n${JSON.stringify(analysis.structure, null, 2).slice(0, 1500)}\n\`\`\`\n\n`;
  }

  return section;
}
