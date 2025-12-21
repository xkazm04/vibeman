import { useState, useCallback, useEffect } from 'react';
import type {
  DiscoveryConfig,
  DiscoveredTweet,
  DiscoveryFormState,
  DEFAULT_DISCOVERY_FORM,
} from '../lib/types';

interface UseDiscoveryProps {
  projectId: string;
}

interface UseDiscoveryReturn {
  // Config state
  configs: DiscoveryConfig[];
  selectedConfig: DiscoveryConfig | null;
  isLoadingConfigs: boolean;

  // Form state
  formState: DiscoveryFormState;
  setFormState: React.Dispatch<React.SetStateAction<DiscoveryFormState>>;
  isEditing: boolean;

  // Search state
  searchResults: DiscoveredTweet[];
  isSearching: boolean;
  searchError: string | null;

  // Selected tweets for saving
  selectedTweets: Set<string>;
  isSaving: boolean;

  // Actions
  loadConfigs: () => Promise<void>;
  selectConfig: (config: DiscoveryConfig | null) => void;
  createConfig: () => Promise<void>;
  updateConfig: () => Promise<void>;
  deleteConfig: (id: string) => Promise<void>;
  startEditing: (config: DiscoveryConfig) => void;
  cancelEditing: () => void;
  executeSearch: (query: string) => Promise<void>;
  toggleTweetSelection: (tweetId: string) => void;
  selectAllTweets: () => void;
  deselectAllTweets: () => void;
  saveSelectedTweets: () => Promise<number>;
}

export function useDiscovery({ projectId }: UseDiscoveryProps): UseDiscoveryReturn {
  // Config state
  const [configs, setConfigs] = useState<DiscoveryConfig[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<DiscoveryConfig | null>(null);
  const [isLoadingConfigs, setIsLoadingConfigs] = useState(false);

  // Form state
  const [formState, setFormState] = useState<DiscoveryFormState>({ name: '', query: '' });
  const [isEditing, setIsEditing] = useState(false);

  // Search state
  const [searchResults, setSearchResults] = useState<DiscoveredTweet[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Selection state
  const [selectedTweets, setSelectedTweets] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  // Load configs on mount
  const loadConfigs = useCallback(async () => {
    setIsLoadingConfigs(true);
    try {
      const res = await fetch(`/api/social/discovery?projectId=${projectId}`);
      const data = await res.json();
      setConfigs(data.configs || []);
    } catch (error) {
      console.error('Failed to load discovery configs:', error);
    } finally {
      setIsLoadingConfigs(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  const selectConfig = useCallback((config: DiscoveryConfig | null) => {
    setSelectedConfig(config);
    setSearchResults([]);
    setSelectedTweets(new Set());
    setSearchError(null);
    if (config) {
      setFormState({ name: config.name, query: config.query });
    }
  }, []);

  const createConfig = useCallback(async () => {
    const res = await fetch('/api/social/discovery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, ...formState }),
    });
    const data = await res.json();
    if (data.success) {
      await loadConfigs();
      setFormState({ name: '', query: '' });
      setSelectedConfig(data.config);
    }
  }, [projectId, formState, loadConfigs]);

  const updateConfig = useCallback(async () => {
    if (!selectedConfig) return;
    const res = await fetch('/api/social/discovery', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selectedConfig.id, ...formState }),
    });
    const data = await res.json();
    if (data.success) {
      await loadConfigs();
      setIsEditing(false);
      setSelectedConfig(data.config);
    }
  }, [selectedConfig, formState, loadConfigs]);

  const deleteConfig = useCallback(async (id: string) => {
    await fetch(`/api/social/discovery?id=${id}`, { method: 'DELETE' });
    await loadConfigs();
    if (selectedConfig?.id === id) {
      setSelectedConfig(null);
    }
  }, [loadConfigs, selectedConfig]);

  const startEditing = useCallback((config: DiscoveryConfig) => {
    setFormState({ name: config.name, query: config.query });
    setIsEditing(true);
  }, []);

  const cancelEditing = useCallback(() => {
    setIsEditing(false);
    if (selectedConfig) {
      setFormState({ name: selectedConfig.name, query: selectedConfig.query });
    }
  }, [selectedConfig]);

  const executeSearch = useCallback(async (query: string) => {
    setIsSearching(true);
    setSearchError(null);
    setSelectedTweets(new Set());
    try {
      const res = await fetch('/api/social/discovery/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          configId: selectedConfig?.id,
          projectId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSearchResults(data.tweets);
      } else {
        setSearchError(data.error || 'Search failed');
      }
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  }, [selectedConfig, projectId]);

  const toggleTweetSelection = useCallback((tweetId: string) => {
    setSelectedTweets(prev => {
      const next = new Set(prev);
      if (next.has(tweetId)) {
        next.delete(tweetId);
      } else {
        next.add(tweetId);
      }
      return next;
    });
  }, []);

  const selectAllTweets = useCallback(() => {
    setSelectedTweets(new Set(searchResults.map(t => t.id)));
  }, [searchResults]);

  const deselectAllTweets = useCallback(() => {
    setSelectedTweets(new Set());
  }, []);

  const saveSelectedTweets = useCallback(async (): Promise<number> => {
    if (!selectedConfig || selectedTweets.size === 0) return 0;
    setIsSaving(true);
    try {
      const tweetsToSave = searchResults.filter(t => selectedTweets.has(t.id));
      const res = await fetch('/api/social/discovery/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          configId: selectedConfig.id,
          tweets: tweetsToSave,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedTweets(new Set());
        await loadConfigs();
        return data.savedCount;
      }
      return 0;
    } finally {
      setIsSaving(false);
    }
  }, [selectedConfig, selectedTweets, searchResults, projectId, loadConfigs]);

  return {
    configs,
    selectedConfig,
    isLoadingConfigs,
    formState,
    setFormState,
    isEditing,
    searchResults,
    isSearching,
    searchError,
    selectedTweets,
    isSaving,
    loadConfigs,
    selectConfig,
    createConfig,
    updateConfig,
    deleteConfig,
    startEditing,
    cancelEditing,
    executeSearch,
    toggleTweetSelection,
    selectAllTweets,
    deselectAllTweets,
    saveSelectedTweets,
  };
}
