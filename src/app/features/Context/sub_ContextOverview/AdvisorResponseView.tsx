'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, TrendingUp, Shield, Lightbulb, FileText } from 'lucide-react';
import { AdvisorPersona } from './advisorPrompts';
import MarkdownViewer from '@/components/markdown/MarkdownViewer';
import { PriorityBadge } from './components/PriorityBadge';
import { FileChip } from './components/FileChip';
import { SectionHeader } from './components/SectionHeader';
import { AnimatedCard } from './components/AnimatedCard';
import {
  AdvisorResponseData,
  AdvisorRecommendation,
  AdvisorVulnerability,
  AdvisorImprovement,
  AdvisorOpportunity,
  AdvisorIdea,
  AdvisorIssue,
  UXResponseData,
  SecurityResponseData,
  ArchitectResponseData,
  VisionaryResponseData,
  ChumResponseData,
  GenericResponseData,
} from './types';

interface AdvisorResponseViewProps {
  advisor: AdvisorPersona;
  response: {
    advisor: string;
    data: AdvisorResponseData;
    isGenerating: boolean;
    error?: string;
  };
}

// Helper Components
const ErrorView: React.FC<{ error: string }> = ({ error }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="p-6 rounded-xl bg-red-500/10 border border-red-500/30"
  >
    <div className="flex items-start space-x-3">
      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
      <div>
        <h6 className="text-sm font-semibold text-red-400 mb-1">Error</h6>
        <p className="text-sm text-gray-300">{error}</p>
      </div>
    </div>
  </motion.div>
);

const SummaryBox: React.FC<{ text: string }> = ({ text }) => (
  <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700/30">
    <p className="text-gray-300 text-sm leading-relaxed">{text}</p>
  </div>
);

const HighlightBox: React.FC<{ title: string; content: string; color: string; icon?: React.ReactNode }> = ({ title, content, color, icon }) => (
  <div
    className="p-4 rounded-lg border-2"
    style={{
      borderColor: `${color}40`,
      backgroundColor: `${color}10`,
    }}
  >
    <div className="flex items-start space-x-2 mb-2">
      {icon && <span className="flex-shrink-0 mt-0.5">{icon}</span>}
      <h6 className="text-sm font-semibold font-mono" style={{ color }}>
        {title}
      </h6>
    </div>
    <p className="text-sm text-gray-300 leading-relaxed">{content}</p>
  </div>
);

const RecommendationItem: React.FC<{ rec: AdvisorRecommendation; index: number }> = ({ rec, index }) => (
  <AnimatedCard index={index}>
    <div className="flex items-start justify-between mb-2">
      <h6 className="text-sm font-semibold text-gray-200">{rec.title}</h6>
      {rec.priority && <PriorityBadge priority={rec.priority} />}
    </div>
    <p className="text-sm text-gray-400 mb-3">{rec.description}</p>
    {rec.files && rec.files.length > 0 && (
      <div className="flex flex-wrap gap-2">
        {rec.files.map((file, i) => (
          <FileChip key={i} filename={file} />
        ))}
      </div>
    )}
  </AnimatedCard>
);

const VulnerabilityItem: React.FC<{ vuln: AdvisorVulnerability; index: number }> = ({ vuln, index }) => (
  <AnimatedCard index={index}>
    <div className="flex items-start justify-between mb-2">
      <h6 className="text-sm font-semibold text-gray-200">{vuln.title}</h6>
      <PriorityBadge priority={vuln.severity} />
    </div>
    <p className="text-sm text-gray-400 mb-3">{vuln.description}</p>
    {vuln.fix && (
      <div className="p-3 rounded bg-gray-700/30 border border-gray-600/30">
        <p className="text-sm text-gray-300 mb-1 font-semibold">Suggested Fix:</p>
        <p className="text-sm text-gray-400">{vuln.fix}</p>
      </div>
    )}
    {vuln.files && vuln.files.length > 0 && (
      <div className="flex flex-wrap gap-2 mt-3">
        {vuln.files.map((file, i) => (
          <FileChip key={i} filename={file} />
        ))}
      </div>
    )}
  </AnimatedCard>
);

const ImprovementItem: React.FC<{ imp: AdvisorImprovement; index: number }> = ({ imp, index }) => (
  <AnimatedCard index={index}>
    <div className="flex items-start justify-between mb-2">
      <h6 className="text-sm font-semibold text-gray-200">{imp.title}</h6>
      {imp.pattern && (
        <span className="text-sm px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 font-mono">
          {imp.pattern}
        </span>
      )}
    </div>
    <p className="text-sm text-gray-400 mb-3">{imp.description}</p>
    {imp.files && imp.files.length > 0 && (
      <div className="flex flex-wrap gap-2">
        {imp.files.map((file, i) => (
          <FileChip key={i} filename={file} />
        ))}
      </div>
    )}
  </AnimatedCard>
);

