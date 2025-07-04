import { spawn, exec } from 'child_process';
import { ProcessInfo } from '@/types';
import { promisify } from 'util';

const execAsync = promisify(exec);

class ProcessManager {
  private static instance: ProcessManager;
  private processes: Map<string, ProcessInfo> = new Map();
  private childProcesses: Map<string, any> = new Map();
  private logBuffers: Map<string, string[]> = new Map();
  private maxLogLines = 100;
  private initialized = false;

  private constructor() {
    // Singleton pattern
  }

  static getInstance(): ProcessManager {
    if (!ProcessManager.instance) {
      ProcessManager.instance = new ProcessManager();
    }
    return ProcessManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    console.log('Initializing ProcessManager - detecting existing processes...');
    await this.detectExistingProcesses();
    this.initialized = true;
  }

  private async detectExistingProcesses(): Promise<void> {
    try {
      // Import dynamically to avoid circular dependency
      const { useProjectConfigStore } = await import('../stores/projectConfigStore');
      const projects = useProjectConfigStore.getState().getAllProjects();
      console.log('Checking for existing processes for projects:', projects.map((p: any) => `${p.name}:${p.port}`));
      
      for (const project of projects) {
        console.log(`Checking port ${project.port} for project ${project.name}...`);
        const isRunning = await this.isPortInUse(project.port);
        console.log(`Port ${project.port} in use: ${isRunning}`);
        
        if (isRunning) {
          console.log(`Found existing process on port ${project.port} for project ${project.name}`);
          
          // Try to get the PID
          const pid = await this.getPidForPort(project.port);
          console.log(`PID for port ${project.port}: ${pid}`);
          
          // Create a process info entry for the existing process
          const processInfo: ProcessInfo = {
            pid: pid || 0,
            port: project.port,
            status: 'running',
            startTime: new Date(), // We don't know the actual start time
            logs: [`[INFO] Detected existing process on port ${project.port}${pid ? ` (PID: ${pid})` : ''}`]
          };
          
          this.processes.set(project.id, processInfo);
          this.logBuffers.set(project.id, processInfo.logs);
          
          console.log(`Added existing process for ${project.id}:`, processInfo);
        }
      }
      
      console.log(`ProcessManager initialization complete. Found ${this.processes.size} running processes.`);
    } catch (error) {
      console.error('Error detecting existing processes:', error);
    }
  }

