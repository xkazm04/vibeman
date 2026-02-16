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
import type { DesignAnalysisResult, DesignHighlight } from '@/app/features/Personas/lib/designTypes';
import { DesignHighlightsGrid } from './DesignHighlightsGrid';

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
  const lastSavedJsonRef = useRef<string | null>(null);
  // Track the raw structured_prompt string last loaded from the persona,
  // so we can detect external updates (e.g. design apply)
  const lastLoadedPromptRef = useRef<string | null>(null);

  // Build dynamic tab list: standard tabs + one per custom section + add button
  // Only show Design tab until first CLI design is complete (other tabs are empty/confusing before that)
  const allTabs = useMemo(() => {
    const hasDesign = !!selectedPersona?.last_design_result;
    const tabs: TabDef[] = hasDesign ? [...STANDARD_TABS] : [STANDARD_TABS[0]]; // Only design tab when no design yet
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
  }, [sp.customSections, selectedPersona?.last_design_result]);

  const highlightsBySection = useMemo<Record<string, DesignHighlight[]>>(() => {
    if (!selectedPersona?.last_design_result) return {};
    try {
      const parsed = JSON.parse(selectedPersona.last_design_result) as DesignAnalysisResult;
      const highlights = parsed.design_highlights ?? [];
      const grouped: Record<string, DesignHighlight[]> = {};
      for (const h of highlights) {
        const section = h.section || 'instructions';
        if (!grouped[section]) grouped[section] = [];
        grouped[section].push(h);
      }
      return grouped;
    } catch {
      return {};
    }
  }, [selectedPersona?.last_design_result]);

  // Initialize structured prompt from persona data
  useEffect(() => {
    if (!selectedPersona) {
      setSp(createEmptyStructuredPrompt());
      personaIdRef.current = null;
      lastLoadedPromptRef.current = null;
      return;
    }

    const currentPromptRaw = selectedPersona.structured_prompt ?? null;
    const isNewPersona = personaIdRef.current !== selectedPersona.id;

    // Detect external update: same persona, but structured_prompt changed from what we last loaded
    // AND different from what we last saved (to avoid re-loading our own debounced saves)
    const isExternalUpdate =
      !isNewPersona &&
      currentPromptRaw !== lastLoadedPromptRef.current &&
      currentPromptRaw !== lastSavedJsonRef.current;

    if (!isNewPersona && !isExternalUpdate) return;

    personaIdRef.current = selectedPersona.id;
    lastLoadedPromptRef.current = currentPromptRaw;

    // Cancel any pending debounced save to prevent it from overwriting the new data
    if (isExternalUpdate && saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    // Try to parse existing structured_prompt
    const parsed = parseStructuredPrompt(currentPromptRaw);
    if (parsed) {
      setSp(parsed);
      lastSavedJsonRef.current = JSON.stringify(parsed);
      return;
    }

    // Auto-migrate from flat system_prompt
    if (selectedPersona.system_prompt) {
      const migrated = migratePromptToStructured(selectedPersona.system_prompt);
      setSp(migrated);
      lastSavedJsonRef.current = JSON.stringify(migrated);
      return;
    }

    const empty = createEmptyStructuredPrompt();
    setSp(empty);
    lastSavedJsonRef.current = JSON.stringify(empty);
  }, [selectedPersona]);

  // Debounced auto-save — uses refs to avoid dependency on selectedPersona
  const doSave = useCallback(async () => {
    const pid = personaIdRef.current;
    if (!pid) return;

    const jsonStr = JSON.stringify(spRef.current);

    // Skip save if nothing changed (prevents infinite loop)
    if (jsonStr === lastSavedJsonRef.current) return;

    setIsSaving(true);
    try {
      await updatePersona(pid, {
        structured_prompt: jsonStr,
        system_prompt: spRef.current.instructions || '',
      });
      lastSavedJsonRef.current = jsonStr;
      lastLoadedPromptRef.current = jsonStr; // Track our own save so it doesn't trigger re-init
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save structured prompt:', error);
    } finally {
      setIsSaving(false);
    }
  }, [updatePersona]);

  // Trigger debounced save when sp changes
  useEffect(() => {
    if (!personaIdRef.current) return;

    // Skip if content hasn't actually changed from last save
    const jsonStr = JSON.stringify(sp);
    if (jsonStr === lastSavedJsonRef.current) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      doSave();
    }, 1000);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

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
        <div className="flex items-center gap-1 p-1 bg-secondary/40 border border-primary/15 rounded-xl overflow-x-auto">
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
            viewMode
            highlights={highlightsBySection['identity']}
          />
        )}

        {activeTab === 'instructions' && (
          <PromptSectionTab
            title="Instructions"
            icon={<BookOpen className="w-4 h-4" />}
            value={sp.instructions}
            onChange={(v) => updateField('instructions', v)}
            placeholder="Core instructions and behavioral guidelines..."
            viewMode
            highlights={highlightsBySection['instructions']}
          />
        )}

        {activeTab === 'toolGuidance' && (
          <div className="space-y-4">
            {highlightsBySection['toolGuidance'] && highlightsBySection['toolGuidance'].length > 0 && (
              <DesignHighlightsGrid highlights={highlightsBySection['toolGuidance']} />
            )}
            <ToolGuidanceVisual
              tools={tools}
              credentials={credentials}
              guidanceText={sp.toolGuidance}
              onGuidanceChange={(v) => updateField('toolGuidance', v)}
              readOnly
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
            viewMode
            highlights={highlightsBySection['examples']}
          />
        )}

        {activeTab === 'errorHandling' && (
          <PromptSectionTab
            title="Error Handling"
            icon={<AlertTriangle className="w-4 h-4" />}
            value={sp.errorHandling}
            onChange={(v) => updateField('errorHandling', v)}
            placeholder="How should errors be handled?"
            viewMode
            highlights={highlightsBySection['errorHandling']}
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
                className="flex-1 px-3 py-1.5 text-sm font-medium bg-transparent border border-primary/15 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground"
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
              viewMode
              highlights={highlightsBySection[customSection.title]}
            />
          </div>
        )}
      </div>
    </div>
  );
}
