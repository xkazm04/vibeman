# Annette Setup Guide

This guide will help you set up the Annette voicebot pipeline prototype.

## Prerequisites

### 1. Ollama Installation
Ollama must be running locally for the LLM functionality.

**Install Ollama:**
- Visit [ollama.ai](https://ollama.ai) and download for your platform
- Or use package managers:
  ```bash
  # macOS
  brew install ollama
  
  # Windows (via Chocolatey)
  choco install ollama
  
  # Linux
  curl -fsSL https://ollama.ai/install.sh | sh
  ```

**Install the required model:**
```bash
ollama pull gpt-oss:20b
```

**Start Ollama:**
```bash
ollama serve
```

Verify it's running by visiting: http://localhost:11434

### 2. Project Setup
Make sure you're in the vibeman directory and dependencies are installed:

```bash
cd vibeman
npm install
```

### 3. Environment Variables
Create a `.env.local` file in the vibeman directory:

```env
# Optional: Set base URL if different from localhost:3000
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Optional: ElevenLabs API key for future voice features
ELEVENLABS_API_KEY=your_api_key_here
```

## Running the Prototype

### 1. Start the Development Server
```bash
npm run dev
```

The server will start on http://localhost:3000

### 2. Navigate to Annette
Open your browser and go to: http://localhost:3000/annette

### 3. Check System Status
The System Status panel will show:
- ✅ Ollama Connection (should be green if Ollama is running)
- ✅ Goals API (should be green if the API is working)
- ✅ LangGraph Orchestrator (should be green if the orchestrator is working)

### 4. Test the Pipeline
Click the "Test Voice Pipeline" button to run the hardcoded test:
- Input: "How many goals are in this project?"
- The system will analyze the message
- Select and execute the appropriate tool (Goals API)
- Generate a response using Ollama
- Display the results in the Pipeline Logs

## Troubleshooting

### Ollama Issues
**Problem:** "Ollama not running on localhost:11434"
**Solution:**
1. Make sure Ollama is installed
2. Run `ollama serve` in a terminal
3. Check if the service is running: `curl http://localhost:11434/api/tags`

**Problem:** "Model not found"
**Solution:**
1. Install the model: `ollama pull gpt-oss:20b`
2. List available models: `ollama list`

### Goals API Issues
**Problem:** "Goals API not accessible"
**Solution:**
1. Make sure the development server is running
2. Check if the database is initialized
3. Try accessing the API directly: http://localhost:3000/api/goals?projectId=test-project-123

### Build Issues
**Problem:** Build fails with TypeScript errors
**Solution:**
1. The prototype should work despite linting warnings
2. For production, fix TypeScript errors in the existing codebase
3. Focus on the Annette-specific files for now

## Testing the API Directly

You can test the LangGraph API directly using curl:

```bash
# Test the LangGraph orchestrator
curl -X POST http://localhost:3000/api/annette/langgraph \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How many goals are in this project?",
    "projectId": "test-project-123"
  }'

# Test the Goals API
curl http://localhost:3000/api/goals?projectId=test-project-123
```

## Next Steps

Once the basic prototype is working:

1. **Add Real Voice Input**: Integrate with existing speech-to-text API
2. **Expand Tools**: Add more tools for project management
3. **Improve UI**: Add voice recording interface
4. **Add State Management**: Implement conversation persistence
5. **Error Handling**: Add retry logic and better error messages

## File Structure

```
vibeman/src/app/annette/
├── page.tsx                    # Main test interface
├── components/
│   ├── TestStatus.tsx         # System health checks
│   └── ArchitectureDiagram.tsx # System overview
├── README.md                  # Documentation
├── SETUP.md                   # This setup guide
└── test-api.js               # API testing script

vibeman/src/app/api/annette/
└── langgraph/
    └── route.ts              # LangGraph orchestrator
```

## Support

If you encounter issues:

1. Check the browser console for errors
2. Check the terminal running the dev server for server errors
3. Verify all prerequisites are installed and running
4. Test individual components (Ollama, Goals API) separately

The prototype is designed to be robust and provide detailed error messages to help with debugging.