/**
 * DocsAnalysis Mock Data
 * Hardcoded dummy data for the 3-level documentation module
 */

import {
  SystemModule,
  UseCase,
  ApiOrLibrary,
  DataSource,
} from './types';

// ============================================
// LEVEL 1: System Modules
// ============================================

export const systemModules: SystemModule[] = [
  // PAGES LAYER - Top-level routes and page components
  {
    id: 'home-page',
    name: 'Home Page',
    description: 'Main landing page with hero and navigation',
    layer: 'pages',
    icon: '🏠',
    color: '#f472b6', // pink
    connections: ['ui-components', 'state-management'],
    useCases: ['uc-hero-section', 'uc-navigation'],
    position: { x: 0, y: 0 }, // Will be calculated dynamically
  },
  {
    id: 'dashboard-page',
    name: 'Dashboard',
    description: 'Main user dashboard with analytics and widgets',
    layer: 'pages',
    icon: '📊',
    color: '#a78bfa', // violet
    connections: ['feature-modules', 'state-management', 'api-gateway'],
    useCases: ['uc-dashboard-widgets', 'uc-user-stats'],
    position: { x: 0, y: 0 },
  },
  {
    id: 'docs-page',
    name: 'Documentation',
    description: 'Documentation viewer with markdown rendering',
    layer: 'pages',
    icon: '📚',
    color: '#38bdf8', // sky
    connections: ['feature-modules', 'ui-components'],
    useCases: ['uc-docs-viewer', 'uc-search'],
    position: { x: 0, y: 0 },
  },
  {
    id: 'settings-page',
    name: 'Settings',
    description: 'User settings and preferences management',
    layer: 'pages',
    icon: '⚙️',
    color: '#94a3b8', // slate
    connections: ['auth-service', 'state-management'],
    useCases: ['uc-profile-settings', 'uc-preferences'],
    position: { x: 0, y: 0 },
  },

  // CLIENT LAYER
  {
    id: 'ui-components',
    name: 'UI Components',
    description: 'Reusable React components with Framer Motion animations',
    layer: 'client',
    icon: '🎨',
    color: '#06b6d4', // cyan
    connections: ['api-gateway', 'state-management'],
    useCases: ['uc-component-library', 'uc-theming', 'uc-animations'],
    position: { x: 15, y: 25 },
  },
  {
    id: 'state-management',
    name: 'State Management',
    description: 'Zustand stores for global application state',
    layer: 'client',
    icon: '🧠',
    color: '#8b5cf6', // violet
    connections: ['ui-components', 'api-gateway'],
    useCases: ['uc-project-store', 'uc-user-store', 'uc-cache'],
    position: { x: 35, y: 20 },
  },
  {
    id: 'feature-modules',
    name: 'Feature Modules',
    description: 'Self-contained feature implementations',
    layer: 'client',
    icon: '📦',
    color: '#10b981', // emerald
    connections: ['ui-components', 'state-management', 'api-gateway'],
    useCases: ['uc-docs-viewer', 'uc-task-manager', 'uc-analytics'],
    position: { x: 25, y: 40 },
  },

  // SERVER LAYER
  {
    id: 'api-gateway',
    name: 'API Gateway',
    description: 'Next.js API routes and middleware',
    layer: 'server',
    icon: '🚀',
    color: '#f59e0b', // amber
    connections: ['feature-modules', 'database-layer', 'auth-service'],
    useCases: ['uc-rest-endpoints', 'uc-validation', 'uc-rate-limiting'],
    position: { x: 55, y: 30 },
  },
  {
    id: 'database-layer',
    name: 'Database Layer',
    description: 'Prisma ORM with PostgreSQL',
    layer: 'server',
    icon: '🗄️',
    color: '#ec4899', // pink
    connections: ['api-gateway', 'auth-service'],
    useCases: ['uc-data-models', 'uc-migrations', 'uc-queries'],
    position: { x: 70, y: 25 },
  },
  {
    id: 'auth-service',
    name: 'Auth Service',
    description: 'Authentication and authorization',
    layer: 'server',
    icon: '🔐',
    color: '#ef4444', // red
    connections: ['api-gateway', 'database-layer', 'external-oauth'],
    useCases: ['uc-jwt-tokens', 'uc-permissions', 'uc-sessions'],
    position: { x: 60, y: 50 },
  },

  // EXTERNAL LAYER
  {
    id: 'external-oauth',
    name: 'OAuth Providers',
    description: 'Google, GitHub, Discord auth',
    layer: 'external',
    icon: '🌐',
    color: '#6366f1', // indigo
    connections: ['auth-service'],
    useCases: ['uc-google-auth', 'uc-github-auth'],
    position: { x: 85, y: 35 },
  },
  {
    id: 'ai-services',
    name: 'AI Services',
    description: 'OpenAI, Claude, and other LLM integrations',
    layer: 'external',
    icon: '🤖',
    color: '#22c55e', // green
    connections: ['api-gateway'],
    useCases: ['uc-chat-completion', 'uc-embeddings', 'uc-analysis'],
    position: { x: 80, y: 55 },
  },
  {
    id: 'cloud-storage',
    name: 'Cloud Storage',
    description: 'S3, Cloudflare R2 for file storage',
    layer: 'external',
    icon: '☁️',
    color: '#0ea5e9', // sky
    connections: ['api-gateway'],
    useCases: ['uc-file-upload', 'uc-cdn'],
    position: { x: 90, y: 20 },
  },
];

