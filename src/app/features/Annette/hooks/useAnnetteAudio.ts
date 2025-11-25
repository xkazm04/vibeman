import { useState, useCallback, useEffect } from 'react';
import { textToSpeech } from '../lib/voicebotApi';

export function useAnnetteAudio() {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isError, setIsError] = useState(false);
    const [volume, setVolume] = useState(0.5);
    const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
    const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
    const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
    const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
    const [message, setMessage] = useState('Systems ready - Click to activate voice');

    const playAudioInternal = useCallback(async (text: string) => {
        setMessage(text);
        setIsSpeaking(true);
        setIsError(false);

        try {
            const audioUrl = await textToSpeech(text);
            const audio = new Audio(audioUrl);

            // Create AudioContext for volume analysis
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
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
                setIsError(true);
                setVolume(0.5);
                setAudioContext(null);
                setAnalyser(null);
                URL.revokeObjectURL(audioUrl);
                // Only close if not already closed
                if (audioCtx.state !== 'closed') {
                    audioCtx.close();
                }
            };

            setAudioElement(audio);
            await audio.play();
        } catch (error) {
            setIsSpeaking(false);
            setIsError(true);
            setVolume(0.5);
            // Check if it's an autoplay error
            if (error instanceof Error && error.name === 'NotAllowedError') {
                setMessage('Click to enable voice');
                setIsVoiceEnabled(false);
            } else {
                setMessage('Voice system offline');
            }
        }
    }, []);

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
        volume,
        audioContext,
        analyser,
        isVoiceEnabled,
        setIsVoiceEnabled,
        message,
        setMessage,
        playAudioInternal,
        speakMessage,
        setIsError
    };
}
