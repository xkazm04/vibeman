// mcp-task-server.js
// A custom MCP server that interfaces with your NextJS task generator

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const fs = require('fs').promises;
const path = require('path');

class TaskExecutorServer {
  constructor() {
    this.server = new Server(
      {
        name: 'task-executor',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  setupHandlers() {
    // List available tools
    this.server.setRequestHandler('tools/list', async () => ({
      tools: [
        {
          name: 'list_tasks',
          description: 'List all available tasks from the task queue',
          inputSchema: {
            type: 'object',
            properties: {
              status: {
                type: 'string',
                enum: ['all', 'pending', 'in-progress', 'completed'],
                default: 'pending'
              }
            }
          }
        },
        {
          name: 'get_task',
          description: 'Get details of a specific task',
          inputSchema: {
            type: 'object',
            properties: {
              taskId: { type: 'string' }
            },
            required: ['taskId']
          }
        },
        {
          name: 'execute_task',
          description: 'Execute a specific task with full implementation instructions',
          inputSchema: {
            type: 'object',
            properties: {
              taskId: { type: 'string' },
              autoCommit: { type: 'boolean', default: false }
            },
            required: ['taskId']
          }
        },
        {
          name: 'update_task_status',
          description: 'Update the status of a task',
          inputSchema: {
            type: 'object',
            properties: {
              taskId: { type: 'string' },
              status: {
                type: 'string',
                enum: ['pending', 'in-progress', 'completed']
              },
              branch: { type: 'string' },
              pr: { type: 'string' }
            },
            required: ['taskId', 'status']
          }
        },
        {
          name: 'get_next_task',
          description: 'Get the next task to execute based on priority',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        }
      ]
    }));

    // Handle tool calls
    this.server.setRequestHandler('tools/call', async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'list_tasks':
          return this.listTasks(args.status || 'all');
        
        case 'get_task':
          return this.getTask(args.taskId);
        
        case 'execute_task':
          return this.executeTask(args.taskId, args.autoCommit);
        
        case 'update_task_status':
          return this.updateTaskStatus(args);
        
        case 'get_next_task':
          return this.getNextTask();
        
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  async listTasks(status) {
    try {
      const manifestPath = path.join(process.cwd(), 'cursor-tasks', '_manifest.json');
      const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));
      
      let tasks = manifest.tasks;
      if (status !== 'all') {
        tasks = tasks.filter(t => t.status === status);
      }

      return {
        content: [
          {
            type: 'text',
            text: `Found ${tasks.length} tasks with status: ${status}\n\n` +
                  tasks.map(t => `- ${t.id}: ${t.file} (${t.status})`).join('\n')
          }
        ]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error listing tasks: ${error.message}`
        }]
      };
    }
  }

  async getTask(taskId) {
    try {
      const taskPath = path.join(process.cwd(), 'cursor-tasks', `${taskId}.md`);
      const taskContent = await fs.readFile(taskPath, 'utf-8');
      
      return {
        content: [{
          type: 'text',
          text: taskContent
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error reading task ${taskId}: ${error.message}`
        }]
      };
    }
  }

  async executeTask(taskId, autoCommit) {
    try {
      const taskContent = await this.getTask(taskId);
      
      // Update status to in-progress
      await this.updateTaskStatus({
        taskId,
        status: 'in-progress'
      });

      const instructions = `
EXECUTING TASK: ${taskId}

${taskContent.content[0].text}

EXECUTION MODE: ${autoCommit ? 'Auto-commit enabled' : 'Manual commit required'}

Please follow the task instructions above and:
1. Create the appropriate branch
2. Implement all requirements
3. Run tests
4. ${autoCommit ? 'Commit and create PR' : 'Prepare changes for review'}
`;

      return {
        content: [{
          type: 'text',
          text: instructions
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error executing task: ${error.message}`
        }]
      };
    }
  }

  async updateTaskStatus(args) {
    try {
      const manifestPath = path.join(process.cwd(), 'cursor-tasks', '_manifest.json');
      const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));
      
      const taskIndex = manifest.tasks.findIndex(t => t.id === args.taskId);
      if (taskIndex === -1) {
        throw new Error(`Task ${args.taskId} not found`);
      }

      manifest.tasks[taskIndex].status = args.status;
      if (args.branch) manifest.tasks[taskIndex].branch = args.branch;
      if (args.pr) manifest.tasks[taskIndex].pr = args.pr;

      await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

      return {
        content: [{
          type: 'text',
          text: `Updated task ${args.taskId} status to ${args.status}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error updating task status: ${error.message}`
        }]
      };
    }
  }

  async getNextTask() {
    try {
      const manifestPath = path.join(process.cwd(), 'cursor-tasks', '_manifest.json');
      const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));
      
      // Find the next pending task
      const nextTask = manifest.tasks.find(t => t.status === 'pending');
      
      if (!nextTask) {
        return {
          content: [{
            type: 'text',
            text: 'No pending tasks found'
          }]
        };
      }

      // Get the full task content
      return this.getTask(nextTask.id);
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error getting next task: ${error.message}`
        }]
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Task Executor MCP server running on stdio');
  }
}

// Run the server
const server = new TaskExecutorServer();
server.run().catch(console.error); 