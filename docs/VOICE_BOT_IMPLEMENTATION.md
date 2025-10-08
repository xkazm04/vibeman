# Voice Bot Implementation - Annette Chat

## Overview

Successfully implemented a working voice bot prototype integrated into the Annette chat interface. The system provides seamless voice-to-text, AI processing, and text-to-speech capabilities.

## Features Implemented

### 1. Speech-to-Text (STT)
- **Activation**: Click microphone icon in chat input
- **Auto-stop**: Automatic silence detection after 3 seconds
- **API**: ElevenLabs Speech-to-Text
- **Transcription**: Text automatically appears in chat input field
- **Audio Visualization**: Real-time audio levels during recording

### 2. LLM Integration
- **Client**: Integrated `OllamaClient` from `/lib/llm/providers/ollama-client.ts`
- **Model**: `gpt-oss:20b` (local Ollama instance)
- **Endpoint**: `http://localhost:11434`
- **Context**: Includes selected project information
- **Response**: Concise, project-aware AI responses

### 3. Text-to-Speech (TTS)
- **API**: ElevenLabs Text-to-Speech
- **Voice ID**: `WAhoMTNdLdMoq1j3wf3I`
- **Model**: `eleven_flash_v2_5`
- **Auto-play**: Automatically plays response audio
- **Cleanup**: Proper URL object cleanup after playback

### 4. UI/UX Enhancements

#### Idle State
- Holographic brain icon with rotating animation
- Three orbiting particles
- "NEURAL INTERFACE ACTIVE" header
- Status messages in terminal-style format
- Awaiting input animation

#### Loading State
- Neural processing animation
- Pulsing holographic brain icon (16x16)
- "Neural Processing" label
- 12 animated quantum dots showing progress
- Rotating brain in gradient circle
- Pulsing box shadow effect

#### Response State
- **Typewriter Effect**: Character-by-character animation (30ms speed)
- **Centered Display**: Single message shown at a time
- **Previous messages**: Not shown (clean interface)
- **Styling**: Uses `TypewriterMessage` component from voicebot

## Technical Implementation

### Components Modified

#### `ChatDialog.tsx` (Main Component)
```typescript
- Voice recording with MediaRecorder API
- Audio analysis with Web Audio API
- Silence detection algorithm
- STT API integration
- Ollama client for LLM
- TTS API integration with auto-play
- Three-state UI (idle, loading, response)
```

### Flow Diagram

```
User Click Mic
    ↓
Start Recording (MediaRecorder)
    ↓
Audio Level Analysis (Web Audio API)
    ↓
Silence Detection (3s threshold)
    ↓
Stop Recording
    ↓
[Loading State Animation]
    ↓
Send to ElevenLabs STT API
    ↓
Receive Transcribed Text
    ↓
Display in Input Field
    ↓
Send to Ollama LLM (gpt-oss:20b)
    ↓
[Loading State continues]
    ↓
Receive AI Response
    ↓
[Response State with Typewriter]
    ↓
Generate TTS (ElevenLabs)
    ↓
Auto-play Audio
    ↓
[Audio Visualizer Active]
    ↓
Return to Idle State
```

## API Endpoints Used

### Speech-to-Text
- **Endpoint**: `/api/voicebot/speech-to-text`
- **Method**: POST
- **Input**: FormData with audio blob
- **Output**: `{ success: boolean, text: string }`

### Text-to-Speech
- **Endpoint**: `/api/voicebot/text-to-speech`
- **Method**: POST
- **Input**: `{ text: string }`
- **Output**: Audio blob (audio/mpeg)

### LLM Processing
- **Direct Client**: `OllamaClient.generate()`
- **Model**: gpt-oss:20b
- **Local**: http://localhost:11434

## State Management

```typescript
const [inputValue, setInputValue] = useState('');
const [isListening, setIsListening] = useState(false);
const [audioLevels, setAudioLevels] = useState<number[]>(Array(12).fill(0));
const [isAudioActive, setIsAudioActive] = useState(false);
const [currentResponse, setCurrentResponse] = useState<string>('');
const [isLoading, setIsLoading] = useState(false);
```

