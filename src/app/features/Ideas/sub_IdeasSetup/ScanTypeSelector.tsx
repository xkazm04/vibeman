import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { ScanType, SCAN_TYPES } from './lib/ScanTypeConfig';

export type { ScanType };

interface ScanTypeSelectorProps {
  selectedTypes: ScanType[];
  onChange: (types: ScanType[]) => void;
}

export default function ScanTypeSelector({ selectedTypes, onChange }: ScanTypeSelectorProps) {
  const handleToggle = (type: ScanType) => {
    if (selectedTypes.includes(type)) {
      // Deselect - but keep at least one selected
      if (selectedTypes.length > 1) {
        onChange(selectedTypes.filter(t => t !== type));
      }
    } else {
      // Select - add to array
      onChange([...selectedTypes, type]);
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center space-x-2 mb-3">
        <Sparkles className="w-4 h-4 text-cyan-400" />
        <h3 className="text-sm font-semibold text-cyan-300">
          Scan Type {selectedTypes.length > 1 && <span className="text-sm text-cyan-500">({selectedTypes.length} selected)</span>}
        </h3>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {SCAN_TYPES.map((type) => {
          const isSelected = selectedTypes.includes(type.value);
          return (
            <motion.button
              key={type.value}
              onClick={() => handleToggle(type.value)}
              className={`relative px-4 py-3 rounded-lg border-2 transition-all duration-300 ${
                isSelected
                  ? type.color
                  : 'bg-gray-800/40 border-gray-700/40 text-gray-400 hover:bg-gray-800/60 hover:border-gray-600/40'
              }`}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Selected indicator */}
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
    </div>
  );
}
