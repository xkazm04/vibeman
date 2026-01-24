import { Context, ContextGroup } from '@/stores/contextStore';
import { ShowFullScreenModalFn } from '@/contexts/ModalContext';

export interface BaseContextProps {
  context: Context;
  group?: ContextGroup;
}

export interface ContextCardsProps {
  contexts: Context[];
  group?: ContextGroup;
  availableGroups: ContextGroup[];
  showFullScreenModal: ShowFullScreenModalFn;
}

export interface LazyContextCardsProps extends ContextCardsProps {
  selectedFilePaths: string[];
}

export interface ContextCardsEmptyProps {
  group?: ContextGroup;
  availableGroups: ContextGroup[];
  showFullScreenModal: ShowFullScreenModalFn;
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
  showFullScreenModal: ShowFullScreenModalFn;
  isExpanded: boolean;
  onMoveContext?: (contextId: string, groupId: string | null) => void;
}
