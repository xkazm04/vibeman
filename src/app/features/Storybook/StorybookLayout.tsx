'use client';

import React, { useEffect, useState } from 'react';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import { RemoteDefinition, RemoteStatus } from './lib/federation/types';
import { initializeSmartFederation } from './lib/federation/remoteLoader';
import { motion } from 'framer-motion';

export default function StorybookLayout() {
    const { projects, initializeProjects } = useProjectConfigStore();
    const [remotes, setRemotes] = useState<RemoteDefinition[]>([]);
    const [statuses, setStatuses] = useState<RemoteStatus[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        initializeProjects();
    }, [initializeProjects]);

    useEffect(() => {
        // Map projects to RemoteDefinitions
        // This is a simplified mapping. In a real scenario, we might need more metadata.
        const mappedRemotes: RemoteDefinition[] = projects
            .filter(p => p.type === 'nextjs')
            .map(p => ({
                name: p.name.replace(/[^a-zA-Z0-9]/g, '_'), // Sanitize name
                displayName: p.name,
                prodEntry: `http://localhost:${p.port}/_next/static/chunks/remoteEntry.js`, // Assuming local for now as prod
                localEntry: `http://localhost:${p.port}/_next/static/chunks/remoteEntry.js`,
                localPort: p.port,
                components: [], // We'll need a way to discover components
                description: p.path,
            }));
        setRemotes(mappedRemotes);
    }, [projects]);

    useEffect(() => {
        if (remotes.length > 0) {
            setLoading(true);
            initializeSmartFederation(remotes)
                .then(setStatuses)
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, [remotes]);

    return (
        <div className="flex h-full bg-gray-900 text-white">
            {/* Sidebar */}
            <div className="w-64 border-r border-gray-800 p-4 overflow-y-auto">
                <h2 className="text-xl font-bold mb-4 text-purple-400">Storybook</h2>

                {loading && <div className="text-sm text-gray-400">Scanning remotes...</div>}

                <div className="space-y-2">
                    {statuses.map(status => (
                        <div key={status.name} className="p-3 rounded bg-gray-800/50 border border-gray-700">
                            <div className="flex items-center justify-between mb-1">
                                <span className="font-medium truncate" title={status.name}>{status.name}</span>
                                <div className={`w-2 h-2 rounded-full ${status.isAvailable ? 'bg-green-500' : 'bg-red-500'}`} />
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                                {status.isLocal ? 'Local' : 'Production'} • {status.isAvailable ? 'Online' : 'Offline'}
                            </div>
                            {status.error && (
                                <div className="text-xs text-red-400 mt-1">{status.error}</div>
                            )}
                        </div>
                    ))}

                    {!loading && statuses.length === 0 && (
                        <div className="text-sm text-gray-500 italic">No Next.js projects found.</div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-8 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-700 mb-2">Select a Component</h1>
                    <p className="text-gray-500">Choose a project and component from the sidebar to preview.</p>
                </div>
            </div>
        </div>
    );
}
