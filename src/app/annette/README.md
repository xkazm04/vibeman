# Annette - Voicebot Pipeline Prototype

Annette is a prototype voicebot pipeline that demonstrates LangGraph orchestration with Ollama and dynamic tool selection.

## Overview

This prototype implements the first flow of a comprehensive voicebot system:

1. **User Input**: Hardcoded message "How many goals are in this project?" (for testing)
2. **LangGraph Orchestration**: Analyzes the message and determines which tools to use
3. **Tool Selection**: Dynamically selects from available tools based on user intent
4. **Tool Execution**: Executes the selected tools (currently: GET /api/goals)
5. **Response Generation**: Uses Ollama to generate a natural language response
6. **Logging**: Comprehensive logging of the entire pipeline

## Architecture

### Client Side (`/app/annette/`)
- **page.tsx**: Main testing interface with controls and logs
- **components/TestStatus.tsx**: System health checks for dependencies

### Server Side (`/app/api/annette/`)
- **langgraph/route.ts**: LangGraph orchestrator with tool selection logic

## Features

### Current Implementation
- ✅ Hardcoded user message for testing
- ✅ LangGraph-style orchestration
- ✅ Dynamic tool selection based on message analysis
- ✅ Ollama integration with same configuration as existing system
- ✅ Tool execution (Goals API)
- ✅ Comprehensive logging and status tracking
- ✅ System health checks

### Available Tools
1. **get_project_goals**: Fetches project goals via GET /api/goals

### Future Extensions
- 🔄 Speech-to-text integration (ElevenLabs)
- 🔄 Text-to-speech integration (ElevenLabs)
- 🔄 Multi-step reasoning with conditional paths
- 🔄 State management across conversation turns
- 🔄 Human-in-the-loop confirmations
- 🔄 Parallel tool execution
- 🔄 Additional tools for project management

## Configuration

### Prerequisites
1. **Ollama**: Must be running on `localhost:11434` with `gpt-oss:20b` model
2. **Goals API**: Must be accessible at `/api/goals`
3. **Project Data**: Test project with ID `test-project-123`

### Environment Variables
- `NEXT_PUBLIC_BASE_URL`: Base URL for API calls (defaults to localhost:3000)

## Usage

1. Navigate to `/annette` in your browser
2. Check the System Status panel to ensure all dependencies are working
3. Click the "Test Voice Pipeline" button to run the hardcoded test
4. Monitor the Pipeline Logs to see the orchestration in action

## LangGraph Implementation

The orchestrator follows a multi-step process:

1. **Analysis**: Analyzes user message to determine tool requirements
2. **Tool Selection**: Selects appropriate tools based on analysis
3. **Tool Execution**: Executes selected tools and collects results
4. **Response Generation**: Generates natural language response using tool data

## Testing

The prototype includes comprehensive testing features:

- **System Status**: Real-time health checks for all dependencies
- **Pipeline Logs**: Detailed logging of each step in the process
- **Tool Usage Tracking**: Shows which tools were used and their results
- **Error Handling**: Graceful error handling with detailed error messages

## Development Notes

### Code Organization
- Uses existing Ollama client configuration from `src/lib/llm/providers/ollama-client.ts`
- Integrates with existing Goals API at `src/app/api/goals/route.ts`
- Follows Next.js 13+ app router conventions
- Uses TypeScript for type safety

### Key Design Decisions
1. **Hardcoded Test Message**: Allows focused testing of the orchestration logic
2. **LangGraph Pattern**: Implements state-based orchestration for future extensibility
3. **Tool-First Approach**: Prioritizes tool data over LLM training data
4. **Comprehensive Logging**: Enables debugging and monitoring of the pipeline

## Next Steps

1. **Speech Integration**: Connect speech-to-text and text-to-speech APIs
2. **Tool Expansion**: Add more tools for comprehensive project management
3. **State Management**: Implement conversation state persistence
4. **UI Enhancement**: Add voice recording interface
5. **Performance Optimization**: Implement parallel tool execution
6. **Error Recovery**: Add retry logic and fallback strategies

## API Endpoints

### `/api/annette/langgraph` (POST)
LangGraph orchestrator endpoint

**Request:**
```json
{
  "message": "How many goals are in this project?",
  "projectId": "test-project-123"
}
```

**Response:**
```json
{
  "success": true,
  "response": "This project has 5 goals in total.",
  "toolsUsed": [
    {
      "name": "get_project_goals",
      "description": "Fetched project goals",
      "parameters": { "projectId": "test-project-123" },
      "result": { "goals": [...] }
    }
  ],
  "analysis": "User is asking about goal count, need to fetch project goals",
  "steps": [...]
}
```

## Troubleshooting

### Common Issues
1. **Ollama Not Running**: Ensure Ollama is started and accessible on localhost:11434
2. **Model Not Available**: Ensure `gpt-oss:20b` model is installed in Ollama
3. **Goals API Error**: Check that the goals database is properly initialized
4. **CORS Issues**: Ensure proper CORS configuration for cross-origin requests

### Debug Tips
- Check the System Status panel for dependency issues
- Monitor the Pipeline Logs for detailed execution information
- Use browser developer tools to inspect network requests
- Check Ollama logs for model-specific issues