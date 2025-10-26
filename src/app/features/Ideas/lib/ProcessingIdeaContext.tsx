'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface ProcessingIdeaContextType {
  processingIdeaId: string | null;
  setProcessingIdeaId: (ideaId: string | null) => void;
}

const ProcessingIdeaContext = createContext<ProcessingIdeaContextType | undefined>(undefined);

export function ProcessingIdeaProvider({ children }: { children: React.ReactNode }) {
  const [processingIdeaId, setProcessingIdeaId] = useState<string | null>(null);

  return (
    <ProcessingIdeaContext.Provider value={{ processingIdeaId, setProcessingIdeaId }}>
      {children}
    </ProcessingIdeaContext.Provider>
  );
}

export function useProcessingIdea() {
  const context = useContext(ProcessingIdeaContext);
  if (!context) {
    throw new Error('useProcessingIdea must be used within ProcessingIdeaProvider');
  }
  return context;
}