  private async getPidForPort(port: number): Promise<number | null> {
    try {
      const command = process.platform === 'win32'
        ? `netstat -ano | findstr :${port}`
        : `lsof -t -i :${port}`;
        
      const { stdout } = await execAsync(command);
      
      if (process.platform === 'win32') {
        // Parse Windows netstat output
        const lines = stdout.trim().split('\n');
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 5 && parts[1].includes(`:${port}`)) {
            const pid = parseInt(parts[4]);
            if (!isNaN(pid)) {
              return pid;
            }
          }
        }
      } else {
        // Parse Unix lsof output
        const pid = parseInt(stdout.trim());
        if (!isNaN(pid)) {
          return pid;
        }
      }
    } catch (error) {
      console.warn(`Could not get PID for port ${port}:`, error);
    }
    return null;
  }

  async startProcess(projectId: string, path: string, port: number): Promise<void> {
    console.log(`Starting process for ${projectId} at ${path} on port ${port}`);
    
    // Initialize if not already done
    await this.initialize();
    
    // Check if process already running
    if (this.processes.has(projectId)) {
      const process = this.processes.get(projectId)!;
      if (process.status === 'running') {
        throw new Error('Process already running');
      }
    }

    // Check if port is available
    const portInUse = await this.isPortInUse(port);
    if (portInUse) {
      // Try to get the PID to provide more info
      const pid = await this.getPidForPort(port);
      const pidInfo = pid ? ` (PID: ${pid})` : '';
      throw new Error(`Port ${port} is already in use${pidInfo}. Please stop the existing process first or use a different port.`);
    }

    try {
      // Start the process
      const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
      const child = spawn(npmCmd, ['run', 'dev', '--', '-p', port.toString()], {
        cwd: path,
        shell: process.platform === 'win32',
        env: { 
          ...process.env, 
          PORT: port.toString(),
          FORCE_COLOR: '1'
        },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      if (!child.pid) {
        throw new Error('Failed to start process - no PID assigned');
      }

      console.log(`Process started with PID: ${child.pid}`);

      // Initialize log buffer
      const logs: string[] = [`[INFO] Starting server on port ${port}...`];
      this.logBuffers.set(projectId, logs);

      // Handle stdout
      child.stdout?.on('data', (data) => {
        const lines = data.toString().split('\n').filter(Boolean);
        logs.push(...lines);
        if (logs.length > this.maxLogLines) {
          logs.splice(0, logs.length - this.maxLogLines);
        }
        console.log(`[${projectId}] stdout:`, data.toString());
      });

      // Handle stderr
      child.stderr?.on('data', (data) => {
        const lines = data.toString().split('\n').filter(Boolean);
        logs.push(...lines.map((l: string) => `[ERROR] ${l}`));
        if (logs.length > this.maxLogLines) {
          logs.splice(0, logs.length - this.maxLogLines);
        }
        console.log(`[${projectId}] stderr:`, data.toString());
      });

      // Handle process errors
      child.on('error', (error) => {
        console.error(`[${projectId}] Process error:`, error);
        const process = this.processes.get(projectId);
        if (process) {
          process.status = 'error';
        }
        logs.push(`[ERROR] Process error: ${error.message}`);
      });

      // Handle process exit
      child.on('exit', (code, signal) => {
        console.log(`[${projectId}] Process exited with code ${code} and signal ${signal}`);
        const process = this.processes.get(projectId);
        if (process) {
          process.status = code === 0 ? 'stopped' : 'error';
        }
        this.childProcesses.delete(projectId);
        logs.push(`[INFO] Process exited with code ${code}`);
      });

      // Store child process reference
      this.childProcesses.set(projectId, child);

      // Store process info
      const processInfo = {
        pid: child.pid,
        port,
        status: 'running' as const,
        startTime: new Date(),
        logs
      };
      this.processes.set(projectId, processInfo);
      console.log(`Started process for ${projectId} with PID ${child.pid}`);

      // Wait a bit to ensure process is fully started
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`Failed to start process for ${projectId}:`, error);
      throw error;
    }
  }

  async stopProcess(projectId: string): Promise<void> {
    console.log(`Stopping process for ${projectId}`);
    
    // Initialize if not already done
    await this.initialize();
    
    const processInfo = this.processes.get(projectId);
    const child = this.childProcesses.get(projectId);
    
    if (!processInfo || processInfo.status !== 'running') {
      throw new Error('Process not running');
    }

    try {
      if (child) {
        // Process we started - use child process control
        child.kill('SIGTERM');
        
        // Wait for graceful shutdown
        await new Promise<void>((resolve) => {
          let timeout = setTimeout(() => {
            // Force kill if not stopped
            child.kill('SIGKILL');
            resolve();
          }, 5000);
          
          child.on('exit', () => {
            clearTimeout(timeout);
            resolve();
          });
        });
      } else if (processInfo.pid && processInfo.pid > 0) {
        // Process we detected - use OS-level kill
        console.log(`Stopping detected process with PID ${processInfo.pid}`);
        if (process.platform === 'win32') {
          await execAsync(`taskkill /PID ${processInfo.pid} /T /F`);
        } else {
          await execAsync(`kill -TERM ${processInfo.pid}`);
        }
        
        // Wait a bit and verify the process is actually stopped
        await new Promise(resolve => setTimeout(resolve, 2000));
        const portStillInUse = await this.isPortInUse(processInfo.port);
        if (portStillInUse) {
          // Try force kill
          if (process.platform === 'win32') {
            await execAsync(`taskkill /PID ${processInfo.pid} /T /F`);
          } else {
            await execAsync(`kill -KILL ${processInfo.pid}`);
          }
        }
      } else {
        // No PID available, can't stop the process
        throw new Error('Cannot stop process: no PID available');
      }
      
      // Verify the process is actually stopped by checking the port
      const portStillInUse = await this.isPortInUse(processInfo.port);
      if (portStillInUse) {
        console.warn(`Port ${processInfo.port} still in use after attempting to stop process ${projectId}`);
        // Don't mark as stopped if port is still in use
        processInfo.status = 'error';
        const logs = this.logBuffers.get(projectId);
        if (logs) {
          logs.push('[ERROR] Failed to stop process - port still in use');
        }
      } else {
        processInfo.status = 'stopped';
        // Add stop log
        const logs = this.logBuffers.get(projectId);
        if (logs) {
          logs.push('[INFO] Process stopped');
        }
      }
      
      this.childProcesses.delete(projectId);
      
    } catch (error) {
      console.error(`Error stopping process for ${projectId}:`, error);
      // Check if process is actually stopped despite the error
      const portStillInUse = await this.isPortInUse(processInfo.port);
      if (portStillInUse) {
        processInfo.status = 'error';
        const logs = this.logBuffers.get(projectId);
        if (logs) {
          logs.push(`[ERROR] Failed to stop process: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else {
        processInfo.status = 'stopped';
        const logs = this.logBuffers.get(projectId);
        if (logs) {
          logs.push('[INFO] Process stopped (verified by port check)');
        }
      }
      this.childProcesses.delete(projectId);
    }
  }

  getStatus(projectId: string): ProcessInfo | null {
    return this.processes.get(projectId) || null;
  }

  async getAllStatuses(): Promise<Record<string, ProcessInfo>> {
    // Initialize if not already done
    await this.initialize();
    
    console.log(`getAllStatuses: checking ${this.processes.size} processes`);
    const statuses: Record<string, ProcessInfo> = {};
    
    // Process each entry and check status properly
    for (const [id, info] of this.processes) {
      console.log(`Checking status for ${id}: current status = ${info.status}, port = ${info.port}`);
      const child = this.childProcesses.get(id);
      
      if (info.status === 'running') {
        if (child && (child.killed || child.exitCode !== null)) {
          // Child process we control has exited
          console.log(`${id}: Child process has exited, marking as stopped`);
          info.status = 'stopped';
        } else if (!child) {
          // Process we detected - check if port is still in use
          console.log(`${id}: Checking if port ${info.port} is still in use...`);
          const portInUse = await this.isPortInUse(info.port);
          console.log(`${id}: Port ${info.port} in use: ${portInUse}`);
          if (!portInUse) {
            console.log(`${id}: Port no longer in use, marking as stopped`);
            info.status = 'stopped';
          }
        }
      }
      
      statuses[id] = info;
    }
    
    console.log(`getAllStatuses: returning ${Object.keys(statuses).length} statuses`);
    return statuses;
  }

  getLogs(projectId: string): string[] {
    return this.logBuffers.get(projectId) || [];
  }

  private async isPortInUse(port: number): Promise<boolean> {
    try {
      const command = process.platform === 'win32'
        ? `netstat -ano | findstr :${port}`
        : `lsof -i :${port}`;
        
      const { stdout } = await execAsync(command);
      return stdout.trim().length > 0;
    } catch {
      // Command failed, assume port is free
      return false;
    }
  }
}

export const processManager = ProcessManager.getInstance();