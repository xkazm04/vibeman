/**
 * Tool Implementations for Vibeman Bridge
 *
 * Each tool provides a JSON Schema definition (for vscode.lm) and an
 * execute function. Tools use VS Code APIs for file operations and
 * child_process for command execution.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { exec } from 'child_process';
import type { ToolDefinition, ToolResult } from './types';

// ============ Tool Registry ============

interface ToolImpl {
  definition: ToolDefinition;
  execute: (input: Record<string, unknown>, projectPath: string) => Promise<ToolResult>;
}

const tools: ToolImpl[] = [
  readFileTool(),
  writeFileTool(),
  editFileTool(),
  runCommandTool(),
  listFilesTool(),
  searchFilesTool(),
];

export function getToolDefinitions(): ToolDefinition[] {
  return tools.map(t => t.definition);
}

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  projectPath: string
): Promise<ToolResult> {
  const tool = tools.find(t => t.definition.name === name);
  if (!tool) {
    return { output: `Unknown tool: ${name}`, isError: true };
  }
  try {
    return await tool.execute(input, projectPath);
  } catch (err) {
    return {
      output: `Tool error: ${err instanceof Error ? err.message : String(err)}`,
      isError: true,
    };
  }
}

// ============ Path Resolution ============

function resolvePath(filePath: string, projectPath: string): string {
  if (path.isAbsolute(filePath)) return filePath;
  return path.join(projectPath, filePath);
}

// ============ Tool Implementations ============

function readFileTool(): ToolImpl {
  return {
    definition: {
      name: 'read_file',
      description: 'Read the contents of a file. Returns the full file content as text.',
      inputSchema: {
        type: 'object',
        properties: {
          file_path: {
            type: 'string',
            description: 'Absolute or project-relative file path to read',
          },
        },
        required: ['file_path'],
      },
    },
    execute: async (input, projectPath) => {
      const filePath = resolvePath(input.file_path as string, projectPath);
      const uri = vscode.Uri.file(filePath);
      const content = await vscode.workspace.fs.readFile(uri);
      return { output: Buffer.from(content).toString('utf-8') };
    },
  };
}

function writeFileTool(): ToolImpl {
  return {
    definition: {
      name: 'write_file',
      description: 'Write content to a file. Creates the file if it does not exist, or overwrites it entirely.',
      inputSchema: {
        type: 'object',
        properties: {
          file_path: {
            type: 'string',
            description: 'Absolute or project-relative file path to write',
          },
          content: {
            type: 'string',
            description: 'The complete file content to write',
          },
        },
        required: ['file_path', 'content'],
      },
    },
    execute: async (input, projectPath) => {
      const filePath = resolvePath(input.file_path as string, projectPath);
      const uri = vscode.Uri.file(filePath);
      await vscode.workspace.fs.writeFile(uri, Buffer.from(input.content as string, 'utf-8'));
      return { output: `File written: ${filePath}` };
    },
  };
}

function editFileTool(): ToolImpl {
  return {
    definition: {
      name: 'edit_file',
      description: 'Edit a file by replacing an exact string match with new content. Use this for surgical edits to existing files instead of rewriting the entire file.',
      inputSchema: {
        type: 'object',
        properties: {
          file_path: {
            type: 'string',
            description: 'Absolute or project-relative file path to edit',
          },
          old_string: {
            type: 'string',
            description: 'The exact string to find in the file (must be unique)',
          },
          new_string: {
            type: 'string',
            description: 'The replacement string',
          },
        },
        required: ['file_path', 'old_string', 'new_string'],
      },
    },
    execute: async (input, projectPath) => {
      const filePath = resolvePath(input.file_path as string, projectPath);
      const uri = vscode.Uri.file(filePath);
      const raw = await vscode.workspace.fs.readFile(uri);
      const content = Buffer.from(raw).toString('utf-8');
      const oldStr = input.old_string as string;
      const newStr = input.new_string as string;

      if (!content.includes(oldStr)) {
        return { output: `old_string not found in ${filePath}`, isError: true };
      }

      const occurrences = content.split(oldStr).length - 1;
      if (occurrences > 1) {
        return {
          output: `old_string found ${occurrences} times in ${filePath} — must be unique. Provide more context.`,
          isError: true,
        };
      }

      const updated = content.replace(oldStr, newStr);
      await vscode.workspace.fs.writeFile(uri, Buffer.from(updated, 'utf-8'));
      return { output: `Successfully edited ${filePath}` };
    },
  };
}

function runCommandTool(): ToolImpl {
  return {
    definition: {
      name: 'run_command',
      description: 'Execute a shell command in the project directory and return stdout/stderr. Use for running tests, builds, git commands, etc.',
      inputSchema: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'Shell command to execute',
          },
          cwd: {
            type: 'string',
            description: 'Working directory (defaults to project root)',
          },
          timeout: {
            type: 'number',
            description: 'Timeout in milliseconds (default 60000)',
          },
        },
        required: ['command'],
      },
    },
    execute: async (input, projectPath) => {
      const command = input.command as string;
      const cwd = input.cwd ? resolvePath(input.cwd as string, projectPath) : projectPath;
      const timeout = (input.timeout as number) || 60000;

      return new Promise<ToolResult>((resolve) => {
        exec(command, { cwd, timeout, maxBuffer: 2 * 1024 * 1024 }, (error, stdout, stderr) => {
          if (error) {
            resolve({
              output: `Exit code: ${error.code ?? 1}\nstdout:\n${stdout}\nstderr:\n${stderr || error.message}`,
              isError: true,
            });
          } else {
            resolve({
              output: stdout + (stderr ? `\nstderr:\n${stderr}` : ''),
            });
          }
        });
      });
    },
  };
}

function listFilesTool(): ToolImpl {
  return {
    definition: {
      name: 'list_files',
      description: 'List files matching a glob pattern in the project. Returns file paths relative to project root.',
      inputSchema: {
        type: 'object',
        properties: {
          pattern: {
            type: 'string',
            description: 'Glob pattern, e.g. "src/**/*.ts", "*.json", "**/*.test.*"',
          },
          max_results: {
            type: 'number',
            description: 'Maximum number of results (default 200)',
          },
        },
        required: ['pattern'],
      },
    },
    execute: async (input, projectPath) => {
      const pattern = input.pattern as string;
      const maxResults = (input.max_results as number) || 200;

      const files = await vscode.workspace.findFiles(
        new vscode.RelativePattern(projectPath, pattern),
        '**/node_modules/**',
        maxResults
      );

      if (files.length === 0) {
        return { output: 'No files found matching pattern' };
      }

      const relativePaths = files
        .map(f => path.relative(projectPath, f.fsPath))
        .sort();

      return { output: relativePaths.join('\n') };
    },
  };
}

function searchFilesTool(): ToolImpl {
  return {
    definition: {
      name: 'search_files',
      description: 'Search for a text pattern across files in the project. Returns matching lines with file paths and line numbers.',
      inputSchema: {
        type: 'object',
        properties: {
          pattern: {
            type: 'string',
            description: 'Text or regex pattern to search for',
          },
          file_pattern: {
            type: 'string',
            description: 'Glob pattern to filter files (default "**/*")',
          },
          max_results: {
            type: 'number',
            description: 'Maximum number of matching lines (default 50)',
          },
        },
        required: ['pattern'],
      },
    },
    execute: async (input, projectPath) => {
      const searchPattern = input.pattern as string;
      const filePattern = (input.file_pattern as string) || '**/*.{ts,tsx,js,jsx,json,md,css}';
      const maxResults = (input.max_results as number) || 50;

      const files = await vscode.workspace.findFiles(
        new vscode.RelativePattern(projectPath, filePattern),
        '**/node_modules/**',
        500
      );

      const regex = new RegExp(searchPattern, 'gi');
      const matches: string[] = [];

      for (const file of files) {
        if (matches.length >= maxResults) break;

        try {
          const raw = await vscode.workspace.fs.readFile(file);
          const content = Buffer.from(raw).toString('utf-8');
          const lines = content.split('\n');

          for (let i = 0; i < lines.length; i++) {
            if (matches.length >= maxResults) break;
            if (regex.test(lines[i])) {
              const relPath = path.relative(projectPath, file.fsPath);
              matches.push(`${relPath}:${i + 1}: ${lines[i].trim()}`);
            }
            regex.lastIndex = 0; // Reset regex state for 'g' flag
          }
        } catch {
          // Skip unreadable files
        }
      }

      if (matches.length === 0) {
        return { output: `No matches found for "${searchPattern}"` };
      }

      return { output: matches.join('\n') };
    },
  };
}
