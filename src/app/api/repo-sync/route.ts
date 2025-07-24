// Lean API route handlers for repository synchronization
import { NextRequest, NextResponse } from 'next/server';
import { RepositorySyncer } from './syncService';
import { REPOSITORIES, WORKSPACE_ROOT, OPENAI_API_KEY, QDRANT_API_KEY, QDRANT_URL } from './syncConfig';
import { HealthStatus } from './syncTypes';

// Global syncer instance
const syncer = new RepositorySyncer();

// Initialize syncer helper
async function initializeSyncer() {
    if (!syncer.qdrantClient) {
        const initialized = await syncer.initialize();
        if (!initialized) {
            throw new Error('Failed to initialize Qdrant connection');
        }
    }
}

export async function GET(request: NextRequest) {
    try {
        await initializeSyncer();

        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action');
        const syncId = searchParams.get('sync_id');

        switch (action) {
            case 'status':
                if (!syncId) {
                    return NextResponse.json({ error: 'sync_id required' }, { status: 400 });
                }

                const status = syncer.getSyncStatus(syncId);
                return NextResponse.json(status);

            case 'repositories':
                const repos = syncer.getAllRepositoryStats();
                return NextResponse.json({
                    repositories: repos,
                    workspace_root: WORKSPACE_ROOT
                });

            case 'collections':
                const collections = await syncer.getCollectionInfo();
                return NextResponse.json({
                    collections: collections
                });

            case 'health':
                return NextResponse.json({
                    status: 'ok',
                    qdrant_connected: !!syncer.qdrantClient,
                    openai_configured: !!OPENAI_API_KEY,
                    qdrant_configured: !!QDRANT_API_KEY && !!QDRANT_URL,
                    timestamp: new Date().toISOString()
                });

            default:
                return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });
        }
    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        await initializeSyncer();

        const body = await request.json();
        const { action, repository, repositories } = body;

        switch (action) {
            case 'sync':
                if (!repository && !repositories) {
                    return NextResponse.json({
                        error: 'Either repository or repositories array is required'
                    }, { status: 400 });
                }

                if (repository) {
                    // Sync single repository
                    if (!REPOSITORIES[repository]) {
                        return NextResponse.json({
                            error: `Unknown repository: ${repository}`
                        }, { status: 400 });
                    }

                    const result = await syncer.syncRepository(repository);
                    return NextResponse.json(result);

                } else if (repositories) {
                    // Sync multiple repositories
                    const results = [];

                    for (const repo of repositories) {
                        if (REPOSITORIES[repo]) {
                            try {
                                const result = await syncer.syncRepository(repo);
                                results.push(result);
                            } catch (error: any) {
                                results.push({
                                    repository: repo,
                                    status: 'failed',
                                    error: error instanceof Error ? error.message : 'Unknown error'
                                });
                            }
                        } else {
                            results.push({
                                repository: repo,
                                status: 'failed',
                                error: 'Unknown repository'
                            });
                        }
                    }

                    return NextResponse.json({ results });
                }
                break;

            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }
    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}