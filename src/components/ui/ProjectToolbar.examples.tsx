'use client';

import React, { useState } from 'react';
import ProjectToolbar, { ToolbarAction, defaultActions } from './ProjectToolbar';
import { Database, FileText, RefreshCw, Settings, Zap, Download } from 'lucide-react';

/**
 * Example 1: Basic toolbar with default actions
 */
export function BasicToolbarExample() {
  const handleDbSync = () => {
    // Sync database
  };

  const handleViewDocs = () => {
    // Open documentation
  };

  const handleRefresh = () => {
    // Refresh
  };

  const actions: ToolbarAction[] = [
    defaultActions.dbSync(handleDbSync),
    defaultActions.viewDocs(handleViewDocs),
    defaultActions.refresh(handleRefresh),
  ];

  return <ProjectToolbar actions={actions} position="top-center" styled />;
}

/**
 * Example 2: Custom actions with different color schemes
 */
export function CustomActionsExample() {
  const [isLoading, setIsLoading] = useState(false);

  const actions: ToolbarAction[] = [
    {
      icon: Database,
      label: 'Database operations',
      onClick: async () => {
        setIsLoading(true);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        setIsLoading(false);
        alert('Database synced!');
      },
      colorScheme: 'blue',
      tooltip: 'Sync database with latest changes',
      loading: isLoading,
    },
    {
      icon: FileText,
      label: 'Documentation',
      onClick: () => {
        window.open('/docs', '_blank');
      },
      colorScheme: 'cyan',
      tooltip: 'Open project documentation',
    },
    {
      icon: Settings,
      label: 'Settings',
      onClick: () => {
        // Open settings
      },
      colorScheme: 'purple',
      tooltip: 'Configure project settings',
    },
    {
      icon: Zap,
      label: 'Quick actions',
      onClick: () => {
        // Run quick actions
      },
      colorScheme: 'orange',
      tooltip: 'Execute quick actions',
    },
    {
      icon: Download,
      label: 'Export',
      onClick: () => {
        // Export data
      },
      colorScheme: 'green',
      tooltip: 'Export project data',
    },
  ];

  return <ProjectToolbar actions={actions} position="top-center" styled />;
}

/**
 * Example 3: Minimal toolbar without styling
 */
export function MinimalToolbarExample() {
  const actions: ToolbarAction[] = [
    {
      icon: RefreshCw,
      label: 'Refresh',
      onClick: () => {
        // Refresh
      },
      colorScheme: 'green',
    },
    {
      icon: Settings,
      label: 'Settings',
      onClick: () => {
        // Open settings
      },
      colorScheme: 'slate',
    },
  ];

  return <ProjectToolbar actions={actions} position="top-right" styled={false} />;
}

/**
 * Example 4: Toolbar with disabled and loading states
 */
export function StateManagementExample() {
  const [syncLoading, setSyncLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const handleSync = async () => {
    setSyncLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setSyncLoading(false);
  };

  const actions: ToolbarAction[] = [
    {
      icon: Database,
      label: 'Sync database',
      onClick: handleSync,
      colorScheme: 'blue',
      loading: syncLoading,
    },
    {
      icon: Download,
      label: 'Download',
      onClick: () => {
        // Download
      },
      colorScheme: 'green',
      disabled: isOffline,
      tooltip: isOffline ? 'Offline - download disabled' : 'Download data',
    },
    {
      icon: RefreshCw,
      label: 'Toggle offline mode',
      onClick: () => setIsOffline(!isOffline),
      colorScheme: isOffline ? 'orange' : 'cyan',
      tooltip: isOffline ? 'Go online' : 'Go offline',
    },
  ];

  return <ProjectToolbar actions={actions} position="top-center" styled />;
}

/**
 * Example 5: Integration with Ideas page
 */
export function IdeasPageToolbarExample() {
  const handleDbSync = async () => {
    // Sync ideas database
    const response = await fetch('/api/ideas/sync', { method: 'POST' });
    if (response.ok) {
      alert('Ideas synced successfully!');
    }
  };

  const handleViewDocs = () => {
    // Navigate to documentation for the ideas feature
    window.location.href = '/docs#ideas';
  };

  const handleExportIdeas = () => {
    // Export ideas to JSON
    fetch('/api/ideas/export')
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ideas-export.json';
        a.click();
      });
  };

  const actions: ToolbarAction[] = [
    defaultActions.dbSync(handleDbSync),
    defaultActions.viewDocs(handleViewDocs),
    {
      icon: Download,
      label: 'Export ideas',
      onClick: handleExportIdeas,
      colorScheme: 'purple',
      tooltip: 'Export all ideas to JSON',
    },
  ];

  return <ProjectToolbar actions={actions} position="top-center" styled />;
}
