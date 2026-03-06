'use client';

import { useEffect, useState, useRef } from 'react';
import type { Group } from '../lib/types';

const SESSION_KEY = 'canvas-focus-hint-shown';

interface FocusHintOverlayProps {
  selectedGroupId: string | null;
  focusedGroupId: string | null;
  groups: Group[];
  transform: { x: number; y: number; k: number };
}

export function FocusHintOverlay({
  selectedGroupId,
  focusedGroupId,
  groups,
  transform,
}: FocusHintOverlayProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    // Don't show if already in focus mode or no group selected
    if (!selectedGroupId || focusedGroupId) {
      setVisible(false);
      return;
    }

    // Check sessionStorage — only show once per session
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
    } catch {
      // sessionStorage unavailable
    }

    setVisible(true);

    // Mark as shown
    try {
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch { /* ignore */ }

    // Auto-dismiss after 3 seconds
    timerRef.current = setTimeout(() => setVisible(false), 3000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [selectedGroupId, focusedGroupId]);

  // Hide immediately when entering focus
  useEffect(() => {
    if (focusedGroupId) setVisible(false);
  }, [focusedGroupId]);

  if (!visible || !selectedGroupId) return null;

  // Compute screen position of the selected group
  const group = groups.find(g => g.id === selectedGroupId);
  if (!group) return null;

  const screenX = group.x * transform.k + transform.x;
  const screenY = group.y * transform.k + transform.y;

  return (
    <div
      className="absolute z-40 pointer-events-none"
      style={{
        left: screenX,
        top: screenY - group.radius * transform.k - 16,
        transform: 'translate(-50%, -100%)',
      }}
    >
      {/* Pulse ring */}
      <div className="relative flex items-center justify-center">
        <div
          className="absolute w-10 h-10 rounded-full border border-purple-400/40"
          style={{
            animation: 'focusPulse 1.5s ease-out infinite',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        />

        {/* Label */}
        <div
          className="relative px-3 py-1.5 rounded-lg bg-zinc-900/90 backdrop-blur-md border border-zinc-700/40 shadow-lg"
          style={{ animation: 'focusFadeIn 0.3s ease-out' }}
        >
          <p className="text-xs text-zinc-300 whitespace-nowrap font-medium">
            Double-click or press <kbd className="px-1 py-0.5 rounded bg-zinc-800 border border-zinc-600/50 text-zinc-200 text-xs font-mono">Enter</kbd> to focus
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes focusPulse {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
          100% { transform: translate(-50%, -50%) scale(2.5); opacity: 0; }
        }
        @keyframes focusFadeIn {
          0% { opacity: 0; transform: translateY(4px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
