/**
 * FastAPI Structure Scan Adapter
 *
 * EXAMPLE ADAPTER demonstrating how to create adapters for different frameworks.
 */

import { Project } from '@/types';
import { BaseAdapter } from '../BaseAdapter';
import { ScanContext, ScanResult, DecisionData } from '../types';

interface FastAPIStructureData {
  violations: Array<{
    type: string;
    message: string;
    file?: string;
    severity: 'error' | 'warning' | 'info';
  }>;
}

export class FastAPIStructureAdapter extends BaseAdapter<FastAPIStructureData> {
  public readonly id = 'fastapi-structure';
  public readonly name = 'FastAPI Structure Scanner';
  public readonly description = 'Analyzes FastAPI project structure for best practices';
  public readonly supportedTypes = ['fastapi'];
  public readonly category = 'structure';
  public readonly priority = 100;

  public async execute(context: ScanContext): Promise<ScanResult<FastAPIStructureData>> {
    const { project } = context;
    this.log('Analyzing FastAPI project structure...', project.path);

    // TODO: Implement actual FastAPI structure scanning
    const violations: FastAPIStructureData['violations'] = [];
    return this.createResult(true, { violations });
  }

  public buildDecision(result: ScanResult<FastAPIStructureData>, project: Project): DecisionData | null {
    if (!result.success || !result.data || result.data.violations.length === 0) {
      return null;
    }

    return this.createDecision(
      {
        type: 'structure-scan',
        title: 'FastAPI Structure Violations',
        description: 'Found violations in FastAPI project',
        count: result.data.violations.length,
        severity: 'info',
        data: { violations: result.data.violations },
        onAccept: async () => { this.log('Accepted'); },
        onReject: async () => { this.log('Rejected'); },
      },
      project
    );
  }
}
