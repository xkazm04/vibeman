import { useState, useCallback, useEffect } from 'react';
import { textToSpeech } from '../lib/voicebotApi';
import {
    AudioError,
    AudioErrorCode,
    parseAudioError,
    logAudioError,
    getUserFriendlyMessage,
    attemptRecovery,
} from '../lib/audioErrors';

export function useAnnetteAudio() {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isError, setIsError] = useState(false);
    const [audioError, setAudioError] = useState<AudioError | null>(null);
    const [volume, setVolume] = useState(0.5);
    const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
    const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
    const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
    const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
    const [message, setMessage] = useState('Systems ready - Click to activate voice');

    /**
     * Handle audio errors with typed error codes
     */
    const handleAudioError = useCallback((error: Error | unknown) => {
        const parsedError = parseAudioError(error);
        setAudioError(parsedError);
        setIsError(true);
        setMessage(getUserFriendlyMessage(parsedError.code));

        // Log error with recovery guidance for developers
        logAudioError(parsedError);

        return parsedError;
    }, []);

    /**
     * Clear current audio error
     */
    const clearAudioError = useCallback(() => {
        setAudioError(null);
        setIsError(false);
    }, []);

    /**
     * Attempt to recover from current audio error
     */
    const tryRecovery = useCallback(async (): Promise<boolean> => {
        if (!audioError) return false;

        const success = await attemptRecovery(audioError, audioContext);
        if (success) {
            clearAudioError();
            setMessage('Audio recovered successfully');
        }
        return success;
    }, [audioError, audioContext, clearAudioError]);

    const playAudioInternal = useCallback(async (text: string) => {
        setMessage(text);
        setIsSpeaking(true);
        clearAudioError();

        try {
            const audioUrl = await textToSpeech(text);
            const audio = new Audio(audioUrl);

            // Create AudioContext for volume analysis with error handling
            const AudioContextClass = window.AudioContext ||
                (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

            if (!AudioContextClass) {
                throw Object.assign(new Error('AudioContext not supported'), { name: 'NotSupportedError' });
            }

            const audioCtx = new AudioContextClass();
            const source = audioCtx.createMediaElementSource(audio);
            const analyserNode = audioCtx.createAnalyser();
            analyserNode.fftSize = 256;
            const bufferLength = analyserNode.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            source.connect(analyserNode);
            analyserNode.connect(audioCtx.destination);

            // Store for VoiceVisualizer
            setAudioContext(audioCtx);
            setAnalyser(analyserNode);

            // Update volume in real-time
            const updateVolume = () => {
                if (!audio.paused && !audio.ended) {
                    analyserNode.getByteFrequencyData(dataArray);
                    const average = dataArray.reduce((a, b) => a + b) / bufferLength;
                    setVolume(average / 255); // Normalize to 0-1
                    requestAnimationFrame(updateVolume);
                }
            };
            updateVolume();

            audio.onended = () => {
                setIsSpeaking(false);
                setVolume(0.5);
                setAudioContext(null);
                setAnalyser(null);
                URL.revokeObjectURL(audioUrl);
                // Only close if not already closed
                if (audioCtx.state !== 'closed') {
                    audioCtx.close();
                }
            };

            audio.onerror = () => {
                setIsSpeaking(false);
                setVolume(0.5);
                setAudioContext(null);
                setAnalyser(null);
                URL.revokeObjectURL(audioUrl);
                // Only close if not already closed
                if (audioCtx.state !== 'closed') {
                    audioCtx.close();
                }
                // Handle with typed error
                const mediaError = audio.error;
                handleAudioError(mediaError || new Error('Audio playback failed'));
            };

            setAudioElement(audio);
            await audio.play();
        } catch (error) {
            setIsSpeaking(false);
            setVolume(0.5);

            // Handle with typed error system
            const parsedError = handleAudioError(error);

            // Special handling for autoplay - disable voice so user needs to click again
            if (parsedError.code === 'AUTOPLAY_BLOCKED') {
                setIsVoiceEnabled(false);
            }
        }
    }, [clearAudioError, handleAudioError]);

    const speakMessage = useCallback(async (text: string) => {
        // Always update the message display
        setMessage(text);

        // Only play audio if voice is enabled
        if (!isVoiceEnabled) {
            return;
        }
        await playAudioInternal(text);
    }, [isVoiceEnabled, playAudioInternal]);

    // Cleanup audio on unmount
    useEffect(() => {
        return () => {
            if (audioElement) {
                audioElement.pause();
                audioElement.src = '';
            }
        };
    }, [audioElement]);

    return {
        isSpeaking,
        isError,
        audioError,
        volume,
        audioContext,
        analyser,
        isVoiceEnabled,
        setIsVoiceEnabled,
        message,
        setMessage,
        playAudioInternal,
        speakMessage,
        setIsError,
        handleAudioError,
        clearAudioError,
        tryRecovery,
    };
}

// Re-export error types for convenience
export type { AudioError, AudioErrorCode } from '../lib/audioErrors';
