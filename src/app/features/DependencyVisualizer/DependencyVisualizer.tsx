'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DependencyGraph, { GraphNode, GraphLink } from './DependencyGraph';
import styles from './DependencyVisualizer.module.css';

interface Project {
  id: string;
  name: string;
  type: string;
}

interface ScanSummary {
  scanId: string;
  scanName: string;
  scanDate: string;
  projectIds: string[];
  totalDependencies: number;
  sharedDependencies: number;
  codeDuplicates: number;
}

export default function DependencyVisualizer() {
  const [isOpen, setIsOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [scans, setScans] = useState<ScanSummary[]>([]);
  const [currentScan, setCurrentScan] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<'graph' | 'shared' | 'duplicates' | 'relationships'>('graph');

  // Graph data
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]);
  const [graphLinks, setGraphLinks] = useState<GraphLink[]>([]);

  // Fetch available projects
  useEffect(() => {
    fetchProjects();
    fetchScans();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      const data = await response.json();
      setProjects(data.projects || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchScans = async () => {
    try {
      const response = await fetch('/api/dependencies/scans');
      const data = await response.json();
      setScans(data.scans || []);
    } catch (error) {
      console.error('Error fetching scans:', error);
    }
  };

  const handleProjectToggle = (projectId: string) => {
    setSelectedProjects(prev =>
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const handleStartScan = async () => {
    if (selectedProjects.length < 2) {
      alert('Please select at least 2 projects to scan');
      return;
    }

    setIsScanning(true);
    setScanProgress(0);

    try {
      const scanName = `Scan ${new Date().toLocaleString()}`;

      // Simulate progress
      const progressInterval = setInterval(() => {
        setScanProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const response = await fetch('/api/dependencies/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectIds: selectedProjects,
          scanName
        })
      });

      clearInterval(progressInterval);
      setScanProgress(100);

      if (!response.ok) {
        throw new Error('Scan failed');
      }

      const result = await response.json();

      // Load the scan results
      await loadScanResults(result.scanId);

      // Refresh scans list
      await fetchScans();

      setTimeout(() => {
        setIsScanning(false);
        setScanProgress(0);
      }, 1000);
    } catch (error) {
      console.error('Error scanning dependencies:', error);
      alert('Failed to scan dependencies. Check console for details.');
      setIsScanning(false);
      setScanProgress(0);
    }
  };

  const loadScanResults = async (scanId: string) => {
    try {
      const response = await fetch(`/api/dependencies/${scanId}`);
      const data = await response.json();

      setCurrentScan(data);
      buildGraphData(data);
    } catch (error) {
      console.error('Error loading scan results:', error);
    }
  };

  const buildGraphData = (scanData: any) => {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const nodeIds = new Set<string>();

    // Add project nodes
    for (const project of scanData.projects) {
      nodes.push({
        id: project.id,
        name: project.name,
        type: 'project',
        group: 1,
        metadata: {
          type: project.type,
          path: project.path
        }
      });
      nodeIds.add(project.id);
    }

    // Add shared dependency nodes and links
    for (const dep of scanData.sharedDependencies) {
      const nodeId = `shared-${dep.id}`;

      if (!nodeIds.has(nodeId)) {
        nodes.push({
          id: nodeId,
          name: dep.dependency_name,
          type: 'shared',
          group: 2,
          metadata: {
            projects: dep.project_ids.length,
            priority: dep.priority,
            versionConflicts: !!dep.version_conflicts
          }
        });
        nodeIds.add(nodeId);
      }

      // Create links from each project to the shared dependency
      for (const projectId of dep.project_ids) {
        links.push({
          source: projectId,
          target: nodeId,
          value: dep.usage_count || 1,
          type: 'dependency'
        });
      }
    }

    // Add code duplicate nodes and links
    for (const dup of scanData.codeDuplicates) {
      const nodeId = `duplicate-${dup.id}`;

      if (!nodeIds.has(nodeId)) {
        nodes.push({
          id: nodeId,
          name: `${dup.pattern_type} (${dup.occurrences.length}x)`,
          type: 'duplicate',
          group: 3,
          metadata: {
            type: dup.pattern_type,
            occurrences: dup.occurrences.length,
            savings: dup.estimated_savings
          }
        });
        nodeIds.add(nodeId);
      }

      // Create links from each occurrence to the duplicate node
      for (const occ of dup.occurrences) {
        links.push({
          source: occ.project_id,
          target: nodeId,
          value: 1,
          type: 'duplicate'
        });
      }
    }

    // Add relationship links
    for (const rel of scanData.relationships) {
      links.push({
        source: rel.source_project_id,
        target: rel.target_project_id,
        value: rel.strength,
        type: 'import'
      });
    }

    setGraphNodes(nodes);
    setGraphLinks(links);
  };

  const handleExport = async (format: 'json' | 'csv' | 'markdown') => {
    if (!currentScan) return;

    try {
      const response = await fetch(`/api/dependencies/${currentScan.scan.id}/export?format=${format}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dependency-scan.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting scan:', error);
    }
  };

  const handleLoadScan = (scanId: string) => {
    loadScanResults(scanId);
  };

  const handleDeleteScan = async (scanId: string) => {
    if (!confirm('Are you sure you want to delete this scan?')) return;

    try {
      await fetch(`/api/dependencies/${scanId}`, { method: 'DELETE' });
      await fetchScans();
      if (currentScan?.scan.id === scanId) {
        setCurrentScan(null);
        setGraphNodes([]);
        setGraphLinks([]);
      }
    } catch (error) {
      console.error('Error deleting scan:', error);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        className={styles.floatingButton}
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <svg
          className={styles.icon}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      </motion.button>

      {/* Main Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={styles.panel}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
          >
            <div className={styles.header}>
              <h2>Cross-Project Dependency Visualizer</h2>
              <button
                className={styles.closeButton}
                onClick={() => setIsOpen(false)}
              >
                ×
              </button>
            </div>

            <div className={styles.content}>
              {/* Sidebar */}
              <div className={styles.sidebar}>
                <div className={styles.section}>
                  <h3>Select Projects</h3>
                  <div className={styles.projectList}>
                    {projects.map(project => (
                      <label key={project.id} className={styles.projectItem}>
                        <input
                          type="checkbox"
                          checked={selectedProjects.includes(project.id)}
                          onChange={() => handleProjectToggle(project.id)}
                        />
                        <span>{project.name}</span>
                        <span className={styles.projectType}>{project.type}</span>
                      </label>
                    ))}
                  </div>

                  <button
                    className={styles.scanButton}
                    onClick={handleStartScan}
                    disabled={isScanning || selectedProjects.length < 2}
                  >
                    {isScanning ? `Scanning... ${scanProgress}%` : 'Start Scan'}
                  </button>

                  {isScanning && (
                    <div className={styles.progressBar}>
                      <div
                        className={styles.progressFill}
                        style={{ width: `${scanProgress}%` }}
                      />
                    </div>
                  )}
                </div>

                <div className={styles.section}>
                  <h3>Previous Scans</h3>
                  <div className={styles.scanList}>
                    {scans.map(scan => (
                      <div key={scan.scanId} className={styles.scanItem}>
                        <div className={styles.scanInfo}>
                          <div className={styles.scanName}>{scan.scanName}</div>
                          <div className={styles.scanDate}>
                            {new Date(scan.scanDate).toLocaleString()}
                          </div>
                          <div className={styles.scanStats}>
                            {scan.totalDependencies} deps · {scan.sharedDependencies} shared · {scan.codeDuplicates} duplicates
                          </div>
                        </div>
                        <div className={styles.scanActions}>
                          <button
                            className={styles.actionButton}
                            onClick={() => handleLoadScan(scan.scanId)}
                            title="Load scan"
                          >
                            📊
                          </button>
                          <button
                            className={styles.actionButton}
                            onClick={() => handleDeleteScan(scan.scanId)}
                            title="Delete scan"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Main Content */}
              <div className={styles.mainContent}>
                {currentScan ? (
                  <>
                    {/* Tabs */}
                    <div className={styles.tabs}>
                      <button
                        className={`${styles.tab} ${activeTab === 'graph' ? styles.active : ''}`}
                        onClick={() => setActiveTab('graph')}
                      >
                        Dependency Graph
                      </button>
                      <button
                        className={`${styles.tab} ${activeTab === 'shared' ? styles.active : ''}`}
                        onClick={() => setActiveTab('shared')}
                      >
                        Shared Dependencies ({currentScan.sharedDependencies?.length || 0})
                      </button>
                      <button
                        className={`${styles.tab} ${activeTab === 'duplicates' ? styles.active : ''}`}
                        onClick={() => setActiveTab('duplicates')}
                      >
                        Code Duplicates ({currentScan.codeDuplicates?.length || 0})
                      </button>
                      <button
                        className={`${styles.tab} ${activeTab === 'relationships' ? styles.active : ''}`}
                        onClick={() => setActiveTab('relationships')}
                      >
                        Relationships
                      </button>

                      <div className={styles.exportButtons}>
                        <button
                          className={styles.exportButton}
                          onClick={() => handleExport('json')}
                        >
                          Export JSON
                        </button>
                        <button
                          className={styles.exportButton}
                          onClick={() => handleExport('csv')}
                        >
                          Export CSV
                        </button>
                        <button
                          className={styles.exportButton}
                          onClick={() => handleExport('markdown')}
                        >
                          Export MD
                        </button>
                      </div>
                    </div>

                    {/* Tab Content */}
                    <div className={styles.tabContent}>
                      {activeTab === 'graph' && (
                        <DependencyGraph
                          nodes={graphNodes}
                          links={graphLinks}
                          width={1000}
                          height={600}
                        />
                      )}

                      {activeTab === 'shared' && (
                        <div className={styles.listView}>
                          <h3>Shared Dependencies</h3>
                          {currentScan.sharedDependencies?.map((dep: any) => (
                            <div key={dep.id} className={styles.card}>
                              <div className={styles.cardHeader}>
                                <h4>{dep.dependency_name}</h4>
                                <span className={`${styles.badge} ${styles[dep.priority || 'low']}`}>
                                  {dep.priority || 'low'}
                                </span>
                              </div>
                              <p className={styles.cardMeta}>
                                Used in {dep.project_ids.length} projects
                              </p>
                              {dep.refactoring_opportunity && (
                                <p className={styles.cardOpportunity}>
                                  💡 {dep.refactoring_opportunity}
                                </p>
                              )}
                              {dep.version_conflicts && (
                                <div className={styles.versionConflicts}>
                                  <strong>Version Conflicts:</strong>
                                  <ul>
                                    {Object.entries(dep.version_conflicts).map(([projectId, version]) => {
                                      const project = currentScan.projects.find((p: any) => p.id === projectId);
                                      return (
                                        <li key={projectId}>
                                          {project?.name}: {version as string}
                                        </li>
                                      );
                                    })}
                                  </ul>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {activeTab === 'duplicates' && (
                        <div className={styles.listView}>
                          <h3>Code Duplicates</h3>
                          {currentScan.codeDuplicates?.map((dup: any) => (
                            <div key={dup.id} className={styles.card}>
                              <div className={styles.cardHeader}>
                                <h4>{dup.pattern_type} Pattern</h4>
                                <span className={styles.badge}>
                                  {dup.occurrences.length} occurrences
                                </span>
                              </div>
                              <p className={styles.cardMeta}>
                                Similarity: {(dup.similarity_score * 100).toFixed(0)}% ·
                                Estimated Savings: {dup.estimated_savings}
                              </p>
                              {dup.refactoring_suggestion && (
                                <p className={styles.cardOpportunity}>
                                  💡 {dup.refactoring_suggestion}
                                </p>
                              )}
                              <details className={styles.codeDetails}>
                                <summary>View Code Snippet</summary>
                                <pre className={styles.codeSnippet}>
                                  <code>{dup.code_snippet}</code>
                                </pre>
                              </details>
                              <div className={styles.occurrences}>
                                <strong>Locations:</strong>
                                <ul>
                                  {dup.occurrences.map((occ: any, idx: number) => {
                                    const project = currentScan.projects.find((p: any) => p.id === occ.project_id);
                                    return (
                                      <li key={idx}>
                                        {project?.name}: {occ.file_path} (lines {occ.line_start}-{occ.line_end})
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {activeTab === 'relationships' && (
                        <div className={styles.listView}>
                          <h3>Project Relationships</h3>
                          {currentScan.relationships?.map((rel: any) => {
                            const sourceProject = currentScan.projects.find((p: any) => p.id === rel.source_project_id);
                            const targetProject = currentScan.projects.find((p: any) => p.id === rel.target_project_id);
                            return (
                              <div key={rel.id} className={styles.card}>
                                <div className={styles.relationshipCard}>
                                  <span className={styles.projectName}>{sourceProject?.name}</span>
                                  <span className={styles.arrow}>→</span>
                                  <span className={styles.projectName}>{targetProject?.name}</span>
                                </div>
                                <p className={styles.cardMeta}>
                                  Type: {rel.relationship_type} · Strength: {rel.strength}
                                </p>
                                <p className={styles.cardMeta}>
                                  {rel.source_module} → {rel.target_module}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className={styles.emptyState}>
                    <svg
                      className={styles.emptyIcon}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                    <h3>No Scan Selected</h3>
                    <p>Select at least 2 projects and start a scan to visualize dependencies</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
