'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Shield,
  Zap,
  Wrench,
  TestTube,
  FileText,
  Package,
  Layers,
  Eye,
  HelpCircle,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import type { DbTechDebt, TechDebtCategory } from '@/app/db/models/tech-debt.types';

interface TechDebtCardProps {
  techDebt: DbTechDebt;
  onSelect: () => void;
  onCreateBacklog: () => void;
}

const categoryIcons: Record<TechDebtCategory, React.ReactNode> = {
  code_quality: <AlertTriangle className="w-4 h-4" />,
  security: <Shield className="w-4 h-4" />,
  performance: <Zap className="w-4 h-4" />,
  maintainability: <Wrench className="w-4 h-4" />,
  testing: <TestTube className="w-4 h-4" />,
  documentation: <FileText className="w-4 h-4" />,
  dependencies: <Package className="w-4 h-4" />,
  architecture: <Layers className="w-4 h-4" />,
  accessibility: <Eye className="w-4 h-4" />,
  other: <HelpCircle className="w-4 h-4" />
};

const severityColors = {
  critical: 'border-red-500/60 bg-red-500/10 text-red-300',
  high: 'border-orange-500/60 bg-orange-500/10 text-orange-300',
  medium: 'border-yellow-500/60 bg-yellow-500/10 text-yellow-300',
  low: 'border-blue-500/60 bg-blue-500/10 text-blue-300'
};

const statusColors = {
  detected: 'text-gray-400',
  acknowledged: 'text-blue-400',
  planned: 'text-purple-400',
  in_progress: 'text-amber-400',
  resolved: 'text-green-400',
  dismissed: 'text-gray-500'
};

export default function TechDebtCard({
  techDebt,
  onSelect,
  onCreateBacklog
}: TechDebtCardProps) {
  const riskLevel = techDebt.risk_score >= 80 ? 'critical' :
                    techDebt.risk_score >= 60 ? 'high' :
                    techDebt.risk_score >= 40 ? 'medium' : 'low';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      onClick={onSelect}
      className={`
        relative rounded-lg border-2 p-4 cursor-pointer
        bg-gray-900/50 backdrop-blur-sm
        hover:bg-gray-800/50 transition-all
        ${severityColors[techDebt.severity]}
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="text-gray-400">
            {categoryIcons[techDebt.category]}
          </div>
          <div className="flex flex-col">
            <h3 className="font-semibold text-sm text-white line-clamp-2">
              {techDebt.title}
            </h3>
            <span className="text-xs text-gray-500 capitalize">
              {techDebt.category.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Risk Score Badge */}
        <div className={`
          flex items-center justify-center w-12 h-12 rounded-full
          border-2 font-bold text-sm
          ${severityColors[riskLevel]}
        `}>
          {techDebt.risk_score}
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-gray-400 line-clamp-2 mb-3">
        {techDebt.description}
      </p>

      {/* Metadata */}
      <div className="flex items-center justify-between text-xs mb-3">
        <div className="flex items-center gap-4">
          <span className="text-gray-500">
            Severity: <span className={severityColors[techDebt.severity]}>{techDebt.severity}</span>
          </span>
          {techDebt.estimated_effort_hours && (
            <span className="text-gray-500">
              {techDebt.estimated_effort_hours}h
            </span>
          )}
        </div>
        <span className={`capitalize ${statusColors[techDebt.status]}`}>
          {techDebt.status.replace('_', ' ')}
        </span>
      </div>

      {/* File Count */}
      {techDebt.file_paths && JSON.parse(techDebt.file_paths).length > 0 && (
        <div className="text-xs text-gray-500 mb-3">
          {JSON.parse(techDebt.file_paths).length} file{JSON.parse(techDebt.file_paths).length !== 1 ? 's' : ''} affected
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-700/50">
        {!techDebt.backlog_item_id && techDebt.status !== 'resolved' && techDebt.status !== 'dismissed' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCreateBacklog();
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md
              bg-emerald-500/10 hover:bg-emerald-500/20
              border border-emerald-500/30 hover:border-emerald-500/50
              text-emerald-400 text-xs font-medium transition-all"
          >
            <ExternalLink className="w-3 h-3" />
            Create Backlog
          </button>
        )}

        {techDebt.backlog_item_id && (
          <span className="text-xs text-green-400 flex items-center gap-1">
            <ExternalLink className="w-3 h-3" />
            Backlog created
          </span>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className="ml-auto text-gray-400 hover:text-white transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Risk Indicator Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 rounded-b-lg overflow-hidden">
        <div
          className={`h-full transition-all ${
            riskLevel === 'critical' ? 'bg-red-500' :
            riskLevel === 'high' ? 'bg-orange-500' :
            riskLevel === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
          }`}
          style={{ width: `${techDebt.risk_score}%` }}
        />
      </div>
    </motion.div>
  );
}
