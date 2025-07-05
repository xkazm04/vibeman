import { createClient } from '@supabase/supabase-js';

// These should be environment variables in production
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

// Client-side Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side Supabase client (for API routes)
export const createServerSupabaseClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey);
};

// Database types (based on our schema)
export interface Database {
  public: {
    Tables: {
      goals: {
        Row: {
          id: string;
          project_id: string;
          order_index: number;
          title: string;
          description: string | null;
          status: 'open' | 'in_progress' | 'done';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          order_index: number;
          title: string;
          description?: string | null;
          status?: 'open' | 'in_progress' | 'done';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          order_index?: number;
          title?: string;
          description?: string | null;
          status?: 'open' | 'in_progress' | 'done';
          created_at?: string;
          updated_at?: string;
        };
      };
      backlog_items: {
        Row: {
          id: string;
          project_id: string;
          goal_id: string | null;
          agent: 'developer' | 'mastermind' | 'tester' | 'artist' | 'custom';
          title: string;
          description: string;
          status: 'pending' | 'accepted' | 'rejected' | 'in_progress';
          type: 'proposal' | 'custom';
          impacted_files: string[] | null;
          created_at: string;
          updated_at: string;
          accepted_at: string | null;
          rejected_at: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          goal_id?: string | null;
          agent: 'developer' | 'mastermind' | 'tester' | 'artist' | 'custom';
          title: string;
          description: string;
          status?: 'pending' | 'accepted' | 'rejected' | 'in_progress';
          type?: 'proposal' | 'custom';
          impacted_files?: string[] | null;
          created_at?: string;
          updated_at?: string;
          accepted_at?: string | null;
          rejected_at?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          goal_id?: string | null;
          agent?: 'developer' | 'mastermind' | 'tester' | 'artist' | 'custom';
          title?: string;
          description?: string;
          status?: 'pending' | 'accepted' | 'rejected' | 'in_progress';
          type?: 'proposal' | 'custom';
          impacted_files?: string[] | null;
          created_at?: string;
          updated_at?: string;
          accepted_at?: string | null;
          rejected_at?: string | null;
        };
      };
      event_log: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          description: string;
          type: 'info' | 'warning' | 'error' | 'success' | 'proposal_accepted' | 'proposal_rejected';
          agent: string | null;
          message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          title: string;
          description: string;
          type: 'info' | 'warning' | 'error' | 'success' | 'proposal_accepted' | 'proposal_rejected';
          agent?: string | null;
          message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          title?: string;
          description?: string;
          type?: 'info' | 'warning' | 'error' | 'success' | 'proposal_accepted' | 'proposal_rejected';
          agent?: string | null;
          message?: string | null;
          created_at?: string;
        };
      };
    };
  };
} 