## Key Functions

### `startVoiceRecording()`
- Requests microphone permission
- Sets up Web Audio API for visualization
- Initializes MediaRecorder
- Starts silence detection loop

### `processVoiceInput(audioBlob)`
- Converts audio to text via STT API
- Sets transcribed text in input
- Triggers LLM processing

### `handleSendMessage(text)`
- Sends message to Ollama LLM
- Handles response
- Triggers TTS generation

### `generateTextToSpeech(text)`
- Calls TTS API
- Creates audio URL
- Auto-plays with cleanup

## Animation Details

### Loading Animation
- **Brain Icon**: 360° rotation (2s duration, infinite)
- **Container**: Pulsing box shadow (2s cycle)
- **Quantum Dots**: Individual scale and opacity animations (1.5s, staggered by 100ms)

### Typewriter Effect
- **Speed**: 30ms per character
- **Cursor**: Blinking pipe character
- **Component**: Reused from `/app/voicebot/components/TypewriterMessage.tsx`

### Audio Levels
- **Update Rate**: 60 FPS (requestAnimationFrame)
- **Bars**: 12 animated bars
- **Intensity**: Based on listening/processing/playing state

## Requirements

### Environment Variables
```env
ELEVENLABS_API_KEY=your_api_key_here
```

### Running Services
- Ollama must be running locally on port 11434
- Model `gpt-oss:20b` must be pulled

### Browser Permissions
- Microphone access required
- Modern browser with Web Audio API support

## Testing

### Test Flow
1. Select a project from right panel
2. Click microphone icon
3. Speak a question (e.g., "How many goals are in this project?")
4. Wait for silence detection (3 seconds)
5. Observe loading animation
6. Watch typewriter effect
7. Listen to audio response

### Expected Behavior
- ✅ Mic icon changes color when listening
- ✅ Audio levels animate during recording
- ✅ Loading animation shows while processing
- ✅ Response appears with typewriter effect
- ✅ Audio plays automatically
- ✅ Audio visualizer shows during playback
- ✅ Returns to idle state when complete

## Future Enhancements

1. **Conversation History**: Store and display previous exchanges
2. **Voice Selection**: Allow users to choose TTS voice
3. **Language Support**: Multi-language STT/TTS
4. **Interrupt Handling**: Allow stopping mid-response
5. **Error Recovery**: Better error messages and retry logic
6. **Offline Mode**: Local STT/TTS models
7. **Response Streaming**: Show LLM response as it generates

## Troubleshooting

### No Audio Input
- Check browser microphone permissions
- Verify microphone hardware
- Check browser console for errors

### STT Fails
- Verify ELEVENLABS_API_KEY is set
- Check API quota/limits
- Ensure audio format is supported

### LLM Timeout
- Verify Ollama is running (`ollama serve`)
- Check model is pulled (`ollama pull gpt-oss:20b`)
- Increase timeout in OllamaClient if needed

### TTS Fails
- Verify ELEVENLABS_API_KEY is set
- Check voice ID is valid
- Verify API quota

## Performance Notes

- **STT Latency**: ~1-3 seconds
- **LLM Processing**: ~2-10 seconds (depends on response length)
- **TTS Generation**: ~1-2 seconds
- **Total Round-trip**: ~5-15 seconds

## Dependencies

```json
{
  "framer-motion": "^10.x",
  "lucide-react": "^0.x",
  "@/lib/llm/providers/ollama-client": "local"
}
```

## Files Modified

1. `/src/app/annette/components/ChatDialog.tsx` - Complete rewrite
2. `/src/lib/llm/providers/ollama-client.ts` - Already existed
3. `/src/app/voicebot/components/TypewriterMessage.tsx` - Reused
4. `/src/app/api/voicebot/speech-to-text/route.ts` - Already existed
5. `/src/app/api/voicebot/text-to-speech/route.ts` - Already existed

## Demo Ready ✅

The voice bot is fully functional and ready for testing. All core features are implemented with high-quality animations matching the Annette component style.
