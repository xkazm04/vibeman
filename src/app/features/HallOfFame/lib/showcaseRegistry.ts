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
    id: 'motion-button',
    name: 'MotionButton',
    description: '13 color schemes, 4 variants, 5 sizes, and 5 animation presets with Framer Motion',
    categoryId: 'core-ui',
    isFeatured: true,
    variantCount: 260,
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
          { label: 'Orange', value: 'orange' },
        ],
        defaultValue: 'cyan',
      },
      {
        name: 'variant',
        type: 'select',
        label: 'Variant',
        options: [
          { label: 'Solid', value: 'solid' },
          { label: 'Outline', value: 'outline' },
          { label: 'Ghost', value: 'ghost' },
          { label: 'Glassmorphic', value: 'glassmorphic' },
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
          { label: 'XL', value: 'xl' },
        ],
        defaultValue: 'md',
      },
    ],
    codeSnippet: `import { MotionButton } from '@/components/ui/buttons/MotionButton';
import { Sparkles } from 'lucide-react';

<MotionButton
  colorScheme="cyan"
  variant="solid"
  size="md"
  icon={Sparkles}
>
  Click Me
</MotionButton>`,
    sourcePath: 'src/components/ui/buttons/MotionButton.tsx',
  },
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
    id: 'decision-card',
    name: 'DecisionCard',
    description: 'Feature-rich card with severity levels, pulsing animations, and floating particles',
    categoryId: 'data-display',
    isFeatured: true,
    variantCount: 12,
    propsConfig: [
      {
        name: 'severity',
        type: 'select',
        label: 'Severity',
        options: [
          { label: 'Info', value: 'info' },
          { label: 'Warning', value: 'warning' },
          { label: 'Error', value: 'error' },
          { label: 'Success', value: 'success' },
        ],
        defaultValue: 'info',
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
    codeSnippet: `import { DecisionCard } from '@/components/DecisionPanel/DecisionCard';
import { CheckCircle, ArrowRight } from 'lucide-react';

<DecisionCard
  config={{
    title: "Review Complete",
    description: "All checks passed",
    severity: "success",
    icon: CheckCircle,
    actions: [
      { label: "Continue", icon: ArrowRight, onClick: handleContinue }
    ]
  }}
/>`,
    sourcePath: 'src/components/DecisionPanel/DecisionCard.tsx',
  },
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
    id: 'cyber-card',
    name: 'CyberCard',
    description: 'Futuristic card with blueprint-inspired grid pattern and glow variants',
    categoryId: 'advanced',
    variantCount: 3,
    propsConfig: [
      {
        name: 'variant',
        type: 'select',
        label: 'Variant',
        options: [
          { label: 'Default', value: 'default' },
          { label: 'Dark', value: 'dark' },
          { label: 'Glow', value: 'glow' },
        ],
        defaultValue: 'default',
      },
    ],
    codeSnippet: `import { CyberCard } from '@/components/ui/wizard/CyberCard';

<CyberCard variant="glow" onClick={handleClick}>
  <h3>Futuristic Design</h3>
  <p>With animated grid patterns</p>
</CyberCard>`,
    sourcePath: 'src/components/ui/wizard/CyberCard.tsx',
  },
  {
    id: 'glow-card',
    name: 'GlowCard',
    description: 'Glassmorphic card with configurable glow colors and hover effects',
    categoryId: 'advanced',
    variantCount: 4,
    propsConfig: [
      {
        name: 'glowColor',
        type: 'select',
        label: 'Glow Color',
        options: [
          { label: 'Cyan', value: 'cyan' },
          { label: 'Blue', value: 'blue' },
          { label: 'Green', value: 'green' },
          { label: 'Red', value: 'red' },
        ],
        defaultValue: 'cyan',
      },
    ],
    codeSnippet: `import { GlowCard } from '@/components/GlowCard';

<GlowCard glowColor="cyan">
  <h3>Glowing Card</h3>
  <p>With glassmorphic backdrop</p>
</GlowCard>`,
    sourcePath: 'src/components/GlowCard.tsx',
  },

  // ===== NEW EXTRACTED COMPONENTS =====
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
