'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Star, Zap, ExternalLink, Sparkles } from 'lucide-react';
import { showcaseComponentsData, getCategoryById } from '../lib/showcaseRegistry';
import {
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
  ZenStatsPreview,
  ModeTogglePreview,
  ContextMapSelectorPreview,
  DirectionCardPreview,
  PackageCardPreview,
  HeroBadgePreview,
} from './previews';

interface FeaturedHeroProps {
  onComponentClick: (componentId: string) => void;
  starredIds: Set<string>;
}

// Default accent color for components not explicitly defined
const DEFAULT_ACCENT = { border: 'border-gray-500/40', glow: 'hover:shadow-gray-500/20', bg: 'from-gray-500/10', text: 'text-gray-400' };

const ACCENT_COLORS: Record<string, { border: string; glow: string; bg: string; text: string }> = {
  // Buttons
  'animated-button': { border: 'border-blue-500/40', glow: 'hover:shadow-blue-500/20', bg: 'from-blue-500/10', text: 'text-blue-400' },
  'icon-button': { border: 'border-indigo-500/40', glow: 'hover:shadow-indigo-500/20', bg: 'from-indigo-500/10', text: 'text-indigo-400' },
  'illuminated-button': { border: 'border-sky-500/40', glow: 'hover:shadow-sky-500/20', bg: 'from-sky-500/10', text: 'text-sky-400' },
  // Inputs
  'universal-select': { border: 'border-purple-500/40', glow: 'hover:shadow-purple-500/20', bg: 'from-purple-500/10', text: 'text-purple-400' },
  'styled-checkbox': { border: 'border-teal-500/40', glow: 'hover:shadow-teal-500/20', bg: 'from-teal-500/10', text: 'text-teal-400' },
  'selection-grid': { border: 'border-fuchsia-500/40', glow: 'hover:shadow-fuchsia-500/20', bg: 'from-fuchsia-500/10', text: 'text-fuchsia-400' },
  // Display
  'status-chip': { border: 'border-emerald-500/40', glow: 'hover:shadow-emerald-500/20', bg: 'from-emerald-500/10', text: 'text-emerald-400' },
  'badge': { border: 'border-lime-500/40', glow: 'hover:shadow-lime-500/20', bg: 'from-lime-500/10', text: 'text-lime-400' },
  'progress-bar': { border: 'border-cyan-500/40', glow: 'hover:shadow-cyan-500/20', bg: 'from-cyan-500/10', text: 'text-cyan-400' },
  'loading-spinner': { border: 'border-blue-500/40', glow: 'hover:shadow-blue-500/20', bg: 'from-blue-500/10', text: 'text-blue-400' },
  'empty-state': { border: 'border-violet-500/40', glow: 'hover:shadow-violet-500/20', bg: 'from-violet-500/10', text: 'text-violet-400' },
  // Cards
  'compact-list': { border: 'border-orange-500/40', glow: 'hover:shadow-orange-500/20', bg: 'from-orange-500/10', text: 'text-orange-400' },
  'performance-card': { border: 'border-violet-500/40', glow: 'hover:shadow-violet-500/20', bg: 'from-violet-500/10', text: 'text-violet-400' },
  // Charts
  'stats-bar-chart': { border: 'border-blue-500/40', glow: 'hover:shadow-blue-500/20', bg: 'from-blue-500/10', text: 'text-blue-400' },
  'stacked-bar-chart': { border: 'border-emerald-500/40', glow: 'hover:shadow-emerald-500/20', bg: 'from-emerald-500/10', text: 'text-emerald-400' },
  // Overlays
  'modal-transition': { border: 'border-pink-500/40', glow: 'hover:shadow-pink-500/20', bg: 'from-pink-500/10', text: 'text-pink-400' },
  'slide-drawer': { border: 'border-rose-500/40', glow: 'hover:shadow-rose-500/20', bg: 'from-rose-500/10', text: 'text-rose-400' },
  // GoalsLayout
  'screen-thumbnail': { border: 'border-cyan-500/40', glow: 'hover:shadow-cyan-500/20', bg: 'from-cyan-500/10', text: 'text-cyan-400' },
  'candidate-card': { border: 'border-amber-500/40', glow: 'hover:shadow-amber-500/20', bg: 'from-amber-500/10', text: 'text-amber-400' },
  // IdeasLayout
  'scan-type-card': { border: 'border-purple-500/40', glow: 'hover:shadow-purple-500/20', bg: 'from-purple-500/10', text: 'text-purple-400' },
  'provider-status': { border: 'border-green-500/40', glow: 'hover:shadow-green-500/20', bg: 'from-green-500/10', text: 'text-green-400' },
  // TinderLayout
  'idea-card': { border: 'border-rose-500/40', glow: 'hover:shadow-rose-500/20', bg: 'from-rose-500/10', text: 'text-rose-400' },
  'swipe-progress': { border: 'border-emerald-500/40', glow: 'hover:shadow-emerald-500/20', bg: 'from-emerald-500/10', text: 'text-emerald-400' },
  // TaskRunnerLayout
  'session-batch-display': { border: 'border-blue-500/40', glow: 'hover:shadow-blue-500/20', bg: 'from-blue-500/10', text: 'text-blue-400' },
  'checkpoint-progress': { border: 'border-sky-500/40', glow: 'hover:shadow-sky-500/20', bg: 'from-sky-500/10', text: 'text-sky-400' },
  // ManagerLayout
  'implementation-log-card': { border: 'border-cyan-500/40', glow: 'hover:shadow-cyan-500/20', bg: 'from-cyan-500/10', text: 'text-cyan-400' },
  'hypothesis-row': { border: 'border-indigo-500/40', glow: 'hover:shadow-indigo-500/20', bg: 'from-indigo-500/10', text: 'text-indigo-400' },
  // ContextLayout
  'context-jail-card': { border: 'border-teal-500/40', glow: 'hover:shadow-teal-500/20', bg: 'from-teal-500/10', text: 'text-teal-400' },
  'gradient-palette-picker': { border: 'border-fuchsia-500/40', glow: 'hover:shadow-fuchsia-500/20', bg: 'from-fuchsia-500/10', text: 'text-fuchsia-400' },
  // ReflectorLayout
  'weekly-kpi-cards': { border: 'border-amber-500/40', glow: 'hover:shadow-amber-500/20', bg: 'from-amber-500/10', text: 'text-amber-400' },
  'kpi-summary-cards': { border: 'border-yellow-500/40', glow: 'hover:shadow-yellow-500/20', bg: 'from-yellow-500/10', text: 'text-yellow-400' },
  // SocialLayout
  'sla-badge': { border: 'border-orange-500/40', glow: 'hover:shadow-orange-500/20', bg: 'from-orange-500/10', text: 'text-orange-400' },
  'ai-processing-panel': { border: 'border-blue-500/40', glow: 'hover:shadow-blue-500/20', bg: 'from-blue-500/10', text: 'text-blue-400' },
  // BlueprintComposer
  'chain-builder': { border: 'border-violet-500/40', glow: 'hover:shadow-violet-500/20', bg: 'from-violet-500/10', text: 'text-violet-400' },
  'decision-node-config': { border: 'border-cyan-500/40', glow: 'hover:shadow-cyan-500/20', bg: 'from-cyan-500/10', text: 'text-cyan-400' },
  // ZenLayout
  'zen-stats': { border: 'border-emerald-500/40', glow: 'hover:shadow-emerald-500/20', bg: 'from-emerald-500/10', text: 'text-emerald-400' },
  'mode-toggle': { border: 'border-lime-500/40', glow: 'hover:shadow-lime-500/20', bg: 'from-lime-500/10', text: 'text-lime-400' },
  // QuestionsLayout
  'context-map-selector': { border: 'border-purple-500/40', glow: 'hover:shadow-purple-500/20', bg: 'from-purple-500/10', text: 'text-purple-400' },
  'direction-card': { border: 'border-sky-500/40', glow: 'hover:shadow-sky-500/20', bg: 'from-sky-500/10', text: 'text-sky-400' },
  // RefactorPage
  'package-card': { border: 'border-teal-500/40', glow: 'hover:shadow-teal-500/20', bg: 'from-teal-500/10', text: 'text-teal-400' },
  'hero-badge': { border: 'border-amber-500/40', glow: 'hover:shadow-amber-500/20', bg: 'from-amber-500/10', text: 'text-amber-400' },
};

