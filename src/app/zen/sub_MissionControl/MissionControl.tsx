/**
 * Mission Control Dashboard
 * NASA-inspired cinematic visualization mode for monitoring
 * parallel CLI sessions, device topology, and batch execution.
 *
 * Replaces the utilitarian 2x2 grid with an immersive experience:
 * - TopologyGlobe: Animated device network visualization
 * - MiniTerminalCards: Scalable session monitoring grid (4-100+)
 * - LaunchSequence: Dramatic countdown when batch execution begins
 * - Audio cues: Ambient sounds for task lifecycle events
 */

'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, Volume2, VolumeX, Maximize2, Minimize2, RefreshCw } from 'lucide-react';
import { useCLISessionStore, type CLISessionId } from '@/components/cli/store';
import { useDeviceMeshStore } from '@/stores/deviceMeshStore';
import TopologyGlobe from './components/TopologyGlobe';
import MiniTerminalCard from './components/MiniTerminalCard';
import MissionControlStats from './components/MissionControlStats';
import LaunchSequence from './components/LaunchSequence';
import { playCompletionChime, playFailuretone, playSessionPing } from './lib/audioManager';

const SESSION_IDS: CLISessionId[] = ['cliSession1', 'cliSession2', 'cliSession3', 'cliSession4'];

