/**
 * Hook for fetching real architecture data from the database
 * Replaces mock data in MatrixDiagramCanvas
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useServerProjectStore } from '@/stores/serverProjectStore';
import type { Project } from '@/types';
import type {
  WorkspaceProjectNode,
  CrossProjectRelationship,
  ProjectTier,
  FrameworkCategory,
  IntegrationType,
} from './types';
import type { DbCrossProjectRelationship, DbArchitectureAnalysisSession } from '@/app/db/models/cross-project-architecture.types';

// Map project type to tier
function getProjectTier(project: Project): ProjectTier {
  const type = project.type?.toLowerCase() || '';
  const name = project.name.toLowerCase();
  const path = project.path.toLowerCase();

  // Check for frontend indicators
  if (type.includes('frontend') || type.includes('next') || type.includes('react') || type.includes('vue')) {
    return 'frontend';
  }
  if (name.includes('web') || name.includes('dashboard') || name.includes('admin') || name.includes('portal')) {
    return 'frontend';
  }
  if (path.includes('frontend') || path.includes('client') || path.includes('web-app')) {
    return 'frontend';
  }

  // Check for external/infrastructure indicators
  if (type.includes('database') || type.includes('postgres') || type.includes('mysql') || type.includes('redis')) {
    return 'external';
  }
  if (name.includes('db') || name.includes('cache') || name.includes('storage') || name.includes('s3')) {
    return 'external';
  }

  // Check for shared library indicators
  if (type.includes('lib') || type.includes('shared') || type.includes('common')) {
    return 'shared';
  }
  if (name.includes('shared') || name.includes('common') || name.includes('utils')) {
    return 'shared';
  }

  // Default to backend
  return 'backend';
}

// Detect framework category from project
function getFrameworkCategory(project: Project): FrameworkCategory {
  const type = project.type?.toLowerCase() || '';
  const name = project.name.toLowerCase();

  if (type.includes('next') || name.includes('next')) return 'nextjs';
  if (type.includes('react') || name.includes('react')) return 'react';
  if (type.includes('vue') || name.includes('vue')) return 'vue';
  if (type.includes('python') || type.includes('fastapi') || type.includes('django')) return 'python';
  if (type.includes('go') || type.includes('golang')) return 'go';
  if (type.includes('java') || type.includes('spring')) return 'java';
  if (type.includes('postgres') || type.includes('mysql') || type.includes('database')) return 'database';
  if (type.includes('aws') || type.includes('gcp') || type.includes('azure')) return 'cloud';

  return 'node'; // Default for JS/TS projects
}

// Get color based on tier
function getTierColor(tier: ProjectTier): string {
  const colors: Record<ProjectTier, string> = {
    frontend: '#06b6d4',
    backend: '#8b5cf6',
    external: '#f59e0b',
    shared: '#10b981',
  };
  return colors[tier];
}

export interface ArchitectureData {
  projects: WorkspaceProjectNode[];
  relationships: CrossProjectRelationship[];
}

export interface ArchitectureAnalysisStatus {
  isAnalyzing: boolean;
  latestAnalysis: DbArchitectureAnalysisSession | null;
  history: DbArchitectureAnalysisSession[];
}

export interface UseArchitectureDataResult {
  data: ArchitectureData;
  loading: boolean;
  error: string | null;
  analysisStatus: ArchitectureAnalysisStatus;
  refresh: () => Promise<void>;
  triggerAnalysis: () => Promise<{ success: boolean; analysisId?: string; promptContent?: string; error?: string }>;
}

export function useArchitectureData(workspaceId: string | null): UseArchitectureDataResult {
  const { workspaceProjectMap, initialized: wsInitialized, syncWithServer: syncWorkspaces } = useWorkspaceStore();
  const { projects: allProjects, initialized: projectsInitialized, initializeProjects } = useServerProjectStore();

  const [relationships, setRelationships] = useState<CrossProjectRelationship[]>([]);
  const [analysisStatus, setAnalysisStatus] = useState<ArchitectureAnalysisStatus>({
    isAnalyzing: false,
    latestAnalysis: null,
    history: [],
  });
  const [branchInfo, setBranchInfo] = useState<Map<string, { branch: string | null; dirty: boolean }>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initAttempted, setInitAttempted] = useState(false);

  // Get projects for the current workspace
  const workspaceProjects = (() => {
    if (!workspaceId || workspaceId === 'default') {
      // Default workspace - show all unassigned projects or all projects
      const assignedIds = new Set(Object.values(workspaceProjectMap).flat());
      return allProjects.filter(p => !assignedIds.has(p.id));
    }
    const projectIds = workspaceProjectMap[workspaceId] || [];
    return allProjects.filter(p => projectIds.includes(p.id));
  })();

  // Pre-build connectionCount map in O(m) instead of O(n*m)
  const connectionCountMap = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of relationships) {
      counts.set(r.sourceProjectId, (counts.get(r.sourceProjectId) || 0) + 1);
      counts.set(r.targetProjectId, (counts.get(r.targetProjectId) || 0) + 1);
    }
    return counts;
  }, [relationships]);

  // Transform projects to WorkspaceProjectNode format (memoized to stabilize downstream Graph/Matrix)
  const projectNodes: WorkspaceProjectNode[] = useMemo(() =>
    workspaceProjects.map(project => {
      const tier = getProjectTier(project);
      const frameworkCategory = getFrameworkCategory(project);
      const gitInfo = branchInfo.get(project.id);

      return {
        id: project.id,
        name: project.name,
        path: project.path,
        tier,
        framework: project.type,
        frameworkCategory,
        description: project.description,
        branch: gitInfo?.branch || undefined,
        branchDirty: gitInfo?.dirty || false,
        x: 0,
        y: 0,
        width: 160,
        height: 60,
        contextGroupCount: 0,
        contextCount: 0,
        connectionCount: connectionCountMap.get(project.id) || 0,
        color: getTierColor(tier),
      };
    }),
  [workspaceProjects, connectionCountMap, branchInfo]);

  // Fetch relationships from API
  const fetchRelationships = useCallback(async () => {
    try {
      const wsParam = workspaceId === 'default' ? '' : (workspaceId || '');
      const response = await fetch(`/api/architecture/relationships?workspaceId=${wsParam}`);

      if (!response.ok) {
        throw new Error('Failed to fetch relationships');
      }

      const data = await response.json();
      const dbRelationships: DbCrossProjectRelationship[] = data.relationships || [];

      // Transform to CrossProjectRelationship format
      const transformed: CrossProjectRelationship[] = dbRelationships.map(r => ({
        id: r.id,
        sourceProjectId: r.source_project_id,
        targetProjectId: r.target_project_id,
        integrationType: r.integration_type as IntegrationType,
        label: r.label || '',
        protocol: r.protocol || undefined,
        dataFlow: r.data_flow || undefined,
        confidence: r.confidence,
      }));

      setRelationships(transformed);
    } catch (err) {
      console.error('Error fetching relationships:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch relationships');
    }
  }, [workspaceId]);

  // Fetch analysis status (returns isRunning so callers can act on it without a second fetch)
  const fetchAnalysisStatus = useCallback(async (): Promise<boolean> => {
    try {
      const wsParam = workspaceId === 'default' ? '' : (workspaceId || '');
      const response = await fetch(`/api/architecture/analyze?workspaceId=${wsParam}`);

      if (!response.ok) return false;

      const data = await response.json();
      setAnalysisStatus({
        isAnalyzing: data.isRunning || false,
        latestAnalysis: data.latest || null,
        history: data.history || [],
      });
      return data.isRunning || false;
    } catch (err) {
      console.error('Error fetching analysis status:', err);
      return false;
    }
  }, [workspaceId]);

  // Fetch git branches for all projects
  const fetchBranches = useCallback(async () => {
    if (workspaceProjects.length === 0) return;

    try {
      const response = await fetch('/api/git/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projects: workspaceProjects.map(p => ({
            id: p.id,
            path: p.path,
          })),
        }),
      });

      if (!response.ok) return;

      const data = await response.json();
      const newBranchInfo = new Map<string, { branch: string | null; dirty: boolean }>();

      for (const item of data.branches || []) {
        newBranchInfo.set(item.projectId, {
          branch: item.branch,
          dirty: item.dirty,
        });
      }

      setBranchInfo(newBranchInfo);
    } catch (err) {
      console.error('Error fetching git branches:', err);
    }
  }, [workspaceProjects]);

  // Combined refresh function
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchRelationships(), fetchAnalysisStatus(), fetchBranches()]);
    } finally {
      setLoading(false);
    }
  }, [fetchRelationships, fetchAnalysisStatus, fetchBranches]);

  // Trigger architecture analysis
  const triggerAnalysis = useCallback(async () => {
    const projectsToAnalyze = projectNodes.map(p => ({
      id: p.id,
      name: p.name,
      path: p.path,
      framework: p.framework,
      tier: p.tier,
    }));

    if (projectsToAnalyze.length === 0) {
      return { success: false, error: 'No projects to analyze' };
    }

    try {
      const response = await fetch('/api/architecture/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: 'workspace',
          workspaceId: workspaceId === 'default' ? null : workspaceId,
          projects: projectsToAnalyze,
          triggerType: 'manual',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Analysis failed' };
      }

      // Update status to show we're analyzing
      setAnalysisStatus(prev => ({ ...prev, isAnalyzing: true }));

      return {
        success: true,
        analysisId: data.analysisId,
        promptContent: data.promptContent,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to trigger analysis',
      };
    }
  }, [workspaceId, projectNodes]);

  // Initialize stores if needed and load data
  useEffect(() => {
    let mounted = true;

    const initAndLoad = async () => {
      // Try to initialize stores if not done
      if (!projectsInitialized && !initAttempted) {
        setInitAttempted(true);
        try {
          await initializeProjects();
        } catch (e) {
          console.error('Failed to initialize projects:', e);
        }
      }

      if (!wsInitialized && !initAttempted) {
        try {
          await syncWorkspaces();
        } catch (e) {
          console.error('Failed to sync workspaces:', e);
        }
      }

      // Give stores a moment to initialize, then proceed anyway
      // This prevents infinite loading if stores fail
      await new Promise(resolve => setTimeout(resolve, 500));

      if (mounted) {
        await refresh();
      }
    };

    initAndLoad();

    return () => {
      mounted = false;
    };
  }, [workspaceId]); // Only re-run on workspaceId change

  // Re-fetch when stores become initialized
  useEffect(() => {
    if ((wsInitialized || projectsInitialized) && !loading) {
      refresh();
    }
  }, [wsInitialized, projectsInitialized]);

  // Poll for analysis completion when analyzing
  useEffect(() => {
    if (!analysisStatus.isAnalyzing) return;

    let isPolling = false;
    const pollInterval = setInterval(async () => {
      if (isPolling) return;
      isPolling = true;
      try {
        const stillRunning = await fetchAnalysisStatus();
        // If no longer analyzing, refresh relationships too
        if (!stillRunning) {
          await fetchRelationships();
        }
      } finally {
        isPolling = false;
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [analysisStatus.isAnalyzing, workspaceId, fetchAnalysisStatus, fetchRelationships]);

  return {
    data: {
      projects: projectNodes,
      relationships,
    },
    loading,
    error,
    analysisStatus,
    refresh,
    triggerAnalysis,
  };
}

export default useArchitectureData;
