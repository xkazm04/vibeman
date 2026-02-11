'use client';

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  DbPersona,
  DbPersonaToolDefinition,
  DbPersonaTrigger,
  DbPersonaExecution,
  DbCredentialEvent,
  PersonaWithDetails,
  CredentialMetadata,
  ConnectorDefinition,
  SidebarSection,
  EditorTab,
  OverviewTab,
  GlobalExecution,
  ManualReviewItem,
  PersonaMessage,
  NotificationChannel,
  ToolUsageSummary,
  ToolUsageOverTime,
  PersonaUsageSummary,
} from '@/app/features/Personas/lib/types';
import type { DesignPhase, DesignAnalysisResult } from '@/app/features/Personas/lib/designTypes';
import type { CredentialTemplate } from '@/lib/personas/credentialTemplates';
import * as api from '@/app/features/Personas/lib/personaApi';

// ============================================================================
// Store Types
// ============================================================================

export interface ActiveDesignSession {
  personaId: string;
  designId: string;
  phase: DesignPhase;
  outputLines: string[];
  result: DesignAnalysisResult | null;
  error: string | null;
}

interface PersonaState {
  // Data
  personas: DbPersona[];
  selectedPersonaId: string | null;
  selectedPersona: PersonaWithDetails | null;
  toolDefinitions: DbPersonaToolDefinition[];
  credentials: CredentialMetadata[];
  credentialEvents: DbCredentialEvent[];
  credentialTemplates: CredentialTemplate[];
  connectorDefinitions: ConnectorDefinition[];
  executions: DbPersonaExecution[];
  activeExecutionId: string | null;
  executionOutput: string[];

  // Overview / Global
  overviewTab: OverviewTab;
  globalExecutions: GlobalExecution[];
  globalExecutionsTotal: number;
  globalExecutionsOffset: number;
  manualReviews: ManualReviewItem[];
  manualReviewsTotal: number;
  pendingReviewCount: number;

  // Messages
  messages: PersonaMessage[];
  messagesTotal: number;
  unreadMessageCount: number;

  // Tool Usage Analytics
  toolUsageSummary: ToolUsageSummary[];
  toolUsageOverTime: ToolUsageOverTime[];
  toolUsageByPersona: PersonaUsageSummary[];

  // Design Analysis
  designPhase: DesignPhase;
  activeDesignSession: ActiveDesignSession | null;

  // UI State
  sidebarSection: SidebarSection;
  editorTab: EditorTab;
  isLoading: boolean;
  isExecuting: boolean;
  error: string | null;
}

interface PersonaActions {
  // Personas
  fetchPersonas: () => Promise<void>;
  fetchDetail: (id: string) => Promise<void>;
  createPersona: (input: { name: string; description?: string; system_prompt: string; icon?: string; color?: string }) => Promise<DbPersona>;
  updatePersona: (id: string, input: Record<string, unknown>) => Promise<void>;
  deletePersona: (id: string) => Promise<void>;
  selectPersona: (id: string | null) => void;

  // Tools
  fetchToolDefinitions: () => Promise<void>;
  assignTool: (personaId: string, toolId: string) => Promise<void>;
  removeTool: (personaId: string, toolId: string) => Promise<void>;

  // Triggers
  createTrigger: (personaId: string, input: { trigger_type: string; config?: object; enabled?: boolean }) => Promise<void>;
  updateTrigger: (personaId: string, triggerId: string, updates: Record<string, unknown>) => Promise<void>;
  deleteTrigger: (personaId: string, triggerId: string) => Promise<void>;

  // Executions
  executePersona: (personaId: string, inputData?: object) => Promise<string | null>;
  cancelExecution: (executionId: string) => Promise<void>;
  finishExecution: (status?: string) => void;
  fetchExecutions: (personaId: string) => Promise<void>;
  appendExecutionOutput: (line: string) => void;
  clearExecutionOutput: () => void;

