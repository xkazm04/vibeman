import React, { useState } from 'react';
import { ModalTransition, ModalContent, ModalVariant, ModalTransitionType } from './ModalTransition';
import { X, Sparkles } from 'lucide-react';

/**
 * Demo component showcasing different ModalTransition variants
 * This is for testing and documentation purposes
 */
export const ModalTransitionDemo: React.FC = () => {
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const variants: { name: ModalVariant; label: string }[] = [
    { name: 'default', label: 'Default (Scale + Fade)' },
    { name: 'spring', label: 'Spring (Bouncy)' },
    { name: 'slideUp', label: 'Slide from Bottom' },
    { name: 'slideDown', label: 'Slide from Top' },
    { name: 'fade', label: 'Fade Only' },
    { name: 'scale', label: 'Scale Only' },
  ];

  const transitions: { name: ModalTransitionType; label: string }[] = [
    { name: 'default', label: 'Default' },
    { name: 'spring', label: 'Spring' },
    { name: 'smooth', label: 'Smooth' },
    { name: 'fast', label: 'Fast' },
    { name: 'slow', label: 'Slow' },
  ];

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Modal Transition Variants</h1>
        <p className="text-gray-400 mb-6">
          Click on any button to preview different modal animation styles
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {variants.map((variant) => (
            <button
              key={variant.name}
              onClick={() => setActiveModal(variant.name)}
              className="px-4 py-3 bg-gradient-to-r from-blue-600/20 to-purple-600/20 hover:from-blue-600/30 hover:to-purple-600/30 border border-blue-500/40 rounded-lg text-white font-medium transition-all"
            >
              {variant.label}
            </button>
          ))}
        </div>
      </div>

      {/* Render modals for each variant */}
      {variants.map((variant) => {
        const transitionType = variant.name === 'spring' ? 'spring' : 'default';

        return (
          <ModalTransition
            key={variant.name}
            isOpen={activeModal === variant.name}
            onClose={() => setActiveModal(null)}
            variant={variant.name}
            transition={transitionType}
          >
            <ModalContent className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-gray-700/40 shadow-2xl max-w-md w-full p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-br from-blue-800/60 to-purple-900/60 rounded-lg border border-blue-600/30">
                    <Sparkles className="w-5 h-5 text-blue-300" />
                  </div>
                  <h2 className="text-xl font-semibold text-white">{variant.label}</h2>
                </div>
                <button
                  onClick={() => setActiveModal(null)}
                  className="p-2 hover:bg-gray-700/40 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Content */}
              <div className="space-y-4">
                <p className="text-gray-300">
                  This modal uses the <span className="font-mono text-blue-400">{variant.name}</span> animation variant
                  with <span className="font-mono text-purple-400">{transitionType}</span> transition.
                </p>

                <div className="p-4 bg-gray-800/60 rounded-lg border border-gray-700/40">
                  <p className="text-sm text-gray-400">
                    The ModalTransition component provides consistent animations across all modals,
                    reducing CSS duplication and ensuring visual consistency.
                  </p>
                </div>

                <button
                  onClick={() => setActiveModal(null)}
                  className="w-full px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 rounded-lg text-blue-300 font-semibold transition-all"
                >
                  Close Modal
                </button>
              </div>
            </ModalContent>
          </ModalTransition>
        );
      })}
    </div>
  );
};

export default ModalTransitionDemo;
