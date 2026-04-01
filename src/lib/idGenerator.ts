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
 * Generate queue ID for scan queue items
 */
export function generateQueueId(): string {
  return generateHyphenatedId('queue');
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
 * Generate requirement ID
 */
export function generateRequirementId(): string {
  return generateHyphenatedId('req');
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
 * Generate class ID for monitor
 */
export function generateClassId(): string {
  return generateId('class');
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

// ============================================================================
// Persona Agent System IDs
// ============================================================================

/**
 * Generate persona ID
 */
export function generatePersonaId(): string {
  return generateId('persona');
}

/**
 * Generate persona tool definition ID
 */
export function generatePersonaToolDefId(): string {
  return generateId('ptooldef');
}

/**
 * Generate persona trigger ID
 */
export function generatePersonaTriggerId(): string {
  return generateId('ptrigger');
}

/**
 * Generate persona execution ID
 */
export function generatePersonaExecutionId(): string {
  return generateId('pexec');
}

/**
 * Generate persona credential ID
 */
export function generatePersonaCredentialId(): string {
  return generateId('pcred');
}

/**
 * Generate credential event ID
 */
export function generateCredentialEventId(): string {
  return generateId('cevent');
}

/**
 * Generate manual review ID
 */
export function generateManualReviewId(): string {
  return generateId('mreview');
}

/**
 * Generate design analysis ID
 */
export function generateDesignId(): string {
  return generateId('pdesign');
}

/**
 * Generate connector definition ID
 */
export function generateConnectorId(): string {
  return generateId('conn');
}

/**
 * Generate persona message ID
 */
export function generatePersonaMessageId(): string {
  return generateId('pmsg');
}

/**
 * Generate message delivery ID
 */
export function generateMessageDeliveryId(): string {
  return generateId('pmdel');
}

/**
 * Generate persona event ID
 */
export function generatePersonaEventId(): string {
  return generateId('pevt');
}

/**
 * Generate event subscription ID
 */
export function generateEventSubscriptionId(): string {
  return generateId('pesub');
}
