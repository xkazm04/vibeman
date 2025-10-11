import { LogEntry } from './typesAnnette';

/**
 * Creates a new log entry
 */
export function createLogEntry(
  type: LogEntry['type'],
  message: string,
  data?: any
): LogEntry {
  return {
    id: Date.now().toString(),
    timestamp: new Date().toLocaleTimeString(),
    type,
    message,
    data
  };
}

/**
 * Creates an LLM response log with audio loading state
 */
export function createLLMResponseLog(response: string): LogEntry {
  return {
    id: `llm_${Date.now()}`,
    timestamp: new Date().toLocaleTimeString(),
    type: 'llm',
    message: `LLM Response: ${response}`,
    audioLoading: true
  };
}
