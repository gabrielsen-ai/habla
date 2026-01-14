'use client';

import { useState, useRef, useEffect } from 'react';
import './voice-orb.css';

// State machine states
const STATES = {
    IDLE: 'idle', // Initial state before starting
    READY_TO_RECORD: 'readyToRecord', // Lucia har snakket ferdig, venter på at bruker starter
    LISTENING: 'listening', // Mic is open, user is speaking
    SENDING: 'sending',    // Sending audio to backend
    SPEAKING: 'speaking',  // AI is speaking
    ERROR: 'error',
    PERMISSION_NEEDED: 'permissionNeeded',
    FINISHED: 'finished'
};

const STATUS_TEXT = {
    [STATES.IDLE]: 'Starter...',
    [STATES.READY_TO_RECORD]: 'Din tur! Trykk for å snakke',
    [STATES.LISTENING]: 'Snakk nå... Trykk når du er ferdig',
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
    const [turnCount, setTurnCount] = useState(0); // Track conversation turns
    const [greetingPlayed, setGreetingPlayed] = useState(false); // Track if greeting has been played

    // Audio recording refs
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const streamRef = useRef(null);

    // Audio context for resuming after user interaction
    const audioContextRef = useRef(null);

    // Audio Playback
    const [isPlaying, setIsPlaying] = useState(false);
    const audioQueueRef = useRef([]);
    const isPlayingRef = useRef(false);
    const ttsBufferRef = useRef('');

    // --- Initialization & Lifecycle ---

    useEffect(() => {
        // Cleanup on unmount
        return () => {
            stopRecording();
            if (audioContextRef.current) audioContextRef.current.close();
        };
    }, []);

    // Start conversation automatically (run once on mount)
    useEffect(() => {
        if (greetingPlayed) return; // Prevent double-run
        
        setGreetingPlayed(true);
        const startGreeting = async () => {
            console.log('🎬 Starting greeting...');
            await new Promise(r => setTimeout(r, 1000));
            setLastExchange({ user: '', ai: INITIAL_GREETING_TEXT });
            console.log('📢 Fetching TTS for greeting:', INITIAL_GREETING_TEXT);
            // Play greeting, then start listening
            await fetchTTS(INITIAL_GREETING_TEXT);
        };
        startGreeting();
        
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty array: only run on initial mount

    // Handle State Transitions
    useEffect(() => {
        if (state === STATES.ERROR) {
            const timer = setTimeout(() => setState(STATES.LISTENING), 3000); // Retry listening
            return () => clearTimeout(timer);
        }
    }, [state]);


    // --- Core Logic: Recording ---

    // Prepare for recording (get mic permission, show ready state)
    const prepareForRecording = async () => {
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
            setState(STATES.READY_TO_RECORD);
            console.log("🎤 Ready to record - waiting for user to start");
        } catch (error) {
            console.error('❌ Mic error:', error);
            setState(STATES.PERMISSION_NEEDED);
        }
    };

    // Start recording when user presses the button
    const startRecording = async () => {
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

            // Verify stream is active
            const tracks = streamRef.current.getAudioTracks();
            if (tracks.length === 0 || tracks[0].readyState !== 'live') {
                console.log("🔄 Stream not active, getting new stream...");
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
                console.log("📦 Audio chunk received:", event.data.size, "bytes");
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };

            mediaRecorderRef.current = mediaRecorder;
            // Start with timeslice to capture chunks continuously (every 250ms)
            mediaRecorder.start(250);

            setState(STATES.LISTENING);
            console.log("🎙️ Recording started - user is speaking");

        } catch (error) {
            console.error('❌ Mic error:', error);
            setState(STATES.PERMISSION_NEEDED);
        }
    };

    // Handle the main microphone button press
    const handleMicButtonPress = () => {
        if (state === STATES.READY_TO_RECORD) {
            startRecording();
        } else if (state === STATES.LISTENING) {
            finishRecording();
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

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
    };

    // Called when user presses the "done" button
    const finishRecording = async () => {
        setState(STATES.SENDING);
        console.log("📤 User finished speaking - sending audio");
        
        const recorder = mediaRecorderRef.current;
        
        if (!recorder || recorder.state === 'inactive') {
            console.warn("No active recorder found");
            setState(STATES.READY_TO_RECORD);
            return;
        }

        // Wait for the recorder to stop and collect all data
        await new Promise((resolve) => {
            // Set up onstop handler BEFORE calling stop()
            recorder.onstop = () => {
                console.log("🛑 Recording stopped, total chunks:", audioChunksRef.current.length);
                resolve();
            };
            
            // Now stop the recorder - this will trigger final ondataavailable, then onstop
            recorder.stop();
        });

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        console.log("📼 Audio blob size:", audioBlob.size, "bytes");
        
        if (audioBlob.size === 0) {
            console.warn("Empty audio, going back to ready state");
            setState(STATES.READY_TO_RECORD);
            return;
        }

        processAudio(audioBlob);
    };

    const processAudio = async (audioBlob) => {
        try {
            // Increment turn count for each user interaction
            setTurnCount(prev => prev + 1);
            const currentTurn = turnCount + 1;
            
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');
            formData.append('scenario', 'kino');
            formData.append('turnCount', currentTurn.toString()); // Send turn count to backend

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
        // Check if conversation is finished
        if (conversationFinishedRef.current) {
            setState(STATES.FINISHED);
        } else {
            // Prepare for user's turn - show the "start recording" button
            prepareForRecording();
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
                <h1 className="title">El cine</h1>
                <div className="mission-list">
                    <h3 className="mission-title">Gjøremål</h3>
                    <ul className="missions">
                        <li>
                            <div className="mission-content">
                                <div className="mission-text">Hils på Lucia</div>
                                <div className="sub-missions-container">
                                    <span className="sub-missions-label">Begreper:</span>
                                    <ul className="sub-missions">
                                        <li>hola</li>
                                    </ul>
                                </div>
                            </div>
                        </li>
                        <li>
                            <div className="mission-content">
                                <div className="mission-text">Fortell at du skal se "Toy Story"</div>
                                <div className="sub-missions-container">
                                    <span className="sub-missions-label">Begreper:</span>
                                    <ul className="sub-missions">
                                        <li>quiero</li>
                                        <li>ver</li>
                                    </ul>
                                </div>
                            </div>
                        </li>
                        <li>
                            <div className="mission-content">
                                <div className="mission-text">Si hade på en høflig måte</div>
                                <div className="sub-missions-container">
                                    <span className="sub-missions-label">Begreper:</span>
                                    <ul className="sub-missions">
                                        <li>adios</li>
                                        <li>señorita</li>
                                    </ul>
                                </div>
                            </div>
                        </li>
                    </ul>
                </div>
                {(state === STATES.READY_TO_RECORD || state === STATES.LISTENING) ? (
                    <button 
                        className={`status-button ${state}`}
                        onClick={handleMicButtonPress}
                    >
                        {state === STATES.READY_TO_RECORD ? '🎤 Din tur! Trykk for å snakke' : '⏹️ Trykk når du er ferdig'}
                    </button>
                ) : (
                    <p className={`status-line ${state}`}>{STATUS_TEXT[state]}</p>
                )}
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

