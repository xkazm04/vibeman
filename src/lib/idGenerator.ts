/**
 * Standardized ID Generation Utilities
 *
 * Provides consistent ID generation patterns across the codebase.
 * Consolidates 40+ instances of inconsistent Math.random ID generation.
 *
 * All IDs follow the pattern: `{prefix}_{timestamp}_{random}`
 * - prefix: A descriptive prefix for the ID type
 * - timestamp: Date.now() for temporal ordering
 * - random: 7-character random alphanumeric string for uniqueness
 */

/**
 * Default random string length for IDs
 */
const DEFAULT_RANDOM_LENGTH = 7;

/**
 * Generate a random alphanumeric string of specified length.
 *
 * @param length - Length of the random string (default: 7)
 * @returns Random alphanumeric string
 */
export function generateRandomString(length: number = DEFAULT_RANDOM_LENGTH): string {
  return Math.random().toString(36).substring(2, 2 + length);
}

/**
 * Generate a unique ID with a custom prefix.
 * Format: `{prefix}_{timestamp}_{random}`
 *
 * @param prefix - Prefix for the ID (e.g., 'exec', 'queue', 'scan')
 * @returns Unique ID string
 *
 * @example
 * generateId('exec') // => 'exec_1699876543210_abc1234'
 * generateId('queue') // => 'queue_1699876543210_xyz7890'
 */
export function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${generateRandomString()}`;
}

/**
 * Generate a unique ID with hyphen separator.
 * Format: `{prefix}-{timestamp}-{random}`
 *
 * @param prefix - Prefix for the ID
 * @returns Unique ID string with hyphen separators
 *
 * @example
 * generateHyphenatedId('exec') // => 'exec-1699876543210-abc1234'
 */
export function generateHyphenatedId(prefix: string): string {
  return `${prefix}-${Date.now()}-${generateRandomString()}`;
}

// ============================================================================
// Pre-defined ID generators for common use cases
// These provide semantic clarity and consistent naming across the codebase
// ============================================================================

/**
 * Generate execution ID for blueprint/task execution
 */
export function generateExecutionId(): string {
  return generateHyphenatedId('exec');
}

/**
 * Generate queue ID for scan queue items
 */
export function generateQueueId(): string {
  return generateHyphenatedId('queue');
}

/**
 * Generate scan ID for scan operations
 */
export function generateScanId(): string {
  return generateHyphenatedId('scan');
}

/**
 * Generate decision ID for decision queue items
 */
export function generateDecisionId(): string {
  return generateHyphenatedId('decision');
}

/**
 * Generate notification ID for notifications
 */
export function generateNotificationId(): string {
  return generateHyphenatedId('notif');
}

/**
 * Generate test ID for test execution
 */
export function generateTestId(): string {
  return generateHyphenatedId('test');
}

/**
 * Generate replay ID for replay sessions
 */
export function generateReplayId(): string {
  return generateHyphenatedId('replay');
}

/**
 * Generate tech debt ID
 */
export function generateTechDebtId(): string {
  return generateHyphenatedId('tech-debt');
}

/**
 * Generate backlog ID
 */
export function generateBacklogId(): string {
  return generateHyphenatedId('backlog');
}

/**
 * Generate requirement ID
 */
export function generateRequirementId(): string {
  return generateHyphenatedId('req');
}

/**
 * Generate security scan ID
 */
export function generateSecurityScanId(): string {
  return generateHyphenatedId('sec-scan');
}

/**
 * Generate security patch ID
 */
export function generateSecurityPatchId(): string {
  return generateHyphenatedId('sec-patch');
}

/**
 * Generate security PR ID
 */
export function generateSecurityPrId(): string {
  return generateHyphenatedId('sec-pr');
}

/**
 * Generate context group ID
 */
export function generateContextGroupId(): string {
  return generateId('group');
}

/**
 * Generate context relation ID
 */
export function generateContextRelationId(): string {
  return generateId('rel');
}

/**
 * Generate context ID
 */
export function generateContextId(): string {
  return generateId('ctx');
}

/**
 * Generate xray instrumentation ID
 */
export function generateXrayId(): string {
  return generateId('xray');
}

/**
 * Generate ollama request ID
 */
export function generateOllamaId(): string {
  return generateId('ollama');
}

/**
 * Generate insight ID
 */
export function generateInsightId(): string {
  return generateId('insight');
}

/**
 * Generate refactor idea ID
 */
export function generateRefactorIdeaId(): string {
  return generateId('idea_refactor');
}

/**
 * Generate refactor scan ID
 */
export function generateRefactorScanId(): string {
  return generateId('scan_refactor');
}

/**
 * Generate auto scan ID with trigger source
 */
export function generateAutoScanId(triggerSource: string): string {
  return `scan_auto_${triggerSource}_${Date.now()}_${generateRandomString()}`;
}

/**
 * Generate rule ID for refactor wizard
 */
export function generateRuleId(): string {
  return generateHyphenatedId('rule');
}

/**
 * Generate package ID
 */
export function generatePackageId(): string {
  return generateHyphenatedId('pkg');
}

/**
 * Generate blueprint ID
 */
export function generateBlueprintId(): string {
  return generateHyphenatedId('bp');
}

/**
 * Generate evidence ID
 */
export function generateEvidenceId(): string {
  return generateHyphenatedId('ev');
}

/**
 * Generate AI opportunity ID with index
 */
export function generateAiOpportunityId(index: number): string {
  return `ai-${Date.now()}-${index}-${generateRandomString(3)}`;
}

/**
 * Generate class ID for monitor
 */
export function generateClassId(): string {
  return generateId('class');
}

/**
 * Generate stale branch ID
 */
export function generateStaleBranchId(): string {
  return generateId('sb');
}

/**
 * Generate security intelligence ID
 */
export function generateSecurityIntelligenceId(): string {
  return generateId('si');
}

/**
 * Generate alert ID
 */
export function generateAlertId(): string {
  return generateId('alert');
}

/**
 * Generate community security score ID
 */
export function generateCommunityScoreId(): string {
  return generateId('css');
}

/**
 * Generate LLM request ID
 */
export function generateLlmRequestId(providerName: string): string {
  return `${providerName}_${Date.now()}_${generateRandomString()}`;
}
