import { eventDb } from '@/app/db';
import { v4 as uuidv4 } from 'uuid';

/**
 * Event Logger Module
 * Handles logging of scan events to the database
 */

export interface StructureScanEvent {
  projectId: string;
  violationsFound: number;
  requirementFilesCreated: number;
  requirementFiles: string[];
}

/**
 * Helper function to safely log an event to the database
 */
function safelyLogEvent(
  projectId: string,
  title: string,
  description: string,
  type: 'success' | 'error' | 'warning' | 'info',
  message: string
): void {
  try {
    const eventId = uuidv4();

    eventDb.createEvent({
      id: eventId,
      project_id: projectId,
      title,
      description,
      type,
      agent: 'structure-scanner',
      message,
    });
  } catch (error) {
    // Silently fail - logging errors should not break the application
  }
}

/**
 * Log a successful structure scan event
 */
export function logStructureScanSuccess(event: StructureScanEvent): void {
  safelyLogEvent(
    event.projectId,
    'Structure Scan Completed',
    `Found ${event.violationsFound} structure violations and created ${event.requirementFilesCreated} requirement files`,
    event.violationsFound > 0 ? 'warning' : 'success',
    event.requirementFiles.length > 0
      ? `Requirements: ${event.requirementFiles.join(', ')}`
      : 'No violations found - project structure is compliant'
  );
}

/**
 * Log a structure scan error event
 */
export function logStructureScanError(projectId: string, error: string): void {
  safelyLogEvent(
    projectId,
    'Structure Scan Failed',
    `Structure scan encountered an error: ${error}`,
    'error',
    error
  );
}

/**
 * Log when user accepts structure scan requirements
 */
export function logStructureScanAccepted(event: StructureScanEvent): void {
  safelyLogEvent(
    event.projectId,
    'Structure Requirements Accepted',
    `User accepted ${event.requirementFilesCreated} structure requirement files`,
    'success',
    `Created: ${event.requirementFiles.join(', ')}`
  );
}

/**
 * Log when user rejects structure scan requirements
 */
export function logStructureScanRejected(projectId: string, violationsCount: number): void {
  safelyLogEvent(
    projectId,
    'Structure Requirements Rejected',
    `User rejected ${violationsCount} structure violations`,
    'info',
    'Requirements not created'
  );
}
