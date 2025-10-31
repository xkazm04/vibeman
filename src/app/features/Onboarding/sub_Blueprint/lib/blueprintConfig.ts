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
  LucideIcon,
} from 'lucide-react';

export interface ButtonConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  color: 'blue' | 'cyan' | 'purple' | 'amber' | 'green' | 'red' | 'pink' | 'indigo';
  action: 'scan' | 'navigate';
  target?: 'ideas' | 'tinder' | 'tasker' | 'reflector';
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
      },
      {
        id: 'contexts',
        label: 'Contexts',
        icon: Layers,
        color: 'blue',
        action: 'scan',
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
      },
      {
        id: 'build',
        label: 'Build',
        icon: Hammer,
        color: 'indigo',
        action: 'scan',
      },
      {
        id: 'dependencies',
        label: 'Dependencies',
        icon: GitBranch,
        color: 'purple',
        action: 'scan',
      },
      {
        id: 'ideas',
        label: 'Ideas',
        icon: Lightbulb,
        color: 'amber',
        action: 'scan',
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
      },
    ],
  },
];
