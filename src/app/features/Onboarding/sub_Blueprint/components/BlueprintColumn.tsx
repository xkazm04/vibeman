'use client';

import { motion } from 'framer-motion';
import IlluminatedButton from './IlluminatedButton';
import { ColumnConfig } from '../lib/blueprintConfig';
import { ScanStatus } from '../store/blueprintStore';

interface BlueprintColumnProps {
  column: ColumnConfig;
  delay: number;
  selectedScanId: string | null;
  onSelectScan: (scanId: string) => void;
  onScan: (scanId: string) => void;
  onNavigate: (module: 'ideas' | 'tinder' | 'tasker' | 'reflector') => void;
  getScanStatus: (scanId: string) => ScanStatus;
  getDaysAgo: (scanId: string) => number | null;
}

/**
 * Reusable column component for the blueprint layout
 */
export default function BlueprintColumn({
  column,
  delay,
  selectedScanId,
  onSelectScan,
  onScan,
  onNavigate,
  getScanStatus,
  getDaysAgo,
}: BlueprintColumnProps) {
  // If column is reserved, show placeholder
  if (column.reserved) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay }}
        className="relative opacity-30"
      >
        <div className="mb-12">
          <div className="h-px bg-gradient-to-r from-gray-500/50 via-gray-500/30 to-transparent mb-2" />
          <h2 className="text-gray-500 text-sm font-mono tracking-wider uppercase">
            {column.title}
          </h2>
        </div>

        <div className="text-center mt-20">
          <div className="inline-block px-4 py-2 border border-gray-700/50 rounded text-gray-600 text-xs font-mono">
            FUTURE_PHASES
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: delay < 0.6 ? -20 : delay < 0.7 ? -10 : 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="relative"
    >
      {/* Column header with line */}
      <div className="mb-12">
        <div
          className={`h-px bg-gradient-to-r ${
            column.gradientVia
              ? `from-${column.gradientFrom} via-${column.gradientVia}`
              : `from-${column.gradientFrom}`
          } to-transparent mb-2`}
        />
        <h2 className={`text-${column.color}-300 text-sm font-mono tracking-wider uppercase`}>
          {column.title}
        </h2>
      </div>

      {/* Buttons - Increased spacing from space-y-10  */}
      <div className="flex flex-col gap-16">
        {column.buttons.map((button, index) => (
          <motion.div
            key={button.id}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: delay + 0.1 + index * 0.1 }}
          >
            <IlluminatedButton
              label={button.label}
              icon={button.icon}
              onClick={() => {
                if (button.action === 'scan') {
                  onSelectScan(button.id); // Select/deselect for scan
                } else if (button.action === 'navigate' && button.target) {
                  onNavigate(button.target);
                }
              }}
              color={button.color}
              size="md"
              disabled={button.action === 'scan' && !button.scanHandler}
              selected={button.id === selectedScanId}
              hasError={getScanStatus(button.id).hasError}
              glowing={!getScanStatus(button.id).isRunning && button.id === 'contexts'}
              scanning={getScanStatus(button.id).isRunning}
              progress={getScanStatus(button.id).progress}
              daysAgo={getDaysAgo(button.id)}
              showDaysAgo={!!button.scanHandler}
              redirectMode={button.action === 'navigate'}
            />
          </motion.div>
        ))}
      </div>

      {/* Decorative circuit lines */}
      <div
        className={`absolute -right-8 top-1/2 w-16 h-px bg-gradient-to-r from-${column.color}-500/30 to-transparent`}
      />
    </motion.div>
  );
}
