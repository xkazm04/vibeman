import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import ContextMenu from '../ContextMenu/ContextMenu';
import { useTooltipStore } from '../../../../stores/tooltipStore';

interface ContextJailCardProps {
  context: any;
  group: any;
  index: number;
  fontSize: string;
  availableGroups: any[];
  selectedFilePaths: string[];
}

const ContextJailCard: React.FC<ContextJailCardProps> = ({
  context,
  group,
  index,
  fontSize,
  availableGroups,
  selectedFilePaths
}) => {
  const [contextMenu, setContextMenu] = useState<{
    isVisible: boolean;
    position: { x: number; y: number };
  }>({
    isVisible: false,
    position: { x: 0, y: 0 }
  });

  const { toggleTooltip } = useTooltipStore();
  const cardRef = useRef<HTMLDivElement>(null);

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setContextMenu({
      isVisible: true,
      position: { x: e.clientX, y: e.clientY }
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(prev => ({ ...prev, isVisible: false }));
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleTooltip(context, group?.color || '#06b6d4');
  };

  return (
    <>
      <motion.div
        ref={cardRef}
        className="relative group cursor-pointer"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          duration: 0.3,
          delay: index * 0.1,
          type: "spring",
          stiffness: 300,
          damping: 30
        }}
        whileHover={{ scale: 1.02 }}
        onClick={handleClick}
        onContextMenu={handleRightClick}
      >
        {/* Jail Door Rectangle */}
        <div 
          className="relative h-full w-full overflow-hidden border-2 bg-gradient-to-br from-gray-900/40 via-transparent to-gray-800/40 backdrop-blur-sm group-hover:from-gray-800/60 group-hover:to-gray-700/60 transition-all duration-300"
          style={{ borderColor: `${group?.color}60` }}
        >
          
          {/* Vertical Bars */}
          <div className="absolute inset-0 flex">
            {Array.from({ length: 6 }).map((_, barIndex) => (
              <motion.div
                key={barIndex}
                className="flex-1 border-r"
                style={{
                  borderColor: `${group?.color}20`
                }}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ 
                  delay: index * 0.1 + barIndex * 0.02,
                  duration: 0.3 
                }}
              />
            ))}
          </div>

          {/* Horizontal Bars */}
          <div className="absolute inset-0 flex flex-col">
            {Array.from({ length: 4 }).map((_, barIndex) => (
              <motion.div
                key={barIndex}
                className="flex-1 border-b"
                style={{
                  borderColor: `${group?.color}20`
                }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ 
                  delay: index * 0.1 + barIndex * 0.03,
                  duration: 0.3 
                }}
              />
            ))}
          </div>

          {/* Context Name - Main Content */}
          <div className="relative z-10 h-full flex items-center justify-center p-4">
            <motion.h4 
              className={`font-bold font-mono text-center leading-tight bg-gradient-to-r bg-clip-text text-transparent ${fontSize}`}
              style={{
                backgroundImage: `linear-gradient(to right, ${group?.color}, ${group?.color}C0)`
              }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ 
                delay: index * 0.1 + 0.3,
                type: "spring",
                stiffness: 300,
                damping: 30
              }}
            >
              {context.name}
            </motion.h4>
          </div>

          {/* Hover Glow Effect */}
          <motion.div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
            style={{
              background: `linear-gradient(45deg, ${group?.color}15, transparent, ${group?.color}15)`,
              filter: 'blur(2px)',
            }}
          />

          {/* Corner Reinforcements */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2" style={{ borderColor: group?.color }} />
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2" style={{ borderColor: group?.color }} />
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2" style={{ borderColor: group?.color }} />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2" style={{ borderColor: group?.color }} />
        </div>
      </motion.div>

      {/* Context Menu */}
      <ContextMenu
        context={context}
        isVisible={contextMenu.isVisible}
        position={contextMenu.position}
        onClose={handleCloseContextMenu}
        availableGroups={availableGroups}
        selectedFilePaths={selectedFilePaths}
      />


    </>
  );
};

export default ContextJailCard;