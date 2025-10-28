# Error Classification and Recovery System

## Overview

This centralized error handling system provides consistent error classification, user-friendly error messages, and intelligent recovery strategies across the Vibeman application.

## Architecture

### Core Components

1. **ErrorClassifier** (`src/lib/errorClassifier.ts`)
   - Classifies errors into standard types (Network, Timeout, Auth, Server, etc.)
   - Provides user-friendly error messages
   - Suggests recovery actions
   - Determines if errors are transient (retry-able)

2. **ErrorContext** (`src/contexts/ErrorContext.tsx`)
   - React context for dependency injection
   - Centralized error state management
   - Automatic retry logic with exponential backoff
   - Error notification system

3. **ErrorBoundary** (`src/components/errors/ErrorBoundary.tsx`)
   - Catches React component errors
   - Provides default error UI
   - Supports custom fallback components
   - InlineErrorDisplay for in-page errors

4. **useErrorHandler Hook** (`src/hooks/useErrorHandler.ts`)
   - Custom React hook for error handling
   - Automatic error classification
   - Retry logic for transient errors
   - Simplified fetch error handling

## Error Types

```typescript
enum ErrorType {
  NETWORK = 'NETWORK',        // Network connection issues
  VALIDATION = 'VALIDATION',  // Input validation errors
  TIMEOUT = 'TIMEOUT',        // Request timeouts
  AUTH = 'AUTH',              // Authentication/authorization
  SERVER = 'SERVER',          // Server errors (5xx)
  NOT_FOUND = 'NOT_FOUND',    // Resource not found (404)
  RATE_LIMIT = 'RATE_LIMIT',  // Rate limiting (429)
  UNKNOWN = 'UNKNOWN',        // Unknown errors
}
```

## Recovery Actions

```typescript
enum RecoveryAction {
  RETRY = 'RETRY',                      // Simple retry
  RETRY_WITH_BACKOFF = 'RETRY_WITH_BACKOFF', // Retry with exponential backoff
  REFRESH = 'REFRESH',                  // Refresh the page
  LOGIN = 'LOGIN',                      // Re-authenticate
  CONTACT_SUPPORT = 'CONTACT_SUPPORT',  // Contact support
  CHECK_INPUT = 'CHECK_INPUT',          // Validate input
  WAIT_AND_RETRY = 'WAIT_AND_RETRY',    // Wait then retry
  NONE = 'NONE',                        // No action available
}
```

## Usage Examples

### 1. Using useErrorHandler Hook (Recommended)

```typescript
import { useRetryErrorHandler } from '@/hooks/useErrorHandler';
import { InlineErrorDisplay } from '@/components/errors/ErrorBoundary';

function MyComponent() {
  const {
    error,
    isError,
    executeFetchWithRetry,
    clearError,
    retryCount,
  } = useRetryErrorHandler('MyComponent', 3); // 3 max retries

  const loadData = async () => {
    const data = await executeFetchWithRetry('/api/my-endpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ foo: 'bar' }),
    });

    if (data) {
      // Success - use data
    }
  };

  return (
    <div>
      {isError && error && (
        <InlineErrorDisplay
          error={error}
          onRetry={loadData}
          onDismiss={clearError}
        />
      )}
      {/* Your component content */}
    </div>
  );
}
```

### 2. Using ErrorClassifier Directly

```typescript
import { ErrorClassifier } from '@/lib/errorClassifier';

try {
  const response = await fetch('/api/endpoint');

  if (!response.ok) {
    const classified = await ErrorClassifier.fromFetchResponse(response);
    console.log(classified.userMessage); // User-friendly message
    console.log(classified.type);        // Error type
    console.log(classified.shouldRetry); // Should retry?
  }
} catch (error) {
  const classified = ErrorClassifier.classify(error);
  console.log(classified.userMessage);
}
```

### 3. Using ErrorContext for Retry Logic

```typescript
import { useErrorContext } from '@/contexts/ErrorContext';

function MyComponent() {
  const { executeWithRetry } = useErrorContext();

  const loadData = async () => {
    const data = await executeWithRetry(
      async () => {
        const res = await fetch('/api/endpoint');
        if (!res.ok) throw new Error('Failed');
        return res.json();
      },
      3, // max retries
      'MyComponent' // context name
    );

    if (data) {
      // Success
    }
  };

  return <div>{/* ... */}</div>;
}
```

### 4. Using ErrorBoundary

```typescript
import { ErrorBoundary } from '@/components/errors/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <YourComponent />
    </ErrorBoundary>
  );
}

// With custom fallback
function App() {
  return (
    <ErrorBoundary
      fallback={(error, reset) => (
        <div>
          <h1>Custom Error UI</h1>
          <p>{error.userMessage}</p>
          <button onClick={reset}>Try Again</button>
        </div>
      )}
    >
      <YourComponent />
    </ErrorBoundary>
  );
}
```

## Error Classification Patterns

The ErrorClassifier automatically detects error types based on:

- **Network Errors**: Connection failures, ECONNREFUSED
- **Timeout Errors**: ETIMEDOUT, "timeout" in message
- **Auth Errors**: 401/403 status codes
- **Not Found**: 404 status code
- **Rate Limit**: 429 status code
- **Server Errors**: 500-599 status codes
- **Validation**: 400 status code, "validation" in message

## Automatic Retry Strategy

The system implements exponential backoff for retries:

```typescript
// Base delay from error classification
const delay = classified.retryDelay || 1000; // ms

// Exponential backoff calculation
const backoffDelay = delay * Math.pow(1.5, attempt - 1);

// Example progression:
// Attempt 1: 1000ms
// Attempt 2: 1500ms
// Attempt 3: 2250ms
```

## Best Practices

1. **Use the Right Hook**
   - `useRetryErrorHandler` - For operations that should auto-retry (API calls)
   - `useSimpleErrorHandler` - For operations without retry (validation)

2. **Provide Context**
   - Always provide a context string for debugging
   - Example: `useRetryErrorHandler('ClaudeLogViewer', 3)`

3. **User-Friendly Messages**
   - Display `error.userMessage` to users
   - Log `error.message` for debugging
   - Use `InlineErrorDisplay` for consistent UI

4. **Handle Transient vs Permanent Errors**
   - Transient errors (network, timeout) → Auto-retry
   - Permanent errors (validation, auth) → No retry, fix input

5. **Cleanup on Unmount**
   - Clear errors when component unmounts if needed
   - Use `clearError()` method

## Integration Points

This system is integrated into:

- ✅ `ClaudeLogViewer` - Log file loading with auto-retry
- ✅ `ClaudeRequirementInput` - Requirement creation with validation
- ✅ `AnnettePage` - Enhanced error logging
- ✅ Root Layout - ErrorProvider context

## Future Enhancements

Potential improvements:

1. **Toast Notifications**
   - Integrate with toast library for non-blocking notifications

2. **Error Analytics**
   - Track error patterns
   - Identify systemic issues

3. **Offline Support**
   - Detect offline state
   - Queue operations for later

4. **Circuit Breaker**
   - Prevent repeated failures
   - Temporary disable failing endpoints

## API Reference

See JSDoc comments in source files for detailed API documentation:
- `src/lib/errorClassifier.ts`
- `src/contexts/ErrorContext.tsx`
- `src/hooks/useErrorHandler.ts`
- `src/components/errors/ErrorBoundary.tsx`
