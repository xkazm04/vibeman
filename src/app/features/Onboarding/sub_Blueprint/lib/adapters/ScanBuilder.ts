/**
 * Scan Builder Module
 *
 * Constructs the blueprint column configuration dynamically from the ScanRegistry.
 * This eliminates hard-coded imports and enables framework-agnostic scan registration.
 *
 * Key responsibilities:
 * - Iterate over registered adapters in the registry
 * - Group adapters by scan category
 * - Build column configurations with associated scan handlers
 * - Support custom column layouts and metadata
 */

import {
  Eye,
  Layers,
  Box,
  Hammer,
  Sparkles,
  Code,
  Bug,
  Camera,
  Target,
  Trash2,
  LucideIcon,
} from 'lucide-react';
import { ScanRegistry } from './ScanRegistry';
import { ScanAdapter, ScanCategory, ScanResult, DecisionData } from './types';
import { Project } from '@/types';

export interface ButtonConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  color: 'blue' | 'cyan' | 'purple' | 'amber' | 'green' | 'red' | 'pink' | 'indigo';
  action: 'scan' | 'navigate';
  target?: 'ideas' | 'tinder' | 'tasker' | 'reflector';
  scanHandler?: ScanHandler;
  eventTitle?: string; // Event title to track last scan execution
  contextNeeded?: boolean; // If true, requires context selection before scan
}

export interface ScanHandler {
  execute: (contextId?: string) => Promise<ScanResult>;
  buildDecision: (result: ScanResult) => DecisionData | null;
}

export interface ColumnConfig {
  id: string;
  title: string;
  color: string;
  gradientFrom: string;
  gradientVia?: string;
  buttons: ButtonConfig[];
  reserved?: boolean;
  tooltipDescription?: string; // Short, jargon-free description for hover tooltips
}

/**
 * Metadata for scan button configuration
 */
interface ScanMetadata {
  icon: LucideIcon;
  color: 'blue' | 'cyan' | 'purple' | 'amber' | 'green' | 'red' | 'pink' | 'indigo';
  eventTitle: string;
  contextNeeded?: boolean;
  action?: 'scan' | 'navigate';
  target?: 'ideas' | 'tinder' | 'tasker' | 'reflector';
  description?: string;
}

/**
 * Default scan metadata (icons, colors, event titles)
 */
const SCAN_METADATA: Record<ScanCategory, ScanMetadata> = {
  vision: {
    icon: Eye,
    color: 'cyan',
    eventTitle: 'Vision Scan Completed',
    description: 'Analyze project overall and create a high-level overview documentation with vision.',
  },
  contexts: {
    icon: Layers,
    color: 'blue',
    eventTitle: 'Contexts Scan Completed',
    description: 'Analyze project files and suggest grouping into features (contexts) for better organization and understanding of modules.',
  },
  structure: {
    icon: Box,
    color: 'blue',
    eventTitle: 'Structure Scan Completed',
    description: 'Analyze code structure with static analysis and provides refactiring suggestions to improve modularity and maintainability.',
  },
  build: {
    icon: Hammer,
    color: 'indigo',
    eventTitle: 'Build Scan Completed',
    description: 'Batch code execution of prepared Claude Code requirement files (accepted ideas)',
  },
  dependencies: {
    icon: Sparkles,
    color: 'purple',
    eventTitle: 'Dependencies Scan Completed',
    description: 'Analyze project dependencies and suggest updates, removals, or additions to improve security and performance.',
  },
  ideas: {
    icon: Sparkles,
    color: 'amber',
    eventTitle: 'Ideas Generated',
    action: 'navigate',
    target: 'ideas',
    description: 'Generate new ideas for project features, improvements, or enhancements using AI analysis of the codebase and context.',
  },
  prototype: {
    icon: Code,
    color: 'green',
    eventTitle: 'Prototype Scan Completed',
    description: 'Rapidly build and test feature prototypes before full implementation.',
  },
  contribute: {
    icon: Sparkles,
    color: 'green',
    eventTitle: 'Contribution Scan Completed',
    description: 'Analyze and contribute new features to the codebase.',
  },
  fix: {
    icon: Bug,
    color: 'red',
    eventTitle: 'Fix Scan Completed',
    action: 'navigate',
    target: 'tasker',
  },
  photo: {
    icon: Camera,
    color: 'pink',
    eventTitle: 'Screenshots current state of the UI app',
    contextNeeded: true,
  },
  custom: {
    icon: Target,
    color: 'cyan',
    eventTitle: 'Custom Scan Completed',
  },
};

/**
 * Column layout definition
 */
interface ColumnLayout {
  id: string;
  title: string;
  color: string;
  gradientFrom: string;
  gradientVia?: string;
  categories: ScanCategory[];
  tooltipDescription?: string; // Short, jargon-free description for hover tooltips
}

