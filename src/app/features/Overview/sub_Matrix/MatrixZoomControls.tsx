'use client';

import React from 'react';
import * as d3 from 'd3';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface MatrixZoomControlsProps {
  svgRef: React.RefObject<SVGSVGElement | null>;
}

export default function MatrixZoomControls({ svgRef }: MatrixZoomControlsProps) {
  const handleZoomIn = () => {
    if (!svgRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(300)
      .call(d3.zoom<SVGSVGElement, unknown>().scaleBy as any, 1.3);
  };

  const handleZoomOut = () => {
    if (!svgRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(300)
      .call(d3.zoom<SVGSVGElement, unknown>().scaleBy as any, 0.7);
  };

  const handleReset = () => {
    if (!svgRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(500)
      .call(d3.zoom<SVGSVGElement, unknown>().transform as any, d3.zoomIdentity);
  };

  return (
    <div className="absolute top-4 right-4 flex flex-col gap-2">
      <button
        onClick={handleZoomIn}
        className="p-2 bg-zinc-900/90 hover:bg-zinc-800 rounded-lg border border-zinc-700/50"
      >
        <ZoomIn className="w-4 h-4 text-zinc-400" />
      </button>
      <button
        onClick={handleZoomOut}
        className="p-2 bg-zinc-900/90 hover:bg-zinc-800 rounded-lg border border-zinc-700/50"
      >
        <ZoomOut className="w-4 h-4 text-zinc-400" />
      </button>
      <button
        onClick={handleReset}
        className="p-2 bg-zinc-900/90 hover:bg-zinc-800 rounded-lg border border-zinc-700/50"
      >
        <Maximize2 className="w-4 h-4 text-zinc-400" />
      </button>
    </div>
  );
}
