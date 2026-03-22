'use client';

import { useState, useEffect } from 'react';
import type { MonitorStatistics } from '../lib';
import { TrendingUp, Activity, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function MonitorStatistics() {
  const [stats, setStats] = useState<MonitorStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStatistics();
    
    // Refresh every 10 seconds
    const interval = setInterval(loadStatistics, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadStatistics = async () => {
    try {
      const response = await fetch('/api/monitor/statistics');
      const data = await response.json();
      
      if (data.success) {
        setStats(data.statistics);
      }
    } catch (error) {
      // Error loading statistics
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-gray-800/50 rounded-xl p-4 animate-pulse">
            <div className="h-4 bg-gray-700 rounded w-1/2 mb-2" />
            <div className="h-8 bg-gray-700 rounded w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Calls',
      value: stats.total,
      icon: Activity,
      color: 'cyan'
    },
    {
      label: 'Completed',
      value: stats.completed,
      icon: CheckCircle,
      color: 'green'
    },
    {
      label: 'Failed',
      value: stats.failed,
      icon: XCircle,
      color: 'red'
    },
    {
      label: 'Active',
      value: stats.active,
      icon: TrendingUp,
      color: 'blue'
    },
    {
      label: 'Avg Duration',
      value: stats.avgDuration ? `${(stats.avgDuration / 1000).toFixed(1)}s` : '-',
      icon: Clock,
      color: 'purple'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        const colorClasses = {
          cyan: { gradient: 'from-cyan-600/20 to-blue-600/20', border: 'border-cyan-500/30', text: 'text-cyan-400' },
          green: { gradient: 'from-green-600/20 to-emerald-600/20', border: 'border-green-500/30', text: 'text-green-400' },
          red: { gradient: 'from-red-600/20 to-rose-600/20', border: 'border-red-500/30', text: 'text-red-400' },
          blue: { gradient: 'from-blue-600/20 to-indigo-600/20', border: 'border-blue-500/30', text: 'text-blue-400' },
          purple: { gradient: 'from-purple-600/20 to-pink-600/20', border: 'border-purple-500/30', text: 'text-purple-400' },
        };
        const c = colorClasses[stat.color as keyof typeof colorClasses];

        return (
          <div
            key={index}
            className={`bg-gradient-to-br ${c.gradient} ${c.border} ${c.text} border rounded-xl p-4 backdrop-blur-sm`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-mono uppercase tracking-wider text-gray-400">
                {stat.label}
              </span>
              <Icon className={`w-4 h-4 ${c.text}`} />
            </div>
            <div className={`text-2xl font-bold font-mono ${c.text}`}>
              {stat.value}
            </div>
          </div>
        );
      })}
    </div>
  );
}
