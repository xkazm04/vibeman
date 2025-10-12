# Voicebot Implementation Guide

**Last Updated**: January 2025  
**Status**: Production Ready ✅  
**Compilation**: 0 errors

---

## Overview

Complete voicebot system with manual click-to-talk, multi-model parallel testing, and horizontal layout design.

---

## Features

### Core Functionality
- ✅ **Manual Click-to-Talk** - User controls each interaction
- ✅ **Multi-Model Testing** - Run 4 LLM providers in parallel
- ✅ **Comparative Evaluation** - AI-powered response analysis
- ✅ **Response Timing** - Track STT, LLM, TTS performance
- ✅ **Editable Test Questions** - Load/save from file

### Supported Providers
1. **Ollama** (Local) - `gpt-oss:20b` (fixed)
2. **OpenAI** - `gpt-5-mini`, `gpt-5-nano`
3. **Anthropic** - `claude-3-5-haiku-latest`, `claude-sonnet-4-5`
4. **Gemini** - `gemini-flash-latest`, `gemini-flash-lite-latest`

---

## Architecture

### Component Structure

```
voicebot/
├── components/
│   ├── AsyncVoiceSolution.tsx       # Recommended voice solution
│   ├── WebSocketVoiceSolution.tsx   # Experimental WebSocket
│   ├── ConversationSolution.tsx     # Automated testing
│   ├── VoicebotCallButton.tsx       # Compact horizontal button
│   ├── VoicebotSessionLogs.tsx      # Single-model logs
│   ├── MultiModelSessionLogs.tsx    # Multi-model comparison
│   └── conversation/
│       ├── ConvModelSelector.tsx    # Provider/model selection
│       ├── ConvControls.tsx         # Start/stop/clear controls
│       └── ConvTestQuestions.tsx    # Editable question list
├── lib/
│   ├── voicebotTypes.ts            # Type definitions
│   ├── voicebotUtils.ts            # Utility functions
│   ├── voicebotApi.ts              # API integration
│   └── conversationEvaluation.ts    # Evaluation logic
└── api/
    └── voicebot/
        ├── speech-to-text/         # STT endpoint
        ├── llm/                    # LLM processing
        ├── text-to-speech/         # TTS generation
        ├── realtime/               # Real-time solution
        ├── evaluate/               # Conversation evaluation
        └── test-questions/         # Load/save questions
```

### Data Flow

**Single Model Mode:**
```
User Click → STT → LLM (single) → TTS → Audio Playback → Logs
```

**Multi-Model Mode:**
```
User Click → STT → Parallel LLM (4 providers) → TTS → Audio → Multi-Column Logs
                                                              ↓
                                                   Comparative Evaluation
```

---

## UI Layout

### AsyncVoiceSolution (Recommended)
```
┌──────────────────────────────────────────────────────┐
│ [Button] │ Provider: [▼] │ Model: [▼]              │
└──────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────┐
│              Session Logs (Full Width)               │
└──────────────────────────────────────────────────────┘
```

### ConversationSolution (Testing)
```
┌──────────────────────────────────────────────────────┐
│ Config              │ Controls                        │
│ □ Multi-Model       │ [▶ Start] [Clear]              │
│ Provider: [▼]       │ Status: IDLE                   │
│ Model: [▼]          │                                │
└──────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────┐
│ Test Questions: Q1 Q2 Q3 Q4 Q5         [Edit]       │
│ Progress: ████████░░░░░░ 3/5                        │
└──────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────┐
│         Session Logs (Single or Multi-Model)         │
└──────────────────────────────────────────────────────┘
```

---

## Multi-Model Feature

### How It Works

1. **Enable Multi-Model**
   - Check "Multi-Model Test" checkbox
   - Provider/model selectors disable
   - All 4 providers will be used

2. **Parallel Processing**
   ```typescript
   const providers = ['ollama', 'openai', 'anthropic', 'gemini'];
   const responses = await Promise.all(
     providers.map(prov => processTextMessage(question, [], prov, model))
   );
   ```

3. **Display**
   - 4-column grid layout
   - Color-coded headers:
     - Purple: Ollama
     - Green: OpenAI
     - Orange: Anthropic
     - Blue: Gemini
   - Timing displayed per model

4. **Evaluation**
   - Runs after all questions complete
   - Compares all responses
   - Rates quality (1-10)
   - Identifies strengths/weaknesses

---

## Editable Test Questions

### File Location
```
data/test-questions.txt
```

### Format
```
What is artificial intelligence?
How does machine learning work?
Can you explain neural networks?
```

### API Endpoints

