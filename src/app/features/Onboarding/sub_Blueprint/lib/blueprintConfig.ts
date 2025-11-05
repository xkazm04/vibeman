import {
  Eye,
  Layers,
  Box,
  Hammer,
  GitBranch,
  Lightbulb,
  Sparkles,
  Code,
  Bug,
  Camera,
  Target,
  Trash2,
  LucideIcon,
} from 'lucide-react';
import * as structureScan from './blueprintStructureScan';
import * as photoScan from './blueprintPhotoScan';
import * as visionScan from './blueprintVisionScan';
import * as contextsScan from './blueprintContextsScan';
import * as buildScan from './blueprintBuildScan';
import * as selectorsScan from './blueprintSelectorsScan';
import * as unusedScan from './blueprintUnusedScan';

export interface ScanResult {
  success: boolean;
  error?: string;
  violations?: unknown[];
  data?: Record<string, unknown>;
}

export interface DecisionData {
  type: string;
  title: string;
  description: string;
  count?: number;
  severity?: 'info' | 'warning' | 'error';
  projectId?: string;
  projectPath?: string;
  projectType?: string;
  data?: Record<string, unknown>;
  onAccept: () => Promise<void>;
  onReject?: () => Promise<void>; // Optional - some decisions are info-only
}

export interface ScanHandler {
  execute: () => Promise<ScanResult>;
  buildDecision: (result: ScanResult) => DecisionData | null;
}

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

export interface ColumnConfig {
  id: string;
  title: string;
  color: string;
  gradientFrom: string;
  gradientVia?: string;
  buttons: ButtonConfig[];
  reserved?: boolean;
}

export const BLUEPRINT_COLUMNS: ColumnConfig[] = [
  {
    id: 'project',
    title: '1. PROJECT',
    color: 'cyan',
    gradientFrom: 'cyan-500/50',
    buttons: [
      {
        id: 'vision',
        label: 'Vision',
        icon: Eye,
        color: 'cyan',
        action: 'scan',
        eventTitle: 'Vision Scan Completed',
        scanHandler: {
          execute: visionScan.executeVisionScan,
          buildDecision: visionScan.buildDecisionData,
        },
      },
      {
        id: 'contexts',
        label: 'Contexts',
        icon: Layers,
        color: 'blue',
        action: 'scan',
        eventTitle: 'Contexts Scan Completed',
        scanHandler: {
          execute: contextsScan.executeContextsScan,
          buildDecision: contextsScan.buildDecisionData,
        },
      },
    ],
  },
  {
    id: 'backlog',
    title: '2. BACKLOG',
    color: 'blue',
    gradientFrom: 'blue-500/50',
    gradientVia: 'blue-500/30',
    buttons: [
      {
        id: 'structure',
        label: 'Structure',
        icon: Box,
        color: 'blue',
        action: 'scan',
        eventTitle: 'Structure Scan Completed',
        scanHandler: {
          execute: structureScan.executeStructureScan,
          buildDecision: structureScan.buildDecisionData,
        },
      },
      {
        id: 'build',
        label: 'Build',
        icon: Hammer,
        color: 'indigo',
        action: 'scan',
        eventTitle: 'Build Scan Completed',
        scanHandler: {
          execute: buildScan.executeBuildScan,
          buildDecision: buildScan.buildDecisionData,
        },
      },
      {
        id: 'unused',
        label: 'Unused',
        icon: Trash2,
        color: 'red',
        action: 'scan',
        eventTitle: 'Unused Code Scan Completed',
        scanHandler: {
          execute: unusedScan.executeUnusedScan,
          buildDecision: unusedScan.buildDecisionData,
        },
      },
    ],
  },
  {
    id: 'code',
    title: '3. CODE',
    color: 'green',
    gradientFrom: 'green-500/50',
    gradientVia: 'green-500/30',
    buttons: [
      {
        id: 'prototype',
        label: 'Prototype',
        icon: Sparkles,
        color: 'green',
        action: 'navigate',
        target: 'tasker',
      },
      {
        id: 'contribute',
        label: 'Contribute',
        icon: Code,
        color: 'cyan',
        action: 'navigate',
        target: 'tasker',
      },
      {
        id: 'fix',
        label: 'Fix',
        icon: Bug,
        color: 'red',
        action: 'navigate',
        target: 'tasker',
      },
    ],
  },
  {
    id: 'test',
    title: '4. TEST',
    color: 'pink',
    gradientFrom: 'pink-500/50',
    gradientVia: 'pink-500/30',
    buttons: [
      {
        id: 'photo',
        label: 'Photo',
        icon: Camera,
        color: 'pink',
        action: 'scan',
        eventTitle: 'Photo Scan Completed',
        contextNeeded: true,
        scanHandler: {
          execute: photoScan.executePhotoScan,
          buildDecision: photoScan.buildDecisionData,
        },
      },
      {
        id: 'selectors',
        label: 'Selectors',
        icon: Target,
        color: 'cyan',
        action: 'scan',
        eventTitle: 'Selectors Scan Completed',
        contextNeeded: true,
        scanHandler: {
          execute: async () => {
            // This will be called with contextId passed separately
            return {
              success: false,
              error: 'Context ID is required for this scan',
            };
          },
          buildDecision: selectorsScan.buildDecisionData,
        },
      },
    ],
  },
];
