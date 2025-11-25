# Storybook Module Federation - Implementation Requirements

## Project Overview

Build a Next.js application called "Storybook" that aggregates and showcases UI components from multiple external Next.js/Tailwind repositories using Webpack Module Federation. The system should support both local development servers and production deployments.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Storybook Host Application                   │
│                      (Next.js + Tailwind)                       │
│                       localhost:3000                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   Remote Registry                        │   │
│  │  - Manages remote configurations                         │   │
│  │  - Detects local vs production availability              │   │
│  │  - Handles fallback logic                                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│  ┌───────────────┬───────────┴───────────┬───────────────┐     │
│  │   Remote A    │       Remote B        │   Remote C    │     │
│  │ localhost:3001│    localhost:3002     │  Production   │     │
│  │   (local)     │      (local)          │    Only       │     │
│  └───────────────┴───────────────────────┴───────────────┘     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technical Stack

### Required Dependencies

```json
{
  "dependencies": {
    "next": "^14.x",
    "react": "^18.x",
    "react-dom": "^18.x",
    "@module-federation/nextjs-mf": "^8.x",
    "@module-federation/runtime": "^0.x"
  },
  "devDependencies": {
    "tailwindcss": "^3.x",
    "typescript": "^5.x",
    "@types/react": "^18.x",
    "@types/node": "^20.x",
    "concurrently": "^8.x"
  }
}
```

---

## File Structure

```
storybook/
├── app/
│   ├── layout.tsx                 # Root layout with providers
│   ├── page.tsx                   # Main Storybook UI
│   ├── globals.css                # Global styles + Tailwind
│   └── components/
│       └── [remote]/
│           └── [component]/
│               └── page.tsx       # Individual component showcase page
│
├── lib/
│   ├── federation/
│   │   ├── remoteConfig.ts        # Remote definitions and URLs
│   │   ├── remoteLoader.ts        # Smart loading with fallback
│   │   ├── remoteRegistry.ts      # Runtime remote management
│   │   └── types.ts               # TypeScript interfaces
│   │
│   └── utils/
│       └── availability.ts        # Server availability checking
│
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx            # Navigation sidebar
│   │   ├── Header.tsx             # Top header bar
│   │   └── StatusIndicator.tsx    # Remote status badges
│   │
│   ├── showcase/
│   │   ├── ComponentPreview.tsx   # Component render area
│   │   ├── ComponentInfo.tsx      # Metadata display
│   │   ├── PropsEditor.tsx        # Interactive props editing
│   │   └── CodeViewer.tsx         # Source code display
│   │
│   └── common/
│       ├── LoadingSpinner.tsx
│       ├── ErrorBoundary.tsx
│       └── IsolatedRenderer.tsx   # Shadow DOM isolation wrapper
│
├── hooks/
│   ├── useFederation.ts           # Federation initialization hook
│   ├── useRemoteComponent.ts      # Component loading hook
│   └── useRemoteStatus.ts         # Status monitoring hook
│
├── next.config.js                 # Module Federation configuration
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## Core Implementation Requirements

### 1. Remote Configuration System

**File: `lib/federation/types.ts`**

```typescript
export interface RemoteDefinition {
  /** Unique identifier for the remote */
  name: string;
  
  /** Display name for UI */
  displayName: string;
  
  /** Production URL to remoteEntry.js */
  prodEntry: string;
  
  /** Local development URL to remoteEntry.js */
  localEntry: string;
  
  /** Default port for local development */
  localPort: number;
  
  /** List of exposed component paths */
  components: ComponentDefinition[];
  
  /** Optional: Tailwind prefix used by this remote */
  tailwindPrefix?: string;
  
  /** Optional: Description of the remote/project */
  description?: string;
}

export interface ComponentDefinition {
  /** Export name (e.g., "./Button") */
  exposedName: string;
  
  /** Display name for UI */
  displayName: string;
  
