export interface ContextFile {
  path: string;
  size?: number;
  type?: string;
  selected?: boolean;
}

export interface ContextItem {
  id: string;
  filename: string;
  title: string;
  content: string;
  files: ContextFile[];
  selected: boolean;
  expanded: boolean;
}

export interface ContextResultDisplayProps {
  contexts: Array<{ filename: string; content: string }>;
  loading: boolean;
  error: string | null;
  onBack: () => void;
  activeProject: {
    id: string;
    name: string;
    path: string;
    [key: string]: unknown;
  } | null;
}