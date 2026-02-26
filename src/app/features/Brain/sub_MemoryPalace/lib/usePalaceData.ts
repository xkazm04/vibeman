/**
 * usePalaceData
 * Fetches behavioral signals and transforms them into Memory Palace rooms,
 * connections, and temporal snapshots.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import * as d3 from 'd3';
import { useClientProjectStore } from '@/stores/clientProjectStore';
import type { DbBehavioralSignal } from '@/app/db/models/brain.types';
import type { SignalType } from '../../sub_MemoryCanvas/lib/types';
import { safeResponseJson, parseApiResponse, BrainSignalsResponseSchema } from '@/lib/apiResponseGuard';
import type {
  PalaceRoom,
  PalaceConnection,
  PalaceSignal,
  PalaceInsight,
  PalaceReflection,
  ReplayKeyframe,
} from './palaceTypes';

const WINDOW_DAYS = 30;
const MAX_SIGNALS = 500;
const VALID_TYPES: SignalType[] = ['git_activity', 'api_focus', 'context_focus', 'implementation'];

interface PalaceData {
  rooms: PalaceRoom[];
  connections: PalaceConnection[];
  signals: PalaceSignal[];
  insights: PalaceInsight[];
  reflections: PalaceReflection[];
  keyframes: ReplayKeyframe[];
  timeRange: [number, number];
  isLoading: boolean;
  isEmpty: boolean;
}

export function usePalaceData(): PalaceData {
  const activeProject = useClientProjectStore(s => s.activeProject);
  const [rawSignals, setRawSignals] = useState<DbBehavioralSignal[]>([]);
  const [rawInsights, setRawInsights] = useState<Array<{ id: string; content: string; context_id: string | null; effectiveness_score: number | null; created_at: string }>>([]);
  const [rawReflections, setRawReflections] = useState<Array<{ id: string; created_at: string; scope: string; insight_count: number; signal_count: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async (projectId: string) => {
    try {
      const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
      const params = new URLSearchParams({ projectId, limit: String(MAX_SIGNALS), since });

      const [signalRes, insightRes, reflectionRes] = await Promise.allSettled([
        fetch(`/api/brain/signals?${params.toString()}`),
        fetch(`/api/brain/insights?projectId=${encodeURIComponent(projectId)}&limit=100`),
        fetch(`/api/brain/reflection?projectId=${encodeURIComponent(projectId)}&limit=50`),
      ]);

      if (!mountedRef.current) return;

      // Signals
      if (signalRes.status === 'fulfilled' && signalRes.value.ok) {
        const raw = await safeResponseJson(signalRes.value, '/api/brain/signals');
        const data = parseApiResponse(raw, BrainSignalsResponseSchema, '/api/brain/signals');
        if (data.success) {
          setRawSignals(data.signals as unknown as DbBehavioralSignal[]);
        }
      }

      // Insights
      if (insightRes.status === 'fulfilled' && insightRes.value.ok) {
        try {
          const data = await insightRes.value.json();
          if (data.success && Array.isArray(data.insights)) {
            setRawInsights(data.insights);
          }
        } catch { /* ignore */ }
      }

      // Reflections
      if (reflectionRes.status === 'fulfilled' && reflectionRes.value.ok) {
        try {
          const data = await reflectionRes.value.json();
          if (data.success && Array.isArray(data.reflections)) {
            setRawReflections(data.reflections);
          }
        } catch { /* ignore */ }
      }

      setIsLoading(false);
    } catch {
      if (mountedRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (!activeProject?.id) {
      setRawSignals([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    fetchData(activeProject.id);
    return () => { mountedRef.current = false; };
  }, [activeProject?.id, fetchData]);

  // Transform raw data into palace structures
  return useMemo(() => {
    if (rawSignals.length === 0) {
      return {
        rooms: [], connections: [], signals: [], insights: [],
        reflections: [], keyframes: [], timeRange: [Date.now() - 86400000, Date.now()] as [number, number],
        isLoading, isEmpty: !isLoading,
      };
    }

    // Build signals
    const palaceSignals: PalaceSignal[] = [];
    const contextMap = new Map<string, PalaceSignal[]>();

    for (const sig of rawSignals) {
      const type = sig.signal_type as SignalType;
      if (!VALID_TYPES.includes(type)) continue;

      let summary = '';
      try {
        const data = JSON.parse(sig.data);
        summary = data.commitMessage || data.endpoint || data.requirementName || type;
      } catch {
        summary = type;
      }

      const ps: PalaceSignal = {
        id: sig.id,
        roomId: sig.context_id || 'uncategorized',
        type,
        timestamp: new Date(sig.timestamp).getTime(),
        weight: sig.weight,
        summary: typeof summary === 'string' ? summary.substring(0, 80) : type,
      };
      palaceSignals.push(ps);

      const key = sig.context_id || 'uncategorized';
      if (!contextMap.has(key)) contextMap.set(key, []);
      contextMap.get(key)!.push(ps);
    }

    // Time range
    const allTimestamps = palaceSignals.map(s => s.timestamp);
    const minTime = Math.min(...allTimestamps);
    const maxTime = Math.max(...allTimestamps);

    // Build rooms from context groups
    const rooms: PalaceRoom[] = [];
    for (const [contextId, signals] of contextMap.entries()) {
      const typeCounts: Record<string, number> = {};
      let implSuccess = 0, implTotal = 0;
      for (const s of signals) {
        typeCounts[s.type] = (typeCounts[s.type] || 0) + 1;
        if (s.type === 'implementation') {
          implTotal++;
          // weight > 1 typically means success
          if (s.weight > 0.8) implSuccess++;
        }
      }
      const dominantType = Object.entries(typeCounts)
        .sort((a, b) => b[1] - a[1])[0][0] as SignalType;

      const timestamps = signals.map(s => s.timestamp);
      const lastActivity = Math.max(...timestamps);
      const firstActivity = Math.min(...timestamps);
      const recency = Math.max(0, 1 - (Date.now() - lastActivity) / (WINDOW_DAYS * 24 * 60 * 60 * 1000));
      const successRate = implTotal > 0 ? implSuccess / implTotal : 0.5;
      const health = recency * 0.6 + successRate * 0.4;

      const contextName = rawSignals.find(s => (s.context_id || 'uncategorized') === contextId)?.context_name || contextId;

      rooms.push({
        id: contextId,
        name: contextName || 'Uncategorized',
        x: 0,
        y: 0,
        radius: Math.max(30, Math.sqrt(signals.length) * 20),
        health,
        dominantType,
        signalCount: signals.length,
        lastActivity,
        firstActivity,
        successRate,
      });
    }

    // Layout rooms using force simulation
    layoutRooms(rooms);

    // Build connections between rooms
    const connections: PalaceConnection[] = [];
    const roomIds = rooms.map(r => r.id);
    for (let i = 0; i < roomIds.length; i++) {
      for (let j = i + 1; j < roomIds.length; j++) {
        const aSignals = contextMap.get(roomIds[i]) || [];
        const bSignals = contextMap.get(roomIds[j]) || [];

        // Shared type connection
        const aTypes = new Set(aSignals.map(s => s.type));
        const bTypes = new Set(bSignals.map(s => s.type));
        let sharedTypes = 0;
        for (const t of aTypes) {
          if (bTypes.has(t)) sharedTypes++;
        }

        // Temporal proximity: signals within 1 hour of each other
        let temporalOverlap = 0;
        const HOUR = 3600000;
        for (const a of aSignals) {
          for (const b of bSignals) {
            if (Math.abs(a.timestamp - b.timestamp) < HOUR) {
              temporalOverlap++;
            }
          }
        }

        if (sharedTypes >= 2) {
          connections.push({
            sourceId: roomIds[i],
            targetId: roomIds[j],
            strength: Math.min(1, sharedTypes / 4),
            reason: 'shared_type',
          });
        }
        if (temporalOverlap > 2) {
          connections.push({
            sourceId: roomIds[i],
            targetId: roomIds[j],
            strength: Math.min(1, temporalOverlap / 10),
            reason: 'temporal_proximity',
          });
        }
      }
    }

    // Transform insights
    const insights: PalaceInsight[] = rawInsights.map(i => ({
      id: i.id,
      roomId: i.context_id,
      content: i.content,
      timestamp: new Date(i.created_at).getTime(),
      effectiveness: i.effectiveness_score ?? 0,
    }));

    // Transform reflections
    const reflections: PalaceReflection[] = rawReflections.map(r => ({
      id: r.id,
      timestamp: new Date(r.created_at).getTime(),
      scope: r.scope as 'project' | 'global',
      insightCount: r.insight_count ?? 0,
      signalsBefore: r.signal_count ?? 0,
    }));

    // Build replay keyframes
    const keyframes: ReplayKeyframe[] = [];

    // Signal bursts: 3+ signals within 5 min
    const sortedSignals = [...palaceSignals].sort((a, b) => a.timestamp - b.timestamp);
    for (let i = 0; i < sortedSignals.length; i++) {
      let burstCount = 1;
      while (i + burstCount < sortedSignals.length &&
        sortedSignals[i + burstCount].timestamp - sortedSignals[i].timestamp < 300000) {
        burstCount++;
      }
      if (burstCount >= 3) {
        keyframes.push({
          timestamp: sortedSignals[i].timestamp,
          label: `${burstCount} signals burst`,
          type: 'signal_burst',
        });
        i += burstCount - 1;
      }
    }

    // Reflection events
    for (const r of reflections) {
      keyframes.push({
        timestamp: r.timestamp,
        label: `Reflection (${r.scope})`,
        type: 'reflection_start',
      });
    }

    // Insight crystallization
    for (const ins of insights) {
      keyframes.push({
        timestamp: ins.timestamp,
        label: 'Insight crystallized',
        type: 'insight_crystallize',
      });
    }

    keyframes.sort((a, b) => a.timestamp - b.timestamp);

    return {
      rooms, connections, signals: palaceSignals, insights,
      reflections, keyframes,
      timeRange: [minTime, maxTime] as [number, number],
      isLoading, isEmpty: false,
    };
  }, [rawSignals, rawInsights, rawReflections, isLoading]);
}

/** Force-layout rooms in a circular arrangement */
function layoutRooms(rooms: PalaceRoom[]): void {
  if (rooms.length === 0) return;
  if (rooms.length === 1) {
    rooms[0].x = 400;
    rooms[0].y = 300;
    return;
  }

  const W = 800, H = 600;
  const angleStep = (2 * Math.PI) / rooms.length;
  const initRadius = Math.min(W, H) * 0.3;

  rooms.forEach((r, i) => {
    r.x = W / 2 + initRadius * Math.cos(i * angleStep - Math.PI / 2);
    r.y = H / 2 + initRadius * Math.sin(i * angleStep - Math.PI / 2);
  });

  const sim = d3.forceSimulation(rooms as unknown as d3.SimulationNodeDatum[])
    .force('center', d3.forceCenter(W / 2, H / 2))
    .force('collide', d3.forceCollide<d3.SimulationNodeDatum>((d: any) => d.radius + 15).strength(0.8).iterations(3))
    .force('charge', d3.forceManyBody().strength(-200))
    .force('x', d3.forceX(W / 2).strength(0.05))
    .force('y', d3.forceY(H / 2).strength(0.05))
    .stop();

  for (let i = 0; i < 100; i++) sim.tick();

  rooms.forEach((r: any) => {
    r.x = r.x ?? W / 2;
    r.y = r.y ?? H / 2;
  });
}
