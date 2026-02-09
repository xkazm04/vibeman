'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { usePersonaStore } from '@/stores/personaStore';
import { Sparkles, User, BookOpen, Wrench, Code, AlertTriangle, Plus, X, Check, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  migratePromptToStructured,
  parseStructuredPrompt,
  createEmptyStructuredPrompt,
} from '@/lib/personas/promptMigration';
import type { StructuredPrompt } from '@/lib/personas/promptMigration';
import { PromptSectionTab } from './PromptSectionTab';
import { ToolGuidanceVisual } from './ToolGuidanceVisual';
import { DesignTab } from './DesignTab';

type SubTab = 'design' | 'identity' | 'instructions' | 'toolGuidance' | 'examples' | 'errorHandling' | string;

interface TabDef {
  key: SubTab;
  label: string;
  icon: React.ReactNode;
}

const STANDARD_TABS: TabDef[] = [
  { key: 'design', label: 'Design', icon: <Sparkles className="w-3.5 h-3.5" /> },
  { key: 'identity', label: 'Identity', icon: <User className="w-3.5 h-3.5" /> },
  { key: 'instructions', label: 'Instructions', icon: <BookOpen className="w-3.5 h-3.5" /> },
  { key: 'toolGuidance', label: 'Tool Guidance', icon: <Wrench className="w-3.5 h-3.5" /> },
  { key: 'examples', label: 'Examples', icon: <Code className="w-3.5 h-3.5" /> },
  { key: 'errorHandling', label: 'Error Handling', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
];

export function PersonaPromptEditor() {
  const selectedPersona = usePersonaStore((state) => state.selectedPersona);
  const updatePersona = usePersonaStore((state) => state.updatePersona);
  const credentials = usePersonaStore((state) => state.credentials);

  const [activeTab, setActiveTab] = useState<SubTab>('design');
  const [sp, setSp] = useState<StructuredPrompt>(createEmptyStructuredPrompt());
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  const personaIdRef = useRef<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spRef = useRef(sp);
  spRef.current = sp;

  // Build dynamic tab list: standard tabs + one per custom section + add button
  const allTabs = useMemo(() => {
    const tabs: TabDef[] = [...STANDARD_TABS];
    sp.customSections.forEach((section, index) => {
      const label = section.title.length > 12
        ? section.title.slice(0, 12) + '...'
        : section.title;
      tabs.push({
        key: `custom_${index}`,
        label: label || 'Untitled',
        icon: <Code className="w-3.5 h-3.5" />,
      });
    });
    return tabs;
  }, [sp.customSections]);

  // Initialize structured prompt from persona data
  useEffect(() => {
    if (!selectedPersona) {
      setSp(createEmptyStructuredPrompt());
      personaIdRef.current = null;
      return;
    }

    // Only reinitialize when persona changes
    if (personaIdRef.current === selectedPersona.id) return;
    personaIdRef.current = selectedPersona.id;

    // Try to parse existing structured_prompt
    const parsed = parseStructuredPrompt(selectedPersona.structured_prompt ?? null);
    if (parsed) {
      setSp(parsed);
      return;
    }

    // Auto-migrate from flat system_prompt
    if (selectedPersona.system_prompt) {
      const migrated = migratePromptToStructured(selectedPersona.system_prompt);
      setSp(migrated);
      return;
    }

    setSp(createEmptyStructuredPrompt());
  }, [selectedPersona]);

  // Debounced auto-save
  const doSave = useCallback(async () => {
    if (!selectedPersona) return;

    setIsSaving(true);
    try {
      const jsonStr = JSON.stringify(spRef.current);
      await updatePersona(selectedPersona.id, {
        structured_prompt: jsonStr,
        // Keep system_prompt in sync for backward compatibility
        system_prompt: spRef.current.instructions || selectedPersona.system_prompt,
      });
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save structured prompt:', error);
    } finally {
      setIsSaving(false);
    }
  }, [selectedPersona, updatePersona]);

  // Trigger debounced save when sp changes
  useEffect(() => {
    if (!selectedPersona) return;
    // Don't save on initial load
    if (personaIdRef.current !== selectedPersona.id) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      doSave();
    }, 1000);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [sp, doSave, selectedPersona]);

  // Update a field in the structured prompt
  const updateField = useCallback((field: keyof Omit<StructuredPrompt, 'customSections'>, value: string) => {
    setSp((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Custom sections management
  const addCustomSection = useCallback(() => {
    setSp((prev) => {
      const newSections = [...prev.customSections, { title: 'New Section', content: '' }];
      return { ...prev, customSections: newSections };
    });
    // Auto-switch to the newly added custom section tab
    const newIndex = sp.customSections.length;
    setActiveTab(`custom_${newIndex}`);
  }, [sp.customSections.length]);

  const updateCustomSection = useCallback((index: number, field: 'title' | 'content', value: string) => {
    setSp((prev) => ({
      ...prev,
      customSections: prev.customSections.map((s, i) =>
        i === index ? { ...s, [field]: value } : s
      ),
    }));
  }, []);

  const removeCustomSection = useCallback((index: number) => {
    setSp((prev) => ({
      ...prev,
      customSections: prev.customSections.filter((_, i) => i !== index),
    }));
    // Switch back to design tab if removing the active custom section
    setActiveTab('design');
  }, []);

  if (!selectedPersona) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground/40">
        No persona selected
      </div>
    );
  }

  const tools = selectedPersona.tools || [];

  // Parse custom section index from tab key
  const customIndex = activeTab.startsWith('custom_')
    ? parseInt(activeTab.replace('custom_', ''), 10)
    : -1;
  const customSection = customIndex >= 0 ? sp.customSections[customIndex] : null;

  return (
    <div className="space-y-4">
      {/* Sub-tab bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 p-1 bg-muted/20 rounded-xl overflow-x-auto">
          {allTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground/60 hover:text-muted-foreground/80'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}

          {/* Add Section button at end of tab bar */}
          <button
            onClick={addCustomSection}
            className="flex items-center gap-1 px-2 py-1.5 text-xs text-muted-foreground/40 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors whitespace-nowrap"
            title="Add custom section"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Save status */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <AnimatePresence>
            {showSaved && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-1 text-xs text-emerald-400"
              >
                <Check className="w-3 h-3" />
                Saved
              </motion.div>
            )}
          </AnimatePresence>
          {isSaving && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground/50">
              <Save className="w-3 h-3 animate-pulse" />
              Saving...
            </div>
          )}
        </div>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'design' && (
          <DesignTab />
        )}

        {activeTab === 'identity' && (
          <PromptSectionTab
            title="Identity"
            icon={<User className="w-4 h-4" />}
            value={sp.identity}
            onChange={(v) => updateField('identity', v)}
            placeholder="Who is this persona? What role does it play?"
          />
        )}

        {activeTab === 'instructions' && (
          <PromptSectionTab
            title="Instructions"
            icon={<BookOpen className="w-4 h-4" />}
            value={sp.instructions}
            onChange={(v) => updateField('instructions', v)}
            placeholder="Core instructions and behavioral guidelines..."
          />
        )}

        {activeTab === 'toolGuidance' && (
          <div className="space-y-4">
            <ToolGuidanceVisual
              tools={tools}
              credentials={credentials}
              guidanceText={sp.toolGuidance}
              onGuidanceChange={(v) => updateField('toolGuidance', v)}
            />
          </div>
        )}

        {activeTab === 'examples' && (
          <PromptSectionTab
            title="Examples"
            icon={<Code className="w-4 h-4" />}
            value={sp.examples}
            onChange={(v) => updateField('examples', v)}
            placeholder="Example interactions or outputs..."
            codeStyle
          />
        )}

        {activeTab === 'errorHandling' && (
          <PromptSectionTab
            title="Error Handling"
            icon={<AlertTriangle className="w-4 h-4" />}
            value={sp.errorHandling}
            onChange={(v) => updateField('errorHandling', v)}
            placeholder="How should errors be handled?"
          />
        )}

        {/* Custom section tabs - each renders individually */}
        {customSection && customIndex >= 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customSection.title}
                onChange={(e) => updateCustomSection(customIndex, 'title', e.target.value)}
                className="flex-1 px-3 py-1.5 text-sm font-medium bg-transparent border border-border/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground"
                placeholder="Section title..."
              />
              <button
                onClick={() => removeCustomSection(customIndex)}
                className="p-1.5 text-muted-foreground/40 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10"
                title="Remove section"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <PromptSectionTab
              title={customSection.title}
              icon={<Code className="w-4 h-4" />}
              value={customSection.content}
              onChange={(v) => updateCustomSection(customIndex, 'content', v)}
              placeholder="Section content..."
            />
          </div>
        )}
      </div>
    </div>
  );
}
