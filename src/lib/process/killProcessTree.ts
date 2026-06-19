import { execFile } from 'child_process';
import type { ChildProcess } from 'child_process';

/**
 * Kill a spawned CLI process AND its entire child tree.
 *
 * Claude CLI processes are spawned with `shell: isWindows`, so on Windows the OS child is
 * a `cmd.exe` wrapper that launches the real `node claude` grandchild. `childProcess.kill()`
 * signals ONLY the shell — the underlying node CLI keeps running as a zombie, holding the
 * model session, file handles, repo write access, and ~200-500MB of RAM (and it isn't in
 * the in-memory execution map, so it bypasses MAX_CONCURRENT_EXECUTIONS). `taskkill /T /F`
 * terminates the whole tree by the shell's pid; `/T` recurses to the grandchild even though
 * we only hold the shell's pid.
 *
 * On non-Windows the spawn is not shell-wrapped, so a plain kill() reaches the CLI.
 */
export function killProcessTree(child: ChildProcess | null | undefined): void {
  if (!child) return;

  const pid = child.pid;
  if (process.platform === 'win32' && pid) {
    try {
      // Best-effort, async; the callback swallows "process not found" (already exited).
      execFile('taskkill', ['/pid', String(pid), '/T', '/F'], () => { /* best-effort */ });
      return;
    } catch {
      // Fall through to a plain kill if taskkill couldn't be launched.
    }
  }

  try {
    child.kill();
  } catch {
    // Already dead — nothing to do.
  }
}