// Render functions with types
const renderUXResponse = (data: UXResponseData, color: string) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="space-y-6"
  >
    {data.summary && <SummaryBox text={data.summary} />}

    {data.recommendations && data.recommendations.length > 0 && (
      <div className="space-y-4">
        <SectionHeader title="Recommendations" color={color} />
        {data.recommendations.map((rec, index) => (
          <RecommendationItem key={index} rec={rec} index={index} />
        ))}
      </div>
    )}

    {data.moonshot && (
      <HighlightBox
        title="Moonshot Idea"
        content={data.moonshot}
        color={color}
        icon={<Lightbulb className="w-5 h-5" style={{ color }} />}
      />
    )}
  </motion.div>
);

const renderSecurityResponse = (data: SecurityResponseData, color: string) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="space-y-6"
  >
    {data.riskAssessment && (
      <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
        <div className="flex items-start space-x-2 mb-2">
          <Shield className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <h6 className="text-sm font-semibold text-red-400">Risk Assessment</h6>
        </div>
        <p className="text-sm text-gray-300 leading-relaxed">{data.riskAssessment}</p>
      </div>
    )}

    {data.vulnerabilities && data.vulnerabilities.length > 0 && (
      <div className="space-y-4">
        <SectionHeader title="Vulnerabilities" color={color} />
        {data.vulnerabilities.map((vuln, index) => (
          <VulnerabilityItem key={index} vuln={vuln} index={index} />
        ))}
      </div>
    )}

    {data.performanceOptimization && (
      <div className="p-4 rounded-lg border border-cyan-500/30 bg-cyan-500/10">
        <div className="flex items-start space-x-2 mb-2">
          <TrendingUp className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
          <h6 className="text-sm font-semibold text-cyan-400">Performance Optimization</h6>
        </div>
        <p className="text-sm text-gray-300 leading-relaxed">{data.performanceOptimization}</p>
      </div>
    )}
  </motion.div>
);

const renderArchitectResponse = (data: ArchitectResponseData, color: string) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="space-y-6"
  >
    {data.overview && <SummaryBox text={data.overview} />}

    {data.improvements && data.improvements.length > 0 && (
      <div className="space-y-4">
        <SectionHeader title="Architectural Improvements" color={color} />
        {data.improvements.map((imp, index) => (
          <ImprovementItem key={index} imp={imp} index={index} />
        ))}
      </div>
    )}

    {data.vision && (
      <HighlightBox
        title="Long-term Vision"
        content={data.vision}
        color={color}
        icon={<Lightbulb className="w-5 h-5" style={{ color }} />}
      />
    )}
  </motion.div>
);

const renderVisionaryResponse = (data: VisionaryResponseData, color: string) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="space-y-6"
  >
    {data.bigPicture && (
      <div
        className="p-4 rounded-lg border-2"
        style={{
          borderColor: `${color}40`,
          backgroundColor: `${color}10`,
        }}
      >
        <p className="text-gray-200 text-sm leading-relaxed font-medium">{data.bigPicture}</p>
      </div>
    )}

    {data.opportunities && data.opportunities.length > 0 && (
      <div className="space-y-4">
        <SectionHeader title="Strategic Opportunities" color={color} />
        {data.opportunities.map((opp, index) => (
          <AnimatedCard key={index} index={index}>
            <h6 className="text-sm font-semibold text-gray-200 mb-2">{opp.title}</h6>
            <p className="text-sm text-gray-400 mb-3">{opp.description}</p>
            {opp.impact && (
              <div className="flex items-start space-x-2 p-3 rounded bg-purple-500/10 border border-purple-500/20">
                <TrendingUp className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-purple-300">{opp.impact}</p>
              </div>
            )}
          </AnimatedCard>
        ))}
      </div>
    )}

    {data.boldVision && (
      <div className="p-4 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/40">
        <div className="flex items-start space-x-2 mb-2">
          <Lightbulb className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color }} />
          <h6 className="text-sm font-semibold font-mono" style={{ color }}>
            Bold Vision
          </h6>
        </div>
        <p className="text-sm text-gray-200 leading-relaxed font-medium">{data.boldVision}</p>
      </div>
    )}
  </motion.div>
);

