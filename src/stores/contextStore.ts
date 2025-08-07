'use client';
import { useState, useEffect } from 'react';

export interface Context {
  id: string;
  name: string;
  description: string;
  filePaths: string[];
  createdAt: Date;
  section: 'left' | 'center' | 'right';
}

interface ContextState {
  contexts: Context[];
}

interface ContextStore extends ContextState {
  addContext: (context: Omit<Context, 'id'>) => void;
  removeContext: (contextId: string) => void;
  moveContext: (contextId: string, newSection: 'left' | 'center' | 'right') => void;
  clearAllContexts: () => void;
  getContext: (contextId: string) => Context | undefined;
}

// Local storage key
const STORAGE_KEY = 'vibeman-contexts';

// Load contexts from localStorage
const loadContextsFromStorage = (): Context[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    // Convert date strings back to Date objects
    return parsed.map((ctx: any) => ({
      ...ctx,
      createdAt: new Date(ctx.createdAt)
    }));
  } catch (error) {
    console.error('Failed to load contexts from storage:', error);
    return [];
  }
};

// Save contexts to localStorage
const saveContextsToStorage = (contexts: Context[]) => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(contexts));
  } catch (error) {
    console.error('Failed to save contexts to storage:', error);
  }
};

// Zustand-like state management for contexts
export const useContextStore = (() => {
  let state: ContextState = {
    contexts: []
  };
  
  const listeners = new Set<(state: ContextState) => void>();
  
  const setState = (updater: ((prev: ContextState) => ContextState) | Partial<ContextState>) => {
    state = typeof updater === 'function' ? updater(state) : { ...state, ...updater };
    
    // Save to localStorage whenever state changes
    saveContextsToStorage(state.contexts);
    
    listeners.forEach(listener => listener(state));
  };
  
  const subscribe = (listener: (state: ContextState) => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  
  // Initialize state from localStorage
  if (typeof window !== 'undefined') {
    state.contexts = loadContextsFromStorage();
  }
  
  return (): ContextStore => {
    const [, forceUpdate] = useState({});
    
    useEffect(() => {
      // Load from storage on mount
      setState({ contexts: loadContextsFromStorage() });
      
      const unsubscribe = subscribe(() => forceUpdate({}));
      return () => {
        unsubscribe();
      };
    }, []);
    
    return {
      ...state,
      addContext: (contextData: Omit<Context, 'id'>) => setState(prev => {
        // Check if we're at the limit
        if (prev.contexts.length >= 10) {
          console.warn('Maximum of 10 contexts allowed');
          return prev;
        }
        
        const newContext: Context = {
          ...contextData,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
        };
        
        return {
          ...prev,
          contexts: [newContext, ...prev.contexts]
        };
      }),
      
      removeContext: (contextId: string) => setState(prev => ({
        ...prev,
        contexts: prev.contexts.filter(ctx => ctx.id !== contextId)
      })),
      
      moveContext: (contextId: string, newSection: 'left' | 'center' | 'right') => setState(prev => ({
        ...prev,
        contexts: prev.contexts.map(ctx => 
          ctx.id === contextId ? { ...ctx, section: newSection } : ctx
        )
      })),
      
      clearAllContexts: () => setState(prev => ({
        ...prev,
        contexts: []
      })),
      
      getContext: (contextId: string) => {
        return state.contexts.find(ctx => ctx.id === contextId);
      }
    };
  };
})();