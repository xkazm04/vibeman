# Voicebot Feature

A minimalistic voice-activated AI assistant with intelligent conversation flow and clear visual feedback.

## Features

- **One-Click Activation**: Single click to start voice conversation
- **Auto-Stop Detection**: Automatically processes speech after 3 seconds of silence
- **Smart State Management**: Prevents new conversations until current one completes
- **Clear Visual Feedback**: Distinct icons and colors for each processing stage
- **Real-time Audio Visualization**: Icon pulses with voice input levels
- **Speech-to-Text**: Uses ElevenLabs API to convert speech to text
- **AI Processing**: Sends transcribed text to Ollama for intelligent responses
- **Text-to-Speech**: Converts AI responses back to speech using ElevenLabs
- **Typewriter Effect**: Displays AI responses with animated typing
- **Center-Screen Positioning**: Accessible placement for better user experience

## Components

### VoicebotPillar
Main component that provides the floating voice interface:
- Fixed position in bottom-right corner
- Animated microphone button with state indicators
- Audio level visualization during recording
- Message display with typewriter effect

### TypewriterMessage
Displays AI responses with animated typing effect:
- Smooth character-by-character animation
- Blinking cursor indicator
- Styled message bubble with backdrop blur

## API Routes

### `/api/voicebot/speech-to-text`
Converts audio to text using ElevenLabs Speech-to-Text API:
- Accepts audio file uploads
- Returns transcribed text
- Handles API errors gracefully

### `/api/voicebot/text-to-speech`
Converts text to speech using ElevenLabs Text-to-Speech API:
- Accepts text input
- Returns audio stream
- Configurable voice settings

## Setup

1. **Get ElevenLabs API Key**:
   - Sign up at [ElevenLabs](https://elevenlabs.io/)
   - Generate an API key from your dashboard

2. **Configure Environment**:
   ```bash
   ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
   ```

3. **Ensure Ollama is Running**:
   - The voicebot uses the existing Ollama integration
   - Make sure Ollama is running on `localhost:11434`
   - The default model is `gpt-oss:20b`

## Conversation Flow

1. **Start**: Click the microphone button (gray MicOff icon)
2. **Listen**: Speak your question (green Mic icon with audio-reactive pulsing)
3. **Auto-Stop**: System detects 3 seconds of silence and begins processing
4. **Process Speech**: Converting speech to text (blue spinning Loader2 icon)
5. **AI Thinking**: Generating response (blue pulsing MessageSquare icon)
6. **Generate Speech**: Converting response to audio (orange spinning Loader2 icon)
7. **Playing**: Audio response plays (cyan pulsing Volume2 icon)
8. **Complete**: Returns to idle state, ready for next conversation

## Visual State System

- **Idle**: Gray MicOff icon - "Click to start voice chat"
- **Listening**: Green Mic icon with audio-reactive scaling - "Listening..."
- **Processing STT**: Blue spinning Loader2 - "Converting speech..."
- **Processing AI**: blue pulsing MessageSquare - "Thinking..."
- **Processing TTS**: Orange spinning Loader2 - "Generating speech..."
- **Playing**: Cyan pulsing Volume2 - "Speaking..."
- **Error**: Red MicOff icon - "Error - Click to retry" (auto-resets after 3s)

## Browser Permissions

The voicebot requires microphone access. Users will be prompted to allow microphone permissions on first use.

## Smart Features

- **Silence Detection**: Automatically stops recording after 3 seconds of silence
- **Conversation Lock**: Prevents new conversations until current one completes
- **Audio-Reactive Visualization**: Icon scales with voice input levels
- **Auto-Reset**: Error states automatically reset after 3 seconds
- **Concise Responses**: AI prompted to give 1-2 sentence responses for better voice interaction

## Error Handling

- **Microphone Access Denied**: Button remains inactive with clear messaging
- **ElevenLabs API Issues**: Graceful error state with auto-recovery
- **Ollama Connection Issues**: Red error state with retry option
- **Network Issues**: Comprehensive error handling with user feedback
- **Auto-Recovery**: All error states automatically reset to allow retry