/**
 * Conversation Evaluation Constants
 * Test questions and evaluation methodology for voicebot testing
 */

/**
 * Test sentences for conversation evaluation
 * These are used in the Conversation Testing Solution
 */
export const EVALUATION_TEST_SENTENCES = [
  "What's the weather like today?",
  "Can you recommend a good restaurant nearby?",
  "Tell me a fun fact about artificial intelligence.",
  "What time is it in Tokyo right now?",
  "How do I make a cup of coffee?"
];

/**
 * Evaluation prompt template
 * This prompt is sent to Ollama to evaluate the conversation quality
 */
export const EVALUATION_PROMPT_TEMPLATE = `You are an AI conversation evaluator. Analyze the following conversation between a user and an AI assistant.

Evaluate the conversation based on these criteria:
1. **Question Coverage**: Were all questions answered appropriately?
2. **Response Quality**: Are the responses relevant, accurate, and helpful?
3. **Response Time**: Was the average response time reasonable for a voice assistant? (Consider: <2s excellent, 2-4s good, >4s needs improvement)
4. **Conversation Flow**: Does the conversation flow naturally?
5. **Consistency**: Are the responses consistent and coherent?

CONVERSATION:
{conversation}

TIMING STATISTICS:
- Total Questions: {totalQuestions}
- Average LLM Response Time: {avgLlmTime}s
- Average TTS Generation Time: {avgTtsTime}s
- Average Total Response Time: {avgTotalTime}s

Provide a concise evaluation (max 200 words) covering:
- Overall quality score (1-10)
- What was done well
- Areas for improvement
- Response time assessment

Format your response as:
**Score: X/10**

**Strengths:**
- [point 1]
- [point 2]

**Areas for Improvement:**
- [point 1]
- [point 2]

**Response Time:**
[brief assessment]

**Summary:**
[1-2 sentences overall assessment]`;

/**
 * Helper function to format conversation for evaluation
 */
export function formatConversationForEvaluation(
  questions: string[],
  responses: string[],
  timings: Array<{ llmMs?: number; ttsMs?: number; totalMs?: number }>
): string {
  let conversation = '';
  
  for (let i = 0; i < questions.length; i++) {
    conversation += `Q${i + 1}: ${questions[i]}\n`;
    conversation += `A${i + 1}: ${responses[i]}\n`;
    if (timings[i]) {
      const timing = timings[i];
      conversation += `   [LLM: ${timing.llmMs ? (timing.llmMs / 1000).toFixed(2) : 'N/A'}s, `;
      conversation += `TTS: ${timing.ttsMs ? (timing.ttsMs / 1000).toFixed(2) : 'N/A'}s, `;
      conversation += `Total: ${timing.totalMs ? (timing.totalMs / 1000).toFixed(2) : 'N/A'}s]\n`;
    }
    conversation += '\n';
  }
  
  return conversation;
}

/**
 * Calculate timing statistics
 */
export function calculateTimingStats(timings: Array<{ llmMs?: number; ttsMs?: number; totalMs?: number }>) {
  const validTimings = timings.filter(t => t.llmMs && t.ttsMs && t.totalMs);
  
  if (validTimings.length === 0) {
    return {
      avgLlmTime: 0,
      avgTtsTime: 0,
      avgTotalTime: 0,
      totalQuestions: timings.length
    };
  }
  
  const avgLlmTime = validTimings.reduce((sum, t) => sum + (t.llmMs || 0), 0) / validTimings.length / 1000;
  const avgTtsTime = validTimings.reduce((sum, t) => sum + (t.ttsMs || 0), 0) / validTimings.length / 1000;
  const avgTotalTime = validTimings.reduce((sum, t) => sum + (t.totalMs || 0), 0) / validTimings.length / 1000;
  
  return {
    avgLlmTime: Number(avgLlmTime.toFixed(2)),
    avgTtsTime: Number(avgTtsTime.toFixed(2)),
    avgTotalTime: Number(avgTotalTime.toFixed(2)),
    totalQuestions: timings.length
  };
}

/**
 * Generate evaluation prompt with conversation data
 */
export function generateEvaluationPrompt(
  questions: string[],
  responses: string[],
  timings: Array<{ llmMs?: number; ttsMs?: number; totalMs?: number }>
): string {
  const conversation = formatConversationForEvaluation(questions, responses, timings);
  const stats = calculateTimingStats(timings);
  
  return EVALUATION_PROMPT_TEMPLATE
    .replace('{conversation}', conversation)
    .replace('{totalQuestions}', stats.totalQuestions.toString())
    .replace('{avgLlmTime}', stats.avgLlmTime.toString())
    .replace('{avgTtsTime}', stats.avgTtsTime.toString())
    .replace('{avgTotalTime}', stats.avgTotalTime.toString());
}
