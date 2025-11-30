'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileCode } from 'lucide-react';
import { StepContainer, StepHeader } from '@/components/ui/wizard';
import TemplateSelector from './TemplateSelector';
import ScopeEditor from './ScopeEditor';
import ExecutionConfig from './ExecutionConfig';
import PreviewPanel from './PreviewPanel';
import SpecsLibrary from './SpecsLibrary';
import DSLBuilderHeader from './DSLBuilderHeader';
import DSLBuilderTabs, { EditorTab } from './DSLBuilderTabs';
import SpecInfoCard from './SpecInfoCard';
import RulesTabContent from './RulesTabContent';
import { RefactorSpec, TransformationRule, createEmptySpec, createEmptyRule, ValidationError } from '../../lib/dslTypes';
import { validateSpec, hasBlockingErrors } from '../../lib/dslValidator';
import { ALL_TEMPLATES, createSpecFromTemplate, RefactorTemplate } from '../../lib/dslTemplates';
import { useRefactorStore } from '@/stores/refactorStore';

interface DSLBuilderLayoutProps {
  onExecute: (spec: RefactorSpec) => void;
  onBack: () => void;
}

/**
 * DSLBuilderLayout - Visual builder for refactoring DSL specifications
 */
export default function DSLBuilderLayout({ onExecute, onBack }: DSLBuilderLayoutProps) {
  const [spec, setSpec] = useState<RefactorSpec>(createEmptySpec());
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [activeTab, setActiveTab] = useState<EditorTab>('templates');
  const [showLibrary, setShowLibrary] = useState(false);
  const { saveCurrentSpec, setCurrentSpec, addToRecentSpecs } = useRefactorStore();

  useEffect(() => { setValidationErrors(validateSpec(spec)); }, [spec]);

  const canExecute = !hasBlockingErrors(validationErrors) && spec.transformations.length > 0;
  const updateSpec = useCallback((updates: Partial<RefactorSpec>) => setSpec(prev => ({ ...prev, ...updates })), []);

  const handleSelectTemplate = useCallback((template: RefactorTemplate) => {
    const newSpec = createSpecFromTemplate(template);
    setSpec(newSpec);
    setActiveTab('rules');
    if (newSpec.transformations.length > 0) setSelectedRuleId(newSpec.transformations[0].id);
  }, []);

  const handleLoadSpec = useCallback((loadedSpec: RefactorSpec) => {
    setSpec(loadedSpec);
    setCurrentSpec(loadedSpec);
    if (loadedSpec.transformations.length > 0) { setSelectedRuleId(loadedSpec.transformations[0].id); setActiveTab('rules'); }
    addToRecentSpecs(loadedSpec);
  }, [setCurrentSpec, addToRecentSpecs]);

  const handleSaveSpec = useCallback(() => { setCurrentSpec(spec); saveCurrentSpec(); }, [spec, setCurrentSpec, saveCurrentSpec]);

  const addRule = useCallback(() => {
    const newRule = createEmptyRule();
    setSpec(prev => ({ ...prev, transformations: [...prev.transformations, newRule] }));
    setSelectedRuleId(newRule.id);
  }, []);

  const updateRule = useCallback((ruleId: string, updates: Partial<TransformationRule>) => {
    setSpec(prev => ({ ...prev, transformations: prev.transformations.map(r => r.id === ruleId ? { ...r, ...updates } : r) }));
  }, []);

  const deleteRule = useCallback((ruleId: string) => {
    setSpec(prev => ({ ...prev, transformations: prev.transformations.filter(r => r.id !== ruleId) }));
    if (selectedRuleId === ruleId) setSelectedRuleId(null);
  }, [selectedRuleId]);

  return (
    <StepContainer isLoading={false} error={null} data-testid="dsl-builder-container">
      <DSLBuilderHeader validationErrors={validationErrors} showLibrary={showLibrary} canExecute={canExecute}
        onToggleLibrary={() => setShowLibrary(!showLibrary)} onExecute={() => onExecute(spec)} onBack={onBack} />
      <StepHeader title="Refactoring DSL Builder" description="Define transformation rules to automatically refactor your codebase" icon={FileCode} currentStep={0} totalSteps={0} />
      <SpecInfoCard spec={spec} onNameChange={(name) => updateSpec({ name })} onDescriptionChange={(description) => updateSpec({ description })} />
      <DSLBuilderTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex flex-1 min-h-[400px]">
        <div className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="h-full">
              {activeTab === 'templates' && <TemplateSelector templates={ALL_TEMPLATES} onSelect={handleSelectTemplate} />}
              {activeTab === 'scope' && <ScopeEditor scope={spec.scope} onChange={(scope) => updateSpec({ scope })} />}
              {activeTab === 'rules' && (
                <RulesTabContent rules={spec.transformations} selectedRuleId={selectedRuleId} validationErrors={validationErrors}
                  onSelectRule={setSelectedRuleId} onAddRule={addRule} onDeleteRule={deleteRule} onUpdateRule={updateRule} />
              )}
              {activeTab === 'execution' && <ExecutionConfig execution={spec.execution} validation={spec.validation} onChange={updateSpec} />}
              {activeTab === 'preview' && <PreviewPanel spec={spec} errors={validationErrors} />}
            </motion.div>
          </AnimatePresence>
        </div>
        <AnimatePresence>
          {showLibrary && (
            <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 288, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
              <SpecsLibrary currentSpec={spec} onLoadSpec={handleLoadSpec} onSaveSpec={handleSaveSpec} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </StepContainer>
  );
}