  /** Component description */
  description?: string;
  
  /** Default props for preview */
  defaultProps?: Record<string, unknown>;
  
  /** Prop type definitions for the props editor */
  propTypes?: PropTypeDefinition[];
}

export interface PropTypeDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'object' | 'array';
  defaultValue?: unknown;
  options?: string[]; // For select type
  description?: string;
}

export interface RemoteStatus {
  name: string;
  entry: string;
  isLocal: boolean;
  isAvailable: boolean;
  lastChecked: Date;
  error?: string;
}

export interface FederationState {
  initialized: boolean;
  remotes: Map<string, RemoteStatus>;
  error?: string;
}
```

**File: `lib/federation/remoteConfig.ts`**

Requirements:
- Define an array of `RemoteDefinition` objects
- Support environment variable overrides for URLs
- Provide helper functions to get entry URLs based on environment
- Export a function to validate remote configurations

```typescript
// Example structure - implement with actual configuration
export const remotes: RemoteDefinition[] = [
  {
    name: 'designSystem',
    displayName: 'Design System',
    prodEntry: process.env.NEXT_PUBLIC_REMOTE_DESIGN_SYSTEM_PROD || 
               'https://design-system.example.com/_next/static/chunks/remoteEntry.js',
    localEntry: process.env.NEXT_PUBLIC_REMOTE_DESIGN_SYSTEM_LOCAL || 
                'http://localhost:3001/_next/static/chunks/remoteEntry.js',
    localPort: 3001,
    description: 'Core design system components',
    tailwindPrefix: 'ds-',
    components: [
      {
        exposedName: './Button',
        displayName: 'Button',
        description: 'Primary button component',
        defaultProps: { children: 'Click me', variant: 'primary' },
        propTypes: [
          { name: 'variant', type: 'select', options: ['primary', 'secondary', 'ghost'] },
          { name: 'size', type: 'select', options: ['sm', 'md', 'lg'] },
          { name: 'disabled', type: 'boolean', defaultValue: false },
          { name: 'children', type: 'string', defaultValue: 'Button' },
        ],
      },
      // ... more components
    ],
  },
  // ... more remotes
];
```

---

### 2. Smart Remote Loader

**File: `lib/federation/remoteLoader.ts`**

Requirements:
- Check availability of local development servers with timeout (2 seconds max)
- Fall back to production URLs when local is unavailable
- Cache availability status to avoid repeated checks
- Provide a refresh mechanism to re-check availability
- Handle CORS errors gracefully

Key functions to implement:

```typescript
/**
 * Check if a remote server is available
 * @param url - The remoteEntry.js URL to check
 * @param timeout - Timeout in milliseconds (default: 2000)
 * @returns Promise<boolean>
 */
export async function checkRemoteAvailability(url: string, timeout?: number): Promise<boolean>;

/**
 * Initialize all remotes with smart local/production detection
 * @param remotes - Array of remote definitions
 * @returns Promise<RemoteStatus[]>
 */
export async function initializeSmartFederation(remotes: RemoteDefinition[]): Promise<RemoteStatus[]>;

/**
 * Load a component from a remote
 * @param remoteName - The remote identifier
 * @param componentName - The exposed component name
 * @returns Promise<React.ComponentType>
 */
export async function loadRemoteComponent<T = React.ComponentType<unknown>>(
  remoteName: string,
  componentName: string
): Promise<T>;

/**
 * Refresh availability status for all or specific remotes
 * @param remoteNames - Optional array of specific remotes to refresh
 * @returns Promise<RemoteStatus[]>
 */
export async function refreshRemoteStatus(remoteNames?: string[]): Promise<RemoteStatus[]>;

/**
 * Get cached status for a remote
 * @param remoteName - The remote identifier
 * @returns RemoteStatus | undefined
 */
