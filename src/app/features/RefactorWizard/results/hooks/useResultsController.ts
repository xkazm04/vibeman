'use client';

import { useMemo, useRef } from 'react';
import type { RefactorOpportunity } from '@/stores/refactorStore';
import { ResultsController } from '../ResultsController';

export function useResultsController(items: RefactorOpportunity[]): ResultsController {
  const ref = useRef<ResultsController>(null);
  if (!ref.current) ref.current = new ResultsController();
  // Rebuild when items reference changes; controller maintains internal maps
  useMemo(() => {
    ref.current!.setAll(items);
  }, [items]);
  return ref.current!;
}

