/**
 * Annette Service Error Types and Recovery Guidance
 * Provides typed error codes for Annette service failures with user-friendly recovery messages
 */

/**
 * Typed error codes for Annette service failure scenarios
 */
export type AnnetteErrorCode =
  // LLM Provider Errors
  | 'LLM_PROVIDER_UNAVAILABLE'
  | 'LLM_PROVIDER_RATE_LIMIT'
  | 'LLM_PROVIDER_AUTH_FAILED'
  | 'LLM_PROVIDER_TIMEOUT'
  | 'LLM_PROVIDER_INVALID_RESPONSE'
  // Knowledge Query Errors
  | 'KNOWLEDGE_QUERY_TIMEOUT'
  | 'KNOWLEDGE_QUERY_FAILED'
  | 'KNOWLEDGE_CONTEXT_NOT_FOUND'
  // IndexedDB Storage Errors
  | 'INDEXEDDB_UNAVAILABLE'
  | 'INDEXEDDB_QUOTA_EXCEEDED'
  | 'INDEXEDDB_ACCESS_DENIED'
  | 'INDEXEDDB_CORRUPTED'
  // Session Errors
  | 'SESSION_RECOVERY_FAILED'
  | 'SESSION_NOT_FOUND'
  | 'SESSION_STORAGE_FAILED'
  // Network Errors
  | 'NETWORK_OFFLINE'
  | 'API_REQUEST_FAILED'
  // Generic
  | 'UNKNOWN_SERVICE_ERROR';

/**
 * Structured Annette service error with recovery guidance
 */
export interface AnnetteError {
  /** Typed error code for programmatic handling */
  code: AnnetteErrorCode;
  /** Human-readable error message */
  message: string;
  /** User-friendly recovery guidance */
  recovery: string;
  /** Recovery actions available to the user */
  recoveryActions: AnnetteRecoveryAction[];
  /** Optional original error for debugging */
  originalError?: Error | unknown;
  /** Severity level for error handling */
  severity: 'warning' | 'error' | 'critical';
  /** Whether automatic recovery can be attempted */
  autoRecoverable: boolean;
  /** Timestamp when error occurred */
  timestamp: Date;
}

/**
 * Recovery action that user can take
 */
export interface AnnetteRecoveryAction {
  /** Unique identifier for the action */
  id: string;
  /** Button label */
  label: string;
  /** Icon name (lucide icon) */
  icon: 'refresh-cw' | 'settings' | 'trash-2' | 'wifi' | 'key' | 'database' | 'power';
  /** Action type for handling */
  type: 'retry' | 'switch-provider' | 'clear-cache' | 'clear-sessions' | 'check-network' | 'open-settings';
}

/**
 * Recovery configuration for each error code
 */
