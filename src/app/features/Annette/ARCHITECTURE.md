# Annette AI Assistant - Complete Architecture Documentation

**Version:** 2.0
**Last Updated:** 2025-11-24

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Layers](#architecture-layers)
3. [Client-Side Architecture](#client-side-architecture)
4. [Server-Side API Architecture](#server-side-api-architecture)
5. [LangGraph Orchestration Engine](#langgraph-orchestration-engine)
6. [Tools System](#tools-system)
7. [Data Flow Diagrams](#data-flow-diagrams)
8. [Integration Points](#integration-points)
9. [Error Handling & Recovery](#error-handling--recovery)
10. [Performance Considerations](#performance-considerations)

---

## System Overview

**Annette** is a voice-enabled AI assistant designed for software development workflows. It provides intelligent project analysis, context-aware recommendations, and natural language interaction with the Vibeman platform.

### Key Capabilities

- **Voice Interface**: Text-to-speech (TTS) and speech recognition
- **Conversation Memory**: SQLite-based persistent conversation history
- **Multi-Tool Execution**: Orchestrates 30+ tools for project operations
- **LLM-Powered Analysis**: Intelligent intent detection and response generation
- **Real-Time Feedback**: Live status updates, insights, and recommendations

### Technology Stack

- **Frontend**: React 19, Framer Motion, Custom Hooks
- **Backend**: Next.js 16 API Routes
- **AI/ML**: LangGraph pattern, Multi-provider LLM support (OpenAI, Anthropic, Gemini, Ollama)
- **Database**: SQLite with WAL mode
- **Voice**: ElevenLabs TTS API

---

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                             │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ AnnettePanel│  │ Custom Hooks │  │  Components  │       │
│  │   (Main UI) │  │ Audio/Session│  │ Visualizers  │       │
│  └─────────────┘  └──────────────┘  └──────────────┘       │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/JSON
┌────────────────────────▼────────────────────────────────────┐
│                  API LAYER (Next.js Routes)                  │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────┐         │
│  │ /chat      │  │ /next-step  │  │ /scan-brief  │         │
│  │ (Main API) │  │ (Recommend) │  │ (Briefing)   │         │
│  └────────────┘  └─────────────┘  └──────────────┘         │
└────────────────────────┬────────────────────────────────────┘
                         │ Internal API Call
┌────────────────────────▼────────────────────────────────────┐
│              LANGGRAPH ORCHESTRATION LAYER                   │
│  ┌──────────┐  ┌──────────┐  ┌─────────────┐               │
│  │ Analysis │  │   Tool   │  │  Response   │               │
│  │   Step   │─▶│Execution │─▶│ Generation  │               │
│  └──────────┘  └──────────┘  └─────────────┘               │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
┌───────▼──────┐  ┌──────▼──────┐  ┌────▼────────┐
│  TOOLS LAYER │  │  LLM LAYER  │  │  DATA LAYER │
│  30+ Tools   │  │ Multi-Prov. │  │  SQLite DB  │
│  Execute Ops │  │ AI Clients  │  │ Repositories│
└──────────────┘  └─────────────┘  └─────────────┘
```

---

## Client-Side Architecture

### 1. Main Component: `AnnettePanel.tsx`

**Location:** `src/app/features/Annette/components/AnnettePanel.tsx`

**Responsibilities:**
- Central UI container and state orchestrator
- Voice visualizer integration
- Transcript and session history management
- Real-time status display

**Key State Management:**

```typescript
// Theme & UI State
const [theme, setTheme] = useState<AnnetteTheme>('midnight');
const [isMinimized, setIsMinimized] = useState(false);

// Processing State
const [isListening, setIsListening] = useState(false);
const [isProcessing, setIsProcessing] = useState(false);

// Knowledge & Insights
const [knowledgeSources, setKnowledgeSources] = useState<KnowledgeSource[]>([]);
const [insights, setInsights] = useState<string[]>([]);
const [nextSteps, setNextSteps] = useState<string[]>([]);

// Session Management
const [conversationId, setConversationId] = useState<string | null>(null);
```

**Core Functions:**

#### `sendToAnnette(userMessage, provider)`
Sends user message to Annette chat API and handles response.

```typescript
async function sendToAnnette(userMessage: string, provider: SupportedProvider) {
  // 1. Validate active project
  if (!activeProject) {
    setMessage('No active project selected');
    return;
  }

  // 2. Initialize session if needed
  if (!currentSession) {
    initializeSession();
  }

  // 3. Add user message to transcript
  addTranscriptEntry('user', userMessage);

  // 4. Call API
  const response = await fetch('/api/annette/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId: activeProject.id,
      projectPath: activeProject.path,
      message: userMessage,
      conversationId,
      provider,
    }),
  });

  // 5. Process response
  const data = await response.json();

  // 6. Update UI state
  if (data.sources) setKnowledgeSources(data.sources);
  if (data.insights) setInsights(data.insights);
  if (data.nextSteps) setNextSteps(data.nextSteps);

  // 7. Store in session
  await addInteractionToCurrentSession(
    userMessage,
    data.response,
    data.sources,
    data.insights,
    data.nextSteps,
    data.toolsUsed,
    { totalMs, llmMs, ttsMs }
  );

  // 8. Speak response via TTS
  await speakMessage(data.response);
}
```

---

### 2. Custom Hooks

#### `useAnnetteAudio` Hook

**Location:** `src/app/features/Annette/hooks/useAnnetteAudio.ts`

**Purpose:** Manages audio playback, TTS, and voice visualization

**Key Features:**
- Web Audio API integration
- Volume analysis for visualizer
- TTS via ElevenLabs or fallback
- Audio state management

**State Exposed:**
```typescript
{
  isSpeaking: boolean,
  isError: boolean,
  volume: number,
  audioContext: AudioContext | null,
  analyser: AnalyserNode | null,
  isVoiceEnabled: boolean,
  message: string,
  // Methods
  setIsVoiceEnabled: (enabled: boolean) => void,
  playAudioInternal: (text: string) => Promise<void>,
  speakMessage: (text: string) => Promise<void>,
}
```

#### `useAnnetteSession` Hook

**Location:** `src/app/features/Annette/hooks/useAnnetteSession.ts`

**Purpose:** Manages conversation sessions and transcript

**Key Features:**
- Session creation and persistence
- Transcript entry management
- Interaction history tracking
- Local storage persistence

**State Exposed:**
```typescript
{
  currentSession: VoiceSession | null,
  transcriptEntries: TranscriptEntry[],
  showTranscript: boolean,
  showSessionHistory: boolean,
  conversationId: string | null,
  // Methods
  addTranscriptEntry: (role, content) => void,
  clearTranscript: () => void,
  initializeSession: () => void,
  addInteractionToCurrentSession: (...) => Promise<void>,
}
```

---

### 3. Test Interface: `AnnetteTestButtons.tsx`

**Location:** `src/app/features/Annette/sub_VoiceInterface/AnnetteTestButtons.tsx`

**Purpose:** Pre-configured test scenarios for quick testing

**Test Configurations:**

```typescript
{
  status: {
    label: 'Status',
    message: 'What is the current status of this project?',
    command: 'project_status',
    shortcut: '1',
    useDirectApi: false,
  },
  nextStep: {
    label: 'Next Step',
    message: '', // Direct API call
    command: 'next_step_recommendation',
    shortcut: '2',
    useDirectApi: true, // Calls /api/annette/next-step directly
  },
  analyze: {
    label: 'Analyze',
    message: 'Please analyze the current project insights and goals.',
    command: 'project_analysis',
    shortcut: '3',
    useDirectApi: false,
  },
}
```

**Flow:**
1. User clicks button (or presses keyboard shortcut 1-3)
2. Provider selector modal appears
3. User selects LLM provider
4. Command executes (either via chat API or direct endpoint)
5. Response plays via TTS
6. Analytics tracked

---

## Server-Side API Architecture

### API Endpoints Overview

| Endpoint | Method | Purpose | Key Features |
|----------|--------|---------|--------------|
| `/api/annette/chat` | POST | Main conversation API | LangGraph integration, memory, tool execution |
| `/api/annette/next-step` | POST | Scan recommendation | Statistics analysis, LLM-based suggestion |
| `/api/annette/analytics` | GET/POST | Usage tracking | Command logging, performance metrics |
| `/api/annette/scan-briefing` | GET | Scan status summary | Recent scans, formatted briefing |

---

### 1. Chat API: `/api/annette/chat`

**Location:** `src/app/api/annette/chat/route.ts`

**Purpose:** Primary conversation interface with tool execution and memory

**Request Schema:**

```typescript
interface AnnetteRequest {
  projectId: string;        // Required: Active project ID
  projectPath: string;      // Required: Project file path
  message: string;          // Required: User's message
  conversationId?: string;  // Optional: Existing conversation ID
  provider?: 'ollama' | 'openai' | 'anthropic' | 'gemini'; // Default: 'gemini'
  model?: string;           // Optional: Specific model
}
```

**Response Schema:**

```typescript
interface AnnetteResponse {
  success: boolean;
  response: string;              // Voice-optimized response text
  conversationId: string;        // Conversation ID for continuity
  sources?: SourceItem[];        // Knowledge sources used
  toolsUsed?: ToolItem[];       // Tools executed
  insights?: string[];           // Extracted insights
  nextSteps?: string[];          // Recommended next actions
  recommendedScans?: string[];   // Scan IDs to recommend (e.g., ['contexts', 'vision'])
  error?: string;
}
```

**Processing Flow:**

```typescript
async function POST(request: NextRequest) {
  // 1. Parse and validate request
  const { projectId, projectPath, message, conversationId, provider } = await request.json();

  // 2. Get or create conversation
  let currentConversationId = conversationId;
  if (!currentConversationId) {
    const newConversation = conversationDb.createConversation({
      projectId: projectId,
      title: `Voice conversation - ${new Date().toLocaleString()}`
    });
    currentConversationId = newConversation.id;
  }

  // 3. Store user message in database
  conversationDb.addMessage({
    conversationId: currentConversationId,
    role: 'user',
    content: message
  });

  // 4. Call LangGraph API for orchestrated response
  const langGraphResponse = await fetch('/api/lang', {
    method: 'POST',
    body: JSON.stringify({
      message,
      projectId,
      projectContext: { path: projectPath },
      provider,
      model: model || getDefaultModel(provider)
    })
  });

  // 5. Extract and analyze response
  const langGraphData = await langGraphResponse.json();
  const sources = extractSources(langGraphData.toolsUsed);
  const { insights, nextSteps, recommendedScans } = analyzeResponse(
    langGraphData.response,
    langGraphData.toolsUsed
  );

  // 6. Format response for voice (remove markdown, shorten)
  const voiceResponse = formatForVoice(langGraphData.response);

  // 7. Store assistant message with metadata
  conversationDb.addMessage({
    conversationId: currentConversationId,
    role: 'assistant',
    content: voiceResponse,
    metadata: { toolsUsed, sources, insights, nextSteps, recommendedScans }
  });

  // 8. Return structured response
  return NextResponse.json({ success: true, response: voiceResponse, ... });
}
```

**Key Helper Functions:**

#### `extractSources(toolsUsed)`
Parses tool results to identify knowledge sources (contexts, goals, ideas, etc.)

```typescript
function extractSources(toolsUsed: ToolCall[]): SourceItem[] {
  const sources: SourceItem[] = [];

  for (const tool of toolsUsed) {
    const toolName = tool.tool || tool.name;
    const result = tool.result;

    // Extract contexts
    if (toolName === 'get_project_contexts' && result.contexts) {
      result.contexts.forEach(ctx => {
        sources.push({
          type: 'context',
          id: ctx.id,
          name: ctx.name,
          description: ctx.description
        });
      });
    }

    // Extract goals, ideas, backlog items...
  }

  return sources;
}
```

#### `analyzeResponse(response, toolsUsed)`
Generates insights, next steps, and scan recommendations

```typescript
function analyzeResponse(response: string, toolsUsed: ToolCall[]) {
  const insights: string[] = [];
  const nextSteps: string[] = [];

  // Analyze tool results
  for (const tool of toolsUsed) {
    if (tool.name === 'get_project_contexts') {
      const contextCount = tool.result.contexts.length;
      if (contextCount === 0) {
        insights.push('No contexts found');
        nextSteps.push('Run context scan to document code modules');
      }
    }
    // ... analyze other tools
  }

  // Detect recommended scans based on keywords
  const recommendedScans = detectRecommendedScans(response, toolsUsed);

  return { insights, nextSteps, recommendedScans };
}
```

#### `formatForVoice(response)`
Optimizes text for TTS by removing markdown, limiting length, and improving flow

```typescript
function formatForVoice(response: string): string {
  let voiceResponse = response
    .replace(/#{1,6}\s/g, '')           // Remove headers
    .replace(/\*\*/g, '')                // Remove bold
    .replace(/`/g, '')                   // Remove code markers
    .replace(/^[\s]*[-•*]\s+/gm, '')     // Remove bullet points
    .replace(/\n\n+/g, '. ')             // Replace paragraphs with periods
    .replace(/\n/g, ' ');                // Single newlines to spaces

  // Limit to ~75 words (~30 seconds of speech)
  const words = voiceResponse.split(/\s+/);
  if (words.length > 75) {
    voiceResponse = words.slice(0, 75).join(' ') + '. Would you like more details?';
  }

  return voiceResponse.trim();
}
```

---

### 2. Next Step API: `/api/annette/next-step`

**Location:** `src/app/api/annette/next-step/route.ts`

**Purpose:** Analyzes project state and recommends the next scan to execute

**Request Schema:**

```typescript
interface NextStepRequest {
  projectId: string;
  provider?: SupportedProvider;  // Default: 'gemini'
  model?: string;
}
```

**Response Schema:**

```typescript
interface NextStepResponse {
  success: boolean;
  response: string;         // Natural language recommendation
  scanType: string | null;  // Recommended scan ID ('contexts', 'vision', etc.)
  reason: string;           // Why this scan is recommended
  statistics: {
    ideasTotal: number;
    ideasAccepted: number;
    ideasPending: number;
    contextsCount: number;
    recentScansCount: number;
  };
  error?: string;
}
```

**Processing Flow:**

```typescript
async function POST(request: NextRequest) {
  // 1. Fetch project statistics
  const allIdeas = ideaDb.getIdeasByProject(projectId);
  const ideasAccepted = allIdeas.filter(i => i.status === 'accepted').length;
  const ideasPending = allIdeas.filter(i => i.status === 'pending').length;

  // 2. Fetch context count
  const allContexts = contextDb.getContextsByProject(projectId);
  const contextsCount = allContexts.length;

  // 3. Fetch recent scan history
  const scanEventTitles = SCAN_CAPABILITIES.map(scan => scan.eventTitle);
  const latestEvents = eventRepository.getLatestEventsByTitles(projectId, scanEventTitles);
  const recentScans = Object.entries(latestEvents)
    .filter(([_, event]) => event !== null)
    .map(([title, event]) => ({
      title: event.title,
      timestamp: event.created_at
    }))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // 4. Create prompt with project context
  const promptData: NextStepPromptData = {
    ideasAccepted,
    ideasPending,
    ideasTotal,
    contextsCount,
    recentScans,
    scanCapabilities: SCAN_CAPABILITIES
  };
  const prompt = createNextStepPrompt(promptData);

  // 5. Call LLM to analyze and recommend
  const llmClient = getLLMClient(provider);
  const llmResult = await llmClient.generate({
    prompt,
    model: model || getDefaultModel(provider),
    taskType: 'next-step-recommendation'
  });

  // 6. Parse LLM response for scan type
  const parsed = parseNextStepResponse(llmResult.response);

  return NextResponse.json({
    success: true,
    response: parsed.fullResponse,
    scanType: parsed.scanType,
    reason: parsed.reason,
    statistics: { ... }
  });
}
```

**Scan Capabilities Configuration:**

```typescript
const SCAN_CAPABILITIES = [
  {
    scanType: 'contexts',
    eventTitle: 'Contexts Scan Completed',
    description: 'Analyzes code structure and creates context documentation',
    when: 'Run when contexts are missing or outdated'
  },
  {
    scanType: 'vision',
    eventTitle: 'Vision Scan Completed',
    description: 'Captures screenshots and UI flow documentation',
    when: 'Run when visual documentation is needed'
  },
  {
    scanType: 'structure',
    eventTitle: 'Structure Scan Completed',
    description: 'Analyzes project architecture and dependencies',
    when: 'Run for architectural understanding'
  },
  {
    scanType: 'build',
    eventTitle: 'Build Scan Completed',
    description: 'Analyzes build configuration and dependencies',
    when: 'Run when build issues exist'
  }
];
```

---

### 3. Analytics API: `/api/annette/analytics`

**Location:** `src/app/api/annette/analytics/route.ts`

**Purpose:** Tracks command execution and provides usage analytics

**POST Endpoint: Log Command Execution**

```typescript
// Request
{
  projectId: string;
  commandName: string;          // e.g., 'project_status'
  commandType: string;          // e.g., 'button_command'
  executionTimeMs: number;
  success: boolean;
  errorMessage?: string;
  timing?: {
    sttMs?: number;             // Speech-to-text time
    llmMs?: number;             // LLM processing time
    ttsMs?: number;             // Text-to-speech time
    totalMs?: number;           // Total end-to-end time
  };
  metadata?: {
    provider?: string;
    model?: string;
    toolsUsed?: string[];
  };
}

// Response
{
  success: boolean;
  id: string;  // Analytics record ID
}
```

**GET Endpoint: Query Analytics Summary**

```typescript
// Query Parameters
{
  projectId: string;           // Required
  commandName?: string;        // Filter by command
  commandType?: string;        // Filter by type
  success?: boolean;           // Filter by success/failure
  startDate?: string;          // Filter by date range
  endDate?: string;
}

// Response
interface AnalyticsSummary {
  totalCommands: number;
  successRate: number;         // Percentage
  averageExecutionMs: number;
  mostFrequentCommands: Array<{
    commandName: string;
    count: number;
    averageMs: number;
  }>;
  recentFailures: Array<{
    commandName: string;
    errorMessage: string;
    timestamp: string;
  }>;
  performanceMetrics: {
    avgSttMs: number;
    avgLlmMs: number;
    avgTtsMs: number;
    avgTotalMs: number;
  };
}
```

---

### 4. Scan Briefing API: `/api/annette/scan-briefing`

**Location:** `src/app/api/annette/scan-briefing/route.ts`

**Purpose:** Generates formatted briefings about recent scan activity

**Request (GET):**

```typescript
{
  projectId: string;           // Required
  variant?: 'quick' | 'full';  // Default: 'full'
  timeframeHours?: number;     // Default: 24
}
```

**Response:**

```typescript
{
  success: boolean;
  text: string;         // Human-readable briefing text
  data?: {              // Structured data (full variant only)
    recentScans: Array<{
      type: string;
      timestamp: string;
      status: string;
    }>;
    statistics: {
      totalScans: number;
      successfulScans: number;
      failedScans: number;
    };
  };
  error?: string;
}
```

**Example Output (Quick Variant):**

```
"2 scans completed in the last 24 hours: Context scan at 2:30 PM, Build scan at 4:15 PM.
All scans successful. 12 new contexts documented, 3 build issues detected."
```

---

## LangGraph Orchestration Engine

### Overview

The LangGraph pattern provides intelligent tool selection and response generation through a multi-step process.

**API Endpoint:** `/api/lang`

**Location:** `src/app/api/lang/route.ts`

---

### Request/Response Schemas

**Request:**

```typescript
interface LangGraphRequest {
  message: string;              // User's message
  projectId: string;            // Active project ID
  projectContext?: {            // Optional project metadata
    path: string;
    name?: string;
    type?: string;
  };
  provider: 'ollama' | 'openai' | 'anthropic' | 'gemini';
  model: string;                // Model name
  userConfirmation?: boolean;   // For destructive operations
}
```

**Response:**

```typescript
interface LangGraphResponse {
  success: boolean;
  response: string;                      // Final generated response
  toolsUsed: ToolCall[];                 // Tools that were executed
  analysis?: string;                     // LLM's reasoning
  userIntent?: string;                   // Detected intent
  confidence: number;                    // 0-100
  needsConfirmation: boolean;            // Requires user approval
  confirmationType?: 'yes_no' | 'select';
  confirmationQuestion?: string;
  alternatives?: string[];               // Alternative actions
  isDestructive?: boolean;               // Modifies/deletes data
  steps?: string[];                      // Processing steps taken
  error?: string;
}
```

---

### Processing Pipeline

#### Step 1: Analysis

**Goal:** Understand user intent and determine which tools to use

```typescript
state.step = "analyze";

const analysisPrompt = createAnalysisPrompt(message, projectId, AVAILABLE_TOOLS);
const analysisResult = await generateLLMResponse(provider, model, analysisPrompt, "analysis");

const analysis: AnalysisResult = parseJsonResponse(analysisResult.response);
```

**Analysis Prompt Structure:**

```typescript
function createAnalysisPrompt(message: string, projectId: string, tools: ToolDefinition[]) {
  return `
You are an AI assistant analyzing user requests for a software development platform.

User Message: "${message}"
Project ID: ${projectId}

Available Tools:
${tools.map(t => `- ${t.name}: ${t.description}`).join('\n')}

Analyze the user's intent and respond in JSON format:
{
  "userIntent": "Clear description of what the user wants",
  "reasoning": "Your analysis of the request",
  "confidence": 85,  // 0-100
  "needsTools": true,
  "toolsToUse": [
    {
      "name": "get_project_contexts",
      "parameters": { "projectId": "${projectId}" }
    }
  ],
  "needsConfirmation": false,
  "isDestructive": false
}
`;
}
```

**Analysis Output Example:**

```json
{
  "userIntent": "User wants to know the current status of project contexts",
  "reasoning": "The query asks about project organization and documentation, which requires fetching context data",
  "confidence": 95,
  "needsTools": true,
  "toolsToUse": [
    {
      "name": "get_project_contexts",
      "parameters": { "projectId": "proj-123" }
    },
    {
      "name": "get_project_goals",
      "parameters": { "projectId": "proj-123", "status": "open" }
    }
  ],
  "needsConfirmation": false,
  "isDestructive": false
}
```

---

#### Step 2: Confirmation (if needed)

If `needsConfirmation` is true and user hasn't confirmed yet:

```typescript
if (analysis.needsConfirmation && !userConfirmation) {
  return NextResponse.json({
    success: true,
    needsConfirmation: true,
    confirmationType: 'yes_no',
    confirmationQuestion: "This will modify project data. Are you sure?",
    toolsToUse: analysis.toolsToUse,
    confidence: analysis.confidence
  });
}
```

---

#### Step 3: Tool Execution

**Goal:** Execute all selected tools in parallel

```typescript
if (analysis.needsTools && analysis.toolsToUse.length > 0) {
  const toolCalls = await executeTools(analysis.toolsToUse);
  state.toolsUsed = toolCalls;
}
```

**Tool Execution Function:**

```typescript
async function executeTools(
  toolsToUse: Array<{ name: string; parameters: Record<string, unknown> }>
): Promise<ToolCall[]> {
  const toolPromises = toolsToUse.map(tool =>
    executeTool(tool.name, tool.parameters)
  );

  return Promise.all(toolPromises);  // Parallel execution
}

async function executeTool(
  toolName: string,
  parameters: Record<string, unknown>
): Promise<ToolCall> {
  // Check if tool has direct execute method
  const toolDef = AVAILABLE_TOOLS.find(t => t.name === toolName);
  if (toolDef?.execute) {
    const result = await toolDef.execute(parameters);
    return {
      name: toolName,
      description: `Successfully executed ${toolName}`,
      parameters,
      result
    };
  }

  // Otherwise, call API endpoint
  const { endpoint, method, body } = buildEndpointConfig(toolName, parameters);
  const response = await fetch(endpoint, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await response.json();

  return {
    name: toolName,
    description: `Successfully executed ${toolName}`,
    parameters,
    result: data
  };
}
```

---

#### Step 4: Response Generation

**Goal:** Generate natural language response using tool results

```typescript
state.step = "response_generation";

const projectMeta = formatProjectMetadata(projectContext);
const toolResultsFormatted = formatToolResults(state.toolsUsed);

const responsePrompt = createResponsePrompt(
  message,
  projectMeta,
  toolResultsFormatted,
  analysis.userIntent
);

const responseGeneration = await generateLLMResponse(
  provider,
  model,
  responsePrompt,
  "response_generation"
);

state.response = responseGeneration.response;
```

**Response Prompt Structure:**

```typescript
function createResponsePrompt(
  userMessage: string,
  projectMetadata: string,
  toolResults: string,
  userIntent: string
) {
  return `
You are Annette, a helpful AI assistant for software development.

User Intent: ${userIntent}
User Message: "${userMessage}"

Project Context:
${projectMetadata}

Tool Results:
${toolResults}

Generate a helpful, conversational response based on the tool results.
Be concise, friendly, and focus on actionable information.
`;
}
```

---

## Tools System

### Tool Categories

1. **Read-Only Tools** - Safe information retrieval
2. **Project Management** - CRUD operations on projects
3. **Context Documentation** - Context creation and management
4. **Task Backlog** - Backlog item management
5. **Background Processing** - Queue and task monitoring
6. **File Operations** - File reading and searching
7. **AI-Assisted** - Code quality and documentation generation
8. **Monitoring** - System monitoring and evaluation
9. **Event Listener** - Recent events and history
10. **Goal Evaluator** - Goal tracking and evaluation
11. **Implementation Log** - Implementation history

---

### Tool Definition Structure

```typescript
interface ToolDefinition {
  name: string;                  // Unique tool identifier
  description: string;           // Natural language description for LLM
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
    }>;
    required: string[];          // Required parameter names
  };
  execute?: (params: Record<string, unknown>) => Promise<unknown>;  // Optional direct execution
}
```

---

### Example Tools

#### Read-Only: `get_project_contexts`

```typescript
{
  name: 'get_project_contexts',
  description: 'Retrieves all contexts and context groups for a project from the knowledge base. Use when user asks about documentation structure, code organization, available contexts, or wants to see project documentation bundles.',
  parameters: {
    type: 'object',
    properties: {
      projectId: {
        type: 'string',
        description: 'The ID of the project to fetch contexts for'
      }
    },
    required: ['projectId']
  }
}
```

**API Mapping:**
- Endpoint: `GET /api/contexts?projectId={projectId}`
- Returns: `{ contexts: Context[], groups: ContextGroup[] }`

---

#### Event Listener: `get_recent_events`

```typescript
{
  name: 'get_recent_events',
  description: 'Get recent events for the project to understand what has happened recently.',
  parameters: {
    type: 'object',
    properties: {
      limit: {
        type: 'number',
        description: 'Number of events to retrieve (default: 10)'
      },
      type: {
        type: 'string',
        description: 'Filter by event type (optional)'
      }
    },
    required: []
  },
  execute: async ({ projectId, limit = 10, type }) => {
    if (type) {
      const events = eventRepository.getEventsByType(projectId, type, limit);
      return { events };
    }
    const events = eventRepository.getEventsByProject(projectId, limit);
    return { events };
  }
}
```

**Direct Execution:** This tool executes directly without HTTP call

---

#### Goal Evaluator: `get_project_goals`

```typescript
{
  name: 'get_project_goals',
  description: 'Get the goals defined for the project to understand objectives.',
  parameters: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        description: 'Filter by status (open, in_progress, done, etc.)'
      }
    },
    required: []
  },
  execute: async ({ projectId, status }) => {
    const goals = goalRepository.getGoalsByProject(projectId);
    if (status) {
      return { goals: goals.filter(g => g.status === status) };
    }
    return { goals };
  }
}
```

---

### Tool Execution Modes

#### Mode 1: API Endpoint Call

For tools without `execute` method:

```typescript
// Tool: get_project_ideas
// Maps to: GET /api/ideas?projectId={projectId}&status={status}

const { endpoint, method, body } = buildEndpointConfig('get_project_ideas', {
  projectId: 'proj-123',
  status: 'pending'
});

// Result:
// endpoint = 'http://localhost:3000/api/ideas?projectId=proj-123&status=pending'
// method = 'GET'
```

#### Mode 2: Direct Execution

For tools with `execute` method:

```typescript
// Tool: get_recent_events
// Executes directly via goalRepository

const toolDef = AVAILABLE_TOOLS.find(t => t.name === 'get_recent_events');
const result = await toolDef.execute({ projectId: 'proj-123', limit: 5 });

// Result: { events: [...] }
```

---

### Adding New Tools

**Step 1:** Define the tool in appropriate category file

```typescript
// src/app/features/Annette/tools/toolsReadOnly.ts

export const READ_ONLY_TOOLS: ToolDefinition[] = [
  {
    name: 'get_project_tech_debt',
    description: 'Retrieves technical debt items for a project. Use when user asks about code quality issues, refactoring needs, or technical debt.',
    parameters: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'The ID of the project'
        },
        severity: {
          type: 'string',
          description: 'Filter by severity: low, medium, high, critical (optional)'
        }
      },
      required: ['projectId']
    }
  },
  // ... other tools
];
```

**Step 2:** Export from index

```typescript
// src/app/features/Annette/tools/index.ts

export * from './toolsReadOnly';
// ... other exports
```

**Step 3:** Create API endpoint (if not using direct execute)

```typescript
// src/app/api/tech-debt/route.ts

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');
  const severity = searchParams.get('severity');

  const items = techDebtRepository.getByProject(projectId);
  const filtered = severity
    ? items.filter(i => i.severity === severity)
    : items;

  return NextResponse.json({ items: filtered });
}
```

**Step 4:** Add endpoint mapping in `langHelpers.ts`

```typescript
// src/lib/langgraph/langHelpers.ts

const readOnlyEndpoints: Record<string, () => EndpointConfig> = {
  // ... existing mappings
  'get_project_tech_debt': () => ({
    endpoint: buildGetEndpoint(baseUrl, '/api/tech-debt', {
      projectId: parameters.projectId,
      severity: parameters.severity
    }),
    method: 'GET'
  }),
};
```

---

## Data Flow Diagrams

### Complete User Interaction Flow

```
┌──────────┐
│   USER   │
└────┬─────┘
     │ 1. Clicks "Status" button or says "What's the project status?"
     ▼
┌──────────────────┐
│ AnnettePanel.tsx │
│  sendToAnnette() │
└────┬─────────────┘
     │ 2. POST /api/annette/chat
     │    { message, projectId, provider }
     ▼
┌──────────────────────────┐
│ /api/annette/chat/route  │
│  - Create/get conversation│
│  - Store user message     │
└────┬─────────────────────┘
     │ 3. POST /api/lang
     │    { message, projectId, provider, model }
     ▼
┌───────────────────────────┐
│  /api/lang/route          │
│  LangGraph Orchestration  │
└────┬──────────────────────┘
     │ 4. Analysis Step
     │    ┌────────────────────────────────┐
     │    │ LLM analyzes message           │
     │    │ Determines tools needed        │
     │    │ Returns: { toolsToUse, ... }   │
     │    └────────────────────────────────┘
     │
     │ 5. Tool Execution (Parallel)
     │    ┌─────────────────────┬─────────────────────┐
     │    ▼                     ▼                     ▼
     │ ┌──────────┐      ┌──────────┐         ┌──────────┐
     │ │ Tool 1   │      │ Tool 2   │         │ Tool 3   │
     │ │ get_ctx  │      │ get_goals│         │get_ideas │
     │ └────┬─────┘      └────┬─────┘         └────┬─────┘
     │      │ GET /api/ctx    │ Direct exec    │ GET /api/ideas
     │      ▼                 ▼                     ▼
     │ ┌──────────┐      ┌──────────┐         ┌──────────┐
     │ │contextDb │      │goalRepo  │         │ ideaDb   │
     │ └────┬─────┘      └────┬─────┘         └────┬─────┘
     │      └──────────────────┴────────────────────┘
     │                         │
     │                         ▼
     │              Tool Results Collected
     │
     │ 6. Response Generation
     │    ┌────────────────────────────────┐
     │    │ LLM generates response         │
     │    │ Input: user message + tools    │
     │    │ Output: natural language       │
     │    └────────────────────────────────┘
     │
     ▼
┌──────────────────────────┐
│ /api/lang/route          │
│ Returns: { response,     │
│   toolsUsed, confidence }│
└────┬─────────────────────┘
     │ 7. Extract & analyze
     ▼
┌──────────────────────────┐
│ /api/annette/chat/route  │
│ - extractSources()       │
│ - analyzeResponse()      │
│ - formatForVoice()       │
│ - Store assistant msg    │
└────┬─────────────────────┘
     │ 8. Return response
     │    { response, sources, insights, nextSteps }
     ▼
┌──────────────────┐
│ AnnettePanel.tsx │
│ - Update UI      │
│ - Show insights  │
│ - TTS playback   │
└──────────────────┘
     │
     ▼
┌──────────┐
│   USER   │ Hears response
└──────────┘
```

---

### Tool Execution Detail Flow

```
┌────────────────────┐
│ executeTools([...])│
└─────────┬──────────┘
          │ Parallel execution
    ┌─────┼─────┬─────┐
    ▼     ▼     ▼     ▼
┌────────┐┌────────┐┌────────┐
│ Tool 1 ││ Tool 2 ││ Tool 3 │
└───┬────┘└───┬────┘└───┬────┘
    │         │         │
    │ Has     │ No      │ Has
    │ execute?│ execute?│ execute?
    │         │         │
   YES       NO        YES
    │         │         │
    ▼         ▼         │
┌────────┐┌────────┐   │
│Direct  ││Build   │   │
│Execute ││API Call│   │
└───┬────┘└───┬────┘   │
    │         │         │
    │         ▼         │
    │    ┌────────┐    │
    │    │ fetch()│    │
    │    └───┬────┘    │
    │        │         │
    └────────┼─────────┘
             │
             ▼
    ┌────────────────┐
    │ Collect Results│
    └────────┬───────┘
             │
             ▼
    ┌────────────────┐
    │   toolsUsed[]  │
    └────────────────┘
```

---

## Integration Points

### Database Integration

**Tables Used by Annette:**

```sql
-- Conversation Memory
conversations (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  title TEXT,
  created_at TEXT,
  updated_at TEXT
)

messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role TEXT CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  memory_type TEXT,
  metadata TEXT,
  created_at TEXT
)

-- Analytics
voicebot_analytics (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  command_name TEXT NOT NULL,
  command_type TEXT NOT NULL,
  execution_time_ms INTEGER NOT NULL,
  success INTEGER NOT NULL,
  error_message TEXT,
  stt_ms INTEGER,
  llm_ms INTEGER,
  tts_ms INTEGER,
  total_ms INTEGER,
  provider TEXT,
  model TEXT,
  tools_used TEXT,
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP
)
```

**Repositories Used:**
- `conversationDb` - Conversation and message CRUD
- `eventRepository` - Event tracking (scans, actions)
- `goalRepository` - Goal management
- `ideaRepository` - Idea management
- `contextRepository` - Context documentation
- `backlogRepository` - Backlog items

---

### LLM Provider Integration

**Supported Providers:**

| Provider | Client Class | Default Model | Use Case |
|----------|-------------|---------------|----------|
| Ollama | `OllamaClient` | `ministral-3:14b` | Local/free inference |
| OpenAI | `OpenAIClient` | `gpt-5-mini-2025-08-07` | Fast, cost-effective |
| Anthropic | `AnthropicClient` | `claude-haiku-4-5` | Reasoning, safety |
| Gemini | `GeminiClient` | `gemini-flash-latest` | Default, balanced |

**Client Initialization:**

```typescript
function getLLMClient(provider: LLMProvider) {
  switch (provider) {
    case 'ollama':
      return new OllamaClient();  // Reads OLLAMA_BASE_URL from env
    case 'openai':
      return new OpenAIClient();  // Reads OPENAI_API_KEY
    case 'anthropic':
      return new AnthropicClient();  // Reads ANTHROPIC_API_KEY
    case 'gemini':
      return new GeminiClient();  // Reads GEMINI_API_KEY
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}
```

---

### Voice/TTS Integration

**Provider:** ElevenLabs (with fallback to browser TTS)

**Flow:**

```typescript
// 1. Generate audio via ElevenLabs API
const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/{voiceId}', {
  method: 'POST',
  headers: {
    'xi-api-key': ELEVENLABS_API_KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    text: message,
    model_id: 'eleven_monolingual_v1',
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.75
    }
  })
});

const audioBlob = await response.blob();

// 2. Play audio
const audioUrl = URL.createObjectURL(audioBlob);
const audio = new Audio(audioUrl);
audio.play();

// 3. Setup Web Audio API for visualization
const audioContext = new AudioContext();
const source = audioContext.createMediaElementSource(audio);
const analyser = audioContext.createAnalyser();
source.connect(analyser);
analyser.connect(audioContext.destination);

// 4. Analyze volume for visualizer
const dataArray = new Uint8Array(analyser.frequencyBinCount);
const updateVolume = () => {
  analyser.getByteFrequencyData(dataArray);
  const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
  setVolume(average / 255);  // 0-1 range
  requestAnimationFrame(updateVolume);
};
```

---

## Error Handling & Recovery

### API Error Handling Pattern

```typescript
try {
  // Operation
  const result = await someOperation();

  return NextResponse.json({
    success: true,
    data: result
  });
} catch (error) {
  logger.error('Operation failed:', error);

  return NextResponse.json({
    success: false,
    error: error instanceof Error ? error.message : 'Unknown error',
    details: process.env.NODE_ENV === 'development' ? error.stack : undefined
  }, { status: 500 });
}
```

### Client Error Handling

```typescript
try {
  const response = await fetch('/api/annette/chat', { ... });
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Request failed');
  }

  // Process success
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : 'Communication error';
  setMessage(errorMessage);
  setIsError(true);
  addTranscriptEntry('system', `Error: ${errorMessage}`);
} finally {
  setIsProcessing(false);
}
```

### Tool Execution Error Recovery

```typescript
async function executeTool(toolName: string, parameters: any): Promise<ToolCall> {
  try {
    // Try execution
    const result = await actualExecution();

    return {
      name: toolName,
      description: `Successfully executed ${toolName}`,
      result
    };
  } catch (error) {
    // Graceful failure - return error as result
    return {
      name: toolName,
      description: `Failed to execute ${toolName}`,
      result: {
        error: error.message,
        success: false
      }
    };
  }
}
```

**Note:** Tool failures don't abort the entire request. LLM can still generate response based on partial results.

---

## Performance Considerations

### 1. Tool Execution Parallelization

```typescript
// BAD: Sequential execution (slow)
for (const tool of toolsToUse) {
  const result = await executeTool(tool.name, tool.parameters);
  toolResults.push(result);
}

// GOOD: Parallel execution (fast)
const toolPromises = toolsToUse.map(tool =>
  executeTool(tool.name, tool.parameters)
);
const toolResults = await Promise.all(toolPromises);
```

**Performance Gain:** 3-5x faster for typical 3-tool requests

---

### 2. LLM Response Caching

**Future Enhancement:** Cache common queries

```typescript
const cacheKey = `${provider}:${model}:${hashPrompt(prompt)}`;
const cached = await responseCache.get(cacheKey);

if (cached && !isStale(cached.timestamp)) {
  return cached.response;
}

const response = await llmClient.generate({ prompt });
await responseCache.set(cacheKey, response, ttl: 3600);
```

---

### 3. Conversation Memory Optimization

**Current:** Loads entire conversation history
**Optimization:** Sliding window of recent messages

```typescript
// Load only last N messages for context
const recentMessages = conversationDb.getMessages(conversationId, {
  limit: 10,
  orderBy: 'created_at DESC'
});
```

---

### 4. Voice Response Length

**Current:** Truncates to ~75 words (~30 seconds)
**Reason:** Maintains user attention, reduces TTS latency

```typescript
if (words.length > 75) {
  voiceResponse = words.slice(0, 75).join(' ') + '. Would you like more details?';
}
```

---

## Summary

### Key Architectural Principles

1. **Separation of Concerns**
   - Client handles UI/voice
   - API layer handles orchestration
   - LangGraph handles intelligence
   - Tools handle operations

2. **Extensibility**
   - New tools can be added without changing core logic
   - New LLM providers integrate via standard interface
   - API endpoints follow REST conventions

3. **Resilience**
   - Tool failures don't crash requests
   - Graceful degradation when services unavailable
   - User-friendly error messages

4. **Observability**
   - Analytics track all operations
   - Conversation history persisted
   - Performance metrics collected

---

## Next Steps

After reviewing this documentation, we can:

1. **Define the final tool set** - Which tools should Annette use?
2. **Design the AI thinking pattern** - How should Annette reason about user requests?
3. **Create testing interface** - Build comprehensive test dashboard

---

*End of Architecture Documentation*
