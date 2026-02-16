/**
 * Persona API Client
 * Fetch wrappers for all persona-related API endpoints
 */

import type {
  DbPersona,
  DbPersonaToolDefinition,
  DbPersonaTrigger,
  DbPersonaExecution,
  DbPersonaEventSubscription,
  PersonaWithDetails,
  CredentialMetadata,
  CreatePersonaInput,
  UpdatePersonaInput,
  PersonaTriggerType,
  CredentialServiceType,
  GlobalExecution,
  ManualReviewItem,
  PersonaMessage,
  NotificationChannel,
  ToolUsageSummary,
  ToolUsageOverTime,
  PersonaUsageSummary,
} from './types';

const BASE = '/api/personas';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

// ============================================================================
// Personas
// ============================================================================

export async function fetchPersonas(): Promise<DbPersona[]> {
  const data = await fetchJson<{ personas: DbPersona[] }>(BASE);
  return data.personas;
}

export async function fetchPersonaDetail(id: string): Promise<PersonaWithDetails> {
  const data = await fetchJson<{
    persona: DbPersona;
    tools: DbPersonaToolDefinition[];
    triggers: DbPersonaTrigger[];
    subscriptions?: DbPersonaEventSubscription[];
  }>(`${BASE}/${id}`);
  return { ...data.persona, tools: data.tools, triggers: data.triggers, subscriptions: data.subscriptions };
}

export async function createPersona(input: CreatePersonaInput): Promise<DbPersona> {
  const data = await fetchJson<{ persona: DbPersona }>(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return data.persona;
}

export async function updatePersona(id: string, input: UpdatePersonaInput): Promise<DbPersona> {
  const data = await fetchJson<{ persona: DbPersona }>(`${BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return data.persona;
}

export async function deletePersona(id: string): Promise<void> {
  await fetchJson(`${BASE}/${id}`, { method: 'DELETE' });
}

// ============================================================================
// Tools
// ============================================================================

export async function fetchToolDefinitions(): Promise<DbPersonaToolDefinition[]> {
  const data = await fetchJson<{ tools: DbPersonaToolDefinition[] }>(`${BASE}/tools`);
  return data.tools;
}

export async function createToolDefinition(input: {
  name: string;
  category: string;
  description: string;
  script_path: string;
  input_schema?: object;
  output_schema?: object;
  requires_credential_type?: string;
}): Promise<DbPersonaToolDefinition> {
  const data = await fetchJson<{ tool: DbPersonaToolDefinition }>(`${BASE}/tools`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return data.tool;
}

export async function assignTool(personaId: string, toolId: string, toolConfig?: object): Promise<void> {
  await fetchJson(`${BASE}/${personaId}/tools`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ toolId, toolConfig }),
  });
}

export async function removeTool(personaId: string, toolId: string): Promise<void> {
  await fetchJson(`${BASE}/${personaId}/tools`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ toolId }),
  });
}

// ============================================================================
// Triggers
// ============================================================================

export async function createTrigger(personaId: string, input: {
  trigger_type: PersonaTriggerType;
  config?: object;
  enabled?: boolean;
}): Promise<DbPersonaTrigger> {
  const data = await fetchJson<{ trigger: DbPersonaTrigger }>(`${BASE}/${personaId}/triggers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return data.trigger;
}

export async function updateTrigger(personaId: string, triggerId: string, updates: {
  trigger_type?: PersonaTriggerType;
  config?: object;
  enabled?: boolean;
}): Promise<DbPersonaTrigger> {
  const data = await fetchJson<{ trigger: DbPersonaTrigger }>(`${BASE}/${personaId}/triggers`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ triggerId, ...updates }),
  });
  return data.trigger;
}

export async function deleteTrigger(personaId: string, triggerId: string): Promise<void> {
  await fetchJson(`${BASE}/${personaId}/triggers`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ triggerId }),
  });
}

// ============================================================================
// Executions
// ============================================================================

