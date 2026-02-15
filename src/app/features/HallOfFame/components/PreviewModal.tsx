'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Code, Settings, Star } from 'lucide-react';
import { getComponentById, getCategoryById } from '../lib/showcaseRegistry';
import {
  PreviewModalProps,
  PropsControl,
  // Button Previews
  AnimatedButtonPreview,
  IconButtonPreview,
  IlluminatedButtonPreview,
  // Input Previews
  UniversalSelectPreview,
  StyledCheckboxPreview,
  SelectionGridPreview,
  // Display Previews
  StatusChipPreview,
  BadgePreview,
  ProgressBarPreview,
  LoadingSpinnerPreview,
  EmptyStatePreview,
  // Card Previews
  CompactListPreview,
  PerformanceCardPreview,
  // Chart Previews
  StatsBarChartPreview,
  StackedBarChartPreview,
  // Overlay Previews
  ModalTransitionPreview,
  SlideDrawerPreview,
  // Feature Previews (24 new components)
  ScreenThumbnailPreview,
  CandidateCardPreview,
  ScanTypeCardPreview,
  ProviderStatusPreview,
  IdeaCardPreview,
  SwipeProgressPreview,
  SessionBatchDisplayPreview,
  CheckpointProgressPreview,
  ImplementationLogCardPreview,
  HypothesisRowPreview,
  ContextJailCardPreview,
  GradientPalettePickerPreview,
  WeeklyKPICardsPreview,
  KPISummaryCardsPreview,
  SLABadgePreview,
  AIProcessingPanelPreview,
  ChainBuilderPreview,
  DecisionNodeConfigPreview,
  ModeTogglePreview,
  ContextMapSelectorPreview,
  DirectionCardPreview,
  PackageCardPreview,
  HeroBadgePreview,
} from './previews';

function GenericPreview({ name }: { name: string }) {
  return (
    <div className="flex items-center justify-center h-32 bg-gray-800/50 rounded-lg border border-gray-700/50">
      <p className="text-gray-400">Preview for {name}</p>
    </div>
  );
}

