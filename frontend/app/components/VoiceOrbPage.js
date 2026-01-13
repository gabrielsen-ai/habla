'use client';

import { useState, useRef, useEffect } from 'react';
import './voice-orb.css';

// State machine states
const STATES = {
    IDLE: 'idle', // Initial state before starting
    LISTENING: 'listening', // Mic is open, waiting for user speech + silence
    SENDING: 'sending',    // Sending audio to backend
    SPEAKING: 'speaking',  // AI is speaking
    ERROR: 'error',
    PERMISSION_NEEDED: 'permissionNeeded',
    FINISHED: 'finished'
};

const STATUS_TEXT = {
    [STATES.IDLE]: 'Starter...',
    [STATES.LISTENING]: 'Lucia lytter...',
    [STATES.SENDING]: 'Lucia tenker...',
    [STATES.SPEAKING]: 'Lucia snakker...',
    [STATES.ERROR]: 'Prøv igjen',
    [STATES.PERMISSION_NEEDED]: 'Trenger mikrofon',
    [STATES.FINISHED]: 'Samtale ferdig'
};

const INITIAL_GREETING_TEXT = "Hola, mi nombre es Lucia y yo trabajo aqui en el cine, ¿qué película quieres ver?";

export default function VoiceOrbPage() {
    const [state, setState] = useState(STATES.IDLE);
    const [lastExchange, setLastExchange] = useState(null);
    const [conversationStarted, setConversationStarted] = useState(false);

    // Audio recording & VAD refs
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const streamRef = useRef(null);

    // VAD State
    const audioContextRef = useRef(null);
    const sourceNodeRef = useRef(null);
    const analyserRef = useRef(null);
    const vadIntervalRef = useRef(null);
    const speechStartTimeRef = useRef(0);
    const lastSpeechTimeRef = useRef(0);
    const isSpeakingRef = useRef(false);

    // Audio Playback
    const [isPlaying, setIsPlaying] = useState(false);
    const audioQueueRef = useRef([]);
    const isPlayingRef = useRef(false);
    const ttsBufferRef = useRef('');

    // --- Initialization & Lifecycle ---

    useEffect(() => {
        // Cleanup on unmount
        return () => {
            stopRecordingAndVAD();
            if (audioContextRef.current) audioContextRef.current.close();
        };
    }, []);

    // Start conversation automatically
    useEffect(() => {
        if (!conversationStarted) {
            setConversationStarted(true);
            const startGreeting = async () => {
                await new Promise(r => setTimeout(r, 1000));
                setLastExchange({ user: '', ai: INITIAL_GREETING_TEXT });
                // Play greeting, then start listening
                await fetchTTS(INITIAL_GREETING_TEXT);
            };
            startGreeting();
        }
    }, [conversationStarted]);

    // Handle State Transitions
    useEffect(() => {
        if (state === STATES.ERROR) {
            const timer = setTimeout(() => setState(STATES.LISTENING), 3000); // Retry listening
            return () => clearTimeout(timer);
        }
    }, [state]);


    // --- Core Logic: VAD & Recording ---

    const startRecordingAndVAD = async () => {
        try {
            if (!streamRef.current) {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        channelCount: 1,
                        sampleRate: 48000,
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    }
                });
                streamRef.current = stream;
            }

            audioChunksRef.current = [];
            const mediaRecorder = new MediaRecorder(streamRef.current, { mimeType: 'audio/webm;codecs=opus' });

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };

            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.start();

            // Set up VAD
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (audioContextRef.current.state === 'suspended') {
                await audioContextRef.current.resume();
            }

            const ctx = audioContextRef.current;
            const source = ctx.createMediaStreamSource(streamRef.current);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 512;
            analyser.smoothingTimeConstant = 0.4;
            source.connect(analyser);

            sourceNodeRef.current = source;
            analyserRef.current = analyser;

            // Reset VAD flags
            isSpeakingRef.current = false;
            lastSpeechTimeRef.current = Date.now(); // Initialize to avoid instant trigger
            speechStartTimeRef.current = 0;

            setState(STATES.LISTENING);
            console.log("👂 Listening (VAD Active)...");

            // VAD Loop
            const checkAudioLevel = () => {
                if (!analyserRef.current) return;

                const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
                analyserRef.current.getByteFrequencyData(dataArray);

                // Calculate average volume
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
                const average = sum / dataArray.length;

                const THRESHOLD = 20; // Adjust based on env
                const SILENCE_DURATION = 2000; // 2s silence
                const MIN_SPEECH_DURATION = 500; // Min 0.5s speech to count

                const now = Date.now();

                if (average > THRESHOLD) {
                    if (!isSpeakingRef.current) {
                        isSpeakingRef.current = true;
                        speechStartTimeRef.current = now;
                        console.log("🗣️ Speech detected!");
                    }
                    lastSpeechTimeRef.current = now;
                } else {
                    // Silence
                    if (isSpeakingRef.current) {
                        const silenceTime = now - lastSpeechTimeRef.current;
                        const speechDuration = lastSpeechTimeRef.current - speechStartTimeRef.current;

                        if (silenceTime > SILENCE_DURATION) {
                            if (speechDuration > MIN_SPEECH_DURATION) {
                                console.log("🤫 Silence detected after speech. Stopping.");
                                setState(STATES.SENDING); // INSTANT FEEDBACK
                                commitRecording();
                            } else {
                                // Reset if speech was too short (noise)
                                isSpeakingRef.current = false;
                                console.log("⚠️ Too short, ignoring.");
                            }
                        }
                    }
                }
            };

            vadIntervalRef.current = setInterval(checkAudioLevel, 100);

        } catch (error) {
            console.error('❌ Mic error:', error);
            setState(STATES.PERMISSION_NEEDED);
        }
    };

    // Synthesized Success Sound (Tada!) with Confetti
    const playSuccessSound = () => {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();

        const playTone = (freq, startTime, duration, type = 'sine') => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.frequency.value = freq;
            osc.type = type;
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(startTime);
            gain.gain.setValueAtTime(0.1, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
            osc.stop(startTime + duration);
        };

        const now = ctx.currentTime;
        // Bright major chord arpeggio
        playTone(523.25, now, 0.2, 'triangle');       // C5
        playTone(659.25, now + 0.1, 0.2, 'triangle'); // E5
        playTone(783.99, now + 0.2, 0.2, 'triangle'); // G5
        playTone(1046.50, now + 0.3, 0.6, 'triangle'); // C6

        // Confetti pop sounds
        playTone(200, now + 0.3, 0.1, 'square');
        playTone(300, now + 0.4, 0.1, 'square');
    };

    // Play sound on finish
    useEffect(() => {
        if (state === STATES.FINISHED) {
            playSuccessSound();
        }
    }, [state]);

    const stopRecordingAndVAD = () => {
        if (vadIntervalRef.current) {
            clearInterval(vadIntervalRef.current);
            vadIntervalRef.current = null;
        }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        // Don't close stream here if we want to reuse it, but for clean state transitions maybe better to keep it open?
        // Let's keep stream open to avoid permission request again, but start/stop recorder.
        // Actually, keep VAD analysis off during speaking.
    };

    const commitRecording = async () => {
        stopRecordingAndVAD();
        // State is already SENDING from VAD loop for instant feedback
        setState(STATES.SENDING);

        // Wait for recorder to actually stop
        await new Promise(resolve => {
            if (mediaRecorderRef.current.state === 'inactive') resolve();
            else mediaRecorderRef.current.onstop = resolve;
        });

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size === 0) {
            console.warn("Empty audio, restarting listener");
            startRecordingAndVAD();
            return;
        }

        processAudio(audioBlob);
    };

    const processAudio = async (audioBlob) => {
        try {
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');
            formData.append('scenario', 'kino');

            const response = await fetch('/api/transcribe', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error('Transcription failed');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedAiText = '';
            let buffer = '';

            setLastExchange(prev => ({ user: '...', ai: '...' }));
            ttsBufferRef.current = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop();

                for (const line of lines) {
                    if (line.trim() === '') continue;
                    try {
                        const data = JSON.parse(line);
                        if (data.type === 'transcription') {
                            setLastExchange(prev => ({ ...prev, user: data.text }));
                        } else if (data.type === 'chunk') {
                            accumulatedAiText += data.text;
                            setLastExchange(prev => ({ ...prev, ai: accumulatedAiText }));
                            ttsBufferRef.current += data.text;

                            // Sentence based TTS check
                            const sentenceMatch = ttsBufferRef.current.match(/.*?[.!?](?:\s|$)/);
                            if (sentenceMatch) {
                                const sentence = sentenceMatch[0];
                                fetchTTS(sentence);
                                ttsBufferRef.current = ttsBufferRef.current.slice(sentence.length);
                            }
                        }
                    } catch (e) {
                        console.error('JSON Error', e);
                    }
                }
            }

            // Remainder TTS
            if (ttsBufferRef.current.trim().length > 0) {
                fetchTTS(ttsBufferRef.current);
            }

            // IMPORTANT: If we didn't queue any audio (maybe empty response?), we must go back to listening or finished.
            // But usually fetchTTS triggers queue push which triggers playNextInQueue. 
            // If accumulatedAiText contains [FINISHED], we handle in audio end.

        } catch (error) {
            console.error('Backend Error', error);
            setState(STATES.ERROR);
        }
    };

    const fetchTTS = async (text) => {
        const cleanText = text.replace('[FINISHED]', '').trim();
        if (!cleanText) return;

        try {
            const res = await fetch('/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: cleanText })
            });
            if (res.ok) {
                const blob = await res.blob();
                audioQueueRef.current.push(blob);
                if (!isPlayingRef.current) {
                    playNextInQueue();
                }
            }
        } catch (e) {
            console.error("TTS Fetch Error", e);
        }
    };

    const playNextInQueue = async () => {
        if (isPlayingRef.current || audioQueueRef.current.length === 0) {
            // If queue is empty and we are not playing, we might be done speaking.
            // But we need to check if we should start listening again.
            if (!isPlayingRef.current && audioQueueRef.current.length === 0) {
                checkEndOfTurn();
            }
            return;
        }

        isPlayingRef.current = true;
        setIsPlaying(true);
        setState(STATES.SPEAKING);

        const nextAudio = audioQueueRef.current.shift();

        try {
            const audio = new Audio(URL.createObjectURL(nextAudio));
            audio.onended = () => {
                isPlayingRef.current = false;
                if (audioQueueRef.current.length > 0) {
                    playNextInQueue();
                } else {
                    setIsPlaying(false);
                    checkEndOfTurn();
                }
            };
            await audio.play();
        } catch (e) {
            console.error("Audio Play Error", e);
            isPlayingRef.current = false;
            playNextInQueue();
        }
    };

    const checkEndOfTurn = () => {
        // Check if finished
        const currentAiText = document.querySelector('.ai-last-msg-text')?.innerText || "";
        // Wait, we store full text in lastExchange.ai
        // But state update might be slightly delayed? Use ref or rely on component re-render check?
        // We can just check the lastExchange state if we had access to the latest.
        // Let's use a dirty DOM check or assume if we finished playing all chunks we go to listening.

        // BETTER: Check the [FINISHED] tag in the last text chunk we processed or displayed.
        // For now, let's assume we go back to listening unless we see [FINISHED].

        // We need to know if the FULL response contained [FINISHED]. 
        // Let's inspect the `lastExchange` content via a ref if needed, or just DOM.
        const bubbles = document.querySelectorAll('.bubble-text');
        const lastText = bubbles.length > 0 ? bubbles[bubbles.length - 1].innerText : ''; // Might operate on old DOM.

        // Let's assume we restart listening.
        // If we are finished, we should transition to FINISHED.
        // Since `processAudio` updates `lastExchange`, we can check if it had [FINISHED].
        // But we are inside a closure here potentially.
        // Let's just always go to LISTENING. The UI will handle "Finished" via a separate effect or check.
        // Wait, if we start listening when finished, that's bad.

        // Simple fix: Check a global ref for "isConversationFinished" set during processAudio.
        // Hack: Check `conversationFinishedRef`.
        if (conversationFinishedRef.current) {
            setState(STATES.FINISHED);
        } else {
            startRecordingAndVAD();
        }
    };

    // Ref to track finish state across closures
    const conversationFinishedRef = useRef(false);
    useEffect(() => {
        if (lastExchange?.ai && lastExchange.ai.includes('[FINISHED]')) {
            conversationFinishedRef.current = true;
        }
    }, [lastExchange]);


    // --- Render ---

    if (state === STATES.FINISHED) {
        return (
            <div className="voice-orb-container duo-success-screen">
                <div className="duo-content">
                    <h1 className="duo-title">Oppdrag utført!</h1>

                    <div className="duo-stars-container">
                        <div className="duo-star left">⭐</div>
                        <div className="duo-star center">⭐</div>
                        <div className="duo-star right">⭐</div>
                    </div>

                    <div className="duo-hero-image">
                        <img src="/lucia.png" alt="Lucia Celebrating" />
                        <div className="shine-effect"></div>
                    </div>

                    <div className="duo-stats-grid">
                        <div className="stat-card yellow">
                            <span className="stat-label">TOTAL XP</span>
                            <span className="stat-value">⚡ 50</span>
                        </div>
                        <div className="stat-card blue">
                            <span className="stat-label">RASK</span>
                            <span className="stat-value">⏱️ 1:42</span>
                        </div>
                        <div className="stat-card green">
                            <span className="stat-label">BRA!</span>
                            <span className="stat-value">🎯 95%</span>
                        </div>
                    </div>
                </div>

                <div className="duo-footer">
                    <button className="duo-continue-btn" onClick={() => window.location.href = '/'}>
                        FORTSETT
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="voice-orb-container">
            <div className="top-area">
                <h1 className="title">Kino</h1>
                <div className="mission-list">
                    <h3 className="mission-title">Gjøremål</h3>
                    <ul className="missions">
                        <li>Hils på Lucia</li>
                        <li>Fortell at du skal se "City of God"</li>
                        <li>Si hade på en høflig måte</li>
                    </ul>
                </div>
                <p className={`status-line ${state}`}>{STATUS_TEXT[state]}</p>
            </div>

            <div className="center-area">
                {/* Visual Avatar Container */}
                <div className={`lucia-container ${state}`}>
                    <div className="lucia-image-wrapper">
                        <img
                            src="/lucia.png"
                            alt="Lucia at the cinema"
                            className="lucia-img"
                        />
                        {/* Overlay Animations */}
                        {state === STATES.SPEAKING && (
                            <div className="speaking-pulse"></div>
                        )}
                        {state === STATES.LISTENING && (
                            <div className="listening-wave">
                                <span></span><span></span><span></span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Polished Transcript UI */}
            <div className="transcript-area-modern">
                {lastExchange && (
                    <div className="exchange-display">
                        <div className={`message-row user ${lastExchange.user ? 'visible' : ''}`}>
                            <div className="msg-bubble user-msg">{lastExchange.user}</div>
                        </div>
                        <div className={`message-row ai ${lastExchange.ai ? 'visible' : ''}`}>
                            <div className="avatar-small">
                                <img src="/lucia.png" alt="Lucia" />
                            </div>
                            <div className="msg-bubble ai-msg ai-last-msg-text">
                                {lastExchange.ai.replace('[FINISHED]', '')}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

