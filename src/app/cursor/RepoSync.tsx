'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Database, Loader2, Brain, Server } from 'lucide-react';

// Import modular components
import SyncStatusCard from './RepoSync/SyncStatusCard';
import SyncControls from './RepoSync/SyncControls';
import SyncRepoList from './RepoSync/SyncRepoList';

// Import types and utilities
import { Repository, SyncStatus, HealthStatus, SyncResult } from './RepoSync/types';
import { containerVariants, itemVariants, pulseVariants } from './RepoSync/variants';
import {
    checkHealthAPI,
    loadRepositoriesAPI,
    startSyncAPI,
    syncAllRepositoriesAPI,
    createPollingFunction
} from './RepoSync/functions';

export default function RepositorySync() {
    const [repositories, setRepositories] = useState<Repository[]>([]);
    const [syncStatuses, setSyncStatuses] = useState<Map<string, SyncStatus>>(new Map());
    const [activeSyncs, setActiveSyncs] = useState<Set<string>>(new Set());
    const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
    const [isInitializing, setIsInitializing] = useState(true);
    const [isHealthLoading, setIsHealthLoading] = useState(false);
    const [healthError, setHealthError] = useState<string | null>(null);
    const [repoError, setRepoError] = useState<string | null>(null);

    useEffect(() => {
        checkHealth();
        loadRepositories();
    }, []);

    const checkHealth = useCallback(async () => {
        setIsHealthLoading(true);
        setHealthError(null);
        try {
            const data = await checkHealthAPI();
            setHealthStatus(data);
        } catch (error) {
            console.error('Health check failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to connect to API';
            setHealthError(errorMessage);
            setHealthStatus({
                status: 'error',
                qdrant_connected: false,
                openai_configured: false,
                qdrant_configured: false,
                timestamp: new Date().toISOString()
            });
        } finally {
            setIsHealthLoading(false);
        }
    }, []);

    const loadRepositories = useCallback(async () => {
        setRepoError(null);
        try {
            const data = await loadRepositoriesAPI();
            setRepositories(data);
        } catch (error) {
            console.error('Failed to load repositories:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to load repositories';
            setRepoError(errorMessage);
        } finally {
            setIsInitializing(false);
        }
    }, []);

    const startSync = useCallback(async (repoName: string) => {
        if (activeSyncs.has(repoName)) return;

        setActiveSyncs(prev => new Set(prev).add(repoName));

        try {
            const result = await startSyncAPI(repoName);

            if (result.syncId) {
                // Start polling for status updates
                const poll = createPollingFunction(
                    result.syncId,
                    repoName,
                    (repoName, status) => setSyncStatuses(prev => new Map(prev).set(repoName, status)),
                    (repoName) => setActiveSyncs(prev => {
                        const next = new Set(prev);
                        next.delete(repoName);
                        return next;
                    }),
                    (repoName) => setActiveSyncs(prev => {
                        const next = new Set(prev);
                        next.delete(repoName);
                        return next;
                    })
                );
                poll();
            }

        } catch (error) {
            console.error(`Sync failed for ${repoName}:`, error);
            setActiveSyncs(prev => {
                const next = new Set(prev);
                next.delete(repoName);
                return next;
            });

            setSyncStatuses(prev => new Map(prev).set(repoName, {
                status: 'failed',
                error: error instanceof Error ? error.message : 'Unknown error'
            }));
        }
    }, [activeSyncs]);

    const syncAllRepositories = async () => {
        const availableRepos = repositories
            .filter(repo => repo.exists && !activeSyncs.has(repo.name))
            .map(repo => repo.name);

        if (availableRepos.length === 0) return;

        // Mark all as active
        setActiveSyncs(prev => {
            const next = new Set(prev);
            availableRepos.forEach(repo => next.add(repo));
            return next;
        });

        try {
            const data = await syncAllRepositoriesAPI(availableRepos);

            // Handle results
            data.results?.forEach((result: any) => {
                if (result.syncId) {
                    const poll = createPollingFunction(
                        result.syncId,
                        result.repository,
                        (repoName, status) => setSyncStatuses(prev => new Map(prev).set(repoName, status)),
                        (repoName) => setActiveSyncs(prev => {
                            const next = new Set(prev);
                            next.delete(repoName);
                            return next;
                        }),
                        (repoName) => setActiveSyncs(prev => {
                            const next = new Set(prev);
                            next.delete(repoName);
                            return next;
                        })
                    );
                    poll();
                } else {
                    setSyncStatuses(prev => new Map(prev).set(result.repository, result));
                    setActiveSyncs(prev => {
                        const next = new Set(prev);
                        next.delete(result.repository);
                        return next;
                    });
                }
            });

        } catch (error) {
            console.error('Batch sync failed:', error);

            // Clear all active syncs on error
            availableRepos.forEach(repo => {
                setActiveSyncs(prev => {
                    const next = new Set(prev);
                    next.delete(repo);
                    return next;
                });

                setSyncStatuses(prev => new Map(prev).set(repo, {
                    status: 'failed',
                    error: error instanceof Error ? error.message : 'Unknown error'
                }));
            });
        }
    };

    if (isInitializing) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center"
            >
                <div className="text-center">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="inline-block"
                    >
                        <Loader2 className="w-12 h-12 text-blue-400" />
                    </motion.div>
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="mt-4 text-gray-300 font-medium text-lg"
                    >
                        Initializing repository sync...
                    </motion.p>
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 2, ease: "easeInOut" }}
                        className="mt-4 h-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mx-auto max-w-xs"
                    />
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 py-6"
        >
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.05),transparent_50%)]" />

            <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Modern Header */}
                <motion.div
                    variants={itemVariants}
                    className="mb-8 text-center"
                >
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <motion.div
                            animate={{ 
                                scale: [1, 1.05, 1],
                                rotate: [0, 5, -5, 0]
                            }}
                            transition={{ 
                                duration: 3, 
                                repeat: Infinity, 
                                ease: "easeInOut" 
                            }}
                            className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg"
                        >
                            <Database className="w-6 h-6 text-white" />
                        </motion.div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-clip-text text-transparent">
                            Repository Synchronization
                        </h1>
                    </div>
                    <p className="text-lg text-gray-400 font-light max-w-2xl mx-auto">
                        Sync your local repositories to vector database for intelligent AI analysis and semantic search
                    </p>
                    <div className="w-20 h-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mx-auto mt-4" />
                </motion.div>

                {/* System Health Status Card */}
                <SyncStatusCard
                    healthStatus={healthStatus}
                    onRefresh={checkHealth}
                    isLoading={isHealthLoading}
                    error={healthError}
                />

                {/* Sync Controls */}
                <SyncControls
                    repositories={repositories}
                    activeSyncs={activeSyncs}
                    syncStatuses={syncStatuses}
                    healthStatus={healthStatus}
                    onSyncAll={syncAllRepositories}
                    isLoading={isInitializing}
                    error={repoError}
                />

                {/* Repository List */}
                <SyncRepoList
                    repositories={repositories}
                    syncStatuses={syncStatuses}
                    activeSyncs={activeSyncs}
                    healthStatus={healthStatus}
                    onStartSync={startSync}
                    error={repoError}
                />

                {/* Modern Footer */}
                <motion.div
                    variants={itemVariants}
                    className="mt-8 text-center"
                >
                    <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-4 shadow-lg">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <Brain className="w-4 h-4 text-blue-400" />
                            <Server className="w-4 h-4 text-purple-400" />
                        </div>
                        <p className="text-sm text-gray-400 leading-relaxed">
                            Repositories are indexed using <span className="font-semibold text-blue-400">OpenAI embeddings</span> and
                            stored in <span className="font-semibold text-purple-400">Qdrant Cloud</span> for intelligent semantic search.
                            <br />
                            Ensure your Qdrant cluster URL and API key are properly configured for optimal performance.
                        </p>
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
}