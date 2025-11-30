# Voicebot Response Cache

## Overview

The voicebot response cache is a lightweight client-side caching system that stores LLM responses in IndexedDB. It reduces latency, bandwidth usage, and backend load by serving repeated commands from cache without network roundtrips.

## Architecture

### Cache Key Generation

Cache keys are generated from:
- **Message content** (normalized: lowercase, trimmed)
- **Conversation history** (last 3 messages for context)
- **Provider** (e.g., 'ollama', 'openai', 'anthropic', 'gemini')

This ensures that the same command in the same context returns the cached response, while different contexts generate new requests.

### Storage

- **Database**: IndexedDB (`voicebot-response-cache`)
- **Object Store**: `responses`
- **Indexes**: `timestamp` (for LRU eviction)

### Cache Entry Structure

```typescript
interface CachedResponse {
  key: string;                // Base64-encoded cache key
  userText: string;           // Original user message
  assistantText: string;      // LLM response text
  audioUrl?: string;          // TTS audio URL (if available)
  timestamp: number;          // Creation timestamp (ms)
  ttl: number;                // Time-to-live (ms)
  conversationHash?: string;  // Hash of conversation history
}
```

## Usage

### Basic Usage

The cache is enabled by default in all voicebot API functions. No code changes are required for basic usage:

```typescript
import { getLLMResponse } from './voicebotApi';

// Cache is automatically used
const response = await getLLMResponse(
  "What's the weather?",
  conversationHistory,
  'ollama',
  'gpt-oss:20b'
);
```

### Custom Configuration

Configure cache behavior using `ResponseCacheConfig`:

```typescript
import { processTextMessage } from './voicebotApi';
import { ResponseCacheConfig } from './voicebotResponseCache';

const cacheConfig: ResponseCacheConfig = {
  enabled: true,           // Enable/disable cache
  ttl: 30 * 60 * 1000,     // 30 minutes TTL
  maxEntries: 100          // Max 100 cached entries (LRU eviction)
};

const result = await processTextMessage(
  "Tell me about the project",
  conversationHistory,
  'gemini',
  'gemini-flash-latest',
  cacheConfig
);
```

### Disable Cache

```typescript
const cacheConfig: ResponseCacheConfig = {
  enabled: false
};

const response = await getLLMResponse(
  message,
  history,
  provider,
  model,
  cacheConfig
);
```

## Cache Management Functions

### Get Cache Statistics

```typescript
import { getResponseCacheStats } from './voicebotResponseCache';

const stats = await getResponseCacheStats();
console.log(`Total entries: ${stats.totalEntries}`);
console.log(`Size: ${stats.totalSizeEstimate} bytes`);
console.log(`Oldest entry: ${new Date(stats.oldestEntry)}`);
```

### Clear Cache

```typescript
import { clearResponseCache } from './voicebotResponseCache';

await clearResponseCache();
```

### Invalidate on Context Change

```typescript
import { invalidateCacheOnNewCommand } from './voicebotResponseCache';

// Call this when conversation context changes significantly
await invalidateCacheOnNewCommand(conversationHistory);
```

## UI Component

Use the `ResponseCacheManager` component to provide users with cache management controls:

```tsx
import ResponseCacheManager from './components/ResponseCacheManager';
import { useState } from 'react';

function MyComponent() {
  const [cacheConfig, setCacheConfig] = useState<ResponseCacheConfig>({
    enabled: true,
    ttl: 60 * 60 * 1000,  // 1 hour
    maxEntries: 50
  });

  return (
    <ResponseCacheManager
      config={cacheConfig}
      onConfigChange={setCacheConfig}
    />
  );
}
```

The component provides:
- Cache enable/disable toggle
- TTL configuration (in minutes)
- Max entries limit
- Real-time statistics
- Clear cache button

## Configuration Options

### TTL (Time-to-Live)

- **Default**: 1 hour (3600000 ms)
- **Range**: Any positive number (in milliseconds)
- **Behavior**: Entries older than TTL are automatically invalidated

```typescript
const config: ResponseCacheConfig = {
  ttl: 5 * 60 * 1000  // 5 minutes
};
```

### Max Entries

- **Default**: Unlimited
- **Range**: Any positive integer
- **Behavior**: LRU eviction when limit is exceeded

```typescript
const config: ResponseCacheConfig = {
  maxEntries: 100  // Keep only 100 most recent entries
};
```