// ============================================
// LEVEL 2: Use Cases
// ============================================

export const useCases: UseCase[] = [
  // UI Components use cases
  {
    id: 'uc-component-library',
    moduleId: 'ui-components',
    name: 'Component Library',
    description: 'Core UI building blocks',
    icon: '🧩',
    apis: ['api-components'],
    dataSources: ['ds-design-tokens'],
    documentation: `# Component Library

## Overview
The component library provides a set of reusable, accessible UI components built with React and Tailwind CSS.

## Key Components

### Buttons
- \`PrimaryButton\` - Main action buttons with gradient effects
- \`SecondaryButton\` - Secondary actions with outline style
- \`IconButton\` - Icon-only buttons for compact UIs

### Cards
- \`BaseCard\` - Foundation card with glass morphism
- \`FeatureCard\` - Rich cards with hover animations
- \`StatCard\` - Numeric display cards

### Layout
- \`Container\` - Responsive max-width container
- \`Grid\` - Flexible grid system
- \`Stack\` - Vertical/horizontal stacking

## Usage Example

\`\`\`tsx
import { PrimaryButton, FeatureCard } from '@/components';

export function MyFeature() {
  return (
    <FeatureCard title="Amazing Feature">
      <p>Feature description here</p>
      <PrimaryButton onClick={handleClick}>
        Get Started
      </PrimaryButton>
    </FeatureCard>
  );
}
\`\`\`

## Design Principles
1. **Accessibility First** - All components are keyboard navigable
2. **Animation Ready** - Built-in Framer Motion support
3. **Theme Aware** - Respects system color scheme
`,
  },
  {
    id: 'uc-theming',
    moduleId: 'ui-components',
    name: 'Theming System',
    description: 'Dynamic theme configuration',
    icon: '🎭',
    apis: ['lib-tailwind'],
    dataSources: ['ds-design-tokens'],
    documentation: `# Theming System

## Color Palette
The app uses a sophisticated dark theme with accent colors...`,
  },
  {
    id: 'uc-animations',
    moduleId: 'ui-components',
    name: 'Animation Library',
    description: 'Framer Motion presets and hooks',
    icon: '✨',
    apis: ['lib-framer'],
    dataSources: [],
    documentation: `# Animation Library

## Motion Presets
Pre-configured animation variants for common patterns...`,
  },

  // State Management use cases
  {
    id: 'uc-project-store',
    moduleId: 'state-management',
    name: 'Project Store',
    description: 'Active project state management',
    icon: '📂',
    apis: ['api-projects', 'lib-zustand'],
    dataSources: ['ds-localstorage'],
    documentation: `# Project Store

## Overview
Manages the currently active project and project list using Zustand.

## Store Structure
\`\`\`typescript
interface ProjectStore {
  activeProject: Project | null;
  projects: Project[];
  setActiveProject: (project: Project) => void;
  fetchProjects: () => Promise<void>;
}
\`\`\`

## Usage
\`\`\`typescript
const { activeProject, setActiveProject } = useProjectStore();
\`\`\`
`,
  },
  {
    id: 'uc-user-store',
    moduleId: 'state-management',
    name: 'User Store',
    description: 'User session and preferences',
    icon: '👤',
    apis: ['api-auth', 'lib-zustand'],
    dataSources: ['ds-localstorage', 'ds-cookies'],
  },
  {
    id: 'uc-cache',
    moduleId: 'state-management',
    name: 'Cache Layer',
    description: 'SWR and React Query caching',
    icon: '💾',
    apis: ['lib-swr'],
    dataSources: ['ds-memory'],
  },

  // Feature Modules use cases
  {
    id: 'uc-docs-viewer',
    moduleId: 'feature-modules',
    name: 'Documentation Viewer',
    description: 'Markdown rendering and navigation',
    icon: '📖',
    apis: ['api-contexts', 'lib-markdown'],
    dataSources: ['ds-postgres'],
    documentation: `# Documentation Viewer

## Features
- Real-time markdown preview
- Syntax highlighting for code blocks
- Table of contents generation
- Search within documentation
`,
  },
  {
    id: 'uc-task-manager',
    moduleId: 'feature-modules',
    name: 'Task Manager',
    description: 'Implementation log management',
    icon: '✅',
    apis: ['api-tasks', 'api-implementations'],
    dataSources: ['ds-postgres'],
  },
  {
    id: 'uc-analytics',
    moduleId: 'feature-modules',
    name: 'Analytics Dashboard',
    description: 'Project metrics and insights',
    icon: '📊',
    apis: ['api-analytics'],
    dataSources: ['ds-postgres', 'ds-redis'],
  },

  // API Gateway use cases
  {
    id: 'uc-rest-endpoints',
    moduleId: 'api-gateway',
    name: 'REST Endpoints',
    description: 'Next.js API route handlers',
    icon: '🔌',
    apis: ['api-projects', 'api-contexts', 'api-tasks'],
    dataSources: ['ds-postgres'],
    documentation: `# REST Endpoints

## Architecture
All API routes follow RESTful conventions with Next.js App Router.

## Endpoint Structure
\`\`\`
/api/projects         GET, POST
/api/projects/[id]    GET, PUT, DELETE
/api/contexts         GET, POST
/api/tasks            GET, POST, PATCH
\`\`\`

## Response Format
\`\`\`json
{
  "success": true,
  "data": { ... },
  "meta": {
    "total": 100,
    "page": 1
  }
}
\`\`\`
`,
  },
  {
    id: 'uc-validation',
    moduleId: 'api-gateway',
    name: 'Request Validation',
    description: 'Zod schema validation',
    icon: '🛡️',
    apis: ['lib-zod'],
    dataSources: [],
  },
  {
    id: 'uc-rate-limiting',
    moduleId: 'api-gateway',
    name: 'Rate Limiting',
    description: 'Request throttling and quotas',
    icon: '⏱️',
    apis: ['lib-upstash'],
    dataSources: ['ds-redis'],
  },

  // Database Layer use cases
  {
    id: 'uc-data-models',
    moduleId: 'database-layer',
    name: 'Data Models',
    description: 'Prisma schema definitions',
    icon: '📋',
    apis: ['lib-prisma'],
    dataSources: ['ds-postgres'],
    documentation: `# Data Models

## Core Entities

### Project
\`\`\`prisma
model Project {
  id          String   @id @default(cuid())
  name        String
  path        String   @unique
  description String?
  contexts    Context[]
  createdAt   DateTime @default(now())
}
\`\`\`

### Context
\`\`\`prisma
model Context {
  id          String   @id @default(cuid())
  name        String
  description String?
  projectId   String
  project     Project  @relation(fields: [projectId])
}
\`\`\`
`,
  },
  {
    id: 'uc-migrations',
    moduleId: 'database-layer',
    name: 'Migrations',
    description: 'Database schema evolution',
    icon: '🔄',
    apis: ['lib-prisma'],
    dataSources: ['ds-postgres'],
  },
  {
    id: 'uc-queries',
    moduleId: 'database-layer',
    name: 'Query Optimization',
    description: 'Efficient data fetching patterns',
    icon: '⚡',
    apis: ['lib-prisma'],
    dataSources: ['ds-postgres'],
  },

  // Auth Service use cases
  {
    id: 'uc-jwt-tokens',
    moduleId: 'auth-service',
    name: 'JWT Tokens',
    description: 'Token generation and validation',
    icon: '🎫',
    apis: ['lib-jose'],
    dataSources: ['ds-redis'],
  },
  {
    id: 'uc-permissions',
    moduleId: 'auth-service',
    name: 'Permissions',
    description: 'Role-based access control',
    icon: '🔑',
    apis: ['api-auth'],
    dataSources: ['ds-postgres'],
  },
  {
    id: 'uc-sessions',
    moduleId: 'auth-service',
    name: 'Session Management',
    description: 'User session handling',
    icon: '🎯',
    apis: ['lib-iron-session'],
    dataSources: ['ds-redis', 'ds-cookies'],
  },

  // External OAuth use cases
  {
    id: 'uc-google-auth',
    moduleId: 'external-oauth',
    name: 'Google OAuth',
    description: 'Google Sign-In integration',
    icon: '🔵',
    apis: ['ext-google-oauth'],
    dataSources: [],
  },
  {
    id: 'uc-github-auth',
    moduleId: 'external-oauth',
    name: 'GitHub OAuth',
    description: 'GitHub authentication',
    icon: '⚫',
    apis: ['ext-github-oauth'],
    dataSources: [],
  },

  // AI Services use cases
  {
    id: 'uc-chat-completion',
    moduleId: 'ai-services',
    name: 'Chat Completion',
    description: 'LLM text generation',
    icon: '💬',
    apis: ['ext-openai', 'ext-anthropic'],
    dataSources: ['ds-postgres'],
    documentation: `# Chat Completion

## Overview
Integration with multiple LLM providers for text generation.

## Supported Models
- OpenAI GPT-4, GPT-4 Turbo
- Anthropic Claude 3, Claude 3.5
- Local models via Ollama

## Usage
\`\`\`typescript
const response = await aiService.complete({
  model: 'gpt-4-turbo',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Hello!' }
  ],
  temperature: 0.7
});
\`\`\`
`,
  },
  {
    id: 'uc-embeddings',
    moduleId: 'ai-services',
    name: 'Embeddings',
    description: 'Vector embeddings for search',
    icon: '🧬',
    apis: ['ext-openai'],
    dataSources: ['ds-vector-db'],
  },
  {
    id: 'uc-analysis',
    moduleId: 'ai-services',
    name: 'Code Analysis',
    description: 'AI-powered code review',
    icon: '🔍',
    apis: ['ext-anthropic'],
    dataSources: ['ds-postgres'],
  },

  // Cloud Storage use cases
  {
    id: 'uc-file-upload',
    moduleId: 'cloud-storage',
    name: 'File Upload',
    description: 'Direct uploads to S3/R2',
    icon: '📤',
    apis: ['ext-aws-s3', 'ext-cloudflare-r2'],
    dataSources: ['ds-s3'],
  },
  {
    id: 'uc-cdn',
    moduleId: 'cloud-storage',
    name: 'CDN Delivery',
    description: 'Edge-cached asset delivery',
    icon: '🌍',
    apis: ['ext-cloudflare'],
    dataSources: ['ds-s3'],
  },
];

