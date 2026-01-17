'use client';

import React from 'react';
import { Activity, Clock, AlertTriangle, Layers } from 'lucide-react';

interface ObsKPICardsProps {
  totalCalls: number;
  uniqueEndpoints: number;
  avgResponseTimeMs: number;
  errorRate: number;
}

export default function ObsKPICards({
  totalCalls,
  uniqueEndpoints,
  avgResponseTimeMs,
  errorRate
}: ObsKPICardsProps) {
  const cards = [
    {
      label: 'Total API Calls',
      value: totalCalls.toLocaleString(),
      icon: Activity,
      color: 'cyan',
      gradient: 'from-cyan-500/20 to-cyan-600/10',
      border: 'border-cyan-500/30'
    },
    {
      label: 'Unique Endpoints',
      value: uniqueEndpoints.toString(),
      icon: Layers,
      color: 'purple',
      gradient: 'from-purple-500/20 to-purple-600/10',
      border: 'border-purple-500/30'
    },
    {
      label: 'Avg Response Time',
      value: `${avgResponseTimeMs.toFixed(0)}ms`,
      icon: Clock,
      color: 'yellow',
      gradient: 'from-yellow-500/20 to-yellow-600/10',
      border: 'border-yellow-500/30'
    },
    {
      label: 'Error Rate',
      value: `${errorRate.toFixed(1)}%`,
      icon: AlertTriangle,
      color: errorRate > 5 ? 'red' : 'green',
      gradient: errorRate > 5 ? 'from-red-500/20 to-red-600/10' : 'from-green-500/20 to-green-600/10',
      border: errorRate > 5 ? 'border-red-500/30' : 'border-green-500/30'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${card.gradient} border ${card.border} p-5`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">{card.label}</p>
                <p className={`text-2xl font-bold text-${card.color}-300`}>
                  {card.value}
                </p>
              </div>
              <div className={`p-2 rounded-lg bg-${card.color}-500/20`}>
                <Icon className={`w-5 h-5 text-${card.color}-400`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
