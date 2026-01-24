import { NextRequest, NextResponse } from 'next/server'
import { generateWithLLM } from '@/lib/llm'
import { logger } from '@/lib/logger'
import { withObservability } from '@/lib/observability/middleware'

interface PromptOption {
  label: string
  prompt: string
}

interface ComposePromptRequest {
  characterName?: string
  characterAppearance?: string
  archetype?: PromptOption
  pose?: PromptOption
  mood?: PromptOption
  storyArtStyle?: string
  maxLength?: number
}

interface ComposePromptResponse {
  success: boolean
  prompt: string
  truncated: boolean
  originalLength?: number
  error?: string
}

const DEFAULT_MAX_LENGTH = 1600

const COMPOSE_SYSTEM_PROMPT = `You are an expert at composing image generation prompts.
Your task is to combine multiple prompt elements into a single, coherent prompt.

Rules:
1. Output MUST be under {maxLength} characters
2. Prioritize visual details over abstract concepts
3. Maintain the art style throughout
4. Be specific and descriptive
5. Output ONLY the prompt text, no explanations

Input elements:
- Art Style: The visual style to apply
- Character: Name and appearance details
- Archetype: Character class/role description
- Pose: Body position and stance
- Expression: Facial expression and mood`

/**
 * Build a simple fallback prompt by concatenating available elements
 */
function buildFallbackPrompt(request: ComposePromptRequest): string {
  const parts: string[] = []

  // Add art style first if available
  if (request.storyArtStyle) {
    parts.push(request.storyArtStyle)
  }

  // Add character info
  if (request.characterName) {
    parts.push(`Character: ${request.characterName}`)
  }
  if (request.characterAppearance) {
    parts.push(request.characterAppearance)
  }

  // Add archetype
  if (request.archetype?.prompt) {
    parts.push(request.archetype.prompt)
  }

  // Add pose
  if (request.pose?.prompt) {
    parts.push(request.pose.prompt)
  }

  // Add mood/expression
  if (request.mood?.prompt) {
    parts.push(request.mood.prompt)
  }

  return parts.join('. ')
}

/**
 * Build the user prompt for the LLM
 */
function buildUserPrompt(request: ComposePromptRequest): string {
  const sections: string[] = []

  if (request.storyArtStyle) {
    sections.push(`Art Style: ${request.storyArtStyle}`)
  }

  if (request.characterName || request.characterAppearance) {
    const charParts: string[] = []
    if (request.characterName) charParts.push(request.characterName)
    if (request.characterAppearance) charParts.push(request.characterAppearance)
    sections.push(`Character: ${charParts.join(' - ')}`)
  }

  if (request.archetype) {
    sections.push(`Archetype (${request.archetype.label}): ${request.archetype.prompt}`)
  }

  if (request.pose) {
    sections.push(`Pose (${request.pose.label}): ${request.pose.prompt}`)
  }

  if (request.mood) {
    sections.push(`Expression/Mood (${request.mood.label}): ${request.mood.prompt}`)
  }

  return `Compose a single image generation prompt from these elements:\n\n${sections.join('\n\n')}`
}

/**
 * POST /api/ai/compose-prompt
 * Use Groq to compose a coherent character image prompt from multiple inputs
 * 
 * Requirements: FR-3.1, FR-3.2
 */
async function handlePost(request: NextRequest): Promise<NextResponse<ComposePromptResponse>> {
  try {
    const body: ComposePromptRequest = await request.json()
    const maxLength = body.maxLength || DEFAULT_MAX_LENGTH

    // Validate that we have at least some input
    const hasInput = body.characterName || 
                     body.characterAppearance || 
                     body.archetype || 
                     body.pose || 
                     body.mood || 
                     body.storyArtStyle

    if (!hasInput) {
      return NextResponse.json(
        {
          success: false,
          prompt: '',
          truncated: false,
          error: 'At least one prompt element is required',
        },
        { status: 400 }
      )
    }

    // Build the system prompt with max length
    const systemPrompt = COMPOSE_SYSTEM_PROMPT.replace('{maxLength}', maxLength.toString())
    const userPrompt = buildUserPrompt(body)

    // Try to compose with Groq
    const llmResponse = await generateWithLLM(userPrompt, {
      provider: 'groq',
      systemPrompt,
      maxTokens: 500, // Prompt should be short
      temperature: 0.7, // Some creativity but not too random
    })

    if (!llmResponse.success || !llmResponse.response) {
      // Log the error for monitoring (NFR-2)
      logger.error('Groq prompt composition failed', {
        error: llmResponse.error || 'No response from LLM',
        inputSummary: {
          hasCharacterName: !!body.characterName,
          hasCharacterAppearance: !!body.characterAppearance,
          hasArchetype: !!body.archetype,
          hasPose: !!body.pose,
          hasMood: !!body.mood,
          hasArtStyle: !!body.storyArtStyle,
        },
        maxLength,
      })

      // Fall back to simple concatenation
      const fallbackPrompt = buildFallbackPrompt(body)
      const truncated = fallbackPrompt.length > maxLength
      const finalPrompt = truncated ? fallbackPrompt.slice(0, maxLength) : fallbackPrompt

      return NextResponse.json({
        success: true,
        prompt: finalPrompt,
        truncated,
        originalLength: truncated ? fallbackPrompt.length : undefined,
      })
    }

    // Clean up the response (remove any extra whitespace/newlines)
    let composedPrompt = llmResponse.response.trim()
    
    // Check if truncation is needed
    const truncated = composedPrompt.length > maxLength
    if (truncated) {
      logger.warn('Composed prompt exceeded max length, truncating', {
        originalLength: composedPrompt.length,
        maxLength,
      })
      composedPrompt = composedPrompt.slice(0, maxLength)
    }

    logger.debug('Prompt composition successful', {
      promptLength: composedPrompt.length,
      truncated,
    })

    return NextResponse.json({
      success: true,
      prompt: composedPrompt,
      truncated,
      originalLength: truncated ? llmResponse.response.length : undefined,
    })

  } catch (error) {
    // Log unexpected errors with details (NFR-2)
    logger.error('Unexpected error in compose-prompt API', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })

    return NextResponse.json(
      {
        success: false,
        prompt: '',
        truncated: false,
        error: error instanceof Error ? error.message : 'Failed to compose prompt',
      },
      { status: 500 }
    )
  }
}

export const POST = withObservability(handlePost, '/api/ai/compose-prompt')
