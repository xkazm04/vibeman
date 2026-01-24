'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Play, Loader2, Check, RotateCcw } from 'lucide-react';
import type { PromptTemplate } from './TemplateCategoryColumn';
import { GeneratorItemCard, type GeneratorItem } from './GeneratorItemCard';
import { BatchAIRandomizerButton } from './BatchAIRandomizerButton';

interface GeneratorPanelProps {
  template: PromptTemplate;
  projectId: string;
  projectPath: string;
}

export function GeneratorPanel({ template, projectId, projectPath }: GeneratorPanelProps) {
  const [items, setItems] = useState<GeneratorItem[]>([]);
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);

  const createDefaultItem = useCallback((): GeneratorItem => {
    const values: Record<string, string> = {};
    for (const v of template.variables || []) {
      values[v.name] = v.default_value || '';
    }
    return {
      id: crypto.randomUUID(),
      variableValues: values,
      requirementName: `${template.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      status: 'idle',
    };
  }, [template]);

  // Reset items when template changes
  useEffect(() => {
    setItems([createDefaultItem()]);
    setCompletedCount(0);
  }, [template.id, createDefaultItem]);

  const addItem = () => {
    if (items.length >= 10) return;
    setItems([...items, createDefaultItem()]);
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(items.filter((i) => i.id !== id));
  };

  const updateItemVariable = (id: string, varName: string, value: string) => {
    setItems(items.map((i) =>
      i.id === id ? { ...i, variableValues: { ...i.variableValues, [varName]: value } } : i
    ));
  };

  const updateItemName = (id: string, name: string) => {
    setItems(items.map((i) => (i.id === id ? { ...i, requirementName: name } : i)));
  };

  const handleBatchRandomize = (variableSets: Record<string, string>[]) => {
    setItems(items.map((item, i) => {
      if (i < variableSets.length) {
        return {
          ...item,
          variableValues: { ...item.variableValues, ...variableSets[i] },
          status: 'idle' as const,
          result: undefined,
          error: undefined,
        };
      }
      return item;
    }));
  };

  const handleGenerateAll = async () => {
    if (!template.id || !projectPath) return;

    setBatchGenerating(true);
    setCompletedCount(0);
    const updatedItems = [...items];

    for (let i = 0; i < updatedItems.length; i++) {
      const item = updatedItems[i];
      if (item.status === 'success') {
        setCompletedCount((c) => c + 1);
        continue;
      }

      updatedItems[i] = { ...item, status: 'generating' };
      setItems([...updatedItems]);

      try {
        const response = await fetch('/api/prompt-templates/generate-requirement', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templateId: template.id,
            projectPath,
            variables: item.variableValues,
            requirementName: item.requirementName.trim() || undefined,
          }),
        });
        const data = await response.json();

        if (response.ok) {
          updatedItems[i] = { ...item, status: 'success', result: data.filePath };
        } else {
          updatedItems[i] = { ...item, status: 'error', error: data.error || 'Failed' };
        }
      } catch {
        updatedItems[i] = { ...item, status: 'error', error: 'Network error' };
      }

      setItems([...updatedItems]);
      setCompletedCount((c) => c + 1);
    }

    setBatchGenerating(false);
  };

  const handleReset = () => {
    setItems(items.map((item) => ({
      ...item,
      status: 'idle' as const,
      result: undefined,
      error: undefined,
    })));
    setCompletedCount(0);
  };

  const pendingCount = items.filter((i) => i.status !== 'success').length;
  const successCount = items.filter((i) => i.status === 'success').length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {/* Header: Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">
            {items.length}/10 items
          </span>
          {successCount > 0 && (
            <span className="text-xs text-green-400 flex items-center gap-1">
              <Check className="w-3 h-3" />
              {successCount} generated
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {successCount > 0 && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-2 py-1.5 text-xs rounded-md text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors"
              title="Reset statuses"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}
          <BatchAIRandomizerButton
            template={template}
            itemCount={items.length}
            onRandomize={handleBatchRandomize}
          />
          <button
            onClick={addItem}
            disabled={items.length >= 10}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md bg-gray-800/60 text-gray-300 hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        </div>
      </div>

      {/* Items Grid - max 5 per row */}
      <AnimatePresence mode="popLayout">
        <div className="grid grid-cols-5 gap-3">
          {items.map((item, index) => (
            <GeneratorItemCard
              key={item.id}
              item={item}
              index={index}
              variables={template.variables || []}
              onUpdateVariable={(varName, value) => updateItemVariable(item.id, varName, value)}
              onUpdateName={(name) => updateItemName(item.id, name)}
              onRemove={() => removeItem(item.id)}
              canRemove={items.length > 1}
            />
          ))}
        </div>
      </AnimatePresence>

      {/* Generate All Button */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-800/50">
        {batchGenerating && (
          <span className="text-xs text-gray-400">
            Generating {completedCount}/{items.length}...
          </span>
        )}
        {!batchGenerating && <div />}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleGenerateAll}
          disabled={batchGenerating || pendingCount === 0 || !projectPath}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors"
        >
          {batchGenerating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          Generate All ({pendingCount})
        </motion.button>
      </div>
    </motion.div>
  );
}
