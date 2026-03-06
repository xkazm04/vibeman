/**
 * External Requirements Service
 * CRUD operations for the vibeman_requirements table in Supabase.
 * Handles fetching open requirements, claiming, status updates, and stale claim recovery.
 */

import { createSupabaseClient, isSupabaseConfigured } from './client';
import { getDeviceId } from './project-sync';
import type { ExternalRequirement, ExternalRequirementStatus } from './external-types';

/**
 * Fetch open requirements for a project from Supabase.
 * Returns requirements that are either untargeted (device_id IS NULL)
 * or targeted at this specific device.
 */
export async function fetchOpenRequirements(
  projectId: string,
  statuses: ExternalRequirementStatus[] = ['open']
): Promise<{ success: boolean; requirements: ExternalRequirement[]; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: false, requirements: [], error: 'Supabase is not configured' };
  }

  try {
    const supabase = createSupabaseClient();
    const deviceId = getDeviceId();

    const { data, error } = await supabase
      .from('vibeman_requirements')
      .select('*')
      .eq('project_id', projectId)
      .in('status', statuses)
      .or(`device_id.is.null,device_id.eq.${deviceId}`)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      return { success: false, requirements: [], error: error.message };
    }

    return { success: true, requirements: (data ?? []) as ExternalRequirement[] };
  } catch (err) {
    return {
      success: false,
      requirements: [],
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Fetch all visible requirements for a project (all non-terminal statuses).
 * Includes open, claimed, in_progress, and failed for display in the UI column.
 */
export async function fetchVisibleRequirements(
  projectId: string
): Promise<{ success: boolean; requirements: ExternalRequirement[]; error?: string }> {
  return fetchOpenRequirements(projectId, ['open', 'claimed', 'in_progress', 'failed']);
}

/**
 * Atomically claim a requirement for this device.
 * Uses optimistic locking: only succeeds if the requirement is still 'open'.
 * Returns true if the claim succeeded, false if another device claimed it first.
 */
export async function claimRequirement(requirementId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  try {
    const supabase = createSupabaseClient();
    const deviceId = getDeviceId();

    const { data, error } = await supabase
      .from('vibeman_requirements')
      .update({
        status: 'claimed' as ExternalRequirementStatus,
        claimed_by: deviceId,
        claimed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', requirementId)
      .eq('status', 'open')
      .select();

    if (error || !data || data.length === 0) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Update the status of a requirement in Supabase.
 */
export async function updateRequirementStatus(
  requirementId: string,
  updates: {
    status: ExternalRequirementStatus;
    error_message?: string;
    implementation_log_id?: string;
    completed_at?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase is not configured' };
  }

  try {
    const supabase = createSupabaseClient();

    const { error } = await supabase
      .from('vibeman_requirements')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requirementId);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Discard a requirement (set status to 'discarded').
 */
export async function discardRequirement(
  requirementId: string
): Promise<{ success: boolean; error?: string }> {
  return updateRequirementStatus(requirementId, { status: 'discarded' });
}

/**
 * Reset stale 'claimed' requirements back to 'open'.
 * Requirements claimed by this device for more than `staleMinutes` are reset.
 * Prevents requirements from being stuck if Vibeman crashes during processing.
 */
export async function resetStaleClaimedRequirements(
  staleMinutes: number = 30
): Promise<{ success: boolean; resetCount: number; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: false, resetCount: 0, error: 'Supabase is not configured' };
  }

  try {
    const supabase = createSupabaseClient();
    const deviceId = getDeviceId();
    const cutoff = new Date(Date.now() - staleMinutes * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('vibeman_requirements')
      .update({
        status: 'open' as ExternalRequirementStatus,
        claimed_by: null,
        claimed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('status', 'claimed')
      .eq('claimed_by', deviceId)
      .lt('claimed_at', cutoff)
      .select();

    if (error) {
      return { success: false, resetCount: 0, error: error.message };
    }

    return { success: true, resetCount: data?.length ?? 0 };
  } catch (err) {
    return {
      success: false,
      resetCount: 0,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
