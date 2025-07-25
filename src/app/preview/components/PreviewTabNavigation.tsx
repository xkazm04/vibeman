import React from 'react';
import { motion } from 'framer-motion';
import { TestTubeDiagonal } from 'lucide-react';
import { Project } from '@/types';
import { PreviewTab } from './PreviewTab';

interface PreviewTabNavigationProps {
  projects: Project[];
  selectedTab: string;
  prototypeMode: boolean;
  onTabClick: (projectId: string) => void;
  onTogglePrototypeMode: () => void;
}

export const PreviewTabNavigation: React.FC<PreviewTabNavigationProps> = ({
  projects,
  selectedTab,
  prototypeMode,
  onTabClick,
  onTogglePrototypeMode
}) => {
  return (
    <div className="bg-gray-900/50 border-b border-gray-800 px-4 flex-shrink-0">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex space-x-1 overflow-hidden">
            {projects.map((project, index) => (
              <PreviewTab
                key={project.id || `project-${index}`}
                project={project}
                isActive={!prototypeMode && selectedTab === project.id}
                onTabClick={onTabClick}
                disabled={prototypeMode}
              />
            ))}
          </div>
          
          {/* Enhanced Prototype Mode Button */}
          <motion.button
            onClick={onTogglePrototypeMode}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`relative group ml-4 p-3 rounded-lg border-2 transition-all duration-300 ${
              prototypeMode
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 border-purple-500 text-white'
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-purple-500 hover:text-purple-400'
            }`}
            title={prototypeMode ? "Exit Prototype Mode" : "Enter Prototype Mode - View all running projects"}
          >
            {/* Icon */}
            <motion.div
              animate={prototypeMode ? { rotate: [0, 360] } : { rotate: 0 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
            >
              <TestTubeDiagonal size={20} />
            </motion.div>
            
            {/* Base Glow Effect */}
            <motion.div
              className="absolute inset-0 rounded-lg bg-gradient-to-r from-purple-500/30 to-pink-500/30 blur-sm"
              animate={prototypeMode ? { 
                opacity: [0.6, 1, 0.6],
                scale: [1, 1.1, 1]
              } : { 
                opacity: [0.2, 0.4, 0.2],
                scale: [1, 1.05, 1]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            
            {/* Intense Glow for Active State */}
            {prototypeMode && (
              <motion.div
                className="absolute inset-0 rounded-lg bg-gradient-to-r from-purple-400/40 to-pink-400/40 blur-md"
                animate={{ 
                  opacity: [0.3, 0.8, 0.3],
                  scale: [1, 1.2, 1]
                }}
                transition={{ 
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            )}
            
            {/* Moving Particles Animation */}
            {prototypeMode && (
              <>
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1 h-1 bg-white rounded-full opacity-70"
                    initial={{ 
                      x: 0, 
                      y: 0,
                      opacity: 0
                    }}
                    animate={{
                      x: [0, Math.cos(i * 60 * Math.PI / 180) * 25, 0],
                      y: [0, Math.sin(i * 60 * Math.PI / 180) * 25, 0],
                      opacity: [0, 1, 0]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: i * 0.2,
                      ease: "easeInOut"
                    }}
                    style={{
                      left: '50%',
                      top: '50%',
                      transform: 'translate(-50%, -50%)'
                    }}
                  />
                ))}
              </>
            )}
            
            {/* Hover Enhancement */}
            <motion.div
              className="absolute inset-0 rounded-lg bg-gradient-to-r from-purple-600/10 to-pink-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            />
          </motion.button>
        </div>
      </div>
    </div>
  );
}; 