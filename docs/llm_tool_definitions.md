# LLM Tool Definitions for Vibeman Internal Services

This document provides a comprehensive guide for LLMs to understand and select the appropriate internal API endpoints for different tasks. Each tool is categorized by use case with clear guidance on when to use it.

## Table of Contents
1. [Read-Only Operations](#read-only-operations)
2. [Project Management](#project-management)  
3. [Context & Documentation](#context--documentation)
4. [Task & Backlog Management](#task--backlog-management)
5. [Background Processing](#background-processing)
6. [File Operations](#file-operations)****
7. [AI-Assisted Operations](#ai-assisted-operations)

---

## Read-Only Operations
*Safe operations that only retrieve information*

### GET_CONTEXTS
- **Endpoint**: `GET /api/contexts?projectId={id}`
- **Purpose**: Retrieve all contexts and groups for a project
- **When to Use**: When you need to understand project structure, see available contexts, or list documentation bundles
- **Parameters**: 
  - `projectId` (required): The project identifier
- **Response**: `{ success: true, data: { contexts: [], groups: [] } }`
- **LLM Usage**: Use when user asks "what contexts exist?", "show me project documentation", or needs to understand code organization

### GET_PROJECTS
- **Endpoint**: `GET /api/projects`
- **Purpose**: List all registered projects
- **When to Use**: When you need to see available projects or help user select a project
- **Parameters**: None
- **Response**: `{ projects: [] }`
- **LLM Usage**: Use when user asks "what projects are available?", "show me all projects", or needs project selection

### GET_BACKLOG
- **Endpoint**: `GET /api/backlog?projectId={id}`
- **Purpose**: Retrieve backlog items for a project
- **When to Use**: When you need to see pending tasks, review project status, or understand what work is planned
- **Parameters**: 
  - `projectId` (required): The project identifier
- **Response**: `{ backlogItems: [], success: true }`
- **LLM Usage**: Use when user asks "what's in the backlog?", "show me pending tasks", or "what work is planned?"

### GET_FOLDER_STRUCTURE
- **Endpoint**: `GET /api/kiro/folder-structure?projectPath={path}`
- **Purpose**: Analyze and return project folder structure (up to 3 levels deep)
- **When to Use**: When you need to understand project layout, show file organization, or help user navigate
- **Parameters**: 
  - `projectPath` (optional): Path to analyze, defaults to current working directory
- **Response**: `{ success: true, structure: [], basePath: string }`
- **LLM Usage**: Use when user asks "what's the project structure?", "show me the files", or needs navigation help

### GET_BACKGROUND_TASKS
- **Endpoint**: `GET /api/kiro/background-tasks?projectId={id}&status={status}&limit={num}`
- **Purpose**: View background task queue status and history
- **When to Use**: When you need to check task progress, see queue status, or troubleshoot background operations
- **Parameters**: 
  - `projectId` (optional): Filter by project
  - `status` (optional): Filter by status (pending, processing, completed, error)
  - `limit` (optional): Number of tasks to return (default: 100)
- **Response**: `{ success: true, tasks: [], taskCounts: {}, queueSettings: {} }`
- **LLM Usage**: Use when user asks "what tasks are running?", "check task status", or "is the queue working?"

### GET_REQUIREMENTS_STATUS
- **Endpoint**: `GET /api/requirements/status`
- **Purpose**: Check requirement processing status
- **When to Use**: When you need to see if requirements are being processed or completed
- **Parameters**: None
- **Response**: Status information about requirement processing
- **LLM Usage**: Use when user asks about requirement processing status

### GET_REVIEWER_PENDING_FILES
- **Endpoint**: `GET /api/reviewer/pending-files`
- **Purpose**: List files awaiting review
- **When to Use**: When you need to see what files need review attention
- **Parameters**: None
- **Response**: List of files pending review
- **LLM Usage**: Use when user asks "what files need review?", "show pending reviews"

---

## Project Management
*Operations for managing projects and their configuration*

### CREATE_PROJECT
- **Endpoint**: `POST /api/projects`
- **Purpose**: Register a new project in the system
- **When to Use**: When user wants to add a new project to the system
- **Parameters**: 
  - `id` (required): Unique project identifier
  - `name` (required): Project display name
  - `path` (required): Filesystem path to project
  - `port` (required): Port number for the project
  - `type` (optional): 'nextjs', 'fastapi', or 'other'
  - `runScript` (optional): Script to run the project
  - `git` (optional): Git repository configuration
- **Response**: `{ success: true, message: "Project added successfully" }`
- **LLM Usage**: Use when user says "add new project", "register project", or provides project details to add

### UPDATE_PROJECT
- **Endpoint**: `PUT /api/projects`
- **Purpose**: Update existing project configuration
- **When to Use**: When user wants to modify project settings
- **Parameters**: 
  - `projectId` (required): Project to update
  - `updates` (required): Object with fields to update
- **Response**: `{ success: true, message: "Project updated successfully" }`
- **LLM Usage**: Use when user asks to "update project settings", "change project config", or modify project details

### DELETE_PROJECT
- **Endpoint**: `DELETE /api/projects`
- **Purpose**: Remove a project from the system
- **When to Use**: When user wants to unregister a project (use with caution)
- **Parameters**: 
  - `projectId` (required): Project to remove
- **Response**: `{ success: true, message: "Project removed successfully" }`
- **LLM Usage**: Use only when user explicitly requests project removal and confirms intent

---

## Context & Documentation
*Operations for managing code contexts and documentation*

### CREATE_CONTEXT
- **Endpoint**: `POST /api/contexts`
- **Purpose**: Create a new context bundle grouping related files
- **When to Use**: When user wants to create documentation bundles or group related code files
- **Parameters**: 
  - `projectId` (required): Target project
  - `name` (required): Context name
  - `filePaths` (required): Array of file paths to include
  - `groupId` (optional): Context group identifier
  - `description` (optional): Context description
- **Response**: `{ success: true, data: context }`
- **LLM Usage**: Use when user asks to "create context", "group these files", or "make documentation bundle"

### UPDATE_CONTEXT
- **Endpoint**: `PUT /api/contexts`
- **Purpose**: Update an existing context
- **When to Use**: When user wants to modify context details or file list
- **Parameters**: 
  - `contextId` (required): Context to update
  - `updates` (required): Object with fields to update
- **Response**: `{ success: true, data: context }`
- **LLM Usage**: Use when user asks to "update context", "modify context", or change context details

### DELETE_CONTEXT
- **Endpoint**: `DELETE /api/contexts?contextId={id}`
- **Purpose**: Remove a context (use with caution)
- **When to Use**: When user explicitly wants to delete a context
- **Parameters**: 
  - `contextId` (required): Context to delete
- **Response**: `{ success: true, message: "Context deleted successfully" }`
- **LLM Usage**: Use only when user explicitly requests context deletion

### GENERATE_CONTEXT
- **Endpoint**: `POST /api/kiro/generate-context`
- **Purpose**: Generate AI-powered context documentation for file groups
- **When to Use**: When user wants AI to create documentation for code sections
- **Parameters**: 
  - `contextName` (required): Name for the context
  - `projectId` (required): Target project
  - `filePaths` (required): Files to include
  - `projectPath` (required): Project root path
  - `generateFile` (optional): Whether to create a markdown file
  - `prompt` (optional): Custom prompt for generation
  - `model` (optional): AI model to use
- **Response**: `{ success: true, context: {}, contextFilePath?: string }`
- **LLM Usage**: Use when user asks to "generate documentation", "create context docs", or wants AI to document code

---

## Task & Backlog Management
*Operations for managing development tasks and backlog items*

### CREATE_BACKLOG_ITEM
- **Endpoint**: `POST /api/backlog`
- **Purpose**: Add a new item to the project backlog
- **When to Use**: When user wants to add tasks, features, or work items
- **Parameters**: 
  - `projectId` (required): Target project
  - `title` (required): Task title
  - `description` (required): Task description
  - `goalId` (optional): Associated goal
  - `agent` (optional): 'developer' or 'mastermind'
  - `steps` (optional): Array of task steps
  - `type` (optional): Task type
  - `status` (optional): Initial status (default: 'pending')
- **Response**: `{ backlogItem: {}, success: true }`
- **LLM Usage**: Use when user says "add task", "create backlog item", "add to backlog", or describes work to be done

### UPDATE_BACKLOG_ITEM
- **Endpoint**: `PUT /api/backlog`
- **Purpose**: Update existing backlog item details
- **When to Use**: When user wants to modify task details or status
- **Parameters**: 
  - `id` (required): Backlog item ID
  - `status` (optional): New status
  - `title` (optional): New title
  - `description` (optional): New description
  - `steps` (optional): Updated steps
- **Response**: `{ backlogItem: {}, success: true }`
- **LLM Usage**: Use when user asks to "update task", "change task status", or modify existing backlog items

### DELETE_BACKLOG_ITEM
- **Endpoint**: `DELETE /api/backlog?id={id}`
- **Purpose**: Remove a backlog item (use with caution)
- **When to Use**: When user explicitly wants to delete a backlog item
- **Parameters**: 
  - `id` (required): Backlog item to delete
- **Response**: `{ success: true, message: "Backlog item deleted successfully" }`
- **LLM Usage**: Use only when user explicitly requests backlog item deletion

### GENERATE_BACKLOG_TASK
- **Endpoint**: `POST /api/backlog/generate-task`
- **Purpose**: Use AI to generate structured backlog tasks from descriptions
- **When to Use**: When user provides rough task description and wants AI to create detailed backlog items
- **Parameters**: 
  - `projectId` (required): Target project
  - `projectName` (required): Project name
  - `projectPath` (required): Project path
  - `taskRequest` (required): User's task description
  - `mode` (required): 'context' or 'individual'
  - `selectedContexts` (required for context mode): Array of context IDs
  - `selectedFilePaths` (required for individual mode): Array of file paths
- **Response**: `{ success: true, taskId: string, message: string }`
- **LLM Usage**: Use when user gives vague task descriptions and you want AI to create proper backlog items

### PROCESS_CODING_TASK
- **Endpoint**: `POST /api/backlog/process-coding-task`
- **Purpose**: Process a coding task (long-running AI operation)
- **When to Use**: When user wants AI to actually implement/code a backlog task
- **Parameters**: Task-specific parameters for processing
- **Response**: Processing confirmation
- **LLM Usage**: Use when user asks to "implement this task", "code this feature", or wants actual code generation

### START_CODING
- **Endpoint**: `POST /api/backlog/start-coding`
- **Purpose**: Kick off a coding session for a task
- **When to Use**: When user is ready to begin development work on a task
- **Parameters**: Task and session parameters
- **Response**: Session start confirmation
- **LLM Usage**: Use when user says "start coding", "begin work on this task", or wants to start development

---

## Background Processing
*Operations for managing long-running background tasks*

### CREATE_BACKGROUND_TASK
- **Endpoint**: `POST /api/kiro/background-tasks`
- **Purpose**: Queue a long-running background task
- **When to Use**: When you need to perform time-intensive operations without blocking
- **Parameters**: 
  - `projectId` (required): Target project
  - `projectName` (required): Project name
  - `projectPath` (required): Project path
  - `taskType` (required): 'docs', 'tasks', 'goals', 'context', 'code', 'coding_task'
  - `priority` (optional): Task priority (default: 0)
  - `maxRetries` (optional): Max retry attempts (default: 3)
  - `taskData` (optional): Task-specific data
- **Response**: `{ success: true, task: {}, message: string }`
- **LLM Usage**: Use for expensive operations like "generate all docs", "analyze entire codebase", or "process large context"

### UPDATE_BACKGROUND_TASK
- **Endpoint**: `PUT /api/kiro/background-tasks`
- **Purpose**: Update background task status or data
- **When to Use**: When you need to update task progress or handle task completion
- **Parameters**: 
  - `taskId` (required): Task to update
  - `status` (optional): New status
  - `errorMessage` (optional): Error details if failed
  - `resultData` (optional): Task results
- **Response**: `{ success: true, task: {} }`
- **LLM Usage**: Generally used by system processes, not directly by user requests

### MANAGE_BACKGROUND_TASK
- **Endpoint**: `DELETE /api/kiro/background-tasks?taskId={id}&action={action}`
- **Purpose**: Cancel, retry, delete, or clear completed tasks
- **When to Use**: When user wants to manage the task queue
- **Parameters**: 
  - `taskId` (required for specific actions): Task to act on
  - `action` (required): 'cancel', 'retry', 'delete', 'clear-completed'
- **Response**: Action-specific confirmation
- **LLM Usage**: Use when user asks to "cancel task", "retry failed task", "clear completed tasks"

### START_QUEUE
- **Endpoint**: `POST /api/kiro/start-queue`
- **Purpose**: Start the background task processing queue
- **When to Use**: When user wants to ensure background tasks are being processed
- **Parameters**: None
- **Response**: Queue start confirmation
- **LLM Usage**: Use when user asks "start the queue", "begin processing tasks", or if tasks seem stuck

---

## File Operations
*Operations for reading and writing files*

### READ_FILE
- **Endpoint**: `POST /api/disk/read-file`
- **Purpose**: Read file contents from disk
- **When to Use**: When you need to examine file contents for user questions or analysis
- **Parameters**: 
  - `filePath` (required): Path to file (absolute or relative)
- **Response**: `{ success: true, content: string, filePath: string }`
- **LLM Usage**: Use when user asks "show me file X", "what's in this file", or you need file content for context

### SAVE_FILE
- **Endpoint**: `POST /api/disk/save-file`
- **Purpose**: Write or update a file on disk (use with caution)
- **When to Use**: When user explicitly wants to create or modify files
- **Parameters**: File path and content data
- **Response**: Write confirmation
- **LLM Usage**: Use only when user explicitly requests file creation/modification

### SAVE_CONTEXT_FILE
- **Endpoint**: `POST /api/disk/save-context-file`
- **Purpose**: Write a generated context documentation file
- **When to Use**: When saving AI-generated context documentation
- **Parameters**: Context file data
- **Response**: Write confirmation
- **LLM Usage**: Use in conjunction with context generation operations

### SAVE_CONTEXTS_BATCH
- **Endpoint**: `POST /api/disk/save-contexts-batch`
- **Purpose**: Write multiple context files in a single operation
- **When to Use**: When generating multiple context files efficiently
- **Parameters**: Batch context data
- **Response**: Batch write confirmation
- **LLM Usage**: Use when generating multiple documentation files at once

---

## AI-Assisted Operations
*Operations that leverage AI for code analysis and generation*

### AI_PROJECT_BACKGROUND
- **Endpoint**: `POST /api/kiro/ai-project-background`
- **Purpose**: Generate background project analysis using AI
- **When to Use**: When user wants AI to analyze and understand project structure/purpose
- **Parameters**: Project analysis parameters
- **Response**: Analysis results
- **LLM Usage**: Use when user asks "analyze this project", "what does this project do", or wants project overview

### AI_PROJECT_REVIEW
- **Endpoint**: `POST /api/kiro/ai-project-review`
- **Purpose**: Run comprehensive AI review over a project (expensive operation)
- **When to Use**: When user wants thorough AI code review and recommendations
- **Parameters**: Review configuration
- **Response**: Review initiation confirmation
- **LLM Usage**: Use when user asks for "full project review", "code analysis", or comprehensive project assessment

---

## Common Parameter Patterns

### Project Identification
Most endpoints require project identification:
- `projectId`: UUID string identifying the project
- `projectName`: Human-readable project name
- `projectPath`: Filesystem path to project root

### Standard Response Format
Most endpoints return:
```json
{
  "success": boolean,
  "data": object | array,
  "message": string,
  "error": string
}
```

### Status Values
Common status values across endpoints:
- `pending`: Waiting to be processed
- `processing`: Currently being worked on
- `completed`: Successfully finished
- `error`: Failed with error
- `cancelled`: Manually cancelled

---

## LLM Decision Guidelines

### 1. Always Start with Read Operations
Before making changes, use GET endpoints to understand current state:
- Check existing contexts, backlog items, projects
- Review folder structure and file contents
- Understand what's already available

### 2. Prefer Safe Operations
- Use read-only operations when possible
- Confirm destructive actions with user
- Start with simpler operations before complex ones

### 3. Match User Intent to Operation Category
- **"Show me..."** → Read-Only Operations
- **"Create/Add..."** → Create Operations (contexts, backlog items)
- **"Generate..."** → AI-Assisted Operations
- **"Update/Change..."** → Update Operations
- **"Delete/Remove..."** → Delete Operations (require confirmation)

### 4. Handle Background Tasks Appropriately
- Use background tasks for expensive operations
- Check task status when operations seem slow
- Guide user to task management when needed

### 5. Validate Parameters
- Always check required parameters before making calls
- Use reasonable defaults for optional parameters
- Validate file paths and project IDs

### 6. Error Handling
- Check response success flags
- Provide helpful error messages to user
- Suggest alternatives when operations fail