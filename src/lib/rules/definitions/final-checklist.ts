/**
 * Final Checklist Rule
 * Always included - dynamic content based on config
 */

import type { RuleDefinition } from '../types';

/**
 * Build dynamic checklist content based on config
 * Note: This rule uses a custom content builder since the checklist
 * items depend on which other rules are included
 */
export const finalChecklistRule: RuleDefinition = {
  id: 'final-checklist',
  name: 'Final Checklist',
  description: 'Final verification before completion',
  category: 'checklist',
  priority: 'high',
  alwaysInclude: true,
  order: 90,
  variables: [
    {
      name: 'hasContextId',
      placeholder: '{{screenshotCheckbox}}',
      configKey: 'contextId',
      defaultValue: '',
    },
    {
      name: 'hasUIVerification',
      placeholder: '{{uiVerificationCheckbox}}',
      configKey: 'uiVerificationEnabled',
      defaultValue: '',
    },
    {
      name: 'hasGit',
      placeholder: '{{gitCheckbox}}',
      configKey: 'gitEnabled',
      defaultValue: '',
    },
  ],
  content: `## Final Checklist

Before finishing:
- [ ] All code changes implemented
- [ ] Test IDs added to interactive components
- [ ] File structure follows guidelines
- [ ] UI components match existing theme
- [ ] Implementation log entry created{{screenshotCheckbox}}{{uiVerificationCheckbox}}{{gitCheckbox}}
- [ ] NO separate documentation files created (unless new major feature)`,
};

/**
 * Custom content builder for final checklist
 * This handles the dynamic checkbox items
 */
export function buildFinalChecklistContent(config: {
  contextId?: string;
  uiVerificationEnabled?: boolean;
  gitEnabled?: boolean;
}): string {
  const screenshotLine = config.contextId
    ? '\n- [ ] Screenshot captured (if test scenario exists)'
    : '';

  const uiVerificationLine = config.uiVerificationEnabled
    ? '\n- [ ] UI verification passed (or issues fixed)'
    : '';

  const gitLine = config.gitEnabled
    ? '\n- [ ] Git operations executed'
    : '';

  return `## Final Checklist

Before finishing:
- [ ] All code changes implemented
- [ ] Test IDs added to interactive components
- [ ] File structure follows guidelines
- [ ] UI components match existing theme
- [ ] Implementation log entry created${screenshotLine}${uiVerificationLine}${gitLine}
- [ ] NO separate documentation files created (unless new major feature)`;
}
