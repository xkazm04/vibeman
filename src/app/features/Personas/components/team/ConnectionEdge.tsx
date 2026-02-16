'use client';

import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react';

const TYPE_STYLES: Record<string, { stroke: string; strokeDasharray?: string; strokeWidth: number }> = {
  sequential: { stroke: '#3b82f6', strokeWidth: 2 },
  conditional: { stroke: '#f59e0b', strokeDasharray: '6 3', strokeWidth: 2 },
  parallel: { stroke: '#10b981', strokeWidth: 3 },
  feedback: { stroke: '#8b5cf6', strokeDasharray: '2 4', strokeWidth: 2 },
};

export default function ConnectionEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style,
  markerEnd,
}: EdgeProps) {
  const connType = (data as any)?.connection_type || 'sequential';
  const label = (data as any)?.label || '';
  const typeStyle = TYPE_STYLES[connType] || TYPE_STYLES.sequential;

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 12,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: typeStyle.stroke,
          strokeWidth: typeStyle.strokeWidth,
          strokeDasharray: typeStyle.strokeDasharray,
        }}
      />
      {label && (
        <foreignObject
          width={80}
          height={24}
          x={labelX - 40}
          y={labelY - 12}
          className="pointer-events-none"
        >
          <div className="flex items-center justify-center h-full">
            <span
              className="px-2 py-0.5 text-[9px] font-mono rounded-full border backdrop-blur-sm"
              style={{
                backgroundColor: typeStyle.stroke + '15',
                borderColor: typeStyle.stroke + '30',
                color: typeStyle.stroke,
              }}
            >
              {label}
            </span>
          </div>
        </foreignObject>
      )}
    </>
  );
}
