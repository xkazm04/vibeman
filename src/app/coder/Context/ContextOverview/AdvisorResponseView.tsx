'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, FileCode, TrendingUp, Shield, Lightbulb, FileText } from 'lucide-react';
import { AdvisorPersona } from './advisorPrompts';
import MarkdownViewer from '@/components/markdown/MarkdownViewer';

interface AdvisorResponseViewProps {
  advisor: AdvisorPersona;
  response: {
    advisor: string;
    data: any;
    isGenerating: boolean;
    error?: string;
  };
}

export default function AdvisorResponseView({ advisor, response }: AdvisorResponseViewProps) {
  if (response.error) {
    return (
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
            <p className="text-sm text-gray-300">{response.error}</p>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!response.data) {
    return null;
  }

  const data = response.data;

  // Check if this is a raw markdown fallback
  if (data._raw && data._markdown) {
    return renderMarkdownFallback(data._markdown, advisor.color);
  }

  // Render based on advisor type
  switch (advisor.id) {
    case 'ux':
      return renderUXResponse(data, advisor.color);
    case 'security':
      return renderSecurityResponse(data, advisor.color);
    case 'architect':
      return renderArchitectResponse(data, advisor.color);
    case 'visionary':
      return renderVisionaryResponse(data, advisor.color);
    case 'chum':
      return renderChumResponse(data, advisor.color);
    default:
      return null;
  }
}

function renderUXResponse(data: any, color: string) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {/* Summary */}
      {data.summary && (
        <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700/30">
          <p className="text-gray-300 text-sm leading-relaxed">{data.summary}</p>
        </div>
      )}

      {/* Recommendations */}
      {data.recommendations && data.recommendations.length > 0 && (
        <div className="space-y-4">
          <h6 className="text-sm font-semibold font-mono" style={{ color }}>
            Recommendations
          </h6>
          {data.recommendations.map((rec: any, index: number) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 rounded-lg bg-gray-800/30 border border-gray-700/20 hover:border-gray-600/40 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <h6 className="text-sm font-semibold text-gray-200">{rec.title}</h6>
                {rec.priority && (
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-mono ${
                      rec.priority === 'high'
                        ? 'bg-red-500/20 text-red-400'
                        : rec.priority === 'medium'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-green-500/20 text-green-400'
                    }`}
                  >
                    {rec.priority}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-400 mb-3">{rec.description}</p>
              {rec.files && rec.files.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {rec.files.map((file: string, i: number) => (
                    <span
                      key={i}
                      className="text-xs px-2 py-1 rounded bg-gray-700/50 text-gray-400 font-mono flex items-center space-x-1"
                    >
                      <FileCode className="w-3 h-3" />
                      <span>{file}</span>
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Moonshot */}
      {data.moonshot && (
        <div
          className="p-4 rounded-lg border-2"
          style={{
            borderColor: `${color}40`,
            backgroundColor: `${color}10`,
          }}
        >
          <div className="flex items-start space-x-2 mb-2">
            <Lightbulb className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color }} />
            <h6 className="text-sm font-semibold font-mono" style={{ color }}>
              Moonshot Idea
            </h6>
          </div>
          <p className="text-sm text-gray-300 leading-relaxed">{data.moonshot}</p>
        </div>
      )}
    </motion.div>
  );
}

function renderSecurityResponse(data: any, color: string) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {/* Risk Assessment */}
      {data.riskAssessment && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
          <div className="flex items-start space-x-2 mb-2">
            <Shield className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <h6 className="text-sm font-semibold text-red-400">Risk Assessment</h6>
          </div>
          <p className="text-sm text-gray-300 leading-relaxed">{data.riskAssessment}</p>
        </div>
      )}

      {/* Vulnerabilities */}
      {data.vulnerabilities && data.vulnerabilities.length > 0 && (
        <div className="space-y-4">
          <h6 className="text-sm font-semibold font-mono" style={{ color }}>
            Vulnerabilities
          </h6>
          {data.vulnerabilities.map((vuln: any, index: number) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 rounded-lg bg-gray-800/30 border border-gray-700/20"
            >
              <div className="flex items-start justify-between mb-2">
                <h6 className="text-sm font-semibold text-gray-200">{vuln.title}</h6>
                <span
                  className={`text-xs px-2 py-1 rounded-full font-mono ${
                    vuln.severity === 'critical'
                      ? 'bg-red-600/30 text-red-300'
                      : vuln.severity === 'high'
                      ? 'bg-red-500/20 text-red-400'
                      : vuln.severity === 'medium'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-green-500/20 text-green-400'
                  }`}
                >
                  {vuln.severity}
                </span>
              </div>
              <p className="text-sm text-gray-400 mb-3">{vuln.description}</p>
              {vuln.fix && (
                <div className="p-3 rounded bg-gray-700/30 border border-gray-600/30">
                  <p className="text-xs text-gray-300 mb-1 font-semibold">Suggested Fix:</p>
                  <p className="text-xs text-gray-400">{vuln.fix}</p>
                </div>
              )}
              {vuln.files && vuln.files.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {vuln.files.map((file: string, i: number) => (
                    <span
                      key={i}
                      className="text-xs px-2 py-1 rounded bg-gray-700/50 text-gray-400 font-mono flex items-center space-x-1"
                    >
                      <FileCode className="w-3 h-3" />
                      <span>{file}</span>
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Performance Optimization */}
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
}

function renderArchitectResponse(data: any, color: string) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {/* Overview */}
      {data.overview && (
        <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700/30">
          <p className="text-gray-300 text-sm leading-relaxed">{data.overview}</p>
        </div>
      )}

      {/* Improvements */}
      {data.improvements && data.improvements.length > 0 && (
        <div className="space-y-4">
          <h6 className="text-sm font-semibold font-mono" style={{ color }}>
            Architectural Improvements
          </h6>
          {data.improvements.map((imp: any, index: number) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 rounded-lg bg-gray-800/30 border border-gray-700/20 hover:border-gray-600/40 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <h6 className="text-sm font-semibold text-gray-200">{imp.title}</h6>
                {imp.pattern && (
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 font-mono">
                    {imp.pattern}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-400 mb-3">{imp.description}</p>
              {imp.files && imp.files.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {imp.files.map((file: string, i: number) => (
                    <span
                      key={i}
                      className="text-xs px-2 py-1 rounded bg-gray-700/50 text-gray-400 font-mono flex items-center space-x-1"
                    >
                      <FileCode className="w-3 h-3" />
                      <span>{file}</span>
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Vision */}
      {data.vision && (
        <div
          className="p-4 rounded-lg border-2"
          style={{
            borderColor: `${color}40`,
            backgroundColor: `${color}10`,
          }}
        >
          <div className="flex items-start space-x-2 mb-2">
            <Lightbulb className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color }} />
            <h6 className="text-sm font-semibold font-mono" style={{ color }}>
              Long-term Vision
            </h6>
          </div>
          <p className="text-sm text-gray-300 leading-relaxed">{data.vision}</p>
        </div>
      )}
    </motion.div>
  );
}

function renderVisionaryResponse(data: any, color: string) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {/* Big Picture */}
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

      {/* Opportunities */}
      {data.opportunities && data.opportunities.length > 0 && (
        <div className="space-y-4">
          <h6 className="text-sm font-semibold font-mono" style={{ color }}>
            Strategic Opportunities
          </h6>
          {data.opportunities.map((opp: any, index: number) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 rounded-lg bg-gray-800/30 border border-gray-700/20 hover:border-gray-600/40 transition-colors"
            >
              <h6 className="text-sm font-semibold text-gray-200 mb-2">{opp.title}</h6>
              <p className="text-sm text-gray-400 mb-3">{opp.description}</p>
              {opp.impact && (
                <div className="flex items-start space-x-2 p-3 rounded bg-purple-500/10 border border-purple-500/20">
                  <TrendingUp className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-purple-300">{opp.impact}</p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Bold Vision */}
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
}

function renderChumResponse(data: any, color: string) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {/* Enthusiasm */}
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

      {/* Ideas */}
      {data.ideas && data.ideas.length > 0 && (
        <div className="space-y-4">
          <h6 className="text-sm font-semibold font-mono" style={{ color }}>
            Creative Ideas
          </h6>
          {data.ideas.map((idea: any, index: number) => (
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
                  className={`text-xs px-2 py-1 rounded-full font-mono ${
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

      {/* Audacious Idea */}
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
}

function renderMarkdownFallback(markdown: string, color: string) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4"
    >
      {/* Info banner */}
      <div
        className="p-3 rounded-lg border flex items-start space-x-2"
        style={{
          borderColor: `${color}40`,
          backgroundColor: `${color}10`,
        }}
      >
        <FileText className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color }} />
        <p className="text-xs text-gray-400 font-mono">
          Response received in markdown format. The AI did not follow the structured JSON format, so we're displaying the raw content below.
        </p>
      </div>

      {/* Markdown content */}
      <div className="p-6 rounded-xl bg-gray-800/30 border border-gray-700/20">
        <div className="markdown-content prose prose-invert prose-sm max-w-none">
          <MarkdownViewer content={markdown} />
        </div>
      </div>
    </motion.div>
  );
}
