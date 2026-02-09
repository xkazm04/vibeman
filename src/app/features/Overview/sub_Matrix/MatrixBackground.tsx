'use client';

import React from 'react';
import { archTheme } from './lib/archTheme';

export default function MatrixBackground() {
  return (
    <>
      <div className="absolute inset-0" style={{ backgroundColor: archTheme.surface.deepBg }} />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.02)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      <div className="absolute top-0 left-0 w-1/3 h-1/2 bg-cyan-500/5 blur-[100px] pointer-events-none" />
    </>
  );
}