function getDefaultProps(componentId: string): Record<string, unknown> {
  switch (componentId) {
    // Buttons
    case 'animated-button':
      return { variant: 'primary', size: 'md' };
    case 'icon-button':
      return { colorScheme: 'cyan', variant: 'solid', size: 'md' };
    case 'illuminated-button':
      return { color: 'cyan', size: 'md', selected: false, scanning: false };
    // Inputs
    case 'universal-select':
      return { variant: 'cyber', size: 'md' };
    case 'styled-checkbox':
      return { colorScheme: 'cyan', size: 'md' };
    case 'selection-grid':
      return { multiSelect: true, columns: '3' };
    // Display
    case 'status-chip':
      return { status: 'processing', size: 'md', animated: true };
    case 'badge':
      return { variant: 'success', size: 'sm' };
    case 'progress-bar':
      return { variant: 'cyan', height: 'md', progress: '65' };
    case 'loading-spinner':
      return { size: 'md' };
    case 'empty-state':
      return { type: 'ideas' };
    // Cards
    case 'compact-list':
      return { status: 'pending' };
    case 'performance-card':
      return { borderColor: 'border-violet-500/20' };
    // Charts
    case 'stats-bar-chart':
      return { showTotal: true };
    case 'stacked-bar-chart':
      return { showTotalBadge: true, showAvgBadge: false };
    // Overlays
    case 'modal-transition':
      return { variant: 'spring' };
    case 'slide-drawer':
      return { slideFrom: 'right' };
    // GoalsLayout
    case 'screen-thumbnail':
      return { hasImage: true, isHovered: false };
    case 'candidate-card':
      return { priority: 'medium', isEditing: false };
    // IdeasLayout
    case 'scan-type-card':
      return { category: 'technical', selected: false };
    case 'provider-status':
      return { state: 'connected', variant: 'full' };
    // TinderLayout
    case 'idea-card':
      return { swipeDirection: 'none' };
    case 'swipe-progress':
      return { variant: 'full' };
    // TaskRunnerLayout
    case 'session-batch-display':
      return { status: 'running' };
    case 'checkpoint-progress':
      return { compact: false, status: 'in_progress' };
    // ManagerLayout
    case 'implementation-log-card':
      return { compact: false, tested: false };
    case 'hypothesis-row':
      return { status: 'unverified', category: 'behavior' };
    // ContextLayout
    case 'context-jail-card':
      return { isSelected: false, taskCount: '2' };
    case 'gradient-palette-picker':
      return { compact: false, primaryColor: '#06b6d4' };
    // ReflectorLayout
    case 'weekly-kpi-cards':
      return { accentColor: 'cyan', showTrend: true };
    case 'kpi-summary-cards':
      return { confettiEnabled: true, cardType: 'total' };
    // SocialLayout
    case 'sla-badge':
      return { status: 'ok', compact: false };
    case 'ai-processing-panel':
      return { status: 'idle' };
    // BlueprintComposer
    case 'chain-builder':
      return { hasChains: true };
    case 'decision-node-config':
      return { position: 'after-analyzer', enabled: true };
    // ZenLayout
    case 'zen-stats':
      return { variant: 'completed' };
    case 'mode-toggle':
      return { mode: 'offline' };
    // QuestionsLayout
    case 'context-map-selector':
      return { state: 'default' };
    case 'direction-card':
      return { status: 'pending' };
    // RefactorPage
    case 'package-card':
      return { category: 'cleanup', isSelected: false };
    case 'hero-badge':
      return { isVisible: true };
    default:
      return {};
  }
}