// ============================================
// LEVEL 2: APIs and Libraries (Middle Column)
// ============================================

export const apisAndLibraries: ApiOrLibrary[] = [
  // Internal APIs
  {
    id: 'api-projects',
    name: '/api/projects',
    description: 'Project CRUD operations',
    type: 'api',
    method: 'GET',
    path: '/api/projects',
  },
  {
    id: 'api-contexts',
    name: '/api/contexts',
    description: 'Context management',
    type: 'api',
    method: 'GET',
    path: '/api/contexts',
  },
  {
    id: 'api-tasks',
    name: '/api/tasks',
    description: 'Task management',
    type: 'api',
    method: 'POST',
    path: '/api/tasks',
  },
  {
    id: 'api-implementations',
    name: '/api/implementations',
    description: 'Implementation logs',
    type: 'api',
    method: 'GET',
    path: '/api/implementation-logs',
  },
  {
    id: 'api-auth',
    name: '/api/auth',
    description: 'Authentication endpoints',
    type: 'api',
    method: 'POST',
    path: '/api/auth',
  },
  {
    id: 'api-analytics',
    name: '/api/analytics',
    description: 'Analytics data',
    type: 'api',
    method: 'GET',
    path: '/api/analytics',
  },
  {
    id: 'api-components',
    name: '/api/components',
    description: 'Component registry',
    type: 'api',
    method: 'GET',
    path: '/api/components',
  },

  // Libraries
  {
    id: 'lib-zustand',
    name: 'Zustand',
    description: 'Lightweight state management',
    type: 'library',
    version: '4.5.0',
  },
  {
    id: 'lib-framer',
    name: 'Framer Motion',
    description: 'Production-ready animations',
    type: 'library',
    version: '11.0.0',
  },
  {
    id: 'lib-prisma',
    name: 'Prisma',
    description: 'Next-gen TypeScript ORM',
    type: 'library',
    version: '5.10.0',
  },
  {
    id: 'lib-zod',
    name: 'Zod',
    description: 'TypeScript-first schema validation',
    type: 'library',
    version: '3.22.0',
  },
  {
    id: 'lib-swr',
    name: 'SWR',
    description: 'React hooks for data fetching',
    type: 'library',
    version: '2.2.0',
  },
  {
    id: 'lib-tailwind',
    name: 'Tailwind CSS',
    description: 'Utility-first CSS framework',
    type: 'library',
    version: '3.4.0',
  },
  {
    id: 'lib-markdown',
    name: 'React Markdown',
    description: 'Markdown to React components',
    type: 'library',
    version: '9.0.0',
  },
  {
    id: 'lib-jose',
    name: 'jose',
    description: 'JWT implementation',
    type: 'library',
    version: '5.2.0',
  },
  {
    id: 'lib-iron-session',
    name: 'iron-session',
    description: 'Encrypted session cookies',
    type: 'library',
    version: '8.0.0',
  },
  {
    id: 'lib-upstash',
    name: '@upstash/ratelimit',
    description: 'Serverless rate limiting',
    type: 'library',
    version: '1.0.0',
  },

  // External APIs
  {
    id: 'ext-openai',
    name: 'OpenAI API',
    description: 'GPT models and embeddings',
    type: 'api',
    path: 'https://api.openai.com/v1',
  },
  {
    id: 'ext-anthropic',
    name: 'Anthropic API',
    description: 'Claude models',
    type: 'api',
    path: 'https://api.anthropic.com/v1',
  },
  {
    id: 'ext-google-oauth',
    name: 'Google OAuth',
    description: 'Google identity platform',
    type: 'api',
    path: 'https://oauth2.googleapis.com',
  },
  {
    id: 'ext-github-oauth',
    name: 'GitHub OAuth',
    description: 'GitHub authentication',
    type: 'api',
    path: 'https://github.com/login/oauth',
  },
  {
    id: 'ext-aws-s3',
    name: 'AWS S3',
    description: 'Object storage service',
    type: 'api',
    path: 's3.amazonaws.com',
  },
  {
    id: 'ext-cloudflare-r2',
    name: 'Cloudflare R2',
    description: 'S3-compatible storage',
    type: 'api',
    path: 'r2.cloudflarestorage.com',
  },
  {
    id: 'ext-cloudflare',
    name: 'Cloudflare CDN',
    description: 'Edge network and caching',
    type: 'api',
    path: 'cloudflare.com',
  },
];

