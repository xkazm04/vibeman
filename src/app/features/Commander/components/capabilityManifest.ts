/**
 * Capability Manifest
 * Structured registry of all Annette tool capabilities organized by category.
 *
 * Derived from the unified toolDefinitions.ts — no separate maintenance needed.
 * Adding a tool to toolDefinitions.ts automatically surfaces it here.
 */

import {
  TOOL_DEFINITIONS,
  CATEGORY_META,
} from '@/lib/annette/toolDefinitions';

// ── Types (unchanged for consumer compatibility) ─────────────────────

export interface ToolCapability {
  name: string;
  label: string;
  description: string;
  triggerPrompt: string;
  isCLI?: boolean;
  requiresInput?: boolean;
}

export interface CapabilityCategory {
  id: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  tools: ToolCapability[];
}

// ── Build CAPABILITY_CATEGORIES from unified definitions ─────────────

function buildCategories(): CapabilityCategory[] {
  // Group tools by category
  const toolsByCategory = new Map<string, ToolCapability[]>();
  for (const def of TOOL_DEFINITIONS) {
    let tools = toolsByCategory.get(def.category);
    if (!tools) {
      tools = [];
      toolsByCategory.set(def.category, tools);
    }
    tools.push({
      name: def.name,
      label: def.label,
      description: def.description,
      triggerPrompt: def.triggerPrompt,
      isCLI: def.isCLI,
      requiresInput: def.requiresInput,
    });
  }

  // Build categories in the order defined by CATEGORY_META
  return CATEGORY_META.map(meta => ({
    id: meta.id,
    label: meta.label,
    description: meta.description,
    icon: meta.icon,
    color: meta.color,
    tools: toolsByCategory.get(meta.id) || [],
  }));
}

export const CAPABILITY_CATEGORIES: CapabilityCategory[] = buildCategories();

// ── Flat lookup maps ─────────────────────────────────────────────────

/** Flat lookup: tool name → label */
export const TOOL_LABELS: Record<string, string> = {};
/** Flat lookup: tool name → category */
export const TOOL_CATEGORIES: Record<string, string> = {};
/** Flat lookup: tool name → ToolCapability */
export const TOOL_MAP: Record<string, ToolCapability> = {};

for (const cat of CAPABILITY_CATEGORIES) {
  for (const tool of cat.tools) {
    TOOL_LABELS[tool.name] = tool.label;
    TOOL_CATEGORIES[tool.name] = cat.id;
    TOOL_MAP[tool.name] = tool;
  }
}

/** Count tool usage from a list of messages (based on toolCalls arrays) */
export function countToolUsage(
  messages: Array<{ toolCalls?: Array<{ name: string }> }>
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const msg of messages) {
    if (!msg.toolCalls) continue;
    for (const tc of msg.toolCalls) {
      counts[tc.name] = (counts[tc.name] || 0) + 1;
    }
  }
  return counts;
}
