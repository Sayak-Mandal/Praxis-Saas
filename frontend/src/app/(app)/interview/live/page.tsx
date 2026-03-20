"use client";

import React, { useState, useEffect, useRef } from "react";
import { startLiveInterview, endLiveInterview } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Video, ChevronsLeft, ChevronsRight, AlignLeft, Mic, MicOff, VideoOff } from "lucide-react";
import { cn } from "@/lib/utils";
import * as tf from "@tensorflow/tfjs";
import * as blazeface from "@tensorflow-models/blazeface";

// ─── Dynamic AI Avatar ────────────────────────────────────────────────────────
type AvatarState = "idle" | "thinking" | "speaking";

function AIAvatar({ avatarState, size = 96 }: { avatarState: AvatarState; size?: number }) {
    const s = size;
    const eyeSize = Math.round(s * 0.1);

    return (
        <div style={{ width: s, height: s }} className="relative flex items-center justify-center shrink-0">
            {/* Outer glow ring */}
            <div
                className={cn(
                    "absolute inset-0 rounded-full transition-all duration-500",
                    avatarState === "speaking" && "avatar-ring-speaking",
                    avatarState === "thinking" && "avatar-ring-thinking",
                    avatarState === "idle"     && "avatar-ring-idle"
                )}
            />

            {/* Main circle */}
            <div
                className={cn(
                    "relative rounded-full flex flex-col items-center justify-center overflow-hidden transition-all duration-500",
                    avatarState === "speaking" && "avatar-circle-speaking",
                    avatarState === "thinking" && "avatar-circle-thinking",
                    avatarState === "idle"     && "avatar-circle-idle"
                )}
                style={{ width: s * 0.88, height: s * 0.88 }}
            >
                {/* Gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#232b3e] via-[#1a2235] to-[#141920]" />

                {/* Face content */}
                <div className="relative z-10 flex flex-col items-center justify-center gap-[6px] w-full">
                    {/* Eyes */}
                    <div className="flex items-center" style={{ gap: eyeSize * 2.5 }}>
                        <div
                            className={cn(
                                "rounded-full bg-[#5ec4c7] transition-all duration-200",
                                avatarState === "thinking" ? "avatar-eye-thinking" : "",
                                avatarState === "idle"     ? "avatar-eye-blink"    : "",
                                avatarState === "speaking" ? "avatar-eye-speaking" : ""
                            )}
                            style={{ width: eyeSize, height: eyeSize }}
                        />
                        <div
                            className={cn(
                                "rounded-full bg-[#5ec4c7] transition-all duration-200",
                                avatarState === "thinking" ? "avatar-eye-thinking" : "",
                                avatarState === "idle"     ? "avatar-eye-blink"    : "",
                                avatarState === "speaking" ? "avatar-eye-speaking" : ""
                            )}
                            style={{ width: eyeSize, height: eyeSize }}
                        />
                    </div>

                    {/* Mouth — gentle talking animation when speaking, smile curve otherwise */}
                    {avatarState === "speaking" ? (
                        <svg
                            width={s * 0.36}
                            height={s * 0.18}
                            viewBox="0 0 36 18"
                            fill="none"
                            style={{ animation: "avatar-talk 0.8s linear infinite" }}
                            className="origin-top"
                        >
                            {/* Upper lip / smile curve */}
                            <path d="M3 6 Q18 2 33 6" stroke="#5ec4c7" strokeWidth="2.2" strokeLinecap="round" fill="none" />
                            {/* Mouth opening — softly filled */}
                            <path d="M3 6 Q18 16 33 6" stroke="#5ec4c7" strokeWidth="1.6" strokeLinecap="round" fill="#5ec4c7" fillOpacity="0.18" />
                        </svg>
                    ) : (
                        <svg
                            width={s * 0.32}
                            height={s * 0.12}
                            viewBox="0 0 32 12"
                            fill="none"
                            className={avatarState === "thinking" ? "opacity-40" : "opacity-70"}
                        >
                            <path d="M4 4 Q16 12 28 4" stroke="#5ec4c7" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                        </svg>
                    )}
                </div>

                {/* Thinking shimmer */}
                {avatarState === "thinking" && (
                    <div className="absolute inset-0 avatar-thinking-shimmer rounded-full" />
                )}
            </div>

            {/* Thinking orbit dots */}
            {avatarState === "thinking" && (
                <>
                    <div className="absolute avatar-orbit-dot" style={{ animationDelay: "0s" }} />
                    <div className="absolute avatar-orbit-dot" style={{ animationDelay: "0.4s" }} />
                    <div className="absolute avatar-orbit-dot" style={{ animationDelay: "0.8s" }} />
                </>
            )}
        </div>
    );
}
// ─────────────────────────────────────────────────────────────────────────────

const SCRIPTED_QUESTIONS = [
    "Welcome! I'm your AI interviewer. Could you start by telling me a little bit about yourself and your background in software engineering?",
    "Great. Can you walk me through a complex technical problem you recently solved and the approach you took?",
    "How do you handle disagreements with team members or stakeholders regarding technical decisions or system architecture?",
    "Could you explain the concept of RESTful APIs to me, and mention some best practices for designing them?",
    "Thank you. As our final question, what is your approach to testing and ensuring code quality in your projects?"
];

const formatEvaluationText = (text: string) => {
    if (!text) return "Evaluation Unavailable";
    if (text.includes("RESOURCE_EXHAUSTED") || text.includes("429") || text.includes("quota")) {
         return "The AI evaluation system is currently experiencing high traffic (API Quota Exceeded). Please try your interview again later.";
    }
    return text;
};