function renderComponentPreview(componentId: string) {
  const props = getDefaultProps(componentId);

  switch (componentId) {
    // Buttons
    case 'animated-button':
      return <AnimatedButtonPreview props={props} />;
    case 'icon-button':
      return <IconButtonPreview props={props} />;
    case 'illuminated-button':
      return <IlluminatedButtonPreview props={props} />;

    // Inputs
    case 'universal-select':
      return <UniversalSelectPreview props={props} />;
    case 'styled-checkbox':
      return <StyledCheckboxPreview props={props} />;
    case 'selection-grid':
      return (
        <div className="scale-[0.8] origin-center">
          <SelectionGridPreview props={props} />
        </div>
      );

    // Display
    case 'status-chip':
      return <StatusChipPreview props={props} />;
    case 'badge':
      return <BadgePreview props={props} />;
    case 'progress-bar':
      return (
        <div className="w-full max-w-[200px]">
          <ProgressBarPreview props={props} />
        </div>
      );
    case 'loading-spinner':
      return <LoadingSpinnerPreview props={props} />;
    case 'empty-state':
      return (
        <div className="scale-[0.75] origin-center">
          <EmptyStatePreview props={props} />
        </div>
      );

    // Cards
    case 'compact-list':
      return <CompactListPreview props={props} />;
    case 'performance-card':
      return (
        <div className="scale-[0.75] origin-center">
          <PerformanceCardPreview props={props} />
        </div>
      );

    // Charts
    case 'stats-bar-chart':
      return (
        <div className="scale-[0.85] origin-center">
          <StatsBarChartPreview props={props} />
        </div>
      );
    case 'stacked-bar-chart':
      return (
        <div className="w-full max-w-[280px] scale-[0.85] origin-center">
          <StackedBarChartPreview props={props} />
        </div>
      );

    // Overlays
    case 'modal-transition':
      return <ModalTransitionPreview props={props} />;
    case 'slide-drawer':
      return <SlideDrawerPreview props={props} />;

    // GoalsLayout
    case 'screen-thumbnail':
      return <ScreenThumbnailPreview props={props} />;
    case 'candidate-card':
      return (
        <div className="scale-[0.85] origin-center">
          <CandidateCardPreview props={props} />
        </div>
      );

    // IdeasLayout
    case 'scan-type-card':
      return <ScanTypeCardPreview props={props} />;
    case 'provider-status':
      return <ProviderStatusPreview props={props} />;

    // TinderLayout
    case 'idea-card':
      return (
        <div className="scale-[0.5] origin-center">
          <IdeaCardPreview props={props} />
        </div>
      );
    case 'swipe-progress':
      return <SwipeProgressPreview props={props} />;

    // TaskRunnerLayout
    case 'session-batch-display':
      return (
        <div className="scale-[0.8] origin-center">
          <SessionBatchDisplayPreview props={props} />
        </div>
      );
    case 'checkpoint-progress':
      return <CheckpointProgressPreview props={props} />;

    // ManagerLayout
    case 'implementation-log-card':
      return (
        <div className="scale-[0.85] origin-center">
          <ImplementationLogCardPreview props={props} />
        </div>
      );
    case 'hypothesis-row':
      return (
        <div className="scale-[0.9] origin-center">
          <HypothesisRowPreview props={props} />
        </div>
      );

    // ContextLayout
    case 'context-jail-card':
      return <ContextJailCardPreview props={props} />;
    case 'gradient-palette-picker':
      return <GradientPalettePickerPreview props={props} />;

    // ReflectorLayout
    case 'weekly-kpi-cards':
      return <WeeklyKPICardsPreview props={props} />;
    case 'kpi-summary-cards':
      return <KPISummaryCardsPreview props={props} />;

    // SocialLayout
    case 'sla-badge':
      return <SLABadgePreview props={props} />;
    case 'ai-processing-panel':
      return (
        <div className="scale-[0.85] origin-center">
          <AIProcessingPanelPreview props={props} />
        </div>
      );

    // BlueprintComposer
    case 'chain-builder':
      return (
        <div className="scale-[0.85] origin-center">
          <ChainBuilderPreview props={props} />
        </div>
      );
    case 'decision-node-config':
      return <DecisionNodeConfigPreview props={props} />;

    // ZenLayout
    case 'zen-stats':
      return <ZenStatsPreview props={props} />;
    case 'mode-toggle':
      return <ModeTogglePreview props={props} />;

    // QuestionsLayout
    case 'context-map-selector':
      return <ContextMapSelectorPreview props={props} />;
    case 'direction-card':
      return (
        <div className="scale-[0.9] origin-center">
          <DirectionCardPreview props={props} />
        </div>
      );

    // RefactorPage
    case 'package-card':
      return (
        <div className="scale-[0.9] origin-center">
          <PackageCardPreview props={props} />
        </div>
      );
    case 'hero-badge':
      return (
        <div className="scale-[0.65] origin-center">
          <HeroBadgePreview props={props} />
        </div>
      );

    default:
      // Fallback for any component not explicitly handled
      return (
        <div className="flex items-center justify-center text-gray-500 text-sm">
          Preview not available
        </div>
      );
  }
}

