import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    
    // Parse request body for custom event data
    const body = await request.json().catch(() => ({}));
    
    // Predefined event templates
    const eventTemplates = [
      {
        flow_name: 'Data Processing Flow',
        trigger_type: 'scheduled',
        status: 'completed',
        step: 'data-validation',
        parameters: { batch_size: 100, timeout: 30 },
        input_data: { file_path: '/data/input.csv', rows: 1000 },
        result: { processed_rows: 1000, errors: 0 },
        duration_ms: 1500,
      },
      {
        flow_name: 'Email Notification Flow',
        trigger_type: 'manual',
        status: 'failed',
        step: 'send-email',
        parameters: { retry_count: 3 },
        input_data: { recipients: ['user@example.com'], template: 'welcome' },
        result: {},
        error_message: 'SMTP connection failed',
        duration_ms: 500,
      },
      {
        flow_name: 'File Upload Flow',
        trigger_type: 'api',
        status: 'in_progress',
        step: 'file-processing',
        parameters: { max_file_size: 10485760 },
        input_data: { filename: 'document.pdf', size: 2048576 },
        result: { progress: 45 },
        duration_ms: null,
      },
      {
        flow_name: 'Database Backup Flow',
        trigger_type: 'scheduled',
        status: 'warning',
        step: 'backup-verification',
        parameters: { retention_days: 30 },
        input_data: { database: 'production', tables: 15 },
        result: { backup_size: 1073741824, warnings: ['Table users has no recent activity'] },
        duration_ms: 30000,
      },
    ];

    // Select random template or use provided data
    const template = eventTemplates[Math.floor(Math.random() * eventTemplates.length)];
    
    // Generate test event data
    const testEvent = {
      flow_id: body.flow_id || `test-flow-${Date.now()}`,
      session_id: body.session_id || `test-session-${Date.now()}`,
      flow_name: body.flow_name || template.flow_name,
      trigger_type: body.trigger_type || template.trigger_type,
      status: body.status || template.status,
      step: body.step || template.step,
      parameters: body.parameters || template.parameters,
      input_data: body.input_data || template.input_data,
      result: body.result || template.result,
      timestamp: new Date().toISOString(),
      duration_ms: body.duration_ms || template.duration_ms,
      error_message: body.error_message || template.error_message || null,
    };

    // Insert the test event
    const { data, error } = await supabase
      .from('flow_events')
      .insert([testEvent])
      .select();

    if (error) {
      console.error('Error inserting test event:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Test event inserted successfully',
      event: data[0]
    });
  } catch (error) {
    console.error('Error in test endpoint:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    
    // Get recent flow events
    const { data, error } = await supabase
      .from('flow_events')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching events:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ events: data });
  } catch (error) {
    console.error('Error in test endpoint:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 