import { TreeNode as TreeNodeType } from '../types';

export const mockFileStructure: TreeNodeType = {
    id: 'root',
    name: 'src',
    type: 'folder',
    description: 'Source code directory',
    detailedDescription: 'Contains all application source code including components, utilities, and configuration files',
    children: [
      {
        id: 'components',
        name: 'components',
        type: 'folder',
        description: 'Reusable UI components',
        detailedDescription: 'Houses all reusable React components organized by feature and complexity',
        children: [
          {
            id: 'agent-manager',
            name: 'agent-manager',
            type: 'folder',
            description: 'Agent management components',
            detailedDescription: 'Components for managing AI agent states and interactions',
            children: [
              {
                id: 'AgentManager.tsx',
                name: 'AgentManager.tsx',
                type: 'file',
                description: 'Main agent manager component',
                detailedDescription: 'Central component handling agent activation, deactivation, and state management with real-time updates'
              },
              {
                id: 'AgentButton.tsx',
                name: 'AgentButton.tsx',
                type: 'file',
                description: 'Individual agent button',
                detailedDescription: 'Interactive button component for individual agent control'
              },
              {
                id: 'types.ts',
                name: 'types.ts',
                type: 'file',
                description: 'Agent type definitions',
                detailedDescription: 'TypeScript interfaces and types for agent management'
              }
            ]
          },
          {
            id: 'ui',
            name: 'ui',
            type: 'folder',
            description: 'Base UI components',
            detailedDescription: 'Foundational UI components with glass morphism and neon styling',
            children: [
              {
                id: 'GlowCard.tsx',
                name: 'GlowCard.tsx',
                type: 'file',
                description: 'Glowing card component',
                detailedDescription: 'Reusable card component with customizable glow effects and glass morphism styling'
              },
              {
                id: 'Button.tsx',
                name: 'Button.tsx',
                type: 'file',
                description: 'Base button component',
                detailedDescription: 'Styled button with variants and animations'
              },
              {
                id: 'Input.tsx',
                name: 'Input.tsx',
                type: 'file',
                description: 'Form input component',
                detailedDescription: 'Styled input field with validation states'
              }
            ]
          },
          {
            id: 'layout',
            name: 'layout',
            type: 'folder',
            description: 'Layout components',
            detailedDescription: 'Page layout and structural components',
            children: [
              {
                id: 'MainLayout.tsx',
                name: 'MainLayout.tsx',
                type: 'file',
                description: 'Main application layout',
                detailedDescription: 'Primary layout wrapper with navigation and content areas'
              },
              {
                id: 'Sidebar.tsx',
                name: 'Sidebar.tsx',
                type: 'file',
                description: 'Navigation sidebar',
                detailedDescription: 'Collapsible sidebar with navigation menu'
              }
            ]
          }
        ]
      },
      {
        id: 'lib',
        name: 'lib',
        type: 'folder',
        description: 'Utility libraries',
        detailedDescription: 'Core utilities including state management, API clients, and helper functions',
        children: [
          {
            id: 'store',
            name: 'store',
            type: 'folder',
            description: 'State management',
            detailedDescription: 'Zustand store configuration and state management utilities',
            children: [
              {
                id: 'app-store.ts',
                name: 'app-store.ts',
                type: 'file',
                description: 'Main application store',
                detailedDescription: 'Central state management for the application'
              }
            ]
          },
          {
            id: 'utils.ts',
            name: 'utils.ts',
            type: 'file',
            description: 'Utility functions',
            detailedDescription: 'Common helper functions and utilities'
          },
          {
            id: 'api.ts',
            name: 'api.ts',
            type: 'file',
            description: 'API client',
            detailedDescription: 'HTTP client configuration and API endpoints'
          }
        ]
      },
      {
        id: 'styles',
        name: 'styles',
        type: 'folder',
        description: 'Styling files',
        detailedDescription: 'CSS, SCSS, and styling configuration files',
        children: [
          {
            id: 'globals.css',
            name: 'globals.css',
            type: 'file',
            description: 'Global styles',
            detailedDescription: 'Application-wide CSS styles and variables'
          },
          {
            id: 'components.scss',
            name: 'components.scss',
            type: 'file',
            description: 'Component styles',
            detailedDescription: 'SCSS styles for individual components'
          }
        ]
      }
    ]
  };