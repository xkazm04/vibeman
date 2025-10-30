const PROJECT_ID = 'dd11e61e-f267-4e52-95c5-421b1ed9567b';
const API_BASE = 'http://localhost:3000/api/contexts';

async function createContext(data) {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, projectId: PROJECT_ID })
  });

  const result = await response.json();
  if (result.success) {
    console.log(`✓ Created: ${data.name}`);
    return result.data;
  } else {
    console.error(`✗ Failed: ${data.name}`, result.error);
    throw new Error(result.error);
  }
}

const contexts = [
  {
    name: 'Video Generation & Storyboarding System',
    groupId: null,
    description: `## Overview
AI-powered video generation and storyboarding system supporting text-to-video, image-to-video conversion, and frame-by-frame storyboard creation with multiple provider integrations (Runway, Pika, Stable Video, Deforum, local models). Enables filmmakers and animators to create animated scenes, motion graphics, and video prototypes with precise control over motion strength, style, transitions, and frame sequencing.

## Key Capabilities
- Text-to-video generation: Convert written descriptions to animated videos
- Image-to-video: Add motion to static images
- Scene-to-video: Convert story scenes to animated sequences
- Multi-provider support: Runway, Pika, Stable Video Diffusion, Deforum, local models
- Storyboard editor: Frame-by-frame storyboard creation and management
- Frame transitions: Cut, fade, dissolve, wipe, zoom, pan effects
- Video editing: Trim, merge, speed change, style transfer, upscale, interpolation
- Motion presets: Static (0.1) to Intense (0.9) motion strength
- Visual styles: Cinematic, anime, realistic, fantasy, sci-fi, abstract
- Resolution presets: 480p, 720p, 1080p with custom aspect ratios
- FPS options: 24, 30, 60 fps
- Duration control: 2-10 seconds per generation
- Video collections: Organize related videos
- Thumbnail generation: Automatic video thumbnails

## Architecture

### Component Breakdown
| Component/File | Purpose | Layer |
|----------------|---------|-------|
| \`src/app/features/video/VideoFeature.tsx\` | Main video feature orchestrator | UI |
| \`src/app/features/video/generator/VideoGenerator.tsx\` | Video generation form and controls | UI |
| \`src/app/features/video/storyboard/StoryboardEditor.tsx\` | Frame-by-frame storyboard creator | UI |
| \`src/app/types/Video.ts\` | Comprehensive video generation types | Types |
| \`src/hooks/useVideos.ts\` | Video API hooks and operations | API |
| \`src/prompts/video/videoPromptEnhancement.ts\` | Video prompt enhancement | Prompts |
| \`src/prompts/video/storyboardGeneration.ts\` | Storyboard generation from script | Prompts |
| \`src/prompts/video/motionDescription.ts\` | Motion description generation | Prompts |
| \`src/prompts/video/shotComposition.ts\` | Shot composition guidance | Prompts |

### Data Flow
User opens Video feature → VideoFeature loads → User enters text prompt → User selects provider and style → User sets motion strength and duration → User clicks generate → VideoGenerator sends request → Provider API processes → Video returned → Video saved to gallery → User creates storyboard → StoryboardEditor opens → User adds frames with prompts → User sets transitions → User generates videos for frames → Storyboard assembled → User exports final video

### Key Dependencies
- External: React Query (data fetching), React (UI framework), Framer Motion (animations)
- Internal: LLM hooks (prompt enhancement), Project Store, Scene API (scene-to-video)

## Technical Details

### State Management
- **Server State**: React Query manages video data
  - \`useVideos(projectId)\`: Fetch all generated videos
  - \`useVideo(videoId)\`: Fetch single video
  - \`useVideoStoryboards(projectId)\`: Fetch storyboards
- **Client State**: Local component state for form inputs

### API Endpoints
- \`GET /videos?projectId=x\` - List generated videos
- \`GET /videos/:id\` - Get video details
- \`POST /videos/generate\` - Generate new video
- \`POST /videos/image-to-video\` - Convert image to video
- \`POST /videos/:id/edit\` - Apply edit operation
- \`DELETE /videos/:id\` - Delete video
- \`POST /storyboards\` - Create storyboard
- \`PUT /storyboards/:id\` - Update storyboard
- \`GET /storyboards/:id\` - Get storyboard details

### Database Tables
- **generated_videos**: Video data (id, url, thumbnail, prompt, provider, width, height, duration, fps, style, motion_strength, seed, parent_video_id, scene_id, project_id)
- **video_storyboards**: Storyboard data (id, project_id, name, description, frames (JSON), total_duration)
- **storyboard_frames**: Frame details (id, storyboard_id, order, prompt, duration, image_id, video_id, transition, notes)
- **video_edits**: Edit history (id, video_id, operation_type, parameters, result_url)
- **video_collections**: Grouped videos (id, project_id, name, description, video_ids (JSON))

## Usage Examples

\`\`\`typescript
// Generate text-to-video
await generateVideo({
  prompt: "Dragon flying over misty mountains at dawn",
  provider: "runway",
  model: "gen-2",
  width: 1280,
  height: 720,
  duration: 4,
  fps: 30,
  motion_strength: 0.7,
  style: "cinematic",
  project_id: projectId
});

// Convert image to video
await imageToVideo({
  image_id: imageId,
  prompt: "Camera slowly pans across the landscape",
  duration: 5,
  motion_strength: 0.5,
  style: "realistic"
});

// Create storyboard
const storyboard = await createStoryboard({
  name: "Act 1 Opening",
  description: "Intro sequence storyboard",
  project_id: projectId,
  frames: [
    {
      order: 1,
      prompt: "Establishing shot of castle",
      duration: 3,
      transition: "fade"
    },
    {
      order: 2,
      prompt: "Character walks through gate",
      duration: 4,
      transition: "cut"
    }
  ]
});
\`\`\`

## Future Improvements
- [ ] Add real-time generation progress tracking
- [ ] Support audio track integration
- [ ] Implement video concatenation tool
- [ ] Add subtitle/caption overlay
- [ ] Support camera motion paths (bezier curves)
- [ ] Implement AI-powered scene transitions
- [ ] Add video quality comparison (preview vs final)
- [ ] Support 4K video generation
- [ ] Implement collaborative storyboard editing
- [ ] Add cost estimation per generation`,
    filePaths: [
      "src/app/features/video/VideoFeature.tsx",
      "src/app/features/video/generator/VideoGenerator.tsx",
      "src/app/features/video/storyboard/StoryboardEditor.tsx",
      "src/app/types/Video.ts",
      "src/hooks/useVideos.ts",
      "src/prompts/video/videoPromptEnhancement.ts",
      "src/prompts/video/storyboardGeneration.ts",
      "src/prompts/video/motionDescription.ts",
      "src/prompts/video/shotComposition.ts"
    ]
  },

  {
    name: 'Voice Management & TTS Integration',
    groupId: null,
    description: `## Overview
Text-to-speech (TTS) voice management system with multi-provider integration (ElevenLabs, OpenAI TTS, custom models), voice configuration controls, audio sample management, and voice extraction from media. Enables voice actors, podcast creators, and game developers to create character voices, narration, and dialogue with fine-tuned control over voice parameters including stability, similarity boost, style, and speed.

## Key Capabilities
- Multi-provider TTS: ElevenLabs, OpenAI TTS, custom voice models
- Voice library: Browse and select from available voices
- Voice configuration: Stability (0-1), similarity boost (0-1), style (0-1), speed (0.5-2.0)
- Audio sample management: Upload and organize voice samples
- Voice extraction: Extract voice profiles from existing media
- Character voice assignment: Link voices to story characters
- Voice parameters: Language, gender, age range specification
- Speaker boost: Enhance voice clarity and presence
- Voice training data: Upload audio files for custom voice training
- YouTube audio extraction: Sample audio from YouTube videos
- Voice preview: Test voices before generation

## Architecture

### Component Breakdown
| Component/File | Purpose | Layer |
|----------------|---------|-------|
| \`src/app/features/voice/VoiceFeature.tsx\` | Main voice feature orchestrator | UI |
| \`src/app/features/voice/components/VoiceList.tsx\` | Voice library browser | UI |
| \`src/app/features/voice/extraction/VoiceExtraction.tsx\` | Voice extraction from media | UI |
| \`src/app/types/Voice.ts\` | Voice and audio types | Types |
| \`src/hooks/useVoices.ts\` | Voice API hooks and operations | API |
| \`src/prompts/voice/voiceCharacterization.ts\` | Voice character description | Prompts |
| \`src/prompts/voice/voiceDescription.ts\` | Voice attribute description | Prompts |

### Data Flow
User opens Voice feature → VoiceFeature loads → \`useVoices(projectId)\` fetches voices → VoiceList displays voices → User selects voice → User configures parameters (stability, speed, style) → User assigns to character → User generates speech → TTS provider processes → Audio returned → AudioSample saved → User extracts voice from media → VoiceExtraction processes → New voice profile created

### Key Dependencies
- External: React Query (data fetching), React (UI framework), Web Audio API
- Internal: Character API (character-voice linking), Dataset API (audio extraction)

## Technical Details

### State Management
- **Server State**: React Query manages voice data
  - \`useVoices(projectId)\`: Fetch project voices
  - \`useVoice(voiceId)\`: Fetch single voice
  - \`useAudioSamples(voiceId)\`: Fetch voice samples
- **Client State**: Local component state for voice parameters

### API Endpoints
- \`GET /voices?projectId=x\` - List project voices
- \`GET /voices/:id\` - Get voice details
- \`POST /voices\` - Create/import voice
- \`PUT /voices/:id\` - Update voice config
- \`DELETE /voices/:id\` - Delete voice
- \`POST /voices/:id/samples\` - Upload audio sample
- \`GET /voices/:id/samples\` - Get voice samples
- \`POST /voices/extract\` - Extract voice from media
- \`POST /voices/:id/generate\` - Generate speech

### Database Tables
- **voices**: Voice data (id, voice_id (external), name, description, provider, language, gender, age_range, audio_sample_url, character_id, project_id)
- **voice_configs**: Voice parameters (id, voice_id, stability, similarity_boost, style, speed, use_speaker_boost)
- **audio_samples**: Audio files (id, voice_id, file_path, file_name, duration, size, transcription)
- **voice_training_data**: Training files (id, voice_id, audio_files (JSON), labels (JSON))

## Usage Examples

\`\`\`typescript
// Create voice
await createVoice({
  name: "Elena - Heroic Voice",
  description: "Strong, confident female voice",
  provider: "elevenlabs",
  voice_id: "21m00Tcm4TlvDq8ikWAM",
  language: "en",
  gender: "female",
  age_range: "adult",
  character_id: characterId,
  project_id: projectId
});

// Configure voice
await updateVoiceConfig(voiceId, {
  stability: 0.75,
  similarity_boost: 0.8,
  style: 0.6,
  speed: 1.0,
  use_speaker_boost: true
});

// Generate speech
await generateSpeech(voiceId, {
  text: "I will not let my kingdom fall!",
  config: voiceConfig
});

// Upload audio sample
await uploadAudioSample(voiceId, {
  file: audioFile,
  transcription: "Sample dialogue..."
});
\`\`\`

## Future Improvements
- [ ] Add voice cloning from single sample
- [ ] Support emotion control (happy, sad, angry)
- [ ] Implement voice mixing (blend voices)
- [ ] Add pronunciation dictionary
- [ ] Support SSML markup for advanced control
- [ ] Implement batch speech generation
- [ ] Add voice analytics (usage tracking)
- [ ] Support real-time voice morphing`,
    filePaths: [
      "src/app/features/voice/VoiceFeature.tsx",
      "src/app/features/voice/components/VoiceList.tsx",
      "src/app/features/voice/extraction/VoiceExtraction.tsx",
      "src/app/types/Voice.ts",
      "src/hooks/useVoices.ts",
      "src/prompts/voice/voiceCharacterization.ts",
      "src/prompts/voice/voiceDescription.ts"
    ]
  },

  {
    name: 'Dataset Management & AI Analysis',
    groupId: null,
    description: `## Overview
Multi-modal dataset management system for collecting, organizing, and analyzing image and audio data with AI-powered transcription, personality extraction, and tagging. Supports local audio upload, YouTube audio sampling, Whisper/ElevenLabs transcription, character personality extraction from dialogue, and image dataset organization. Enables data scientists and content creators to build training datasets, extract insights, and organize media assets.

## Key Capabilities
- Audio dataset management: Upload, organize, and transcribe audio files
- YouTube audio extraction: Sample audio from YouTube videos with time range selection
- Multi-provider transcription: Whisper, ElevenLabs, AssemblyAI
- Segment-level transcription: Timestamped segments with speaker identification
- Character personality extraction: Extract traits, speaking style, emotional range from dialogue
- Image dataset gallery: Organize images with tags and descriptions
- AI-powered tagging: Automatic image/audio tagging
- Confidence scoring: Track confidence levels for extracted data
- Quote extraction: Extract memorable quotes from transcriptions
- Dataset export: Export datasets in multiple formats (JSON, CSV)

## Architecture

### Component Breakdown
| Component/File | Purpose | Layer |
|----------------|---------|-------|
| \`src/app/features/datasets/DatasetsFeature.tsx\` | Main dataset feature orchestrator | UI |
| \`src/app/features/datasets/audio/LocalAudioUpload.tsx\` | Local audio file uploader | UI |
| \`src/app/features/datasets/audio/YouTubeAudioSampler.tsx\` | YouTube audio extraction tool | UI |
| \`src/app/features/datasets/audio/AudioTranscriptions.tsx\` | Transcription list and viewer | UI |
| \`src/app/features/datasets/audio/AudioExtraction.tsx\` | Audio processing controls | UI |
| \`src/app/features/datasets/audio/CharacterPersonalityExtractor.tsx\` | AI personality extraction | UI |
| \`src/app/features/datasets/images/ImageDatasets.tsx\` | Image dataset manager | UI |
| \`src/app/features/datasets/images/ImageDatasetGallery.tsx\` | Image gallery with metadata | UI |
| \`src/app/types/Dataset.ts\` | Dataset, transcription, extraction types | Types |
| \`src/hooks/useDatasets.ts\` | Dataset API hooks | API |
| \`src/prompts/dataset/audioTranscription.ts\` | Transcription prompt templates | Prompts |
| \`src/prompts/dataset/datasetTagging.ts\` | AI tagging prompts | Prompts |
| \`src/prompts/dataset/imageAnalysis.ts\` | Image analysis prompts | Prompts |

### Data Flow
User opens Dataset feature → DatasetsFeature loads → User uploads audio → LocalAudioUpload processes → Audio saved → User requests transcription → Whisper API transcribes → Transcription with segments saved → User extracts personality → CharacterPersonalityExtractor analyzes → Traits, quotes, style extracted → User samples YouTube → YouTubeAudioSampler extracts audio → Multiple samples generated → User organizes images → ImageDatasetGallery displays → Tags applied

### Key Dependencies
- External: React Query (data fetching), Whisper API, ElevenLabs API, YouTube API
- Internal: LLM hooks (personality extraction), Character API (trait linking)

## Technical Details

### State Management
- **Server State**: React Query manages dataset data
  - \`useDatasets(projectId)\`: Fetch datasets
  - \`useTranscriptions(datasetId)\`: Fetch transcriptions
  - \`useCharacterExtractions(transcriptionId)\`: Fetch personality data
  - \`useImageDatasets(projectId)\`: Fetch image datasets
- **Client State**: Upload progress and form state

### API Endpoints
- \`GET /datasets?projectId=x\` - List datasets
- \`POST /datasets\` - Create dataset
- \`POST /datasets/:id/audio\` - Upload audio
- \`POST /datasets/:id/transcribe\` - Transcribe audio
- \`POST /datasets/:id/extract-personality\` - Extract character traits
- \`POST /datasets/youtube-extract\` - Extract YouTube audio
- \`GET /datasets/:id/images\` - Get image dataset
- \`POST /datasets/:id/images\` - Add images

### Database Tables
- **datasets**: Dataset metadata (id, project_id, name, description, type (image/audio/character/mixed))
- **audio_transcriptions**: Transcription data (id, audio_file_url, filename, transcription_text, language, confidence, engine, duration, word_count, segments (JSON))
- **character_extractions**: Personality data (id, audio_transcription_id, personality_analysis, traits (JSON), speaking_style, emotional_range, extracted_quotes (JSON), confidence)
- **dataset_images**: Image data (id, dataset_id, image_url, internal_id, thumbnail, tags (JSON), description)
- **youtube_extractions**: YouTube samples (id, youtube_url, video_title, video_duration, sample_length, samples_generated, status)

## Usage Examples

\`\`\`typescript
// Upload audio
await uploadAudio(datasetId, {
  file: audioFile,
  filename: "dialogue_sample_1.mp3"
});

// Transcribe audio
const transcription = await transcribeAudio({
  audio_file_url: audioUrl,
  engine: "whisper",
  language: "en"
});

// Extract personality
const personality = await extractPersonality(transcriptionId, {
  context: projectContext,
  focus: "speaking_style"
});

// Extract YouTube audio
await extractYouTubeAudio({
  url: "https://youtube.com/watch?v=...",
  start_time: 120,
  end_time: 180,
  sample_length: 10
});

// Create image dataset
await createImageDataset({
  name: "Character References",
  description: "Reference images for characters",
  project_id: projectId
});
\`\`\`

## Future Improvements
- [ ] Add video dataset support
- [ ] Implement dataset versioning
- [ ] Support collaborative dataset annotation
- [ ] Add dataset quality metrics
- [ ] Implement data augmentation tools
- [ ] Support multi-language transcription
- [ ] Add speaker diarization
- [ ] Implement dataset splitting (train/val/test)`,
    filePaths: [
      "src/app/features/datasets/DatasetsFeature.tsx",
      "src/app/features/datasets/audio/LocalAudioUpload.tsx",
      "src/app/features/datasets/audio/YouTubeAudioSampler.tsx",
      "src/app/features/datasets/audio/AudioTranscriptions.tsx",
      "src/app/features/datasets/audio/AudioExtraction.tsx",
      "src/app/features/datasets/audio/CharacterPersonalityExtractor.tsx",
      "src/app/features/datasets/images/ImageDatasets.tsx",
      "src/app/features/datasets/images/ImageDatasetGallery.tsx",
      "src/app/types/Dataset.ts",
      "src/hooks/useDatasets.ts",
      "src/prompts/dataset/audioTranscription.ts",
      "src/prompts/dataset/datasetTagging.ts",
      "src/prompts/dataset/imageAnalysis.ts"
    ]
  },

  {
    name: 'API Integration & Infrastructure Layer',
    groupId: null,
    description: `## Overview
Core API infrastructure layer providing rate-limited HTTP client, comprehensive error handling, request timeout management, retry logic, and typed API utilities. Serves as the foundation for all external API communication with built-in queue-based rate limiting, automatic retries on transient failures, AbortController integration, and TypeScript type safety. Essential infrastructure powering all feature modules with reliable, performant, and maintainable API interactions.

## Key Capabilities
- Queue-based rate limiting: Sliding window algorithm with configurable limits per endpoint
- Comprehensive error handling: ApiError, TimeoutError, NetworkError with type guards
- Request timeout management: Default 30s timeout with AbortSignal support
- Automatic retry logic: Single retry on transient failures (network, timeout)
- Type-safe API utilities: Generic \`apiFetch<T>\` with TypeScript inference
- Request cancellation: AbortController integration for request cleanup
- Error recovery: Automatic error classification and recovery strategies
- API hooks: React Query integration hooks for all resources
- Rate limiter monitoring: Real-time queue status and metrics
- Mock data support: Development mode with mock data toggle

## Architecture

### Component Breakdown
| Component/File | Purpose | Layer |
|----------------|---------|-------|
| \`src/app/utils/api.ts\` | Core API fetch utilities with rate limiting | Utils |
| \`src/app/utils/rateLimiter.ts\` | Queue-based rate limiter implementation | Utils |
| \`src/app/types/ApiError.ts\` | Error types and type guards | Types |
| \`src/app/hooks/useApiErrorHandler.ts\` | React hook for error handling | Hooks |
| \`src/app/hooks/useOptimisticMutation.ts\` | Optimistic update wrapper | Hooks |
| \`src/app/hooks/integration/useCharacters.ts\` | Character API hooks | Hooks |
| \`src/app/hooks/integration/useActs.ts\` | Acts API hooks | Hooks |
| \`src/app/hooks/integration/useScenes.ts\` | Scenes API hooks | Hooks |
| \`src/app/hooks/integration/useBeats.ts\` | Beats API hooks | Hooks |
| \`src/app/hooks/integration/useFactions.ts\` | Factions API hooks | Hooks |
| \`src/app/hooks/integration/useTraits.ts\` | Traits API hooks | Hooks |
| \`src/app/hooks/integration/useRelationships.ts\` | Relationships API hooks | Hooks |
| \`src/app/hooks/integration/useFactionRelationships.ts\` | Faction relationships API hooks | Hooks |
| \`src/app/hooks/integration/useProjects.ts\` | Projects API hooks | Hooks |
| \`src/app/components/dev/RateLimiterMonitor.tsx\` | Rate limiter debug panel | Dev |
| \`src/app/components/dev/EventListenerDebugPanel.tsx\` | Event listener leak detector | Dev |
| \`src/app/config/api.ts\` | API base URL and mock toggle config | Config |

### Data Flow
Feature component calls hook → Hook uses \`apiFetch\` → Request enters rate limiter queue → Queue processes with sliding window → Fetch executes with timeout → AbortSignal monitors → Response received or error thrown → Error handler classifies → Retry logic evaluates → Success: data returned + React Query caches → Error: ApiError thrown + error handler processes → Component receives typed data or error

### Key Dependencies
- External: React Query (@tanstack/react-query), React (hooks)
- Internal: All feature modules depend on this layer

## Technical Details

### State Management
- **No State**: Infrastructure layer is stateless
- **React Query Cache**: Server state managed by React Query
- **Rate Limiter Queue**: In-memory request queue

### API Endpoints
This layer provides utilities for calling all endpoints:
- Characters, Traits, Relationships
- Factions, Faction Relationships
- Acts, Scenes, Beats
- Projects
- Images, Videos, Voices
- Datasets
- LLM

### Core API Utilities

\`\`\`typescript
// apiFetch signature
function apiFetch<T>(request: ApiRequest): Promise<T>

interface ApiRequest {
  endpoint: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  params?: Record<string, string>;
  signal?: AbortSignal;
  timeout?: number;
}

// Rate limiter
class RateLimiter {
  queue(request: () => Promise<Response>): Promise<Response>
  getStatus(): { queueSize: number, processing: boolean }
}

// Error types
class ApiError extends Error {
  error: string;
  details?: any;
  status?: number;
  timestamp: Date;
}

class TimeoutError extends ApiError {
  constructor(message: string, timeoutMs: number)
}

// Type guards
function isApiError(error: unknown): error is ApiError
function isTimeoutError(error: unknown): error is TimeoutError
function isNetworkError(error: unknown): error is Error
\`\`\`

## Usage Examples

\`\`\`typescript
// Direct API call
const character = await apiFetch<Character>({
  endpoint: '/characters/123',
  method: 'GET'
});

// With timeout
const result = await apiFetch<any>({
  endpoint: '/llm',
  method: 'POST',
  data: { prompt: "..." },
  timeout: 60000 // 60s
});

// With cancellation
const controller = new AbortController();
const promise = apiFetch<Data>({
  endpoint: '/data',
  signal: controller.signal
});
// Later: controller.abort();

// Using React Query hook
const { data, error, isLoading } = useQuery({
  queryKey: ['characters', projectId],
  queryFn: () => apiFetch<Character[]>({
    endpoint: \`/characters?projectId=\${projectId}\`
  })
});

// Using integration hook
const { data: characters } = useCharacters(projectId);

// Error handling
try {
  await apiFetch({ endpoint: '/endpoint' });
} catch (error) {
  if (isApiError(error)) {
    console.log('API Error:', error.error, error.status);
  } else if (isTimeoutError(error)) {
    console.log('Request timed out');
  } else {
    console.log('Network error');
  }
}

// Optimistic mutation
const mutation = useOptimisticMutation({
  mutationFn: (data) => apiFetch({ endpoint: '/update', method: 'PUT', data }),
  onSuccess: () => queryClient.invalidateQueries(['data'])
});
\`\`\`

## Future Improvements
- [ ] Add request/response interceptors
- [ ] Implement request deduplication
- [ ] Add circuit breaker pattern
- [ ] Support request batching
- [ ] Implement GraphQL client
- [ ] Add API versioning support
- [ ] Implement request caching layer
- [ ] Add request priority queue
- [ ] Support WebSocket connections
- [ ] Add API health monitoring
- [ ] Implement request logging/analytics`,
    filePaths: [
      "src/app/utils/api.ts",
      "src/app/utils/rateLimiter.ts",
      "src/app/types/ApiError.ts",
      "src/app/hooks/useApiErrorHandler.ts",
      "src/app/hooks/useOptimisticMutation.ts",
      "src/app/hooks/integration/useCharacters.ts",
      "src/app/hooks/integration/useActs.ts",
      "src/app/hooks/integration/useScenes.ts",
      "src/app/hooks/integration/useBeats.ts",
      "src/app/hooks/integration/useFactions.ts",
      "src/app/hooks/integration/useTraits.ts",
      "src/app/hooks/integration/useRelationships.ts",
      "src/app/hooks/integration/useFactionRelationships.ts",
      "src/app/hooks/integration/useProjects.ts",
      "src/app/components/dev/RateLimiterMonitor.tsx",
      "src/app/components/dev/EventListenerDebugPanel.tsx",
      "src/app/config/api.ts"
    ]
  },

  {
    name: 'LLM Prompts & Smart Generation System',
    groupId: null,
    description: `## Overview
Comprehensive LLM prompt engineering system providing context-aware, domain-organized prompt templates for AI-powered content generation across characters, scenes, story structure, images, videos, voices, and datasets. Includes smart context gathering functions that build rich project, story, character, scene, and visual style contexts for injecting into LLM prompts. Enables writers, artists, and creators to generate high-quality content with minimal input by leveraging project knowledge.

## Key Capabilities
- Domain-organized prompts: Character, Scene, Story, Image, Video, Voice, Dataset prompts
- Context-aware generation: Automatic project context injection
- Smart context gathering: Functions to build project, story, character, scene, visual style contexts
- Reusable prompt templates: Consistent prompt structures across features
- Character prompts: Backstory, dialogue, traits, personality extraction
- Scene prompts: Scene description, dialogue improvement, smart scene generation
- Story prompts: Act summary, beat description, story overview
- Image prompts: Prompt enhancement, negative prompt generation, prompt from description
- Video prompts: Video prompt enhancement, storyboard generation, motion description, shot composition
- Voice prompts: Voice characterization, voice description
- Dataset prompts: Audio transcription, dataset tagging, image analysis
- Prompt versioning: Track and iterate on prompt templates
- Central prompt export: All prompts exported from single index

## Architecture

### Component Breakdown
| Component/File | Purpose | Layer |
|----------------|---------|-------|
| \`src/prompts/character/characterBackstory.ts\` | Backstory generation prompts | Prompts |
| \`src/prompts/character/characterDialogue.ts\` | Dialogue style prompts | Prompts |
| \`src/prompts/character/characterTrait.ts\` | Trait generation prompts | Prompts |
| \`src/prompts/character/personalityExtraction.ts\` | Personality extraction prompts | Prompts |
| \`src/prompts/character/smartCharacterCreation.ts\` | Smart character generation | Prompts |
| \`src/prompts/scene/sceneDescription.ts\` | Scene description generation | Prompts |
| \`src/prompts/scene/dialogueImprovement.ts\` | Dialogue quality improvement | Prompts |
| \`src/prompts/scene/smartSceneGeneration.ts\` | Context-aware scene generation | Prompts |
| \`src/prompts/story/actSummary.ts\` | Act summary generation | Prompts |
| \`src/prompts/story/beatDescription.ts\` | Beat description generation | Prompts |
| \`src/prompts/story/storyDescription.ts\` | Story overview generation | Prompts |
| \`src/prompts/image/promptEnhancement.ts\` | Image prompt improvement | Prompts |
| \`src/prompts/image/negativePromptSuggestion.ts\` | Negative prompt generation | Prompts |
| \`src/prompts/image/promptFromDescription.ts\` | Convert description to image prompt | Prompts |
| \`src/prompts/image/smartImageGeneration.ts\` | Context-aware image generation | Prompts |
| \`src/prompts/video/videoPromptEnhancement.ts\` | Video prompt improvement | Prompts |
| \`src/prompts/video/storyboardGeneration.ts\` | Storyboard from script | Prompts |
| \`src/prompts/video/motionDescription.ts\` | Motion description generation | Prompts |
| \`src/prompts/video/shotComposition.ts\` | Shot composition guidance | Prompts |
| \`src/prompts/voice/voiceCharacterization.ts\` | Voice character description | Prompts |
| \`src/prompts/voice/voiceDescription.ts\` | Voice attribute description | Prompts |
| \`src/prompts/dataset/audioTranscription.ts\` | Transcription prompts | Prompts |
| \`src/prompts/dataset/datasetTagging.ts\` | AI tagging prompts | Prompts |
| \`src/prompts/dataset/imageAnalysis.ts\` | Image analysis prompts | Prompts |
| \`src/lib/contextGathering.ts\` | Context gathering utilities | Lib |
| \`src/prompts/index.ts\` | Central prompt export | Prompts |
| \`src/prompts/README.md\` | Prompt system documentation | Docs |

### Data Flow
Feature component needs AI generation → Imports prompt from \`src/prompts\` → Calls context gathering function → Rich context built (project, characters, scenes, etc.) → Context injected into prompt template → Prompt sent to LLM via \`/api/llm\` → LLM generates content → Content returned to feature → Feature displays or saves result

### Key Dependencies
- External: OpenAI SDK, Anthropic SDK, Google Generative AI (Gemini), Ollama
- Internal: All feature modules use prompts, LLM API hooks

## Technical Details

### Prompt Organization
\`\`\`
src/prompts/
├── character/        # 5 prompt files
├── scene/           # 3 prompt files
├── story/           # 3 prompt files
├── image/           # 4 prompt files
├── video/           # 4 prompt files
├── voice/           # 2 prompt files
├── dataset/         # 3 prompt files
├── index.ts         # Central export
└── README.md        # Documentation
\`\`\`

### Context Gathering Functions
\`\`\`typescript
// Build project context
function gatherProjectContext(project: Project): string

// Build story context
function gatherStoryContext(project: Project, acts: Act[], scenes: Scene[]): string

// Build character context
function gatherCharacterContext(character: Character, traits: Trait[], relationships: Relationship[]): string

// Build scene context
function gatherSceneContext(scene: Scene, characters: Character[], previousScenes: Scene[]): string

// Build visual style context
function gatherVisualStyleContext(project: Project, images: GeneratedImage[]): string
\`\`\`

### Prompt Template Pattern
\`\`\`typescript
export function generatePrompt(input: Input, context: Context): string {
  return \`
System: You are an expert [domain expert].

Context:
\${context}

Task: [specific task]

Input:
\${input}

Output format: [format specification]

Requirements:
- [requirement 1]
- [requirement 2]
  \`;
}
\`\`\`

## Usage Examples

\`\`\`typescript
// Generate character backstory
import { generateCharacterBackstory } from '@/prompts/character/characterBackstory';
import { gatherProjectContext, gatherCharacterContext } from '@/lib/contextGathering';

const projectContext = gatherProjectContext(project);
const characterContext = gatherCharacterContext(character, traits, relationships);

const prompt = generateCharacterBackstory({
  character,
  projectContext,
  characterContext,
  tone: 'dramatic'
});

const backstory = await llmApi.generate({ prompt, model: 'gpt-4' });

// Enhance image prompt
import { enhanceImagePrompt } from '@/prompts/image/promptEnhancement';

const enhanced = await enhanceImagePrompt({
  original: "a warrior",
  style: "fantasy",
  detailLevel: "high"
});

// Generate scene from context
import { generateSmartScene } from '@/prompts/scene/smartSceneGeneration';

const prompt = generateSmartScene({
  beat: selectedBeat,
  characters: sceneCharacters,
  location: "throne room",
  previousScenes: previousScenes
});

const scene = await llmApi.generate({ prompt });
\`\`\`

## Future Improvements
- [ ] Add prompt A/B testing framework
- [ ] Implement prompt versioning and changelog
- [ ] Add prompt performance metrics
- [ ] Support multi-language prompts
- [ ] Implement prompt caching
- [ ] Add prompt validation (schema checking)
- [ ] Support prompt chaining (multi-step)
- [ ] Implement few-shot learning examples
- [ ] Add prompt debugging tools
- [ ] Support custom user prompts
- [ ] Implement prompt marketplace`,
    filePaths: [
      "src/prompts/character/characterBackstory.ts",
      "src/prompts/character/characterDialogue.ts",
      "src/prompts/character/characterTrait.ts",
      "src/prompts/character/personalityExtraction.ts",
      "src/prompts/character/smartCharacterCreation.ts",
      "src/prompts/scene/sceneDescription.ts",
      "src/prompts/scene/dialogueImprovement.ts",
      "src/prompts/scene/smartSceneGeneration.ts",
      "src/prompts/story/actSummary.ts",
      "src/prompts/story/beatDescription.ts",
      "src/prompts/story/storyDescription.ts",
      "src/prompts/image/promptEnhancement.ts",
      "src/prompts/image/negativePromptSuggestion.ts",
      "src/prompts/image/promptFromDescription.ts",
      "src/prompts/image/smartImageGeneration.ts",
      "src/prompts/video/videoPromptEnhancement.ts",
      "src/prompts/video/storyboardGeneration.ts",
      "src/prompts/video/motionDescription.ts",
      "src/prompts/video/shotComposition.ts",
      "src/prompts/voice/voiceCharacterization.ts",
      "src/prompts/voice/voiceDescription.ts",
      "src/prompts/dataset/audioTranscription.ts",
      "src/prompts/dataset/datasetTagging.ts",
      "src/prompts/dataset/imageAnalysis.ts",
      "src/lib/contextGathering.ts",
      "src/prompts/index.ts",
      "src/prompts/README.md"
    ]
  }
];

(async () => {
  console.log('Creating remaining contexts...\n');

  for (const context of contexts) {
    try {
      await createContext(context);
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`Failed: ${context.name}`, error.message);
    }
  }

  console.log('\n✓ All contexts created!');
})();
