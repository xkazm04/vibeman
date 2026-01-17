'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { ObsEndpointSummary } from '../lib/types';

interface EndpointUsageChartProps {
  endpoints: ObsEndpointSummary[];
  maxItems?: number;
}

const METHOD_COLORS: Record<string, string> = {
  GET: '#06b6d4',    // cyan
  POST: '#22c55e',   // green
  PUT: '#eab308',    // yellow
  DELETE: '#ef4444', // red
  PATCH: '#a855f7'   // purple
};

export default function EndpointUsageChart({ endpoints, maxItems = 10 }: EndpointUsageChartProps) {
  const data = endpoints.slice(0, maxItems).map(ep => ({
    name: ep.endpoint.length > 25 ? ep.endpoint.slice(0, 22) + '...' : ep.endpoint,
    fullName: ep.endpoint,
    calls: ep.total_calls,
    method: ep.method,
    avgTime: ep.avg_response_time_ms
  }));

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No endpoint data available
      </div>
    );
  }

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 10, right: 30, left: 100, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            type="number"
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            axisLine={{ stroke: '#374151' }}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            axisLine={{ stroke: '#374151' }}
            width={100}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#f3f4f6'
            }}
            formatter={(value: number, name: string, props) => {
              const payload = props?.payload as { fullName?: string; method?: string; avgTime?: number } | undefined;
              if (name === 'calls' && payload) {
                return [
                  <span key="value">
                    {value.toLocaleString()} calls
                    <br />
                    <span className="text-gray-400 text-xs">
                      {payload.method} | Avg: {payload.avgTime?.toFixed(0)}ms
                    </span>
                  </span>,
                  payload.fullName || ''
                ];
              }
              return [value, name];
            }}
          />
          <Bar dataKey="calls" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={METHOD_COLORS[entry.method] || '#6b7280'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-2 text-xs">
        {Object.entries(METHOD_COLORS).map(([method, color]) => (
          <div key={method} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
            <span className="text-gray-400">{method}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
