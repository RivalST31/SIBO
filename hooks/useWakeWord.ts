
import { useEffect, useRef, useState, useCallback } from 'react';

export const useWakeWord = (enabled: boolean, wakeWord: string, onWake: () => void) => {
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);
    const isEnabledRef = useRef(enabled);

    // Keep ref in sync for event callbacks
    useEffect(() => {
        isEnabledRef.current = enabled;
    }, [enabled]);

    useEffect(() => {
        if (!enabled) {
            stop();
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn("Speech Recognition API not supported in this browser.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
            // Get the latest result
            const results = event.results;
            const latestResult = results[results.length - 1];
            const transcript = latestResult[0].transcript.toLowerCase().trim();
            const isFinal = latestResult.isFinal;
            
            // console.debug("Wake Word Listener Heard:", transcript);

            const trigger = wakeWord.toLowerCase();
            let match = false;

            // 1. Direct match
            if (transcript.includes(trigger)) {
                match = true;
            }
            
            // 2. Phonetic/Fuzzy matching specifically for "SIBO"
            // Because SIBO is not a standard dictionary word, it gets misheard often.
            if (!match && trigger === 'sibo') {
                const variants = [
                    'see bo', 'sea bo', 'c bo', 'seebo', 'cebo', 'si bo', 'see-bo', 
                    'sea bow', 'see bow', 'si-bo', 'zero', 'zebra', 'c-3po'
                ];
                match = variants.some(v => transcript.includes(v));
            }

            if (match) {
                console.log("Wake word detected!");
                onWake();
                
                // Briefly stop and restart to clear buffer and avoid double triggers
                recognition.abort();
            }
        };

        recognition.onerror = (event: any) => {
            if (event.error === 'no-speech') {
                // Ignore no-speech errors, just a timeout
                return;
            }
            console.warn("Wake word error:", event.error);
        };

        recognition.onend = () => {
            // Auto-restart if it's supposed to be enabled
            // We add a small delay to prevent rapid-fire loops if permission is denied
            if (isEnabledRef.current) {
                 setTimeout(() => {
                     if (isEnabledRef.current) {
                        try { 
                            recognition.start(); 
                        } catch (e) {
                            // Already started or other error
                        }
                     }
                 }, 200);
            } else {
                setIsListening(false);
            }
        };

        recognitionRef.current = recognition;
        
        try {
            recognition.start();
            setIsListening(true);
        } catch (e) {
            console.error("Failed to start wake word listener", e);
        }

        return () => {
            stop();
        };
    }, [enabled, wakeWord, onWake]);

    const stop = () => {
        if (recognitionRef.current) {
            recognitionRef.current.onend = null; // Prevent restart
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
        setIsListening(false);
    };

    return { isListening };
};