  // Credentials
  fetchCredentials: () => Promise<void>;
  createCredential: (input: { name: string; service_type: string; data: object }) => Promise<void>;
  deleteCredential: (id: string, force?: boolean) => Promise<void>;
  healthcheckCredential: (credentialId: string) => Promise<{ success: boolean; message: string }>;

  // Credential Templates & Events
  fetchCredentialTemplates: () => Promise<void>;
  fetchConnectorDefinitions: () => Promise<void>;
  createConnectorDefinition: (input: Parameters<typeof api.createConnectorDefinition>[0]) => Promise<ConnectorDefinition>;
  deleteConnectorDefinition: (id: string) => Promise<void>;
  fetchCredentialEvents: () => Promise<void>;
  createCredentialEvent: (input: { credential_id: string; event_template_id: string; name: string; config?: object }) => Promise<void>;
  updateCredentialEvent: (id: string, updates: { name?: string; config?: object; enabled?: boolean }) => Promise<void>;
  deleteCredentialEvent: (id: string) => Promise<void>;

  // Overview / Global
  setOverviewTab: (tab: OverviewTab) => void;
  fetchGlobalExecutions: (reset?: boolean, status?: string) => Promise<void>;
  fetchManualReviews: (status?: string) => Promise<void>;
  updateManualReview: (id: string, updates: { status?: string; reviewer_notes?: string }) => Promise<void>;
  fetchPendingReviewCount: () => Promise<void>;

  // Messages
  fetchMessages: (reset?: boolean, filter?: { is_read?: number; persona_id?: string; priority?: string }) => Promise<void>;
  markMessageAsRead: (id: string) => Promise<void>;
  markAllMessagesAsRead: (personaId?: string) => Promise<void>;
  deleteMessage: (id: string) => Promise<void>;
  fetchUnreadMessageCount: () => Promise<void>;
  fetchNotificationChannels: (personaId: string) => Promise<NotificationChannel[]>;
  updateNotificationChannels: (personaId: string, channels: NotificationChannel[]) => Promise<void>;

  // Tool Usage Analytics
  fetchToolUsage: (days?: number, personaId?: string) => Promise<void>;

  // Design
  setDesignPhase: (phase: DesignPhase) => void;
  setActiveDesignSession: (session: ActiveDesignSession | null) => void;
  appendDesignOutputLine: (line: string) => void;

  // UI
  setSidebarSection: (section: SidebarSection) => void;
  setEditorTab: (tab: EditorTab) => void;
  setError: (error: string | null) => void;
}

type PersonaStore = PersonaState & PersonaActions;

// ============================================================================
// Store Implementation
// ============================================================================

