/**
 * Template Variable Form
 * UI for entering research query and viewing template configuration
 */

'use client';

import { useState, useMemo } from 'react';
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
    <div className="mt-3 p-4 bg-gray-700 rounded-lg border border-gray-600 space-y-4">
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
          className={`w-full px-3 py-2 bg-gray-800 border rounded-md text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            queryError ? 'border-red-500' : 'border-gray-600'
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
        <button
          type="button"
          onClick={handlePreview}
          disabled={!isValid || isGenerating}
          className="px-3 py-1.5 text-sm bg-gray-600 text-gray-200 rounded-md hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Preview
        </button>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!isValid || isGenerating}
          className={`px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center gap-2 ${
            flashSuccess ? 'ring-2 ring-green-500 ring-offset-2 ring-offset-gray-700' : ''
          }`}
        >
          {isGenerating ? (
            <>
              <span className="animate-spin">&#8987;</span>
              Generating...
            </>
          ) : (
            'Generate'
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isGenerating}
          className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
