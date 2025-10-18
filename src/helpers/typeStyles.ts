import { Code2, Brain, TestTube, Palette } from 'lucide-react';

const baseAgentThemes = {
    developer: {
      bg: 'bg-cyan-500/10 border-cyan-500/20',
      hoverBg: 'hover:bg-cyan-500/15',
      icon: 'text-cyan-400/20'
    },
    mastermind: {
      bg: 'bg-blue-500/10 border-blue-500/20',
      hoverBg: 'hover:bg-blue-500/15',
      icon: 'text-blue-400/20'
    },
    tester: {
      bg: 'bg-green-500/10 border-green-500/20',
      hoverBg: 'hover:bg-green-500/15',
      icon: 'text-green-400/20'
    },
    artist: {
      bg: 'bg-red-500/10 border-red-500/20',
      hoverBg: 'hover:bg-red-500/15',
      icon: 'text-red-400/20'
    }
  };

const baseAgentIcons = {
    developer: Code2,
    mastermind: Brain,
    tester: TestTube,
    artist: Palette
  };

export const agentThemes = new Proxy(baseAgentThemes, {
  get(target, prop) {
    return target[prop as keyof typeof target] || target.developer;
  }
});

export const agentIcons = new Proxy(baseAgentIcons, {
  get(target, prop) {
    return target[prop as keyof typeof target] || target.developer;
  }
});

// Supported file extensions for selection and display
export const SUPPORTED_FILE_EXTENSIONS = [
  'tsx', 'ts', 'jsx', 'js',
  'css', 'scss', 'sass', 'less',
  'json', 'md', 'mdx',
  'html', 'htm',
  'py', 'java', 'go', 'rs', 'c', 'cpp', 'h', 'hpp'
];

export const isSupportedFile = (fileName: string): boolean => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  return ext ? SUPPORTED_FILE_EXTENSIONS.includes(ext) : false;
};

export const getFileTypeColor = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'tsx':
      case 'jsx':
        return 'text-blue-400';
      case 'ts':
      case 'js':
        return 'text-yellow-400';
      case 'css':
      case 'scss':
      case 'sass':
      case 'less':
        return 'text-red-400';
      case 'json':
        return 'text-green-400';
      case 'md':
      case 'mdx':
        return 'text-purple-400';
      case 'html':
      case 'htm':
        return 'text-orange-400';
      case 'py':
        return 'text-blue-300';
      case 'java':
        return 'text-red-300';
      case 'go':
        return 'text-cyan-300';
      case 'rs':
        return 'text-orange-300';
      case 'c':
      case 'cpp':
      case 'h':
      case 'hpp':
        return 'text-indigo-400';
      default:
        return 'text-gray-300';
    }
  };
