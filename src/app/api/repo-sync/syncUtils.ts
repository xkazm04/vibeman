// Utility functions for repository synchronization
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { GitInfo, CodeStructure } from './syncTypes';
import { CODE_EXTENSIONS, DOC_EXTENSIONS, CONFIG_EXTENSIONS } from './syncConfig';

export function getFileCategory(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    if (CODE_EXTENSIONS.has(ext)) return 'code';
    if (DOC_EXTENSIONS.has(ext)) return 'documentation';
    if (CONFIG_EXTENSIONS.has(ext)) return 'configuration';
    return 'other';
}

export function shouldIndexFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return CODE_EXTENSIONS.has(ext) || DOC_EXTENSIONS.has(ext) || CONFIG_EXTENSIONS.has(ext);
}

export async function getGitInfo(repoPath: string, filePath: string): Promise<GitInfo> {
    try {
        return new Promise((resolve) => {
            const relativePath = path.relative(repoPath, filePath);
            const gitProcess = spawn('git', [
                'log', '-1', '--format=%H|%an|%ad|%s', '--date=iso', '--', relativePath
            ], { cwd: repoPath });

            let output = '';
            gitProcess.stdout.on('data', (data: any) => {
                output += data.toString();
            });

            gitProcess.on('close', (code: number) => {
                if (code === 0 && output.trim()) {
                    const [hash, author, date, message] = output.trim().split('|');
                    resolve({ hash, author, date, message });
                } else {
                    resolve({});
                }
            });

            gitProcess.on('error', () => resolve({}));
        });
    } catch (error) {
        return {};
    }
}

export async function analyzeCodeStructure(content: string, extension: string): Promise<CodeStructure> {
    const structure: CodeStructure = {
        functions: [],
        classes: [],
        imports: [],
        exports: [],
        comments: 0
    };

    const lines = content.split('\n');

    if (extension === '.py') {
        analyzePythonCode(lines, structure);
    } else if (['.js', '.jsx', '.ts', '.tsx'].includes(extension)) {
        analyzeJavaScriptCode(lines, structure);
    }

    return structure;
}

function analyzePythonCode(lines: string[], structure: CodeStructure): void {
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('def ')) {
            const funcName = line.split('(')[0].replace('def ', '');
            structure.functions.push({ name: funcName, line: i + 1 });
        } else if (line.startsWith('class ')) {
            const className = line.split('(')[0].split(':')[0].replace('class ', '');
            structure.classes.push({ name: className, line: i + 1 });
        } else if (line.startsWith('import ') || line.startsWith('from ')) {
            structure.imports.push(line);
        } else if (line.startsWith('#')) {
            structure.comments++;
        }
    }
}

function analyzeJavaScriptCode(lines: string[], structure: CodeStructure): void {
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.includes('function ') || line.match(/^\s*\w+\s*\(/)) {
            structure.functions.push({ name: 'function', line: i + 1 });
        } else if (line.startsWith('class ')) {
            const className = line.split(' ')[1]?.split(' ')[0];
            if (className) {
                structure.classes.push({ name: className, line: i + 1 });
            }
        } else if (line.startsWith('import ')) {
            structure.imports.push(line);
        } else if (line.startsWith('export ')) {
            structure.exports.push(line);
        } else if (line.startsWith('//') || line.includes('/*')) {
            structure.comments++;
        }
    }
}

export function createDocumentId(repoName: string, relativePath: string): string {
    return `${repoName}_${relativePath.replace(/[\\\/\.\s]/g, '_')}`;
}

export function formatQdrantUrl(url: string): string {
    let cleanUrl = url.replace(/\/$/, '');
    if (!cleanUrl.startsWith('http')) {
        cleanUrl = `https://${cleanUrl}`;
    }
    return cleanUrl;
}