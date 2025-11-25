import { useState, useEffect, useCallback, useMemo } from 'react';
import { useBlueprintStore } from '../store/blueprintStore';
import { useDecisionQueueStore } from '@/stores/decisionQueueStore';
import { Project } from '@/types';
import { executeScan } from '../lib/blueprint-scan';

export function useBlueprintSelection(
    activeProject: Project | null,
    contextGroups: any[],
    stepperConfig: any
) {
    const [selectedScanId, setSelectedScanId] = useState<string | null>(null);
    const [selectedContextGroupId, setSelectedContextGroupId] = useState<string | null>(null);
    const [selectedContextId, setSelectedContextId] = useState<string | null>(null);
    const [selectedContext, setSelectedContext] = useState<any>(null);

    const {
        startScan,
        completeScan,
        failScan,
        loadScanEvents,
        getScanStatus,
        isRecommended,
        getDaysAgo,
    } = useBlueprintStore();

    const { addDecision } = useDecisionQueueStore();

    // Reset context selection when group changes
    useEffect(() => {
        setSelectedContextId(null);
        setSelectedContext(null);
    }, [selectedContextGroupId]);

    const handleScan = useCallback(async (scanId: string, contextId?: string) => {
        // Use extracted scan execution logic
        await executeScan(
            scanId,
            stepperConfig,
            {
                startScan,
                completeScan,
                failScan,
                addDecision,
            },
            activeProject,
            contextId
        );

        // Reload scan events after scan completes
        if (activeProject && stepperConfig) {
            const eventTitles: Record<string, string> = {};
            for (const group of stepperConfig.groups) {
                for (const technique of group.techniques) {
                    if (technique.eventTitle) {
                        eventTitles[technique.id] = technique.eventTitle;
                    }
                }
            }
            await loadScanEvents(activeProject.id, eventTitles);
        }
    }, [stepperConfig, startScan, completeScan, failScan, addDecision, activeProject, loadScanEvents]);

    const handleSelectScan = useCallback((groupId: string, scanId: string) => {
        // For context-dependent scans, check if context is selected
        const contextDependentScans = ['selectors', 'photo', 'test', 'contextreview', 'testDesign'];
        if (contextDependentScans.includes(scanId) && !selectedContextId) {
            console.warn(`[Blueprint] Scan ${scanId} requires a context to be selected`);
            return;
        }

        // If already selected, deselect
        if (selectedScanId === scanId) {
            setSelectedScanId(null);
            return;
        }

        // Find scan label from stepper config
        let scanLabel = scanId;
        if (stepperConfig) {
            for (const group of stepperConfig.groups) {
                const technique = group.techniques.find((t: any) => t.id === scanId);
                if (technique) {
                    scanLabel = technique.label;
                    break;
                }
            }
        }

        // Select the scan
        setSelectedScanId(scanId);

        // For context-dependent scans, use the already-selected context
        if (contextDependentScans.includes(scanId) && selectedContextId && selectedContext) {
            addDecision({
                type: 'pre-scan',
                title: `Execute ${scanLabel} Scan?`,
                description: `Context: "${selectedContext.name}"\n\nClick Accept to start the ${scanLabel.toLowerCase()} scan for this context.`,
                severity: 'info' as const,
                count: 0,
                projectId: activeProject?.id || '',
                projectPath: activeProject?.path || '',
                data: { scanId, contextId: selectedContextId },
                onAccept: async () => {
                    setSelectedScanId(null);
                    await handleScan(scanId, selectedContextId);
                },
                onReject: async () => {
                    setSelectedScanId(null);
                },
            });
            return;
        }

        // For non-context scans, add standard pre-scan decision
        addDecision({
            type: 'pre-scan',
            title: `Execute ${scanLabel} Scan?`,
            description: `Click Accept to start the ${scanLabel.toLowerCase()} scan for this project.`,
            severity: 'info' as const,
            count: 0,
            projectId: activeProject?.id || '',
            projectPath: activeProject?.path || '',
            data: { scanId },
            onAccept: async () => {
                setSelectedScanId(null);
                await handleScan(scanId);
            },
            onReject: async () => {
                setSelectedScanId(null);
            },
        });
    }, [selectedContextId, selectedScanId, stepperConfig, selectedContext, addDecision, handleScan]);

    const handleBlueprintContextSelect = useCallback((contextId: string, context: any) => {
        setSelectedContextId(contextId);
        setSelectedContext(context);
    }, []);

    const handlePreviewUpdated = useCallback(async (
        newPreview: string | null,
        testScenario: string | null,
        target?: string | null,
        targetFulfillment?: string | null
    ) => {
        if (!selectedContext || !activeProject) return;

        try {
            // Update context with new preview, test scenario, and target fields
            const response = await fetch('/api/contexts', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contextId: selectedContext.id,
                    updates: {
                        preview: newPreview,
                        testScenario: testScenario,
                        testUpdated: testScenario ? new Date().toISOString() : selectedContext.testUpdated,
                        target: target,
                        target_fulfillment: targetFulfillment,
                    },
                }),
            });

            if (response.ok) {
                // Update local state
                setSelectedContext({
                    ...selectedContext,
                    preview: newPreview,
                    testScenario: testScenario,
                    target: target,
                    target_fulfillment: targetFulfillment,
                });
            }
        } catch (error) {
            console.error('[Blueprint] Error updating context preview:', error);
        }
    }, [selectedContext, activeProject]);

    // Memoize expensive computed values
    const selectedGroupColor = useMemo(() => {
        if (!selectedContextGroupId) return '#06b6d4';
        return contextGroups.find(g => g.id === selectedContextGroupId)?.color || '#06b6d4';
    }, [selectedContextGroupId, contextGroups]);

    // Memoize scan status callback to prevent unnecessary re-renders
    const getScanStatusMemoized = useCallback((techniqueId: string) => {
        const status = getScanStatus(techniqueId);
        return {
            isRunning: status.isRunning,
            progress: status.progress,
            hasError: status.hasError,
        };
    }, [getScanStatus]);

    return {
        selectedScanId,
        setSelectedScanId,
        selectedContextGroupId,
        setSelectedContextGroupId,
        selectedContextId,
        setSelectedContextId,
        selectedContext,
        setSelectedContext,
        handleSelectScan,
        handleBlueprintContextSelect,
        handlePreviewUpdated,
        selectedGroupColor,
        getScanStatusMemoized,
        getDaysAgo,
        isRecommended,
    };
}
