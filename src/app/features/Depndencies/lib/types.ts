// Scan related types
export interface Scan {
  id: string;
  scan_name: string;
  scan_date: string;
  project_ids: string[];
  total_dependencies: number;
  shared_dependencies: number;
  duplicate_code_instances: number;
}

export interface SharedDependency {
  dependency_name: string;
  projects: Array<{
    project_id: string;
    version: string | null;
  }>;
}

export interface ScanData {
  scan: {
    id: string;
    scan_name: string;
    scan_date: string;
    project_ids: string[];
  };
  projects: Project[];
  dependencies: Record<string, ProjectDependency[]>;
  sharedDependencies: SharedDependency[];
  registryVersions?: Record<string, string | null>; // packageName -> registry version
  stats?: ScanStats;
}

export interface ScanStats {
  totalProjects: number;
  totalSharedDependencies: number;
  totalRelationships: number;
  versionConflicts: number;
  criticalDependencies: number;
  highPriorityDependencies: number;
}

// Project related types
export interface Project {
  id: string;
  name: string;
  path: string;
  type: string;
}

// Dependency related types
export interface ProjectDependency {
  project_id: string;
  dependency_name: string;
  dependency_version: string | null;
  dependency_type: string;
}

export interface LibraryRow {
  name: string;
  type: string;
  projectVersions: Record<string, string | null>; // projectId -> version
  isShared: boolean;
  projectCount: number;
  latestVersion: string | null; // Latest version among scanned projects
  registryVersion: string | null; // Latest version from npm/pypi registry
  license: string | null; // License identifier (e.g., "MIT", "Apache-2.0")
}

// Package update types
export interface SelectedPackage {
  libraryName: string;
  projectId: string;
  currentVersion: string | null;
  targetVersion: string | null;
}

export interface PackageUpdateGroup {
  projectId: string;
  projectName: string;
  projectPath: string;
  packages: Array<{
    name: string;
    currentVersion: string | null;
    targetVersion: string | null;
  }>;
}
