'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Folder,
  FolderPlus,
  Loader2,
  Check,
  Square,
  CheckSquare,
  Play,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

interface FolderItem {
  name: string;
  path: string;
  selected: boolean;
}

interface BatchProjectOnboardingProps {
  workspaceId: string;
  workspaceName: string;
  basePath: string;
  onStartOnboarding: (prompt: string, folders: FolderItem[]) => void;
  onRefresh?: () => void;
}

// Detect project type based on folder contents
function detectProjectType(folderName: string): string {
  const name = folderName.toLowerCase();
  if (name.includes('server') || name.includes('api') || name.includes('backend')) return 'express';
  if (name.includes('engine') || name.includes('nlp') || name.includes('python') || name.includes('indexer')) return 'fastapi';
  if (name.includes('bubble') || name.includes('ui') || name.includes('frontend') || name.includes('web')) return 'react';
  if (name.includes('kubernetes') || name.includes('k8s') || name.includes('devops') || name.includes('infra')) return 'generic';
  if (name.includes('voice') || name.includes('connector')) return 'generic';
  if (name.includes('monorepo')) return 'combined';
  return 'generic';
}

// Generate unique port for project
function generatePort(index: number, projectType: string): number | null {
  const basePort = {
    'nextjs': 3000,
    'react': 3100,
    'express': 4000,
    'fastapi': 8000,
    'django': 8080,
    'generic': 5000,
    'combined': null,
    'rails': 3000,
  }[projectType] || 5000;

  if (basePort === null) return null;
  return basePort + index * 10;
}

