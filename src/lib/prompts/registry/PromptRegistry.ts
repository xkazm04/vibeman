/**
 * PromptRegistry
 *
 * Centralized registry for managing all AI prompts with:
 * - Type-safe registration and retrieval
 * - Prompt composition (base templates + agent additions)
 * - Version tracking and metadata
 * - Variable substitution with validation
 */

import {
  PromptDefinition,
  RegisteredPrompt,
  BuiltPrompt,
  PromptBuildOptions,
  PromptQueryOptions,
  PromptStats,
  PromptCategory,
  BaseTemplate,
  AgentAdditions,
  PromptVariable,
  ScanType,
} from './types';
import { replacePlaceholders } from '../builder';

class PromptRegistryClass {
  private prompts: Map<string, RegisteredPrompt> = new Map();
  private baseTemplates: Map<string, BaseTemplate> = new Map();
  private scanTypeMapping: Map<ScanType, string> = new Map();
  private categoryIndex: Map<PromptCategory, Set<string>> = new Map();
  private tagIndex: Map<string, Set<string>> = new Map();

  /**
   * Register a base template for composition
   */
  registerBaseTemplate(template: BaseTemplate): void {
    this.baseTemplates.set(template.id, template);
  }

  /**
   * Get a base template by ID
   */
  getBaseTemplate(id: string): BaseTemplate | undefined {
    return this.baseTemplates.get(id);
  }

  /**
   * Register a prompt definition
   */
  register(definition: PromptDefinition): void {
    const registered: RegisteredPrompt = {
      ...definition,
      registeredAt: new Date(),
      usageCount: 0,
    };

    this.prompts.set(definition.id, registered);

    // Index by category
    if (!this.categoryIndex.has(definition.category)) {
      this.categoryIndex.set(definition.category, new Set());
    }
    this.categoryIndex.get(definition.category)!.add(definition.id);

    // Index by scan type if present
    if (definition.scanType) {
      this.scanTypeMapping.set(definition.scanType, definition.id);
    }

    // Index by tags
    if (definition.tags) {
      for (const tag of definition.tags) {
        if (!this.tagIndex.has(tag)) {
          this.tagIndex.set(tag, new Set());
        }
        this.tagIndex.get(tag)!.add(definition.id);
      }
    }
  }

  /**
   * Register multiple prompts at once
   */
  registerAll(definitions: PromptDefinition[]): void {
    for (const def of definitions) {
      this.register(def);
    }
  }

  /**
   * Get a prompt by ID
   */
  get(id: string): RegisteredPrompt | undefined {
    return this.prompts.get(id);
  }

  /**
   * Get a prompt by scan type
   */
  getByScanType(scanType: ScanType): RegisteredPrompt | undefined {
    const id = this.scanTypeMapping.get(scanType);
    return id ? this.prompts.get(id) : undefined;
  }

  /**
   * Query prompts with filters
   */
  query(options: PromptQueryOptions): RegisteredPrompt[] {
    let results: RegisteredPrompt[] = Array.from(this.prompts.values());

    // Filter by category
    if (options.category) {
      const categoryIds = this.categoryIndex.get(options.category);
      if (categoryIds) {
        results = results.filter(p => categoryIds.has(p.id));
      } else {
        results = [];
      }
    }

    // Filter by scan type
    if (options.scanType) {
      results = results.filter(p => p.scanType === options.scanType);
    }

    // Filter by tags
    if (options.tags && options.tags.length > 0) {
      results = results.filter(p => {
        if (!p.tags) return false;
        return options.tags!.some(tag => p.tags!.includes(tag));
      });
    }

    // Filter by search term
    if (options.search) {
      const searchLower = options.search.toLowerCase();
      results = results.filter(p =>
        p.name.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower) ||
        p.id.toLowerCase().includes(searchLower)
      );
    }