export const ANNETTE_ERROR_CONFIG: Record<AnnetteErrorCode, Omit<AnnetteError, 'originalError' | 'timestamp'>> = {
  // LLM Provider Errors
  LLM_PROVIDER_UNAVAILABLE: {
    code: 'LLM_PROVIDER_UNAVAILABLE',
    message: 'AI provider is unavailable',
    recovery: 'The selected AI provider cannot be reached. Try switching to a different provider or check if the service is experiencing issues.',
    severity: 'error',
    autoRecoverable: false,
    recoveryActions: [
      { id: 'retry', label: 'Retry', icon: 'refresh-cw', type: 'retry' },
      { id: 'switch', label: 'Switch Provider', icon: 'settings', type: 'switch-provider' },
    ],
  },
  LLM_PROVIDER_RATE_LIMIT: {
    code: 'LLM_PROVIDER_RATE_LIMIT',
    message: 'AI provider rate limit reached',
    recovery: 'Too many requests have been made to the AI provider. Wait a moment and try again, or switch to a different provider.',
    severity: 'warning',
    autoRecoverable: true,
    recoveryActions: [
      { id: 'retry', label: 'Try Again', icon: 'refresh-cw', type: 'retry' },
      { id: 'switch', label: 'Use Different Provider', icon: 'settings', type: 'switch-provider' },
    ],
  },
  LLM_PROVIDER_AUTH_FAILED: {
    code: 'LLM_PROVIDER_AUTH_FAILED',
    message: 'AI provider authentication failed',
    recovery: 'The API key for the AI provider is invalid or expired. Check your provider settings and API key configuration.',
    severity: 'critical',
    autoRecoverable: false,
    recoveryActions: [
      { id: 'settings', label: 'Check Settings', icon: 'key', type: 'open-settings' },
      { id: 'switch', label: 'Try Another Provider', icon: 'settings', type: 'switch-provider' },
    ],
  },
  LLM_PROVIDER_TIMEOUT: {
    code: 'LLM_PROVIDER_TIMEOUT',
    message: 'AI provider request timed out',
    recovery: 'The AI provider took too long to respond. This may be due to high load or a complex query. Try again with a simpler request.',
    severity: 'warning',
    autoRecoverable: true,
    recoveryActions: [
      { id: 'retry', label: 'Retry', icon: 'refresh-cw', type: 'retry' },
    ],
  },
  LLM_PROVIDER_INVALID_RESPONSE: {
    code: 'LLM_PROVIDER_INVALID_RESPONSE',
    message: 'Received invalid response from AI',
    recovery: 'The AI provider returned an unexpected response format. Try again or switch to a different provider.',
    severity: 'error',
    autoRecoverable: true,
    recoveryActions: [
      { id: 'retry', label: 'Try Again', icon: 'refresh-cw', type: 'retry' },
      { id: 'switch', label: 'Switch Provider', icon: 'settings', type: 'switch-provider' },
    ],
  },

  // Knowledge Query Errors
  KNOWLEDGE_QUERY_TIMEOUT: {
    code: 'KNOWLEDGE_QUERY_TIMEOUT',
    message: 'Knowledge query timed out',
    recovery: 'The system took too long to search project knowledge. This may happen with large projects. Try again or narrow your question.',
    severity: 'warning',
    autoRecoverable: true,
    recoveryActions: [
      { id: 'retry', label: 'Retry Query', icon: 'refresh-cw', type: 'retry' },
    ],
  },
  KNOWLEDGE_QUERY_FAILED: {
    code: 'KNOWLEDGE_QUERY_FAILED',
    message: 'Failed to query project knowledge',
    recovery: 'Unable to search through project contexts and goals. The database may be temporarily unavailable.',
    severity: 'error',
    autoRecoverable: true,
    recoveryActions: [
      { id: 'retry', label: 'Retry', icon: 'refresh-cw', type: 'retry' },
    ],
  },
  KNOWLEDGE_CONTEXT_NOT_FOUND: {
    code: 'KNOWLEDGE_CONTEXT_NOT_FOUND',
    message: 'No relevant context found',
    recovery: 'No matching project contexts were found for your query. Try rephrasing your question or ensure contexts are set up for this project.',
    severity: 'warning',
    autoRecoverable: false,
    recoveryActions: [
      { id: 'retry', label: 'Try Again', icon: 'refresh-cw', type: 'retry' },
    ],
  },

  // IndexedDB Storage Errors
  INDEXEDDB_UNAVAILABLE: {
    code: 'INDEXEDDB_UNAVAILABLE',
    message: 'Session storage unavailable',
    recovery: 'Your browser does not support IndexedDB or it has been disabled. Session history will not be saved. Try using a modern browser.',
    severity: 'critical',
    autoRecoverable: false,
    recoveryActions: [],
  },
  INDEXEDDB_QUOTA_EXCEEDED: {
    code: 'INDEXEDDB_QUOTA_EXCEEDED',
    message: 'Storage space is full',
    recovery: 'The browser storage for sessions is full. Clear old sessions to free up space.',
    severity: 'error',
    autoRecoverable: false,
    recoveryActions: [
      { id: 'clear', label: 'Clear Old Sessions', icon: 'trash-2', type: 'clear-sessions' },
    ],
  },
  INDEXEDDB_ACCESS_DENIED: {
    code: 'INDEXEDDB_ACCESS_DENIED',
    message: 'Storage access denied',
    recovery: 'Browser storage access was denied. This may be due to private browsing mode or browser settings.',
    severity: 'error',
    autoRecoverable: false,
    recoveryActions: [],
  },
  INDEXEDDB_CORRUPTED: {
    code: 'INDEXEDDB_CORRUPTED',
    message: 'Session storage corrupted',
    recovery: 'The session storage has become corrupted. Clearing the cache should fix this issue.',
    severity: 'critical',
    autoRecoverable: false,
    recoveryActions: [
      { id: 'clear', label: 'Clear Cache', icon: 'trash-2', type: 'clear-cache' },
    ],
  },

  // Session Errors
  SESSION_RECOVERY_FAILED: {
    code: 'SESSION_RECOVERY_FAILED',
    message: 'Failed to recover session',
    recovery: 'Unable to restore your previous session. Starting a fresh session instead.',
    severity: 'warning',
    autoRecoverable: true,
    recoveryActions: [
      { id: 'retry', label: 'Try Again', icon: 'refresh-cw', type: 'retry' },
      { id: 'clear', label: 'Start Fresh', icon: 'trash-2', type: 'clear-sessions' },
    ],
  },
  SESSION_NOT_FOUND: {
    code: 'SESSION_NOT_FOUND',
    message: 'Session not found',
    recovery: 'The requested session could not be found. It may have been deleted or expired.',
    severity: 'warning',
    autoRecoverable: false,
    recoveryActions: [
      { id: 'clear', label: 'Start New Session', icon: 'power', type: 'clear-sessions' },
    ],
  },
  SESSION_STORAGE_FAILED: {
    code: 'SESSION_STORAGE_FAILED',
    message: 'Failed to save session',
    recovery: 'Unable to save your session. Your conversation will not be saved for later replay.',
    severity: 'warning',
    autoRecoverable: true,
    recoveryActions: [
      { id: 'retry', label: 'Retry Save', icon: 'refresh-cw', type: 'retry' },
    ],
  },

  // Network Errors
  NETWORK_OFFLINE: {
    code: 'NETWORK_OFFLINE',
    message: 'No internet connection',
    recovery: 'You appear to be offline. Check your internet connection and try again.',
    severity: 'error',
    autoRecoverable: true,
    recoveryActions: [
      { id: 'check', label: 'Check Connection', icon: 'wifi', type: 'check-network' },
      { id: 'retry', label: 'Retry', icon: 'refresh-cw', type: 'retry' },
    ],
  },
  API_REQUEST_FAILED: {
    code: 'API_REQUEST_FAILED',
    message: 'Request failed',
    recovery: 'Unable to communicate with the server. This may be a temporary issue.',
    severity: 'error',
    autoRecoverable: true,
    recoveryActions: [
      { id: 'retry', label: 'Try Again', icon: 'refresh-cw', type: 'retry' },
    ],
  },

  // Generic
  UNKNOWN_SERVICE_ERROR: {
    code: 'UNKNOWN_SERVICE_ERROR',
    message: 'An unexpected error occurred',
    recovery: 'Something went wrong. Try refreshing the page or retrying your action.',
    severity: 'error',
    autoRecoverable: true,
    recoveryActions: [
      { id: 'retry', label: 'Retry', icon: 'refresh-cw', type: 'retry' },
    ],
  },
};

