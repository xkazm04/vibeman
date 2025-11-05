/**
 * NextJS Structure Scan Adapter
 *
 * Analyzes NextJS project structure for violations and best practices.
 */

import { Project } from '@/types';
import { BaseAdapter } from '../BaseAdapter';
import { ScanContext, ScanResult, DecisionData } from '../types';

interface StructureScanData {
  violations: any[];
  projectId: string;
  projectPath: string;
  projectType: string;
}

export class NextJSStructureAdapter extends BaseAdapter<StructureScanData> {
  public readonly id = 'nextjs-structure';
  public readonly name = 'NextJS Structure Scanner';
  public readonly description = 'Analyzes NextJS project structure for violations';
  public readonly supportedTypes = ['nextjs'];
  public readonly category = 'structure';
  public readonly priority = 100;

  public async execute(context: ScanContext): Promise<ScanResult<StructureScanData>> {
    const { project } = context;

    this.log('Analyzing project structure...', project.path);

    try {
      const response = await this.fetchApi('/api/structure-scan/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          projectPath: project.path,
          projectType: project.type || 'nextjs',
          projectName: project.name,
        }),
      });

      if (!response.success || !response.data) {
        return this.createResult(false, undefined, response.error || 'Structure scan failed');
      }

      const result = response.data as any;

      if (!result.success) {
        return this.createResult(false, undefined, result.error || 'Structure scan failed');
      }

      const violations = result.violations || [];

      if (violations.length === 0) {
        this.log('No violations found - project structure is compliant');
      } else {
        this.log(`Found ${violations.length} violations`);
      }

      const data: StructureScanData = {
        violations,
        projectId: project.id,
        projectPath: project.path,
        projectType: project.type || 'nextjs',
      };

      return this.createResult(true, data);
    } catch (error) {
      this.error('Structure scan failed:', error);
      return this.createResult(
        false,
        undefined,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  public buildDecision(
    result: ScanResult<StructureScanData>,
    project: Project
  ): DecisionData | null {
    if (!result.success || !result.data || result.data.violations.length === 0) {
      return null;
    }

    const { violations } = result.data;

    return this.createDecision(
      {
        type: 'structure-scan',
        title: 'Structure Violations Detected',
        description: `Found ${violations.length} structure violation${violations.length > 1 ? 's' : ''} in ${project.name}`,
        count: violations.length,
        severity: violations.length > 10 ? 'error' : violations.length > 5 ? 'warning' : 'info',
        data: { violations },

        // Accept: Save requirements
        onAccept: async () => {
          this.log('User accepted - saving requirements...');

          const saveResponse = await fetch('/api/structure-scan/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              violations,
              projectPath: project.path,
              projectId: project.id,
            }),
          });

          const saveData = await saveResponse.json();

          if (!saveData.success) {
            throw new Error(saveData.error || 'Failed to save requirements');
          }

          this.log(`✅ Saved ${saveData.requirementFiles.length} requirement files`);
        },

        // Reject: Log rejection
        onReject: async () => {
          this.log('User rejected structure scan');
        },
      },
      project
    );
  }
}
