'use client';

import { MousePointer, Layout, Layers, Zap } from 'lucide-react';
import type { Category, CategoryId } from './types';

// Categories with icons
export const categories: Category[] = [
  {
    id: 'core-ui',
    name: 'Core UI',
    description: 'Buttons, Forms, and Input controls',
    icon: MousePointer,
  },
  {
    id: 'data-display',
    name: 'Data Display',
    description: 'Cards, Status indicators, and Feedback',
    icon: Layout,
  },
  {
    id: 'overlays',
    name: 'Overlays',
    description: 'Modals and Dialogs',
    icon: Layers,
  },
  {
    id: 'advanced',
    name: 'Advanced',
    description: 'Complex interactive components',
    icon: Zap,
  },
];

// Helper to get category by ID
export const getCategoryById = (id: CategoryId): Category | undefined => {
  return categories.find(cat => cat.id === id);
};

// Component data without the preview component (those are rendered dynamically)
export interface ShowcaseComponentData {
  id: string;
  name: string;
  description: string;
  categoryId: CategoryId;
  isFeatured?: boolean;
  variantCount?: number;
  propsConfig: Array<{
    name: string;
    type: 'select' | 'toggle' | 'color';
    label: string;
    options?: Array<{ label: string; value: string }>;
    defaultValue: string | boolean;
  }>;
  codeSnippet: string;
  sourcePath: string;
}

