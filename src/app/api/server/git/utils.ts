/**
 * Shared utilities for Git API routes
 */

import { NextResponse } from 'next/server';

/**
 * Helper to create failure response
 */
export function failureResponse(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

/**
 * Default error status object for git status API
 */
export const DEFAULT_ERROR_STATUS = {
  hasChanges: false,
  ahead: 0,
  behind: 0,
  currentBranch: 'unknown',
};
