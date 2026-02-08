/**
 * Template Variable Form
 * Dynamic form for entering template variables.
 * Variables are defined in each template's config.
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

interface TemplateVariable {
  name: string;
  label: string;
  type: 'text' | 'select';
  required?: boolean;
  default?: string;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
}

interface TemplateConfig {
  templateId: string;
  templateName: string;
  description: string;
  variables?: TemplateVariable[];
}

/**
 * Extract variables from TypeScript object literal syntax.
 * The config_json contains raw TS code, not valid JSON.
 */
function extractVariablesFromTsConfig(configText: string): TemplateVariable[] {
  const variables: TemplateVariable[] = [];

  // Find the variables array in the config
  const variablesMatch = configText.match(/variables:\s*\[([\s\S]*?)\n\s*\]/);
  if (!variablesMatch) return variables;

  const variablesContent = variablesMatch[1];

  // Extract each variable object - match { ... } blocks
  const varBlockRegex = /\{\s*([\s\S]*?)\s*\}(?=\s*,|\s*$)/g;
  let match;

  while ((match = varBlockRegex.exec(variablesContent)) !== null) {
    const block = match[1];

    // Extract fields using regex
    const nameMatch = block.match(/name:\s*['"]([^'"]+)['"]/);
    const labelMatch = block.match(/label:\s*['"]([^'"]+)['"]/);
    const typeMatch = block.match(/type:\s*['"]([^'"]+)['"]/);
    const requiredMatch = block.match(/required:\s*(true|false)/);
    const defaultMatch = block.match(/default:\s*['"]([^'"]*)['"]/);
    const placeholderMatch = block.match(/placeholder:\s*['"]([^'"]*)['"]/);

    if (nameMatch && labelMatch && typeMatch) {
      const variable: TemplateVariable = {
        name: nameMatch[1],
        label: labelMatch[1],
        type: typeMatch[1] as 'text' | 'select',
        required: requiredMatch ? requiredMatch[1] === 'true' : undefined,
        default: defaultMatch ? defaultMatch[1] : undefined,
        placeholder: placeholderMatch ? placeholderMatch[1] : undefined,
      };

      // Extract options for select type
      if (variable.type === 'select') {
        const optionsMatch = block.match(/options:\s*\[([\s\S]*?)\]/);
        if (optionsMatch) {
          const optionsContent = optionsMatch[1];
          const options: Array<{ value: string; label: string }> = [];
          const optRegex = /\{\s*value:\s*['"]([^'"]*)['"]\s*,\s*label:\s*['"]([^'"]*)['"]\s*\}/g;
          let optMatch;
          while ((optMatch = optRegex.exec(optionsContent)) !== null) {
            options.push({ value: optMatch[1], label: optMatch[2] });
          }
          if (options.length > 0) {
            variable.options = options;
          }
        }
      }

      variables.push(variable);
    }
  }

  return variables;
}

