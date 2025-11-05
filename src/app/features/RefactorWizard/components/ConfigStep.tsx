'use client';

import { useRefactorStore } from '@/stores/refactorStore';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import {
  WizardStepContainer,
  WizardHeader,
} from '@/components/ui/wizard';
import { motion } from 'framer-motion';
import WizardConfigPanel from './WizardConfigPanel';

export default function ConfigStep() {
  const {
    wizardPlan,
    selectedScanGroups,
    toggleScanGroup,
    toggleTechnique,
    setCurrentStep,
  } = useRefactorStore();

  const handleBack = () => {
    setCurrentStep('scan');
  };

  const handleContinue = () => {
    if (selectedScanGroups.size === 0) {
      alert('Please select at least one scan group to continue');
      return;
    }
    setCurrentStep('review');
  };

  return (
    <WizardStepContainer>
      {/* Header */}
      <WizardHeader
        title="Configure Scan Techniques"
        description="Review and customize the AI-generated scan plan for your project"
      />

      {/* Configuration Panel */}
      <div className="max-h-[500px] overflow-y-auto pr-2">
        <WizardConfigPanel
          plan={wizardPlan}
          selectedGroups={selectedScanGroups}
          onToggleGroup={toggleScanGroup}
          onToggleTechnique={toggleTechnique}
        />
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-6 border-t border-white/10">
        <button
          onClick={handleBack}
          className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-all duration-300 flex items-center space-x-2"
          data-testid="config-back-btn"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Scan</span>
        </button>

        <button
          onClick={handleContinue}
          disabled={selectedScanGroups.size === 0}
          className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all duration-300 shadow-lg hover:shadow-cyan-500/30 disabled:shadow-none relative overflow-hidden group flex items-center space-x-2"
          data-testid="config-continue-btn"
        >
          {/* Blueprint grid pattern overlay */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none"
               style={{
                 backgroundImage: 'linear-gradient(cyan 1px, transparent 1px), linear-gradient(90deg, cyan 1px, transparent 1px)',
                 backgroundSize: '20px 20px'
               }}
          />
          <span>Continue to Review</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </WizardStepContainer>
  );
}