export default function BatchProjectOnboarding({
  workspaceId,
  workspaceName,
  basePath,
  onStartOnboarding,
  onRefresh,
}: BatchProjectOnboardingProps) {
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load folders from base path
  const loadFolders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/disk/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'directories', path: basePath }),
      });

      const data = await response.json();
      if (data.success && data.directories) {
        setFolders(
          data.directories.map((dir: { name: string; path: string }) => ({
            name: dir.name,
            path: dir.path,
            selected: true, // All selected by default
          }))
        );
      } else {
        setError('Failed to load directories');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load directories');
    } finally {
      setLoading(false);
    }
  }, [basePath]);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  const toggleFolder = (path: string) => {
    setFolders(prev =>
      prev.map(f => (f.path === path ? { ...f, selected: !f.selected } : f))
    );
  };

  const toggleAll = () => {
    const allSelected = folders.every(f => f.selected);
    setFolders(prev => prev.map(f => ({ ...f, selected: !allSelected })));
  };

  const selectedCount = folders.filter(f => f.selected).length;

  // Build the prompt for Claude Code to add projects
  const buildOnboardingPrompt = () => {
    const selectedFolders = folders.filter(f => f.selected);

    // Build project list for the prompt
    const projectList = selectedFolders.map((folder, index) => {
      const projectType = detectProjectType(folder.name);
      const port = generatePort(index, projectType);
      // Generate a simple ID from folder name
      const projectId = `proj_${folder.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      // Choose run script based on type
      const runScript = projectType === 'fastapi' ? 'uvicorn main:app --reload' :
                        projectType === 'generic' ? 'echo "no dev script"' :
                        'npm run dev';
      return {
        id: projectId,
        name: folder.name,
        path: folder.path.replace(/\\/g, '/'), // Use forward slashes for JSON
        type: projectType,
        port,
        runScript,
      };
    });

    // Build curl commands for each project
    const curlCommands = projectList.map((p) => {
      const portField = p.port !== null ? `"port": ${p.port},` : '';
      return `curl -s -X POST http://localhost:3000/api/projects \\
  -H "Content-Type: application/json" \\
  --data-raw '{"id": "${p.id}", "name": "${p.name}", "path": "${p.path}", ${portField} "type": "${p.type}", "workspaceId": "${workspaceId}", "run_script": "${p.runScript}"}'`;
    }).join('\n\n');

    // Build the projectIds array for workspace mapping
    const projectIds = projectList.map(p => `"${p.id}"`).join(', ');

    const prompt = `# Batch Project Onboarding Task

You need to add ${selectedFolders.length} projects to the Vibeman database for workspace "${workspaceName}" (ID: ${workspaceId}).

## Step 1: Add Each Project

Run these curl commands to add each project:

${curlCommands}

## Step 2: Map Projects to Workspace

After all projects are added, map them to the workspace:

\`\`\`bash
curl -s -X PUT http://localhost:3000/api/workspaces/projects \\
  -H "Content-Type: application/json" \\
  --data-raw '{"workspaceId": "${workspaceId}", "projectIds": [${projectIds}]}'
\`\`\`

## Step 3: Verify

Verify the workspace now has the projects:

\`\`\`bash
curl -s http://localhost:3000/api/workspaces | grep -A5 '"name":"${workspaceName}"'
\`\`\`

## Project Summary

| # | Name | Type | Port | Path |
|---|------|------|------|------|
${projectList.map((p, i) => `| ${i + 1} | ${p.name} | ${p.type} | ${p.port ?? 'N/A'} | ${p.path} |`).join('\n')}

Execute these commands in order. Each curl command should return a success response.`;

    return prompt;
  };

  const handleStartOnboarding = () => {
    const prompt = buildOnboardingPrompt();
    const selectedFolders = folders.filter(f => f.selected);
    onStartOnboarding(prompt, selectedFolders);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
        <span className="text-sm text-zinc-500">Scanning folders...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-6">
        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-red-400" />
        </div>
        <div className="text-center">
          <p className="text-sm text-zinc-400 mb-2">{error}</p>
          <button
            onClick={loadFolders}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (folders.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <Folder className="w-8 h-8 text-zinc-600" />
        <p className="text-sm text-zinc-500">No folders found in {basePath}</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FolderPlus className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-medium text-zinc-300">
            Add Projects from {workspaceName}
          </span>
        </div>
        <button
          onClick={toggleAll}
          className="flex items-center gap-1 px-2 py-1 text-[10px] text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors"
        >
          {folders.every(f => f.selected) ? (
            <>
              <Square className="w-3 h-3" />
              Deselect All
            </>
          ) : (
            <>
              <CheckSquare className="w-3 h-3" />
              Select All
            </>
          )}
        </button>
      </div>

      {/* Base path info */}
      <div className="text-[10px] text-zinc-600 font-mono mb-2 truncate">
        {basePath}
      </div>

      {/* Folder list */}
      <div className="max-h-64 overflow-y-auto custom-scrollbar bg-zinc-900/50 rounded-lg border border-zinc-800 mb-4">
        <AnimatePresence initial={false}>
          {folders.map((folder, index) => (
            <motion.div
              key={folder.path}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02 }}
              className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${
                folder.selected
                  ? 'bg-cyan-500/10 border-l-2 border-cyan-400'
                  : 'hover:bg-zinc-800/50 border-l-2 border-transparent'
              }`}
              onClick={() => toggleFolder(folder.path)}
            >
              <div
                className={`w-4 h-4 rounded flex items-center justify-center ${
                  folder.selected
                    ? 'bg-cyan-500 text-white'
                    : 'bg-zinc-700 text-zinc-500'
                }`}
              >
                {folder.selected && <Check className="w-3 h-3" />}
              </div>
              <Folder
                className={`w-4 h-4 ${
                  folder.selected ? 'text-cyan-400' : 'text-zinc-500'
                }`}
              />
              <div className="flex-1 min-w-0">
                <span
                  className={`text-sm ${
                    folder.selected ? 'text-zinc-200' : 'text-zinc-400'
                  }`}
                >
                  {folder.name}
                </span>
                <span className="ml-2 text-[10px] text-zinc-600">
                  {detectProjectType(folder.name)}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Action button */}
      <button
        onClick={handleStartOnboarding}
        disabled={selectedCount === 0}
        className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
          selectedCount > 0
            ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/30'
            : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
        }`}
      >
        <Play className="w-4 h-4" />
        Add {selectedCount} Project{selectedCount !== 1 ? 's' : ''} via Claude Code
      </button>

      <p className="text-[10px] text-zinc-600 text-center mt-2">
        Claude Code will create project entries in the database
      </p>
    </div>
  );
}
