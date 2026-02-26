'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, Clock, Sparkles, X, Eye, Maximize2 } from 'lucide-react';
import { usePalaceData } from './lib/usePalaceData';
import type { PalaceRoom, PalaceConnection, PalaceSignal, PalaceMode, ReplayKeyframe } from './lib/palaceTypes';
import { COLORS } from '../sub_MemoryCanvas/lib/constants';
import type { SignalType } from '../sub_MemoryCanvas/lib/types';

// ── Color helpers ────────────────────────────────────────────────────────────

function healthToWarmth(health: number): string {
  // 0 = cold gray-blue, 1 = warm amber-gold
  const r = Math.round(80 + health * 175);
  const g = Math.round(60 + health * 140);
  const b = Math.round(120 - health * 60);
  return `rgb(${r}, ${g}, ${b})`;
}

function healthToGlow(health: number): string {
  const alpha = 0.15 + health * 0.35;
  const r = Math.round(100 + health * 155);
  const g = Math.round(80 + health * 120);
  const b = Math.round(60 + health * 40);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function typeColor(type: SignalType): string {
  return COLORS[type] || '#a855f7';
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function MemoryPalace() {
  const { rooms, connections, signals, insights, reflections, keyframes, timeRange, isLoading, isEmpty } = usePalaceData();

  const [mode, setMode] = useState<PalaceMode>('explore');
  const [selectedRoom, setSelectedRoom] = useState<PalaceRoom | null>(null);
  const [timelineCursor, setTimelineCursor] = useState<number>(timeRange[1]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 800, h: 600 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, vx: 0, vy: 0 });
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Update timeline cursor when timeRange changes
  useEffect(() => {
    setTimelineCursor(timeRange[1]);
  }, [timeRange[1]]);

  // Fit viewbox to rooms
  useEffect(() => {
    if (rooms.length === 0) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const r of rooms) {
      minX = Math.min(minX, r.x - r.radius - 20);
      minY = Math.min(minY, r.y - r.radius - 20);
      maxX = Math.max(maxX, r.x + r.radius + 20);
      maxY = Math.max(maxY, r.y + r.radius + 20);
    }
    const pad = 60;
    setViewBox({
      x: minX - pad,
      y: minY - pad,
      w: maxX - minX + pad * 2,
      h: maxY - minY + pad * 2,
    });
  }, [rooms]);

  // Filter signals by timeline cursor
  const visibleSignals = useMemo(() => {
    if (mode === 'explore') return signals;
    return signals.filter(s => s.timestamp <= timelineCursor);
  }, [signals, timelineCursor, mode]);

  // Visible rooms (rooms that have signals before cursor)
  const visibleRooms = useMemo(() => {
    if (mode === 'explore') return rooms;
    const activeRoomIds = new Set(visibleSignals.map(s => s.roomId));
    return rooms.filter(r => activeRoomIds.has(r.id));
  }, [rooms, visibleSignals, mode]);

  // Visible connections
  const visibleConnections = useMemo(() => {
    const roomIds = new Set(visibleRooms.map(r => r.id));
    return connections.filter(c => roomIds.has(c.sourceId) && roomIds.has(c.targetId));
  }, [connections, visibleRooms]);

  // Room signal counts at current time
  const roomSignalCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of visibleSignals) {
      counts.set(s.roomId, (counts.get(s.roomId) || 0) + 1);
    }
    return counts;
  }, [visibleSignals]);

  // Replay control
  const startReplay = useCallback(() => {
    setMode('replay');
    setTimelineCursor(timeRange[0]);
    setIsPlaying(true);
  }, [timeRange]);

  const stopReplay = useCallback(() => {
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    if (!isPlaying) {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
      return;
    }

    const totalDuration = timeRange[1] - timeRange[0];
    // Complete replay in 15 seconds
    const stepMs = 50;
    const stepTime = totalDuration / (15000 / stepMs);

    playIntervalRef.current = setInterval(() => {
      setTimelineCursor(prev => {
        const next = prev + stepTime;
        if (next >= timeRange[1]) {
          setIsPlaying(false);
          return timeRange[1];
        }
        return next;
      });
    }, stepMs);

    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying, timeRange]);

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    // Only pan if not clicking on a room
    const target = e.target as SVGElement;
    if (target.closest('[data-room]')) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY, vx: viewBox.x, vy: viewBox.y };
  }, [viewBox]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning || !svgRef.current) return;
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const scaleX = viewBox.w / rect.width;
    const scaleY = viewBox.h / rect.height;
    const dx = (e.clientX - panStart.current.x) * scaleX;
    const dy = (e.clientY - panStart.current.y) * scaleY;
    setViewBox(prev => ({ ...prev, x: panStart.current.vx - dx, y: panStart.current.vy - dy }));
  }, [isPanning, viewBox.w, viewBox.h]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.1 : 0.9;
    setViewBox(prev => {
      const newW = prev.w * factor;
      const newH = prev.h * factor;
      const dw = newW - prev.w;
      const dh = newH - prev.h;
      return { x: prev.x - dw / 2, y: prev.y - dh / 2, w: newW, h: newH };
    });
  }, []);

  // Fit all rooms
  const fitToView = useCallback(() => {
    if (rooms.length === 0) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const r of rooms) {
      minX = Math.min(minX, r.x - r.radius - 20);
      minY = Math.min(minY, r.y - r.radius - 20);
      maxX = Math.max(maxX, r.x + r.radius + 20);
      maxY = Math.max(maxY, r.y + r.radius + 20);
    }
    const pad = 60;
    setViewBox({ x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 });
  }, [rooms]);

  // Skip to next keyframe
  const skipToNextKeyframe = useCallback(() => {
    const next = keyframes.find(k => k.timestamp > timelineCursor);
    if (next) setTimelineCursor(next.timestamp);
  }, [keyframes, timelineCursor]);

  const skipToPrevKeyframe = useCallback(() => {
    const prev = [...keyframes].reverse().find(k => k.timestamp < timelineCursor - 1000);
    if (prev) setTimelineCursor(prev.timestamp);
  }, [keyframes, timelineCursor]);

  // Loading / Empty
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: '#0c0c0f' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-400 rounded-full animate-spin" />
          <span className="text-sm text-zinc-500">Building memory palace...</span>
        </div>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: '#0c0c0f' }}>
        <div className="flex flex-col items-center gap-3">
          <Sparkles className="w-12 h-12 text-zinc-600" />
          <h3 className="text-lg font-medium text-zinc-400">No memories yet</h3>
          <p className="text-sm text-zinc-600 max-w-sm text-center">
            Behavioral signals will appear here as you work. Start scanning, implementing, or reviewing contexts.
          </p>
        </div>
      </div>
    );
  }

  const timeProgress = timeRange[1] > timeRange[0]
    ? (timelineCursor - timeRange[0]) / (timeRange[1] - timeRange[0])
    : 1;

  return (
    <div className="flex flex-col h-full w-full" style={{ background: '#0c0c0f' }}>
      {/* SVG Palace View */}
      <div className="flex-1 relative overflow-hidden">
        <svg
          ref={svgRef}
          className="w-full h-full"
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
        >
          <defs>
            {/* Glow filters per room */}
            {visibleRooms.map(room => (
              <filter key={`glow-${room.id}`} id={`glow-${room.id}`} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation={8 + room.health * 12} result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            ))}
            {/* Connection gradient */}
            <linearGradient id="connGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(168,85,247,0.3)" />
              <stop offset="50%" stopColor="rgba(168,85,247,0.08)" />
              <stop offset="100%" stopColor="rgba(168,85,247,0.3)" />
            </linearGradient>
          </defs>

          {/* Ambient background grid */}
          <pattern id="palaceGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(63,63,70,0.08)" strokeWidth="0.5" />
          </pattern>
          <rect x={viewBox.x} y={viewBox.y} width={viewBox.w} height={viewBox.h} fill="url(#palaceGrid)" />

          {/* Connections */}
          {visibleConnections.map((conn, i) => {
            const src = visibleRooms.find(r => r.id === conn.sourceId);
            const tgt = visibleRooms.find(r => r.id === conn.targetId);
            if (!src || !tgt) return null;

            const mx = (src.x + tgt.x) / 2;
            const my = (src.y + tgt.y) / 2 - 30 * conn.strength;
            const opacity = 0.1 + conn.strength * 0.3;

            return (
              <g key={`conn-${i}`}>
                <path
                  d={`M ${src.x} ${src.y} Q ${mx} ${my} ${tgt.x} ${tgt.y}`}
                  fill="none"
                  stroke={conn.reason === 'temporal_proximity' ? 'rgba(59,130,246,0.25)' : 'rgba(168,85,247,0.25)'}
                  strokeWidth={1 + conn.strength * 2}
                  strokeDasharray={conn.reason === 'temporal_proximity' ? '4 4' : 'none'}
                  opacity={opacity}
                />
                {/* Pulse dot along connection during replay */}
                {mode === 'replay' && isPlaying && (
                  <circle r={2} fill="rgba(168,85,247,0.6)">
                    <animateMotion
                      dur={`${2 + (1 - conn.strength) * 3}s`}
                      repeatCount="indefinite"
                      path={`M ${src.x} ${src.y} Q ${mx} ${my} ${tgt.x} ${tgt.y}`}
                    />
                  </circle>
                )}
              </g>
            );
          })}

          {/* Rooms */}
          {visibleRooms.map(room => {
            const signalCount = roomSignalCounts.get(room.id) || 0;
            const dynamicRadius = mode === 'explore'
              ? room.radius
              : Math.max(25, Math.sqrt(signalCount) * 18);
            const isHovered = hoveredRoom === room.id;
            const isSelected = selectedRoom?.id === room.id;
            const warmth = healthToWarmth(room.health);
            const glow = healthToGlow(room.health);
            const accent = typeColor(room.dominantType);

            return (
              <g
                key={room.id}
                data-room={room.id}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredRoom(room.id)}
                onMouseLeave={() => setHoveredRoom(null)}
                onClick={() => setSelectedRoom(isSelected ? null : room)}
              >
                {/* Ambient glow */}
                <circle
                  cx={room.x}
                  cy={room.y}
                  r={dynamicRadius * 1.4}
                  fill={glow}
                  opacity={isHovered ? 0.8 : 0.5}
                />

                {/* Room boundary */}
                <circle
                  cx={room.x}
                  cy={room.y}
                  r={dynamicRadius}
                  fill={`${warmth}10`}
                  stroke={isSelected ? accent : warmth}
                  strokeWidth={isSelected ? 2 : 1}
                  opacity={isHovered ? 0.9 : 0.6}
                />

                {/* Health ring */}
                <circle
                  cx={room.x}
                  cy={room.y}
                  r={dynamicRadius + 4}
                  fill="none"
                  stroke={accent}
                  strokeWidth={1.5}
                  strokeDasharray={`${room.health * Math.PI * 2 * (dynamicRadius + 4)} ${(1 - room.health) * Math.PI * 2 * (dynamicRadius + 4)}`}
                  strokeDashoffset={Math.PI * (dynamicRadius + 4) / 2}
                  opacity={0.4}
                />

                {/* Signal dots inside room */}
                {visibleSignals
                  .filter(s => s.roomId === room.id)
                  .slice(0, 30)
                  .map((sig, si) => {
                    const angle = (si / Math.min(signalCount, 30)) * Math.PI * 2;
                    const dist = dynamicRadius * 0.3 + (si % 3) * dynamicRadius * 0.2;
                    return (
                      <circle
                        key={sig.id}
                        cx={room.x + Math.cos(angle) * dist}
                        cy={room.y + Math.sin(angle) * dist}
                        r={2 + sig.weight}
                        fill={typeColor(sig.type)}
                        opacity={0.5 + sig.weight * 0.2}
                      />
                    );
                  })}

                {/* Room label */}
                <text
                  x={room.x}
                  y={room.y + dynamicRadius + 16}
                  textAnchor="middle"
                  fill={isHovered || isSelected ? '#e4e4e7' : '#71717a'}
                  fontSize={11}
                  fontWeight={isSelected ? 600 : 400}
                  fontFamily="system-ui, sans-serif"
                >
                  {room.name.length > 20 ? room.name.substring(0, 18) + '...' : room.name}
                </text>

                {/* Signal count badge */}
                <text
                  x={room.x}
                  y={room.y + 4}
                  textAnchor="middle"
                  fill="#a1a1aa"
                  fontSize={10}
                  fontFamily="system-ui, sans-serif"
                  opacity={0.7}
                >
                  {signalCount}
                </text>
              </g>
            );
          })}

          {/* Insight crystals */}
          {mode !== 'explore' && insights
            .filter(ins => ins.timestamp <= timelineCursor && ins.roomId)
            .map(ins => {
              const room = visibleRooms.find(r => r.id === ins.roomId);
              if (!room) return null;
              return (
                <g key={`insight-${ins.id}`}>
                  <polygon
                    points={diamondPoints(room.x + room.radius * 0.7, room.y - room.radius * 0.5, 6)}
                    fill="#f59e0b"
                    opacity={0.7}
                  />
                </g>
              );
            })}
        </svg>

        {/* Mode toggle */}
        <div className="absolute top-3 left-3 flex gap-1 bg-zinc-900/80 backdrop-blur-sm rounded-lg border border-zinc-700/30 p-1">
          {(['explore', 'timeline', 'replay'] as PalaceMode[]).map(m => (
            <button
              key={m}
              onClick={() => {
                if (m === 'replay' && mode !== 'replay') {
                  startReplay();
                } else {
                  setMode(m);
                  setIsPlaying(false);
                }
              }}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-all ${
                mode === m
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {m === 'explore' ? 'Explore' : m === 'timeline' ? 'Time Travel' : 'Replay'}
            </button>
          ))}
        </div>

        {/* Fit button */}
        <button
          onClick={fitToView}
          className="absolute top-3 right-3 p-1.5 bg-zinc-900/80 backdrop-blur-sm rounded-lg border border-zinc-700/30 text-zinc-400 hover:text-zinc-200 transition-colors"
          title="Fit to view"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        {/* Room detail panel */}
        <AnimatePresence>
          {selectedRoom && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="absolute top-3 right-12 w-64 bg-zinc-900/95 backdrop-blur-xl rounded-xl border border-zinc-700/40 shadow-2xl overflow-hidden"
            >
              <div className="p-3 border-b border-zinc-800/50 flex items-center justify-between">
                <h3 className="text-sm font-medium text-zinc-200 truncate">{selectedRoom.name}</h3>
                <button onClick={() => setSelectedRoom(null)} className="text-zinc-500 hover:text-zinc-300">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="p-3 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Health</span>
                  <span className="text-zinc-300">{Math.round(selectedRoom.health * 100)}%</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${selectedRoom.health * 100}%`,
                      background: `linear-gradient(90deg, ${healthToWarmth(0.3)}, ${healthToWarmth(selectedRoom.health)})`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Signals</span>
                  <span className="text-zinc-300">{roomSignalCounts.get(selectedRoom.id) || 0}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Dominant</span>
                  <span style={{ color: typeColor(selectedRoom.dominantType) }} className="text-xs font-medium">
                    {selectedRoom.dominantType.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Success Rate</span>
                  <span className="text-zinc-300">{Math.round(selectedRoom.successRate * 100)}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Last Active</span>
                  <span className="text-zinc-400">{formatRelativeTime(selectedRoom.lastActivity)}</span>
                </div>

                {/* Recent signals in this room */}
                <div className="pt-2 border-t border-zinc-800/50">
                  <div className="text-xs text-zinc-500 mb-1.5">Recent signals</div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {visibleSignals
                      .filter(s => s.roomId === selectedRoom.id)
                      .sort((a, b) => b.timestamp - a.timestamp)
                      .slice(0, 8)
                      .map(sig => (
                        <div key={sig.id} className="flex items-center gap-1.5 text-xs">
                          <div
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: typeColor(sig.type) }}
                          />
                          <span className="text-zinc-400 truncate">{sig.summary}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats overlay */}
        <div className="absolute bottom-14 left-3 flex gap-3 text-xs text-zinc-500">
          <span>{visibleRooms.length} rooms</span>
          <span>{visibleSignals.length} signals</span>
          <span>{visibleConnections.length} connections</span>
        </div>
      </div>

      {/* Timeline Scrubber */}
      {(mode === 'timeline' || mode === 'replay') && (
        <div className="flex-shrink-0 border-t border-zinc-800/50 bg-zinc-900/60 backdrop-blur-sm px-4 py-2">
          <div className="flex items-center gap-3">
            {/* Playback controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={skipToPrevKeyframe}
                className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors"
                title="Previous keyframe"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => isPlaying ? stopReplay() : setIsPlaying(true)}
                className="p-1.5 bg-purple-500/20 text-purple-300 rounded-md hover:bg-purple-500/30 transition-colors"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={skipToNextKeyframe}
                className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors"
                title="Next keyframe"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Time display */}
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 shrink-0">
              <Clock className="w-3 h-3" />
              <span>{formatDate(timelineCursor)}</span>
            </div>

            {/* Scrubber track */}
            <div className="flex-1 relative h-6 group">
              {/* Track background */}
              <div className="absolute top-2.5 left-0 right-0 h-1 bg-zinc-800 rounded-full" />
              {/* Progress fill */}
              <div
                className="absolute top-2.5 left-0 h-1 bg-purple-500/50 rounded-full transition-none"
                style={{ width: `${timeProgress * 100}%` }}
              />

              {/* Keyframe markers */}
              {keyframes.map((kf, i) => {
                const pos = (kf.timestamp - timeRange[0]) / (timeRange[1] - timeRange[0]);
                return (
                  <div
                    key={i}
                    className="absolute top-1 w-1.5 h-3 rounded-sm cursor-pointer hover:opacity-100 transition-opacity"
                    style={{
                      left: `${pos * 100}%`,
                      backgroundColor: kf.type === 'reflection_start' ? '#a855f7'
                        : kf.type === 'insight_crystallize' ? '#f59e0b'
                        : kf.type === 'signal_burst' ? '#10b981'
                        : '#3b82f6',
                      opacity: 0.5,
                    }}
                    title={kf.label}
                    onClick={() => setTimelineCursor(kf.timestamp)}
                  />
                );
              })}

              {/* Draggable handle */}
              <input
                type="range"
                min={timeRange[0]}
                max={timeRange[1]}
                value={timelineCursor}
                onChange={e => setTimelineCursor(Number(e.target.value))}
                className="absolute inset-0 w-full opacity-0 cursor-pointer"
              />
              <div
                className="absolute top-1 w-3 h-3 bg-purple-400 rounded-full border-2 border-purple-600 shadow-lg pointer-events-none transition-none"
                style={{ left: `calc(${timeProgress * 100}% - 6px)` }}
              />
            </div>

            {/* Date range */}
            <div className="flex items-center gap-2 text-xs text-zinc-600 shrink-0">
              <span>{formatDateShort(timeRange[0])}</span>
              <span>→</span>
              <span>{formatDateShort(timeRange[1])}</span>
            </div>
          </div>

          {/* Keyframe legend */}
          <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-600">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm bg-emerald-500/60" />
              <span>Signal burst</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm bg-purple-500/60" />
              <span>Reflection</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm bg-amber-500/60" />
              <span>Insight</span>
            </div>
          </div>
        </div>
      )}

      {/* Bottom bar for explore mode */}
      {mode === 'explore' && (
        <div className="flex-shrink-0 border-t border-zinc-800/50 bg-zinc-900/60 backdrop-blur-sm px-4 py-1.5">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> Pan & zoom to explore</span>
              <span>Click rooms to inspect</span>
            </div>
            <div className="flex items-center gap-3">
              {Object.entries(COLORS).map(([type, color]) => (
                <div key={type} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  <span>{type.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function diamondPoints(cx: number, cy: number, size: number): string {
  return `${cx},${cy - size} ${cx + size},${cy} ${cx},${cy + size} ${cx - size},${cy}`;
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function formatDateShort(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
