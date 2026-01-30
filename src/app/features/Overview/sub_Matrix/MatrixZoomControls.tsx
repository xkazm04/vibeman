'use client';

import React from 'react';
import * as d3 from 'd3';
import { ZoomIn, ZoomOut, Maximize2, type LucideIcon } from 'lucide-react';

interface ButtonIconProps {
  icon: LucideIcon;
  onClick: () => void;
  title: string;
}

function ButtonIcon({ icon: Icon, onClick, title }: ButtonIconProps) {
  return (
    <button
      onClick={onClick}
      className="p-2 bg-zinc-900/90 hover:bg-zinc-800 rounded-lg border border-zinc-700/50 transition-all duration-200 hover:border-cyan-500/30 hover:shadow-md hover:shadow-cyan-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 group"
      title={title}
    >
      <Icon className="w-4 h-4 text-zinc-400 group-hover:text-cyan-400 transition-colors duration-200" />
    </button>
  );
}

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
    <div className="absolute top-4 right-4 flex flex-col gap-2 backdrop-blur-sm">
      <ButtonIcon icon={ZoomIn} onClick={handleZoomIn} title="Zoom in" />
      <ButtonIcon icon={ZoomOut} onClick={handleZoomOut} title="Zoom out" />
      <ButtonIcon icon={Maximize2} onClick={handleReset} title="Reset view" />
    </div>
  );
}
