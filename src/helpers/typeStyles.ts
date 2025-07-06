import { Code2, Brain, TestTube, Palette } from 'lucide-react';

const baseAgentThemes = {
    developer: {
      bg: 'bg-cyan-500/10 border-cyan-500/20',
      hoverBg: 'hover:bg-cyan-500/15',
      icon: 'text-cyan-400/20'
    },
    mastermind: {
      bg: 'bg-purple-500/10 border-purple-500/20',
      hoverBg: 'hover:bg-purple-500/15',
      icon: 'text-purple-400/20'
    },
    tester: {
      bg: 'bg-green-500/10 border-green-500/20',
      hoverBg: 'hover:bg-green-500/15',
      icon: 'text-green-400/20'
    },
    artist: {
      bg: 'bg-pink-500/10 border-pink-500/20',
      hoverBg: 'hover:bg-pink-500/15',
      icon: 'text-pink-400/20'
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
        return 'text-pink-400';
      case 'json':
        return 'text-green-400';
      case 'md':
        return 'text-gray-400';
      default:
        return 'text-gray-300';
    }
  };
