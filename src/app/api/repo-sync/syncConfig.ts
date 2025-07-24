// Configuration constants for repository synchronization

// Environment variables
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
export const QDRANT_URL = process.env.QDRANT_URL;
export const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
export const WORKSPACE_ROOT = 'C:\\Users\\kazda\\kiro';

// Repository paths
export const REPOSITORIES: Record<string, string> = {
    'simple': 'C:\\Users\\kazda\\kiro\\simple',
    'investigator': 'C:\\Users\\kazda\\kiro\\investigator',
    'vibeman': 'C:\\Users\\kazda\\kiro\\vibeman'
};

// File extensions to index
export const CODE_EXTENSIONS = new Set([
    '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.cs',
    '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala', '.sql'
]);

export const DOC_EXTENSIONS = new Set([
    '.md', '.txt', '.rst', '.adoc'
]);

export const CONFIG_EXTENSIONS = new Set([
    '.json', '.yaml', '.yml', '.toml', '.ini', '.env', '.config'
]);

// Directories to ignore
export const IGNORE_DIRS = new Set([
    '.git', 'node_modules', '__pycache__', '.next', 'dist', 'build',
    'venv', 'env', '.vscode', '.idea', 'target', 'bin', 'obj'
]);

// Processing constants
export const BATCH_SIZE = 5;
export const MAX_TEXT_LENGTH = 8000;
export const EMBEDDING_MODEL = 'text-embedding-ada-002';
export const VECTOR_DIMENSION = 1536;