// ============================================
// LEVEL 2: Data Sources (Right Column)
// ============================================

export const dataSources: DataSource[] = [
  {
    id: 'ds-postgres',
    name: 'PostgreSQL',
    type: 'database',
    description: 'Primary relational database',
    icon: '🐘',
  },
  {
    id: 'ds-redis',
    name: 'Redis',
    type: 'cache',
    description: 'In-memory cache and sessions',
    icon: '🔴',
  },
  {
    id: 'ds-localstorage',
    name: 'LocalStorage',
    type: 'file',
    description: 'Browser local storage',
    icon: '💿',
  },
  {
    id: 'ds-cookies',
    name: 'Cookies',
    type: 'file',
    description: 'HTTP cookies',
    icon: '🍪',
  },
  {
    id: 'ds-memory',
    name: 'Memory Cache',
    type: 'cache',
    description: 'In-memory data cache',
    icon: '🧠',
  },
  {
    id: 'ds-s3',
    name: 'S3 Storage',
    type: 'file',
    description: 'Object storage buckets',
    icon: '📦',
  },
  {
    id: 'ds-vector-db',
    name: 'Vector DB',
    type: 'database',
    description: 'Embeddings storage',
    icon: '🧬',
  },
  {
    id: 'ds-design-tokens',
    name: 'Design Tokens',
    type: 'file',
    description: 'Theme configuration',
    icon: '🎨',
  },
];