export default function MissionControl() {
  const sessions = useCLISessionStore((state) => state.sessions);
  const devices = useDeviceMeshStore((s) => s.devices);
  const localDeviceId = useDeviceMeshStore((s) => s.localDeviceId);
  const localDeviceName = useDeviceMeshStore((s) => s.localDeviceName);

  const [audioEnabled, setAudioEnabled] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [launchActive, setLaunchActive] = useState(false);
  const [launchTaskCount, setLaunchTaskCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Track previous completion/failure counts for audio triggers
  const prevCounts = useRef({ completed: 0, failed: 0, running: 0 });

  // Aggregate stats across all sessions
  const stats = useMemo(() => {
    let active = 0, completed = 0, failed = 0, pending = 0, running = 0;
    SESSION_IDS.forEach(id => {
      const s = sessions[id];
      if (s.isRunning) active++;
      s.queue.forEach(t => {
        if (t.status === 'completed') completed++;
        if (t.status === 'failed') failed++;
        if (t.status === 'pending') pending++;
        if (t.status === 'running') running++;
      });
      completed += s.completedCount;
    });
    return { active, completed, failed, pending, running, total: SESSION_IDS.length };
  }, [sessions]);

  // Audio triggers
  useEffect(() => {
    if (!audioEnabled) return;

    if (stats.completed > prevCounts.current.completed) {
      playCompletionChime();
    }
    if (stats.failed > prevCounts.current.failed) {
      playFailuretone();
    }
    if (stats.running > prevCounts.current.running) {
      playSessionPing();
    }

    prevCounts.current = { completed: stats.completed, failed: stats.failed, running: stats.running };
  }, [stats.completed, stats.failed, stats.running, audioEnabled]);

  // Build topology data from devices + local
  const globeData = useMemo(() => {
    const nodes = [
      {
        id: localDeviceId || 'local',
        label: localDeviceName || 'This Device',
        isLocal: true,
        status: stats.active > 0 ? 'busy' as const : 'online' as const,
        sessions: stats.active,
        maxSessions: SESSION_IDS.length,
      },
      ...devices.map(d => ({
        id: d.device_id,
        label: d.device_name || d.device_id.slice(0, 8),
        isLocal: false,
        status: (d.status === 'online' ? 'online' : d.status === 'busy' ? 'busy' : 'offline') as 'online' | 'busy' | 'offline',
        sessions: d.active_sessions || 0,
        maxSessions: d.capabilities?.session_slots || 4,
      })),
    ];

    const edges = devices.map(d => ({
      sourceId: localDeviceId || 'local',
      targetId: d.device_id,
      isActive: d.status === 'online' || d.status === 'busy',
      latencyMs: 50 + Math.random() * 150,
    }));

    return { nodes, edges };
  }, [devices, localDeviceId, localDeviceName, stats.active]);

  // Elapsed time
  const [elapsed, setElapsed] = useState('0m 0s');
  const startTime = useRef(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      const sec = Math.floor((Date.now() - startTime.current) / 1000);
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      setElapsed(m > 0 ? `${m}m ${s}s` : `${s}s`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Launch sequence trigger
  const triggerLaunch = useCallback(() => {
    const totalPending = SESSION_IDS.reduce((sum, id) =>
      sum + sessions[id].queue.filter(t => t.status === 'pending').length, 0
    );
    if (totalPending > 0) {
      setLaunchTaskCount(totalPending);
      setLaunchActive(true);
    }
  }, [sessions]);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  return (
    <>
      <LaunchSequence
        isActive={launchActive}
        taskCount={launchTaskCount}
        onComplete={() => setLaunchActive(false)}
        audioEnabled={audioEnabled}
      />

      <div
        ref={containerRef}
        className="relative min-h-[calc(100vh-120px)] bg-gray-950 text-white overflow-hidden"
      >
        {/* Background grid */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(rgba(6,182,212,0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(6,182,212,0.03) 1px, transparent 1px)
              `,
              backgroundSize: '40px 40px',
            }}
          />
          {/* Vignette */}
          <div className="absolute inset-0 bg-gradient-to-r from-gray-950/60 via-transparent to-gray-950/60" />
          <div className="absolute inset-0 bg-gradient-to-b from-gray-950/40 via-transparent to-gray-950/60" />
        </div>

        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative flex items-center justify-between px-6 py-3 border-b border-gray-800/40"
        >
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
              <Rocket className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white tracking-wide uppercase">Mission Control</h1>
              <p className="text-[10px] text-gray-500 font-mono">Fleet Execution Monitor</p>
            </div>
          </div>

          <MissionControlStats
            totalSessions={stats.total}
            activeSessions={stats.active}
            completedTasks={stats.completed}
            failedTasks={stats.failed}
            pendingTasks={stats.pending}
            elapsed={elapsed}
          />

          <div className="flex items-center gap-2">
            {/* Launch button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={triggerLaunch}
              disabled={stats.pending === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-gray-700 disabled:to-gray-700 disabled:opacity-40 text-white rounded-lg text-xs font-medium transition-all shadow-lg shadow-cyan-500/10"
            >
              <Rocket className="w-3.5 h-3.5" />
              Launch
            </motion.button>

            {/* Audio toggle */}
            <button
              onClick={() => setAudioEnabled(!audioEnabled)}
              className={`p-1.5 rounded-lg border transition-colors ${
                audioEnabled
                  ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                  : 'bg-gray-800/50 border-gray-700/40 text-gray-500 hover:text-gray-300'
              }`}
              title={audioEnabled ? 'Mute audio cues' : 'Enable audio cues'}
            >
              {audioEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>

            {/* Fullscreen toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg border bg-gray-800/50 border-gray-700/40 text-gray-500 hover:text-gray-300 transition-colors"
              title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </motion.header>

        {/* Main content */}
        <div className="relative flex gap-4 p-6">
          {/* Left: Topology Globe */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="w-[340px] flex-shrink-0"
          >
            <div className="mb-3">
              <h2 className="text-[10px] font-mono uppercase tracking-widest text-gray-500">Network Topology</h2>
            </div>
            <TopologyGlobe
              nodes={globeData.nodes}
              edges={globeData.edges}
            />
            {/* Topology legend */}
            <div className="flex items-center gap-3 mt-3 px-2">
              {[
                { color: 'bg-green-500', label: 'Online' },
                { color: 'bg-amber-500', label: 'Busy' },
                { color: 'bg-gray-500', label: 'Offline' },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1.5 text-[9px] text-gray-500">
                  <span className={`w-2 h-2 rounded-full ${color}`} />
                  {label}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right: Session Grid */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="flex-1"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[10px] font-mono uppercase tracking-widest text-gray-500">Session Terminals</h2>
              <span className="text-[10px] font-mono text-gray-600">
                {stats.active} active / {stats.total} total
              </span>
            </div>

            {/* Adaptive grid: 2x2 for 4, scales up for more */}
            <div className={`grid gap-3 ${
              SESSION_IDS.length <= 4 ? 'grid-cols-2' :
              SESSION_IDS.length <= 9 ? 'grid-cols-3' :
              'grid-cols-4'
            }`}>
              <AnimatePresence mode="popLayout">
                {SESSION_IDS.map((id, index) => (
                  <MiniTerminalCard
                    key={id}
                    sessionId={id}
                    session={sessions[id]}
                    index={index}
                    isCompact={SESSION_IDS.length > 9}
                  />
                ))}
              </AnimatePresence>
            </div>

            {/* Remote device sessions (if any devices are busy) */}
            {devices.filter(d => d.status === 'busy').length > 0 && (
              <div className="mt-6">
                <h2 className="text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-3">
                  Remote Sessions
                </h2>
                <div className="grid grid-cols-3 gap-3">
                  {devices
                    .filter(d => d.status === 'busy' || d.status === 'online')
                    .map((device, i) => (
                      <motion.div
                        key={device.device_id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4 + i * 0.1 }}
                        className={`rounded-lg border px-3 py-2.5 ${
                          device.status === 'busy'
                            ? 'border-amber-500/30 bg-amber-500/5'
                            : 'border-gray-700/40 bg-gray-900/40'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className={`w-2 h-2 rounded-full ${
                            device.status === 'busy' ? 'bg-amber-500 animate-pulse' : 'bg-green-500'
                          }`} />
                          <span className="text-xs font-mono text-gray-300 truncate">
                            {device.device_name || device.device_id.slice(0, 12)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[9px] text-gray-500">
                          <span>{device.active_sessions || 0} sessions</span>
                          <span className="text-gray-700">|</span>
                          <span>{device.device_type || 'unknown'}</span>
                        </div>
                      </motion.div>
                    ))
                  }
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </>
  );
}