    return results;
  }

  /**
   * Get all prompts in a category
   */
  getByCategory(category: PromptCategory): RegisteredPrompt[] {
    return this.query({ category });
  }

  /**
   * List all registered prompt IDs
   */
  listIds(): string[] {
    return Array.from(this.prompts.keys());
  }

  /**
   * List all registered prompts
   */
  listAll(): RegisteredPrompt[] {
    return Array.from(this.prompts.values());
  }

  /**
   * Build a prompt with variable substitution
   */
  build(id: string, options: PromptBuildOptions): BuiltPrompt {
    const prompt = this.prompts.get(id);
    if (!prompt) {
      throw new Error(`Prompt not found: ${id}`);
    }

    // Update usage stats
    prompt.usageCount++;
    prompt.lastUsed = new Date();

    // Validate required variables
    const missingVars = this.validateVariables(prompt.variables, options.values);
    if (missingVars.length > 0) {
      throw new Error(`Missing required variables: ${missingVars.join(', ')}`);
    }

    // Get base template if composing
    let baseTemplate: BaseTemplate | undefined;
    if (prompt.baseTemplateId) {
      baseTemplate = this.baseTemplates.get(prompt.baseTemplateId);
    }

    // Build the prompt content
    const { systemPrompt, userPrompt } = this.composePrompt(
      prompt,
      baseTemplate,
      options.values
    );

    // Format the full prompt
    const fullPrompt = systemPrompt
      ? `${systemPrompt}\n\n${userPrompt}`
      : userPrompt;

    return {
      id: prompt.id,
      systemPrompt,
      userPrompt,
      fullPrompt,
      outputFormat: prompt.outputFormat,
      llmConfig: prompt.llmConfig,
      version: prompt.version.version,
      builtAt: new Date(),
    };
  }

  /**
   * Build a prompt by scan type
   */
  buildByScanType(scanType: ScanType, options: PromptBuildOptions): BuiltPrompt {
    const prompt = this.getByScanType(scanType);
    if (!prompt) {
      throw new Error(`No prompt registered for scan type: ${scanType}`);
    }
    return this.build(prompt.id, options);
  }

  /**
   * Get prompt statistics
   */
  getStats(): PromptStats {
    const prompts = Array.from(this.prompts.values());

    const byCategory: Record<PromptCategory, number> = {
      agent: 0,
      scan: 0,
      context: 0,
      analysis: 0,
      assistant: 0,
      blueprint: 0,
      requirement: 0,
      general: 0,
    };

    const byScanType: Record<string, number> = {};

    for (const p of prompts) {
      byCategory[p.category]++;
      if (p.scanType) {
        byScanType[p.scanType] = (byScanType[p.scanType] || 0) + 1;
      }
    }

    const sortedByUsage = [...prompts].sort((a, b) => b.usageCount - a.usageCount);
    const mostUsed = sortedByUsage.slice(0, 10).map(p => ({
      id: p.id,
      count: p.usageCount,
    }));

    const sortedByUpdated = [...prompts].sort(
      (a, b) => new Date(b.version.updatedAt).getTime() - new Date(a.version.updatedAt).getTime()
    );
    const recentlyUpdated = sortedByUpdated.slice(0, 10).map(p => ({
      id: p.id,
      updatedAt: p.version.updatedAt,
    }));

    return {
      totalPrompts: prompts.length,
      byCategory,
      byScanType,
      mostUsed,
      recentlyUpdated,
    };
  }

  /**
   * Check if a prompt is registered
   */
  has(id: string): boolean {
    return this.prompts.has(id);
  }

  /**
   * Remove a prompt from the registry
   */
  unregister(id: string): boolean {
    const prompt = this.prompts.get(id);
    if (!prompt) return false;

    // Remove from indices
    this.categoryIndex.get(prompt.category)?.delete(id);
    if (prompt.scanType) {
      this.scanTypeMapping.delete(prompt.scanType);
    }
    if (prompt.tags) {
      for (const tag of prompt.tags) {
        this.tagIndex.get(tag)?.delete(id);
      }
    }

    return this.prompts.delete(id);
  }

  /**
   * Clear all registrations
   */
  clear(): void {
    this.prompts.clear();
    this.baseTemplates.clear();
    this.scanTypeMapping.clear();
    this.categoryIndex.clear();
    this.tagIndex.clear();
  }

  // Private methods

  private validateVariables(
    variables: PromptVariable[],
    values: Record<string, string | number | boolean | undefined>
  ): string[] {
    const missing: string[] = [];

    for (const variable of variables) {
      if (variable.required) {
        const value = values[variable.name];
        if (value === undefined || value === null || value === '') {
          missing.push(variable.name);
        }
      }
    }

    return missing;
  }

  private composePrompt(
    prompt: PromptDefinition,
    baseTemplate: BaseTemplate | undefined,
    values: Record<string, string | number | boolean | undefined>
  ): { systemPrompt?: string; userPrompt: string } {
    // If using composition with agent additions
    if (baseTemplate && prompt.agentAdditions) {
      return this.composeWithAgent(baseTemplate, prompt.agentAdditions, values);
    }

    // Standard substitution - use base template if no userPromptTemplate defined
    const template = prompt.userPromptTemplate || baseTemplate?.userPromptTemplate || '';

    const systemPrompt = prompt.systemPrompt
      ? this.substituteVariables(prompt.systemPrompt, values, prompt.variables)
      : undefined;

    const userPrompt = this.substituteVariables(
      template,
      values,
      prompt.variables
    );

    return { systemPrompt, userPrompt };
  }

  private composeWithAgent(
    base: BaseTemplate,
    agent: AgentAdditions,
    values: Record<string, string | number | boolean | undefined>
  ): { systemPrompt?: string; userPrompt: string } {
    // Build agent role section
    const roleSection = `You are the **${agent.agentName}** ${agent.emoji} — ${agent.roleDescription}

## Your Expertise
${agent.expertiseAreas.map(area => `- ${area}`).join('\n')}`;

    // Build focus areas section
    const focusSection = agent.focusAreas.length > 0
      ? `## Focus Areas
${agent.focusAreas.map(area => `- ${area}`).join('\n')}`
      : '';

    // Build analysis guidelines
    const guidelinesSection = agent.analysisGuidelines.length > 0
      ? `## Analysis Guidelines
${agent.analysisGuidelines.map((g, i) => `${i + 1}. ${g}`).join('\n')}`
      : '';

    // Build quality standards
    const qualitySection = agent.qualityStandards.length > 0
      ? `## Quality Standards
${agent.qualityStandards.map((s, i) => `${i + 1}. ${s}`).join('\n')}`
      : '';

    // Build do/don't instructions
    const instructionsSection = `## Critical Instructions

${agent.doInstructions.length > 0 ? `✅ **DO**:
${agent.doInstructions.map(d => `- ${d}`).join('\n')}` : ''}

${agent.dontInstructions.length > 0 ? `❌ **DON'T**:
${agent.dontInstructions.map(d => `- ${d}`).join('\n')}` : ''}`;

    // Build categories section
    const categoriesSection = agent.categories.length > 0
      ? `## Valid Categories
${agent.categories.map(c => `- \`${c}\``).join('\n')}`
      : '';

    // Build expected output section
    const outputSection = `## Expected Output