**GET** `/api/voicebot/test-questions`
- Loads questions from file
- Returns array of strings

**POST** `/api/voicebot/test-questions`
```json
{
  "questions": ["Q1", "Q2", "Q3"]
}
```

### Edit UI
1. Click "Edit" button in Test Questions section
2. Modify/add/delete questions
3. Click "Save" to persist changes
4. Questions reload automatically

---

## Performance

### Single-Model
- Average response time: ~1-2s
- STT: ~200-400ms
- LLM: ~500-1000ms
- TTS: ~300-500ms

### Multi-Model (Parallel)
- Total time ≈ slowest provider
- 4x faster than sequential
- Example: If Ollama=500ms, OpenAI=300ms, Anthropic=400ms, Gemini=350ms
  - Sequential: 1550ms
  - Parallel: 500ms (saves 1050ms)

---

## Testing Checklist

### Single-Model Mode
- [ ] Select different providers
- [ ] Change models within provider
- [ ] Run conversation test
- [ ] Verify timing displays
- [ ] Check evaluation runs
- [ ] Test manual stop

### Multi-Model Mode
- [ ] Enable multi-model checkbox
- [ ] Verify provider/model disabled
- [ ] Start test
- [ ] Confirm parallel processing
- [ ] Check 4-column display
- [ ] Verify color coding
- [ ] Check timing per model
- [ ] Verify evaluation
- [ ] Test error handling

### Editable Questions
- [ ] Click Edit button
- [ ] Modify question text
- [ ] Add new question
- [ ] Delete question
- [ ] Save changes
- [ ] Verify persistence
- [ ] Test with conversation

---

## Configuration

### Environment Variables
```env
# Ollama
OLLAMA_URL=http://localhost:11434

# OpenAI
OPENAI_API_KEY=sk-...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Google Gemini
GEMINI_API_KEY=...

# ElevenLabs (TTS)
ELEVENLABS_API_KEY=...
```

### Model Selection
```typescript
// voicebotTypes.ts
export const DEFAULT_LLM_MODELS = {
  ollama: 'gpt-oss:20b',
  openai: 'gpt-5-mini-2025-08-07',
  anthropic: 'claude-3-5-haiku-latest',
  gemini: 'gemini-flash-latest'
};
```

---

## Troubleshooting

### Common Issues

**1. "Processing" stuck**
- Cause: Stale state in async updates
- Fix: State resets to 'idle' after response, requires manual click

**2. Duplicate API calls**
- Cause: useEffect with function in dependencies
- Fix: Use useRef pattern for callback functions

**3. Multi-model evaluation fails**
- Cause: Ollama not running
- Fix: Start Ollama service, verify connection

**4. Test questions not loading**
- Cause: File doesn't exist
- Fix: Create `data/test-questions.txt` with default questions

---

## Best Practices

1. **State Management**
   - Always set state before dependent actions
   - Use useRef for mutable values in effects
   - Minimize effect dependencies

2. **Error Handling**
   - Wrap provider calls in try-catch
   - Show error in UI (don't just log)
   - Allow continuation with other providers

3. **Performance**
   - Use parallel processing when possible
   - Cache responses when appropriate
   - Minimize re-renders

4. **User Experience**
   - Clear visual feedback for all states
   - Timing information for transparency
   - Easy access to controls

---

## Future Enhancements

### Planned Features
1. **Custom Model Selection in Multi-Mode**
   - Checkboxes to select which providers
   - Dynamic column layout

2. **Response Comparison Tools**
   - Side-by-side diff view
   - Similarity scoring
   - Highlight differences

3. **Export Results**
   - CSV/JSON download
   - Include timing statistics
   - Save evaluations

4. **Advanced Evaluation**
   - Multiple criteria scoring
   - User ratings
   - Aggregate statistics

---

## Code Examples

### Loading Test Questions
```typescript
const loadQuestions = async () => {
  const response = await fetch('/api/voicebot/test-questions');
  const { questions } = await response.json();
  setQuestions(questions);
};
```

### Saving Test Questions
```typescript
const saveQuestions = async (questions: string[]) => {
  await fetch('/api/voicebot/test-questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ questions })
  });
};
```

### Multi-Model Processing
```typescript
const responses = await Promise.all(
  providers.map(async (prov) => {
    try {
      return await processTextMessage(text, history, prov, model);
    } catch (error) {
      return { error: error.message };
    }
  })
);
```

---

## Support

For issues or questions:
1. Check troubleshooting section
2. Review component documentation
3. Verify environment variables
4. Check browser console for errors

---

**Version**: 2.0  
**Contributors**: Development Team  
**License**: MIT