export const usePersonaStore = create<PersonaStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      personas: [],
      selectedPersonaId: null,
      selectedPersona: null,
      toolDefinitions: [],
      credentials: [],
      credentialEvents: [],
      credentialTemplates: [],
      connectorDefinitions: [],
      executions: [],
      activeExecutionId: null,
      executionOutput: [],
      overviewTab: 'executions' as OverviewTab,
      globalExecutions: [],
      globalExecutionsTotal: 0,
      globalExecutionsOffset: 0,
      manualReviews: [],
      manualReviewsTotal: 0,
      pendingReviewCount: 0,
      messages: [],
      messagesTotal: 0,
      unreadMessageCount: 0,
      toolUsageSummary: [],
      toolUsageOverTime: [],
      toolUsageByPersona: [],
      designPhase: 'idle' as DesignPhase,
      activeDesignSession: null,
      sidebarSection: 'personas' as SidebarSection,
      editorTab: 'prompt' as EditorTab,
      isLoading: false,
      isExecuting: false,
      error: null,

      // ── Personas ─────────────────────────────────────────────────
      fetchPersonas: async () => {
        set({ isLoading: true, error: null });
        try {
          const personas = await api.fetchPersonas();
          set({ personas, isLoading: false });
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to fetch personas', isLoading: false });
        }
      },

      fetchDetail: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          const detail = await api.fetchPersonaDetail(id);
          set({ selectedPersona: detail, selectedPersonaId: id, isLoading: false });
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to fetch persona', isLoading: false });
        }
      },

      createPersona: async (input) => {
        set({ error: null });
        try {
          const persona = await api.createPersona(input);
          set(state => ({ personas: [persona, ...state.personas] }));
          return persona;
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to create persona' });
          throw err;
        }
      },

      updatePersona: async (id, input) => {
        set({ error: null });
        try {
          const persona = await api.updatePersona(id, input);
          set(state => ({
            personas: state.personas.map(p => p.id === id ? persona : p),
            selectedPersona: state.selectedPersona?.id === id
              ? { ...state.selectedPersona, ...persona }
              : state.selectedPersona,
          }));
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to update persona' });
        }
      },

      deletePersona: async (id) => {
        set({ error: null });
        try {
          await api.deletePersona(id);
          set(state => ({
            personas: state.personas.filter(p => p.id !== id),
            selectedPersonaId: state.selectedPersonaId === id ? null : state.selectedPersonaId,
            selectedPersona: state.selectedPersona?.id === id ? null : state.selectedPersona,
          }));
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to delete persona' });
        }
      },

      selectPersona: (id) => {
        set({ selectedPersonaId: id, editorTab: 'prompt' });
        if (id) get().fetchDetail(id);
        else set({ selectedPersona: null });
      },

      // ── Tools ────────────────────────────────────────────────────
      fetchToolDefinitions: async () => {
        try {
          const toolDefinitions = await api.fetchToolDefinitions();
          set({ toolDefinitions });
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to fetch tools' });
        }
      },

      assignTool: async (personaId, toolId) => {
        try {
          await api.assignTool(personaId, toolId);
          get().fetchDetail(personaId);
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to assign tool' });
        }
      },

      removeTool: async (personaId, toolId) => {
        try {
          await api.removeTool(personaId, toolId);
          get().fetchDetail(personaId);
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to remove tool' });
        }
      },

      // ── Triggers ─────────────────────────────────────────────────
      createTrigger: async (personaId, input) => {
        try {
          await api.createTrigger(personaId, input as Parameters<typeof api.createTrigger>[1]);
          get().fetchDetail(personaId);
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to create trigger' });
        }
      },

      updateTrigger: async (personaId, triggerId, updates) => {
        try {
          await api.updateTrigger(personaId, triggerId, updates as Parameters<typeof api.updateTrigger>[2]);
          get().fetchDetail(personaId);
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to update trigger' });
        }
      },

      deleteTrigger: async (personaId, triggerId) => {
        try {
          await api.deleteTrigger(personaId, triggerId);
          get().fetchDetail(personaId);
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to delete trigger' });
        }
      },

      // ── Executions ───────────────────────────────────────────────
      executePersona: async (personaId, inputData) => {
        set({ isExecuting: true, executionOutput: [], error: null });
        try {
          const execution = await api.executePersona(personaId, inputData);
          set({ activeExecutionId: execution.id });
          return execution.id;
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to execute persona', isExecuting: false });
          return null;
        }
      },

      cancelExecution: async (executionId) => {
        try {
          await api.cancelExecution(executionId);
          set({ isExecuting: false, activeExecutionId: null });
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to cancel execution' });
        }
      },

      finishExecution: (status) => {
        set({ isExecuting: false });
        // Refresh executions list for the selected persona
        const personaId = get().selectedPersona?.id;
        if (personaId) {
          get().fetchExecutions(personaId);
        }
      },

      fetchExecutions: async (personaId) => {
        try {
          const executions = await api.fetchExecutions(personaId);
          set({ executions });
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to fetch executions' });
        }
      },

      appendExecutionOutput: (line) => {
        set(state => ({ executionOutput: [...state.executionOutput, line] }));
      },

      clearExecutionOutput: () => {
        set({ executionOutput: [], activeExecutionId: null, isExecuting: false });
      },

      // ── Credentials ──────────────────────────────────────────────
      fetchCredentials: async () => {
        try {
          const credentials = await api.fetchCredentials();
          set({ credentials });
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to fetch credentials' });
        }
      },

      createCredential: async (input) => {
        try {
          await api.createCredential(input as Parameters<typeof api.createCredential>[0]);
          get().fetchCredentials();
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to create credential' });
        }
      },

      deleteCredential: async (id, force) => {
        try {
          await api.deleteCredential(id, force);
          set(state => ({
            credentials: state.credentials.filter(c => c.id !== id),
            credentialEvents: state.credentialEvents.filter(e => e.credential_id !== id),
          }));
        } catch (err) {
          // Re-throw so callers can inspect the error and offer force-delete
          throw err;
        }
      },

      healthcheckCredential: async (credentialId) => {
        try {
          const result = await api.healthcheckCredential(credentialId);
          return result;
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Healthcheck failed';
          return { success: false, message: msg };
        }
      },

      // ── Credential Templates & Events ─────────────────────────
      fetchCredentialTemplates: async () => {
        try {
          const credentialTemplates = await api.fetchCredentialTemplates();
          set({ credentialTemplates });
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to fetch credential templates' });
        }
      },

      fetchConnectorDefinitions: async () => {
        try {
          const connectorDefinitions = await api.fetchConnectorDefinitions();
          set({ connectorDefinitions });
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to fetch connector definitions' });
        }
      },

      createConnectorDefinition: async (input) => {
        try {
          const connector = await api.createConnectorDefinition(input);
          set(state => ({ connectorDefinitions: [...state.connectorDefinitions, connector] }));
          return connector;
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to create connector' });
          throw err;
        }
      },

      deleteConnectorDefinition: async (id) => {
        try {
          await api.deleteConnectorDefinition(id);
          set(state => ({
            connectorDefinitions: state.connectorDefinitions.filter(c => c.id !== id),
          }));
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to delete connector' });
        }
      },

      fetchCredentialEvents: async () => {
        try {
          const credentialEvents = await api.fetchCredentialEvents();
          set({ credentialEvents });
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to fetch credential events' });
        }
      },

      createCredentialEvent: async (input) => {
        try {
          await api.createCredentialEvent(input);
          get().fetchCredentialEvents();
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to create credential event' });
        }
      },

      updateCredentialEvent: async (id, updates) => {
        try {
          await api.updateCredentialEvent(id, updates);
          get().fetchCredentialEvents();
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to update credential event' });
        }
      },

      deleteCredentialEvent: async (id) => {
        try {
          await api.deleteCredentialEvent(id);
          set(state => ({
            credentialEvents: state.credentialEvents.filter(e => e.id !== id),
          }));
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to delete credential event' });
        }
      },

      // ── Overview / Global ────────────────────────────────────────
      setOverviewTab: (tab) => set({ overviewTab: tab }),

      fetchGlobalExecutions: async (reset = false, status?: string) => {
        try {
          const PAGE_SIZE = 10;
          const offset = reset ? 0 : get().globalExecutionsOffset;
          const data = await api.fetchGlobalExecutions(PAGE_SIZE, offset, status);
          if (reset) {
            set({
              globalExecutions: data.executions,
              globalExecutionsTotal: data.total,
              globalExecutionsOffset: data.executions.length,
            });
          } else {
            set(state => ({
              globalExecutions: [...state.globalExecutions, ...data.executions],
              globalExecutionsTotal: data.total,
              globalExecutionsOffset: state.globalExecutionsOffset + data.executions.length,
            }));
          }
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to fetch global executions' });
        }
      },

      fetchManualReviews: async (status?: string) => {
        try {
          const data = await api.fetchManualReviews(50, 0, status);
          set({
            manualReviews: data.reviews,
            manualReviewsTotal: data.total,
            pendingReviewCount: data.pendingCount,
          });
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to fetch manual reviews' });
        }
      },

      updateManualReview: async (id, updates) => {
        try {
          const data = await api.updateManualReview(id, updates);
          set(state => ({
            manualReviews: state.manualReviews.map(r => r.id === id ? data.review : r),
            pendingReviewCount: updates.status && updates.status !== 'pending'
              ? Math.max(0, state.pendingReviewCount - 1)
              : state.pendingReviewCount,
          }));
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to update manual review' });
        }
      },

      fetchPendingReviewCount: async () => {
        try {
          const count = await api.fetchPendingReviewCount();
          set({ pendingReviewCount: count });
        } catch {
          // Silent fail - badge count is non-critical
        }
      },

      // ── Messages ──────────────────────────────────────────────────
      fetchMessages: async (reset = true, filter?) => {
        try {
          const PAGE_SIZE = 50;
          const offset = reset ? 0 : get().messages.length;
          const data = await api.fetchMessages(PAGE_SIZE, offset, filter);
          if (reset) {
            set({
              messages: data.messages,
              messagesTotal: data.total,
              unreadMessageCount: data.unreadCount,
            });
          } else {
            set(state => ({
              messages: [...state.messages, ...data.messages],
              messagesTotal: data.total,
              unreadMessageCount: data.unreadCount,
            }));
          }
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to fetch messages' });
        }
      },

      markMessageAsRead: async (id) => {
        // Optimistic update
        set(state => ({
          messages: state.messages.map(m => m.id === id ? { ...m, is_read: 1, read_at: new Date().toISOString() } : m),
          unreadMessageCount: Math.max(0, state.unreadMessageCount - 1),
        }));
        try {
          await api.markMessageAsRead(id);
        } catch {
          // Revert on failure
          get().fetchMessages();
        }
      },

      markAllMessagesAsRead: async (personaId?) => {
        try {
          await api.markAllMessagesAsRead(personaId);
          set(state => ({
            messages: state.messages.map(m => {
              if (!personaId || m.persona_id === personaId) {
                return { ...m, is_read: 1, read_at: new Date().toISOString() };
              }
              return m;
            }),
            unreadMessageCount: 0,
          }));
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to mark all as read' });
        }
      },

      deleteMessage: async (id) => {
        try {
          await api.deleteMessage(id);
          set(state => ({
            messages: state.messages.filter(m => m.id !== id),
            messagesTotal: Math.max(0, state.messagesTotal - 1),
          }));
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to delete message' });
        }
      },

      fetchUnreadMessageCount: async () => {
        try {
          const count = await api.fetchUnreadMessageCount();
          set({ unreadMessageCount: count });
        } catch {
          // Silent fail - badge count is non-critical
        }
      },

      fetchNotificationChannels: async (personaId) => {
        try {
          return await api.fetchNotificationChannels(personaId);
        } catch {
          return [];
        }
      },

      updateNotificationChannels: async (personaId, channels) => {
        try {
          await api.updateNotificationChannels(personaId, channels);
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to update notification channels' });
        }
      },

      // ── Tool Usage Analytics ─────────────────────────────────────────
      fetchToolUsage: async (days?: number, personaId?: string) => {
        try {
          const data = await api.fetchToolUsage(days, personaId);
          set({
            toolUsageSummary: data.summary,
            toolUsageOverTime: data.overTime,
            toolUsageByPersona: data.byPersona,
          });
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to fetch tool usage' });
        }
      },

      // ── Design ─────────────────────────────────────────────────────
      setDesignPhase: (phase) => set({ designPhase: phase }),
      setActiveDesignSession: (session) => set({ activeDesignSession: session }),
      appendDesignOutputLine: (line) => set((state) => {
        if (!state.activeDesignSession) return {};
        return {
          activeDesignSession: {
            ...state.activeDesignSession,
            outputLines: [...state.activeDesignSession.outputLines, line],
          },
        };
      }),

      // ── UI ───────────────────────────────────────────────────────
      setSidebarSection: (section) => set({ sidebarSection: section }),
      setEditorTab: (tab) => set({ editorTab: tab }),
      setError: (error) => set({ error }),
    }),
    { name: 'persona-store' }
  )
);
