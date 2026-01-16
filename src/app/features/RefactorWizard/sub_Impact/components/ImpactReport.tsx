'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Download,
  Copy,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  XCircle,
  Clock,
  FileCode,
  ArrowRight,
  Shield,
} from 'lucide-react';
import type { ImpactReport as ImpactReportType, RiskAssessment, RiskFactor, ExecutionStep } from '@/lib/impact';
import { CyberCard } from '@/components/ui/wizard';
import { RISK_COLORS } from '../lib/types';

interface ImpactReportProps {
  report: ImpactReportType | null;
  executionPlan: ExecutionStep[];
  onExport: () => void;
}

export function ImpactReport({ report, executionPlan, onExport }: ImpactReportProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    if (!report) return;

    const text = generateTextReport(report);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!report) return;

    const text = generateTextReport(report);
    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `impact-report-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!report) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400">No impact analysis available</p>
        <p className="text-sm text-gray-500 mt-1">
          Select opportunities to generate an impact report
        </p>
      </div>
    );
  }

  const riskColors = RISK_COLORS[report.riskAssessment.overallRisk];

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Impact Report</h3>
          <p className="text-xs text-gray-500">
            Generated {new Date(report.generatedAt).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
          >
            {copied ? (
              <>
                <CheckCircle className="w-4 h-4 text-green-400" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy
              </>
            )}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-cyan-500 text-white hover:bg-cyan-400 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          label="Opportunities"
          value={report.summary.totalOpportunities}
          icon={FileText}
          color="cyan"
        />
        <SummaryCard
          label="Files Affected"
          value={report.summary.totalFilesAffected}
          icon={FileCode}
          color="blue"
        />
        <SummaryCard
          label="Risk Level"
          value={report.summary.riskLevel}
          icon={Shield}
          color={report.riskAssessment.overallRisk === 'critical' ? 'red' :
                 report.riskAssessment.overallRisk === 'high' ? 'orange' :
                 report.riskAssessment.overallRisk === 'medium' ? 'yellow' : 'green'}
        />
        <SummaryCard
          label="Est. Effort"
          value={report.summary.estimatedEffort}
          icon={Clock}
          color="purple"
        />
      </div>

      {/* Risk Assessment */}
      <CyberCard variant="dark" className="!p-4">
        <div className="flex items-center gap-2 mb-4">
          <RiskIcon risk={report.riskAssessment.overallRisk} />
          <h4 className="font-medium text-white">Risk Assessment</h4>
          <span className={`ml-auto px-2 py-0.5 rounded text-xs font-medium capitalize ${riskColors.bg} ${riskColors.text}`}>
            {report.riskAssessment.overallRisk} ({report.riskAssessment.score}/100)
          </span>
        </div>

        {report.riskAssessment.factors.length > 0 ? (
          <div className="space-y-3">
            {report.riskAssessment.factors.map((factor, index) => (
              <RiskFactorCard key={index} factor={factor} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No specific risk factors identified.</p>
        )}
      </CyberCard>

      {/* Impact Breakdown */}
      <CyberCard variant="dark" className="!p-4">
        <h4 className="font-medium text-white mb-4">Impact Breakdown</h4>
        <div className="grid grid-cols-3 gap-4">
          <ImpactBreakdownSection
            title="Direct"
            files={report.impactBreakdown.direct}
            color="red"
          />
          <ImpactBreakdownSection
            title="Indirect"
            files={report.impactBreakdown.indirect}
            color="yellow"
          />
          <ImpactBreakdownSection
            title="Potential"
            files={report.impactBreakdown.potential}
            color="gray"
          />
        </div>
      </CyberCard>

      {/* Execution Plan */}
      {executionPlan.length > 0 && (
        <CyberCard variant="dark" className="!p-4">
          <h4 className="font-medium text-white mb-4">Execution Plan</h4>
          <div className="space-y-3">
            {executionPlan.map((step, index) => (
              <ExecutionStepCard
                key={step.order}
                step={step}
                isFirst={index === 0}
                isLast={index === executionPlan.length - 1}
              />
            ))}
          </div>
        </CyberCard>
      )}

      {/* Recommendations */}
      {report.recommendations.length > 0 && (
        <CyberCard variant="dark" className="!p-4">
          <h4 className="font-medium text-white mb-4">Recommendations</h4>
          <ul className="space-y-2">
            {report.recommendations.map((rec, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-300">{rec}</span>
              </li>
            ))}
          </ul>
        </CyberCard>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    cyan: 'bg-cyan-500/10 text-cyan-400',
    blue: 'bg-blue-500/10 text-blue-400',
    red: 'bg-red-500/10 text-red-400',
    orange: 'bg-orange-500/10 text-orange-400',
    yellow: 'bg-yellow-500/10 text-yellow-400',
    green: 'bg-green-500/10 text-green-400',
    purple: 'bg-purple-500/10 text-purple-400',
    gray: 'bg-gray-500/10 text-gray-400',
  };

  return (
    <CyberCard variant="dark" className="!p-3">
      <div className="flex items-center gap-2 mb-1">
        <div className={`p-1.5 rounded ${colorClasses[color] || colorClasses.gray}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-xl font-bold text-white capitalize">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </CyberCard>
  );
}

