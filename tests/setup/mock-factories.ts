/**
 * Mock Data Factories
 * Generate test data with sensible defaults
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a unique test ID with optional prefix
 */
export function generateId(prefix = 'test'): string {
  return `${prefix}_${uuidv4()}`;
}

/**
 * Generate a current timestamp in SQLite format
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString().replace('T', ' ').replace('Z', '');
}

// ============ Project Factory ============

export interface TestProject {
  id: string;
  name: string;
  path: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export function createTestProject(overrides: Partial<TestProject> = {}): TestProject {
  const now = getCurrentTimestamp();
  return {
    id: generateId('proj'),
    name: 'Test Project',
    path: '/test/project/path',
    description: 'A test project for unit tests',
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

// ============ Goal Factory ============

export interface TestGoal {
  id: string;
  project_id: string;
  context_id: string | null;
  order_index: number;
  title: string;
  description: string | null;
  status: 'open' | 'in_progress' | 'done' | 'rejected' | 'undecided';
  progress?: number;
  hypotheses_total?: number;
  hypotheses_verified?: number;
  target_date?: string;
  started_at?: string;
  completed_at?: string;
  github_item_id?: string;
  created_at?: string;
  updated_at?: string;
}

export function createTestGoal(overrides: Partial<TestGoal> = {}): TestGoal {
  const now = getCurrentTimestamp();
  return {
    id: generateId('goal'),
    project_id: generateId('proj'),
    context_id: null,
    order_index: 0,
    title: 'Test Goal',
    description: 'A test goal for unit tests',
    status: 'open',
    progress: 0,
    hypotheses_total: 0,
    hypotheses_verified: 0,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

// ============ Context Group Factory ============

export interface TestContextGroup {
  id: string;
  project_id: string;
  name: string;
  color: string;
  accent_color?: string;
  icon?: string;
  layer_type?: string;
  position: number;
  created_at?: string;
  updated_at?: string;
}

export function createTestContextGroup(
  overrides: Partial<TestContextGroup> = {}
): TestContextGroup {
  const now = getCurrentTimestamp();
  return {
    id: generateId('grp'),
    project_id: generateId('proj'),
    name: 'Test Group',
    color: '#3b82f6',
    position: 0,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

// ============ Context Factory ============

export interface TestContext {
  id: string;
  project_id: string;
  group_id: string | null;
  name: string;
  description: string | null;
  file_paths: string;
  has_context_file?: number;
  context_file_path?: string;
  preview?: string;
  test_scenario?: string;
  test_updated?: string;
  target?: string;
  target_fulfillment?: string;
  target_rating?: number;
  implemented_tasks?: number;
  created_at?: string;
  updated_at?: string;
}

export function createTestContext(overrides: Partial<TestContext> = {}): TestContext {
  const now = getCurrentTimestamp();
  return {
    id: generateId('ctx'),
    project_id: generateId('proj'),
    group_id: null,
    name: 'Test Context',
    description: 'A test context for unit tests',
    file_paths: JSON.stringify(['src/test/file1.ts', 'src/test/file2.ts']),
    has_context_file: 0,
    implemented_tasks: 0,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

// ============ Scan Factory ============

export interface TestScan {
  id: string;
  project_id: string;
  scan_type: string;
  timestamp: string;
  summary: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  created_at?: string;
}

export function createTestScan(overrides: Partial<TestScan> = {}): TestScan {
  const now = getCurrentTimestamp();
  return {
    id: generateId('scan'),
    project_id: generateId('proj'),
    scan_type: 'structure',
    timestamp: now,
    summary: 'Test scan summary',
    input_tokens: 100,
    output_tokens: 200,
    created_at: now,
    ...overrides,
  };
}

// ============ Idea Factory ============

export interface TestIdea {
  id: string;
  scan_id: string;
  project_id: string;
  context_id: string | null;
  scan_type: string;
  category: string;
  title: string;
  description: string | null;
  reasoning: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'implemented';
  user_feedback: string | null;
  user_pattern: number;
  effort: number | null;
  impact: number | null;
  risk: number | null;
  requirement_id: string | null;
  goal_id: string | null;
  created_at?: string;
  updated_at?: string;
  implemented_at?: string;
}

export function createTestIdea(overrides: Partial<TestIdea> = {}): TestIdea {
  const now = getCurrentTimestamp();
  return {
    id: generateId('idea'),
    scan_id: generateId('scan'),
    project_id: generateId('proj'),
    context_id: null,
    scan_type: 'overall',
    category: 'enhancement',
    title: 'Test Idea',
    description: 'A test idea for unit tests',
    reasoning: 'Test reasoning',
    status: 'pending',
    user_feedback: null,
    user_pattern: 0,
    effort: 5,
    impact: 5,
    risk: 3,
    requirement_id: null,
    goal_id: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

// ============ Implementation Log Factory ============

export interface TestImplementationLog {
  id: string;
  project_id: string;
  context_id: string | null;
  requirement_name: string;
  title: string;
  overview: string;
  overview_bullets: string | null;
  tested: number;
  screenshot: string | null;
  created_at?: string;
}

export function createTestImplementationLog(
  overrides: Partial<TestImplementationLog> = {}
): TestImplementationLog {
  const now = getCurrentTimestamp();
  return {
    id: generateId('impl'),
    project_id: generateId('proj'),
    context_id: null,
    requirement_name: 'test-requirement',
    title: 'Test Implementation',
    overview: 'Test implementation overview',
    overview_bullets: 'Bullet 1\nBullet 2',
    tested: 0,
    screenshot: null,
    created_at: now,
    ...overrides,
  };
}

// ============ Tech Debt Factory ============

export interface TestTechDebt {
  id: string;
  project_id: string;
  scan_id: string | null;
  category: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  risk_score: number;
  estimated_effort_hours: number | null;
  impact_scope: string | null;
  technical_impact: string | null;
  business_impact: string | null;
  detected_by: 'automated_scan' | 'manual_entry' | 'ai_analysis';
  detection_details: string | null;
  file_paths: string | null;
  status: 'detected' | 'acknowledged' | 'planned' | 'in_progress' | 'resolved' | 'dismissed';
  remediation_plan: string | null;
  remediation_steps: string | null;
  estimated_completion_date: string | null;
  backlog_item_id: string | null;
  goal_id: string | null;
  created_at?: string;
  updated_at?: string;
  resolved_at?: string;
  dismissed_at?: string;
  dismissal_reason?: string;
}

export function createTestTechDebt(overrides: Partial<TestTechDebt> = {}): TestTechDebt {
  const now = getCurrentTimestamp();
  return {
    id: generateId('debt'),
    project_id: generateId('proj'),
    scan_id: null,
    category: 'code_quality',
    title: 'Test Tech Debt',
    description: 'A test tech debt item',
    severity: 'medium',
    risk_score: 50,
    estimated_effort_hours: 4,
    impact_scope: null,
    technical_impact: null,
    business_impact: null,
    detected_by: 'automated_scan',
    detection_details: null,
    file_paths: null,
    status: 'detected',
    remediation_plan: null,
    remediation_steps: null,
    estimated_completion_date: null,
    backlog_item_id: null,
    goal_id: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

// ============ Scan Queue Factory ============

export interface TestScanQueueItem {
  id: string;
  project_id: string;
  scan_type: string;
  context_id: string | null;
  trigger_type: 'manual' | 'git_push' | 'file_change' | 'scheduled';
  trigger_metadata: string | null;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  priority: number;
  progress: number;
  progress_message: string | null;
  current_step: string | null;
  total_steps: number | null;
  scan_id: string | null;
  result_summary: string | null;
  error_message: string | null;
  auto_merge_enabled: number;
  auto_merge_status: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at?: string;
  updated_at?: string;
}

export function createTestScanQueueItem(
  overrides: Partial<TestScanQueueItem> = {}
): TestScanQueueItem {
  const now = getCurrentTimestamp();
  return {
    id: generateId('queue'),
    project_id: generateId('proj'),
    scan_type: 'structure',
    context_id: null,
    trigger_type: 'manual',
    trigger_metadata: null,
    status: 'queued',
    priority: 0,
    progress: 0,
    progress_message: null,
    current_step: null,
    total_steps: null,
    scan_id: null,
    result_summary: null,
    error_message: null,
    auto_merge_enabled: 0,
    auto_merge_status: null,
    started_at: null,
    completed_at: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

// ============ Event Factory ============

export interface TestEvent {
  id: string;
  project_id: string;
  context_id: string | null;
  title: string;
  description: string;
  type: string;
  agent: string | null;
  message: string | null;
  created_at?: string;
}

export function createTestEvent(overrides: Partial<TestEvent> = {}): TestEvent {
  const now = getCurrentTimestamp();
  return {
    id: generateId('evt'),
    project_id: generateId('proj'),
    context_id: null,
    title: 'Test Event',
    description: 'A test event',
    type: 'info',
    agent: null,
    message: null,
    created_at: now,
    ...overrides,
  };
}

// ============ Debt Prediction Factory ============

export interface TestDebtPrediction {
  id: string;
  project_id: string;
  category: string;
  title: string;
  description: string;
  severity: string;
  confidence: number;
  predicted_impact: string | null;
  recommended_actions: string | null;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export function createTestDebtPrediction(
  overrides: Partial<TestDebtPrediction> = {}
): TestDebtPrediction {
  const now = getCurrentTimestamp();
  return {
    id: generateId('pred'),
    project_id: generateId('proj'),
    category: 'code_quality',
    title: 'Test Prediction',
    description: 'A test debt prediction',
    severity: 'medium',
    confidence: 0.8,
    predicted_impact: null,
    recommended_actions: null,
    status: 'active',
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

// ============ Architecture Graph Factory ============

export interface TestArchitectureGraph {
  id: string;
  project_id: string;
  nodes: string;
  edges: string;
  metadata: string | null;
  created_at?: string;
  updated_at?: string;
}

export function createTestArchitectureGraph(
  overrides: Partial<TestArchitectureGraph> = {}
): TestArchitectureGraph {
  const now = getCurrentTimestamp();
  return {
    id: generateId('arch'),
    project_id: generateId('proj'),
    nodes: JSON.stringify([{ id: 'node1', label: 'Module A' }]),
    edges: JSON.stringify([{ from: 'node1', to: 'node2' }]),
    metadata: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

// ============ Strategic Roadmap Factory ============

export interface TestStrategicRoadmap {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  milestones: string | null;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export function createTestStrategicRoadmap(
  overrides: Partial<TestStrategicRoadmap> = {}
): TestStrategicRoadmap {
  const now = getCurrentTimestamp();
  return {
    id: generateId('roadmap'),
    project_id: generateId('proj'),
    title: 'Test Roadmap',
    description: 'A test strategic roadmap',
    milestones: JSON.stringify([{ name: 'Milestone 1', date: '2025-03-01' }]),
    status: 'draft',
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

// ============ Autonomous CI Factory ============

export interface TestAutonomousCI {
  id: string;
  project_id: string;
  pipeline_name: string;
  status: string;
  last_run: string | null;
  config: string | null;
  created_at?: string;
  updated_at?: string;
}

export function createTestAutonomousCI(
  overrides: Partial<TestAutonomousCI> = {}
): TestAutonomousCI {
  const now = getCurrentTimestamp();
  return {
    id: generateId('ci'),
    project_id: generateId('proj'),
    pipeline_name: 'test-pipeline',
    status: 'idle',
    last_run: null,
    config: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

// ============ Database Insert Helpers ============

import Database from 'better-sqlite3';

/**
 * Insert a test project into the database
 */
