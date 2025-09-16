# Multi-LLM Client Library

A unified interface for multiple Large Language Model providers including OpenAI, Anthropic, Google Gemini, Ollama, and internal APIs.

## Features

- **Unified Interface**: Single API for all LLM providers
- **Automatic Provider Selection**: Smart selection based on availability and task type
- **Fallback Support**: Automatic fallback to alternative providers
- **Event Logging**: Comprehensive logging with the existing eventDb system
- **Local Storage**: Secure API key management in browser localStorage
- **Progress Tracking**: Real-time progress updates for long-running requests
- **Error Handling**: Robust error handling with detailed error messages
- **Standalone Clients**: Each provider can be used independently

## Quick Start

```typescript
import { generateWithLLM, llmManager } from '@/app/lib/llm';

// Simple generation with default provider
const response = await generateWithLLM('Hello, world!');

// Generation with specific provider
const response = await generateWithLLM('Write a story', {
  provider: 'anthropic',
  model: 'claude-3-haiku-20240307',
  maxTokens: 1000,
  temperature: 0.7
});

// Check provider availability
const isAvailable = await llmManager.checkProviderAvailability('openai');
```

## Supported Providers

### OpenAI (ChatGPT)
- **Models**: GPT-4, GPT-3.5-turbo, etc.
- **API Key Required**: Yes
- **Endpoint**: https://api.openai.com/v1

### Anthropic (Claude)
- **Models**: Claude-3 Opus, Sonnet, Haiku, Claude-2.1, etc.
- **API Key Required**: Yes
- **Endpoint**: https://api.anthropic.com/v1

### Google Gemini
- **Models**: Gemini-1.5-pro, Gemini-1.5-flash, Gemini-1.0-pro
- **API Key Required**: Yes
- **Endpoint**: https://generativelanguage.googleapis.com/v1beta

### Ollama (Local)
- **Models**: Any locally installed Ollama model
- **API Key Required**: No
- **Endpoint**: http://localhost:11434 (configurable)

### Internal API
- **Models**: Configurable
- **API Key Required**: No
- **Endpoint**: /api/llm (internal)

## API Key Management

```typescript
import { APIKeyStorage } from '@/app/lib/llm';

// Set API key
APIKeyStorage.setAPIKey('openai', 'sk-...', {
  organization: 'org-...' // optional
});

// Get API key
const config = APIKeyStorage.getAPIKey('openai');

// Check if API key exists
const hasKey = APIKeyStorage.hasAPIKey('anthropic');

// Remove API key
APIKeyStorage.removeAPIKey('gemini');
```

## Provider Configuration

```typescript
import { ProviderConfigStorage, DefaultProviderStorage } from '@/app/lib/llm';

// Enable/disable provider
ProviderConfigStorage.setProviderEnabled('ollama', true);

// Set provider configuration
ProviderConfigStorage.setProviderConfig('ollama', {
  baseUrl: 'http://localhost:11434',
  model: 'llama2:7b',
  enabled: true
});

// Set default provider
DefaultProviderStorage.setDefaultProvider('anthropic');
```

## Advanced Usage

### Using Individual Clients

```typescript
import { OpenAIClient, AnthropicClient } from '@/app/lib/llm';

// Create client instance
const openai = new OpenAIClient({ apiKey: 'sk-...' });

// Generate with progress tracking
const response = await openai.generate({
  prompt: 'Explain quantum computing',
  model: 'gpt-4',
  maxTokens: 500
}, {
  onProgress: (progress, message) => {
    console.log(`${progress}%: ${message}`);
  },
  onComplete: (response) => {
    console.log('Generation complete:', response);
  }
});
```

### Smart Provider Selection

```typescript
import { generateWithBestProvider } from '@/app/lib/llm/utils';

// Automatically select best provider for task
const response = await generateWithBestProvider(
  'Review this code for bugs',
  {
    taskType: 'code_review',
    preferredProvider: 'anthropic' // fallback if not available
  }
);
```

### Fallback Generation