/**
 * Create a structured AnnetteError from an error code
 */
export function createAnnetteError(code: AnnetteErrorCode, originalError?: Error | unknown): AnnetteError {
  const config = ANNETTE_ERROR_CONFIG[code];
  return {
    ...config,
    originalError,
    timestamp: new Date(),
  };
}

/**
 * Detect error code from a raw error
 */
export function detectAnnetteErrorCode(error: Error | unknown): AnnetteErrorCode {
  // Check for network offline
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 'NETWORK_OFFLINE';
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    const name = error.name;

    // LLM Provider errors
    if (message.includes('401') || message.includes('unauthorized') || message.includes('invalid api key')) {
      return 'LLM_PROVIDER_AUTH_FAILED';
    }
    if (message.includes('429') || message.includes('rate limit') || message.includes('too many requests')) {
      return 'LLM_PROVIDER_RATE_LIMIT';
    }
    if (message.includes('timeout') || message.includes('timed out')) {
      if (message.includes('knowledge') || message.includes('context') || message.includes('query')) {
        return 'KNOWLEDGE_QUERY_TIMEOUT';
      }
      return 'LLM_PROVIDER_TIMEOUT';
    }
    if (message.includes('503') || message.includes('service unavailable') || message.includes('provider')) {
      return 'LLM_PROVIDER_UNAVAILABLE';
    }
    if (message.includes('invalid response') || message.includes('parse') || message.includes('json')) {
      return 'LLM_PROVIDER_INVALID_RESPONSE';
    }

    // Knowledge query errors
    if (message.includes('knowledge') || message.includes('context query')) {
      return 'KNOWLEDGE_QUERY_FAILED';
    }
    if (message.includes('no context') || message.includes('not found') && message.includes('context')) {
      return 'KNOWLEDGE_CONTEXT_NOT_FOUND';
    }

    // IndexedDB errors
    if (name === 'QuotaExceededError' || message.includes('quota exceeded') || message.includes('storage full')) {
      return 'INDEXEDDB_QUOTA_EXCEEDED';
    }
    if (message.includes('indexeddb') || message.includes('idb')) {
      if (message.includes('access') || message.includes('denied') || message.includes('blocked')) {
        return 'INDEXEDDB_ACCESS_DENIED';
      }
      if (message.includes('corrupt') || message.includes('invalid')) {
        return 'INDEXEDDB_CORRUPTED';
      }
      return 'INDEXEDDB_UNAVAILABLE';
    }

    // Session errors
    if (message.includes('session')) {
      if (message.includes('recovery') || message.includes('restore')) {
        return 'SESSION_RECOVERY_FAILED';
      }
      if (message.includes('not found')) {
        return 'SESSION_NOT_FOUND';
      }
      if (message.includes('save') || message.includes('store')) {
        return 'SESSION_STORAGE_FAILED';
      }
    }

    // Network errors
    if (name === 'TypeError' && message.includes('fetch')) {
      return 'NETWORK_OFFLINE';
    }
    if (message.includes('network') || message.includes('failed to fetch')) {
      return 'API_REQUEST_FAILED';
    }
  }

  return 'UNKNOWN_SERVICE_ERROR';
}