export function getRemoteStatus(remoteName: string): RemoteStatus | undefined;
```

---

### 3. Next.js Configuration

**File: `next.config.js`**

Requirements:
- Configure Module Federation plugin for Next.js
- Set up remotes with environment-aware URLs
- Configure shared dependencies (React, React-DOM) as singletons
- Handle both development and production builds

```javascript
const NextFederationPlugin = require('@module-federation/nextjs-mf');

const isDev = process.env.NODE_ENV === 'development';

// Build remote URLs from environment or defaults
function getRemoteUrl(name, localPort, prodUrl) {
  const envLocal = process.env[`NEXT_PUBLIC_REMOTE_${name.toUpperCase()}_LOCAL`];
  const envProd = process.env[`NEXT_PUBLIC_REMOTE_${name.toUpperCase()}_PROD`];
  
  if (isDev) {
    return `${name}@${envLocal || `http://localhost:${localPort}/_next/static/chunks/remoteEntry.js`}`;
  }
  return `${name}@${envProd || prodUrl}`;
}

module.exports = {
  webpack(config, options) {
    config.plugins.push(
      new NextFederationPlugin({
        name: 'storybook',
        filename: 'static/chunks/remoteEntry.js',
        remotes: {
          // Dynamically build from remoteConfig
          // This should be generated from your remote definitions
        },
        shared: {
          react: { singleton: true, eager: true, requiredVersion: '^18.0.0' },
          'react-dom': { singleton: true, eager: true, requiredVersion: '^18.0.0' },
        },
        extraOptions: {
          automaticAsyncBoundary: true,
        },
      })
    );
    return config;
  },
  // Required for Module Federation
  experimental: {
    esmExternals: 'loose',
  },
};
```

---

### 4. React Hooks

**File: `hooks/useFederation.ts`**

```typescript
/**
 * Hook to initialize and manage Module Federation
 * 
 * Returns:
 * - initialized: boolean - Whether federation is ready
 * - remotes: RemoteStatus[] - Status of all remotes
 * - refresh: () => Promise<void> - Function to refresh remote status
 * - error: string | null - Any initialization error
 */
export function useFederation(): {
  initialized: boolean;
  remotes: RemoteStatus[];
  refresh: () => Promise<void>;
  error: string | null;
};
```

**File: `hooks/useRemoteComponent.ts`**

```typescript
/**
 * Hook to load a remote component
 * 
 * @param remoteName - The remote identifier
 * @param componentName - The exposed component name
 * @param fallback - Optional fallback component
 * 
 * Returns:
 * - Component: React.ComponentType | null - The loaded component
 * - loading: boolean - Loading state
 * - error: Error | null - Any loading error
 * - retry: () => void - Function to retry loading
 */
