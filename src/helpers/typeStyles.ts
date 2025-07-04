import { Code2, Brain, TestTube, Palette } from 'lucide-react';
export const agentThemes = {
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

export const agentIcons = {
    developer: Code2,
    mastermind: Brain,
    tester: TestTube,
    artist: Palette
  };