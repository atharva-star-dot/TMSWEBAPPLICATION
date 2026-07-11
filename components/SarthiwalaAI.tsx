"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Send, Volume2, VolumeX } from "lucide-react";

type ChatState = "idle" | "listening" | "thinking" | "speaking";
type Msg = { role: "user" | "assistant"; text: string };

const QUICK_PROMPTS = ["Show pending bills", "Today's business summary", "Add a new bill"];

const STATE_META: Record<ChatState, { color: string; label: string }> = {
  idle: { color: "#2f5ee0", label: "Idle — tap the mic or type below" },
  listening: { color: "#38bdf8", label: "Listening…" },
  thinking: { color: "#f59e0b", label: "Thinking…" },
  speaking: { color: "#10b981", label: "Speaking…" },
};

export default function SarthiwalaAI({ needsKeySetup }: { needsKeySetup: boolean }) {
  const [state, setState] = useState<ChatState>("idle");
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", text: "Hi! I'm Sarthiwala AI. Ask me about bills, payments, or customers — or tell me to add one." },
  ]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const [pending, setPending] = useState<any>(null);
  const [muted, setMuted] = useState(false);
  const [listening, setListening] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-IN";
    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setListening(false);
      setState("idle");
      send(transcript);
    };
    rec.onerror = () => {
      setListening(false);
      setState("idle");
    };
    rec.onend = () => {
      setListening(false);
    };
    recognitionRef.current = rec;
  }, []);

  function speak(text: string) {
    if (muted || !text || !("speechSynthesis" in window)) return;
    setState("speaking");
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.02;
    utter.onend = () => setState("idle");
    utter.onerror = () => setState("idle");
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }

  function toggleMic() {
    if (!recognitionRef.current) {
      alert("Voice input isn't supported in this browser. Try Chrome or Edge, or just type below.");
      return;
    }
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
      setState("idle");
      return;
    }
    setListening(true);
    setState("listening");
    recognitionRef.current.start();
  }

  async function send(text: string) {
    if (!text.trim()) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setState("thinking");

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, history, pending }),
      });
      const json = await res.json();

      setMessages((m) => [...m, { role: "assistant", text: json.speak }]);
      setHistory(json.history || []);
      setPending(json.pending || null);
      speak(json.speak);
      if (json.speak && !("speechSynthesis" in window)) setState("idle");
    } catch (e: any) {
      setMessages((m) => [...m, { role: "assistant", text: "Sorry, something went wrong reaching Sarthiwala AI." }]);
      setState("idle");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
  }

  const meta = STATE_META[state];

  return (
    <div>
      <h1 className="text-3xl font-bold text-text">✨ Sarthiwala AI</h1>
      <p className="text-text-muted mb-6">Ask about bills, payments, customers — or tell it to add one.</p>

      {needsKeySetup && (
        <div className="card p-4 mb-6 border-warning/40 bg-warning/10">
          <p className="text-sm text-text">
            <strong>Sarthiwala AI isn't configured yet.</strong> An admin needs to add an API key under{" "}
            <a href="/company" className="text-brand font-medium underline">
              Company Settings → Sarthiwala AI
            </a>
            .
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Sparkling presence indicator */}
        <div className="card flex flex-col items-center justify-center py-10 gap-4">
          <div
            className="rounded-2xl flex items-center justify-center transition-all duration-500"
            style={{
              width: 140,
              height: 140,
              background: `linear-gradient(135deg, ${meta.color}33, ${meta.color}11)`,
              border: `2px solid ${meta.color}`,
              boxShadow: state !== "idle" ? `0 0 30px ${meta.color}66` : "none",
              animation: state !== "idle" ? "sarthi-pulse 1.4s ease-in-out infinite" : "none",
            }}
          >
            <span style={{ fontSize: 40 }}>✨</span>
          </div>
          <p className="font-semibold text-text">Sarthiwala AI</p>
          <p className="text-xs text-text-muted text-center px-4">{meta.label}</p>

          <button
            onClick={toggleMic}
            className="btn mt-2"
            style={{ background: listening ? "#dc2626" : "var(--brand)", color: "white" }}
          >
            <Mic size={16} />
            {listening ? "Stop Listening" : "🎤 Hold to Talk"}
          </button>

          <button
            onClick={() => setMuted((m) => !m)}
            className="btn btn-outline text-xs"
            title={muted ? "Unmute voice replies" : "Mute voice replies"}
          >
            {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            {muted ? "Muted" : "Voice on"}
          </button>

          <div className="flex flex-col gap-2 w-full px-4 mt-2">
            {QUICK_PROMPTS.map((p) => (
              <button key={p} className="btn btn-outline text-xs" onClick={() => send(p)}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Chat panel */}
        <div className="card flex flex-col h-[520px]">
          <div className="px-5 py-3 border-b border-border">
            <p className="font-semibold text-text">💬 Chat with Sarthiwala AI</p>
          </div>

          <div ref={logRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className="max-w-[80%] rounded-2xl px-4 py-2 text-sm"
                  style={{
                    background: m.role === "user" ? "var(--brand)" : "var(--surface-alt)",
                    color: m.role === "user" ? "white" : "var(--text)",
                  }}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {state === "thinking" && (
              <div className="flex justify-start">
                <div className="rounded-2xl px-4 py-2 text-sm bg-surface-alt text-text-muted">Thinking…</div>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2 p-4 border-t border-border">
            <input
              className="input"
              placeholder="Type a message…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button className="btn btn-primary" type="submit">
              <Send size={16} />
              Send
            </button>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes sarthi-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.06); }
        }
      `}</style>
    </div>
  );
}
