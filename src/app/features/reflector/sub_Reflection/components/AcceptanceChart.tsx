'use client';

import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ScanTypeStats } from '../lib/types';
import { SCAN_TYPE_CONFIG } from '../lib/config';

interface AcceptanceChartProps {
  scanTypeStats: ScanTypeStats[];
}

export default function AcceptanceChart({ scanTypeStats }: AcceptanceChartProps) {
  // Filter out scan types with no ideas
  const chartData = scanTypeStats
    .filter(stat => stat.total > 0)
    .map(stat => ({
      name: SCAN_TYPE_CONFIG[stat.scanType].label,
      scanType: stat.scanType,
      acceptanceRatio: stat.acceptanceRatio,
      total: stat.total
    }))
    .sort((a, b) => b.acceptanceRatio - a.acceptanceRatio);

  if (chartData.length === 0) {
    return (
      <div className="bg-gray-800/40 border border-gray-700/40 rounded-lg p-6 backdrop-blur-sm">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Acceptance Ratios</h3>
        <div className="text-center py-8 text-gray-500 text-sm">
          No data to display
        </div>
      </div>
    );
  }

  const getBarColor = (ratio: number) => {
    if (ratio >= 70) return '#4ade80'; // green-400
    if (ratio <= 30) return '#f87171'; // red-400
    return '#fbbf24'; // yellow-400
  };

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="bg-gray-800/40 border border-gray-700/40 rounded-lg p-6 backdrop-blur-sm"
    >
      <h3 className="text-sm font-semibold text-gray-300 mb-4">Acceptance Ratios by Specialist</h3>
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3}/>
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={100}
              tick={{ fill: '#9ca3af', fontSize: 11 }}
            />
            <YAxis
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              domain={[0, 100]}
              label={{ value: 'Acceptance %', angle: -90, position: 'insideLeft', fill: '#9ca3af' }}
            />
            <Tooltip
              cursor={false}
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                padding: '8px 12px'
              }}
              labelStyle={{ color: '#e5e7eb', fontWeight: 600 }}
              itemStyle={{ color: '#d1d5db' }}
              formatter={(value: number, name: string, props: { payload?: { total: number } }) => [
                `${value}% (${props.payload?.total ?? 0} ideas)`,
                'Acceptance Ratio'
              ]}
            />
            <Bar dataKey="acceptanceRatio" radius={[8, 8, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.acceptanceRatio)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
