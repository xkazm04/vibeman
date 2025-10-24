'use client';
import GoalsLayout from './Goals/GoalsLayout';
import HorizontalContextBar from './Context/HorizontalContextBar';
import { useStore } from '../../stores/nodeStore';
import { useActiveProjectStore } from '../../stores/activeProjectStore';
import ClaudeSection from '../Claude/ClaudeSection';

export default function CoderLayout() {
  const { getSelectedFilePaths } = useStore();
  const { fileStructure, activeProject } = useActiveProjectStore();

  // Get selected file paths and count using the proper method
  const selectedFilePaths = getSelectedFilePaths(fileStructure, activeProject?.id || null);
  const selectedFilesCount = selectedFilePaths.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-[95vw] mx-auto h-full">
        {/* Goals Layout - Thin bar at the top */}
        <GoalsLayout />

        {/* Claude Code Section - Below Goals */}
        <div className="mb-8">
          <ClaudeSection />
        </div>

        {/* Horizontal Context Bar - Flexible Height */}
        <div className="mb-8">
          <HorizontalContextBar
            selectedFilesCount={selectedFilesCount}
            selectedFilePaths={selectedFilePaths}
          />
        </div>
      </div>
    </div>
  );
}