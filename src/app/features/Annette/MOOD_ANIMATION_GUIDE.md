# Dynamic Neon Mood Animation System

## Overview

The NeonStatusDisplay component now features a sophisticated mood-based animation system that reflects Annette's emotional state through dynamic color transitions, varying glow intensity, and volume-responsive effects.

## Bot Mood States

### 1. **Idle** (Green)
- **Color**: Steady green (`#22c55e`)
- **Behavior**: Slow, gentle pulsing
- **Animation Speed**: 2.0s (slowest)
- **Glow Intensity**: 0.5 (moderate)
- **Use Case**: System ready but not active
- **Visual Cues**: Calm, steady green glow with minimal animation

### 2. **Listening** (Blue)
- **Color**: Calm blue (`#3b82f6`)
- **Behavior**: Medium-speed pulsing with scan line
- **Animation Speed**: 1.0s
- **Glow Intensity**: 0.7
- **Use Case**: Processing user request, waiting for server response
- **Visual Cues**: Blue glow with horizontal scan line moving across the display

### 3. **Speaking** (Orange)
- **Color**: Vibrant orange (`#f97316`)
- **Behavior**: Fast, volume-responsive animations
- **Animation Speed**: 0.5s - 1.0s (varies with volume)
- **Glow Intensity**: 0.6 - 1.2 (dynamically scaled by volume)
- **Use Case**: Actively speaking to the user
- **Visual Cues**:
  - Orange glow intensity matches speech volume
  - Background bars scale with volume
  - Particle effects appear at high volumes (>30%)
  - Fast-moving scan line

### 4. **Error** (Red)
- **Color**: Flashing red (`#ef4444`)
- **Behavior**: Rapid flashing with edge indicators
- **Animation Speed**: 0.3s (fastest)
- **Glow Intensity**: 1.0 (maximum)
- **Use Case**: System error, communication failure
- **Visual Cues**:
  - Aggressive red flashing
  - Pulsing edge indicators on left and right
  - Rapid, irregular flickering effect

## Volume-Based Dynamics

When in **Speaking** mode, the animation system analyzes real-time audio volume using the Web Audio API:

```typescript
// Volume range: 0.0 - 1.0
const dynamicGlowIntensity = 0.6 + (volume * 0.6); // Scales from 0.6 to 1.2
const animationSpeed = 0.5 + (volume * 0.5);        // Scales from 0.5s to 1.0s
```

### Volume Effects:

- **Low Volume (0.0 - 0.3)**: Gentle pulsing, no particle effects
- **Medium Volume (0.3 - 0.6)**: Moderate glow, few particles
- **High Volume (0.6 - 1.0)**: Intense glow, maximum particles, fast animations

## Animation Layers

### 1. Background Glow Bars
- 20 individual animated bars
- Color matches current mood state
- Opacity and scale vary with state and volume
- Sequential delay creates wave effect

### 2. Theme Overlay
- Subtle radial gradient based on selected theme (phantom/midnight/shadow)
- Adds color tint without overriding mood colors
- Gentle pulsing animation (3s cycle)

### 3. Text Glow Layers
Three layers create the neon effect:
- **Outer glow**: Large blur with primary color
- **Middle glow**: Medium blur for depth
- **Main text**: Sharp text with animated shadow

### 4. Dynamic Effects

#### Scan Line (Listening/Speaking)
- Vertical line sweeping across display
- Speed varies by state
- Color matches mood state

#### Edge Indicators (Error)
- Pulsing bars on left and right edges
- Out-of-phase animation for dramatic effect

#### Particle Effects (Speaking)
- Number of particles: `Math.floor(volume * 5)` (0-5 particles)
- Random positioning
- Fade in/out with scale animation
- Only appear when volume > 0.3

## Integration Example

```tsx
import NeonStatusDisplay from './NeonStatusDisplay';

function VoiceComponent() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isError, setIsError] = useState(false);
  const [volume, setVolume] = useState(0.5);

  return (
    <NeonStatusDisplay
      message="Processing your request..."
      theme="midnight"
      isSpeaking={isSpeaking}
      isListening={isListening}
      isError={isError}
      volume={volume}  // 0.0 to 1.0
    />
  );
}
```

## State Priority

When multiple states are active, the system follows this priority:

1. **Error** (highest priority) - Always shown when `isError = true`
2. **Speaking** - Shown when `isSpeaking = true` and not in error
3. **Listening** - Shown when `isListening = true` and not speaking/error
4. **Idle** (lowest priority) - Default when no other state is active

## Volume Detection Implementation

The AnnettePanel component uses the Web Audio API to analyze audio in real-time:

```typescript
const audioContext = new AudioContext();
const source = audioContext.createMediaElementSource(audio);
const analyser = audioContext.createAnalyser();
analyser.fftSize = 256;

const dataArray = new Uint8Array(analyser.frequencyBinCount);

const updateVolume = () => {
  analyser.getByteFrequencyData(dataArray);
  const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
  setVolume(average / 255); // Normalize to 0-1
  requestAnimationFrame(updateVolume);
};
```

## Performance Considerations

- Animations use CSS transforms and opacity for hardware acceleration
- Particle count scales with volume to prevent performance issues
- RequestAnimationFrame ensures smooth 60fps animations
- Audio analysis runs only during speech playback

## Customization

To adjust mood colors, edit the `MOOD_COLORS` constant in `NeonStatusDisplay.tsx`:

```typescript
const MOOD_COLORS = {
  idle: {
    primary: 'rgba(34, 197, 94, 0.8)',    // Green
    secondary: 'rgba(74, 222, 128, 0.6)',
    textColor: 'text-green-300',
    shadowColor: '#22c55e',
    glowIntensity: 0.5,
  },
  // ... other states
};
```

To adjust theme tints, edit `THEME_TINTS`:

```typescript
const THEME_TINTS = {
  phantom: {
    overlay: 'rgba(168, 85, 247, 0.15)',  // Purple tint
    accentColor: '#a855f7',
  },
  // ... other themes
};
```

## Accessibility

- Color changes are accompanied by message text changes
- Animations can be disabled via `prefers-reduced-motion` media query (future enhancement)
- High contrast between text and background maintained in all states

## Browser Support

- Modern browsers with Web Audio API support
- Framer Motion for animations
- CSS backdrop-filter and blur effects
- AudioContext (Chrome 34+, Firefox 25+, Safari 14.1+)

## Future Enhancements

- [ ] Respect `prefers-reduced-motion` for accessibility
- [ ] Custom mood states for different scenarios
- [ ] Configurable color schemes per deployment
- [ ] Audio waveform visualization integration
- [ ] Haptic feedback on mobile devices