export async function executePersona(personaId: string, inputData?: object): Promise<DbPersonaExecution> {
  const data = await fetchJson<{ execution: DbPersonaExecution }>(`${BASE}/${personaId}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputData }),
  });
  return data.execution;
}

export async function fetchExecutions(personaId: string, limit?: number): Promise<DbPersonaExecution[]> {
  const url = limit ? `${BASE}/${personaId}/executions?limit=${limit}` : `${BASE}/${personaId}/executions`;
  const data = await fetchJson<{ executions: DbPersonaExecution[] }>(url);
  return data.executions;
}

export async function fetchExecutionDetail(executionId: string): Promise<DbPersonaExecution> {
  const data = await fetchJson<{ execution: DbPersonaExecution }>(`${BASE}/executions/${executionId}`);
  return data.execution;
}

export async function cancelExecution(executionId: string): Promise<void> {
  await fetchJson(`${BASE}/executions/${executionId}`, { method: 'POST' });
}

// ============================================================================
// Credentials
// ============================================================================

export async function fetchCredentials(): Promise<CredentialMetadata[]> {
  const data = await fetchJson<{ credentials: CredentialMetadata[] }>(`${BASE}/credentials`);
  return data.credentials;
}

export async function createCredential(input: {
  name: string;
  service_type: CredentialServiceType;
  data: object;
}): Promise<CredentialMetadata> {
  const data = await fetchJson<{ credential: CredentialMetadata }>(`${BASE}/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return data.credential;
}

export async function updateCredential(id: string, input: {
  name?: string;
  service_type?: CredentialServiceType;
  data?: object;
}): Promise<CredentialMetadata> {
  const data = await fetchJson<{ credential: CredentialMetadata }>(`${BASE}/credentials/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return data.credential;
}

export async function deleteCredential(id: string, force?: boolean): Promise<void> {
  const qs = force ? '?force=true' : '';
  await fetchJson(`${BASE}/credentials/${id}${qs}`, { method: 'DELETE' });
}

// ============================================================================
// Credential Templates
// ============================================================================

export async function fetchCredentialTemplates(): Promise<import('@/lib/personas/credentialTemplates').CredentialTemplate[]> {
  const data = await fetchJson<{ templates: import('@/lib/personas/credentialTemplates').CredentialTemplate[] }>(`${BASE}/credential-templates`);
  return data.templates;
}

// ============================================================================
// Credential Events
// ============================================================================

export async function fetchCredentialEvents(): Promise<import('./types').DbCredentialEvent[]> {
  const data = await fetchJson<{ events: import('./types').DbCredentialEvent[] }>(`${BASE}/credential-events`);
  return data.events;
}

export async function createCredentialEvent(input: {
  credential_id: string;
  event_template_id: string;
  name: string;
  config?: object;
}): Promise<import('./types').DbCredentialEvent> {
  const data = await fetchJson<{ event: import('./types').DbCredentialEvent }>(`${BASE}/credential-events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return data.event;
}

export async function updateCredentialEvent(id: string, updates: {
  name?: string;
  config?: object;
  enabled?: boolean;
}): Promise<import('./types').DbCredentialEvent> {
  const data = await fetchJson<{ event: import('./types').DbCredentialEvent }>(`${BASE}/credential-events/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  return data.event;
}

export async function deleteCredentialEvent(id: string): Promise<void> {
  await fetchJson(`${BASE}/credential-events/${id}`, { method: 'DELETE' });
}

// ============================================================================
// Healthcheck
// ============================================================================

export async function healthcheckCredential(credentialId: string): Promise<{ success: boolean; message: string }> {
  const data = await fetchJson<{ success: boolean; message: string }>(`${BASE}/credentials/healthcheck`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential_id: credentialId }),
  });
  return data;
}

// ============================================================================
// Global Executions
// ============================================================================

export async function fetchGlobalExecutions(
  limit: number = 10,
  offset: number = 0,
  status?: string
): Promise<{ executions: GlobalExecution[]; total: number }> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (status) params.set('status', status);
  return fetchJson<{ executions: GlobalExecution[]; total: number }>(`${BASE}/executions?${params}`);
}

// ============================================================================
// Manual Reviews
// ============================================================================

export async function fetchManualReviews(
  limit: number = 50,
  offset: number = 0,
  status?: string
): Promise<{ reviews: ManualReviewItem[]; total: number; pendingCount: number }> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (status) params.set('status', status);
  return fetchJson<{ reviews: ManualReviewItem[]; total: number; pendingCount: number }>(`${BASE}/manual-reviews?${params}`);
}

export async function createManualReview(input: {
  execution_id: string;
  persona_id: string;
  title: string;
  description?: string;
  severity?: string;
  context_data?: object;
  suggested_actions?: string[];
}): Promise<{ review: ManualReviewItem }> {
  return fetchJson<{ review: ManualReviewItem }>(`${BASE}/manual-reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export async function updateManualReview(
  id: string,
  updates: { status?: string; reviewer_notes?: string }
): Promise<{ review: ManualReviewItem }> {
  return fetchJson<{ review: ManualReviewItem }>(`${BASE}/manual-reviews/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
}

export async function deleteManualReview(id: string): Promise<void> {
  await fetchJson(`${BASE}/manual-reviews/${id}`, { method: 'DELETE' });
}

export async function fetchPendingReviewCount(): Promise<number> {
  const data = await fetchJson<{ reviews: unknown[]; total: number; pendingCount: number }>(
    `${BASE}/manual-reviews?limit=0`
  );
  return data.pendingCount;
}

// ============================================================================
// Design Analysis
// ============================================================================

export async function startDesignAnalysis(
  personaId: string,
  instruction: string
): Promise<{ designId: string }> {
  return fetchJson<{ designId: string }>(`${BASE}/${personaId}/design`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ instruction }),
  });
}

export async function refineDesignAnalysis(
  personaId: string,
  designId: string,
  followUpMessage: string
): Promise<{ designId: string }> {
  return fetchJson<{ designId: string }>(`${BASE}/${personaId}/design/${designId}/refine`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ followUpMessage }),
  });
}

export async function startDesignTest(
  personaId: string,
  designResult: import('./designTypes').DesignAnalysisResult
): Promise<{ designId: string }> {
  return fetchJson<{ designId: string }>(`${BASE}/${personaId}/design/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ designResult }),
  });
}

// ============================================================================
// Connector Definitions
// ============================================================================

export async function fetchConnectorDefinitions(): Promise<import('./types').ConnectorDefinition[]> {
  const data = await fetchJson<{ connectors: import('./types').ConnectorDefinition[] }>(`${BASE}/connectors`);
  return data.connectors;
}

export async function createConnectorDefinition(input: {
  name: string;
  label: string;
  icon_url?: string | null;
  color?: string;
  category?: string;
  fields: object[];
  healthcheck_config?: object | null;
  services?: object[];
  events?: object[];
}): Promise<import('./types').ConnectorDefinition> {
  const data = await fetchJson<{ connector: import('./types').ConnectorDefinition }>(`${BASE}/connectors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return data.connector;
}

export async function updateConnectorDefinition(
  id: string,
  input: Record<string, unknown>
): Promise<import('./types').ConnectorDefinition> {
  const data = await fetchJson<{ connector: import('./types').ConnectorDefinition }>(`${BASE}/connectors/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return data.connector;
}

export async function deleteConnectorDefinition(id: string): Promise<void> {
  await fetchJson(`${BASE}/connectors/${id}`, { method: 'DELETE' });
}

export async function startConnectorDiscovery(
  serviceName: string,
  context?: string
): Promise<{ discoveryId: string }> {
  return fetchJson<{ discoveryId: string }>(`${BASE}/connectors/discover`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ serviceName, context }),
  });
}

