'use client';
import { motion } from 'framer-motion';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import TreeLayout from './CodeTree/TreeLayout';
import Backlog from './Backlog/Backlog';
import GoalsLayout from './Goals/GoalsLayout';
import HorizontalContextBar from './Context/HorizontalContextBar';
import { useStore } from '../../stores/nodeStore';
import { useActiveProjectStore } from '../../stores/activeProjectStore';

export default function CoderLayout() {
  const { selectedNodes, getSelectedFilePaths } = useStore();
  const { fileStructure, activeProject } = useActiveProjectStore();
  
  // Get selected file paths and count using the proper method
  const selectedFilePaths = getSelectedFilePaths(fileStructure, activeProject?.id || null);
  const selectedFilesCount = selectedFilePaths.length;

  return (
    <div className="min-h-[500px] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <div className="max-w-[90vw] mx-auto h-full">
        {/* Goals Layout - Thin bar at the top */}
        <GoalsLayout />
        
        {/* Horizontal Context Bar */}
        <HorizontalContextBar 
          selectedFilesCount={selectedFilesCount}
          selectedFilePaths={selectedFilePaths}
        />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="h-[calc(100vh-280px)]" 
        >
          <PanelGroup direction="horizontal" className="">
            {/* Tree Layout Panel */}
            <Panel 
              defaultSize={40} 
              minSize={30} 
              maxSize={50}
              className="flex"
            >
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="w-full"
              >
                <TreeLayout />
              </motion.div>
            </Panel>

            <PanelResizeHandle className="w-1 bg-gray-700/30 hover:bg-gray-600/50 transition-colors duration-200 rounded-full cursor-col-resize flex items-center justify-center group"/>

            {/* Backlog Panel */}
            <Panel 
              defaultSize={60} 
              minSize={50} 
              maxSize={70}
              className="flex"
            >
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="w-full"
              >
                <Backlog />
              </motion.div>
            </Panel>
          </PanelGroup>
        </motion.div>
      </div>
    </div>
  );
}