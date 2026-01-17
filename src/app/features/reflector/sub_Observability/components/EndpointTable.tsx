'use client';

import React, { useState, useMemo } from 'react';
import { ArrowUpDown, AlertTriangle, Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ObsEndpointSummary } from '../lib/types';

interface EndpointTableProps {
  endpoints: ObsEndpointSummary[];
  trends?: Array<{
    endpoint: string;
    direction: 'increasing' | 'decreasing' | 'stable';
    change_percent: number;
  }>;
}

type SortField = 'endpoint' | 'method' | 'total_calls' | 'avg_response_time_ms' | 'error_rate';
type SortDirection = 'asc' | 'desc';

const METHOD_BADGES: Record<string, string> = {
  GET: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  POST: 'bg-green-500/20 text-green-300 border-green-500/30',
  PUT: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  DELETE: 'bg-red-500/20 text-red-300 border-red-500/30',
  PATCH: 'bg-purple-500/20 text-purple-300 border-purple-500/30'
};

export default function EndpointTable({ endpoints, trends = [] }: EndpointTableProps) {
  const [sortField, setSortField] = useState<SortField>('total_calls');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const trendsMap = useMemo(() => {
    const map: Record<string, { direction: string; change_percent: number }> = {};
    trends.forEach(t => {
      map[t.endpoint] = { direction: t.direction, change_percent: t.change_percent };
    });
    return map;
  }, [trends]);

  const sortedEndpoints = useMemo(() => {
    return [...endpoints].sort((a, b) => {
      let aVal: string | number = a[sortField];
      let bVal: string | number = b[sortField];

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal as string).toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      }
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
    });
  }, [endpoints, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <th
      className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-200 transition-colors"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown className={`w-3 h-3 ${sortField === field ? 'text-yellow-400' : ''}`} />
      </div>
    </th>
  );

  const TrendIcon = ({ endpoint }: { endpoint: string }) => {
    const trend = trendsMap[endpoint];
    if (!trend) return null;

    if (trend.direction === 'increasing') {
      return (
        <span className="flex items-center gap-1 text-green-400 text-xs">
          <TrendingUp className="w-3 h-3" />
          +{trend.change_percent.toFixed(0)}%
        </span>
      );
    }
    if (trend.direction === 'decreasing') {
      return (
        <span className="flex items-center gap-1 text-red-400 text-xs">
          <TrendingDown className="w-3 h-3" />
          {trend.change_percent.toFixed(0)}%
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-gray-500 text-xs">
        <Minus className="w-3 h-3" />
      </span>
    );
  };

  if (endpoints.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No endpoints tracked yet
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-800/50 border-b border-gray-700">
          <tr>
            <SortHeader field="endpoint">Endpoint</SortHeader>
            <SortHeader field="method">Method</SortHeader>
            <SortHeader field="total_calls">Calls</SortHeader>
            <SortHeader field="avg_response_time_ms">Avg Time</SortHeader>
            <SortHeader field="error_rate">Error Rate</SortHeader>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Trend
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {sortedEndpoints.map((ep, idx) => (
            <tr
              key={`${ep.endpoint}-${ep.method}`}
              className="hover:bg-gray-800/30 transition-colors"
            >
              <td className="px-4 py-3">
                <span className="font-mono text-sm text-gray-200">{ep.endpoint}</span>
              </td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 text-xs font-semibold rounded border ${METHOD_BADGES[ep.method] || 'bg-gray-600/20 text-gray-300'}`}>
                  {ep.method}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-300">
                {ep.total_calls.toLocaleString()}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3 text-gray-500" />
                  <span className={`${ep.avg_response_time_ms > 500 ? 'text-yellow-400' : 'text-gray-300'}`}>
                    {ep.avg_response_time_ms?.toFixed(0) || 0}ms
                  </span>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {ep.error_rate > 5 && <AlertTriangle className="w-3 h-3 text-red-400" />}
                  <span className={`${ep.error_rate > 5 ? 'text-red-400' : ep.error_rate > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                    {ep.error_rate?.toFixed(1) || 0}%
                  </span>
                </div>
              </td>
              <td className="px-4 py-3">
                <TrendIcon endpoint={ep.endpoint} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
