/**
 * Template Variable Form
 * UI for entering research query and viewing template configuration
 */

'use client';

import { useState, useMemo } from 'react';
import { Eye, Wand2, X } from 'lucide-react';
import CyberCard from '@/components/ui/wizard/CyberCard';
import UnifiedButton from '@/components/ui/buttons/UnifiedButton';
import type { DbDiscoveredTemplate } from '../../../db/models/types';
import { buildResearchPrompt } from './lib/promptGenerator';

interface TemplateVariableFormProps {
  template: DbDiscoveredTemplate;
  flashSuccess?: boolean;
  onPreview: (content: string) => void;
  onGenerate: (params: { query: string; content: string }) => void;
  onCancel: () => void;
}

interface TemplateConfig {
  templateId: string;
  templateName: string;
  description: string;
  searchAngles?: string[];
  findingTypes?: string[];
  perspectives?: string[];
}

export function TemplateVariableForm({
  template,
  flashSuccess,
  onPreview,
  onGenerate,
  onCancel,
}: TemplateVariableFormProps) {
  const [query, setQuery] = useState('');
  const [queryError, setQueryError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // Parse config_json to get full template configuration
  const config = useMemo((): TemplateConfig => {
    try {
      return JSON.parse(template.config_json) as TemplateConfig;
    } catch {
      return {
        templateId: template.template_id,
        templateName: template.template_name,
        description: template.description || '',
      };
    }
  }, [template]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (value.trim()) {
      setQueryError(null);
    }
  };

  const validateQuery = (): boolean => {
    if (!query.trim()) {
      setQueryError('Please enter a research topic');
      return false;
    }
    return true;
  };

  const handlePreview = () => {
    if (!validateQuery()) return;
    const content = buildResearchPrompt(template, query.trim());
    onPreview(content);
  };

  const handleGenerate = async () => {
    if (!validateQuery()) return;
    setIsGenerating(true);
    try {
      const content = buildResearchPrompt(template, query.trim());
      await onGenerate({ query: query.trim(), content });
    } finally {
      setIsGenerating(false);
    }
  };

  const renderCollapsibleList = (
    title: string,
    items: string[] | undefined,
    sectionKey: string
  ) => {
    if (!items || items.length === 0) return null;

    const isExpanded = expandedSections[sectionKey];

    return (
      <div className="mt-2">
        <button
          type="button"
          onClick={() => toggleSection(sectionKey)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-300 transition-colors"
        >
          <span className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
            &#9656;
          </span>
          <span>
            {title} ({items.length})
          </span>
        </button>
        {isExpanded && (
          <ul className="mt-1 ml-4 space-y-0.5">
            {items.map((item, index) => (
              <li key={index} className="text-xs text-gray-500">
                - {item}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  const isValid = query.trim().length > 0;

  return (
    <CyberCard variant="glow" className="mt-4">
      <div className="space-y-4">
        {/* Template Details Section (read-only) */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-200">Template Details</h4>
          <p className="text-xs text-gray-400">{config.description || 'No description'}</p>

          {renderCollapsibleList('Search Angles', config.searchAngles, 'searchAngles')}
          {renderCollapsibleList('Finding Types', config.findingTypes, 'findingTypes')}
          {renderCollapsibleList('Perspectives', config.perspectives, 'perspectives')}
        </div>

        {/* Query Input */}
        <div>
          <label htmlFor="research-query" className="block text-sm font-medium text-gray-200 mb-1">
            Research Topic
          </label>
          <input
            id="research-query"
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Enter your research topic..."
            className={`w-full px-4 py-2.5 bg-gray-800/40 border rounded-lg
                       text-gray-100 placeholder-gray-500
                       focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/30
                       transition-all duration-200 ${
              queryError ? 'border-red-500' : 'border-white/10'
            }`}
            disabled={isGenerating}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && isValid) {
                handleGenerate();
              }
            }}
          />
          {queryError && <p className="mt-1 text-xs text-red-400">{queryError}</p>}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2">
          <UnifiedButton
            icon={Eye}
            variant="outline"
            colorScheme="gray"
            size="sm"
            onClick={handlePreview}
            disabled={!isValid || isGenerating}
          >
            Preview
          </UnifiedButton>
          <UnifiedButton
            icon={Wand2}
            variant="gradient"
            colorScheme="cyan"
            size="sm"
            onClick={handleGenerate}
            disabled={!isValid || isGenerating}
            loading={isGenerating}
            className={flashSuccess ? 'ring-2 ring-green-500 ring-offset-2 ring-offset-gray-900' : ''}
          >
            Generate
          </UnifiedButton>
          <UnifiedButton
            icon={X}
            variant="ghost"
            colorScheme="gray"
            size="sm"
            onClick={onCancel}
            disabled={isGenerating}
          >
            Cancel
          </UnifiedButton>
        </div>
      </div>
    </CyberCard>
  );
}
