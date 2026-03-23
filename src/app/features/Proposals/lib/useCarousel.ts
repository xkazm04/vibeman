import { useState, useCallback, useMemo } from 'react';
import { CAROUSEL_DELAYS } from './carouselConfig';

export interface CarouselItem {
  id: string;
}

export interface UseCarouselOptions<T extends CarouselItem> {
  items: T[];
  onAccept?: (item: T) => void;
  onAcceptWithCode?: (item: T) => void;
  onDecline?: (item: T) => void;
  /** Override default processing delays */
  delays?: Partial<typeof CAROUSEL_DELAYS>;
  /** Called after the last item is processed */
  onExhausted?: () => void;
}

export interface CarouselState<T extends CarouselItem> {
  currentItem: T | null;
  currentIndex: number;
  total: number;
  isProcessing: boolean;
  exitDirection: 'left' | 'right' | null;
  /** Up to 2 items after current */
  nextItems: T[];
}

export interface CarouselActions {
  accept: () => Promise<void>;
  acceptWithCode: () => Promise<void>;
  decline: () => Promise<void>;
  goToIndex: (i: number) => void;
  goToPrev: () => void;
  goToNext: () => void;
}

export function useCarousel<T extends CarouselItem>({
  items,
  onAccept,
  onAcceptWithCode,
  onDecline,
  delays,
  onExhausted,
}: UseCarouselOptions<T>): [CarouselState<T>, CarouselActions] {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null);

  const total = items.length;
  const safeIndex = Math.min(currentIndex, Math.max(0, total - 1));
  const currentItem = items[safeIndex] ?? null;

  const mergedDelays = { ...CAROUSEL_DELAYS, ...delays };

  const nextItems = useMemo(() => {
    const out: T[] = [];
    for (let i = 1; i <= 2; i++) {
      const idx = safeIndex + i;
      if (idx < total) out.push(items[idx]);
    }
    return out;
  }, [safeIndex, total, items]);

  const advance = useCallback(() => {
    if (safeIndex < total - 1) {
      setCurrentIndex(i => i + 1);
    } else {
      onExhausted?.();
    }
  }, [safeIndex, total, onExhausted]);

  const processAction = useCallback(async (
    direction: 'left' | 'right',
    delayMs: number,
    callback?: (item: T) => void,
  ) => {
    if (!currentItem || isProcessing) return;
    setIsProcessing(true);
    setExitDirection(direction);
    callback?.(currentItem);
    await new Promise(r => setTimeout(r, delayMs));
    setExitDirection(null);
    setIsProcessing(false);
    advance();
  }, [currentItem, isProcessing, advance]);

  const accept = useCallback(
    () => processAction('right', mergedDelays.accept, onAccept),
    [processAction, mergedDelays.accept, onAccept],
  );

  const acceptWithCode = useCallback(
    () => processAction('right', mergedDelays.acceptWithCode, onAcceptWithCode),
    [processAction, mergedDelays.acceptWithCode, onAcceptWithCode],
  );

  const decline = useCallback(
    () => processAction('left', mergedDelays.decline, onDecline),
    [processAction, mergedDelays.decline, onDecline],
  );

  const goToIndex = useCallback((i: number) => {
    if (i >= 0 && i < total) setCurrentIndex(i);
  }, [total]);

  const goToPrev = useCallback(() => {
    if (safeIndex > 0) setCurrentIndex(i => i - 1);
  }, [safeIndex]);

  const goToNext = useCallback(() => {
    if (safeIndex < total - 1) setCurrentIndex(i => i + 1);
  }, [safeIndex, total]);

  const state: CarouselState<T> = {
    currentItem,
    currentIndex: safeIndex,
    total,
    isProcessing,
    exitDirection,
    nextItems,
  };

  const actions: CarouselActions = {
    accept,
    acceptWithCode,
    decline,
    goToIndex,
    goToPrev,
    goToNext,
  };

  return [state, actions];
}