// Real component definitions from src/components
export const showcaseComponentsData: ShowcaseComponentData[] = [
  // ===== CORE UI =====
  {
    id: 'animated-button',
    name: 'AnimatedButton',
    description: 'Semantic button with 7 variants: primary, secondary, success, danger, warning, ghost, outline',
    categoryId: 'core-ui',
    variantCount: 28,
    propsConfig: [
      {
        name: 'variant',
        type: 'select',
        label: 'Variant',
        options: [
          { label: 'Primary', value: 'primary' },
          { label: 'Secondary', value: 'secondary' },
          { label: 'Success', value: 'success' },
          { label: 'Danger', value: 'danger' },
          { label: 'Warning', value: 'warning' },
          { label: 'Ghost', value: 'ghost' },
          { label: 'Outline', value: 'outline' },
        ],
        defaultValue: 'primary',
      },
      {
        name: 'size',
        type: 'select',
        label: 'Size',
        options: [
          { label: 'XS', value: 'xs' },
          { label: 'SM', value: 'sm' },
          { label: 'MD', value: 'md' },
          { label: 'LG', value: 'lg' },
        ],
        defaultValue: 'md',
      },
    ],
    codeSnippet: `import { AnimatedButton } from '@/components/ui/buttons/AnimatedButton';
import { Plus } from 'lucide-react';

<AnimatedButton
  variant="primary"
  size="md"
  icon={Plus}
>
  Add Item
</AnimatedButton>`,
    sourcePath: 'src/components/ui/buttons/AnimatedButton.tsx',
  },
  {
    id: 'icon-button',
    name: 'IconButton',
    description: 'Icon-only button with 13 colors, 3 variants (solid/ghost/outline), and 5 sizes',
    categoryId: 'core-ui',
    variantCount: 195,
    propsConfig: [
      {
        name: 'colorScheme',
        type: 'select',
        label: 'Color',
        options: [
          { label: 'Cyan', value: 'cyan' },
          { label: 'Blue', value: 'blue' },
          { label: 'Purple', value: 'purple' },
          { label: 'Green', value: 'green' },
          { label: 'Red', value: 'red' },
        ],
        defaultValue: 'cyan',
      },
      {
        name: 'variant',
        type: 'select',
        label: 'Variant',
        options: [
          { label: 'Solid', value: 'solid' },
          { label: 'Ghost', value: 'ghost' },
          { label: 'Outline', value: 'outline' },
        ],
        defaultValue: 'solid',
      },
      {
        name: 'size',
        type: 'select',
        label: 'Size',
        options: [
          { label: 'XS', value: 'xs' },
          { label: 'SM', value: 'sm' },
          { label: 'MD', value: 'md' },
          { label: 'LG', value: 'lg' },
        ],
        defaultValue: 'md',
      },
    ],
    codeSnippet: `import { IconButton } from '@/components/ui/buttons/IconButton';
import { Settings } from 'lucide-react';

<IconButton
  icon={Settings}
  colorScheme="cyan"
  variant="solid"
  size="md"
  aria-label="Open settings"
/>`,
    sourcePath: 'src/components/ui/buttons/IconButton.tsx',
  },
  {
    id: 'universal-select',
    name: 'UniversalSelect',
    description: '4 variants with searchable dropdown, keyboard navigation, and color indicators',
    categoryId: 'core-ui',
    isFeatured: true,
    variantCount: 12,
    propsConfig: [
      {
        name: 'variant',
        type: 'select',
        label: 'Variant',
        options: [
          { label: 'Default', value: 'default' },
          { label: 'Cyber', value: 'cyber' },
          { label: 'Minimal', value: 'minimal' },
          { label: 'Compact', value: 'compact' },
        ],
        defaultValue: 'default',
      },
      {
        name: 'size',
        type: 'select',
        label: 'Size',
        options: [
          { label: 'Small', value: 'sm' },
          { label: 'Medium', value: 'md' },
          { label: 'Large', value: 'lg' },
        ],
        defaultValue: 'md',
      },
    ],
    codeSnippet: `import { UniversalSelect } from '@/components/ui/UniversalSelect';

<UniversalSelect
  value={selected}
  onChange={setSelected}
  options={[
    { value: 'react', label: 'React' },
    { value: 'vue', label: 'Vue' },
  ]}
  variant="cyber"
  searchable
/>`,
    sourcePath: 'src/components/ui/UniversalSelect.tsx',
  },
  {
    id: 'styled-checkbox',
    name: 'StyledCheckbox',
    description: 'Animated custom checkbox with 5 color schemes and 3 sizes',
    categoryId: 'core-ui',
    variantCount: 15,
    propsConfig: [
      {
        name: 'colorScheme',
        type: 'select',
        label: 'Color',
        options: [
          { label: 'Cyan', value: 'cyan' },
          { label: 'Blue', value: 'blue' },
          { label: 'Green', value: 'green' },
          { label: 'Purple', value: 'purple' },
          { label: 'Red', value: 'red' },
        ],
        defaultValue: 'cyan',
      },
      {
        name: 'size',
        type: 'select',
        label: 'Size',
        options: [
          { label: 'Small', value: 'sm' },
          { label: 'Medium', value: 'md' },
          { label: 'Large', value: 'lg' },
        ],
        defaultValue: 'md',
      },
    ],
    codeSnippet: `import { StyledCheckbox } from '@/components/ui/StyledCheckbox';

<StyledCheckbox
  checked={isChecked}
  onChange={setIsChecked}
  label="Accept terms"
  colorScheme="cyan"
  size="md"
/>`,
    sourcePath: 'src/components/ui/StyledCheckbox.tsx',
  },

  // ===== DATA DISPLAY =====
  {
    id: 'status-chip',
    name: 'StatusChip',
    description: 'Dynamic status indicator with 6 states, 4 themes, neon glow effects, and animated scan lines',
    categoryId: 'data-display',
    isFeatured: true,
    variantCount: 72,
    propsConfig: [
      {
        name: 'status',
        type: 'select',
        label: 'Status',
        options: [
          { label: 'Idle', value: 'idle' },
          { label: 'Active', value: 'active' },
          { label: 'Processing', value: 'processing' },
          { label: 'Success', value: 'success' },
          { label: 'Warning', value: 'warning' },
          { label: 'Error', value: 'error' },
        ],
        defaultValue: 'idle',
      },
      {
        name: 'size',
        type: 'select',
        label: 'Size',
        options: [
          { label: 'Small', value: 'sm' },
          { label: 'Medium', value: 'md' },
          { label: 'Large', value: 'lg' },
        ],
        defaultValue: 'md',
      },
      {
        name: 'animated',
        type: 'toggle',
        label: 'Animated',
        defaultValue: true,
      },
    ],
    codeSnippet: `import { StatusChip } from '@/components/DecisionPanel/StatusChip';
import { Zap } from 'lucide-react';

<StatusChip
  status="processing"
  label="Scanning..."
  icon={Zap}
  animated
  size="md"
/>`,
    sourcePath: 'src/components/DecisionPanel/StatusChip.tsx',
  },
  {
    id: 'badge',
    name: 'Badge',
    description: 'Compact status/category indicator with 7 color variants and optional icons',
    categoryId: 'data-display',
    variantCount: 21,
    propsConfig: [
      {
        name: 'variant',
        type: 'select',
        label: 'Variant',
        options: [
          { label: 'Default', value: 'default' },
          { label: 'Success', value: 'success' },
          { label: 'Warning', value: 'warning' },
          { label: 'Error', value: 'error' },
          { label: 'Info', value: 'info' },
          { label: 'Purple', value: 'purple' },
          { label: 'Orange', value: 'orange' },
        ],
        defaultValue: 'default',
      },
      {
        name: 'size',
        type: 'select',
        label: 'Size',
        options: [
          { label: 'XS', value: 'xs' },
          { label: 'SM', value: 'sm' },
          { label: 'MD', value: 'md' },
        ],
        defaultValue: 'sm',
      },
    ],
    codeSnippet: `import Badge from '@/components/ui/wizard/Badge';
import { Check } from 'lucide-react';

<Badge variant="success" icon={Check} size="sm">
  Completed
</Badge>`,
    sourcePath: 'src/components/ui/wizard/Badge.tsx',
  },
  {
    id: 'progress-bar',
    name: 'ProgressBar',
    description: 'Animated progress indicator with gradient fills and 4 color variants',
    categoryId: 'data-display',
    variantCount: 12,
    propsConfig: [
      {
        name: 'variant',
        type: 'select',
        label: 'Color',
        options: [
          { label: 'Cyan', value: 'cyan' },
          { label: 'Green', value: 'green' },
          { label: 'Blue', value: 'blue' },
          { label: 'Purple', value: 'purple' },
        ],
        defaultValue: 'cyan',
      },
      {
        name: 'height',
        type: 'select',
        label: 'Height',
        options: [
          { label: 'Small', value: 'sm' },
          { label: 'Medium', value: 'md' },
          { label: 'Large', value: 'lg' },
        ],
        defaultValue: 'md',
      },
      {
        name: 'progress',
        type: 'select',
        label: 'Progress',
        options: [
          { label: '25%', value: '25' },
          { label: '50%', value: '50' },
          { label: '75%', value: '75' },
          { label: '100%', value: '100' },
        ],
        defaultValue: '50',
      },
    ],
    codeSnippet: `import ProgressBar from '@/components/ui/wizard/ProgressBar';

<ProgressBar
  progress={75}
  label="Upload Progress"
  showPercentage
  variant="cyan"
  height="md"
/>`,
    sourcePath: 'src/components/ui/wizard/ProgressBar.tsx',
  },
  {
    id: 'loading-spinner',
    name: 'LoadingSpinner',
    description: 'Theme-aware animated spinner with optional message',
    categoryId: 'data-display',
    variantCount: 3,
    propsConfig: [
      {
        name: 'size',
        type: 'select',
        label: 'Size',
        options: [
          { label: 'Small', value: 'sm' },
          { label: 'Medium', value: 'md' },
          { label: 'Large', value: 'lg' },
        ],
        defaultValue: 'md',
      },
    ],
    codeSnippet: `import LoadingSpinner from '@/components/ui/LoadingSpinner';

<LoadingSpinner size="md" message="Loading..." />`,
    sourcePath: 'src/components/ui/LoadingSpinner.tsx',
  },

  // ===== OVERLAYS =====
  {
    id: 'modal-transition',
    name: 'ModalTransition',
    description: '6 animation variants with spring physics: default, spring, slideUp, slideDown, fade, scale',
    categoryId: 'overlays',
    isFeatured: true,
    variantCount: 6,
    propsConfig: [
      {
        name: 'variant',
        type: 'select',
        label: 'Animation',
        options: [
          { label: 'Default', value: 'default' },
          { label: 'Spring', value: 'spring' },
          { label: 'Slide Up', value: 'slideUp' },
          { label: 'Slide Down', value: 'slideDown' },
          { label: 'Fade', value: 'fade' },
          { label: 'Scale', value: 'scale' },
        ],
        defaultValue: 'spring',
      },
    ],
    codeSnippet: `import { ModalTransition } from '@/components/ui/ModalTransition';

<ModalTransition
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  variant="spring"
>
  <div className="p-6 bg-gray-900 rounded-xl">
    Modal Content
  </div>
</ModalTransition>`,
    sourcePath: 'src/components/ui/ModalTransition.tsx',
  },

  // ===== ADVANCED =====
  {
    id: 'illuminated-button',
    name: 'IlluminatedButton',
    description: 'Magnetic circular button with 8 colors, glow effects, scanning animation, and spring physics',
    categoryId: 'core-ui',
    isFeatured: true,
    variantCount: 64,
    propsConfig: [
      {
        name: 'color',
        type: 'select',
        label: 'Color',
        options: [
          { label: 'Cyan', value: 'cyan' },
          { label: 'Blue', value: 'blue' },
          { label: 'Purple', value: 'purple' },
          { label: 'Amber', value: 'amber' },
          { label: 'Green', value: 'green' },
          { label: 'Red', value: 'red' },
        ],
        defaultValue: 'cyan',
      },
      {
        name: 'size',
        type: 'select',
        label: 'Size',
        options: [
          { label: 'XS', value: 'xs' },
          { label: 'SM', value: 'sm' },
          { label: 'MD', value: 'md' },
          { label: 'LG', value: 'lg' },
        ],
        defaultValue: 'md',
      },
      {
        name: 'selected',
        type: 'toggle',
        label: 'Selected',
        defaultValue: false,
      },
      {
        name: 'scanning',
        type: 'toggle',
        label: 'Scanning',
        defaultValue: false,
      },
    ],
    codeSnippet: `import IlluminatedButton from '@/components/buttons/IlluminatedButton';
import { Sparkles } from 'lucide-react';

<IlluminatedButton
  label="Scan"
  icon={Sparkles}
  color="cyan"
  size="md"
  onClick={() => {}}
  selected
/>`,
    sourcePath: 'src/components/buttons/IlluminatedButton.tsx',
  },
  {
    id: 'stats-bar-chart',
    name: 'StatsBarChart',
    description: 'Horizontal bar chart with animated entries, color coding, and total count badge',
    categoryId: 'data-display',
    variantCount: 8,
    propsConfig: [
      {
        name: 'showTotal',
        type: 'toggle',
        label: 'Show Total',
        defaultValue: true,
      },
    ],
    codeSnippet: `import StatsBarChart from '@/components/charts/StatsBarChart';
import { BarChart3 } from 'lucide-react';

<StatsBarChart
  title="Top Activity"
  subtitle="Most used scans"
  stats={[
    { label: 'Feature', value: 24, color: 'bg-cyan-500/80' },
    { label: 'Bug Fix', value: 18, color: 'bg-green-500/80' },
    { label: 'Refactor', value: 12, color: 'bg-purple-500/80' },
  ]}
  icon={BarChart3}
  showTotal
/>`,
    sourcePath: 'src/components/charts/StatsBarChart.tsx',
  },
  {
    id: 'slide-drawer',
    name: 'SlideDrawer',
    description: 'Paper-styled sliding panel with spring animation, backdrop blur, and decorative corners',
    categoryId: 'overlays',
    variantCount: 4,
    propsConfig: [
      {
        name: 'slideFrom',
        type: 'select',
        label: 'Direction',
        options: [
          { label: 'Top', value: 'top' },
          { label: 'Right', value: 'right' },
          { label: 'Bottom', value: 'bottom' },
          { label: 'Left', value: 'left' },
        ],
        defaultValue: 'top',
      },
    ],
    codeSnippet: `import SlideDrawer from '@/components/panels/SlideDrawer';

<SlideDrawer
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Getting Started"
  slideFrom="top"
>
  <div>Drawer content here</div>
</SlideDrawer>`,
    sourcePath: 'src/components/panels/SlideDrawer.tsx',
  },
  {
    id: 'compact-list',
    name: 'CompactList',
    description: 'Scrollable list column with status colors, badges, delete actions, and hover animations',
    categoryId: 'data-display',
    variantCount: 4,
    propsConfig: [
      {
        name: 'status',
        type: 'select',
        label: 'Item Status',
        options: [
          { label: 'Pending', value: 'pending' },
          { label: 'Accepted', value: 'accepted' },
          { label: 'Rejected', value: 'rejected' },
          { label: 'Implemented', value: 'implemented' },
        ],
        defaultValue: 'pending',
      },
    ],
    codeSnippet: `import CompactList from '@/components/lists/CompactList';

<CompactList
  title="Ideas Buffer"
  items={[
    { id: '1', title: 'Add dark mode', emoji: '🌙', status: 'pending' },
    { id: '2', title: 'Fix login bug', emoji: '🐛', status: 'accepted' },
  ]}
  onItemClick={(item) => console.log(item)}
  onDeleteAll={() => {}}
/>`,
    sourcePath: 'src/components/lists/CompactList.tsx',
  },
  {
    id: 'selection-grid',
    name: 'SelectionGrid',
    description: 'Grid of selectable cards with emoji/icon support, multi-select, and animated states',
    categoryId: 'core-ui',
    variantCount: 16,
    propsConfig: [
      {
        name: 'multiSelect',
        type: 'toggle',
        label: 'Multi-select',
        defaultValue: true,
      },
      {
        name: 'columns',
        type: 'select',
        label: 'Columns',
        options: [
          { label: '2', value: '2' },
          { label: '3', value: '3' },
          { label: '4', value: '4' },
        ],
        defaultValue: '4',
      },
    ],
    codeSnippet: `import SelectionGrid from '@/components/selection/SelectionGrid';

<SelectionGrid
  title="Scan Type"
  options={[
    { id: 'feature', label: 'Feature', emoji: '✨', description: 'New functionality' },
    { id: 'bugfix', label: 'Bug Fix', emoji: '🐛', description: 'Fix issues' },
    { id: 'refactor', label: 'Refactor', emoji: '🔧', description: 'Clean code' },
  ]}
  selectedIds={['feature']}
  onChange={setSelected}
  multiSelect
/>`,
    sourcePath: 'src/components/selection/SelectionGrid.tsx',
  },
  {
    id: 'stacked-bar-chart',
    name: 'StackedBarChart',
    description: 'Recharts-powered stacked bar chart with gradient fills, glass tooltip, and grid pattern',
    categoryId: 'data-display',
    isFeatured: true,
    variantCount: 6,
    propsConfig: [
      {
        name: 'showTotalBadge',
        type: 'toggle',
        label: 'Total Badge',
        defaultValue: true,
      },
      {
        name: 'showAvgBadge',
        type: 'toggle',
        label: 'Average Badge',
        defaultValue: true,
      },
    ],
    codeSnippet: `import StackedBarChart from '@/components/charts/StackedBarChart';

<StackedBarChart
  title="Daily Activity"
  subtitle="WEEKLY_BREAKDOWN"
  data={[
    { name: 'Mon', accepted: 5, rejected: 2, pending: 3 },
    { name: 'Tue', accepted: 8, rejected: 1, pending: 4 },
  ]}
  stacks={[
    { key: 'accepted', label: 'Accepted', gradient: { from: '#34d399', to: '#059669' }, stroke: '#10b981' },
    { key: 'rejected', label: 'Rejected', gradient: { from: '#f87171', to: '#dc2626' }, stroke: '#ef4444' },
  ]}
/>`,
    sourcePath: 'src/components/charts/StackedBarChart.tsx',
  },
  {
    id: 'performance-card',
    name: 'PerformanceCard',
    description: 'Dashboard card with performance metrics, trend indicators, top performers, and attention alerts',
    categoryId: 'data-display',
    variantCount: 4,
    propsConfig: [
      {
        name: 'borderColor',
        type: 'select',
        label: 'Accent',
        options: [
          { label: 'Violet', value: 'border-violet-500/20' },
          { label: 'Cyan', value: 'border-cyan-500/20' },
          { label: 'Emerald', value: 'border-emerald-500/20' },
        ],
        defaultValue: 'border-violet-500/20',
      },
    ],
    codeSnippet: `import PerformanceCard from '@/components/cards/PerformanceCard';

<PerformanceCard
  title="Specialist Performance"
  subtitle="5 ACTIVE_THIS_WEEK"
  items={[
    { id: '1', label: 'Feature Hunter', emoji: '✨', total: 24, accepted: 18, rejected: 6, acceptanceRate: 75, trend: 'up', changePercent: 12 },
  ]}
  topPerformers={[{ id: '1', label: 'Bug Hunter', emoji: '🐛', value: 92 }]}
/>`,
    sourcePath: 'src/components/cards/PerformanceCard.tsx',
  },
  {
    id: 'empty-state',
    name: 'EmptyStateIllustration',
    description: 'Animated SVG empty states with 4 themes: ideas, contexts, goals, scanQueue',
    categoryId: 'data-display',
    variantCount: 4,
    propsConfig: [
      {
        name: 'type',
        type: 'select',
        label: 'Type',
        options: [
          { label: 'Ideas', value: 'ideas' },
          { label: 'Contexts', value: 'contexts' },
          { label: 'Goals', value: 'goals' },
          { label: 'Scan Queue', value: 'scanQueue' },
        ],
        defaultValue: 'ideas',
      },
    ],
    codeSnippet: `import EmptyStateIllustration from '@/components/ui/EmptyStateIllustration';
import { Sparkles } from 'lucide-react';

<EmptyStateIllustration
  type="ideas"
  headline="Your idea buffer is empty"
  description="Generate AI-powered insights by scanning your codebase."
  action={{
    label: 'Generate Ideas',
    onClick: () => {},
    icon: Sparkles,
  }}
/>`,
    sourcePath: 'src/components/ui/EmptyStateIllustration.tsx',
  },

  // ===== NEW SHOWCASE COMPONENTS =====

  // --- GoalsLayout Components ---
  {
    id: 'screen-thumbnail',
    name: 'ScreenThumbnail',
    description: 'Parallax image card with mouse tracking, gradient glow on hover, and staggered entry animations',
    categoryId: 'data-display',
    variantCount: 3,
    propsConfig: [
      {
        name: 'hasImage',
        type: 'toggle',
        label: 'Has Image',
        defaultValue: true,
      },
      {
        name: 'isHovered',
        type: 'toggle',
        label: 'Hovered',
        defaultValue: false,
      },
    ],
    codeSnippet: `import { ScreenThumbnail } from '@/app/features/Goals/screen-catalog/ScreenThumbnail';

<ScreenThumbnail
  context={{ id: '1', name: 'Dashboard', preview: '/preview.png', groupColor: '#06b6d4' }}
  onClick={() => {}}
  index={0}
/>`,
    sourcePath: 'src/app/features/Goals/screen-catalog/ScreenThumbnail.tsx',
  },
  {
    id: 'candidate-card',
    name: 'CandidateCard',
    description: 'Priority-coded card with view/edit modes, collapsible reasoning, and multi-action buttons',
    categoryId: 'data-display',
    variantCount: 8,
    propsConfig: [
      {
        name: 'priority',
        type: 'select',
        label: 'Priority',
        options: [
          { label: 'Critical', value: 'critical' },
          { label: 'High', value: 'high' },
          { label: 'Medium', value: 'medium' },
          { label: 'Low', value: 'low' },
        ],
        defaultValue: 'medium',
      },
      {
        name: 'isEditing',
        type: 'toggle',
        label: 'Edit Mode',
        defaultValue: false,
      },
    ],
    codeSnippet: `import { CandidateCard } from '@/app/features/Goals/sub_GoalModal/components/CandidateCard';

<CandidateCard
  candidate={{ title: 'Add auth', priority_score: 85 }}
  onAccept={() => {}}
  onReject={() => {}}
/>`,
    sourcePath: 'src/app/features/Goals/sub_GoalModal/components/CandidateCard.tsx',
  },

  // --- IdeasLayout Components ---
  {
    id: 'scan-type-card',
    name: 'ScanTypeCard',
    description: 'Collapsible preview card with emoji labels, category colors, and hover-reveal examples',
    categoryId: 'core-ui',
    variantCount: 12,
    propsConfig: [
      {
        name: 'category',
        type: 'select',
        label: 'Category',
        options: [
          { label: 'Technical', value: 'technical' },
          { label: 'User Focus', value: 'user' },
          { label: 'Business', value: 'business' },
          { label: 'Mastermind', value: 'mastermind' },
        ],
        defaultValue: 'technical',
      },
      {
        name: 'selected',
        type: 'toggle',
        label: 'Selected',
        defaultValue: false,
      },
    ],
    codeSnippet: `import { ScanTypeCard } from '@/app/features/Ideas/components/ScanTypePreview';

<ScanTypeCard
  config={{ label: 'Bug Hunter', emoji: '🐛', category: 'technical' }}
  selected={false}
  onSelect={() => {}}
/>`,
    sourcePath: 'src/app/features/Ideas/components/ScanTypePreview.tsx',
  },
  {
    id: 'provider-status',
    name: 'ProviderStatus',
    description: 'Connection status indicator with 5 states, pulsing animations, and 3 size variants',
    categoryId: 'data-display',
    variantCount: 15,
    propsConfig: [
      {
        name: 'state',
        type: 'select',
        label: 'State',
        options: [
          { label: 'Connected', value: 'connected' },
          { label: 'Disconnected', value: 'disconnected' },
          { label: 'Checking', value: 'checking' },
          { label: 'Error', value: 'error' },
          { label: 'Unknown', value: 'unknown' },
        ],
        defaultValue: 'connected',
      },
      {
        name: 'variant',
        type: 'select',
        label: 'Variant',
        options: [
          { label: 'Full', value: 'full' },
          { label: 'Badge', value: 'badge' },
          { label: 'Dot', value: 'dot' },
        ],
        defaultValue: 'full',
      },
    ],
    codeSnippet: `import { ProviderStatus } from '@/app/features/Ideas/components/ProviderStatus';

<ProviderStatus
  provider="OpenAI"
  state="connected"
  modelName="gpt-4"
/>`,
    sourcePath: 'src/app/features/Ideas/components/ProviderStatus.tsx',
  },

  // --- TinderLayout Components ---
  {
    id: 'idea-card',
    name: 'IdeaCard',
    description: 'Swipeable card with gesture detection, rotation transforms, and ACCEPT/REJECT overlays',
    categoryId: 'advanced',
    variantCount: 4,
    propsConfig: [
      {
        name: 'swipeDirection',
        type: 'select',
        label: 'Swipe Preview',
        options: [
          { label: 'None', value: 'none' },
          { label: 'Left (Reject)', value: 'left' },
          { label: 'Right (Accept)', value: 'right' },
        ],
        defaultValue: 'none',
      },
    ],
    codeSnippet: `import { IdeaCard } from '@/app/features/tinder/components/IdeaCard';

<IdeaCard
  idea={{ title: 'Add dark mode', description: '...' }}
  onSwipeLeft={() => {}}
  onSwipeRight={() => {}}
/>`,
    sourcePath: 'src/app/features/tinder/components/IdeaCard.tsx',
  },
  {
    id: 'swipe-progress',
    name: 'SwipeProgress',
    description: 'Gradient progress bar with stats, accept rate display, and 3 layout variants',
    categoryId: 'data-display',
    variantCount: 3,
    propsConfig: [
      {
        name: 'variant',
        type: 'select',
        label: 'Variant',
        options: [
          { label: 'Full', value: 'full' },
          { label: 'Compact', value: 'compact' },
          { label: 'Badges', value: 'badges' },
        ],
        defaultValue: 'full',
      },
    ],
    codeSnippet: `import { SwipeProgress } from '@/app/features/tinder/components/SwipeProgress';

<SwipeProgress
  total={20}
  reviewed={12}
  accepted={8}
  rejected={4}
/>`,
    sourcePath: 'src/app/features/tinder/components/SwipeProgress.tsx',
  },

  // --- TaskRunnerLayout Components ---
  {
    id: 'session-batch-display',
    name: 'SessionBatchDisplay',
    description: 'Status-based batch card with animated progress bar, task pulses, and color-coded glows',
    categoryId: 'advanced',
    variantCount: 4,
    propsConfig: [
      {
        name: 'status',
        type: 'select',
        label: 'Status',
        options: [
          { label: 'Running', value: 'running' },
          { label: 'Paused', value: 'paused' },
          { label: 'Completed', value: 'completed' },
          { label: 'Idle', value: 'idle' },
        ],
        defaultValue: 'running',
      },
    ],
    codeSnippet: `import { SessionBatchDisplay } from '@/app/features/TaskRunner/components/SessionBatchDisplay';

<SessionBatchDisplay
  batchId="batch-1"
  selectedTaskIds={[]}
/>`,
    sourcePath: 'src/app/features/TaskRunner/components/SessionBatchDisplay.tsx',
  },
  {
    id: 'checkpoint-progress',
    name: 'CheckpointProgress',
    description: 'ASCII-style checkpoint indicators with pulsing states and compact/full variants',
    categoryId: 'data-display',
    variantCount: 8,
    propsConfig: [
      {
        name: 'compact',
        type: 'toggle',
        label: 'Compact',
        defaultValue: false,
      },
      {
        name: 'status',
        type: 'select',
        label: 'Current Status',
        options: [
          { label: 'Pending', value: 'pending' },
          { label: 'In Progress', value: 'in_progress' },
          { label: 'Completed', value: 'completed' },
          { label: 'Skipped', value: 'skipped' },
        ],
        defaultValue: 'in_progress',
      },
    ],
    codeSnippet: `import { CheckpointProgress } from '@/app/features/TaskRunner/components/CheckpointProgress';

<CheckpointProgress
  checkpoints={[
    { label: 'Init', status: 'completed' },
    { label: 'Build', status: 'in_progress' },
  ]}
  compact={false}
/>`,
    sourcePath: 'src/app/features/TaskRunner/components/CheckpointProgress.tsx',
  },

  // --- ManagerLayout Components ---
  {
    id: 'implementation-log-card',
    name: 'ImplementationLogCard',
    description: 'Neon glow card with scanline animations, gradient underline, and compact variant',
    categoryId: 'data-display',
    variantCount: 4,
    propsConfig: [
      {
        name: 'compact',
        type: 'toggle',
        label: 'Compact',
        defaultValue: false,
      },
      {
        name: 'tested',
        type: 'toggle',
        label: 'Tested',
        defaultValue: false,
      },
    ],
    codeSnippet: `import { ImplementationLogCard } from '@/app/features/Manager/components/ImplementationLogCard';

<ImplementationLogCard
  log={{ title: 'Feature X', screenshot: '/img.png' }}
  onClick={() => {}}
/>`,
    sourcePath: 'src/app/features/Manager/components/ImplementationLogCard.tsx',
  },
  // --- ContextLayout Components ---
  {
    id: 'context-jail-card',
    name: 'ContextJailCard',
    description: 'Unique jail bar aesthetic with animated bars, corner reinforcements, and selection glow',
    categoryId: 'advanced',
    variantCount: 6,
    propsConfig: [
      {
        name: 'isSelected',
        type: 'toggle',
        label: 'Selected',
        defaultValue: false,
      },
      {
        name: 'taskCount',
        type: 'select',
        label: 'Task Count',
        options: [
          { label: 'None', value: '0' },
          { label: 'Few (1-2)', value: '2' },
          { label: 'Some (3-4)', value: '4' },
          { label: 'Many (5+)', value: '6' },
        ],
        defaultValue: '0',
      },
    ],
    codeSnippet: `import { ContextJailCard } from '@/components/ContextComponents/ContextJailCard';

<ContextJailCard
  context={{ id: '1', name: 'Auth Module', implemented_tasks: 3 }}
  group={{ color: '#06b6d4' }}
  isSelected={false}
  onClick={() => {}}
/>`,
    sourcePath: 'src/components/ContextComponents/ContextJailCard.tsx',
  },
  {
    id: 'gradient-palette-picker',
    name: 'GradientPalettePicker',
    description: 'Animated color picker with 5 palette modes, live gradient preview, and compact variant',
    categoryId: 'core-ui',
    variantCount: 10,
    propsConfig: [
      {
        name: 'compact',
        type: 'toggle',
        label: 'Compact',
        defaultValue: false,
      },
      {
        name: 'primaryColor',
        type: 'select',
        label: 'Primary Color',
        options: [
          { label: 'Cyan', value: '#06b6d4' },
          { label: 'Purple', value: '#a855f7' },
          { label: 'Pink', value: '#ec4899' },
          { label: 'Green', value: '#22c55e' },
        ],
        defaultValue: '#06b6d4',
      },
    ],
    codeSnippet: `import { GradientPalettePicker } from '@/app/features/Context/context-groups/components/GradientPalettePicker';

<GradientPalettePicker
  primaryColor="#06b6d4"
  accentColor="#a855f7"
  onAccentChange={(color) => {}}
/>`,
    sourcePath: 'src/app/features/Context/context-groups/components/GradientPalettePicker.tsx',
  },

  // --- ReflectorLayout Components ---
  {
    id: 'weekly-kpi-cards',
    name: 'WeeklyKPICards',
    description: 'Neon glow KPI cards with corner markers, trend indicators, and 4 color variants',
    categoryId: 'data-display',
    variantCount: 8,
    propsConfig: [
      {
        name: 'accentColor',
        type: 'select',
        label: 'Accent',
        options: [
          { label: 'Amber', value: 'amber' },
          { label: 'Emerald', value: 'emerald' },
          { label: 'Cyan', value: 'cyan' },
          { label: 'Purple', value: 'purple' },
        ],
        defaultValue: 'cyan',
      },
      {
        name: 'showTrend',
        type: 'toggle',
        label: 'Show Trend',
        defaultValue: true,
      },
    ],
    codeSnippet: `import { WeeklyKPICards } from '@/app/features/reflector/weekly/components/WeeklyKPICards';

<WeeklyKPICards stats={{ total: 45, accepted: 32, implemented: 18, pending: 13 }} />`,
    sourcePath: 'src/app/features/reflector/weekly/components/WeeklyKPICards.tsx',
  },
  {
    id: 'kpi-summary-cards',
    name: 'KPISummaryCards',
    description: 'Animated KPI cards with confetti celebrations, spring physics, and threshold triggers',
    categoryId: 'data-display',
    variantCount: 4,
    propsConfig: [
      {
        name: 'confettiEnabled',
        type: 'toggle',
        label: 'Confetti',
        defaultValue: true,
      },
      {
        name: 'cardType',
        type: 'select',
        label: 'Card Type',
        options: [
          { label: 'Total', value: 'total' },
          { label: 'Acceptance Rate', value: 'rate' },
          { label: 'Impact', value: 'impact' },
          { label: 'Specialists', value: 'specialists' },
        ],
        defaultValue: 'total',
      },
    ],
    codeSnippet: `import { KPISummaryCards } from '@/app/features/reflector/sub_Reflection/components/KPISummaryCards';

<KPISummaryCards
  stats={{ totalReflections: 100, acceptanceRate: 75 }}
  animationConfig={{ confettiEnabled: true }}
/>`,
    sourcePath: 'src/app/features/reflector/reflection/components/KPISummaryCards.tsx',
  },

  // --- SocialLayout Components ---
  {
    id: 'sla-badge',
    name: 'SLABadge',
    description: 'Multi-status badge with pulsing animations for critical/overdue states and compact variant',
    categoryId: 'data-display',
    variantCount: 8,
    propsConfig: [
      {
        name: 'status',
        type: 'select',
        label: 'Status',
        options: [
          { label: 'OK', value: 'ok' },
          { label: 'Warning', value: 'warning' },
          { label: 'Critical', value: 'critical' },
          { label: 'Overdue', value: 'overdue' },
        ],
        defaultValue: 'ok',
      },
      {
        name: 'compact',
        type: 'toggle',
        label: 'Compact',
        defaultValue: false,
      },
    ],
    codeSnippet: `import { SLABadge } from '@/app/features/Social/components/sla/SLABadge';

<SLABadge
  item={{ priority: 'high', createdAt: '2024-01-01' }}
  compact={false}
/>`,
    sourcePath: 'src/app/features/Social/components/sla/SLABadge.tsx',
  },
  {
    id: 'ai-processing-panel',
    name: 'AIProcessingPanel',
    description: 'Multi-stage panel with gradient progress bar, 4 states, and Gemini branding',
    categoryId: 'advanced',
    variantCount: 4,
    propsConfig: [
      {
        name: 'status',
        type: 'select',
        label: 'Status',
        options: [
          { label: 'Idle', value: 'idle' },
          { label: 'Processing', value: 'processing' },
          { label: 'Success', value: 'success' },
          { label: 'Error', value: 'error' },
        ],
        defaultValue: 'idle',
      },
    ],
    codeSnippet: `import { AIProcessingPanel } from '@/app/features/Social/components/AIProcessingPanel';

<AIProcessingPanel
  selectedCount={5}
  processingStatus="idle"
  onProcess={() => {}}
/>`,
    sourcePath: 'src/app/features/Social/components/AIProcessingPanel.tsx',
  },

  // --- BlueprintComposer Components ---
  {
    id: 'chain-builder',
    name: 'ChainBuilder',
    description: 'Drag-and-drop workflow builder with step connectors, collapsible panels, and blueprint carousel',
    categoryId: 'advanced',
    variantCount: 3,
    propsConfig: [
      {
        name: 'hasChains',
        type: 'toggle',
        label: 'Has Chains',
        defaultValue: true,
      },
    ],
    codeSnippet: `import { ChainBuilder } from '@/app/features/Composer/components/ChainBuilder';

<ChainBuilder onRun={(chain) => console.log(chain)} />`,
    sourcePath: 'src/app/features/Composer/components/ChainBuilder.tsx',
  },
  {
    id: 'decision-node-config',
    name: 'DecisionNodeConfig',
    description: 'Spring-animated toggle with severity buttons, expandable config, and 3 position variants',
    categoryId: 'core-ui',
    variantCount: 12,
    propsConfig: [
      {
        name: 'position',
        type: 'select',
        label: 'Position',
        options: [
          { label: 'After Analyzer', value: 'after-analyzer' },
          { label: 'After Processor', value: 'after-processor' },
          { label: 'Before Executor', value: 'before-executor' },
        ],
        defaultValue: 'after-analyzer',
      },
      {
        name: 'enabled',
        type: 'toggle',
        label: 'Enabled',
        defaultValue: true,
      },
    ],
    codeSnippet: `import { DecisionNodeConfig } from '@/app/features/Composer/components/DecisionNodeConfig';

<DecisionNodeConfig
  config={{ enabled: true, autoApprove: false }}
  onChange={(config) => {}}
  position="after-analyzer"
/>`,
    sourcePath: 'src/app/features/Composer/components/DecisionNodeConfig.tsx',
  },

  // --- ZenLayout Components ---
  {
    id: 'mode-toggle',
    name: 'ModeToggle',
    description: 'Spring-animated toggle with gradient backgrounds, icon swap, and pulsing status dot',
    categoryId: 'core-ui',
    variantCount: 2,
    propsConfig: [
      {
        name: 'mode',
        type: 'select',
        label: 'Mode',
        options: [
          { label: 'Offline', value: 'offline' },
          { label: 'Online', value: 'online' },
        ],
        defaultValue: 'offline',
      },
    ],
    codeSnippet: `import { ModeToggle } from '@/app/zen/sub_ZenControl/components/ModeToggle';

<ModeToggle onModeChange={(mode) => console.log(mode)} />`,
    sourcePath: 'src/app/zen/sub_ZenControl/components/ModeToggle.tsx',
  },

  // --- QuestionsLayout Components ---
  {
    id: 'context-map-selector',
    name: 'ContextMapSelector',
    description: 'Multi-state selector with loading/error/empty states, selection animations, and file count badges',
    categoryId: 'core-ui',
    variantCount: 4,
    propsConfig: [
      {
        name: 'state',
        type: 'select',
        label: 'State',
        options: [
          { label: 'Default', value: 'default' },
          { label: 'Loading', value: 'loading' },
          { label: 'Error', value: 'error' },
          { label: 'Empty', value: 'empty' },
        ],
        defaultValue: 'default',
      },
    ],
    codeSnippet: `import { ContextMapSelector } from '@/app/features/Questions/components/ContextMapSelector';

<ContextMapSelector
  contexts={[{ id: '1', title: 'Auth', files: ['auth.ts'] }]}
  selectedContextIds={['1']}
  onToggleContext={(id) => {}}
/>`,
    sourcePath: 'src/app/features/Questions/components/ContextMapSelector.tsx',
  },
  {
    id: 'direction-card',
    name: 'DirectionCard',
    description: 'Status-based card with pending/accepted/rejected colors, loading spinners, and action buttons',
    categoryId: 'data-display',
    variantCount: 3,
    propsConfig: [
      {
        name: 'status',
        type: 'select',
        label: 'Status',
        options: [
          { label: 'Pending', value: 'pending' },
          { label: 'Accepted', value: 'accepted' },
          { label: 'Rejected', value: 'rejected' },
        ],
        defaultValue: 'pending',
      },
    ],
    codeSnippet: `import { DirectionCard } from '@/app/features/Questions/components/DirectionCard';

<DirectionCard
  direction={{ id: '1', summary: 'Add validation', status: 'pending' }}
  onAccept={() => {}}
  onReject={() => {}}
/>`,
    sourcePath: 'src/app/features/Questions/components/DirectionCard.tsx',
  },

  // --- RefactorPage Components ---
  {
    id: 'package-card',
    name: 'PackageCard',
    description: 'Category-gradient card with grid overlay, execution badge, and expand/collapse animation',
    categoryId: 'data-display',
    variantCount: 10,
    propsConfig: [
      {
        name: 'category',
        type: 'select',
        label: 'Category',
        options: [
          { label: 'Migration', value: 'migration' },
          { label: 'Cleanup', value: 'cleanup' },
          { label: 'Security', value: 'security' },
          { label: 'Performance', value: 'performance' },
          { label: 'Architecture', value: 'architecture' },
        ],
        defaultValue: 'cleanup',
      },
      {
        name: 'isSelected',
        type: 'toggle',
        label: 'Selected',
        defaultValue: false,
      },
    ],
    codeSnippet: `import { PackageCard } from '@/app/features/RefactorWizard/components/PackageCard';

<PackageCard
  package={{ name: 'Cleanup Utils', category: 'cleanup' }}
  isSelected={false}
  onToggleSelect={() => {}}
/>`,
    sourcePath: 'src/app/features/RefactorWizard/components/PackageCard.tsx',
  },
  {
    id: 'hero-badge',
    name: 'HeroBadge',
    description: 'Achievement modal with confetti burst, trophy spotlight, glass morphism stats, and multi-layer gradients',
    categoryId: 'overlays',
    variantCount: 2,
    propsConfig: [
      {
        name: 'isVisible',
        type: 'toggle',
        label: 'Visible',
        defaultValue: true,
      },
    ],
    codeSnippet: `import { HeroBadge } from '@/app/features/RefactorWizard/components/HeroBadge';

<HeroBadge
  isVisible={true}
  onClose={() => {}}
  userName="Developer"
  opportunitiesCount={42}
  filesCount={15}
  batchCount={3}
/>`,
    sourcePath: 'src/app/features/RefactorWizard/components/HeroBadge.tsx',
  },
];

// Get components by category
export const getComponentsByCategory = (categoryId: CategoryId) => {
  return showcaseComponentsData.filter(comp => comp.categoryId === categoryId);
};

// Get featured components
export const getFeaturedComponents = () => {
  return showcaseComponentsData.filter(comp => comp.isFeatured);
};

// Get component count by category
export const getComponentCountByCategory = (categoryId: CategoryId) => {
  return getComponentsByCategory(categoryId).length;
};

// Get total component count
export const getTotalComponentCount = () => {
  return showcaseComponentsData.length;
};

// Get component by ID
export const getComponentById = (id: string) => {
  return showcaseComponentsData.find(comp => comp.id === id);
};
