'use client';

import { useState, useCallback, useMemo, createContext, useContext, type ReactNode } from 'react';
import type { ActivityEvent, ActivityType, Actor, ActivityFilter } from '../lib/types/activityTypes';

interface ActivityState {
  events: ActivityEvent[];
  eventsByFeedbackId: Map<string, ActivityEvent[]>;
}

interface ActivityContextValue extends ActivityState {
  addEvent: (event: Omit<ActivityEvent, 'id' | 'timestamp'>) => void;
  getItemEvents: (feedbackId: string) => ActivityEvent[];
  filterEvents: (filter: Partial<ActivityFilter>) => ActivityEvent[];
  clearEvents: () => void;
}

const ActivityContext = createContext<ActivityContextValue | null>(null);

let eventIdCounter = 0;

function buildFeedbackIndex(events: ActivityEvent[]): Map<string, ActivityEvent[]> {
  const index = new Map<string, ActivityEvent[]>();
  for (const event of events) {
    const existing = index.get(event.feedbackId);
    if (existing) {
      existing.push(event);
    } else {
      index.set(event.feedbackId, [event]);
    }
  }
  return index;
}

export function ActivityProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ActivityState>({
    events: [],
    eventsByFeedbackId: new Map(),
  });

  const addEvent = useCallback((event: Omit<ActivityEvent, 'id' | 'timestamp'>) => {
    const newEvent: ActivityEvent = {
      ...event,
      id: `activity-${++eventIdCounter}`,
      timestamp: new Date().toISOString(),
    };
    setState(prev => {
      const newEvents = [newEvent, ...prev.events].slice(0, 500);

      let newIndex: Map<string, ActivityEvent[]>;
      if (prev.events.length >= 500) {
        newIndex = buildFeedbackIndex(newEvents);
      } else {
        newIndex = new Map(prev.eventsByFeedbackId);
        const existing = newIndex.get(newEvent.feedbackId);
        if (existing) {
          newIndex.set(newEvent.feedbackId, [newEvent, ...existing]);
        } else {
          newIndex.set(newEvent.feedbackId, [newEvent]);
        }
      }

      return {
        events: newEvents,
        eventsByFeedbackId: newIndex,
      };
    });
  }, []);

  const getItemEvents = useCallback((feedbackId: string) => {
    return state.eventsByFeedbackId.get(feedbackId) ?? [];
  }, [state.eventsByFeedbackId]);

  const filterEvents = useCallback((filter: Partial<ActivityFilter>) => {
    return state.events.filter(event => {
      if (filter.types?.length && !filter.types.includes(event.type)) return false;
      if (filter.feedbackIds?.length && !filter.feedbackIds.includes(event.feedbackId)) return false;
      if (filter.actors?.length && !filter.actors.includes(event.actor)) return false;
      return true;
    });
  }, [state.events]);

  const clearEvents = useCallback(() => {
    setState({ events: [], eventsByFeedbackId: new Map() });
  }, []);

  const value: ActivityContextValue = {
    events: state.events,
    eventsByFeedbackId: state.eventsByFeedbackId,
    addEvent,
    getItemEvents,
    filterEvents,
    clearEvents,
  };

  return (
    <ActivityContext.Provider value={value}>
      {children}
    </ActivityContext.Provider>
  );
}

export function useActivity() {
  const context = useContext(ActivityContext);
  if (!context) {
    throw new Error('useActivity must be used within an ActivityProvider');
  }
  return context;
}

export function useActivityEvents(feedbackId?: string) {
  const context = useContext(ActivityContext);

  return useMemo(() => {
    if (!context) return [];
    if (feedbackId) return context.getItemEvents(feedbackId);
    return context.events;
  }, [context, feedbackId]);
}

export function createStatusChangeEvent(
  feedbackId: string,
  from: string,
  to: string,
  actor: Actor = 'user'
): Omit<ActivityEvent, 'id' | 'timestamp'> {
  return {
    feedbackId,
    type: 'status_changed',
    actor,
    metadata: { from, to },
  };
}

export function createAnalyzedEvent(
  feedbackId: string,
  confidence: number
): Omit<ActivityEvent, 'id' | 'timestamp'> {
  return {
    feedbackId,
    type: 'analyzed',
    actor: 'ai',
    metadata: { confidence },
  };
}

export function createTicketLinkedEvent(
  feedbackId: string,
  ticketId: string
): Omit<ActivityEvent, 'id' | 'timestamp'> {
  return {
    feedbackId,
    type: 'ticket_linked',
    actor: 'user',
    metadata: { ticketId },
  };
}
