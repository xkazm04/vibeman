import { describe, it, expect } from 'vitest';

/**
 * Importing prompts/index triggers registerPromptBuilders() which calls
 * validateAll(). If any agent is missing a prompt builder, this import
 * itself will throw, catching regressions in CI.
 */
import { PROMPT_BUILDERS } from '@/app/projects/ProjectAI/ScanIdeas/prompts/index';
import {
  AGENT_REGISTRY,
  PromptBuilderRegistry,
  promptBuilderRegistry,
  type ScanType,
} from '@/app/features/Ideas/lib/scanTypes';

describe('PromptBuilderRegistry', () => {
  it('every agent in AGENT_REGISTRY has a registered prompt builder', () => {
    const agentIds = Object.keys(AGENT_REGISTRY) as ScanType[];
    for (const id of agentIds) {
      expect(
        AGENT_REGISTRY[id].buildPrompt,
        `Agent "${id}" is missing a prompt builder`
      ).toBeDefined();
    }
  });

  it('PROMPT_BUILDERS covers all agent types', () => {
    const agentIds = Object.keys(AGENT_REGISTRY) as ScanType[];
    const builderIds = Object.keys(PROMPT_BUILDERS) as ScanType[];
    expect(builderIds.sort()).toEqual(agentIds.sort());
  });

  it('validateAll() throws when a builder is missing', () => {
    // Temporarily remove a builder from the shared registry
    const saved = AGENT_REGISTRY.zen_architect.buildPrompt;
    AGENT_REGISTRY.zen_architect.buildPrompt = undefined;
    try {
      expect(() => promptBuilderRegistry.validateAll()).toThrow('Missing prompt builders');
    } finally {
      AGENT_REGISTRY.zen_architect.buildPrompt = saved;
    }
  });

  it('validateAll() succeeds when all builders are registered', () => {
    // The singleton registry was populated by the import above
    expect(() => promptBuilderRegistry.validateAll()).not.toThrow();
  });
});
