import { describe, it, expect, vi } from 'vitest';
import { hasCapability, createStrategy } from './executionStrategy';
import './strategies/terminalStrategy';
import './strategies/queueStrategy';
import './strategies/remoteMeshStrategy';
import './strategies/vscodeStrategy';

describe('ExecutionStrategy Capabilities', () => {
  it('TerminalStrategy should have stream and status capabilities', () => {
    const strategy = createStrategy('terminal');
    expect(strategy.capabilities).toContain('stream');
    expect(strategy.capabilities).toContain('status');
    expect(hasCapability(strategy, 'stream')).toBe(true);
    expect(hasCapability(strategy, 'status')).toBe(true);
    
    // Type narrowing check (runtime)
    if (hasCapability(strategy, 'stream')) {
      expect(typeof strategy.stream).toBe('function');
    }
    if (hasCapability(strategy, 'status')) {
      expect(typeof strategy.getStatus).toBe('function');
    }
  });

  it('QueueStrategy should have stream and status capabilities', () => {
    const strategy = createStrategy('queue');
    expect(strategy.capabilities).toContain('stream');
    expect(strategy.capabilities).toContain('status');
    expect(hasCapability(strategy, 'stream')).toBe(true);
    expect(hasCapability(strategy, 'status')).toBe(true);
  });

  it('VSCodeStrategy should have stream and status capabilities', () => {
    const strategy = createStrategy('vscode');
    expect(strategy.capabilities).toContain('stream');
    expect(strategy.capabilities).toContain('status');
    expect(hasCapability(strategy, 'stream')).toBe(true);
    expect(hasCapability(strategy, 'status')).toBe(true);
  });

  it('RemoteMeshStrategy should have status but NOT stream capability', () => {
    const strategy = createStrategy('remote-mesh');
    expect(strategy.capabilities).toContain('status');
    expect(strategy.capabilities).not.toContain('stream');
    expect(hasCapability(strategy, 'status')).toBe(true);
    expect(hasCapability(strategy, 'stream')).toBe(false);
  });

  it('hasCapability should correctly narrow types', () => {
    // This is mostly a compile-time check, but we can verify the logic
    const mockStrategy: any = {
      name: 'Mock',
      capabilities: ['status'],
      getStatus: vi.fn(),
    };

    expect(hasCapability(mockStrategy, 'status')).toBe(true);
    expect(hasCapability(mockStrategy, 'stream')).toBe(false);
  });
});
