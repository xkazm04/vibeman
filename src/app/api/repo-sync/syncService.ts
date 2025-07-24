// Core synchronization service
import fs from 'fs';
import path from 'path';
import { QdrantClient } from '@qdrant/js-client-rest';
import OpenAI from 'openai';
import { 
    SyncStatus, 
    FileDocument, 
    RepositoryInfo, 
    CollectionInfo, 
    SyncResult 
} from './syncTypes';
import { 
    OPENAI_API_KEY, 
    QDRANT_URL, 
    QDRANT_API_KEY, 
    REPOSITORIES, 
    IGNORE_DIRS,
    BATCH_SIZE,
    MAX_TEXT_LENGTH,
    EMBEDDING_MODEL,
    VECTOR_DIMENSION
} from './syncConfig';
import { 
    getFileCategory, 
    shouldIndexFile, 
    getGitInfo, 
    analyzeCodeStructure, 
    createDocumentId,
    formatQdrantUrl
} from './syncUtils';

export class RepositorySyncer {
    private openai: OpenAI;
    public qdrantClient: QdrantClient | null = null;
    private syncStatus: Map<string, SyncStatus> = new Map();

    constructor() {
        this.openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    }

    async initialize(): Promise<boolean> {
        try {
            if (!QDRANT_URL || !QDRANT_API_KEY) {
                console.error('❌ Missing QDRANT_URL or QDRANT_API_KEY environment variables');
                return false;
            }

            const cleanUrl = formatQdrantUrl(QDRANT_URL);
            console.log(`🔗 Connecting to Qdrant at: ${cleanUrl}`);

            this.qdrantClient = new QdrantClient({
                url: cleanUrl,
                apiKey: QDRANT_API_KEY,
            });

            const collections = await this.qdrantClient.getCollections();
            console.log('✅ Connected to Qdrant Cloud');
            console.log(`📚 Found ${collections.collections?.length || 0} existing collections`);
            return true;
        } catch (error) {
            console.error('❌ Failed to connect to Qdrant:', error);
            if (error instanceof Error) {
                console.error('Error details:', error.message);
            }
            return false;
        }
    }

    async createEmbedding(text: string): Promise<number[]> {
        try {
            const truncatedText = text.length > MAX_TEXT_LENGTH ? text.substring(0, MAX_TEXT_LENGTH) : text;

            const response = await this.openai.embeddings.create({
                model: EMBEDDING_MODEL,
                input: truncatedText,
                encoding_format: 'float'
            });
            return response.data[0].embedding;
        } catch (error) {
            console.error('Error creating embedding:', error);
            throw error;
        }
    }

    async ensureCollection(collectionName: string): Promise<boolean> {
        try {
            if (!this.qdrantClient) {
                throw new Error('Qdrant client not initialized');
            }

            console.log(`🔍 Checking if collection '${collectionName}' exists...`);

            try {
                const collectionInfo = await this.qdrantClient.getCollection(collectionName);
                console.log(`📚 Collection '${collectionName}' already exists with ${collectionInfo.points_count || 0} points`);
                return true;
            } catch (error: any) {
                if (error.status === 404) {
                    console.log(`📚 Collection '${collectionName}' does not exist, creating...`);

                    await this.qdrantClient.createCollection(collectionName, {
                        vectors: {
                            size: VECTOR_DIMENSION,
                            distance: 'Cosine'
                        },
                        optimizers_config: {
                            default_segment_number: 2
                        },
                        replication_factor: 1
                    });

                    console.log(`✅ Created new collection: ${collectionName}`);
                    return true;
                } else {
                    throw error;
                }
            }
        } catch (error) {
            console.error(`❌ Error ensuring collection ${collectionName}:`, error);
            if (error instanceof Error) {
                console.error('Error details:', error.message);
            }
            throw error;
        }
    }

