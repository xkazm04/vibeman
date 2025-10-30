/**
 * Feature Request Types
 * Handles business user feature requests and AI-generated code
 */

export interface DbFeatureRequest {
  id: string;
  project_id: string;
  requester_name: string;
  requester_email?: string;
  source: 'ui' | 'notion' | 'jira' | 'confluence' | 'slack' | 'api';
  source_metadata?: string; // JSON string with source-specific data
  natural_language_description: string;
  status: 'pending' | 'analyzing' | 'code_generated' | 'committed' | 'approved' | 'rejected' | 'failed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  ai_analysis?: string;
  generated_code?: string; // JSON string of GeneratedCode[]
  generated_tests?: string; // JSON string of GeneratedTest[]
  generated_documentation?: string;
  commit_sha?: string;
  commit_url?: string;
  error_message?: string;
  developer_notes?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface GeneratedCode {
  file_path: string;
  content: string;
  action: 'create' | 'modify' | 'delete';
  description: string;
}

export interface GeneratedTest {
  file_path: string;
  content: string;
  test_framework: string;
  description: string;
}

export interface FeatureRequestNotification {
  id: string;
  feature_request_id: string;
  recipient_email: string;
  notification_type: 'new_request' | 'code_generated' | 'committed' | 'approved' | 'rejected' | 'failed';
  sent_at: string;
  delivery_status: 'pending' | 'sent' | 'failed';
  error_message?: string;
}

export interface FeatureRequestComment {
  id: string;
  feature_request_id: string;
  author_name: string;
  author_email?: string;
  comment_text: string;
  created_at: string;
}
