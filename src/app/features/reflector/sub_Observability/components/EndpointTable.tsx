'use client';

import React, { useState, useMemo } from 'react';
import { ArrowUpDown, AlertTriangle, Clock, TrendingUp, TrendingDown, Minus, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
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
type MethodFilter = 'all' | 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

const ITEMS_PER_PAGE = 20;

const METHOD_BADGES: Record<string, string> = {
  GET: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  POST: 'bg-green-500/20 text-green-300 border-green-500/30',
  PUT: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  DELETE: 'bg-red-500/20 text-red-300 border-red-500/30',
  PATCH: 'bg-purple-500/20 text-purple-300 border-purple-500/30'
};

const METHOD_OPTIONS: MethodFilter[] = ['all', 'GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

export default function EndpointTable({ endpoints, trends = [] }: EndpointTableProps) {
  const [sortField, setSortField] = useState<SortField>('total_calls');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [methodFilter, setMethodFilter] = useState<MethodFilter>('all');

  const trendsMap = useMemo(() => {
    const map: Record<string, { direction: string; change_percent: number }> = {};
    trends.forEach(t => {
      map[t.endpoint] = { direction: t.direction, change_percent: t.change_percent };
    });
    return map;
  }, [trends]);

  // Filter by method
  const filteredEndpoints = useMemo(() => {
    if (methodFilter === 'all') return endpoints;
    return endpoints.filter(ep => ep.method === methodFilter);
  }, [endpoints, methodFilter]);

  // Sort filtered endpoints
  const sortedEndpoints = useMemo(() => {
    return [...filteredEndpoints].sort((a, b) => {
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
  }, [filteredEndpoints, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedEndpoints.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedEndpoints = sortedEndpoints.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Reset page when filter changes
  const handleMethodFilter = (method: MethodFilter) => {
    setMethodFilter(method);
    setCurrentPage(1);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1); // Reset to first page on sort
  };

  const SortHeader = ({ field, children, className = '' }: { field: SortField; children: React.ReactNode; className?: string }) => (
    <th
      className={`px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-200 transition-colors ${className}`}
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
    if (!trend) return <span className="text-gray-600">-</span>;

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

  // Get unique methods from data for filter counts
  const methodCounts = useMemo(() => {
    const counts: Record<string, number> = { all: endpoints.length };
    endpoints.forEach(ep => {
      counts[ep.method] = (counts[ep.method] || 0) + 1;
    });
    return counts;
  }, [endpoints]);

  if (endpoints.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No endpoints tracked yet
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Filter bar */}
      <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-400">Method:</span>
          <div className="flex gap-1">
            {METHOD_OPTIONS.map(method => (
              <button
                key={method}
                onClick={() => handleMethodFilter(method)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  methodFilter === method
                    ? method === 'all'
                      ? 'bg-gray-600 text-white'
                      : METHOD_BADGES[method]
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {method === 'all' ? 'All' : method}
                {methodCounts[method] ? ` (${methodCounts[method]})` : ''}
              </button>
            ))}
          </div>
        </div>
        <div className="text-sm text-gray-500">
          {filteredEndpoints.length} endpoint{filteredEndpoints.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto flex-1 min-h-0">
        <table className="w-full text-sm">
          <thead className="bg-gray-800/50 border-b border-gray-700 sticky top-0">
            <tr>
              <SortHeader field="endpoint" className="min-w-[200px]">Endpoint</SortHeader>
              <SortHeader field="method" className="w-20">Method</SortHeader>
              <SortHeader field="total_calls" className="w-24">Calls</SortHeader>
              <SortHeader field="avg_response_time_ms" className="w-28">Avg Time</SortHeader>
              <SortHeader field="error_rate" className="w-28">Error Rate</SortHeader>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-24">
                Trend
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {paginatedEndpoints.map((ep) => (
              <tr
                key={`${ep.endpoint}-${ep.method}`}
                className="hover:bg-gray-800/30 transition-colors"
              >
                <td className="px-3 py-2">
                  <span className="font-mono text-xs text-gray-200 truncate block max-w-[300px]" title={ep.endpoint}>
                    {ep.endpoint}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded border ${METHOD_BADGES[ep.method] || 'bg-gray-600/20 text-gray-300'}`}>
                    {ep.method}
                  </span>
                </td>
                <td className="px-3 py-2 text-gray-300 text-xs">
                  {ep.total_calls.toLocaleString()}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-gray-500" />
                    <span className={`text-xs ${ep.avg_response_time_ms > 500 ? 'text-yellow-400' : 'text-gray-300'}`}>
                      {ep.avg_response_time_ms?.toFixed(0) || 0}ms
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    {ep.error_rate > 5 && <AlertTriangle className="w-3 h-3 text-red-400" />}
                    <span className={`text-xs ${ep.error_rate > 5 ? 'text-red-400' : ep.error_rate > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                      {ep.error_rate?.toFixed(1) || 0}%
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <TrendIcon endpoint={ep.endpoint} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-gray-700 flex items-center justify-between flex-shrink-0">
          <div className="text-sm text-gray-500">
            Showing {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, sortedEndpoints.length)} of {sortedEndpoints.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-400" />
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => {
                  // Show first, last, current, and pages around current
                  if (page === 1 || page === totalPages) return true;
                  if (Math.abs(page - currentPage) <= 1) return true;
                  return false;
                })
                .map((page, idx, arr) => {
                  // Add ellipsis between non-consecutive pages
                  const showEllipsis = idx > 0 && page - arr[idx - 1] > 1;
                  return (
                    <React.Fragment key={page}>
                      {showEllipsis && <span className="text-gray-600 px-1">...</span>}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 rounded text-sm transition-colors ${
                          currentPage === page
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            : 'text-gray-400 hover:bg-gray-700'
                        }`}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  );
                })}
            </div>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
