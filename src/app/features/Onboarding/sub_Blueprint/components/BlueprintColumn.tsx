'use client';
import { motion } from 'framer-motion';
import IlluminatedButton from './IlluminatedButton';
import ColumnTooltip from './ColumnTooltip';
import { ColumnConfig } from '../lib/blueprintConfig';
import { useBlueprintStore } from '../store/blueprintStore';

interface BlueprintColumnProps {
  column: ColumnConfig;
  delay: number;
  selectedScanId: string | null;
  onSelectScan: (scanId: string) => void;
  onScan: (scanId: string) => void;
  onNavigate: (module: 'ideas' | 'tinder' | 'tasker' | 'reflector') => void;
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
  getDaysAgo,
}: BlueprintColumnProps) {
  // Get tasker progress and tooltip state from blueprint store
  const { taskerProgress, activeTooltip, showTooltip, hideTooltip } = useBlueprintStore();
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
      data-testid={`blueprint-column-${column.id}`}
      onMouseEnter={() => column.tooltipDescription && showTooltip(column.id)}
      onMouseLeave={() => hideTooltip()}
      onTouchStart={() => column.tooltipDescription && showTooltip(column.id)}
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

      {/* Tooltip */}
      {column.tooltipDescription && (
        <ColumnTooltip
          isVisible={activeTooltip === column.id}
          title={column.title}
          description={column.tooltipDescription}
          onClose={hideTooltip}
        />
      )}

      {/* Buttons - Increased spacing from space-y-10  */}
      <div className="flex flex-col gap-16">
        {column.buttons.map((button, index) => {
          // Special handling for tasker button - show progress instead of icon
          const isTaskerButton = button.id === 'tasker';
          const showTaskerProgress = isTaskerButton && taskerProgress.isRunning;
          const taskerProgressText = showTaskerProgress
            ? `${taskerProgress.completedCount}/${taskerProgress.totalCount}`
            : '';

          return (
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
                selected={button.id === selectedScanId || showTaskerProgress}
                daysAgo={getDaysAgo(button.id)}
                showDaysAgo={!!button.scanHandler}
                redirectMode={button.action === 'navigate'}
                showProgress={showTaskerProgress}
                progressText={taskerProgressText}
              />
            </motion.div>
          );
        })}
      </div>

      {/* Decorative circuit lines */}
      <div
        className={`absolute -right-8 top-1/2 w-16 h-px bg-gradient-to-r from-${column.color}-500/30 to-transparent`}
      />
    </motion.div>
  );
}
