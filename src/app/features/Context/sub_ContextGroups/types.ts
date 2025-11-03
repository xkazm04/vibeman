import { Context, ContextGroup } from '@/stores/contextStore';
import React from 'react';

export interface BaseContextProps {
  context: Context;
  group?: ContextGroup;
}

export interface ContextCardsProps {
  contexts: Context[];
  group?: ContextGroup;
  availableGroups: ContextGroup[];
  showFullScreenModal: (title: string, content: React.ReactNode, options?: Record<string, unknown>) => void;
}

export interface LazyContextCardsProps extends ContextCardsProps {
  selectedFilePaths: string[];
}

export interface ContextCardsEmptyProps {
  group?: ContextGroup;
  availableGroups: ContextGroup[];
  showFullScreenModal: (title: string, content: React.ReactNode, options?: Record<string, unknown>) => void;
}

export interface ContextJailCardProps {
  context: Context;
  group?: ContextGroup;
  index: number;
  fontSize: string;
  availableGroups: ContextGroup[];
}

export interface ContextSectionContentProps {
  group?: ContextGroup;
  contexts: Context[];
  availableGroups: ContextGroup[];
  selectedFilePaths: string[];
  showFullScreenModal: (title: string, content: React.ReactNode, options?: Record<string, unknown>) => void;
  isExpanded: boolean;
}
