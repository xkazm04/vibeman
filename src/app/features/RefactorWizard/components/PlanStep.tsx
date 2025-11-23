'use client';

import { useRefactorStore } from '@/stores/refactorStore';
import { StepContainer } from '@/components/ui/wizard';
import { StepHeader } from '@/components/ui/wizard/StepHeader';
import { Map, ArrowRight, Layers, Box } from 'lucide-react';
import PackageCard from './PackageCard';

export default function PlanStep() {
    const {
        wizardPlan,
        packages,
        selectedPackages,
        togglePackageSelection,
        selectPackagesWithDependencies,
        analysisStatus,
        setCurrentStep
    } = useRefactorStore();

    const isAnalyzing = analysisStatus === 'generating-plan' || analysisStatus === 'analyzing';

    // If no plan exists, show loading or empty state
    if (!wizardPlan && !isAnalyzing && packages.length === 0) {
        return (
            <StepContainer
                isLoading={false}
                data-testid="plan-step-empty"
            >
                <div className="text-center py-12">
                    <p className="text-gray-400">No plan generated yet.</p>
                    <button
                        onClick={() => setCurrentStep('scan')}
                        className="mt-4 text-cyan-400 hover:underline"
                    >
                        Go back to Scan
                    </button>
                </div>
            </StepContainer>
        );
    }

    const handleContinue = () => {
        setCurrentStep('review');
    };

    return (
        <StepContainer
            isLoading={isAnalyzing}
            data-testid="plan-step-container"
        >
            <StepHeader
                title="Refactoring Strategy"
                description="AI-generated strategic plan for your refactoring"
                icon={Map}
                currentStep={3}
                totalSteps={6}
            />

            {/* Plan Overview */}
            {wizardPlan && (
                <div className="bg-white/5 rounded-lg p-4 border border-white/10 mb-6">
                    <h3 className="text-lg font-semibold text-white mb-2">
                        Strategic Approach
                    </h3>
                    <p className="text-gray-300 text-sm mb-4">
                        {wizardPlan.reasoning}
                    </p>

                    <div className="flex gap-4 text-sm">
                        <div className="flex items-center gap-2 text-cyan-400">
                            <Layers className="w-4 h-4" />
                            <span>{packages.length} Packages</span>
                        </div>
                        <div className="flex items-center gap-2 text-purple-400">
                            <Box className="w-4 h-4" />
                            <span>{wizardPlan.detectedFrameworks.join(', ')}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Packages List */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-white font-medium">Recommended Packages</h3>
                    <span className="text-sm text-gray-400">
                        {selectedPackages.size} selected
                    </span>
                </div>

                <div className="grid gap-4">
                    {packages.map((pkg) => (
                        <PackageCard
                            key={pkg.id}
                            package={pkg}
                            isSelected={selectedPackages.has(pkg.id)}
                            onToggleSelect={() => togglePackageSelection(pkg.id)}
                            onSelectWithDependencies={() => selectPackagesWithDependencies(pkg.id)}
                            dependencyCount={pkg.dependsOn.length}
                            enabledCount={pkg.enables.length}
                        />
                    ))}
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end pt-6 border-t border-white/10">
                <button
                    onClick={handleContinue}
                    disabled={selectedPackages.size === 0}
                    className="px-6 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-700 disabled:text-gray-500 text-black font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                    <span>Review Selected Packages</span>
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </StepContainer>
    );
}