    async processFile(filePath: string, repoName: string): Promise<FileDocument | null> {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');

            if (!content.trim()) {
                return null;
            }

            const stats = fs.statSync(filePath);
            const extension = path.extname(filePath);
            const relativePath = path.relative(REPOSITORIES[repoName], filePath);

            const gitInfo = await getGitInfo(REPOSITORIES[repoName], filePath);
            const codeStructure = await analyzeCodeStructure(content, extension);
            const embedding = await this.createEmbedding(content);

            const payload = {
                repository: repoName,
                file_path: relativePath.replace(/\\/g, '/'),
                file_name: path.basename(filePath),
                file_type: extension,
                category: getFileCategory(filePath),
                size_bytes: stats.size,
                line_count: content.split('\n').length,
                char_count: content.length,
                last_modified: stats.mtime.toISOString(),
                git_hash: gitInfo.hash || '',
                git_author: gitInfo.author || '',
                git_date: gitInfo.date || '',
                git_message: gitInfo.message || '',
                functions_count: codeStructure.functions.length,
                classes_count: codeStructure.classes.length,
                imports_count: codeStructure.imports.length,
                comments_count: codeStructure.comments,
                indexed_at: new Date().toISOString(),
                content: content
            };

            const docId = createDocumentId(repoName, relativePath);

            return {
                id: docId,
                vector: embedding,
                payload: payload
            };

        } catch (error) {
            console.error(`Error processing file ${filePath}:`, error);
            return null;
        }
    }

    async scanDirectory(dirPath: string, repoName: string, processedFiles = new Set<string>()): Promise<FileDocument[]> {
        const files: FileDocument[] = [];

        try {
            const items = fs.readdirSync(dirPath);

            for (const item of items) {
                const itemPath = path.join(dirPath, item);
                const stats = fs.statSync(itemPath);

                if (stats.isDirectory()) {
                    if (!IGNORE_DIRS.has(item)) {
                        const subFiles = await this.scanDirectory(itemPath, repoName, processedFiles);
                        files.push(...subFiles);
                    }
                } else if (stats.isFile()) {
                    if (shouldIndexFile(itemPath) && !processedFiles.has(itemPath)) {
                        processedFiles.add(itemPath);
                        const fileDoc = await this.processFile(itemPath, repoName);
                        if (fileDoc) {
                            files.push(fileDoc);
                        }
                    }
                }
            }
        } catch (error) {
            console.error(`Error scanning directory ${dirPath}:`, error);
        }

        return files;
    }

    async syncRepository(repoName: string): Promise<SyncResult> {
        const syncId = `sync_${repoName}_${Date.now()}`;

        try {
            this.syncStatus.set(syncId, {
                repository: repoName,
                status: 'scanning',
                startTime: new Date().toISOString(),
                filesProcessed: 0,
                totalFiles: 0
            });

            const repoPath = REPOSITORIES[repoName];

            if (!fs.existsSync(repoPath)) {
                throw new Error(`Repository path does not exist: ${repoPath}`);
            }

            console.log(`📂 Starting sync for repository: ${repoName}`);

            this.updateSyncStatus(syncId, { status: 'scanning' });
            const documents = await this.scanDirectory(repoPath, repoName);

            if (documents.length === 0) {
                this.updateSyncStatus(syncId, {
                    status: 'completed',
                    message: 'No files to index',
                    endTime: new Date().toISOString()
                });
                return { syncId, repository: repoName, filesIndexed: 0, status: 'completed', message: 'No files found to index' };
            }

            console.log(`📄 Found ${documents.length} files to index`);

            this.updateSyncStatus(syncId, {
                status: 'indexing',
                totalFiles: documents.length
            });

            const collectionName = `repo_${repoName}`;
            await this.ensureCollection(collectionName);

            await this.clearExistingData(collectionName, repoName);
            await this.batchUpsertDocuments(collectionName, documents, syncId);

            this.updateSyncStatus(syncId, {
                status: 'completed',
                endTime: new Date().toISOString(),
                message: `Successfully indexed ${documents.length} files`
            });

            console.log(`✅ Sync completed for ${repoName}: ${documents.length} files indexed`);

            return {
                syncId,
                repository: repoName,
                filesIndexed: documents.length,
                status: 'completed'
            };

        } catch (error: any) {
            console.error(`❌ Sync failed for ${repoName}:`, error);
            console.error('Sync error details:', {
                message: error.message,
                status: error.status,
                data: error.data
            });

            this.updateSyncStatus(syncId, {
                status: 'failed',
                error: error.message,
                endTime: new Date().toISOString()
            });

            throw error;
        }
    }

    private async clearExistingData(collectionName: string, repoName: string): Promise<void> {
        try {
            console.log(`🗑️ Clearing existing data for repository: ${repoName}`);
            await this.qdrantClient!.delete(collectionName, {
                filter: {
                    must: [
                        {
                            key: 'repository',
                            match: { value: repoName }
                        }
                    ]
                }
            });
            console.log(`✅ Cleared existing data for repository: ${repoName}`);
        } catch (error: any) {
            console.log(`ℹ️  No existing data to clear for repository: ${repoName}`);
        }
    }

    private async batchUpsertDocuments(collectionName: string, documents: FileDocument[], syncId: string): Promise<void> {
        for (let i = 0; i < documents.length; i += BATCH_SIZE) {
            const batch = documents.slice(i, i + BATCH_SIZE);

            try {
                const points = batch.map(doc => ({
                    id: doc.id,
                    vector: doc.vector,
                    payload: doc.payload
                }));

                console.log(`📦 Upserting batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(documents.length / BATCH_SIZE)} (${batch.length} files)`);

                await this.qdrantClient!.upsert(collectionName, {
                    wait: true,
                    points: points
                });

                console.log(`✅ Batch ${Math.floor(i / BATCH_SIZE) + 1} completed successfully`);

                const processed = i + batch.length;
                this.updateSyncStatus(syncId, {
                    filesProcessed: processed
                });

            } catch (batchError: any) {
                console.error(`❌ Error in batch ${Math.floor(i / BATCH_SIZE) + 1}:`, batchError);
                await this.handleBatchError(collectionName, batch);
            }
        }
    }

    private async handleBatchError(collectionName: string, batch: FileDocument[]): Promise<void> {
        for (const doc of batch) {
            try {
                await this.qdrantClient!.upsert(collectionName, {
                    wait: true,
                    points: [{
                        id: doc.id,
                        vector: doc.vector,
                        payload: doc.payload
                    }]
                });
                console.log(`✅ Individual file ${doc.id} indexed successfully`);
            } catch (fileError: any) {
                console.error(`❌ Failed to index file ${doc.id}:`, fileError.message);
            }
        }
    }

    updateSyncStatus(syncId: string, updates: Partial<SyncStatus>): void {
        const current = this.syncStatus.get(syncId) || {} as SyncStatus;
        this.syncStatus.set(syncId, { ...current, ...updates });
    }

    getSyncStatus(syncId: string): SyncStatus | { status: 'not_found' } {
        return this.syncStatus.get(syncId) || { status: 'not_found' };
    }

    getAllRepositoryStats(): RepositoryInfo[] {
        return Object.keys(REPOSITORIES).map(repoName => ({
            name: repoName,
            path: REPOSITORIES[repoName],
            exists: fs.existsSync(REPOSITORIES[repoName])
        }));
    }

    async getCollectionInfo(): Promise<CollectionInfo[]> {
        try {
            if (!this.qdrantClient) {
                throw new Error('Qdrant client not initialized');
            }

            const collections = await this.qdrantClient.getCollections();
            const info = [];

            for (const collection of collections.collections) {
                try {
                    const collectionInfo = await this.qdrantClient.getCollection(collection.name);
                    info.push({
                        name: collection.name,
                        vectors_count: collectionInfo.points_count || 0,
                        status: collectionInfo.status || 'unknown'
                    });
                } catch (error) {
                    info.push({
                        name: collection.name,
                        vectors_count: 0,
                        status: 'error'
                    });
                }
            }

            return info;
        } catch (error) {
            console.error('Error getting collection info:', error);
            return [];
        }
    }
}