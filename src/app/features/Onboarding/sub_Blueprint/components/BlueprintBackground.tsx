'use client';

import { memo } from 'react';

const BlueprintBackground = memo(function BlueprintBackground() {
  return (
    <>
      {/* Blueprint Grid Background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(59, 130, 246, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Major grid lines */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(59, 130, 246, 0.1) 2px, transparent 2px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.1) 2px, transparent 2px)
          `,
          backgroundSize: '200px 200px',
        }}
      />


      {/* Vignette effect */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-gray-950/50 via-transparent to-gray-950/50" />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-gray-950/50 via-transparent to-gray-950/50" />
    </>
  );
});

export default BlueprintBackground;
