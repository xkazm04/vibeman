'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { ADVISORS, AdvisorType } from './advisorPrompts';
import { buildContextAnalysisPrompt } from './advisorPrompts';
import { generateWithLLM } from '@/lib/llm/llm-manager';
import { SupportedProvider } from '@/lib/llm/types';
import LLMSelector from '@/app/projects/ProjectAI/LLMSelector';
import AdvisorResponseView from './AdvisorResponseView';

interface AdvisorPanelProps {
  contextDescription: string;
  filePaths: string[];
  fileContents?: Array<{ path: string; content: string }>;
  highLevelDocs?: string;
  groupColor: string;
}

interface AdvisorResponse {
  advisor: AdvisorType;
  data: any;
  isGenerating: boolean;
  error?: string;
}

export default function AdvisorPanel({
  contextDescription,
  filePaths,
  fileContents = [],
  highLevelDocs,
  groupColor,
}: AdvisorPanelProps) {
  const [selectedAdvisors, setSelectedAdvisors] = useState<Set<AdvisorType>>(new Set());
  const [responses, setResponses] = useState<Map<AdvisorType, AdvisorResponse>>(new Map());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<SupportedProvider>('anthropic');
  const [showLLMSelector, setShowLLMSelector] = useState(false);
  const [activeTab, setActiveTab] = useState<AdvisorType | null>(null);

  const toggleAdvisor = (advisorId: AdvisorType) => {
    setSelectedAdvisors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(advisorId)) {
        newSet.delete(advisorId);
      } else {
        newSet.add(advisorId);
      }
      return newSet;
    });
  };

  const parseJsonResponse = (text: string): any => {
    // First, try direct JSON parse
    try {
      return JSON.parse(text);
    } catch {
      // ignore
    }

    // Try to extract JSON from markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch {
        // ignore
      }
    }

    // Try to find the first complete JSON object
    let braceCount = 0;
    let startIndex = -1;

    for (let i = 0; i < text.length; i++) {
      if (text[i] === '{') {
        if (braceCount === 0) startIndex = i;
        braceCount++;
      } else if (text[i] === '}') {
        braceCount--;
        if (braceCount === 0 && startIndex !== -1) {
          try {
            const jsonStr = text.substring(startIndex, i + 1);
            return JSON.parse(jsonStr);
          } catch {
            // Try next potential JSON object
            startIndex = -1;
          }
        }
      }
    }

    // If all else fails, return the raw text as a fallback object
    return {
      _raw: true,
      _markdown: text,
      summary: 'Response received in markdown format',
      content: text
    };
  };

  const handleAnalyze = async () => {
    if (selectedAdvisors.size === 0) return;

    setIsAnalyzing(true);

    // Build the shared prompt
    const userPrompt = buildContextAnalysisPrompt(
      contextDescription,
      filePaths,
      fileContents,
      highLevelDocs
    );

    // Process each advisor sequentially
    const advisorsArray = Array.from(selectedAdvisors);

    for (const advisorId of advisorsArray) {
      const advisor = ADVISORS[advisorId];

      // Set generating state
      setResponses(prev => new Map(prev).set(advisorId, {
        advisor: advisorId,
        data: null,
        isGenerating: true
      }));

      // Set active tab to the generating advisor
      setActiveTab(advisorId);

      try {
        // Generate response
        const result = await generateWithLLM(userPrompt, {
          provider: selectedProvider,
          systemPrompt: advisor.systemPrompt,
          temperature: advisorId === 'chum' ? 0.9 : 0.7,
          maxTokens: 2000
        });

        if (result.success && result.text) {
          try {
            const parsedData = parseJsonResponse(result.text);
            setResponses(prev => new Map(prev).set(advisorId, {
              advisor: advisorId,
              data: parsedData,
              isGenerating: false
            }));
          } catch (parseError) {
            setResponses(prev => new Map(prev).set(advisorId, {
              advisor: advisorId,
              data: null,
              isGenerating: false,
              error: `Failed to parse response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`
            }));
          }
        } else {
          setResponses(prev => new Map(prev).set(advisorId, {
            advisor: advisorId,
            data: null,
            isGenerating: false,
            error: result.error || 'Failed to generate response'
          }));
        }
      } catch (error) {
        setResponses(prev => new Map(prev).set(advisorId, {
          advisor: advisorId,
          data: null,
          isGenerating: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }));
      }
    }

    setIsAnalyzing(false);
  };

  const handleClearAll = () => {
    setResponses(new Map());
    setSelectedAdvisors(new Set());
    setActiveTab(null);
  };

  const completedAdvisors = Array.from(responses.entries())
    .filter(([_, response]) => !response.isGenerating);

  // Auto-select first completed advisor if no tab is active
  React.useEffect(() => {
    if (completedAdvisors.length > 0 && !activeTab) {
      setActiveTab(completedAdvisors[0][0]);
    }
  }, [completedAdvisors.length]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="p-6 rounded-2xl bg-gradient-to-r from-gray-800/40 to-gray-700/40 backdrop-blur-sm border border-gray-600/30"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5" style={{ color: groupColor }} />
          <h5 className="text-lg font-semibold text-gray-300 font-mono">AI Advice</h5>
        </div>

        {/* LLM Provider Button */}
        <motion.button
          onClick={() => setShowLLMSelector(!showLLMSelector)}
          className="px-3 py-1.5 bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 rounded-lg text-xs font-mono transition-colors border border-gray-600/50"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {selectedProvider.toUpperCase()}
        </motion.button>
      </div>

      {/* LLM Provider Selector */}
      <AnimatePresence>
        {showLLMSelector && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 overflow-hidden"
          >
            <LLMSelector
              onProviderSelect={(provider) => {
                setSelectedProvider(provider);
                setShowLLMSelector(false);
              }}
              selectedProvider={selectedProvider}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Advisor Toggles */}
      <div className="flex flex-wrap gap-3 mb-6">
        {Object.values(ADVISORS).map((advisor) => {
          const isSelected = selectedAdvisors.has(advisor.id);
          const response = responses.get(advisor.id);
          const hasResponse = response && !response.isGenerating;
          const hasError = response?.error;

          return (
            <motion.button
              key={advisor.id}
              onClick={() => toggleAdvisor(advisor.id)}
              className={`
                flex items-center space-x-2 px-4 py-2 rounded-xl border-2 transition-all font-mono text-sm
                ${isSelected
                  ? 'border-opacity-100 shadow-lg'
                  : 'border-opacity-30 hover:border-opacity-60'
                }
              `}
              style={{
                borderColor: advisor.color,
                backgroundColor: isSelected ? `${advisor.color}20` : 'transparent',
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="text-lg">{advisor.emoji}</span>
              <span style={{ color: isSelected ? advisor.color : '#9ca3af' }}>
                {advisor.name}
              </span>
              {response?.isGenerating && (
                <Loader2 className="w-3 h-3 animate-spin" style={{ color: advisor.color }} />
              )}
              {hasResponse && !hasError && (
                <CheckCircle2 className="w-3 h-3" style={{ color: advisor.color }} />
              )}
              {hasError && (
                <AlertCircle className="w-3 h-3 text-red-400" />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Analyze Button */}
      <div className="flex items-center space-x-3 mb-6">
        <motion.button
          onClick={handleAnalyze}
          disabled={selectedAdvisors.size === 0 || isAnalyzing}
          className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 rounded-xl hover:from-cyan-500/30 hover:to-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-mono font-semibold border border-cyan-500/30"
          whileHover={{ scale: selectedAdvisors.size > 0 && !isAnalyzing ? 1.02 : 1 }}
          whileTap={{ scale: selectedAdvisors.size > 0 && !isAnalyzing ? 0.98 : 1 }}
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>Start Analysis ({selectedAdvisors.size} {selectedAdvisors.size === 1 ? 'Advisor' : 'Advisors'})</span>
            </>
          )}
        </motion.button>

        {responses.size > 0 && (
          <motion.button
            onClick={handleClearAll}
            className="px-4 py-3 bg-gray-700/50 hover:bg-gray-600/50 text-gray-400 rounded-xl transition-colors font-mono text-sm"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Clear All
          </motion.button>
        )}
      </div>

      {/* Tab Navigation */}
      {completedAdvisors.length > 0 && (
        <div className="mb-4">
          <div className="flex space-x-2 border-b border-gray-700/50 pb-2 overflow-x-auto">
            {completedAdvisors.map(([advisorId, _]) => {
              const advisor = ADVISORS[advisorId];
              const isActive = activeTab === advisorId;

              return (
                <motion.button
                  key={advisorId}
                  onClick={() => setActiveTab(advisorId)}
                  className={`
                    flex items-center space-x-2 px-4 py-2 rounded-t-lg font-mono text-sm whitespace-nowrap transition-all
                    ${isActive
                      ? 'border-b-2'
                      : 'hover:bg-gray-700/30'
                    }
                  `}
                  style={{
                    borderBottomColor: isActive ? advisor.color : 'transparent',
                    color: isActive ? advisor.color : '#9ca3af'
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="text-base">{advisor.emoji}</span>
                  <span>{advisor.name}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* Response Content */}
      <AnimatePresence mode="wait">
        {activeTab && responses.has(activeTab) && (
          <AdvisorResponseView
            key={activeTab}
            advisor={ADVISORS[activeTab]}
            response={responses.get(activeTab)!}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
