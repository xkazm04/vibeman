/**
 * Layout constants for Matrix Diagram Canvas
 */

import type { ProjectTier } from './types';

export const TIER_ORDER: ProjectTier[] = ['frontend', 'backend', 'external', 'shared'];

export const MATRIX_CONSTANTS = {
  cellSize: 26,
  labelOffset: 80,
  headerHeight: 70,
  nodeWidth: 160,
  nodeHeight: 60,
  tierPadding: 50,
  nodePadding: 24,
  rowPadding: 20,
  topMargin: 40,
  leftMargin: 100,
  gridColumns: 3,
  backendNodePadding: 72,
  backendRowPadding: 60,
} as const;
