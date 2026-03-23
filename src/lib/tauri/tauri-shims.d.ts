// Type shims for @tauri-apps packages (only used when Tauri is installed)
declare module '@tauri-apps/api/core' {
  export function invoke<T>(command: string, args?: Record<string, unknown>): Promise<T>;
}

declare module '@tauri-apps/api/event' {
  export function listen(event: string, handler: (event: { payload: unknown }) => void): Promise<() => void>;
}

declare module '@tauri-apps/plugin-shell' {
  export class Command {
    static create(program: string, args?: string[], options?: Record<string, unknown>): Command;
    on(event: string, handler: (data: unknown) => void): Command;
    execute(): Promise<{ code: number; stdout: string; stderr: string }>;
    spawn(): Promise<{ pid: number; kill: () => Promise<void>; write: (data: string) => Promise<void> }>;
    readonly stdout: { on: (event: string, handler: (data: string) => void) => void };
    readonly stderr: { on: (event: string, handler: (data: string) => void) => void };
  }
}
