/**
 * Flow types for activity diagram visualization of persona use cases.
 * Used by flowExtractor.ts to structure CLI output and by ActivityDiagramModal for rendering.
 */

export interface FlowNode {
  id: string;
  type: 'start' | 'end' | 'action' | 'decision' | 'connector' | 'event' | 'error';
  label: string;
  detail?: string;
  connector?: string;     // e.g. 'gmail', 'slack' — links to CONNECTOR_META in UI
  request_data?: string;  // JSON string of request/input data for this step
  response_data?: string; // JSON string of response/output data from this step
  error_message?: string; // Error message if this step failed
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;         // e.g. 'yes', 'no', 'on error'
  variant?: 'default' | 'yes' | 'no' | 'error';
}

export interface UseCaseFlow {
  id: string;
  name: string;           // e.g. "Process urgent email"
  description: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
}
