import { create } from 'zustand';
import { ComponentInfo, ComponentMatch, CoverageStats, MatchStatus } from './types';

interface StorybookState {
  storybookComponents: ComponentInfo[];
  vibemanComponents: ComponentInfo[];
  coverage: CoverageStats | null;
  matches: ComponentMatch[];
  selectedComponent: ComponentMatch | null;
  filter: MatchStatus | 'all';
  searchQuery: string;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchComponents: () => Promise<void>;
  setSelectedComponent: (match: ComponentMatch | null) => void;
  setFilter: (filter: MatchStatus | 'all') => void;
  setSearchQuery: (query: string) => void;
}

function calculateMatches(
  storybook: ComponentInfo[],
  vibeman: ComponentInfo[]
): ComponentMatch[] {
  const matches: ComponentMatch[] = [];
  const usedVibeman = new Set<string>();

  // Match storybook components to vibeman
  storybook.forEach(sb => {
    const exactMatch = vibeman.find(v =>
      v.name.toLowerCase() === sb.name.toLowerCase()
    );

    if (exactMatch) {
      matches.push({
        storybookComponent: sb,
        vibemanComponent: exactMatch,
        status: 'matched',
        similarity: 100
      });
      usedVibeman.add(exactMatch.name);
    } else {
      // Check for partial match
      const partialMatch = vibeman.find(v =>
        !usedVibeman.has(v.name) &&
        (v.name.toLowerCase().includes(sb.name.toLowerCase()) ||
         sb.name.toLowerCase().includes(v.name.toLowerCase()))
      );

      if (partialMatch) {
        matches.push({
          storybookComponent: sb,
          vibemanComponent: partialMatch,
          status: 'partial',
          similarity: 60
        });
        usedVibeman.add(partialMatch.name);
      } else {
        matches.push({
          storybookComponent: sb,
          vibemanComponent: null,
          status: 'missing',
          similarity: 0
        });
      }
    }
  });

  // Add unique vibeman components
  vibeman.forEach(v => {
    if (!usedVibeman.has(v.name)) {
      matches.push({
        storybookComponent: null,
        vibemanComponent: v,
        status: 'unique',
        similarity: 0
      });
    }
  });

  return matches;
}

export const useStorybookStore = create<StorybookState>((set) => ({
  storybookComponents: [],
  vibemanComponents: [],
  coverage: null,
  matches: [],
  selectedComponent: null,
  filter: 'all',
  searchQuery: '',
  isLoading: false,
  error: null,

  fetchComponents: async () => {
    set({ isLoading: true, error: null });

    try {
      const response = await fetch('/api/storybook/scan');
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Failed to fetch components');

      // Calculate matches
      const matches = calculateMatches(
        data.storybookComponents,
        data.vibemanComponents
      );

      set({
        storybookComponents: data.storybookComponents,
        vibemanComponents: data.vibemanComponents,
        coverage: data.coverage,
        matches,
        isLoading: false
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false
      });
    }
  },

  setSelectedComponent: (match) => set({ selectedComponent: match }),
  setFilter: (filter) => set({ filter }),
  setSearchQuery: (query) => set({ searchQuery: query })
}));
