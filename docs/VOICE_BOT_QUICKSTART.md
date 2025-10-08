# Voice Bot Quick Start Guide

## 🎤 How to Use the Annette Voice Bot

### Prerequisites
1. **Start Ollama**
   ```bash
   ollama serve
   ```

2. **Verify Model**
   ```bash
   ollama pull gpt-oss:20b
   ```

3. **Set API Key**
   Ensure `.env.local` has:
   ```env
   ELEVENLABS_API_KEY=your_key_here
   ```

### Using the Voice Bot

#### Method 1: Voice Input (Recommended)
1. Navigate to `/annette` page
2. Select a project from the right panel
3. Click the **microphone icon** in the chat input
4. Speak your question clearly
5. Stop speaking and wait 3 seconds (auto-stops)
6. Watch the loading animation
7. Read the typewriter response
8. Listen to the audio playback

#### Method 2: Text Input
1. Navigate to `/annette` page
2. Select a project from the right panel
3. Type your question in the input field
4. Press **Enter** or click send
5. Watch the loading animation
6. Read the typewriter response
7. Listen to the audio playback

### Example Questions
- "How many goals are in this project?"
- "What is this project about?"
- "Tell me about the main features"
- "What technologies are used here?"

### Visual States

**🟢 Idle State**
- Rotating brain icon
- Orbiting particles
- "NEURAL INTERFACE ACTIVE" message

**🔵 Listening State**
- Microphone icon turns red
- Audio levels animate
- Real-time visualization

**🟣 Loading State**
- Spinning brain icon
- "Neural Processing" message
- 12 animated quantum dots

**⚪ Response State**
- Typewriter effect
- Clean centered display
- Previous messages cleared

**🔊 Audio Playback**
- Audio visualizer active
- Auto-plays response
- Cleans up when finished

### Troubleshooting

#### Microphone Not Working
```
❌ Problem: No audio input detected
✅ Solution: 
   1. Check browser permissions
   2. Refresh page
   3. Check microphone hardware
```

#### No Project Selected
```
❌ Problem: Mic icon disabled
✅ Solution: Select a project from right panel
```

#### Ollama Not Running
```
❌ Problem: "Unable to connect to Ollama"
✅ Solution: Run `ollama serve` in terminal
```

#### No Audio Playback
```
❌ Problem: Response shows but no audio
✅ Solution: 
   1. Check ELEVENLABS_API_KEY
   2. Verify API quota
   3. Check browser audio permissions
```

### Performance Tips

1. **Speak Clearly**: Better transcription accuracy
2. **Pause 3s**: Automatic detection kicks in
3. **Short Questions**: Faster LLM responses
4. **Good Internet**: Faster API calls

### Keyboard Shortcuts

- `Enter` - Send message (text mode)
- `Shift + Enter` - New line (currently single-line)

### Features

✅ Speech-to-Text (ElevenLabs)
✅ Text-to-Speech (ElevenLabs)  
✅ LLM Processing (Ollama local)
✅ Auto-silence detection
✅ Typewriter effect
✅ Audio visualization
✅ Project-aware responses
✅ Clean UI (single message)
✅ Loading animations

### Limitations

- Single message view (no history)
- English only (currently)
- Requires internet for STT/TTS
- Requires local Ollama for LLM

### Next Steps

Try these commands:
- "What files are in this project?"
- "Explain the main component"
- "How is this project structured?"
- "What dependencies does this use?"

---

**Enjoy your AI-powered voice assistant! 🚀**
