'use client';

/**
 * Decorative corner labels for blueprint theme
 */
export default function BlueprintCornerLabels() {
  return (
    <>
      <div className="absolute top-4 right-4 text-cyan-400/40 text-xs font-mono">
        [SCAN_GRID]
      </div>
      <div className="absolute bottom-4 left-4 text-cyan-400/40 text-xs font-mono">
        PROJECT_PHASE
      </div>
      <div className="absolute bottom-4 right-4 text-cyan-400/40 text-xs font-mono">
        COORDINATE_SYSTEM
      </div>
    </>
  );
}
