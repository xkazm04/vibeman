'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { ZoomIn, ZoomOut, Maximize2, type LucideIcon } from 'lucide-react';

/**
 * Transform state provided to children
 */
export interface ZoomTransform {
  x: number;
  y: number;
  k: number; // scale factor
}

/**
 * Zoom control configuration
 */
export interface ZoomConfig {
  /** Minimum scale factor (default: 0.5) */
  minScale?: number;
  /** Maximum scale factor (default: 2) */
  maxScale?: number;
  /** Animation duration in ms for programmatic zoom (default: 300) */
  animationDuration?: number;
  /** Scale factor for zoom in/out buttons (default: 1.3) */
  zoomStep?: number;
}

/**
 * Props for the ZoomableCanvas component
 */
export interface ZoomableCanvasProps {
  /** Canvas width */
  width: number;
  /** Canvas height */
  height: number;
  /** Zoom configuration */
  config?: ZoomConfig;
  /** Whether to show built-in zoom controls (default: true) */
  showControls?: boolean;
  /** Position of zoom controls (default: 'top-right') */
  controlsPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Additional class names for the container */
  className?: string;
  /** Background content (rendered outside transform group) */
  background?: React.ReactNode;
  /** Render prop receiving the current transform */
  children: (transform: ZoomTransform) => React.ReactNode;
  /** Callback when transform changes */
  onTransformChange?: (transform: ZoomTransform) => void;
}

const DEFAULT_CONFIG: Required<ZoomConfig> = {
  minScale: 0.5,
  maxScale: 2,
  animationDuration: 300,
  zoomStep: 1.3,
};

/**
 * Button component for zoom controls
 */
function ZoomButton({
  icon: Icon,
  onClick,
  title,
}: {
  icon: LucideIcon;
  onClick: () => void;
  title: string;
}) {
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

/**
 * Position class mapping for controls
 */
const POSITION_CLASSES: Record<NonNullable<ZoomableCanvasProps['controlsPosition']>, string> = {
  'top-left': 'top-4 left-4',
  'top-right': 'top-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'bottom-right': 'bottom-4 right-4',
};

/**
 * ZoomableCanvas - A reusable component for pan/zoom visualizations
 *
 * Encapsulates d3.zoom behavior and provides a clean API for creating
 * zoomable SVG visualizations with consistent UX.
 *
 * @example
 * ```tsx
 * <ZoomableCanvas width={800} height={600}>
 *   {(transform) => (
 *     <>
 *       {nodes.map(node => (
 *         <circle
 *           key={node.id}
 *           cx={node.x}
 *           cy={node.y}
 *           r={10}
 *         />
 *       ))}
 *     </>
 *   )}
 * </ZoomableCanvas>
 * ```
 */
export function ZoomableCanvas({
  width,
  height,
  config,
  showControls = true,
  controlsPosition = 'top-right',
  className = '',
  background,
  children,
  onTransformChange,
}: ZoomableCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [transform, setTransform] = useState<ZoomTransform>({ x: 0, y: 0, k: 1 });

  // Merge config with defaults
  const mergedConfig = useMemo(
    () => ({ ...DEFAULT_CONFIG, ...config }),
    [config]
  );

  // Create stable zoom behavior instance
  const zoom = useMemo(
    () =>
      d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([mergedConfig.minScale, mergedConfig.maxScale])
        .on('zoom', (event) => {
          const newTransform = {
            x: event.transform.x,
            y: event.transform.y,
            k: event.transform.k,
          };
          setTransform(newTransform);
          onTransformChange?.(newTransform);
        }),
    [mergedConfig.minScale, mergedConfig.maxScale, onTransformChange]
  );

  // Initialize zoom behavior
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    d3.select(svg).call(zoom);

    return () => {
      d3.select(svg).on('.zoom', null);
    };
  }, [zoom]);

  // Zoom control handlers
  const handleZoomIn = useCallback(() => {
    if (!svgRef.current) return;
    const selection = d3.select(svgRef.current);
    const transition = selection.transition().duration(mergedConfig.animationDuration);
    zoom.scaleBy(transition, mergedConfig.zoomStep);
  }, [zoom, mergedConfig.animationDuration, mergedConfig.zoomStep]);

  const handleZoomOut = useCallback(() => {
    if (!svgRef.current) return;
    const selection = d3.select(svgRef.current);
    const transition = selection.transition().duration(mergedConfig.animationDuration);
    zoom.scaleBy(transition, 1 / mergedConfig.zoomStep);
  }, [zoom, mergedConfig.animationDuration, mergedConfig.zoomStep]);

  const handleReset = useCallback(() => {
    if (!svgRef.current) return;
    const selection = d3.select(svgRef.current);
    const transition = selection.transition().duration(mergedConfig.animationDuration * 1.5);
    zoom.transform(transition, d3.zoomIdentity);
  }, [zoom, mergedConfig.animationDuration]);

  return (
    <div className={`relative ${className}`}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="block"
        style={{ width: '100%', height: '100%' }}
      >
        {/* Background content (outside transform) */}
        {background}

        {/* Transformed content */}
        <g transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>
          {children(transform)}
        </g>
      </svg>

      {/* Zoom controls */}
      {showControls && (
        <div className={`absolute ${POSITION_CLASSES[controlsPosition]} flex flex-col gap-2 backdrop-blur-sm`}>
          <ZoomButton icon={ZoomIn} onClick={handleZoomIn} title="Zoom in" />
          <ZoomButton icon={ZoomOut} onClick={handleZoomOut} title="Zoom out" />
          <ZoomButton icon={Maximize2} onClick={handleReset} title="Reset view" />
        </div>
      )}
    </div>
  );
}

export default ZoomableCanvas;
