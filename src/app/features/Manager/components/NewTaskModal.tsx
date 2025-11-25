/**
 * New Task Modal Component
 * Modal for creating a new task with project and context selection
 */

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, FolderGit2, FolderTree } from 'lucide-react';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import { useContextStore } from '@/stores/contextStore';
import NewTaskInputPanel from './NewTaskInputPanel';

interface NewTaskModalProps {
    onClose: () => void;
    onRequirementCreated: (requirementName: string) => void;
}

export default function NewTaskModal({
    onClose,
    onRequirementCreated,
}: NewTaskModalProps) {
    const { projects, initializeProjects } = useProjectConfigStore();
    const { contexts, loadProjectData } = useContextStore();

    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const [selectedContextId, setSelectedContextId] = useState<string>('');

    // Secondary project for multiproject support
    const [selectedSecondaryProjectId, setSelectedSecondaryProjectId] = useState<string>('');
    const [selectedSecondaryContextId, setSelectedSecondaryContextId] = useState<string>('');
    const [secondaryContexts, setSecondaryContexts] = useState<any[]>([]);

    // Initialize projects on mount
    useEffect(() => {
        initializeProjects();
    }, []);

    // Load contexts when primary project changes
    useEffect(() => {
        if (selectedProjectId) {
            loadProjectData(selectedProjectId);
            setSelectedContextId(''); // Reset context selection
        }
    }, [selectedProjectId]);

    // Load contexts when secondary project changes
    useEffect(() => {
        const loadSecondaryContexts = async () => {
            if (selectedSecondaryProjectId) {
                try {
                    const response = await fetch(`/api/contexts?projectId=${selectedSecondaryProjectId}`);
                    if (response.ok) {
                        const data = await response.json();
                        setSecondaryContexts(data.data?.contexts || []);
                        setSelectedSecondaryContextId(''); // Reset context selection
                    }
                } catch (error) {
                    console.error('Failed to load secondary contexts:', error);
                    setSecondaryContexts([]);
                }
            } else {
                setSecondaryContexts([]);
                setSelectedSecondaryContextId('');
            }
        };
        loadSecondaryContexts();
    }, [selectedSecondaryProjectId]);

    const selectedProject = projects.find(p => p.id === selectedProjectId);
    const selectedSecondaryProject = projects.find(p => p.id === selectedSecondaryProjectId);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-4xl bg-gray-900 border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-500/10 overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="p-6 border-b border-gray-800 flex items-center justify-between bg-gray-900/50">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-1">Create New Task</h2>
                        <p className="text-sm text-gray-400">Propose a new feature or improvement without existing implementation</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Primary Project Selection */}
                    <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/50">
                        <h3 className="text-sm font-semibold text-gray-200 mb-3">Primary Project</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Project Selection */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                                    <FolderGit2 className="w-4 h-4 text-purple-400" />
                                    Select Project
                                </label>
                                <select
                                    value={selectedProjectId}
                                    onChange={(e) => setSelectedProjectId(e.target.value)}
                                    className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                                >
                                    <option value="">-- Choose a Project --</option>
                                    {projects.map((project) => (
                                        <option key={project.id} value={project.id}>
                                            {project.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Context Selection */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                                    <FolderTree className="w-4 h-4 text-blue-400" />
                                    Select Context (Optional)
                                </label>
                                <select
                                    value={selectedContextId}
                                    onChange={(e) => setSelectedContextId(e.target.value)}
                                    disabled={!selectedProjectId}
                                    className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-cyan-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <option value="">-- No Context --</option>
                                    {contexts.map((context) => (
                                        <option key={context.id} value={context.id}>
                                            {context.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Secondary Project Selection (Optional for multi-codebase projects) */}
                    <div className="bg-gray-800/20 rounded-xl p-4 border border-gray-700/30">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-gray-200">Secondary Project (Optional)</h3>
                            <span className="text-xs text-gray-400 italic">For separated frontend/backend projects</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Secondary Project Selection */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                                    <FolderGit2 className="w-4 h-4 text-green-400" />
                                    Select Secondary Project
                                </label>
                                <select
                                    value={selectedSecondaryProjectId}
                                    onChange={(e) => setSelectedSecondaryProjectId(e.target.value)}
                                    className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-green-500 transition-colors"
                                >
                                    <option value="">-- No Secondary Project --</option>
                                    {projects.filter(p => p.id !== selectedProjectId).map((project) => (
                                        <option key={project.id} value={project.id}>
                                            {project.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Secondary Context Selection */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                                    <FolderTree className="w-4 h-4 text-green-400" />
                                    Select Secondary Context (Optional)
                                </label>
                                <select
                                    value={selectedSecondaryContextId}
                                    onChange={(e) => setSelectedSecondaryContextId(e.target.value)}
                                    disabled={!selectedSecondaryProjectId}
                                    className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <option value="">-- No Context --</option>
                                    {secondaryContexts.map((context) => (
                                        <option key={context.id} value={context.id}>
                                            {context.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Input Panel */}
                    <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 overflow-hidden">
                        <NewTaskInputPanel
                            contextId={selectedContextId || undefined}
                            projectId={selectedProjectId || undefined}
                            projectPath={selectedProject?.path}
                            secondaryProjectId={selectedSecondaryProjectId || undefined}
                            secondaryContextId={selectedSecondaryContextId || undefined}
                            secondaryProjectPath={selectedSecondaryProject?.path}
                            onRequirementCreated={(name) => {
                                onRequirementCreated(name);
                                onClose();
                            }}
                        />
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
