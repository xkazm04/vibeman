'use client';
import { motion } from 'framer-motion';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import TreeLayout from './CodeTree/TreeLayout';
import Backlog from './Backlog/Backlog';
import GoalsLayout from './Goals/GoalsLayout';

export default function CoderLayout() {
  return (
    <div className="min-h-[500px] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <div className="max-w-[90vw] mx-auto h-full">
        {/* Goals Layout - Thin bar at the top */}
        <GoalsLayout />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="h-[calc(100vh-200px)]" // Fixed height for resizable panels
        >
          <PanelGroup direction="horizontal" className="">
            {/* Tree Layout Panel */}
            <Panel 
              defaultSize={35} 
              minSize={25} 
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

            <Panel 
              defaultSize={65} 
              minSize={50} 
              maxSize={75}
              className="flex"
            >
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
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