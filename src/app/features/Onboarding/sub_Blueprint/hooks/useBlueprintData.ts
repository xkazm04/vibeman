import { useState, useEffect } from 'react';
import { useBlueprintStore } from '../store/blueprintStore';
import { useBadgeStore } from '@/stores/badgeStore';
import { useDecisionQueueStore } from '@/stores/decisionQueueStore';
import { Project } from '@/types';

export function useBlueprintData(activeProject: Project | null) {
    const [contextGroups, setContextGroups] = useState<any[]>([]);

    const {
        stepperConfig,
        initStepperConfig,
        loadScanEvents,
    } = useBlueprintStore();

    const { awardBadge, earnedBadges } = useBadgeStore();
    const { currentDecision, queue } = useDecisionQueueStore();

    // Initialize stepper config when active project changes
    useEffect(() => {
        if (!activeProject) return;

        const projectType = activeProject.type || 'other';
        initStepperConfig(projectType);
    }, [activeProject, initStepperConfig]);

    // Check if onboarding is complete (no more decisions and has some badges)
    useEffect(() => {
        if (!currentDecision && queue.length === 0 && earnedBadges.length >= 3) {
            // Award the completion badge
            awardBadge('blueprint-master');
        }
    }, [currentDecision, queue.length, earnedBadges.length, awardBadge]);

    // Load scan events when active project changes
    useEffect(() => {
        if (!activeProject || !stepperConfig) return;

        // Build event title map from stepper config
        const eventTitles: Record<string, string> = {};
        for (const group of stepperConfig.groups) {
            for (const technique of group.techniques) {
                if (technique.eventTitle) {
                    eventTitles[technique.id] = technique.eventTitle;
                }
            }
        }

        loadScanEvents(activeProject.id, eventTitles);
    }, [activeProject, stepperConfig, loadScanEvents]);

    // Load context groups when active project changes
    useEffect(() => {
        if (!activeProject) {
            setContextGroups([]);
            return;
        }

        const loadGroups = async () => {
            try {
                const response = await fetch(`/api/context-groups?projectId=${activeProject.id}`);
                if (response.ok) {
                    const result = await response.json();
                    if (result.success && result.data) {
                        setContextGroups(result.data);
                    }
                }
            } catch (error) {
                console.error('[Blueprint] Error loading context groups:', error);
            }
        };

        loadGroups();
    }, [activeProject]);

    return {
        contextGroups,
        stepperConfig,
    };
}