// ============================================
// Helper Functions
// ============================================

export function getModuleById(id: string): SystemModule | undefined {
  return systemModules.find((m) => m.id === id);
}

export function getUseCaseById(id: string): UseCase | undefined {
  return useCases.find((uc) => uc.id === id);
}

export function getUseCasesByModuleId(moduleId: string): UseCase[] {
  return useCases.filter((uc) => uc.moduleId === moduleId);
}

export function getApiOrLibraryById(id: string): ApiOrLibrary | undefined {
  return apisAndLibraries.find((a) => a.id === id);
}

export function getDataSourceById(id: string): DataSource | undefined {
  return dataSources.find((ds) => ds.id === id);
}

export function getApisForUseCase(useCase: UseCase): ApiOrLibrary[] {
  return useCase.apis
    .map((id) => getApiOrLibraryById(id))
    .filter((a): a is ApiOrLibrary => a !== undefined);
}

export function getDataSourcesForUseCase(useCase: UseCase): DataSource[] {
  return useCase.dataSources
    .map((id) => getDataSourceById(id))
    .filter((ds): ds is DataSource => ds !== undefined);
}

export function getModulesByLayer(layer: 'client' | 'server' | 'external'): SystemModule[] {
  return systemModules.filter((m) => m.layer === layer);
}
