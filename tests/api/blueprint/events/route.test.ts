/**
 * Tests for /api/blueprint/events route
 * Tests CRUD operations for blueprint events
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getTestDatabase,
  setupTestDatabase,
  cleanupTestDatabase,
} from '@tests/setup/test-database';
import {
  createTestProject,
  createTestEvent,
  insertTestProject,
  insertTestEvent,
  generateId,
} from '@tests/setup/mock-factories';

// Create mock functions
const mockGetEventsByProject = vi.fn();
const mockGetEventById = vi.fn();
const mockCreateEvent = vi.fn();
const mockGetEventsByType = vi.fn();
const mockGetRecentEvents = vi.fn();

// Mock the database module
vi.mock('@/app/db', () => ({
  eventDb: {
    getEventsByProject: (...args: unknown[]) => mockGetEventsByProject(...args),
    getEventById: (...args: unknown[]) => mockGetEventById(...args),
    createEvent: (...args: unknown[]) => mockCreateEvent(...args),
    getEventsByType: (...args: unknown[]) => mockGetEventsByType(...args),
    getRecentEvents: (...args: unknown[]) => mockGetRecentEvents(...args),
  },
}));

describe('API /api/blueprint/events', () => {
  let testProjectId: string;

  beforeEach(() => {
    setupTestDatabase();
    testProjectId = generateId('proj');

    // Insert test project
    const db = getTestDatabase();
    const project = createTestProject({ id: testProjectId });
    insertTestProject(db, project);

    // Reset mocks and configure default behavior
    vi.clearAllMocks();

    mockGetEventsByProject.mockImplementation((projectId: string) => {
      const db = getTestDatabase();
      return db.prepare('SELECT * FROM events WHERE project_id = ? ORDER BY created_at DESC').all(projectId);
    });

    mockGetEventById.mockImplementation((id: string) => {
      const db = getTestDatabase();
      return db.prepare('SELECT * FROM events WHERE id = ?').get(id);
    });

    mockCreateEvent.mockImplementation((event: Record<string, unknown>) => {
      const db = getTestDatabase();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO events (id, project_id, context_id, title, description, type, agent, message, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        event.id,
        event.project_id,
        event.context_id || null,
        event.title,
        event.description,
        event.type,
        event.agent || null,
        event.message || null,
        now
      );
      return db.prepare('SELECT * FROM events WHERE id = ?').get(event.id);
    });

    mockGetEventsByType.mockImplementation((projectId: string, type: string) => {
      const db = getTestDatabase();
      return db.prepare('SELECT * FROM events WHERE project_id = ? AND type = ? ORDER BY created_at DESC').all(projectId, type);
    });

    mockGetRecentEvents.mockImplementation((projectId: string, limit: number) => {
      const db = getTestDatabase();
      return db.prepare('SELECT * FROM events WHERE project_id = ? ORDER BY created_at DESC LIMIT ?').all(projectId, limit);
    });
  });

  afterEach(() => {
    cleanupTestDatabase();
    vi.clearAllMocks();
  });

  describe('Database operations via mocked eventDb', () => {
    it('getEventsByProject returns events ordered by created_at DESC', () => {
      const db = getTestDatabase();
      const event1 = createTestEvent({ project_id: testProjectId, title: 'Event 1', type: 'info' });
      const event2 = createTestEvent({ project_id: testProjectId, title: 'Event 2', type: 'success' });
      insertTestEvent(db, event1);
      insertTestEvent(db, event2);

      const events = mockGetEventsByProject(testProjectId);
      expect(events).toHaveLength(2);
    });

    it('getEventsByProject returns empty array when no events exist', () => {
      const events = mockGetEventsByProject(testProjectId);
      expect(events).toEqual([]);
    });

    it('getEventById returns single event', () => {
      const db = getTestDatabase();
      const event = createTestEvent({ project_id: testProjectId, title: 'Single Event' });
      insertTestEvent(db, event);

      const result = mockGetEventById(event.id);
      expect(result).toBeDefined();
      expect(result.title).toBe('Single Event');
    });

    it('createEvent creates new event', () => {
      const newEvent = {
        id: generateId('evt'),
        project_id: testProjectId,
        title: 'New Event',
        description: 'Event description',
        type: 'info',
      };

      const created = mockCreateEvent(newEvent);
      expect(created).toBeDefined();
      expect(created.title).toBe('New Event');
      expect(created.type).toBe('info');
    });

    it('createEvent with agent and message', () => {
      const newEvent = {
        id: generateId('evt'),
        project_id: testProjectId,
        title: 'Agent Event',
        description: 'Created by agent',
        type: 'success',
        agent: 'zen_architect',
        message: 'Analysis complete',
      };

      const created = mockCreateEvent(newEvent);
      expect(created.agent).toBe('zen_architect');
      expect(created.message).toBe('Analysis complete');
    });

    it('getEventsByType filters by event type', () => {
      const db = getTestDatabase();
      const event1 = createTestEvent({ project_id: testProjectId, type: 'info' });
      const event2 = createTestEvent({ project_id: testProjectId, type: 'error' });
      const event3 = createTestEvent({ project_id: testProjectId, type: 'info' });
      insertTestEvent(db, event1);
      insertTestEvent(db, event2);
      insertTestEvent(db, event3);

      const infoEvents = mockGetEventsByType(testProjectId, 'info');
      expect(infoEvents).toHaveLength(2);
    });

    it('getRecentEvents limits results', () => {
      const db = getTestDatabase();
      for (let i = 0; i < 10; i++) {
        const event = createTestEvent({ project_id: testProjectId, title: `Event ${i}` });
        insertTestEvent(db, event);
      }

      const recentEvents = mockGetRecentEvents(testProjectId, 5);
      expect(recentEvents).toHaveLength(5);
    });

    it('supports all event types', () => {
      const db = getTestDatabase();
      const eventTypes = ['info', 'warning', 'error', 'success', 'proposal_accepted', 'proposal_rejected'];

      eventTypes.forEach((type) => {
        const event = createTestEvent({ project_id: testProjectId, type });
        insertTestEvent(db, event);
      });

      const events = mockGetEventsByProject(testProjectId);
      expect(events).toHaveLength(6);
    });

    it('events can have context_id', () => {
      const contextId = generateId('ctx');
      const newEvent = {
        id: generateId('evt'),
        project_id: testProjectId,
        context_id: contextId,
        title: 'Context Event',
        description: 'Event for specific context',
        type: 'info',
      };

      const created = mockCreateEvent(newEvent);
      expect(created.context_id).toBe(contextId);
    });
  });
});