${agent.expectedOutputDescription}`;

    // Context-specific instructions
    const contextSection = agent.contextSpecificInstructions
      ? `## Context-Specific Instructions
${agent.contextSpecificInstructions}`
      : '';

    // Compose the full user prompt
    const composedTemplate = `${roleSection}

${focusSection}

${guidelinesSection}

${qualitySection}

${instructionsSection}

${categoriesSection}

${outputSection}

${contextSection}

---

${base.userPromptTemplate}`;

    // Substitute variables
    const allVariables = [...base.variables];
    const systemPrompt = base.systemPrompt
      ? this.substituteVariables(base.systemPrompt, values, allVariables)
      : undefined;

    const userPrompt = this.substituteVariables(composedTemplate, values, allVariables);

    return { systemPrompt, userPrompt };
  }

  private substituteVariables(
    template: string,
    values: Record<string, string | number | boolean | undefined>,
    variables: PromptVariable[]
  ): string {
    // Build a merged lookup: provided values take precedence over defaults
    const defaults: Record<string, string> = {};
    for (const variable of variables) {
      if (variable.defaultValue !== undefined) {
        defaults[variable.name] = variable.defaultValue;
      }
    }

    const merged: Record<string, string> = { ...defaults };
    for (const [key, value] of Object.entries(values)) {
      if (value !== undefined && value !== null) {
        merged[key] = String(value);
      }
    }

    // Delegate to shared single-pass replacer
    return replacePlaceholders(template, merged);
  }
}

// Export singleton instance
export const PromptRegistry = new PromptRegistryClass();

// Also export the class for testing or custom instances
export { PromptRegistryClass };
