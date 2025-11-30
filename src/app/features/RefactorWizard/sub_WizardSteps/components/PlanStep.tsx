'use client';

import { useRefactorStore } from '@/stores/refactorStore';
import { StepContainer, CyberCard } from '@/components/ui/wizard';
import { StepHeader } from '@/components/ui/wizard/StepHeader';
import { Map, ArrowRight, ArrowLeft, Layers, Box, AlertCircle, FileCode } from 'lucide-react';
import PackageCard from '../../components/PackageCard';

/**
 * PlanStep - Third step (3/7) of the RefactorWizard workflow.
 *
 * This component displays the AI-generated refactoring strategy:
 * - Shows the wizard plan with strategic reasoning
 * - Displays generated packages with dependency information
 * - Allows users to select which packages to include in the refactoring
 *
 * This step is optional - if no AI-generated plan/packages exist, users can skip
 * directly to the Review step to work with raw opportunities.
 *
 * @component
 *
 * @example
 * // Used as part of RefactorWizardLayout step routing
 * <PlanStep />
 *
 * ## Store Dependencies (refactorStore)
 *
 * **Selectors Used:**
 * - `wizardPlan: WizardPlan | null` - AI-generated strategic plan with reasoning
 * - `packages: RefactoringPackage[]` - Generated refactoring packages
 * - `selectedPackages: Set<string>` - Currently selected package IDs
 * - `analysisStatus: AnalysisStatus` - Check if still analyzing/generating
 * - `opportunities: RefactorOpportunity[]` - Raw opportunities (for fallback path)
 *
 * **Actions Triggered:**
 * - `togglePackageSelection(packageId)` - Toggle individual package selection
 * - `selectPackagesWithDependencies(packageId)` - Select package with all its dependencies
 * - `setCurrentStep('scan')` - Navigate back to ScanStep
 * - `setCurrentStep('review')` - Navigate forward to ReviewStep
 *
 * ## Data Flow
 *
 * **Input:**
 * - `wizardPlan` from refactorStore (set by startAnalysis completion)
 * - `packages` from refactorStore (generated from opportunities)
 *
 * **Output:**
 * - Updates `selectedPackages` in refactorStore
 * - Navigates to 'review' step when user clicks Continue
 *
 * ## Conditional Rendering
 * - **No plan + no packages + has opportunities**: Shows option to skip directly to review
 * - **No plan + no packages + no opportunities**: Shows empty state with back navigation
 * - **Has packages**: Shows full package selection interface
 *
 * ## UI Features
 * - Strategic approach card showing AI reasoning
 * - Package cards with dependency counts and enables counts
 * - Detection of frameworks used in project
 * - Selected package counter
 */
export default function PlanStep() {
    const {
        wizardPlan,
        packages,
        selectedPackages,
        togglePackageSelection,
        selectPackagesWithDependencies,
        analysisStatus,
        setCurrentStep,
        opportunities,
    } = useRefactorStore();

    const isAnalyzing = analysisStatus === 'generating-plan' || analysisStatus === 'analyzing';

    // If no plan and no packages but we have opportunities, show option to skip to review
    if (!wizardPlan && !isAnalyzing && packages.length === 0) {
        return (
            <StepContainer
                isLoading={false}
                data-testid="plan-step-empty"
            >
                {/* Top Navigation */}
                <div className="flex items-center justify-between mb-6">
                    <button
                        onClick={() => setCurrentStep('scan')}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                        data-testid="plan-back-button"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </button>
                    {opportunities.length > 0 && (
                        <button
                            onClick={() => setCurrentStep('review')}
                            className="flex items-center gap-2 px-4 py-2 text-sm bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 rounded-lg transition-all"
                            data-testid="plan-continue-button"
                        >
                            Continue
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    )}
                </div>

                <StepHeader
                    title="Refactoring Strategy"
                    description="AI-generated strategic plan for your refactoring"
                    icon={Map}
                    currentStep={3}
                    totalSteps={7}
                />

                <CyberCard className="text-center py-12">
                    {opportunities.length > 0 ? (
                        <>
                            <FileCode className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
                            <p className="text-gray-300 mb-2">
                                {opportunities.length} opportunities found
                            </p>
                            <p className="text-gray-500 text-sm mb-6">
                                AI packaging was not generated. You can proceed directly to review the opportunities.
                            </p>
                            <button
                                onClick={() => setCurrentStep('review')}
                                className="px-6 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-medium rounded-lg transition-colors flex items-center gap-2"
                            >
                                Review Opportunities
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </>
                    ) : (
                        <>
                            <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                            <p className="text-gray-400 mb-4">No plan generated yet.</p>
                            <button
                                onClick={() => setCurrentStep('scan')}
                                className="text-cyan-400 hover:underline"
                            >
                                Go back to Scan
                            </button>
                        </>
                    )}
                </CyberCard>
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
            {/* Top Navigation */}
            <div className="flex items-center justify-between mb-6">
                <button
                    onClick={() => setCurrentStep('scan')}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                    data-testid="plan-back-button"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                </button>
                <button
                    onClick={handleContinue}
                    disabled={selectedPackages.size === 0}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid="plan-continue-button"
                >
                    Continue
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>

            <StepHeader
                title="Refactoring Strategy"
                description="AI-generated strategic plan for your refactoring"
                icon={Map}
                currentStep={3}
                totalSteps={7}
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

            {/* Bottom Info */}
            <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <p className="text-gray-500 text-sm">
                    {selectedPackages.size > 0
                        ? `${selectedPackages.size} packages selected`
                        : 'Select packages to continue'}
                </p>
                <button
                    onClick={handleContinue}
                    disabled={selectedPackages.size === 0}
                    className="px-6 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-700 disabled:text-gray-500 text-black font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                    <span>Review Opportunities</span>
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </StepContainer>
    );
}