export function TemplateVariableForm({
  template,
  flashSuccess,
  onPreview,
  onGenerate,
  onCancel,
}: TemplateVariableFormProps) {
  // Parse config and extract variables
  const { config, variables } = useMemo(() => {
    const configText = template.config_json || '';

    // Try JSON parse first (in case it's valid JSON)
    let parsedConfig: TemplateConfig;
    try {
      parsedConfig = JSON.parse(configText) as TemplateConfig;
    } catch {
      // Fallback to minimal config
      parsedConfig = {
        templateId: template.template_id,
        templateName: template.template_name,
        description: template.description || '',
      };
    }

    // Extract variables - try from parsed JSON first, then from TS syntax
    let vars = parsedConfig.variables;
    if (!vars || vars.length === 0) {
      vars = extractVariablesFromTsConfig(configText);
    }

    // Fallback to default query variable
    if (!vars || vars.length === 0) {
      vars = [
        {
          name: 'query',
          label: 'Research Topic',
          type: 'text' as const,
          required: true,
          placeholder: 'Enter your research topic...',
        },
      ];
    }

    return { config: parsedConfig, variables: vars };
  }, [template]);

  // Initialize form values with defaults
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const v of variables) {
      initial[v.name] = v.default || '';
    }
    return initial;
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);

  const handleChange = (name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    if (value.trim()) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    for (const v of variables) {
      if (v.required && !values[v.name]?.trim()) {
        newErrors[v.name] = `${v.label} is required`;
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Build query string from all variables for backward compatibility
  const buildQueryString = (): string => {
    // If there's a "query" variable, use it as the primary query
    if (values.query) {
      return values.query.trim();
    }
    // Otherwise, combine all variable values
    return Object.entries(values)
      .filter(([, v]) => v.trim())
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
  };

  const handlePreview = () => {
    if (!validate()) return;
    const content = buildResearchPrompt(template, buildQueryString(), values);
    onPreview(content);
  };

  const handleGenerate = async () => {
    if (!validate()) return;
    setIsGenerating(true);
    try {
      const content = buildResearchPrompt(template, buildQueryString(), values);
      await onGenerate({ query: buildQueryString(), content });
    } finally {
      setIsGenerating(false);
    }
  };

  const isValid = variables.every(
    (v) => !v.required || values[v.name]?.trim()
  );

  return (
    <CyberCard variant="glow" className="mt-2">
      <div className="space-y-3">
        {/* Description */}
        <p className="text-xs text-gray-400 leading-relaxed">
          {config.description || 'Configure template variables'}
        </p>

        {/* Variable Inputs - Compact horizontal layout */}
        <div className="space-y-2">
          {variables.map((v) => (
            <div key={v.name} className="flex items-center gap-3">
              {/* Label */}
              <label
                htmlFor={`var-${v.name}`}
                className="text-xs font-medium text-gray-300 w-24 flex-shrink-0 text-right"
              >
                {v.label}
                {v.required && <span className="text-red-400 ml-0.5">*</span>}
              </label>

              {/* Input */}
              <div className="flex-1 min-w-0">
                {v.type === 'select' && v.options ? (
                  <select
                    id={`var-${v.name}`}
                    value={values[v.name] || ''}
                    onChange={(e) => handleChange(v.name, e.target.value)}
                    disabled={isGenerating}
                    className={`w-full px-2 py-1.5 text-xs bg-gray-800/40 border rounded
                               text-gray-100 focus:outline-none focus:ring-1 focus:ring-cyan-500/40
                               transition-all ${
                                 errors[v.name] ? 'border-red-500' : 'border-white/10'
                               }`}
                  >
                    {v.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={`var-${v.name}`}
                    type="text"
                    value={values[v.name] || ''}
                    onChange={(e) => handleChange(v.name, e.target.value)}
                    placeholder={v.placeholder || ''}
                    disabled={isGenerating}
                    className={`w-full px-2 py-1.5 text-xs bg-gray-800/40 border rounded
                               text-gray-100 placeholder-gray-500
                               focus:outline-none focus:ring-1 focus:ring-cyan-500/40
                               transition-all ${
                                 errors[v.name] ? 'border-red-500' : 'border-white/10'
                               }`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && isValid) {
                        handleGenerate();
                      }
                    }}
                  />
                )}
                {errors[v.name] && (
                  <p className="mt-0.5 text-[10px] text-red-400">{errors[v.name]}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons - Compact */}
        <div className="flex items-center gap-2 pt-1 border-t border-white/5">
          <UnifiedButton
            icon={Eye}
            variant="outline"
            colorScheme="gray"
            size="xs"
            onClick={handlePreview}
            disabled={!isValid || isGenerating}
          >
            Preview
          </UnifiedButton>
          <UnifiedButton
            icon={Wand2}
            variant="gradient"
            colorScheme="cyan"
            size="xs"
            onClick={handleGenerate}
            disabled={!isValid || isGenerating}
            loading={isGenerating}
            className={flashSuccess ? 'ring-2 ring-green-500 ring-offset-1 ring-offset-gray-900' : ''}
          >
            Generate
          </UnifiedButton>
          <UnifiedButton
            icon={X}
            variant="ghost"
            colorScheme="gray"
            size="xs"
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