function RiskIcon({ risk }: { risk: string }) {
  const iconProps = { className: 'w-5 h-5' };

  switch (risk) {
    case 'critical':
      return <XCircle {...iconProps} className="w-5 h-5 text-red-400" />;
    case 'high':
      return <AlertTriangle {...iconProps} className="w-5 h-5 text-orange-400" />;
    case 'medium':
      return <AlertCircle {...iconProps} className="w-5 h-5 text-yellow-400" />;
    default:
      return <CheckCircle {...iconProps} className="w-5 h-5 text-green-400" />;
  }
}

function RiskFactorCard({ factor }: { factor: RiskFactor }) {
  const colors = RISK_COLORS[factor.severity];

  return (
    <div className={`p-3 rounded-lg border ${colors.border} ${colors.bg}`}>
      <div className="flex items-center justify-between mb-1">
        <span className={`font-medium text-sm ${colors.text}`}>{factor.name}</span>
        <span className={`text-xs px-1.5 py-0.5 rounded capitalize ${colors.bg} ${colors.text}`}>
          {factor.severity}
        </span>
      </div>
      <p className="text-xs text-gray-400">{factor.description}</p>
      {factor.mitigation && (
        <p className="text-xs text-gray-500 mt-2 italic">
          Mitigation: {factor.mitigation}
        </p>
      )}
    </div>
  );
}

function ImpactBreakdownSection({
  title,
  files,
  color,
}: {
  title: string;
  files: string[];
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    red: 'text-red-400',
    yellow: 'text-yellow-400',
    gray: 'text-gray-400',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h5 className={`text-sm font-medium ${colorClasses[color]}`}>{title}</h5>
        <span className="text-xs text-gray-500">{files.length} files</span>
      </div>
      {files.length > 0 ? (
        <ul className="space-y-1 max-h-32 overflow-y-auto text-xs">
          {files.slice(0, 5).map((file, index) => (
            <li key={index} className="text-gray-400 truncate" title={file}>
              {file.split('/').pop()}
            </li>
          ))}
          {files.length > 5 && (
            <li className="text-gray-600">+{files.length - 5} more</li>
          )}
        </ul>
      ) : (
        <p className="text-xs text-gray-600">None</p>
      )}
    </div>
  );
}

function ExecutionStepCard({
  step,
  isFirst,
  isLast,
}: {
  step: ExecutionStep;
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      {/* Step indicator */}
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm ${
          isFirst ? 'bg-cyan-500 text-white' : 'bg-gray-700 text-gray-300'
        }`}>
          {step.order}
        </div>
        {!isLast && (
          <div className="w-px h-8 bg-gray-700 my-1" />
        )}
      </div>

      {/* Step content */}
      <div className="flex-1 pb-4">
        <p className="text-sm text-gray-200">{step.description}</p>
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
          <span>{step.files.length} files</span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {step.estimatedDuration}
          </span>
        </div>
      </div>
    </div>
  );
}

function generateTextReport(report: ImpactReportType): string {
  return `# ${report.title}

Generated: ${new Date(report.generatedAt).toLocaleString()}

## Summary

- **Total Opportunities:** ${report.summary.totalOpportunities}
- **Total Files Affected:** ${report.summary.totalFilesAffected}
- **Risk Level:** ${report.summary.riskLevel}
- **Estimated Effort:** ${report.summary.estimatedEffort}

## Risk Assessment

**Overall Risk:** ${report.riskAssessment.overallRisk} (${report.riskAssessment.score}/100)

### Risk Factors

${report.riskAssessment.factors.map(f =>
  `- **${f.name}** (${f.severity}): ${f.description}${f.mitigation ? `\n  - Mitigation: ${f.mitigation}` : ''}`
).join('\n')}

## Impact Breakdown

### Direct Impact (${report.impactBreakdown.direct.length} files)
${report.impactBreakdown.direct.map(f => `- ${f}`).join('\n') || 'None'}

### Indirect Impact (${report.impactBreakdown.indirect.length} files)
${report.impactBreakdown.indirect.map(f => `- ${f}`).join('\n') || 'None'}

### Potential Impact (${report.impactBreakdown.potential.length} files)
${report.impactBreakdown.potential.map(f => `- ${f}`).join('\n') || 'None'}

## Recommendations

${report.recommendations.map(r => `- ${r}`).join('\n')}

---
*Generated by Vibeman RefactorWizard*
`;
}
