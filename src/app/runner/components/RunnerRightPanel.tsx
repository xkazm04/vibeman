'use client';

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Book,
    Code,
    GitBranch,
    Mic,
    Sparkles,
    Zap,
    Brain,
    Loader2,
    Power,
    Activity,
    Settings
} from "lucide-react";
import { useServerProjectStore } from '@/stores/serverProjectStore';

interface ProjectOverviewItem {
    id: string;
    name: string;
    path: string;
    port: number;
    type: string;
    git?: {
        repository: string;
        branch: string;
    };
}

interface AnnetteState {
    isActive: boolean;
    selectedProject: ProjectOverviewItem | null;
    isProcessing: boolean;
    lastResponse: string;
}

const RunnerRightPanel = ({ 
  onAnnetteInteraction
}: { 
  onAnnetteInteraction?: (project: ProjectOverviewItem, message: string) => void;
}) => {
    const [projects, setProjects] = useState<ProjectOverviewItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedProject, setSelectedProject] = useState<ProjectOverviewItem | null>(null);
    const [annetteState, setAnnetteState] = useState<AnnetteState>({
        isActive: false,
        selectedProject: null,
        isProcessing: false,
        lastResponse: ''
    });
    const [hoveredProject, setHoveredProject] = useState<string | null>(null);
    
    // Server management
    const { processes, startServer, stopServer } = useServerProjectStore();
    const [serverLoading, setServerLoading] = useState<Record<string, boolean>>({});

    // Fetch projects from API
    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const response = await fetch('/api/projects');
                if (response.ok) {
                    const data = await response.json();
                    setProjects(data.projects || []);
                    // Auto-select first project if available
                    if (data.projects && data.projects.length > 0) {
                        setSelectedProject(data.projects[0]);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch projects:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchProjects();
    }, []);

    const handleProjectSelect = (project: ProjectOverviewItem) => {
        setSelectedProject(project);
        setAnnetteState(prev => ({ ...prev, selectedProject: project }));
    };

    const handleAnnetteSpeak = async (project: ProjectOverviewItem) => {
        if (annetteState.isProcessing) return;

        setAnnetteState(prev => ({
            ...prev,
            isActive: true,
            isProcessing: true,
            selectedProject: project
        }));

        // Simulate Annette interaction
        const testMessage = "Give me a comprehensive overview of this project";

        if (onAnnetteInteraction) {
            onAnnetteInteraction(project, testMessage);
        }

        // Simulate processing delay
        setTimeout(() => {
            setAnnetteState(prev => ({
                ...prev,
                isProcessing: false,
                lastResponse: `I've analyzed ${project.name} and found interesting insights about its structure and goals.`
            }));
        }, 3000);
    };

    const getProjectTypeColor = (type: string) => {
        switch (type) {
            case 'nextjs':
                return 'from-blue-500/20 to-cyan-500/20 border-blue-500/30';
            case 'fastapi':
                return 'from-green-500/20 to-emerald-500/20 border-green-500/30';
            default:
                return 'from-blue-500/20 to-red-500/20 border-blue-500/30';
        }
    };

    const handleServerToggle = async (projectId: string) => {
        const status = processes[projectId];
        const isRunning = status?.status === 'running';
        const hasError = status?.status === 'error';
        
        setServerLoading(prev => ({ ...prev, [projectId]: true }));

        try {
            if (isRunning) {
                await stopServer(projectId);
            } else if (hasError) {
                // Force stop/clear error state
                const res = await fetch('/api/server/stop', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ projectId, force: true }),
                });
                
                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error);
                }
            } else {
                await startServer(projectId);
            }
        } catch (error) {
            console.error('Server toggle error:', error);
        } finally {
            setServerLoading(prev => ({ ...prev, [projectId]: false }));
        }
    };

    const getServerStatus = (projectId: string) => {
        const status = processes[projectId];
        const isRunning = status?.status === 'running';
        const hasError = status?.status === 'error';
        const isStopping = status?.status === 'stopping';
        const isLoading = serverLoading[projectId];
        
        return { isRunning, hasError, isStopping, isLoading, status };
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-gradient-to-br from-gray-900/95 via-indigo-900/20 to-purple-900/30 backdrop-blur-xl border border-gray-700/50 rounded-2xl min-w-[320px] max-w-[380px] overflow-hidden shadow-2xl"
        >
            {/* Neural Background Effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-indigo-500/5 to-purple-500/5 rounded-2xl" />
            
            {/* Animated Grid Pattern */}
            <motion.div
                className="absolute inset-0 opacity-5 rounded-2xl"
                style={{
                    backgroundImage: `
                        linear-gradient(rgba(99, 102, 241, 0.3) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(99, 102, 241, 0.3) 1px, transparent 1px)
                    `,
                    backgroundSize: '15px 15px'
                }}
                animate={{
                    backgroundPosition: ['0px 0px', '15px 15px'],
                }}
                transition={{
                    duration: 15,
                    repeat: Infinity,
                    ease: "linear"
                }}
            />
            
            {/* Floating Particles */}
            {Array.from({ length: 4 }).map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute w-1 h-1 bg-cyan-400/40 rounded-full"
                    style={{
                        left: `${15 + i * 25}%`,
                        top: `${20 + i * 20}%`,
                    }}
                    animate={{
                        y: [0, -20, 0],
                        opacity: [0, 1, 0],
                        scale: [0, 1, 0],
                    }}
                    transition={{
                        duration: 3 + Math.random() * 2,
                        repeat: Infinity,
                        delay: i * 0.5,
                    }}
                />
            ))}
            {/* Minimal Decorative Header */}
            <motion.div
                className="relative p-2 bg-gradient-to-r from-gray-800/20 via-indigo-900/10 to-gray-800/20 border-b border-gray-700/30"
            >
                <div className="flex items-center justify-center">
                    <motion.div
                        className="w-6 h-6 bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 rounded-lg flex items-center justify-center"
                        animate={{
                            boxShadow: ['0 0 0 rgba(6, 182, 212, 0)', '0 0 10px rgba(6, 182, 212, 0.3)', '0 0 0 rgba(6, 182, 212, 0)']
                        }}
                        transition={{ duration: 3, repeat: Infinity }}
                    >
                        <Sparkles className="w-3 h-3 text-cyan-400" />
                    </motion.div>
                </div>
            </motion.div>

            {/* Compact Project List */}
            <div className="p-1">
                <div className="max-h-[400px] overflow-y-auto">
                    <AnimatePresence>
                        {loading ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex items-center justify-center p-4"
                            >
                                <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                                <span className="ml-2 text-xs text-gray-400">Loading...</span>
                            </motion.div>
                        ) : projects.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-center p-4 text-gray-400"
                            >
                                <Code className="w-6 h-6 mx-auto mb-1 opacity-50" />
                                <p className="text-xs">No projects found</p>
                            </motion.div>
                        ) : (
                            projects.map((project, index) => (
                                <motion.div
                                    key={project.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    onHoverStart={() => setHoveredProject(project.id)}
                                    onHoverEnd={() => setHoveredProject(null)}
                                    onClick={() => handleProjectSelect(project)}
                                    className={`
                          relative group cursor-pointer rounded-lg p-1 border transition-all duration-200
                          ${selectedProject?.id === project.id
                                            ? `bg-gradient-to-r ${getProjectTypeColor(project.type)} shadow-md`
                                            : 'bg-gray-800/30 border-gray-700/50 hover:bg-gray-700/30 hover:border-gray-600/50'
                                        }
                        `}
                                >
                                    <div className="flex items-center justify-between p-2">
                                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                                            {/* Server Status Lever */}
                                            {(() => {
                                                const { isRunning, hasError, isStopping, isLoading } = getServerStatus(project.id);
                                                return (
                                                    <motion.button
                                                        whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleServerToggle(project.id);
                                                        }}
                                                        disabled={isLoading || isStopping}
                                                        className="relative cursor-pointer w-4 h-8 bg-gray-800 rounded-full border border-gray-600 focus:outline-none disabled:opacity-50"
                                                        title={isStopping ? 'Stopping Server...' : hasError ? 'Clear Error State' : isRunning ? 'Stop Server' : 'Start Server'}
                                                    >
                                                        {/* Lever Track */}
                                                        <div className="absolute inset-0.5 bg-gray-900 rounded-full">
                                                            {/* Lever Handle */}
                                                            <motion.div
                                                                animate={{ y: isRunning ? 12 : 0 }}
                                                                transition={{ type: "spring", stiffness: 300, damping: 25, duration: 0.3 }}
                                                                className="relative w-3 h-3 mx-auto"
                                                            >
                                                                {/* Main Circle */}
                                                                <div
                                                                    className={`w-3 h-3 rounded-full border transition-all duration-300 ${
                                                                        isStopping || isLoading
                                                                            ? 'bg-yellow-500 border-yellow-400 shadow-lg shadow-yellow-500/40'
                                                                            : hasError
                                                                            ? 'bg-orange-500 border-orange-400 shadow-lg shadow-orange-500/40'
                                                                            : isRunning
                                                                            ? 'bg-green-500 border-green-400 shadow-lg shadow-green-500/40'
                                                                            : 'bg-red-500 border-red-400 shadow-lg shadow-red-500/40'
                                                                    }`}
                                                                >
                                                                    {/* Loading Spinner */}
                                                                    {(isLoading || isStopping) && (
                                                                        <motion.div
                                                                            animate={{ rotate: 360 }}
                                                                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                                                            className="absolute inset-0.5 border border-white border-t-transparent rounded-full"
                                                                        />
                                                                    )}
                                                                </div>
                                                            </motion.div>
                                                        </div>
                                                    </motion.button>
                                                );
                                            })()}

                                            <div className="flex-1 min-w-0">
                                                <h5 className="text-sm text-white font-medium truncate font-mono">{project.name}</h5>
                                                <div className="flex items-center space-x-2 text-xs text-gray-400 font-mono">
                                                    <span>:{project.port}</span>
                                                    {(() => {
                                                        const { isRunning, status } = getServerStatus(project.id);
                                                        if (isRunning && status?.startTime) {
                                                            const uptime = Math.floor((Date.now() - new Date(status.startTime).getTime()) / 1000);
                                                            return <span>• {uptime}s</span>;
                                                        }
                                                        return null;
                                                    })()}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-1 ml-2">
                                            {/* Compact Action Buttons - Only show on hover or selection */}
                                            <AnimatePresence>
                                                {(hoveredProject === project.id || selectedProject?.id === project.id) && (
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0.8 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.8 }}
                                                        className="flex items-center space-x-1"
                                                    >
                                                        <motion.button
                                                            whileHover={{ scale: 1.1 }}
                                                            whileTap={{ scale: 0.9 }}
                                                            className="p-1 bg-blue-500/20 hover:bg-blue-500/30 rounded transition-colors"
                                                            title="Documentation"
                                                        >
                                                            <Book className="w-3 h-3 text-blue-400" />
                                                        </motion.button>

                                                        <motion.button
                                                            whileHover={{ scale: 1.1 }}
                                                            whileTap={{ scale: 0.9 }}
                                                            className="p-1 bg-green-500/20 hover:bg-green-500/30 rounded transition-colors"
                                                            title="Code Analysis"
                                                        >
                                                            <Code className="w-3 h-3 text-green-400" />
                                                        </motion.button>

                                                        <motion.button
                                                            whileHover={{ scale: 1.1 }}
                                                            whileTap={{ scale: 0.9 }}
                                                            className="p-1 bg-blue-500/20 hover:bg-blue-500/30 rounded transition-colors"
                                                            title="Git Status"
                                                        >
                                                            <GitBranch className="w-3 h-3 text-blue-400" />
                                                        </motion.button>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            {/* Annette Speak Button */}
                                            <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleAnnetteSpeak(project);
                                                }}
                                                disabled={annetteState.isProcessing}
                                                className={`
                                relative p-1.5 rounded-lg transition-all duration-200
                                ${annetteState.selectedProject?.id === project.id && annetteState.isProcessing
                                                        ? 'bg-yellow-500/20 border border-yellow-500/30'
                                                        : 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 hover:from-indigo-500/30 hover:to-purple-500/30'
                                                    }
                              `}
                                                title="Ask Annette"
                                            >
                                                <motion.div
                                                    animate={{
                                                        rotate: annetteState.selectedProject?.id === project.id && annetteState.isProcessing ? 360 : 0
                                                    }}
                                                    transition={{ duration: 2, repeat: annetteState.selectedProject?.id === project.id && annetteState.isProcessing ? Infinity : 0, ease: "linear" }}
                                                >
                                                    {annetteState.selectedProject?.id === project.id && annetteState.isProcessing ? (
                                                        <Loader2 className="w-3 h-3 text-yellow-400" />
                                                    ) : (
                                                        <Mic className="w-3 h-3 text-indigo-400" />
                                                    )}
                                                </motion.div>
                                            </motion.button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Compact Annette Response Display */}
            <AnimatePresence>
                {annetteState.lastResponse && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="border-t border-gray-700/50 p-3 bg-gradient-to-r from-slate-900/20 to-blue-900/20"
                    >
                        <div className="flex items-start space-x-2">
                            <Sparkles className="w-3 h-3 text-slate-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-300 leading-relaxed">
                                    {annetteState.lastResponse}
                                </p>
                                <button
                                    onClick={() => setAnnetteState(prev => ({ ...prev, lastResponse: '' }))}
                                    className="text-xs text-gray-500 hover:text-gray-400 mt-1"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

export default RunnerRightPanel;