```typescript
import { generateWithFallback } from '@/app/lib/llm/utils';

// Try multiple providers in order
const response = await generateWithFallback(
  'Generate a summary',
  {
    providers: ['anthropic', 'openai', 'ollama'],
    maxTokens: 200
  }
);
```

### Batch Generation

```typescript
import { generateWithMultipleProviders } from '@/app/lib/llm/utils';

// Generate with multiple providers for comparison
const results = await generateWithMultipleProviders(
  'What is the meaning of life?',
  ['openai', 'anthropic', 'gemini']
);

console.log(results.openai.response);
console.log(results.anthropic.response);
```

## Event Logging

All LLM operations are automatically logged to the eventDb system:

```typescript
// Events are automatically created for:
// - Generation start/completion/errors
// - Token usage and performance metrics
// - Provider availability checks
// - API errors and rate limits

// Access events via existing API
const events = await fetch('/api/kiro/events?projectId=my-project');
```

## Error Handling

```typescript
const response = await generateWithLLM('Hello', {
  provider: 'openai'
});

if (!response.success) {
  console.error('Generation failed:', response.error);
  console.log('Error code:', response.errorCode);
  console.log('Provider:', response.provider);
}
```

## Utility Functions

```typescript
import { 
  estimateTokenCount, 
  truncateToTokenLimit,
  getProviderStatus,
  validateLLMRequest 
} from '@/app/lib/llm/utils';

// Estimate token count
const tokens = estimateTokenCount('Hello world');

// Truncate text to fit token limit
const truncated = truncateToTokenLimit(longText, 1000);

// Get provider status
const status = await getProviderStatus();

// Validate request
const validation = validateLLMRequest({
  prompt: 'Hello',
  maxTokens: 100,
  temperature: 0.7
});
```

## Internal API Endpoints

The library includes internal API endpoints:

- `POST /api/llm/generate` - Generate text
- `GET /api/llm/health` - Health check
- `GET /api/llm/models` - List available models

## Migration from Ollama Client

The existing Ollama client remains unchanged and is still available:

```typescript
// Old way (still works)
import { generateWithOllama } from '@/lib/ollama';

// New way (recommended)
import { generateWithLLM } from '@/app/lib/llm';

const response = await generateWithLLM('Hello', {
  provider: 'ollama'
});
```

## Configuration Examples

### Complete Setup

```typescript
import { 
  APIKeyStorage, 
  ProviderConfigStorage, 
  DefaultProviderStorage 
} from '@/app/lib/llm';

// Set up API keys
APIKeyStorage.setAPIKey('openai', 'sk-...');
APIKeyStorage.setAPIKey('anthropic', 'sk-ant-...');
APIKeyStorage.setAPIKey('gemini', 'AI...');

// Configure providers
ProviderConfigStorage.setProviderConfig('ollama', {
  baseUrl: 'http://localhost:11434',
  enabled: true
});

// Set default provider
DefaultProviderStorage.setDefaultProvider('anthropic');
```

### Export/Import Settings

```typescript
import { StorageUtils } from '@/app/lib/llm';

// Export all settings
const settings = StorageUtils.exportSettings();

// Import settings
const success = StorageUtils.importSettings(settingsJson);

// Clear all settings
StorageUtils.clearAllSettings();
```

## Best Practices

1. **Always check provider availability** before making requests
2. **Use appropriate models** for different tasks
3. **Set reasonable token limits** to control costs
4. **Handle errors gracefully** with fallback providers
5. **Store API keys securely** (they're encrypted in localStorage)
6. **Use progress callbacks** for long-running operations
7. **Log important operations** with projectId for tracking

## Troubleshooting

### Common Issues

1. **"Provider not available"**: Check API keys and network connectivity
2. **"Rate limit exceeded"**: Implement retry logic with exponential backoff
3. **"Invalid API key"**: Verify API key format and permissions
4. **"Model not found"**: Check available models with `getProviderModels()`
5. **"Request timeout"**: Increase timeout or reduce request complexity

### Debug Mode

Enable debug logging by setting localStorage:

```typescript
localStorage.setItem('llm_debug', 'true');
```