'use client';

import React from 'react';
import { Folder } from 'lucide-react';
import ScreenGallery from './ScreenGallery';

interface ScreenCatalogProps {
  projectId: string | null;
}

export default function ScreenCatalog({ projectId }: ScreenCatalogProps) {
  if (!projectId) {
    return (
      <div
        className="h-full flex items-center justify-center"
        data-testid="screen-catalog-no-project"
      >
        <div className="text-center p-6">
          <Folder className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No project selected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" data-testid="screen-catalog">
      <ScreenGallery projectId={projectId} />
    </div>
  );
}
