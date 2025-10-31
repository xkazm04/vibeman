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
 * Log a successful structure scan event
 */
export function logStructureScanSuccess(event: StructureScanEvent): void {
  try {
    const eventId = uuidv4();

    eventDb.createEvent({
      id: eventId,
      project_id: event.projectId,
      title: 'Structure Scan Completed',
      description: `Found ${event.violationsFound} structure violations and created ${event.requirementFilesCreated} requirement files`,
      type: event.violationsFound > 0 ? 'warning' : 'success',
      agent: 'structure-scanner',
      message: event.requirementFiles.length > 0
        ? `Requirements: ${event.requirementFiles.join(', ')}`
        : 'No violations found - project structure is compliant',
    });

    console.log('[EventLogger] ✅ Structure scan event logged');
  } catch (error) {
    console.error('[EventLogger] ❌ Failed to log event:', error);
  }
}

/**
 * Log a structure scan error event
 */
export function logStructureScanError(projectId: string, error: string): void {
  try {
    const eventId = uuidv4();

    eventDb.createEvent({
      id: eventId,
      project_id: projectId,
      title: 'Structure Scan Failed',
      description: `Structure scan encountered an error: ${error}`,
      type: 'error',
      agent: 'structure-scanner',
      message: error,
    });

    console.log('[EventLogger] ⚠️  Structure scan error event logged');
  } catch (err) {
    console.error('[EventLogger] ❌ Failed to log error event:', err);
  }
}

/**
 * Log when user accepts structure scan requirements
 */
export function logStructureScanAccepted(event: StructureScanEvent): void {
  try {
    const eventId = uuidv4();

    eventDb.createEvent({
      id: eventId,
      project_id: event.projectId,
      title: 'Structure Requirements Accepted',
      description: `User accepted ${event.requirementFilesCreated} structure requirement files`,
      type: 'success',
      agent: 'structure-scanner',
      message: `Created: ${event.requirementFiles.join(', ')}`,
    });

    console.log('[EventLogger] ✅ Acceptance event logged');
  } catch (error) {
    console.error('[EventLogger] ❌ Failed to log acceptance event:', error);
  }
}

/**
 * Log when user rejects structure scan requirements
 */
export function logStructureScanRejected(projectId: string, violationsCount: number): void {
  try {
    const eventId = uuidv4();

    eventDb.createEvent({
      id: eventId,
      project_id: projectId,
      title: 'Structure Requirements Rejected',
      description: `User rejected ${violationsCount} structure violations`,
      type: 'info',
      agent: 'structure-scanner',
      message: 'Requirements not created',
    });

    console.log('[EventLogger] ℹ️  Rejection event logged');
  } catch (error) {
    console.error('[EventLogger] ❌ Failed to log rejection event:', error);
  }
}