export function FeaturedHero({ onComponentClick, starredIds }: FeaturedHeroProps) {
  // Get featured components from persisted starred IDs
  const featuredComponents = useMemo(() => {
    return showcaseComponentsData.filter(c => starredIds.has(c.id));
  }, [starredIds]);

  // Empty state when no components are starred
  if (featuredComponents.length === 0) {
    return (
      <div className="mb-10">
        {/* Section Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30">
            <Star className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Featured Components</h2>
            <p className="text-sm text-gray-400">Star components below to feature them here</p>
          </div>
        </div>

        {/* Empty state */}
        <div className="flex flex-col items-center justify-center py-12 px-6 rounded-xl border border-dashed border-gray-700/50 bg-gray-900/30">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gray-800/50 mb-4">
            <Sparkles className="w-8 h-8 text-gray-600" />
          </div>
          <p className="text-gray-400 text-center max-w-md">
            No featured components yet. Click the star icon next to any component in the table below to feature it here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-10">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30">
          <Star className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Featured Components</h2>
          <p className="text-sm text-gray-400">Live previews - click to explore variants</p>
        </div>
      </div>

      {/* Featured Components Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
        {featuredComponents.map((component, index) => {
          const category = getCategoryById(component.categoryId);
          const colors = ACCENT_COLORS[component.id] || DEFAULT_ACCENT;

          return (
            <motion.div
              key={component.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08, duration: 0.4 }}
              onClick={() => onComponentClick(component.id)}
              className={`
                group relative cursor-pointer
                rounded-xl overflow-hidden
                bg-gray-900/60 backdrop-blur-sm
                border ${colors.border}
                shadow-lg ${colors.glow} hover:shadow-xl
                transition-all duration-300
                hover:border-opacity-70
              `}
            >
              {/* Gradient accent at top */}
              <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${colors.bg} to-transparent`} />

              {/* Header bar */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800/50 bg-gray-900/40">
                <div className="flex items-center gap-2">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span className="text-sm font-medium text-white">{component.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {component.variantCount && (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Zap className="w-3 h-3" />
                      {component.variantCount}
                    </span>
                  )}
                  <ExternalLink className="w-3.5 h-3.5 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>

              {/* Component Preview Area */}
              <div className="relative min-h-[160px] flex items-center justify-center p-6 bg-gray-950/30">
                {/* Subtle grid pattern */}
                <div
                  className="absolute inset-0 opacity-[0.03]"
                  style={{
                    backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)`,
                    backgroundSize: '16px 16px'
                  }}
                />

                {/* Live component */}
                <div className="relative z-10 pointer-events-none">
                  {renderComponentPreview(component.id)}
                </div>
              </div>

              {/* Footer with category */}
              <div className="px-4 py-2.5 border-t border-gray-800/30 bg-gray-900/30">
                <div className="flex items-center justify-between">
                  {category && (
                    <span className="flex items-center gap-1.5 text-xs text-gray-500">
                      <category.icon className="w-3 h-3" />
                      {category.name}
                    </span>
                  )}
                  <span className={`text-xs ${colors.text} opacity-0 group-hover:opacity-100 transition-opacity`}>
                    View all variants →
                  </span>
                </div>
              </div>

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