### Enabled

- **Default**: `true`
- **Values**: `true` | `false`
- **Behavior**: When `false`, cache is completely bypassed

```typescript
const config: ResponseCacheConfig = {
  enabled: false  // Disable cache
};
```

## Cache Behavior

### Cache Hit

When a cache hit occurs:
1. Cached response is returned immediately
2. No network request is made
3. Console logs: `"LLM Response cache: Using cached response"`
4. Significant latency reduction

### Cache Miss

When a cache miss occurs:
1. Request is sent to backend API
2. Response is cached asynchronously (non-blocking)
3. Console logs: `"LLM Response cache: Fetching from API"`
4. Subsequent identical requests will hit cache

### Expiration

When a cached entry expires:
1. Entry is invalidated on next access
2. New request is made to backend
3. Old entry is deleted asynchronously
4. Console logs: `"Response cache: Entry expired, invalidating"`

### Eviction (LRU)

When max entries limit is reached:
1. Oldest entries are identified by timestamp
2. Excess entries are deleted
3. Console logs: `"Response cache: Evicting N old entries"`

## Performance Impact

### Benefits

- **Latency**: Reduces response time from ~500-2000ms to <50ms for cache hits
- **Bandwidth**: Eliminates redundant API calls (typical response: 100-500 bytes)
- **Backend Load**: Reduces server load for repeated queries
- **User Experience**: Near-instant responses for common commands

### Tradeoffs

- **Storage**: IndexedDB usage (typically <1MB for 100 entries)
- **Freshness**: Cached responses may be stale if data changes
- **Memory**: Small overhead for cache management logic

## Best Practices

### 1. Set Appropriate TTL

For frequently changing data:
```typescript
{ ttl: 5 * 60 * 1000 }  // 5 minutes
```

For stable data:
```typescript
{ ttl: 24 * 60 * 60 * 1000 }  // 24 hours
```

### 2. Use Max Entries for Client-Side Apps

Prevent unlimited growth:
```typescript
{ maxEntries: 50 }  // Reasonable limit for most use cases
```

### 3. Invalidate on Significant Context Changes

```typescript
// When switching projects or major context changes
await clearResponseCache();
```

### 4. Monitor Cache Statistics

Regularly check cache stats to ensure optimal configuration:
```typescript
const stats = await getResponseCacheStats();
if (stats.totalEntries > 200) {
  console.warn('Cache may be too large, consider reducing maxEntries');
}
```

## Testing

### Verify Cache Hit

```typescript
// First call - cache miss
const response1 = await getLLMResponse("test message", [], 'ollama');
// Console: "LLM Response cache: Fetching from API"

// Second call - cache hit
const response2 = await getLLMResponse("test message", [], 'ollama');
// Console: "LLM Response cache: Using cached response"

// Responses should be identical
console.assert(response1 === response2);
```

### Verify Expiration

```typescript
const config: ResponseCacheConfig = {
  ttl: 1000  // 1 second
};

const response1 = await getLLMResponse("test", [], 'ollama', undefined, config);

// Wait for expiration
await new Promise(resolve => setTimeout(resolve, 1500));

const response2 = await getLLMResponse("test", [], 'ollama', undefined, config);
// Console: "Response cache: Entry expired, invalidating"
// Console: "LLM Response cache: Fetching from API"
```

## Troubleshooting

### Cache Not Working

1. Check if cache is enabled: `config.enabled !== false`
2. Check browser console for errors
3. Verify IndexedDB is available: `'indexedDB' in window`
4. Check cache stats: `await getResponseCacheStats()`

### Stale Responses

1. Reduce TTL: `{ ttl: 5 * 60 * 1000 }`
2. Clear cache manually: `await clearResponseCache()`
3. Invalidate on context changes

### Storage Issues

1. Check IndexedDB quota (browser limits)
2. Reduce max entries: `{ maxEntries: 20 }`
3. Clear cache: `await clearResponseCache()`

## Implementation Files

- **voicebotResponseCache.ts** - Core cache implementation
- **voicebotApi.ts** - Integration with API functions
- **voicebotTypes.ts** - Type definitions
- **ResponseCacheManager.tsx** - UI component for cache management

## Future Enhancements

Potential improvements:
- Compression for cached responses
- Selective caching based on query type
- Cache warming for common queries
- Distributed cache synchronization
- Cache versioning for breaking changes
