export interface PreviewProps {
  props: Record<string, unknown>;
}

export interface PropConfig {
  name: string;
  type: 'select' | 'toggle' | 'color';
  label: string;
  options?: Array<{ label: string; value: string }>;
  defaultValue: string | boolean;
}

export interface PreviewModalProps {
  componentId: string | null;
  onClose: () => void;
}
