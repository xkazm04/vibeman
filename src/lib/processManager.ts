import { spawn, exec, ChildProcess } from 'child_process';
import { ProcessInfo } from '@/types';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Logger helper for consistent logging (production-ready - no console output)
function log(context: string, message: string, data?: unknown): void {
  // Silent in production - could integrate with logging service
}

function logError(context: string, message: string, error?: unknown): void {
  // Silent in production - could integrate with logging service
}

function logWarn(context: string, message: string, error?: unknown): void {
  // Silent in production - could integrate with logging service
}

class ProcessManager {
  private static instance: ProcessManager;
  private processes: Map<string, ProcessInfo> = new Map();
  private childProcesses: Map<string, ChildProcess> = new Map();
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

    log('initialize', 'Detecting existing processes...');
    await this.detectExistingProcesses();
    this.initialized = true;
  }

  private async detectExistingProcesses(): Promise<void> {
    try {
      // Import dynamically to avoid circular dependency
      const { projectDb } = await import('./project_database');
      const projects = projectDb.projects.getAll();
      log('detectExistingProcesses', 'Checking projects', projects.map(p => `${p.name}:${p.port}`));

      for (const project of projects) {
        if (!project.port) continue;
        log('detectExistingProcesses', `Checking port ${project.port} for ${project.name}`);
        const isRunning = await this.isPortInUse(project.port);
        log('detectExistingProcesses', `Port ${project.port} in use: ${isRunning}`);

        if (isRunning) {
          log('detectExistingProcesses', `Found existing process on port ${project.port}`);

          // Try to get the PID
          const pid = await this.getPidForPort(project.port);
          log('detectExistingProcesses', `PID for port ${project.port}: ${pid}`);

          // Only add if we can get a valid PID (more reliable detection)
          if (pid && pid > 0) {
            // Create a process info entry for the existing process
            const processInfo: ProcessInfo = {
              pid: pid,
              port: project.port,
              status: 'running',
              startTime: new Date(), // We don't know the actual start time
              logs: [`[INFO] Detected existing process on port ${project.port} (PID: ${pid})`]
            };

            this.processes.set(project.id, processInfo);
            this.logBuffers.set(project.id, processInfo.logs);

            log('detectExistingProcesses', `Added process for ${project.id}`, processInfo);
          } else {
            log('detectExistingProcesses', `Port ${project.port} in use but no PID - skipping`);
          }
        } else {
          // Port is not in use, make sure we don't have any stale entries
          if (this.processes.has(project.id)) {
            log('detectExistingProcesses', `Removing stale entry for ${project.id}`);
            this.processes.delete(project.id);
            this.logBuffers.delete(project.id);
            this.childProcesses.delete(project.id);
          }
        }
      }

      log('initialize', `Complete. Found ${this.processes.size} running processes`);
    } catch (error) {
      logError('detectExistingProcesses', 'Error', error);
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
      logWarn('getPidForPort', `Could not get PID for port ${port}`, error);
    }
    return null;
  }

  async startProcess(projectId: string, path: string, port: number): Promise<void> {
    log('startProcess', `Starting ${projectId} at ${path} on port ${port}`);
    
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

      log('startProcess', `Process started with PID: ${child.pid}`);

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
        log(projectId, `stdout: ${data.toString()}`);
      });

      // Handle stderr
      child.stderr?.on('data', (data) => {
        const lines = data.toString().split('\n').filter(Boolean);
        logs.push(...lines.map((l: string) => `[ERROR] ${l}`));
        if (logs.length > this.maxLogLines) {
          logs.splice(0, logs.length - this.maxLogLines);
        }
        log(projectId, `stderr: ${data.toString()}`);
      });

      // Handle process errors
      child.on('error', (error) => {
        logError(projectId, 'Process error', error);
        const process = this.processes.get(projectId);
        if (process) {
          process.status = 'error';
        }
        logs.push(`[ERROR] Process error: ${error.message}`);
      });

      // Handle process exit
      child.on('exit', (code, signal) => {
        log(projectId, `Process exited with code ${code} and signal ${signal}`);
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
      log('startProcess', `Started ${projectId} with PID ${child.pid}`);

      // Wait a bit to ensure process is fully started
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      logError('startProcess', `Failed to start ${projectId}`, error);
      throw error;
    }
  }

  async stopProcess(projectId: string): Promise<void> {
    log('stopProcess', `Stopping ${projectId}`);

    // Initialize if not already done
    await this.initialize();

    const processInfo = this.processes.get(projectId);
    const child = this.childProcesses.get(projectId);

    log('stopProcess', `Process info for ${projectId}`, processInfo);
    log('stopProcess', `Child process exists: ${!!child}`);

    if (!processInfo || processInfo.status !== 'running') {
      log('stopProcess', `Process ${projectId} not running (status: ${processInfo?.status})`);
      throw new Error('Process not running');
    }

    try {
      if (child) {
        // Process we started - use child process control
        log('stopProcess', `Killing child process ${projectId} with PID ${child.pid}`);
        child.kill('SIGTERM');

        // Wait for graceful shutdown
        await new Promise<void>((resolve) => {
          let timeout = setTimeout(() => {
            // Force kill if not stopped
            log('stopProcess', `Graceful shutdown timeout, force killing ${projectId}`);
            child.kill('SIGKILL');
            resolve();
          }, 5000);

          child.on('exit', () => {
            log('stopProcess', `Child process ${projectId} exited`);
            clearTimeout(timeout);
            resolve();
          });
        });
      } else if (processInfo.pid && processInfo.pid > 0) {
        // Process we detected - use OS-level kill
        log('stopProcess', `Stopping detected process ${projectId} with PID ${processInfo.pid}`);
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
          log('stopProcess', `Port ${processInfo.port} still in use, force killing PID ${processInfo.pid}`);
          if (process.platform === 'win32') {
            await execAsync(`taskkill /PID ${processInfo.pid} /T /F`);
          } else {
            await execAsync(`kill -KILL ${processInfo.pid}`);
          }
        }
      } else {
        // No PID available, can't stop the process
        log('stopProcess', `No PID available for ${projectId}, cannot stop`);
        throw new Error('Cannot stop process: no PID available');
      }

      // Verify the process is actually stopped by checking the port
      const portStillInUse = await this.isPortInUse(processInfo.port);
      log('stopProcess', `After stop attempt, port ${processInfo.port} still in use: ${portStillInUse}`);

      if (portStillInUse) {
        logWarn('stopProcess', `Port ${processInfo.port} still in use after stop attempt ${projectId}`);
        // Don't mark as stopped if port is still in use
        processInfo.status = 'error';
        const logs = this.logBuffers.get(projectId);
        if (logs) {
          logs.push('[ERROR] Failed to stop process - port still in use');
        }
      } else {
        log('stopProcess', `Successfully stopped ${projectId}, marking as stopped`);
        processInfo.status = 'stopped';
        // Add stop log
        const logs = this.logBuffers.get(projectId);
        if (logs) {
          logs.push('[INFO] Process stopped');
        }
      }

      this.childProcesses.delete(projectId);

    } catch (error) {
      logError('stopProcess', `Error stopping ${projectId}`, error);
      // Check if process is actually stopped despite the error
      const portStillInUse = await this.isPortInUse(processInfo.port);
      log('stopProcess', `After error, port ${processInfo.port} still in use: ${portStillInUse}`);

      if (portStillInUse) {
        processInfo.status = 'error';
        const logs = this.logBuffers.get(projectId);
        if (logs) {
          logs.push(`[ERROR] Failed to stop process: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else {
        log('stopProcess', `Process ${projectId} appears stopped despite error`);
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
    log('getStatus', `Called for ${projectId}`);
    log('getStatus', 'Current processes', Array.from(this.processes.keys()));

    const status = this.processes.get(projectId) || null;
    log('getStatus', `Status for ${projectId}`, status);

    return status;
  }

  async getAllStatuses(): Promise<Record<string, ProcessInfo>> {
    // Initialize if not already done
    await this.initialize();

    log('getAllStatuses', `Checking ${this.processes.size} processes`);
    const statuses: Record<string, ProcessInfo> = {};

    // Process each entry and check status properly
    for (const [id, info] of this.processes) {
      log('getAllStatuses', `Checking ${id}: status=${info.status}, port=${info.port}`);
      const child = this.childProcesses.get(id);

      if (info.status === 'running') {
        if (child && (child.killed || child.exitCode !== null)) {
          // Child process we control has exited
          log('getAllStatuses', `${id}: Child process exited, marking as stopped`);
          info.status = 'stopped';
        } else if (!child) {
          // Process we detected - check if port is still in use
          log('getAllStatuses', `${id}: Checking if port ${info.port} is still in use`);
          const portInUse = await this.isPortInUse(info.port);
          log('getAllStatuses', `${id}: Port ${info.port} in use: ${portInUse}`);
          if (!portInUse) {
            log('getAllStatuses', `${id}: Port no longer in use, marking as stopped`);
            info.status = 'stopped';
          }
        }
      } else if (info.status === 'error') {
        // Re-check error state processes - they might have recovered
        log('getAllStatuses', `${id}: Re-checking error state process`);
        const portInUse = await this.isPortInUse(info.port);
        log('getAllStatuses', `${id}: Port ${info.port} in use: ${portInUse}`);
        if (!portInUse) {
          log('getAllStatuses', `${id}: Port no longer in use, recovered from error`);
          info.status = 'stopped';
          const logs = this.logBuffers.get(id);
          if (logs) {
            logs.push('[INFO] Process recovered from error state - port is now free');
          }
        } else if (child && !child.killed && child.exitCode === null) {
          // Child process is still running, mark as running
          log('getAllStatuses', `${id}: Child still running, recovered from error`);
          info.status = 'running';
          const logs = this.logBuffers.get(id);
          if (logs) {
            logs.push('[INFO] Process recovered from error state - now running normally');
          }
        }
      }

      // Only include running and error processes in the status
      // Stopped processes should be cleaned up and not returned
      if (info.status === 'running' || info.status === 'error') {
        statuses[id] = info;
      } else if (info.status === 'stopped') {
        log('getAllStatuses', `${id}: Stopped, removing from manager`);
        // Clean up stopped processes immediately
        this.processes.delete(id);
        this.logBuffers.delete(id);
        this.childProcesses.delete(id);
      }
    }

    log('getAllStatuses', `Returning ${Object.keys(statuses).length} statuses`);
    return statuses;
  }

  getLogs(projectId: string): string[] {
    return this.logBuffers.get(projectId) || [];
  }

  // Clear error state and allow manual recovery
  clearErrorState(projectId: string): void {
    const process = this.processes.get(projectId);
    if (process && process.status === 'error') {
      log('clearErrorState', `Clearing error state for ${projectId}`);
      process.status = 'stopped';
      const logs = this.logBuffers.get(projectId);
      if (logs) {
        logs.push('[INFO] Error state cleared manually');
      }
    }
  }

  // Remove a process completely (for cleanup)
  removeProcess(projectId: string): void {
    log('removeProcess', `Removing process ${projectId}`);
    this.processes.delete(projectId);
    this.logBuffers.delete(projectId);
    this.childProcesses.delete(projectId);
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