'use client';

import { motion } from 'framer-motion';
import { useRefactorStore } from '@/stores/refactorStore';
import { Check } from 'lucide-react';

const steps = [
  { id: 'scan', label: 'Scan' },
  { id: 'review', label: 'Review' },
  { id: 'execute', label: 'Create' },
  { id: 'results', label: 'Summary' },
] as const;

export default function WizardProgress() {
  const { currentStep } = useRefactorStore();

  const currentIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <div className="mt-6 flex items-center justify-between">
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isPending = index > currentIndex;

        return (
          <div key={step.id} className="flex items-center flex-1">
            {/* Step Circle */}
            <div className="relative flex flex-col items-center">
              <motion.div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  isCompleted
                    ? 'bg-cyan-500/20 border-cyan-500'
                    : isCurrent
                    ? 'bg-cyan-500/30 border-cyan-400 shadow-lg shadow-cyan-500/30'
                    : 'bg-black/50 border-gray-600'
                }`}
                animate={isCurrent ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5 text-cyan-400" />
                ) : (
                  <span className={`text-sm font-medium ${
                    isCurrent ? 'text-cyan-300' : 'text-gray-500'
                  }`}>
                    {index + 1}
                  </span>
                )}
              </motion.div>

              {/* Label */}
              <span className={`mt-2 text-xs font-light absolute top-12 whitespace-nowrap ${
                isCurrent ? 'text-cyan-300' : isCompleted ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {step.label}
              </span>
            </div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div className="flex-1 h-0.5 mx-2 relative">
                <div className="absolute inset-0 bg-gray-700" />
                {isCompleted && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.5 }}
                    style={{ transformOrigin: 'left' }}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