const renderChumResponse = (data: ChumResponseData, color: string) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="space-y-6"
  >
    {data.enthusiasm && (
      <div
        className="p-4 rounded-lg border-2"
        style={{
          borderColor: `${color}40`,
          backgroundColor: `${color}10`,
        }}
      >
        <p className="text-gray-200 text-sm leading-relaxed font-medium">{data.enthusiasm}</p>
      </div>
    )}

    {data.ideas && data.ideas.length > 0 && (
      <div className="space-y-4">
        <SectionHeader title="Creative Ideas" color={color} />
        {data.ideas.map((idea, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -10, rotate: -2 }}
            animate={{ opacity: 1, x: 0, rotate: 0 }}
            transition={{ delay: index * 0.1 }}
            className="p-4 rounded-lg bg-gradient-to-br from-orange-500/10 to-yellow-500/10 border border-orange-500/30 hover:border-orange-400/50 transition-all"
          >
            <div className="flex items-start justify-between mb-2">
              <h6 className="text-sm font-semibold text-gray-200">{idea.title}</h6>
              <span
                className={`text-sm px-2 py-1 rounded-full font-mono ${
                  idea.feasibility === 'high'
                    ? 'bg-green-500/20 text-green-400'
                    : idea.feasibility === 'medium'
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-purple-500/20 text-purple-400'
                }`}
              >
                {idea.feasibility === 'wild' ? '🚀 wild' : idea.feasibility}
              </span>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed">{idea.description}</p>
          </motion.div>
        ))}
      </div>
    )}

    {data.audaciousIdea && (
      <div className="p-4 rounded-lg bg-gradient-to-r from-orange-500/20 to-red-500/20 border-2 border-orange-500/40">
        <div className="flex items-start space-x-2 mb-2">
          <span className="text-2xl">🤯</span>
          <h6 className="text-sm font-semibold font-mono" style={{ color }}>
            Most Audacious Idea
          </h6>
        </div>
        <p className="text-sm text-gray-200 leading-relaxed font-medium">{data.audaciousIdea}</p>
      </div>
    )}
  </motion.div>
);

const renderMarkdownFallback = (markdown: string, color: string) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="space-y-4"
  >
    <div
      className="p-3 rounded-lg border flex items-start space-x-2"
      style={{
        borderColor: `${color}40`,
        backgroundColor: `${color}10`,
      }}
    >
      <FileText className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color }} />
      <p className="text-sm text-gray-400 font-mono">
        Response received in markdown format. The AI did not follow the structured JSON format, so we're displaying the raw content below.
      </p>
    </div>

    <div className="p-6 rounded-xl bg-gray-800/30 border border-gray-700/20">
      <div className="markdown-content prose prose-invert prose-sm max-w-none">
        <MarkdownViewer content={markdown} />
      </div>
    </div>
  </motion.div>
);

const renderGenericResponse = (data: GenericResponseData, advisor: AdvisorPersona) => {
  const color = advisor.color;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      <div
        className="p-3 rounded-lg border flex items-start space-x-2"
        style={{
          borderColor: `${color}40`,
          backgroundColor: `${color}10`,
        }}
      >
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color }} />
        <p className="text-sm text-gray-400 font-mono">
          Response received in generic format. The AI provided issues/recommendations instead of the expected structure.
        </p>
      </div>

      {data.issues && data.issues.length > 0 && (
        <div className="space-y-4">
          <SectionHeader title="Issues Found" color={color} />
          {data.issues.map((issue, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-4 rounded-lg bg-gray-800/30 border border-gray-700/20 hover:border-gray-600/40 transition-colors"
            >
              <h6 className="text-sm font-semibold text-gray-200 mb-2">
                {issue.issue || issue.title || 'Issue'}
              </h6>
              {issue.suggestion && <p className="text-sm text-gray-400 mb-3">{issue.suggestion}</p>}
              {issue.file && <FileChip filename={issue.file} />}
            </motion.div>
          ))}
        </div>
      )}

      {data.recommendations && data.recommendations.length > 0 && (
        <div className="space-y-4">
          <SectionHeader title="Recommendations" color={color} />
          {data.recommendations.map((rec, index) => (
            <RecommendationItem key={index} rec={rec} index={index} />
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default function AdvisorResponseView({ advisor, response }: AdvisorResponseViewProps) {
  if (response.error) {
    return <ErrorView error={response.error} />;
  }

  if (!response.data) {
    return null;
  }

  const data = response.data;

  // Check if this is a raw markdown fallback
  if ('_raw' in data && '_markdown' in data) {
    return renderMarkdownFallback(data._markdown, advisor.color);
  }

  // Check if this is a generic response format (issues/recommendations)
  if ('issues' in data || 'recommendations' in data) {
    return renderGenericResponse(data as GenericResponseData, advisor);
  }

  // Render based on advisor type
  switch (advisor.id) {
    case 'ux':
      return renderUXResponse(data as UXResponseData, advisor.color);
    case 'security':
      return renderSecurityResponse(data as SecurityResponseData, advisor.color);
    case 'architect':
      return renderArchitectResponse(data as ArchitectResponseData, advisor.color);
    case 'visionary':
      return renderVisionaryResponse(data as VisionaryResponseData, advisor.color);
    case 'chum':
      return renderChumResponse(data as ChumResponseData, advisor.color);
    default:
      return null;
  }
}