/**
 * Default column layout
 */
const DEFAULT_COLUMN_LAYOUT: ColumnLayout[] = [
  {
    id: 'project',
    title: '1. PROJECT',
    color: 'cyan',
    gradientFrom: 'cyan-500/50',
    categories: ['vision', 'contexts'],
    tooltipDescription: 'Project: Define your project vision and organize code into logical contexts',
  },
  {
    id: 'backlog',
    title: '2. BACKLOG',
    color: 'blue',
    gradientFrom: 'blue-500/50',
    gradientVia: 'blue-500/30',
    categories: ['structure', 'build', 'dependencies'],
    tooltipDescription: 'Backlog: Analyze structure, manage dependencies, and batch-execute requirements',
  },
  {
    id: 'code',
    title: '3. CODE',
    color: 'green',
    gradientFrom: 'green-500/50',
    gradientVia: 'green-500/30',
    categories: ['prototype', 'contribute', 'fix'],
    tooltipDescription: 'Code: Build prototypes, contribute features, and fix issues',
  },
  {
    id: 'test',
    title: '4. TEST',
    color: 'pink',
    gradientFrom: 'pink-500/50',
    gradientVia: 'pink-500/30',
    categories: ['photo', 'custom'],
    tooltipDescription: 'Test: Capture screenshots and run custom testing scans',
  },
];

/**
 * ScanBuilder - Dynamically constructs blueprint columns from registry
 */
export class ScanBuilder {
  private registry: ScanRegistry;

  constructor(registry: ScanRegistry) {
    this.registry = registry;
  }

  /**
   * Build blueprint columns from registered adapters
   */
  public buildColumns(layout: ColumnLayout[] = DEFAULT_COLUMN_LAYOUT): ColumnConfig[] {
    return layout.map((col) => this.buildColumn(col));
  }

  /**
   * Build a single column configuration
   */
  private buildColumn(layout: ColumnLayout): ColumnConfig {
    const buttons: ButtonConfig[] = [];

    for (const category of layout.categories) {
      // Get all adapters for this category
      const adapters = this.registry.getAdaptersByCategory(category);

      // If adapters exist, create a button
      if (adapters.length > 0) {
        const button = this.buildButton(category, adapters);
        if (button) {
          buttons.push(button);
        }
      } else {
        // No adapters registered - create a placeholder button
        const metadata = SCAN_METADATA[category];
        if (metadata) {
          buttons.push({
            id: category,
            label: this.capitalize(category),
            icon: metadata.icon,
            color: metadata.color,
            action: metadata.action || 'scan',
            target: metadata.target,
            eventTitle: metadata.eventTitle,
            contextNeeded: metadata.contextNeeded,
          });
        }
      }
    }

    return {
      id: layout.id,
      title: layout.title,
      color: layout.color,
      gradientFrom: layout.gradientFrom,
      gradientVia: layout.gradientVia,
      buttons,
      tooltipDescription: layout.tooltipDescription,
    };
  }

  /**
   * Build a button configuration from adapters
   */
  private buildButton(category: ScanCategory, adapters: ScanAdapter[]): ButtonConfig | null {
    const metadata = SCAN_METADATA[category];
    if (!metadata) {
      console.warn(`[ScanBuilder] No metadata for category: ${category}`);
      return null;
    }

    // Create scan handler that uses registry to execute
    const scanHandler: ScanHandler = {
      execute: async (contextId?: string) => {
        // We need the active project to execute the scan
        // This will be handled by the scan execution layer
        return {
          success: false,
          error: 'Execute via registry - see blueprintConfig scan handlers',
        };
      },
      buildDecision: (result: ScanResult) => {
        // Use the best adapter for this category
        // This will be handled by the decision building layer
        return null;
      },
    };

    return {
      id: category,
      label: this.capitalize(category),
      icon: metadata.icon,
      color: metadata.color,
      action: metadata.action || 'scan',
      target: metadata.target,
      scanHandler: adapters.length > 0 ? scanHandler : undefined,
      eventTitle: metadata.eventTitle,
      contextNeeded: metadata.contextNeeded,
    };
  }

  /**
   * Helper: Capitalize string
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Get adapters for a specific category
   */
  public getAdaptersForCategory(category: ScanCategory): ScanAdapter[] {
    return this.registry.getAdaptersByCategory(category);
  }

  /**
   * Check if a category has any registered adapters
   */
  public hasAdapters(category: ScanCategory): boolean {
    return this.registry.getAdaptersByCategory(category).length > 0;
  }
}

/**
 * Create a ScanBuilder from the global registry
 */
export function createScanBuilder(registry: ScanRegistry): ScanBuilder {
  return new ScanBuilder(registry);
}
