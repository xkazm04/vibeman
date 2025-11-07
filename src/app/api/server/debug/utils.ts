/**
 * Shared utilities for debug API routes
 */

/**
 * Get platform-specific port check command
 */
export function getPortCheckCommand(port: number): string {
  return process.platform === 'win32'
    ? `netstat -ano | findstr :${port}`
    : `lsof -i :${port}`;
}

/**
 * Get platform-specific kill command
 */
export function getKillCommand(pid: number): string {
  return process.platform === 'win32'
    ? `taskkill /PID ${pid} /T /F`
    : `kill -KILL ${pid}`;
}

/**
 * Get process command lookup command for current platform
 */
export function getProcessCommandLookup(pid: number): string {
  return process.platform === 'win32'
    ? `wmic process where processid=${pid} get commandline /format:list`
    : `ps -p ${pid} -o command=`;
}

/**
 * Extract command from command lookup output
 */
export function extractCommand(output: string, platform: string): string {
  if (platform === 'win32') {
    const match = output.match(/CommandLine=(.+)/);
    return match ? match[1].trim() : '';
  }
  return output.trim();
}