export function useRemoteComponent<P = unknown>(
  remoteName: string,
  componentName: string,
  fallback?: React.ComponentType<P>
): {
  Component: React.ComponentType<P> | null;
  loading: boolean;
  error: Error | null;
  retry: () => void;
};
```

---

### 5. UI Components

**File: `components/layout/Sidebar.tsx`**

Requirements:
- Display hierarchical list of remotes and their components
- Show status indicators (local/production/offline) for each remote
- Support collapsible remote sections
- Highlight currently selected component
- Show refresh button to re-check remote availability
- Display legend for status indicators

**File: `components/layout/StatusIndicator.tsx`**

Requirements:
- Visual indicator component showing remote status
- Three states: local (green), production (blue), offline (red)
- Tooltip with additional information
- Animated pulse for local development (indicating hot reload)

**File: `components/showcase/ComponentPreview.tsx`**

Requirements:
- Render the loaded remote component in an isolated container
- Wrap in ErrorBoundary to catch render errors
- Support optional Shadow DOM isolation for CSS
- Provide resize handles for responsive testing
- Display loading skeleton while component loads

**File: `components/showcase/PropsEditor.tsx`**

Requirements:
- Generate form controls based on PropTypeDefinition
- Support string, number, boolean, select inputs
- Support JSON editor for object/array props
- Real-time preview updates as props change
- Reset to defaults button

**File: `components/showcase/CodeViewer.tsx`**

Requirements:
- Display usage example code with syntax highlighting
- Show import statement for the component
- Generate example JSX based on current props
- Copy to clipboard functionality

**File: `components/common/IsolatedRenderer.tsx`**

Requirements:
- Wrapper component using Shadow DOM for CSS isolation
- Inject remote project's styles into shadow root
- Handle React portal rendering into shadow DOM
- Support style injection from remote's exposed CSS

---

### 6. Main Application Page

**File: `app/page.tsx`**

Requirements:
- Initialize Module Federation on mount
- Display loading state during initialization
- Show sidebar with remote/component navigation
- Main area for component preview
- Support URL-based component selection (query params or dynamic routes)
- Persist selected component in URL for shareable links

Layout structure:
```
┌─────────────────────────────────────────────────────────────┐
│  Header: Storybook Title | Search | Settings               │
├────────────────┬────────────────────────────────────────────┤
│                │                                            │
│    Sidebar     │           Main Content Area                │
│                │                                            │
│  - Remote A    │  ┌──────────────────────────────────────┐ │
│    - Button    │  │  Component Preview                    │ │
│    - Input     │  │                                       │ │
│  - Remote B    │  │  [Rendered Component Here]            │ │
│    - Card      │  │                                       │ │
│    - Modal     │  └──────────────────────────────────────┘ │
│                │                                            │
│  [Refresh]     │  ┌──────────────────────────────────────┐ │
│                │  │  Props Editor | Code | Info           │ │
│  Legend:       │  │                                       │ │
│  🟢 Local      │  │  [Interactive Controls]               │ │
│  🔵 Production │  │                                       │ │
│  🔴 Offline    │  └──────────────────────────────────────┘ │
│                │                                            │
└────────────────┴────────────────────────────────────────────┘
```

---

### 7. CSS/Tailwind Strategy

**File: `tailwind.config.js`**

Requirements:
- Configure Tailwind for the host application
- Document strategy for handling remote Tailwind conflicts
- Options to implement:
  1. **Prefix strategy**: Each remote uses unique prefix
  2. **CSS Layers**: Use @layer for specificity control
  3. **Shadow DOM**: Isolate remote styles completely

```javascript
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      // Storybook-specific theme extensions
    },
  },
  plugins: [],
  // If using prefix strategy for the host
  // prefix: 'sb-',
};
```

---

### 8. Remote Project Template

Create documentation/template for configuring remote projects:

**Required changes for a remote project:**

```javascript
// Remote project's next.config.js
const NextFederationPlugin = require('@module-federation/nextjs-mf');

module.exports = {
  webpack(config, options) {
    config.plugins.push(
      new NextFederationPlugin({
        name: 'projectName', // Unique identifier
        filename: 'static/chunks/remoteEntry.js',
        exposes: {
          // Expose components
          './Button': './src/components/Button',
          './Input': './src/components/Input',
          // Expose styles if needed
          './styles': './src/styles/components.css',
        },
        shared: {
          react: { singleton: true, eager: true },
          'react-dom': { singleton: true, eager: true },
        },
      })
    );
    return config;
  },
};
```

---

## Environment Variables

```bash
# .env.local

# Remote URLs (optional - defaults will be used if not set)
NEXT_PUBLIC_REMOTE_DESIGNSYSTEM_LOCAL=http://localhost:3001/_next/static/chunks/remoteEntry.js
NEXT_PUBLIC_REMOTE_DESIGNSYSTEM_PROD=https://design-system.example.com/_next/static/chunks/remoteEntry.js

NEXT_PUBLIC_REMOTE_PROJECTA_LOCAL=http://localhost:3002/_next/static/chunks/remoteEntry.js
NEXT_PUBLIC_REMOTE_PROJECTA_PROD=https://project-a.example.com/_next/static/chunks/remoteEntry.js

