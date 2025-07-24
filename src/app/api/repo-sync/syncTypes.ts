// Types and interfaces for repository synchronization
export interface GitInfo {
    hash?: string;
    author?: string;
    date?: string;
    message?: string;
}

export interface CodeStructure {
    functions: Array<{ name: string; line: number }>;
    classes: Array<{ name: string; line: number }>;
    imports: string[];
    exports: string[];
    comments: number;
}

export interface FileDocument {
    id: string;
    vector: number[];
    payload: {
        repository: string;
        file_path: string;
        file_name: string;
        file_type: string;
        category: string;
        size_bytes: number;
        line_count: number;
        char_count: number;
        last_modified: string;
        git_hash: string;
        git_author: string;
        git_date: string;
        git_message: string;
        functions_count: number;
        classes_count: number;
        imports_count: number;
        comments_count: number;
        indexed_at: string;
        content: string;
    };
}

export interface SyncStatus {
    repository: string;
    status: 'scanning' | 'indexing' | 'completed' | 'failed';
    startTime: string;
    endTime?: string;
    filesProcessed: number;
    totalFiles: number;
    message?: string;
    error?: string;
}

export interface RepositoryInfo {
    name: string;
    path: string;
    exists: boolean;
}

export interface CollectionInfo {
    name: string;
    vectors_count: number;
    status: string;
}

export interface SyncResult {
    syncId: string;
    repository: string;
    filesIndexed: number;
    status: string;
    message?: string;
}

export interface HealthStatus {
    status: string;
    qdrant_connected: boolean;
    openai_configured: boolean;
    qdrant_configured: boolean;
    timestamp: string;
}