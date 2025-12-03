/**
 * Blueprint Simulation Hook
 * Simulates the execution of blueprint nodes with cycling and decision support
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { BlueprintNode, BlueprintEdge, NodeStatus, TimelineNodeInstance } from './types';
import { DUMMY_NODES, DUMMY_EDGES, BASE_PIPELINE_NODES, PIPELINE_EDGES } from './dummyData';

interface SimulationState {
  nodes: BlueprintNode[];
  edges: BlueprintEdge[];
  isRunning: boolean;
  isPaused: boolean;
  currentNodeId: string | null;
  completedNodeIds: string[];
  cycleCount: number;
  waitingForDecision: boolean;
}

interface TimelineState {
  instances: TimelineNodeInstance[];
  isRunning: boolean;
  isPaused: boolean;
  currentInstanceId: string | null;
  cycleCount: number;
  timelinePosition: number; // 0-100, represents scroll position
}

/**
 * Standard simulation hook for Circuit and Radial concepts
 * Includes decision node that pauses for user confirmation before cycling
 */
export function useBlueprintSimulation() {
  const [state, setState] = useState<SimulationState>({
    nodes: DUMMY_NODES.map(n => ({ ...n, status: 'pending' as NodeStatus, progress: 0 })),
    edges: DUMMY_EDGES,
    isRunning: false,
    isPaused: false,
    currentNodeId: null,
    completedNodeIds: [],
    cycleCount: 0,
    waitingForDecision: false,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cancelledRef = useRef(false);

  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Run a single node
  const runNode = useCallback((nodeIndex: number, currentCycle: number) => {
    if (cancelledRef.current) return;

    const node = state.nodes[nodeIndex];
    if (!node) {
      // All nodes completed - shouldn't happen with cycling
      setState(prev => ({
        ...prev,
        isRunning: false,
        currentNodeId: null,
      }));
      return;
    }

    // Check if this is a decision node
    if (node.type === 'decision') {
      setState(prev => ({
        ...prev,
        currentNodeId: node.id,
        waitingForDecision: true,
        nodes: prev.nodes.map(n =>
          n.id === node.id ? { ...n, status: 'waiting' as NodeStatus, progress: 0 } : n
        ),
      }));
      return;
    }

    const duration = node.duration || 3000;
    const progressStep = 100 / (duration / 50); // Update every 50ms

    // Set node to running
    setState(prev => ({
      ...prev,
      currentNodeId: node.id,
      nodes: prev.nodes.map(n =>
        n.id === node.id ? { ...n, status: 'running' as NodeStatus, progress: 0 } : n
      ),
    }));

    // Progress animation
    let progress = 0;
    intervalRef.current = setInterval(() => {
      if (cancelledRef.current) {
        cleanup();
        return;
      }

      progress += progressStep;
      if (progress >= 100) {
        progress = 100;
        cleanup();

        // Mark as completed and move to next
        setState(prev => ({
          ...prev,
          completedNodeIds: [...prev.completedNodeIds, node.id],
          nodes: prev.nodes.map(n =>
            n.id === node.id ? { ...n, status: 'completed' as NodeStatus, progress: 100 } : n
          ),
        }));

        // Small delay before next node
        timeoutRef.current = setTimeout(() => {
          runNode(nodeIndex + 1, currentCycle);
        }, 200);
      } else {
        setState(prev => ({
          ...prev,
          nodes: prev.nodes.map(n =>
            n.id === node.id ? { ...n, progress } : n
          ),
        }));
      }
    }, 50);
  }, [state.nodes, cleanup]);

  // Confirm decision to continue cycling
  const confirmContinue = useCallback(() => {
    if (!state.waitingForDecision) return;

    // Mark decision node as completed
    setState(prev => ({
      ...prev,
      waitingForDecision: false,
      cycleCount: prev.cycleCount + 1,
      nodes: prev.nodes.map(n =>
        n.type === 'decision'
          ? { ...n, status: 'completed' as NodeStatus, progress: 100 }
          : { ...n, status: 'pending' as NodeStatus, progress: 0 } // Reset other nodes
      ),
      completedNodeIds: [],
    }));

    // Start next cycle from first node
    setTimeout(() => {
      runNode(0, state.cycleCount + 1);
    }, 300);
  }, [state.waitingForDecision, state.cycleCount, runNode]);

  // Decline to continue - stop the pipeline
  const declineContinue = useCallback(() => {
    if (!state.waitingForDecision) return;

    cleanup();
    setState(prev => ({
      ...prev,
      isRunning: false,
      waitingForDecision: false,
      currentNodeId: null,
      nodes: prev.nodes.map(n =>
        n.type === 'decision'
          ? { ...n, status: 'completed' as NodeStatus, progress: 100 }
          : n
      ),
    }));
  }, [state.waitingForDecision, cleanup]);

  const start = useCallback(() => {
    cancelledRef.current = false;

    // Reset all nodes
    setState(prev => ({
      ...prev,
      isRunning: true,
      isPaused: false,
      currentNodeId: null,
      completedNodeIds: [],
      cycleCount: 0,
      waitingForDecision: false,
      nodes: prev.nodes.map(n => ({ ...n, status: 'pending' as NodeStatus, progress: 0 })),
    }));

    // Start first node after a brief delay
    setTimeout(() => {
      runNode(0, 0);
    }, 100);
  }, [runNode]);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    cleanup();

    setState(prev => ({
      ...prev,
      isRunning: false,
      isPaused: false,
      waitingForDecision: false,
      currentNodeId: null,
      nodes: prev.nodes.map(n => ({
        ...n,
        status: n.status === 'running' || n.status === 'waiting' ? 'failed' as NodeStatus : n.status,
      })),
    }));
  }, [cleanup]);

  const reset = useCallback(() => {
    cancelledRef.current = false;
    cleanup();

    setState({
      nodes: DUMMY_NODES.map(n => ({ ...n, status: 'pending' as NodeStatus, progress: 0 })),
      edges: DUMMY_EDGES,
      isRunning: false,
      isPaused: false,
      currentNodeId: null,
      completedNodeIds: [],
      cycleCount: 0,
      waitingForDecision: false,
    });
  }, [cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    ...state,
    start,
    cancel,
    reset,
    confirmContinue,
    declineContinue,
  };
}

/**
 * Timeline simulation hook for Horizontal concept
 * Nodes appear on a scrolling timeline and cycle infinitely
 */
export function useTimelineSimulation() {
  const [state, setState] = useState<TimelineState>({
    instances: [],
    isRunning: false,
    isPaused: false,
    currentInstanceId: null,
    cycleCount: 0,
    timelinePosition: 0,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cancelledRef = useRef(false);
  const nodeIndexRef = useRef(0);
  const cycleRef = useRef(0);

  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Scroll timeline and remove off-screen instances
  const startScrolling = useCallback(() => {
    scrollIntervalRef.current = setInterval(() => {
      setState(prev => ({
        ...prev,
        instances: prev.instances
          .map(inst => ({
            ...inst,
            position: inst.position - 0.5, // Move left
          }))
          .filter(inst => inst.position > -20), // Remove off-screen (with buffer)
      }));
    }, 50);
  }, []);

  // Run the next node in sequence
  const runNextNode = useCallback(() => {
    if (cancelledRef.current) return;

    const nodeIndex = nodeIndexRef.current;
    const cycle = cycleRef.current;
    const baseNode = BASE_PIPELINE_NODES[nodeIndex];

    if (!baseNode) {
      // Cycle complete, start new cycle
      nodeIndexRef.current = 0;
      cycleRef.current = cycle + 1;
      setState(prev => ({ ...prev, cycleCount: cycle + 1 }));

      timeoutRef.current = setTimeout(() => {
        runNextNode();
      }, 500);
      return;
    }

    const instanceId = `${baseNode.id}-cycle-${cycle}`;
    const duration = baseNode.duration || 3000;
    const progressStep = 100 / (duration / 50);

    // Create new instance at right edge
    const newInstance: TimelineNodeInstance = {
      instanceId,
      nodeId: baseNode.id,
      cycleNumber: cycle,
      type: baseNode.type,
      name: baseNode.name,
      icon: baseNode.icon,
      status: 'running',
      progress: 0,
      timestamp: Date.now(),
      position: 85, // Start at right side
    };

    setState(prev => ({
      ...prev,
      currentInstanceId: instanceId,
      instances: [...prev.instances, newInstance],
    }));

    // Progress animation
    let progress = 0;
    intervalRef.current = setInterval(() => {
      if (cancelledRef.current) {
        cleanup();
        return;
      }

      progress += progressStep;
      if (progress >= 100) {
        progress = 100;
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }

        // Mark as completed
        setState(prev => ({
          ...prev,
          instances: prev.instances.map(inst =>
            inst.instanceId === instanceId
              ? { ...inst, status: 'completed' as NodeStatus, progress: 100 }
              : inst
          ),
        }));

        // Move to next node
        nodeIndexRef.current = nodeIndex + 1;

        timeoutRef.current = setTimeout(() => {
          runNextNode();
        }, 300);
      } else {
        setState(prev => ({
          ...prev,
          instances: prev.instances.map(inst =>
            inst.instanceId === instanceId
              ? { ...inst, progress }
              : inst
          ),
        }));
      }
    }, 50);
  }, [cleanup]);

  const start = useCallback(() => {
    cancelledRef.current = false;
    nodeIndexRef.current = 0;
    cycleRef.current = 0;

    setState({
      instances: [],
      isRunning: true,
      isPaused: false,
      currentInstanceId: null,
      cycleCount: 0,
      timelinePosition: 0,
    });

    // Start scrolling and processing
    startScrolling();
    setTimeout(() => {
      runNextNode();
    }, 100);
  }, [runNextNode, startScrolling]);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    cleanup();

    setState(prev => ({
      ...prev,
      isRunning: false,
      isPaused: false,
      currentInstanceId: null,
      instances: prev.instances.map(inst => ({
        ...inst,
        status: inst.status === 'running' ? 'failed' as NodeStatus : inst.status,
      })),
    }));
  }, [cleanup]);

  const reset = useCallback(() => {
    cancelledRef.current = false;
    cleanup();
    nodeIndexRef.current = 0;
    cycleRef.current = 0;

    setState({
      instances: [],
      isRunning: false,
      isPaused: false,
      currentInstanceId: null,
      cycleCount: 0,
      timelinePosition: 0,
    });
  }, [cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    ...state,
    baseNodes: BASE_PIPELINE_NODES,
    edges: PIPELINE_EDGES,
    start,
    cancel,
    reset,
  };
}
