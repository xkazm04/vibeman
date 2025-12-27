import type { LucideIcon } from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';

export type CategoryId = 'core-ui' | 'data-display' | 'overlays' | 'advanced';

export interface Category {
  id: CategoryId;
  name: string;
  description: string;
  icon: LucideIcon;
}

export interface PropOption {
  label: string;
  value: string;
}

export interface PropConfig {
  name: string;
  type: 'select' | 'toggle' | 'color';
  label: string;
  options?: PropOption[];
  defaultValue: string | boolean;
}

export interface ShowcaseComponent {
  id: string;
  name: string;
  description: string;
  categoryId: CategoryId;
  isFeatured?: boolean;
  variantCount?: number;
  // The actual component to render for preview
  PreviewComponent: ComponentType<{ props: Record<string, unknown> }>;
  // Available props for interactive controls
  propsConfig: PropConfig[];
  // Code snippet to display
  codeSnippet: string;
  // Source path for reference
  sourcePath: string;
}

export interface ComponentCardProps {
  component: ShowcaseComponent;
  onClick: () => void;
}

export interface PreviewModalProps {
  component: ShowcaseComponent | null;
  onClose: () => void;
}