export function insertTestProject(db: Database.Database, project: TestProject): void {
  db.prepare(`
    INSERT INTO projects (id, name, path, description, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    project.id,
    project.name,
    project.path,
    project.description,
    project.created_at,
    project.updated_at
  );
}

/**
 * Insert a test goal into the database
 */
export function insertTestGoal(db: Database.Database, goal: TestGoal): void {
  db.prepare(`
    INSERT INTO goals (id, project_id, context_id, order_index, title, description, status, progress, hypotheses_total, hypotheses_verified, target_date, started_at, completed_at, github_item_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    goal.id,
    goal.project_id,
    goal.context_id,
    goal.order_index,
    goal.title,
    goal.description,
    goal.status,
    goal.progress || 0,
    goal.hypotheses_total || 0,
    goal.hypotheses_verified || 0,
    goal.target_date || null,
    goal.started_at || null,
    goal.completed_at || null,
    goal.github_item_id || null,
    goal.created_at,
    goal.updated_at
  );
}

/**
 * Insert a test context group into the database
 */
export function insertTestContextGroup(
  db: Database.Database,
  group: TestContextGroup
): void {
  db.prepare(`
    INSERT INTO context_groups (id, project_id, name, color, accent_color, icon, layer_type, position, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    group.id,
    group.project_id,
    group.name,
    group.color,
    group.accent_color || null,
    group.icon || null,
    group.layer_type || null,
    group.position,
    group.created_at,
    group.updated_at
  );
}

/**
 * Insert a test context into the database
 */
export function insertTestContext(db: Database.Database, context: TestContext): void {
  db.prepare(`
    INSERT INTO contexts (id, project_id, group_id, name, description, file_paths, has_context_file, context_file_path, preview, test_scenario, test_updated, target, target_fulfillment, target_rating, implemented_tasks, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    context.id,
    context.project_id,
    context.group_id,
    context.name,
    context.description,
    context.file_paths,
    context.has_context_file || 0,
    context.context_file_path || null,
    context.preview || null,
    context.test_scenario || null,
    context.test_updated || null,
    context.target || null,
    context.target_fulfillment || null,
    context.target_rating || null,
    context.implemented_tasks || 0,
    context.created_at,
    context.updated_at
  );
}

/**
 * Insert a test scan into the database
 */
export function insertTestScan(db: Database.Database, scan: TestScan): void {
  db.prepare(`
    INSERT INTO scans (id, project_id, scan_type, timestamp, summary, input_tokens, output_tokens, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    scan.id,
    scan.project_id,
    scan.scan_type,
    scan.timestamp,
    scan.summary,
    scan.input_tokens,
    scan.output_tokens,
    scan.created_at
  );
}

/**
 * Insert a test idea into the database
 */
export function insertTestIdea(db: Database.Database, idea: TestIdea): void {
  db.prepare(`
    INSERT INTO ideas (id, scan_id, project_id, context_id, scan_type, category, title, description, reasoning, status, user_feedback, user_pattern, effort, impact, risk, requirement_id, goal_id, created_at, updated_at, implemented_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    idea.id,
    idea.scan_id,
    idea.project_id,
    idea.context_id,
    idea.scan_type,
    idea.category,
    idea.title,
    idea.description,
    idea.reasoning,
    idea.status,
    idea.user_feedback,
    idea.user_pattern,
    idea.effort,
    idea.impact,
    idea.risk,
    idea.requirement_id,
    idea.goal_id,
    idea.created_at,
    idea.updated_at,
    idea.implemented_at || null
  );
}

/**
 * Insert a test scan queue item into the database
 */
export function insertTestScanQueueItem(
  db: Database.Database,
  item: TestScanQueueItem
): void {
  db.prepare(`
    INSERT INTO scan_queue (id, project_id, scan_type, context_id, trigger_type, trigger_metadata, status, priority, progress, progress_message, current_step, total_steps, scan_id, result_summary, error_message, auto_merge_enabled, auto_merge_status, started_at, completed_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    item.id,
    item.project_id,
    item.scan_type,
    item.context_id,
    item.trigger_type,
    item.trigger_metadata,
    item.status,
    item.priority,
    item.progress,
    item.progress_message,
    item.current_step,
    item.total_steps,
    item.scan_id,
    item.result_summary,
    item.error_message,
    item.auto_merge_enabled,
    item.auto_merge_status,
    item.started_at,
    item.completed_at,
    item.created_at,
    item.updated_at
  );
}

/**
 * Insert a test event into the database
 */
export function insertTestEvent(db: Database.Database, event: TestEvent): void {
  db.prepare(`
    INSERT INTO events (id, project_id, context_id, title, description, type, agent, message, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    event.id,
    event.project_id,
    event.context_id,
    event.title,
    event.description,
    event.type,
    event.agent,
    event.message,
    event.created_at
  );
}