export function PreviewModal({ componentId, onClose }: PreviewModalProps) {
  const [copied, setCopied] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [props, setProps] = useState<Record<string, unknown>>({});

  const component = useMemo(() => getComponentById(componentId || ''), [componentId]);
  const category = component ? getCategoryById(component.categoryId) : null;

  useEffect(() => {
    if (component) {
      const initialProps = component.propsConfig.reduce((acc, config) => {
        acc[config.name] = config.defaultValue;
        return acc;
      }, {} as Record<string, unknown>);
      setProps(initialProps);
    }
  }, [component]);

  const updateProp = useCallback((name: string, value: unknown) => {
    setProps((prev) => ({ ...prev, [name]: value }));
  }, []);

  const copyCode = useCallback(() => {
    if (component?.codeSnippet) {
      navigator.clipboard.writeText(component.codeSnippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [component?.codeSnippet]);

  const renderPreview = () => {
    if (!component) return null;
    switch (component.id) {
      // Buttons
      case 'animated-button': return <AnimatedButtonPreview props={props} />;
      case 'icon-button': return <IconButtonPreview props={props} />;
      case 'illuminated-button': return <IlluminatedButtonPreview props={props} />;
      // Inputs
      case 'universal-select': return <UniversalSelectPreview props={props} />;
      case 'styled-checkbox': return <StyledCheckboxPreview props={props} />;
      case 'selection-grid': return <SelectionGridPreview props={props} />;
      // Display
      case 'status-chip': return <StatusChipPreview props={props} />;
      case 'badge': return <BadgePreview props={props} />;
      case 'progress-bar': return <ProgressBarPreview props={props} />;
      case 'loading-spinner': return <LoadingSpinnerPreview props={props} />;
      case 'empty-state': return <EmptyStatePreview props={props} />;
      // Cards
      case 'compact-list': return <CompactListPreview props={props} />;
      case 'performance-card': return <PerformanceCardPreview props={props} />;
      // Charts
      case 'stats-bar-chart': return <StatsBarChartPreview props={props} />;
      case 'stacked-bar-chart': return <StackedBarChartPreview props={props} />;
      // Overlays
      case 'modal-transition': return <ModalTransitionPreview props={props} />;
      case 'slide-drawer': return <SlideDrawerPreview props={props} />;
      // GoalsLayout
      case 'screen-thumbnail': return <ScreenThumbnailPreview props={props} />;
      case 'candidate-card': return <CandidateCardPreview props={props} />;
      // IdeasLayout
      case 'scan-type-card': return <ScanTypeCardPreview props={props} />;
      case 'provider-status': return <ProviderStatusPreview props={props} />;
      // TinderLayout
      case 'idea-card': return <IdeaCardPreview props={props} />;
      case 'swipe-progress': return <SwipeProgressPreview props={props} />;
      // TaskRunnerLayout
      case 'session-batch-display': return <SessionBatchDisplayPreview props={props} />;
      case 'checkpoint-progress': return <CheckpointProgressPreview props={props} />;
      // ManagerLayout
      case 'implementation-log-card': return <ImplementationLogCardPreview props={props} />;
      case 'hypothesis-row': return <HypothesisRowPreview props={props} />;
      // ContextLayout
      case 'context-jail-card': return <ContextJailCardPreview props={props} />;
      case 'gradient-palette-picker': return <GradientPalettePickerPreview props={props} />;
      // ReflectorLayout
      case 'weekly-kpi-cards': return <WeeklyKPICardsPreview props={props} />;
      case 'kpi-summary-cards': return <KPISummaryCardsPreview props={props} />;
      // SocialLayout
      case 'sla-badge': return <SLABadgePreview props={props} />;
      case 'ai-processing-panel': return <AIProcessingPanelPreview props={props} />;
      // BlueprintComposer
      case 'chain-builder': return <ChainBuilderPreview props={props} />;
      case 'decision-node-config': return <DecisionNodeConfigPreview props={props} />;
      // ZenLayout
      case 'mode-toggle': return <ModeTogglePreview props={props} />;
      // QuestionsLayout
      case 'context-map-selector': return <ContextMapSelectorPreview props={props} />;
      case 'direction-card': return <DirectionCardPreview props={props} />;
      // RefactorPage
      case 'package-card': return <PackageCardPreview props={props} />;
      case 'hero-badge': return <HeroBadgePreview props={props} />;
      default: return <GenericPreview name={component.name} />;
    }
  };

  if (!component) return null;

  return (
    <AnimatePresence>
      {componentId && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', bounce: 0.2 }}
            className="fixed inset-4 md:inset-8 lg:inset-16 bg-gray-900 border border-gray-700/50 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <div className="flex items-center gap-4">
                {component.isFeatured && <Star className="w-5 h-5 text-amber-400 fill-amber-400" />}
                <div>
                  <h2 className="text-xl font-bold text-white">{component.name}</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    {category && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <category.icon className="w-3 h-3" />
                        {category.name}
                      </span>
                    )}
                    <span className="text-gray-700">•</span>
                    <span className="text-xs text-gray-500">{component.sourcePath}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCode(!showCode)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${showCode ? 'bg-cyan-500/20 text-cyan-400' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
                >
                  <Code className="w-4 h-4" />
                  Code
                </button>
                <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex overflow-hidden">
              <div className="flex-1 flex flex-col overflow-auto">
                <div className="px-6 py-4 border-b border-gray-800/50">
                  <p className="text-gray-400">{component.description}</p>
                </div>
                <div className="flex-1 flex items-center justify-center p-8 bg-gray-950/50">
                  {renderPreview()}
                </div>
              </div>

              {/* Sidebar */}
              <div className="w-80 border-l border-gray-800 flex flex-col bg-gray-900/50">
                <AnimatePresence mode="wait">
                  {showCode ? (
                    <motion.div key="code" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="flex-1 flex flex-col">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                        <h3 className="text-sm font-medium text-gray-300">Code Example</h3>
                        <button onClick={copyCode} className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-800 text-gray-400 hover:text-white rounded transition-colors">
                          {copied ? <><Check className="w-3 h-3 text-green-400" /><span className="text-green-400">Copied!</span></> : <><Copy className="w-3 h-3" /><span>Copy</span></>}
                        </button>
                      </div>
                      <div className="flex-1 overflow-auto p-4">
                        <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono">{component.codeSnippet}</pre>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div key="props" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex-1 flex flex-col">
                      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800">
                        <Settings className="w-4 h-4 text-gray-500" />
                        <h3 className="text-sm font-medium text-gray-300">Props</h3>
                      </div>
                      <div className="flex-1 overflow-auto p-4 space-y-4">
                        {component.propsConfig.length > 0 ? (
                          component.propsConfig.map((config) => (
                            <PropsControl key={config.name} config={config} value={props[config.name]} onChange={(value) => updateProp(config.name, value)} />
                          ))
                        ) : (
                          <p className="text-sm text-gray-500">No configurable props.</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