export default function LiveInterviewPage() {
    const router = useRouter();

    const [state, setState] = useState<"SETUP" | "ACTIVE" | "RESULTS">("SETUP");
    const [role, setRole] = useState("Software Engineer");
    const [difficulty, setDifficulty] = useState("Medium");
    const [sessionId, setSessionId] = useState("");
    const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
    const [isCameraOn, setIsCameraOn] = useState(false);
    const [isMicOn, setIsMicOn] = useState(false);
    const [transcript, setTranscript] = useState<{ role: string; text: string }[]>([]);
    const [interimText, setInterimText] = useState("");
    const [eyeContact, setEyeContact] = useState(0);
    const [confidence, setConfidence] = useState(0);
    const [notes, setNotes] = useState("Waiting for camera...");
    const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
    const [isAgentThinking, setIsAgentThinking] = useState(false);
    const [scorecard, setScorecard] = useState<any>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [showEndDialog, setShowEndDialog] = useState(false);
    const [isStarting, setIsStarting] = useState(false);
    const [endError, setEndError] = useState<string | null>(null);

    const setupVideoRef = useRef<HTMLVideoElement>(null);
    const activeVideoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const transcriptEndRef = useRef<HTMLDivElement>(null);
    const websocketRef = useRef<WebSocket | null>(null);
    const recognitionRef = useRef<any>(null);
    const videoIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const isMicOnRef = useRef<boolean>(false);
    const faceModelRef = useRef<blazeface.BlazeFaceModel | null>(null);

    useEffect(() => {
        const loadModel = async () => {
            try {
                await tf.ready();
                faceModelRef.current = await blazeface.load();
            } catch (err) {
                console.error("Failed to load blazeface model", err);
            }
        };
        loadModel();
    }, []);

    useEffect(() => {
        const el = transcriptEndRef.current;
        // Scroll only the transcript's own scrollable parent smoothly
        const scrollParent = el?.parentElement;
        if (scrollParent) {
            scrollParent.scrollTo({
                top: scrollParent.scrollHeight,
                behavior: "smooth"
            });
        }
    }, [transcript, interimText]);

    useEffect(() => {
        return () => {
            streamRef.current?.getTracks().forEach(t => t.stop());
            streamRef.current = null;
            recognitionRef.current?.stop();
            websocketRef.current?.close();
            if (videoIntervalRef.current) clearInterval(videoIntervalRef.current);
            window.speechSynthesis?.cancel();
        };
    }, []);

    const getOrCreateStream = async () => {
        if (!streamRef.current) streamRef.current = new MediaStream();
        return streamRef.current;
    };

    const toggleCamera = async () => {
        if (!isCameraOn) {
            try {
                const stream = await getOrCreateStream();
                if (stream.getVideoTracks().length === 0) {
                    const vs = await navigator.mediaDevices.getUserMedia({ video: true });
                    vs.getVideoTracks().forEach(t => stream.addTrack(t));
                }
                if (setupVideoRef.current) setupVideoRef.current.srcObject = stream;
                if (activeVideoRef.current) activeVideoRef.current.srcObject = stream;
                setIsCameraOn(true);
            } catch (e) { console.error("Camera denied:", e); }
        } else {
            streamRef.current?.getVideoTracks().forEach(t => { t.stop(); streamRef.current?.removeTrack(t); });
            setIsCameraOn(false);
        }
    };

    const toggleMic = async () => {
        if (!isMicOn) {
            try {
                const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const stream = await getOrCreateStream();
                stream.getAudioTracks().forEach(t => { t.stop(); stream.removeTrack(t); });
                micStream.getAudioTracks().forEach(t => stream.addTrack(t));
                setIsMicOn(true);
                isMicOnRef.current = true;
                if (state === "ACTIVE" && recognitionRef.current) {
                    try { recognitionRef.current.start(); } catch (e) {}
                }
            } catch (e) {
                console.error("Mic denied:", e);
            }
        } else {
            if (state === "ACTIVE" && recognitionRef.current) {
                try { recognitionRef.current.stop(); } catch (e) {}
            }
            streamRef.current?.getAudioTracks().forEach(t => { t.stop(); streamRef.current?.removeTrack(t); });
            setIsMicOn(false);
            isMicOnRef.current = false;
        }
    };

    const speakText = (text: string) => {
        if (!("speechSynthesis" in window)) return;
        window.speechSynthesis.cancel();
        setIsAgentSpeaking(false);
        setIsAgentThinking(true);
        setTimeout(() => {
            const utt = new SpeechSynthesisUtterance(text);
            utt.rate = 0.95;
            
            const voices = window.speechSynthesis.getVoices();
            if (voices.length > 0) {
                // Heuristics for a clear, natural-sounding, FEMALE English voice
                const isMale = (name: string) => /(Male|Daniel|Alex|Fred|Albert|Bruce|Ralph|Oasis|Aaron)/i.test(name);
                const preferred = voices.filter(v => 
                    v.lang.startsWith("en") && !isMale(v.name) && (
                        v.name.includes("Google") || 
                        v.name.includes("Samantha") || 
                        v.name.includes("Victoria") || 
                        v.name.includes("Karen") ||
                        v.name.includes("Moira") ||
                        v.name.includes("Tessa") ||
                        v.name.includes("Fiona") ||
                        v.name.includes("Veena") ||
                        v.name.includes("Natural") ||
                        v.name.includes("Premium") ||
                        v.name.includes("Enhanced") ||
                        v.name.includes("Female")
                    )
                );

                // Prioritize the absolute best sounding voices
                preferred.sort((a, b) => {
                    if (a.name.includes("Google")) return -1;
                    if (b.name.includes("Google")) return 1;
                    if (a.name.includes("Premium") || a.name.includes("Enhanced")) return -1;
                    if (b.name.includes("Premium") || b.name.includes("Enhanced")) return 1;
                    if (a.name.includes("Samantha")) return -1;
                    if (b.name.includes("Samantha")) return 1;
                    return 0;
                });

                utt.voice = preferred.length > 0 ? preferred[0] : voices.find(v => v.lang.startsWith("en-US")) || voices.find(v => v.lang.startsWith("en")) || voices[0];
                utt.pitch = 1.0;
            }

            utt.onstart = () => {
                setIsAgentThinking(false);
                setIsAgentSpeaking(true);
            };
            utt.onend = () => setIsAgentSpeaking(false);
            utt.onerror = () => {
                setIsAgentThinking(false);
                setIsAgentSpeaking(false);
            };
            window.speechSynthesis.speak(utt);
        }, 700);
    };

    const handleNextQuestion = () => {
        if (currentQuestionIdx < SCRIPTED_QUESTIONS.length - 1) {
            const nextIdx = currentQuestionIdx + 1;
            setCurrentQuestionIdx(nextIdx);
            const q = SCRIPTED_QUESTIONS[nextIdx];
            setTranscript(prev => [...prev, { role: "agent", text: q }]);
            speakText(q);
        }
    };

    const handleStartInterview = async () => {
        setIsStarting(true);
        try {
            const data = await startLiveInterview(role, difficulty);
            setSessionId(data.session_id);
            setState("ACTIVE");
        } catch (err) {
            console.error(err);
        } finally {
            setIsStarting(false);
        }
    };

    useEffect(() => {
        if (state !== "ACTIVE" || !sessionId) return;

        if (activeVideoRef.current && streamRef.current) {
            activeVideoRef.current.srcObject = streamRef.current;
        }

        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
        const wsUrl = apiBase.replace("http://", "ws://").replace("https://", "wss://") + `/interview/live/stream/${sessionId}`;
        const ws = new WebSocket(wsUrl);
        websocketRef.current = ws;

        ws.onopen = () => {
            const firstQ = SCRIPTED_QUESTIONS[0];
            setCurrentQuestionIdx(0);
            setTranscript([{ role: "agent", text: firstQ }]);
            speakText(firstQ);
        };
        // We no longer rely on WS for vision feedback, we'll track it locally.
        ws.onerror = (e) => console.error("WS Error:", e);
        ws.onclose = () => console.log("WS Closed");

        const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        let recognition: any = null;
        if (SpeechRec) {
            recognition = new SpeechRec();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = "en-US";
            recognition.onresult = (event: any) => {
                let interim = "";
                let finalText = "";
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const t = event.results[i][0].transcript;
                    if (event.results[i].isFinal) finalText += t;
                    else interim += t;
                }
                if (interim) setInterimText(interim);
                if (finalText.trim()) {
                    setTranscript(prev => [...prev, { role: "user", text: finalText.trim() }]);
                    setInterimText("");
                }
            };
            recognition.onerror = (e: any) => {
                if (e.error !== "no-speech" && e.error !== "aborted") console.error("SpeechRecognition error:", e.error);
            };
            recognition.onend = () => {
                if (isMicOnRef.current && websocketRef.current && websocketRef.current.readyState !== WebSocket.CLOSED) {
                    try { recognition.start(); } catch (e) {}
                }
            };
            recognitionRef.current = recognition;
        }

        videoIntervalRef.current = setInterval(async () => {
            const video = activeVideoRef.current;
            if (video && faceModelRef.current && video.readyState >= 2) {
                try {
                    const predictions = await faceModelRef.current.estimateFaces(video, false);
                    if (predictions.length > 0) {
                        const face = predictions[0];
                        const landmarks = face.landmarks as [number, number][];
                        if (!landmarks || landmarks.length < 3) return;

                        const rightEye = landmarks[0];
                        const leftEye = landmarks[1];
                        const nose = landmarks[2];

                        const eyeCenter = (rightEye[0] + leftEye[0]) / 2;
                        const eyeDist = Math.abs(rightEye[0] - leftEye[0]);
                        const offset = Math.abs(nose[0] - eyeCenter);
                        
                        let ecScore = 100 - (offset / eyeDist) * 100 * 2.5;
                        ecScore = Math.max(0, Math.min(100, Math.round(ecScore)));
                        
                        setEyeContact(ecScore);
                        setConfidence(prev => Math.min(100, prev + 8));
                        
                        if (ecScore > 85) setNotes("Strong eye contact. Good posture.");
                        else if (ecScore > 50) setNotes("User is looking slightly away.");
                        else setNotes("User is looking away from screen.");
                    } else {
                        setEyeContact(0);
                        setConfidence(prev => Math.max(0, prev - 15));
                        setNotes("No face detected. Please face the camera.");
                    }
                } catch(e) { console.error("Face eval error", e); }
            }
        }, 1000);

        return () => {
            if (videoIntervalRef.current) clearInterval(videoIntervalRef.current);
            ws.close();
            recognition?.stop();
            window.speechSynthesis?.cancel();
        };
    }, [state, sessionId]);

    const confirmEndInterview = async () => {
        setShowEndDialog(false);
        setEndError(null);
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        if (videoIntervalRef.current) clearInterval(videoIntervalRef.current);
        websocketRef.current?.close();
        recognitionRef.current?.stop();
        window.speechSynthesis?.cancel();

        const fillerWords = ["um", "uh", "like", "you know", "basically", "literally"];
        let fillerWordCount = 0;
        transcript.forEach(turn => {
            if (turn.role === "user") {
                const txt = turn.text.toLowerCase();
                fillerWords.forEach(w => {
                    const matches = txt.match(new RegExp(`\\b${w}\\b`, "gi"));
                    if (matches) fillerWordCount += matches.length;
                });
            }
        });

        try {
            const result = await endLiveInterview(sessionId, fillerWordCount, transcript);
            setScorecard(result);
            setState("RESULTS");
        } catch (err: any) {
            console.error("End interview error:", err);
            setEndError(err?.message || "Failed to generate results. Please try again.");
        }
    };

    return (
        <div className="flex-1 flex min-h-0 overflow-hidden bg-[#f3f4f6] text-slate-900 font-sans">

            {/* ===== CONFIRMATION DIALOG ===== */}
            {showEndDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-[#181b25]/60 backdrop-blur-sm" onClick={() => setShowEndDialog(false)} />
                    <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-sm p-8 flex flex-col items-center gap-5 animate-in fade-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center shadow-sm">
                            <span className="text-3xl">🔴</span>
                        </div>
                        <div className="text-center">
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">End Interview?</h2>
                            <p className="text-slate-500 text-sm font-medium mt-1.5 leading-relaxed">
                                Your session will be closed and results calculated.
                            </p>
                        </div>
                        <div className="flex gap-3 w-full pt-1">
                            <button onClick={() => setShowEndDialog(false)} className="flex-1 py-3 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm transition-all">
                                Keep Going
                            </button>
                            <button onClick={confirmEndInterview} className="flex-1 py-3 rounded-xl bg-[#181b25] hover:bg-red-600 text-white font-bold text-sm transition-all shadow-md">
                                End & See Results
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== LEFT SIDEBAR ===== */}
            <div className={cn(
                "bg-white border-r border-slate-200 flex flex-col shrink-0 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)] transition-all duration-300",
                isSidebarOpen ? "w-80" : "w-0 overflow-hidden border-none opacity-0 pointer-events-none"
            )}>
                {/* Sidebar scroll area */}
                <div className="p-6 flex-1 overflow-y-auto w-80 flex flex-col gap-6 custom-scrollbar">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center border border-red-200 shadow-sm">
                                <Video className="w-5 h-5 text-red-500" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Live Interview</h2>
                                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Configure Session</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsSidebarOpen(false)}
                            className="p-2 text-slate-400 hover:text-white bg-slate-50 hover:bg-[#181b25] border border-slate-200 hover:border-[#181b25] rounded-lg transition-all duration-200 shadow-sm"
                            title="Collapse Sidebar"
                        >
                            <ChevronsLeft className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Role */}
                    <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3 block px-1">Target Role</label>
                        <div className="relative">
                            <select
                                value={role}
                                onChange={e => setRole(e.target.value)}
                                disabled={state === "ACTIVE"}
                                className="w-full bg-slate-50 appearance-none border border-slate-200 text-slate-900 rounded-[2rem] pl-5 pr-10 py-3.5 focus:border-[#5ec4c7] focus:ring-4 focus:ring-[#5ec4c7]/10 focus:outline-none transition-all text-[15px] font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <option>Software Engineer</option>
                                <option>Data Scientist</option>
                                <option>Product Manager</option>
                                <option>Data Analyst</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                            </div>
                        </div>
                    </div>

                    {/* Difficulty */}
                    <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3 block px-1">Difficulty</label>
                        <div className="relative">
                            <select
                                value={difficulty}
                                onChange={e => setDifficulty(e.target.value)}
                                disabled={state === "ACTIVE"}
                                className="w-full bg-slate-50 appearance-none border border-slate-200 text-slate-900 rounded-[2rem] pl-5 pr-10 py-3.5 focus:border-[#5ec4c7] focus:ring-4 focus:ring-[#5ec4c7]/10 focus:outline-none transition-all text-[15px] font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <option value="Easy">Beginner</option>
                                <option value="Medium">Intermediate</option>
                                <option value="Hard">Advanced</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                            </div>
                        </div>
                    </div>

                    {/* Camera Preview — ONLY shown in SETUP */}
                    {state === "SETUP" && (
                        <div>
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3 block px-1">Camera Preview</label>
                            <div className="relative w-full aspect-video bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                                <video ref={setupVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1] absolute inset-0" />
                                {!isCameraOn && (
                                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-slate-400 gap-2">
                                        <VideoOff className="w-8 h-8" />
                                        <span className="font-semibold text-xs">Camera is Off</span>
                                    </div>
                                )}
                            </div>
                            {/* Mic / Cam toggles */}
                            <div className="flex gap-2 mt-3">
                                <button
                                    onClick={toggleMic}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold border transition-all",
                                        isMicOn ? "bg-[#5ec4c7]/10 text-teal-700 border-[#5ec4c7]/30" : "bg-red-50 text-red-600 border-red-200"
                                    )}
                                >
                                    {isMicOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                                    {isMicOn ? "Mic On" : "Mic Off"}
                                </button>
                                <button
                                    onClick={toggleCamera}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold border transition-all",
                                        isCameraOn ? "bg-[#5ec4c7]/10 text-teal-700 border-[#5ec4c7]/30" : "bg-red-50 text-red-600 border-red-200"
                                    )}
                                >
                                    {isCameraOn ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
                                    {isCameraOn ? "Cam On" : "Cam Off"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar footer */}
                <div className="p-6 border-t border-slate-200 bg-white w-80 shrink-0">
                    {state === "SETUP" ? (
                        <button
                            onClick={handleStartInterview}
                            disabled={isStarting}
                            className="w-full flex items-center justify-center gap-2 bg-[#181b25] hover:bg-black text-white font-bold py-3.5 rounded-xl shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
                        >
                            {isStarting ? <span className="animate-spin">⏳</span> : <>🎙️ Start Live Interview</>}
                        </button>
                    ) : state === "ACTIVE" ? (
                        <div className="flex items-center justify-center py-4">
                            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-full">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span className="text-xs font-bold text-emerald-700 tracking-wide uppercase">Session in Progress</span>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setState("SETUP")}
                            className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold py-3.5 rounded-xl transition-all"
                        >
                            Practice Again
                        </button>
                    )}
                </div>
            </div>

            {/* ===== MAIN CONTENT ===== */}
            <div className={cn(
                "flex-1 flex flex-col min-h-0 relative min-w-0 overflow-hidden transition-all duration-300"
            )}>

                {/* Ambient glows */}
                <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-[#a6d8d4]/25 blur-[120px] pointer-events-none z-0 -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-[#fd6940]/10 blur-[120px] pointer-events-none z-0 translate-y-1/2 -translate-x-1/2" />

                {/* Floating sidebar-open button — rendered at the top level so it's always accessible */}
                {!isSidebarOpen && state !== "ACTIVE" && (
                    <div className="absolute top-6 left-6 z-50 animate-in fade-in zoom-in duration-300">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="p-2.5 bg-slate-50 hover:bg-[#181b25] text-slate-400 hover:text-white border border-slate-200 hover:border-[#181b25] rounded-lg shadow-sm transition-all duration-200"
                            title="Expand Sidebar"
                        >
                            <AlignLeft className="w-5 h-5" />
                        </button>
                    </div>
                )}

                {/* ── SETUP welcome screen ── */}
                {state === "SETUP" && (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 relative z-10 text-center">
                        <div className="w-24 h-24 bg-gradient-to-br from-red-400 to-red-600 rounded-[2rem] flex items-center justify-center mb-8 shadow-xl shadow-red-500/20 rotate-3">
                            <Video className="w-10 h-10 text-white" />
                        </div>
                        <h2 className="text-3xl font-extrabold text-[#181b25] tracking-tight mb-3">Ready when you are.</h2>
                        <p className="text-slate-500 font-medium max-w-sm">
                            Configure your role and difficulty in the sidebar, test your camera, then hit <strong>Start Live Interview</strong>.
                        </p>
                    </div>
                )}

                {/* ── ACTIVE interview ── */}
                {state === "ACTIVE" && (
                    <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative z-10">

                        {/* ── Top header bar (NOT sticky, part of flow) ── */}
                        <div className="shrink-0 bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between shadow-sm z-10">
                            <div className="flex items-center gap-4">
                                {!isSidebarOpen && (
                                    <button
                                        onClick={() => setIsSidebarOpen(true)}
                                        className="p-2 bg-slate-50 hover:bg-[#181b25] text-slate-400 hover:text-white border border-slate-200 hover:border-[#181b25] rounded-lg shadow-sm transition-all duration-200 animate-in fade-in zoom-in duration-300"
                                        title="Expand Sidebar"
                                    >
                                        <AlignLeft className="w-4 h-4" />
                                    </button>
                                )}
                                <div className="flex items-center gap-3">
                                    <AIAvatar
                                        avatarState="idle"
                                        size={36}
                                    />
                                    <div>
                                        <div className="font-bold text-slate-900 text-sm">Live Interviewer</div>
                                        <div className="text-[10px] text-slate-500 font-medium">{role} · {difficulty}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">Question</span>
                                    <div className="font-mono text-xs text-red-600 font-bold bg-red-50 px-2 py-1 rounded">
                                        {currentQuestionIdx + 1} / {SCRIPTED_QUESTIONS.length}
                                    </div>
                                </div>
                                <div className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-all",
                                    isAgentThinking
                                        ? "bg-amber-50 text-amber-700 border-amber-200"
                                        : isAgentSpeaking
                                        ? "bg-[#5ec4c7]/15 text-teal-700 border-[#5ec4c7]/30"
                                        : "bg-slate-100 text-slate-500 border-slate-200"
                                )}>
                                    <div className={cn(
                                        "w-1.5 h-1.5 rounded-full",
                                        isAgentThinking ? "bg-amber-400 animate-pulse" : isAgentSpeaking ? "bg-teal-500 animate-pulse" : "bg-slate-400"
                                    )} />
                                    {isAgentThinking ? "AI Thinking..." : isAgentSpeaking ? "AI Speaking..." : "AI Listening"}
                                </div>
                            </div>
                        </div>

                        {/* ── Flex body (no scroll, fits to viewport) ── */}
                        <div className="flex-1 flex flex-col min-h-0 p-4 md:p-5 w-full">
                            <div className="flex flex-col flex-1 min-h-0 gap-4 w-full max-w-7xl mx-auto">

                                {/* Row 1: Avatar (left) + Video feed (right) */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0 h-[200px] lg:h-[220px]">

                                    {/* Avatar card */}
                                    <div className="bg-[#1a2235] rounded-2xl flex flex-col items-center justify-center p-4 lg:p-6 gap-3 shadow-lg border border-[#2a3550] h-full">
                                        <AIAvatar
                                            avatarState={isAgentThinking ? "thinking" : isAgentSpeaking ? "speaking" : "idle"}
                                            size={120}
                                        />
                                        <div className="text-center">
                                            <p className="text-white font-bold text-sm tracking-tight">AI Interviewer</p>
                                            <p className={cn(
                                                "text-[11px] font-semibold mt-0.5 transition-all duration-300",
                                                isAgentThinking ? "text-amber-400" : isAgentSpeaking ? "text-[#5ec4c7]" : "text-slate-400"
                                            )}>
                                                {isAgentThinking ? "Thinking..." : isAgentSpeaking ? "Speaking" : "Listening"}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Video feed */}
                                    <div className="relative bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 shadow-sm h-full">
                                        <video ref={activeVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1] absolute inset-0" />
                                        {!isCameraOn && (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-2 bg-slate-900">
                                                <VideoOff className="w-10 h-10" />
                                                <span className="text-sm font-semibold">Camera is Off</span>
                                            </div>
                                        )}
                                        <div className="absolute top-3 left-3 bg-red-500 text-white px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 uppercase tracking-wide shadow-lg z-20">
                                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" /> Live
                                        </div>
                                        <canvas ref={canvasRef} className="hidden" />
                                        {/* Mic/Cam controls */}
                                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-2 rounded-xl z-20">
                                            <button onClick={toggleMic} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${isMicOn ? 'bg-white/20 text-white' : 'bg-red-500/80 text-white'}`}>
                                                {isMicOn ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
                                                {isMicOn ? 'Mic' : 'Muted'}
                                            </button>
                                            <button onClick={toggleCamera} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${isCameraOn ? 'bg-white/20 text-white' : 'bg-red-500/80 text-white'}`}>
                                                {isCameraOn ? <Video className="w-3 h-3" /> : <VideoOff className="w-3 h-3" />}
                                                {isCameraOn ? 'Cam' : 'Off'}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Row 2: Live Metrics & Transcript Side-by-Side */}
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0">
                                    
                                    {/* Live Metrics (Left - 5 cols) */}
                                    <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col h-full min-h-0">
                                        <div className="flex items-center justify-between mb-4 shrink-0">
                                            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-widest">Live Metrics</span>
                                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-[10px] font-bold text-emerald-600 border border-emerald-100">REAL-TIME</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
                                            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex flex-col items-center justify-center text-center">
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">👁️ Eye Contact</span>
                                                <div className="text-2xl font-black text-slate-900">{eyeContact}<span className="text-xs text-slate-400 font-medium">/100</span></div>
                                            </div>
                                            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex flex-col items-center justify-center text-center">
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">💪 Confidence</span>
                                                <div className="text-2xl font-black text-slate-900">{confidence}<span className="text-xs text-slate-400 font-medium">/100</span></div>
                                            </div>
                                            <div className="col-span-2 bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col items-start min-h-0 relative">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 mb-2 shrink-0">
                                                    <div className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
                                                    Agent Observations
                                                </span>
                                                <div className="overflow-y-auto flex-1 custom-scrollbar pr-2 w-full absolute top-[36px] bottom-4 left-4 right-4">
                                                    <p className="text-slate-600 text-xs leading-relaxed font-medium">{notes}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Live Transcript (Right - 7 cols) */}
                                    <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 flex flex-col shadow-sm h-full min-h-0">
                                        <div className="flex items-center justify-between mb-4 shrink-0 border-b border-slate-100 pb-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-3 h-3 rounded-full ${isMicOn ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-[0.2em]">Live Transcript</h3>
                                            </div>
                                            {!isMicOn && (
                                                <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2.5 py-1 rounded-lg border border-red-100 uppercase tracking-wide">Mic Muted</span>
                                            )}
                                        </div>
                                        <div className="flex flex-col gap-4 pr-2 overflow-y-auto custom-scrollbar flex-1">
                                            {transcript.map((msg, idx) => (
                                                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={`group relative px-5 py-3 rounded-2xl text-sm max-w-[85%] shadow-sm ${
                                                        msg.role === 'user'
                                                            ? 'bg-teal-50 text-teal-900 border border-teal-200/50 rounded-br-sm'
                                                            : 'bg-slate-50 text-slate-700 border border-slate-200/50 rounded-bl-sm'
                                                    }`}>
                                                        <div className={`text-[10px] font-black uppercase tracking-widest mb-1.5 flex items-center gap-1.5 ${msg.role === 'user' ? 'text-teal-700' : 'text-slate-500'}`}>
                                                            <span>{msg.role === 'user' ? '👤 YOU' : '🤖 AI INTERVIEWER'}</span>
                                                        </div>
                                                        <p className="leading-relaxed font-medium">{msg.text}</p>
                                                    </div>
                                                </div>
                                            ))}
                                            {interimText && (
                                                <div className="flex justify-end">
                                                    <div className="px-5 py-3 rounded-2xl text-sm max-w-[85%] bg-teal-50/40 text-teal-800 border border-teal-200/30 border-dashed rounded-br-sm italic opacity-80 shadow-sm animate-pulse">
                                                        <span className="text-[10px] font-black uppercase tracking-widest block mb-1 text-teal-700">You (speaking...)</span>
                                                        {interimText}
                                                    </div>
                                                </div>
                                            )}
                                            <div ref={transcriptEndRef} />
                                        </div>
                                    </div>
                                </div>

                                {/* Error banner */}
                                {endError && (
                                    <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-medium">
                                        <span>⚠️</span>
                                        <span>{endError}</span>
                                        <button onClick={() => setEndError(null)} className="ml-auto text-red-400 hover:text-red-600 font-bold">✕</button>
                                    </div>
                                )}

                            </div>
                        </div>

                        {/* ── Pinned bottom action bar (outside scroll) ── */}
                        <div className="shrink-0 border-t border-slate-200 bg-white px-5 py-3 flex flex-col gap-2.5 z-10 w-full relative">
                            <div className="flex gap-3">
                                {currentQuestionIdx < SCRIPTED_QUESTIONS.length - 1 && (
                                    <button onClick={handleNextQuestion}
                                        className="flex-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs uppercase tracking-widest py-3 rounded-xl shadow-sm transition-all">
                                        ➡ Next Question ({currentQuestionIdx + 1}/{SCRIPTED_QUESTIONS.length})
                                    </button>
                                )}
                                <button onClick={() => setShowEndDialog(true)}
                                    className="flex-1 bg-red-50 hover:bg-red-500 hover:text-white text-red-600 border border-red-200 hover:border-red-500 font-bold text-xs uppercase tracking-widest py-3 rounded-xl shadow-sm transition-all">
                                    🔴 End Interview
                                </button>
                            </div>
                            <div className="text-center pb-1">
                                <span className="text-[10px] text-slate-400 font-semibold flex items-center justify-center gap-1.5 uppercase tracking-wide">
                                    🔒 Your video & audio are processed securely and never stored. We respect your privacy.
                                </span>
                            </div>
                        </div>

                    </div>
                )}


                {/* ── RESULTS ── */}
                {state === "RESULTS" && scorecard && (
                    <div className="flex-1 overflow-y-auto p-8 md:p-12 relative z-10 custom-scrollbar">
                        <div className="w-full max-w-5xl mx-auto flex flex-col gap-8">
                            
                            {/* Header Section */}
                            <div className="text-center relative">
                                <h1 className="text-3xl font-black text-slate-900 mb-2">Interview Complete 🎉</h1>
                                <p className="text-slate-500 text-sm font-medium">Here's how you performed under pressure.</p>
                                <div className="mt-8 mb-6 inline-flex flex-col items-center justify-center p-5 bg-white border-4 border-[#181b25] rounded-full w-32 h-32 shadow-lg relative z-10">
                                    <span className="text-5xl font-black text-[#181b25]">{scorecard.overall_score}</span>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">Overall</span>
                                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-[#fd6940] rounded-full flex items-center justify-center text-white font-black text-xs shadow-md">✓</div>
                                </div>
                            </div>

                            {/* Main Stats Grid */}
                            <div className="flex flex-col gap-8">
                                
                                {/* 3-Card Metrics */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {[
                                        { label: "Technical", score: scorecard.technical_accuracy, color: "text-amber-500", bg: "bg-amber-50" },
                                        { label: "Communication", score: scorecard.communication_score, color: "text-emerald-500", bg: "bg-emerald-50" },
                                        { label: "Confidence", score: scorecard.confidence, color: "text-indigo-500", bg: "bg-indigo-50" },
                                    ].map((s, i) => (
                                        <div key={i} className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col items-center shadow-sm">
                                            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-black ${s.bg} ${s.color} mb-2`}>{s.score}</div>
                                            <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-500">{s.label}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Strengths / Weaknesses */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    <div className="bg-emerald-50/50 border border-emerald-100 p-6 rounded-2xl shadow-sm">
                                        <h3 className="text-emerald-700 font-extrabold mb-3 text-sm uppercase tracking-wide flex items-center gap-2">
                                            <span className="bg-emerald-200/50 p-1.5 rounded-lg">✅</span> Key Strengths
                                        </h3>
                                        <p className="text-[15px] text-emerald-900/80 leading-relaxed font-medium">{formatEvaluationText(scorecard.strengths)}</p>
                                    </div>
                                    <div className="bg-orange-50/50 border border-orange-100 p-6 rounded-2xl shadow-sm">
                                        <h3 className="text-orange-700 font-extrabold mb-3 text-sm uppercase tracking-wide flex items-center gap-2">
                                            <span className="bg-orange-200/50 p-1.5 rounded-lg">⚠️</span> Areas to Improve
                                        </h3>
                                        <p className="text-[15px] text-orange-900/80 leading-relaxed font-medium">{formatEvaluationText(scorecard.weaknesses)}</p>
                                    </div>
                                </div>

                                {/* Improvement Tips */}
                                <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex-1">
                                    <h2 className="text-base font-extrabold text-slate-900 mb-5 flex items-center gap-2">
                                        💡 Actionable Improvement Tips
                                    </h2>
                                    <div className="flex flex-col gap-3">
                                        {scorecard.improvement_tips?.length ? scorecard.improvement_tips.map((tip: string, idx: number) => (
                                            <div key={idx} className="bg-slate-50/80 hover:bg-slate-50 border border-slate-100 p-4 rounded-xl flex items-start gap-4 transition-colors">
                                                <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm shrink-0">{idx + 1}</div>
                                                <p className="text-slate-700 text-[15px] pt-1 leading-relaxed font-medium">{tip}</p>
                                            </div>
                                        )) : (
                                            <p className="text-slate-500 text-sm">No tips available for this session.</p>
                                        )}
                                    </div>
                                </div>

                                {/* Bottom Actions */}
                                <div className="flex gap-4 pt-2">
                                    <button onClick={() => setState("SETUP")} className="flex-1 py-4 border-2 border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-bold rounded-2xl transition-all shadow-sm">
                                        Practice Again
                                    </button>
                                    <button onClick={() => router.push("/dashboard")} className="flex-1 py-4 bg-[#181b25] hover:bg-black text-white font-bold rounded-2xl transition-all shadow-xl shadow-slate-900/10">
                                        View Dashboard
                                    </button>
                                </div>

                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }

                /* ── AI Avatar Animations ── */

                .avatar-ring-idle {
                    box-shadow: 0 0 0 2px rgba(94,196,199,0.15);
                    animation: avatar-breathe 3s ease-in-out infinite;
                }
                .avatar-ring-thinking {
                    box-shadow: 0 0 0 3px rgba(251,191,36,0.35), 0 0 18px rgba(251,191,36,0.15);
                    animation: avatar-pulse-amber 1s ease-in-out infinite;
                }
                .avatar-ring-speaking {
                    box-shadow: 0 0 0 3px rgba(94,196,199,0.55), 0 0 28px rgba(94,196,199,0.3);
                    animation: avatar-pulse-teal 0.6s ease-in-out infinite;
                }

                .avatar-circle-idle {
                    animation: avatar-breathe-scale 3s ease-in-out infinite;
                }
                .avatar-circle-thinking {
                    animation: avatar-thinking-bob 1.2s ease-in-out infinite;
                }
                .avatar-circle-speaking {
                    animation: avatar-speaking-pop 0.4s ease-in-out infinite alternate;
                }

                .avatar-eye-blink {
                    animation: avatar-blink 4s ease-in-out infinite;
                }
                .avatar-eye-thinking {
                    animation: avatar-eye-shift 1.5s ease-in-out infinite alternate;
                }
                .avatar-eye-speaking {
                    animation: avatar-eye-bounce 0.5s ease-in-out infinite alternate;
                }

                .avatar-mouth-speaking {
                    width: 70%;
                    border-radius: 4px 4px 100px 100px;
                    animation: avatar-talk 0.35s cubic-bezier(0.4, 0, 0.2, 1) infinite alternate;
                    transform-origin: top;
                }

                .avatar-orbit-dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background: rgba(251,191,36,0.75);
                    animation: avatar-orbit 1.2s linear infinite;
                    position: absolute;
                }

                .avatar-thinking-shimmer {
                    background: linear-gradient(
                        120deg,
                        transparent 30%,
                        rgba(251,191,36,0.07) 50%,
                        transparent 70%
                    );
                    background-size: 200% 100%;
                    animation: avatar-shimmer 1.5s linear infinite;
                }

                @keyframes avatar-breathe {
                    0%, 100% { opacity: 0.5; }
                    50%       { opacity: 1; }
                }
                @keyframes avatar-breathe-scale {
                    0%, 100% { transform: scale(1); }
                    50%       { transform: scale(1.018); }
                }
                @keyframes avatar-pulse-amber {
                    0%, 100% { box-shadow: 0 0 0 3px rgba(251,191,36,0.3), 0 0 18px rgba(251,191,36,0.1); }
                    50%       { box-shadow: 0 0 0 5px rgba(251,191,36,0.55), 0 0 28px rgba(251,191,36,0.25); }
                }
                @keyframes avatar-pulse-teal {
                    0%, 100% { box-shadow: 0 0 0 3px rgba(94,196,199,0.4), 0 0 20px rgba(94,196,199,0.2); }
                    50%       { box-shadow: 0 0 0 6px rgba(94,196,199,0.7), 0 0 36px rgba(94,196,199,0.35); }
                }
                @keyframes avatar-thinking-bob {
                    0%, 100% { transform: translateY(0); }
                    50%       { transform: translateY(-3px); }
                }
                @keyframes avatar-speaking-pop {
                    from { transform: scale(1); }
                    to   { transform: scale(1.025); }
                }
                @keyframes avatar-blink {
                    0%, 90%, 100% { transform: scaleY(1); }
                    95%            { transform: scaleY(0.1); }
                }
                @keyframes avatar-eye-shift {
                    0%   { transform: translateX(-1.5px); }
                    100% { transform: translateX(1.5px); }
                }
                @keyframes avatar-eye-bounce {
                    from { transform: scaleY(1); }
                    to   { transform: scaleY(0.7); }
                }
                @keyframes avatar-talk {
                    0%, 100% { transform: scaleY(1); }
                    10% { transform: scaleY(1.4); }
                    20% { transform: scaleY(1.1); }
                    30% { transform: scaleY(1.6); }
                    40% { transform: scaleY(1.2); }
                    50% { transform: scaleY(1.0); }
                    60% { transform: scaleY(1.3); }
                    80% { transform: scaleY(1.5); }
                    90% { transform: scaleY(1.1); }
                }
                @keyframes avatar-orbit {
                    0%   { transform: rotate(0deg)   translateX(54%) rotate(0deg); }
                    100% { transform: rotate(360deg) translateX(54%) rotate(-360deg); }
                }
                @keyframes avatar-shimmer {
                    0%   { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
            `}</style>
        </div>
    );
}
