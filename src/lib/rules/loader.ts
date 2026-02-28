/**
 * Rules Loader
 * Loads, registers, and builds execution rules for Claude Code prompts
 */

import type {
  RuleDefinition,
  RuleVariable,
  BuiltRules,
  ExecutionWrapperConfig,
} from './types';

/**
 * RulesLoader class
 * Manages rule registration and builds prompts based on configuration
 */
class RulesLoader {
  private rules: Map<string, RuleDefinition> = new Map();

  /**
   * Register a single rule
   */
  register(rule: RuleDefinition): void {
    if (this.rules.has(rule.id)) {
      console.warn(`Rule '${rule.id}' already registered, overwriting`);
    }
    this.rules.set(rule.id, rule);
  }

  /**
   * Register multiple rules at once
   */
  registerAll(rules: RuleDefinition[]): void {
    for (const rule of rules) {
      this.register(rule);
    }
  }

  /**
   * Get a rule by ID
   */
  getRule(id: string): RuleDefinition | undefined {
    return this.rules.get(id);
  }

  /**
   * Get all registered rules
   */
  getAllRules(): RuleDefinition[] {
    return Array.from(this.rules.values());
  }

  /**
   * Build rules for a specific execution configuration
   * Filters by conditions, sorts by order, and substitutes variables
   */
  buildRules(config: ExecutionWrapperConfig): BuiltRules {
    const allRules = this.getAllRules();

    // Separate included and excluded rules
    const includedRules: RuleDefinition[] = [];
    const excludedRuleIds: string[] = [];

    for (const rule of allRules) {
      const shouldInclude = this.evaluateCondition(rule, config);
      if (shouldInclude) {
        includedRules.push(rule);
      } else {
        excludedRuleIds.push(rule.id);
      }
    }

    // Sort by order
    includedRules.sort((a, b) => a.order - b.order);

    // Substitute variables and build sections
    const sections = includedRules.map(rule =>
      this.substituteVariables(rule.content, rule.variables || [], config)
    );

    return {
      sections,
      fullContent: sections.join('\n\n'),
      includedRuleIds: includedRules.map(r => r.id),
      excludedRuleIds,
    };
  }

  /**
   * Evaluate whether a rule should be included based on its condition
   */
  private evaluateCondition(rule: RuleDefinition, config: ExecutionWrapperConfig): boolean {
    // Always include if marked as such
    if (rule.alwaysInclude) {
      return true;
    }

    // If no condition is specified, don't include by default
    if (!rule.condition) {
      return false;
    }

    // Evaluate the condition function
    try {
      return rule.condition(config);
    } catch (error) {
      console.error(`Error evaluating condition for rule '${rule.id}':`, error);
      return false;
    }
  }

  /**
   * Substitute variables in rule content with values from config
   * Supports special patterns:
   * - {{variable}} - Simple replacement
   * - For contextId: If value exists, replaces with contextId line; otherwise empty
   * - For screenshotCheckbox/gitCheckbox: Replaces with checkbox line if truthy
   */
  private substituteVariables(
    content: string,
    variables: RuleVariable[],
    config: ExecutionWrapperConfig
  ): string {
    let result = content;

    for (const variable of variables) {
      const { placeholder, configKey, defaultValue } = variable;

      // Get value from config
      let value: string | undefined;
      let rawValue: unknown;

      if (configKey in config) {
        rawValue = config[configKey as keyof ExecutionWrapperConfig];
        if (rawValue !== undefined && rawValue !== null) {
          if (Array.isArray(rawValue)) {
            value = rawValue.join(', ');
          } else {
            value = String(rawValue);
          }
        }
      }

      // Special handling for conditional content
      if (placeholder === '{{contextId}}' && configKey === 'contextId') {
        // For implementation-logging: include contextId line only if it exists
        if (rawValue) {
          value = `\n    "contextId": "${rawValue}",`;
        } else {
          value = '';
        }
      } else if (placeholder === '{{screenshotCheckbox}}') {
        // For final-checklist: include screenshot checkbox if contextId exists
        value = config.contextId
          ? '\n- [ ] Screenshot captured (if test scenario exists)'
          : '';
      } else if (placeholder === '{{gitCheckbox}}') {
        // For final-checklist: include git checkbox if gitEnabled
        value = config.gitEnabled
          ? '\n- [ ] Git operations executed'
          : '';
      } else {
        // Use default if no value found for regular substitutions
        if (value === undefined || value === '') {
          value = defaultValue || '';
        }
      }

      // Replace all occurrences of the placeholder
      result = result.replaceAll(placeholder, value);
    }

    return result;
  }

  /**
   * Clear all registered rules
   */
  clear(): void {
    this.rules.clear();
  }
}

/**
 * Singleton instance of the rules loader
 */
export const rulesLoader = new RulesLoader();

/**
 * Export the class for testing
 */
export { RulesLoader };
