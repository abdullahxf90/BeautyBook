"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const serif = "'Cormorant Garamond',serif";

interface Message { role: "USER" | "ASSISTANT"; content: string }

export default function AIAssistantPage() {
  const { token } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    { role: "ASSISTANT", content: "Hi! I'm your BeautyBook assistant. Ask me about beauty services, salons, skincare routines, or anything beauty-related." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    api<{ suggestions: string[] }>("/api/ai/suggest", { method: "POST", body: JSON.stringify({ query: "" }) })
      .then(res => setSuggestions(res.suggestions)).catch(() => {});
  }, []);

  const send = useCallback(async () => {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput("");
    setMessages(prev => [...prev, { role: "USER", content: msg }]);
    setLoading(true);
    try {
      const res = await api<{ reply: string; conversationId: string }>("/api/ai/chat", {
        method: "POST",
        body: JSON.stringify({ message: msg, conversationId }),
        token,
      });
      setMessages(prev => [...prev, { role: "ASSISTANT", content: res.reply }]);
      setConversationId(res.conversationId);
    } catch {
      setMessages(prev => [...prev, { role: "ASSISTANT", content: "Sorry, I couldn't process that right now. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, conversationId, token]);

  return (
    <>
      <Nav />
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "clamp(32px,5vh,56px) clamp(24px,5vw,40px) 80px" }}>
        <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: ".16em", textTransform: "uppercase", color: "#B06A85" }}>AI Assistant</span>
        <h1 style={{ fontFamily: serif, fontWeight: 500, fontSize: "clamp(34px,5vw,54px)", marginTop: 10 }}>How can we help you glow?</h1>
        <p style={{ fontSize: 15, color: "#5a5457", marginTop: 8 }}>Ask about services, salons, beauty tips, and more.</p>

        {/* Chat area */}
        <div style={{ marginTop: 28, borderRadius: 24, background: "#fff", border: "1px solid rgba(28,28,28,.06)", boxShadow: "0 24px 60px -36px rgba(28,28,28,.35)", overflow: "hidden" }}>
          <div style={{ height: 420, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: 16 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "USER" ? "flex-end" : "flex-start" }}>
                <div style={{ maxWidth: "80%", padding: "14px 18px", borderRadius: 18, background: m.role === "USER" ? "#1C1C1C" : "rgba(235,200,211,.25)", color: m.role === "USER" ? "#FAF8F7" : "#1C1C1C", fontSize: 15, lineHeight: 1.5 }}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{ padding: "14px 18px", borderRadius: 18, background: "rgba(235,200,211,.25)", fontSize: 14, color: "#5a5457" }}>Thinking...</div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions */}
          {suggestions.length > 0 && messages.length <= 2 && (
            <div style={{ padding: "0 24px 16px", display: "flex", gap: 8, flexWrap: "wrap" }}>
              {suggestions.map((s, i) => (
                <button key={i} onClick={() => { setInput(s); }} style={{ padding: "8px 14px", borderRadius: 14, border: "1px solid rgba(28,28,28,.1)", background: "rgba(255,255,255,.8)", fontSize: 13, cursor: "pointer", color: "#4a4446" }}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{ borderTop: "1px solid rgba(28,28,28,.06)", padding: "16px 24px", display: "flex", gap: 12 }}>
            <input
              className="bb-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void send(); }}
              placeholder="Ask anything about beauty..."
              style={{ flex: 1 }}
            />
            <button onClick={() => void send()} disabled={!input.trim() || loading} className="bb-btn" style={{ padding: "12px 24px", border: "none", borderRadius: 14, background: "#1C1C1C", color: "#FAF8F7", fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: !input.trim() || loading ? 0.5 : 1, whiteSpace: "nowrap" }}>
              Send
            </button>
          </div>
        </div>

        <div style={{ marginTop: 24, display: "flex", gap: 24, flexWrap: "wrap", fontSize: 14, color: "#5a5457" }}>
          <span>💡 Try asking: <em>&ldquo;Find me a bridal makeup artist in Karachi&rdquo;</em></span>
          <span>💡 <em>&ldquo;What facial treatments are good for glowing skin?&rdquo;</em></span>
        </div>
      </div>
      <Footer />
    </>
  );
}
