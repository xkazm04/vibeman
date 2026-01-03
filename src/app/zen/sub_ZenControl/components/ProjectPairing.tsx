'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderOpen,
  Link2,
  Unlink,
  RefreshCw,
  ArrowRight,
  Trash2,
  Monitor,
} from 'lucide-react';
import type { Project } from '@/types';
import type { DbDeviceSession } from '@/lib/supabase/realtimeTypes';

interface ProjectLink {
  id: string;
  localProjectId: string;
  localProjectName: string;
  remoteProjectId: string;
  remoteProjectName: string;
  remoteDeviceId: string;
  remoteDeviceName: string;
  createdAt: string;
}

interface ProjectPairingProps {
  isConnected: boolean;
  isPaired: boolean;
  partnerId: string | null;
  partnerName: string | null;
  selectedDeviceId: string | null;
  devices: DbDeviceSession[];
  currentProjectId: string | null;
}

export default function ProjectPairing({
  isConnected,
  isPaired,
  partnerId,
  partnerName,
  selectedDeviceId,
  devices,
  currentProjectId,
}: ProjectPairingProps) {
  const [localProjects, setLocalProjects] = useState<Project[]>([]);
  const [remoteProjects, setRemoteProjects] = useState<Project[]>([]);
  const [linkedProjects, setLinkedProjects] = useState<ProjectLink[]>([]);
  const [isLoadingLocal, setIsLoadingLocal] = useState(false);
  const [isLoadingRemote, setIsLoadingRemote] = useState(false);
  const [selectedLocalId, setSelectedLocalId] = useState<string | null>(null);
  const [selectedRemoteId, setSelectedRemoteId] = useState<string | null>(null);

  // Determine which device to use for remote projects
  const targetDeviceId = isPaired ? partnerId : selectedDeviceId;
  const targetDevice = devices.find((d) => d.device_id === targetDeviceId);

  // Fetch local projects from SQLite
  const fetchLocalProjects = useCallback(async () => {
    setIsLoadingLocal(true);
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        setLocalProjects(data.projects || data || []);
      }
    } catch (err) {
      console.error('Failed to fetch local projects:', err);
    } finally {
      setIsLoadingLocal(false);
    }
  }, []);

  // Fetch remote projects from selected/paired device
  const fetchRemoteProjects = useCallback(async () => {
    if (!targetDeviceId) {
      setRemoteProjects([]);
      return;
    }

    setIsLoadingRemote(true);
    try {
      const response = await fetch(
        `/api/bridge/realtime/projects?partnerId=${targetDeviceId}`
      );
      if (response.ok) {
        const data = await response.json();
        setRemoteProjects(data.projects || []);
      }
    } catch (err) {
      console.error('Failed to fetch remote projects:', err);
    } finally {
      setIsLoadingRemote(false);
    }
  }, [targetDeviceId]);

  // Load local projects on mount
  useEffect(() => {
    fetchLocalProjects();
  }, [fetchLocalProjects]);

  // Fetch remote projects when target device changes
  useEffect(() => {
    fetchRemoteProjects();
  }, [fetchRemoteProjects]);

  // Load linked projects from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('vibeman-project-links');
      if (stored) {
        setLinkedProjects(JSON.parse(stored));
      }
    } catch {
      // Ignore
    }
  }, []);

  // Save linked projects to localStorage
  const saveLinks = (links: ProjectLink[]) => {
    setLinkedProjects(links);
    localStorage.setItem('vibeman-project-links', JSON.stringify(links));
  };

  // Link two projects
  const handleLinkProjects = () => {
    if (!selectedLocalId || !selectedRemoteId || !targetDeviceId) return;

    const localProject = localProjects.find((p) => p.id === selectedLocalId);
    const remoteProject = remoteProjects.find((p) => p.id === selectedRemoteId);
    if (!localProject || !remoteProject) return;

    // Check if already linked
    if (
      linkedProjects.some(
        (l) =>
          l.localProjectId === selectedLocalId &&
          l.remoteDeviceId === targetDeviceId
      )
    ) {
      return;
    }

    const newLink: ProjectLink = {
      id: `${selectedLocalId}-${selectedRemoteId}-${Date.now()}`,
      localProjectId: selectedLocalId,
      localProjectName: localProject.name,
      remoteProjectId: selectedRemoteId,
      remoteProjectName: remoteProject.name,
      remoteDeviceId: targetDeviceId,
      remoteDeviceName: targetDevice?.device_name || 'Remote Device',
      createdAt: new Date().toISOString(),
    };

    saveLinks([...linkedProjects, newLink]);

    // Reset selection
    setSelectedLocalId(null);
    setSelectedRemoteId(null);
  };

  // Unlink projects
  const handleUnlinkProjects = (linkId: string) => {
    const newLinks = linkedProjects.filter((l) => l.id !== linkId);
    saveLinks(newLinks);
  };

  // Check if local project is linked to current target device
  const isLocalLinked = (localId: string) =>
    linkedProjects.some(
      (l) =>
        l.localProjectId === localId && l.remoteDeviceId === targetDeviceId
    );

  // Check if remote project is linked from current target device
  const isRemoteLinked = (remoteId: string) =>
    linkedProjects.some(
      (l) =>
        l.remoteProjectId === remoteId && l.remoteDeviceId === targetDeviceId
    );

  // Filter links for current target device
  const relevantLinks = linkedProjects.filter(
    (l) => l.remoteDeviceId === targetDeviceId
  );

  if (!isConnected) {
    return null;
  }

  // No device selected and not paired
  if (!targetDeviceId) {
    return (
      <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <FolderOpen className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-gray-300">
            Project Pairing
          </span>
        </div>
        <p className="text-xs text-gray-500">
          Select a device above to pair projects for task offloading
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700/50 bg-gray-800/50">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-xs font-medium text-gray-300">
            Project Pairing
          </span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-gray-500">
          <Monitor className="w-3 h-3" />
          <span className="truncate max-w-24">
            {targetDevice?.device_name || 'Device'}
          </span>
        </div>
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-2 divide-x divide-gray-700/50">
        {/* Local Projects Column */}
        <div className="p-2">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[10px] uppercase font-medium text-gray-500 tracking-wider">
              Local
            </span>
            <button
              onClick={fetchLocalProjects}
              disabled={isLoadingLocal}
              className="p-0.5 hover:bg-gray-700/50 rounded transition-colors"
            >
              <RefreshCw
                className={`w-2.5 h-2.5 text-gray-600 ${
                  isLoadingLocal ? 'animate-spin' : ''
                }`}
              />
            </button>
          </div>
          <div className="space-y-0.5 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700">
            {isLoadingLocal ? (
              <div className="text-[10px] text-gray-600 py-2 text-center">
                Loading...
              </div>
            ) : localProjects.length === 0 ? (
              <div className="text-[10px] text-gray-600 py-2 text-center">
                No projects
              </div>
            ) : (
              localProjects.map((project) => {
                const linked = isLocalLinked(project.id);
                const isSelected = selectedLocalId === project.id;
                const isCurrent = project.id === currentProjectId;
                return (
                  <button
                    key={project.id}
                    onClick={() =>
                      !linked &&
                      setSelectedLocalId(isSelected ? null : project.id)
                    }
                    disabled={linked}
                    className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-left text-[11px] transition-colors ${
                      isSelected
                        ? 'bg-purple-500/20 text-purple-300'
                        : linked
                        ? 'bg-green-500/10 text-green-400 cursor-default'
                        : 'hover:bg-gray-700/50 text-gray-400'
                    }`}
                  >
                    <div
                      className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        linked ? 'bg-green-400' : 'bg-gray-600'
                      }`}
                    />
                    <span className="truncate flex-1">{project.name}</span>
                    {isCurrent && (
                      <span className="text-[8px] px-1 bg-cyan-500/20 text-cyan-400 rounded">
                        Active
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Remote Projects Column */}
        <div className="p-2">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[10px] uppercase font-medium text-gray-500 tracking-wider">
              Remote
            </span>
            <button
              onClick={fetchRemoteProjects}
              disabled={isLoadingRemote}
              className="p-0.5 hover:bg-gray-700/50 rounded transition-colors"
            >
              <RefreshCw
                className={`w-2.5 h-2.5 text-gray-600 ${
                  isLoadingRemote ? 'animate-spin' : ''
                }`}
              />
            </button>
          </div>
          <div className="space-y-0.5 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700">
            {isLoadingRemote ? (
              <div className="text-[10px] text-gray-600 py-2 text-center">
                Loading...
              </div>
            ) : remoteProjects.length === 0 ? (
              <div className="text-[10px] text-gray-600 py-2 text-center">
                No projects
              </div>
            ) : (
              remoteProjects.map((project) => {
                const linked = isRemoteLinked(project.id);
                const isSelected = selectedRemoteId === project.id;
                return (
                  <button
                    key={project.id}
                    onClick={() =>
                      !linked &&
                      setSelectedRemoteId(isSelected ? null : project.id)
                    }
                    disabled={linked}
                    className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-left text-[11px] transition-colors ${
                      isSelected
                        ? 'bg-purple-500/20 text-purple-300'
                        : linked
                        ? 'bg-green-500/10 text-green-400 cursor-default'
                        : 'hover:bg-gray-700/50 text-gray-400'
                    }`}
                  >
                    <div
                      className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        linked ? 'bg-green-400' : 'bg-gray-600'
                      }`}
                    />
                    <span className="truncate flex-1">{project.name}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Link button */}
      {selectedLocalId && selectedRemoteId && (
        <div className="px-3 py-2 border-t border-gray-700/50 bg-gray-800/30">
          <button
            onClick={handleLinkProjects}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-lg text-xs text-purple-300 transition-colors"
          >
            <Link2 className="w-3.5 h-3.5" />
            Link Projects
          </button>
        </div>
      )}

      {/* Paired Projects List */}
      {relevantLinks.length > 0 && (
        <div className="border-t border-gray-700/50">
          <div className="px-3 py-2 bg-gray-800/50">
            <span className="text-[10px] uppercase font-medium text-gray-500 tracking-wider">
              Paired Projects ({relevantLinks.length})
            </span>
          </div>
          <div className="p-2 space-y-1">
            <AnimatePresence>
              {relevantLinks.map((link) => (
                <motion.div
                  key={link.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 px-2 py-1.5 bg-green-500/5 border border-green-500/20 rounded text-[11px]"
                >
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full flex-shrink-0" />
                  <span className="text-gray-400 truncate flex-1">
                    {link.localProjectName}
                  </span>
                  <ArrowRight className="w-3 h-3 text-gray-600 flex-shrink-0" />
                  <span className="text-gray-400 truncate flex-1">
                    {link.remoteProjectName}
                  </span>
                  <button
                    onClick={() => handleUnlinkProjects(link.id)}
                    className="p-0.5 hover:bg-red-500/20 rounded transition-colors group"
                    title="Remove pairing"
                  >
                    <Trash2 className="w-3 h-3 text-gray-600 group-hover:text-red-400" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
