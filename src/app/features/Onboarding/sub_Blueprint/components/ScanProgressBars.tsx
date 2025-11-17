'use client';

import { useBlueprintStore } from '../store/blueprintStore';
import CompactMultiProgressBar, { ProgressItem } from './CompactMultiProgressBar';

/**
 * ScanProgressBars Component
 *
 * Displays ultra-compact 1px progress bars at the top of the Blueprint layout.
 * All running scans are shown in a single horizontal row with golden tones.
 * Maximum 5 bars visible at once with dynamic sizing.
 */
export default function ScanProgressBars() {
  const { scans } = useBlueprintStore();

  // Convert scans to ProgressItem format
  const progressItems: ProgressItem[] = Object.entries(scans)
    .filter(([_, scan]) => scan.isRunning)
    .map(([id, scan]) => ({
      id,
      name: scan.name || id,
      progress: scan.progress || 0,
      isRunning: scan.isRunning,
    }));

  return (
    <div className="absolute top-0 left-0 right-0 z-40 pointer-events-none px-4 py-2" data-testid="scan-progress-bars">
      <CompactMultiProgressBar
        items={progressItems}
        maxVisible={5}
        testId="blueprint-progress-bars"
      />
    </div>
  );
}
