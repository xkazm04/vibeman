import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Check } from 'lucide-react';
import { useState } from 'react';
import { SCAN_TYPES } from './lib/ScanTypeConfig';
import { ScanType } from '../lib/scanTypes';
import PromptEditorModal from './components/PromptEditorModal';

export type { ScanType };

interface ScanTypeSelectorProps {
  selectedTypes: ScanType[];
  onChange: (types: ScanType[]) => void;
}

export default function ScanTypeSelector({ selectedTypes, onChange }: ScanTypeSelectorProps) {
  const [editingPrompt, setEditingPrompt] = useState<{ scanType: ScanType; label: string } | null>(null);
  const [shakingType, setShakingType] = useState<ScanType | null>(null);

  const allSelected = selectedTypes.length === SCAN_TYPES.length;

  const handleToggle = (type: ScanType) => {
    if (selectedTypes.includes(type)) {
      if (selectedTypes.length > 1) {
        onChange(selectedTypes.filter(t => t !== type));
      } else {
        // Shake to indicate can't deselect last item
        setShakingType(type);
        setTimeout(() => setShakingType(null), 500);
      }
    } else {
      onChange([...selectedTypes, type]);
    }
  };

  const handleSelectAllOrClear = () => {
    if (allSelected) {
      // Clear to just the first selected type
      onChange([selectedTypes[0]]);
    } else {
      onChange(SCAN_TYPES.map(t => t.value));
    }
  };

  const handleRightClick = (e: React.MouseEvent, type: ScanType, label: string) => {
    e.preventDefault();
    setEditingPrompt({ scanType: type, label });
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-cyan-300">
            Scan Type {selectedTypes.length > 1 && <span className="text-sm text-cyan-500">({selectedTypes.length} selected)</span>}
          </h3>
        </div>
        <button
          onClick={handleSelectAllOrClear}
          className="text-[11px] text-cyan-500 hover:text-cyan-300 transition-colors"
        >
          {allSelected ? 'Clear' : 'Select All'}
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {SCAN_TYPES.map((type) => {
          const isSelected = selectedTypes.includes(type.value);
          const isShaking = shakingType === type.value;
          return (
            <motion.button
              key={type.value}
              onClick={() => handleToggle(type.value)}
              onContextMenu={(e) => handleRightClick(e, type.value, type.label)}
              className={`relative px-4 py-3 rounded-lg border-2 transition-all duration-300 ${
                isSelected
                  ? type.color
                  : 'bg-gray-800/40 border-gray-700/40 text-gray-400 hover:bg-gray-800/60 hover:border-gray-600/40'
              }`}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              animate={isShaking ? { x: [-2, 2, -2, 2, 0] } : { x: 0 }}
              transition={isShaking ? { duration: 0.3 } : undefined}
              title="Right-click to edit prompt"
            >
              {/* Checkmark overlay */}
              <AnimatePresence>
                {isSelected && (
                  <motion.div
                    className="absolute top-1 right-1 w-4 h-4 bg-white/20 rounded-full flex items-center justify-center"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Check className="w-2.5 h-2.5 text-white" />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Selected gradient overlay */}
              {isSelected && (
                <motion.div
                  className="absolute inset-0 rounded-lg opacity-20"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%)'
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.2 }}
                  transition={{ duration: 0.3 }}
                />
              )}

              <div className="relative flex flex-col items-center space-y-2">
                <span className="text-2xl">{type.emoji}</span>
                <span className={`text-sm font-semibold ${isSelected ? '' : 'text-gray-400'}`}>
                  {type.label}
                </span>
                <span className={`text-[10px] text-center leading-tight ${isSelected ? 'opacity-80' : 'opacity-60'}`}>
                  {type.description}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Prompt Editor Modal */}
      {editingPrompt && (
        <PromptEditorModal
          isOpen={true}
          onClose={() => setEditingPrompt(null)}
          scanType={editingPrompt.scanType}
          promptLabel={editingPrompt.label}
        />
      )}
    </div>
  );
}