// ============================================================================
// Messages
// ============================================================================

export async function fetchMessages(
  limit: number = 50,
  offset: number = 0,
  filter?: { is_read?: number; persona_id?: string; priority?: string }
): Promise<{ messages: PersonaMessage[]; total: number; unreadCount: number }> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (filter?.is_read !== undefined) params.set('is_read', String(filter.is_read));
  if (filter?.persona_id) params.set('persona_id', filter.persona_id);
  if (filter?.priority) params.set('priority', filter.priority);
  return fetchJson<{ messages: PersonaMessage[]; total: number; unreadCount: number }>(`${BASE}/messages?${params}`);
}

export async function markMessageAsRead(id: string): Promise<void> {
  await fetchJson(`${BASE}/messages/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_read: true }),
  });
}

export async function markAllMessagesAsRead(personaId?: string): Promise<void> {
  await fetchJson(`${BASE}/messages/mark-all-read`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ persona_id: personaId }),
  });
}

export async function deleteMessage(id: string): Promise<void> {
  await fetchJson(`${BASE}/messages/${id}`, { method: 'DELETE' });
}

export async function fetchUnreadMessageCount(): Promise<number> {
  const data = await fetchJson<{ messages: unknown[]; total: number; unreadCount: number }>(
    `${BASE}/messages?limit=0`
  );
  return data.unreadCount;
}

// ============================================================================
// Notification Channels
// ============================================================================

export async function fetchNotificationChannels(personaId: string): Promise<NotificationChannel[]> {
  const data = await fetchJson<{ channels: NotificationChannel[] }>(`${BASE}/${personaId}/notification-channels`);
  return data.channels;
}

export async function updateNotificationChannels(personaId: string, channels: NotificationChannel[]): Promise<void> {
  await fetchJson(`${BASE}/${personaId}/notification-channels`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channels }),
  });
}

// ============================================================================
// Tool Usage Analytics
// ============================================================================

export async function fetchToolUsage(
  days?: number,
  personaId?: string
): Promise<{ summary: ToolUsageSummary[]; overTime: ToolUsageOverTime[]; byPersona: PersonaUsageSummary[] }> {
  const params = new URLSearchParams();
  if (days) params.set('days', String(days));
  if (personaId) params.set('persona_id', personaId);
  const qs = params.toString() ? `?${params}` : '';
  return fetchJson<{ summary: ToolUsageSummary[]; overTime: ToolUsageOverTime[]; byPersona: PersonaUsageSummary[] }>(`${BASE}/usage${qs}`);
}

// ============================================================================
// Events
// ============================================================================

export async function fetchEvents(params?: { limit?: number; event_type?: string }): Promise<{ events: any[]; pendingCount: number; total: number }> {
  const sp = new URLSearchParams();
  if (params?.limit) sp.set('limit', String(params.limit));
  if (params?.event_type) sp.set('event_type', params.event_type);
  const res = await fetch(`/api/personas/events?${sp.toString()}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function publishEvent(input: { event_type: string; source_type: string; source_id?: string; target_persona_id?: string; payload?: object; project_id?: string }): Promise<{ ok: boolean; event_id: string }> {
  const res = await fetch('/api/personas/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchEventSubscriptions(personaId?: string): Promise<{ subscriptions: any[]; total: number }> {
  const sp = new URLSearchParams();
  if (personaId) sp.set('persona_id', personaId);
  const res = await fetch(`/api/personas/events/subscriptions?${sp.toString()}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function createEventSubscription(input: { persona_id: string; event_type: string; source_filter?: object; enabled?: boolean }): Promise<any> {
  const res = await fetch('/api/personas/events/subscriptions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updateEventSubscription(id: string, input: { event_type?: string; source_filter?: object; enabled?: boolean }): Promise<any> {
  const res = await fetch(`/api/personas/events/subscriptions/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteEventSubscription(id: string): Promise<void> {
  const res = await fetch(`/api/personas/events/subscriptions/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await res.text());
}

// ============================================================================
// Design Reviews
// ============================================================================

export async function deleteDesignReview(id: string): Promise<void> {
  const res = await fetch('/api/personas/design-reviews', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to delete template');
  }
}

export async function fetchDesignReviews(filters?: {
  latest?: boolean;
  connectors?: string[];
}): Promise<import('@/lib/personas/testing/testTypes').DbDesignReview[]> {
  const params = new URLSearchParams();
  if (filters?.latest) params.set('latest', 'true');
  if (filters?.connectors?.length) params.set('connectors', filters.connectors.join(','));
  const qs = params.toString() ? `?${params}` : '';
  const data = await fetchJson<{ reviews: import('@/lib/personas/testing/testTypes').DbDesignReview[] }>(
    `${BASE}/design-reviews${qs}`
  );
  return data.reviews;
}

export async function startDesignReviewRun(options?: {
  useCaseIds?: string[];
  customInstructions?: string[];
}): Promise<{
  testRunId: string;
  status: string;
  totalTests: number;
}> {
  return fetchJson<{ testRunId: string; status: string; totalTests: number }>(
    `${BASE}/design-reviews`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        useCaseIds: options?.useCaseIds,
        customInstructions: options?.customInstructions,
      }),
    }
  );
}

export async function fetchDesignReviewRun(testRunId: string): Promise<{
  reviews: import('@/lib/personas/testing/testTypes').DbDesignReview[];
  testRunId: string;
}> {
  return fetchJson<{
    reviews: import('@/lib/personas/testing/testTypes').DbDesignReview[];
    testRunId: string;
  }>(`${BASE}/design-reviews/${testRunId}`);
}

// ============================================================================
// Observability API
// ============================================================================

export async function fetchObservabilityMetrics(days: number = 30, personaId?: string) {
  const params = new URLSearchParams({ days: String(days) });
  if (personaId) params.set('persona_id', personaId);
  return fetchJson(`/api/personas/observability?${params.toString()}`);
}

export async function fetchPersonaMetrics(personaId: string, days: number = 30) {
  return fetchJson(`/api/personas/observability/${personaId}?days=${days}`);
}

export async function fetchPromptVersions(personaId: string, limit: number = 50) {
  return fetchJson(`/api/personas/prompt-versions/${personaId}?limit=${limit}`);
}

// ============================================================================
// Teams API
// ============================================================================

export async function fetchTeams() {
  return fetchJson<{ teams: any[] }>(`${BASE}/teams`);
}

export async function fetchTeam(teamId: string) {
  return fetchJson<{ team: any; members: any[]; connections: any[] }>(`${BASE}/teams/${teamId}`);
}

export async function createTeam(data: { name: string; description?: string; icon?: string; color?: string }) {
  return fetchJson<{ team: any }>(`${BASE}/teams`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function updateTeam(teamId: string, data: Record<string, unknown>) {
  return fetchJson(`${BASE}/teams/${teamId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function deleteTeam(teamId: string) {
  return fetchJson(`${BASE}/teams/${teamId}`, { method: 'DELETE' });
}

export async function addTeamMember(teamId: string, data: { persona_id: string; role?: string; position_x?: number; position_y?: number }) {
  return fetchJson(`${BASE}/teams/${teamId}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function removeTeamMember(teamId: string, memberId: string) {
  return fetchJson(`${BASE}/teams/${teamId}/members?member_id=${memberId}`, { method: 'DELETE' });
}

export async function addTeamConnection(teamId: string, data: { source_member_id: string; target_member_id: string; connection_type?: string; label?: string }) {
  return fetchJson(`${BASE}/teams/${teamId}/connections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function removeTeamConnection(teamId: string, connectionId: string) {
  return fetchJson(`${BASE}/teams/${teamId}/connections?connection_id=${connectionId}`, { method: 'DELETE' });
}
