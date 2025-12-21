// Split-View Types

export type SplitViewWidth = 'narrow' | 'medium' | 'wide';

export const SPLIT_VIEW_WIDTHS: Record<SplitViewWidth, string> = {
  narrow: 'w-[30%] min-w-[320px]',
  medium: 'w-[40%] min-w-[400px]',
  wide: 'w-[50%] min-w-[480px]',
};

export interface SplitViewState {
  isOpen: boolean;
  itemId: string | null;
  width: SplitViewWidth;
}

export const DEFAULT_SPLIT_VIEW_STATE: SplitViewState = {
  isOpen: false,
  itemId: null,
  width: 'medium',
};
