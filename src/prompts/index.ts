// Annette Voicebot Prompt System
export { createAnnetteSystemPrompt } from './annette-system-prompt';
export { getToolDefinitions } from './annette-tool-definitions';
export { formatProjectMetadata, getDefaultProjectMetadata } from './annette-project-metadata';
export { createAnnetteAnalysisPrompt } from './annette-analysis-prompt';

// File Scanner Prompts
export { createFileScannerPrompt } from './file-scanner-prompt';

// Build Error Fixer Prompts (if exists)
// export { createBuildErrorFixerPrompt } from './build-error-fixer-prompt';

/**
 * Annette Prompt System Overview
 * 
 * This system provides a structured approach to prompt engineering for the Annette voicebot:
 * 
 * 1. **System Prompt** (annette-system-prompt.ts)
 *    - Main conversational prompt for response generation
 *    - Includes project context, tool definitions, and results
 *    - Defines Annette's personality and response style
 * 
 * 2. **Tool Definitions** (annette-tool-definitions.ts)
 *    - Comprehensive list of available tools and their capabilities
 *    - Usage guidelines and example scenarios
 *    - Tool selection logic and keywords
 * 
 * 3. **Project Metadata** (annette-project-metadata.ts)
 *    - Formats project context information
 *    - Provides structured project data for the LLM
 *    - Handles missing project information gracefully
 * 
 * 4. **Analysis Prompt** (annette-analysis-prompt.ts)
 *    - Specialized prompt for tool selection and user intent analysis
 *    - Keyword matching and decision logic
 *    - Structured JSON response format
 * 
 * Usage Example:
 * ```typescript
 * import { createAnnetteSystemPrompt, getToolDefinitions, formatProjectMetadata } from '@/prompts';
 * 
 * const systemPrompt = createAnnetteSystemPrompt(
 *   userMessage,
 *   formatProjectMetadata(projectContext),
 *   getToolDefinitions(),
 *   toolResults
 * );
 * ```
 */