/**
 * Parse and structure an error into AnnetteError format
 */
export function parseAnnetteError(error: Error | unknown): AnnetteError {
  const code = detectAnnetteErrorCode(error);
  return createAnnetteError(code, error);
}

/**
 * Log Annette error to console with structured formatting
 */
export function logAnnetteError(annetteError: AnnetteError): void {
  const prefix = `[Annette ${annetteError.severity.toUpperCase()}]`;
  const style = annetteError.severity === 'critical'
    ? 'color: #ef4444; font-weight: bold;'
    : annetteError.severity === 'error'
      ? 'color: #f97316; font-weight: bold;'
      : 'color: #eab308;';

  console.groupCollapsed(`%c${prefix} ${annetteError.code}`, style);
  console.log('Message:', annetteError.message);
  console.log('Recovery:', annetteError.recovery);
  console.log('Auto-recoverable:', annetteError.autoRecoverable);
  console.log('Recovery Actions:', annetteError.recoveryActions.map(a => a.label).join(', '));
  if (annetteError.originalError) {
    console.log('Original Error:', annetteError.originalError);
  }
  console.groupEnd();
}

/**
 * Get the severity color classes for styling
 */
export function getSeverityColors(severity: AnnetteError['severity']): { bg: string; border: string; text: string } {
  switch (severity) {
    case 'critical':
      return {
        bg: 'bg-red-950/40',
        border: 'border-red-500/50',
        text: 'text-red-400',
      };
    case 'error':
      return {
        bg: 'bg-orange-950/40',
        border: 'border-orange-500/50',
        text: 'text-orange-400',
      };
    case 'warning':
      return {
        bg: 'bg-yellow-950/40',
        border: 'border-yellow-500/50',
        text: 'text-yellow-400',
      };
  }
}