# Feature flags
NEXT_PUBLIC_ENABLE_SHADOW_DOM_ISOLATION=false
NEXT_PUBLIC_AVAILABILITY_CHECK_TIMEOUT=2000
```

---

## Development Scripts

**File: `package.json` scripts**

```json
{
  "scripts": {
    "dev": "next dev -p 3000",
    "dev:all": "concurrently --names 'HOST,REMOTE1,REMOTE2' --prefix-colors 'yellow,blue,green' \"npm run dev\" \"npm run dev:remote1\" \"npm run dev:remote2\"",
    "dev:remote1": "cd ../project-a && npm run dev -- -p 3001",
    "dev:remote2": "cd ../project-b && npm run dev -- -p 3002",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}
```

---

## Error Handling Requirements

1. **Network Errors**: Gracefully handle when remotes are unreachable
2. **Component Load Errors**: Display meaningful error messages with retry option
3. **Render Errors**: Wrap components in ErrorBoundary, show error UI
4. **Version Mismatches**: Detect and warn about React version conflicts
5. **CORS Issues**: Provide helpful error messages for CORS configuration problems

---

## Testing Considerations

1. **Unit Tests**: Test remote loader logic, availability checking
2. **Integration Tests**: Test component loading from mock remotes
3. **E2E Tests**: Test full flow with actual remote servers
4. **Visual Regression**: Screenshot testing of loaded components

---

## Performance Considerations

1. **Lazy Loading**: Only load remotes/components when needed
2. **Caching**: Cache remoteEntry.js with appropriate headers
3. **Availability Caching**: Don't re-check availability too frequently
4. **Bundle Size**: Monitor host app bundle size, keep it minimal

---

## Security Considerations

1. **Trusted Remotes Only**: Only allow loading from configured remote URLs
2. **CSP Headers**: Configure Content-Security-Policy for remote scripts
3. **Subresource Integrity**: Consider SRI for production remotes
4. **Sanitize Props**: Validate props passed to remote components

---

## Future Enhancements (Out of Scope for Initial Implementation)

1. Component search functionality
2. Component documentation extraction (JSDoc/TSDoc)
3. Component versioning and history
4. Visual diff between component versions
5. Accessibility audit integration
6. Performance metrics for components
7. Component usage analytics
8. Figma/design tool integration
9. API to add new remotes dynamically
10. Authentication for private remotes

---

## Implementation Order

1. **Phase 1: Core Infrastructure**
   - Set up Next.js project with TypeScript and Tailwind
   - Implement remote configuration system
   - Configure Module Federation in next.config.js
   - Implement basic remote loader

2. **Phase 2: Smart Loading**
   - Implement availability checking
   - Add local/production fallback logic
   - Create caching mechanism
   - Add refresh functionality

3. **Phase 3: UI Components**
   - Build Sidebar with navigation
   - Create ComponentPreview area
   - Add StatusIndicator components
   - Implement loading and error states

4. **Phase 4: Enhanced Features**
   - Add PropsEditor for interactive testing
   - Implement CodeViewer
   - Add Shadow DOM isolation option
   - Create responsive preview mode

5. **Phase 5: Polish**
   - Add keyboard navigation
   - Implement URL-based routing
   - Add search functionality
   - Performance optimization

---

## Acceptance Criteria

1. ✅ Can load components from multiple remote Next.js projects
2. ✅ Automatically detects and uses local development servers when available
3. ✅ Falls back to production URLs when local is unavailable
4. ✅ Shows clear status indicators for each remote's source
5. ✅ Hot reload works for locally running remotes
6. ✅ Gracefully handles errors (network, render, load)
7. ✅ Components render correctly with their Tailwind styles
8. ✅ Props can be modified interactively
9. ✅ Component selection is reflected in URL
10. ✅ Refresh button re-checks all remote availability