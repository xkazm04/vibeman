import { useState, useCallback } from 'react';
import { VoiceSession, VoiceSessionInteraction, KnowledgeSource } from '../lib/voicebotTypes';
import { saveVoiceSession, updateVoiceSession } from '../lib/voiceSessionStorage';
import { useActiveProjectStore } from '@/stores/activeProjectStore';

export function useAnnetteSession() {
    const [currentSession, setCurrentSession] = useState<VoiceSession | null>(null);
    const [transcriptEntries, setTranscriptEntries] = useState<any[]>([]);
    const [showTranscript, setShowTranscript] = useState(false);
    const [showSessionHistory, setShowSessionHistory] = useState(false);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const { activeProject } = useActiveProjectStore();

    // Helper to add transcript entry
    const addTranscriptEntry = useCallback((speaker: 'user' | 'assistant' | 'system', text: string, ssml?: string) => {
        const entry = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            speaker,
            text,
            ssml,
        };
        setTranscriptEntries(prev => [...prev, entry]);
    }, []);

    // Clear transcript
    const clearTranscript = useCallback(() => {
        setTranscriptEntries([]);
    }, []);

    // Initialize a new session when first interaction happens
    const initializeSession = useCallback(() => {
        if (!activeProject || currentSession) return;

        const newSession: VoiceSession = {
            id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            projectId: activeProject.id,
            projectName: activeProject.name,
            startTime: new Date(),
            interactions: [],
            totalInteractions: 0,
            conversationId: conversationId ?? undefined,
        };

        setCurrentSession(newSession);
        saveVoiceSession(newSession).catch(err => {
            console.error('Failed to save initial session:', err);
        });
    }, [activeProject, currentSession, conversationId]);

    // Add interaction to current session
    const addInteractionToCurrentSession = useCallback(async (
        userText: string,
        assistantText: string,
        sources?: KnowledgeSource[],
        insights?: string[],
        nextSteps?: string[],
        toolsUsed?: Array<{ name: string; description?: string }>,
        timing?: { llmMs?: number; ttsMs?: number; totalMs?: number }
    ) => {
        if (!currentSession) return;

        const interaction: VoiceSessionInteraction = {
            id: `interaction-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            userText,
            assistantText,
            sources,
            insights,
            nextSteps,
            toolsUsed,
            timing,
        };

        const updatedSession: VoiceSession = {
            ...currentSession,
            interactions: [...currentSession.interactions, interaction],
            totalInteractions: currentSession.interactions.length + 1,
        };

        setCurrentSession(updatedSession);

        // Save to IndexedDB
        try {
            await updateVoiceSession(updatedSession);
        } catch (err) {
            console.error('Failed to update session:', err);
        }
    }, [currentSession]);

    // End current session
    const endCurrentSession = useCallback(async () => {
        if (!currentSession) return;

        const endedSession: VoiceSession = {
            ...currentSession,
            endTime: new Date(),
        };

        setCurrentSession(null);

        // Save final session state
        try {
            await updateVoiceSession(endedSession);
        } catch (err) {
            console.error('Failed to end session:', err);
        }
    }, [currentSession]);

    return {
        currentSession,
        transcriptEntries,
        showTranscript,
        setShowTranscript,
        showSessionHistory,
        setShowSessionHistory,
        conversationId,
        setConversationId,
        addTranscriptEntry,
        clearTranscript,
        initializeSession,
        addInteractionToCurrentSession,
        endCurrentSession
    };
}
