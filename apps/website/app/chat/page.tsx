"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const serif = "'Cormorant Garamond',serif";

interface ConversationParticipant { id: string; name: string; avatar?: string }
interface LastMessage { text: string; createdAt: string; senderId: string }
interface Conversation {
  id: string;
  salonName: string;
  salonSlug: string;
  participant: ConversationParticipant;
  lastMessage: LastMessage | null;
  unreadCount: number;
  updatedAt: string;
}

interface Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: string;
}

export default function ChatPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [convLoading, setConvLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [convError, setConvError] = useState("");
  const [msgError, setMsgError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/login?next=/chat");
  }, [loading, user, router]);

  const loadConversations = useCallback(async () => {
    if (!token) return;
    setConvLoading(true);
    setConvError("");
    const res = await api<{ conversations: Conversation[] }>("/api/chat/conversations", { token }).catch(() => {
      setConvError("Could not load conversations. Please try again.");
      return { conversations: [] };
    });
    setConversations(res.conversations);
    setConvLoading(false);
  }, [token]);

  useEffect(() => { void loadConversations(); }, [loadConversations]);

  const loadMessages = useCallback(async (convId: string) => {
    if (!token) return;
    setMsgLoading(true);
    setMsgError("");
    const res = await api<{ messages: Message[] }>(`/api/chat/conversations/${convId}/messages`, { token }).catch(() => {
      setMsgError("Could not load messages. Please try again.");
      return { messages: [] };
    });
    setMessages(res.messages);
    setMsgLoading(false);
  }, [token]);

  useEffect(() => {
    if (activeId) { void loadMessages(activeId); }
  }, [activeId, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!token || !activeId || !input.trim()) return;
    setSending(true);
    const text = input.trim();
    setInput("");
    const res = await api<{ message: Message }>(`/api/chat/conversations/${activeId}/messages`, {
      method: "POST",
      token,
      body: JSON.stringify({ text }),
    }).catch(() => null);
    if (res?.message) {
      setMessages(prev => [...prev, res.message]);
    }
    setSending(false);
    await loadConversations();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); }
  };

  if (loading || !user) return null;

  const activeConv = conversations.find(c => c.id === activeId);

  return (
    <>
      <Nav />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "clamp(32px,5vh,56px) clamp(24px,5vw,40px) 80px" }}>
        <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: ".16em", textTransform: "uppercase", color: "#B06A85" }}>Messages</span>
        <h1 style={{ fontFamily: serif, fontWeight: 500, fontSize: "clamp(34px,5vw,54px)", marginTop: 10 }}>Chat</h1>

        <div style={{ display: "flex", gap: 20, marginTop: 28, minHeight: "60vh" }}>
          {/* Conversation list */}
          <div style={{ width: 340, flexShrink: 0, borderRadius: 20, background: "#fff", border: "1px solid rgba(28,28,28,.06)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {convLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ display: "flex", gap: 12, padding: "16px 18px", borderBottom: "1px solid rgba(28,28,28,.05)" }}>
                  <div className="bb-skeleton" style={{ width: 42, height: 42, borderRadius: "50%", flexShrink: 0 }} />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                    <div className="bb-skeleton" style={{ height: 14, width: "60%", borderRadius: 6 }} />
                    <div className="bb-skeleton" style={{ height: 11, width: "80%", borderRadius: 6 }} />
                  </div>
                </div>
              ))
            ) : convError ? (
              <div style={{ padding: 40, textAlign: "center" }}>
                <p style={{ fontSize: 14, color: "#a33" }}>{convError}</p>
                <button onClick={() => void loadConversations()} className="bb-btn" style={{ marginTop: 14, padding: "10px 18px", borderRadius: 12, border: "none", background: "#1C1C1C", color: "#FAF8F7", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Retry</button>
              </div>
            ) : conversations.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center" }}>
                <p style={{ fontSize: 15, color: "#5a5457" }}>No conversations yet</p>
                <p style={{ fontSize: 13, color: "#5a5457", marginTop: 6 }}>Message a salon to get started.</p>
              </div>
            ) : (
              conversations.map(c => (
                <button key={c.id} onClick={() => setActiveId(c.id)} style={{ display: "flex", gap: 12, padding: "16px 18px", border: "none", borderBottom: "1px solid rgba(28,28,28,.05)", background: activeId === c.id ? "rgba(176,106,133,.08)" : "transparent", cursor: "pointer", textAlign: "left", width: "100%" }}>
                  <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#B06A85", display: "flex", alignItems: "center", justifyContent: "center", color: "#FAF8F7", fontSize: 16, fontWeight: 600, flexShrink: 0 }}>
                    {c.salonName.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 15, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.salonName}</span>
                      {c.lastMessage && <span style={{ fontSize: 11, color: "#5a5457", whiteSpace: "nowrap" }}>{new Date(c.lastMessage.createdAt).toLocaleDateString()}</span>}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: 4 }}>
                      <span style={{ fontSize: 13, color: "#5a5457", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {c.lastMessage ? c.lastMessage.text : "No messages yet"}
                      </span>
                      {c.unreadCount > 0 && (
                        <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#B06A85", color: "#FAF8F7", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Active conversation */}
          <div style={{ flex: 1, borderRadius: 20, background: "#fff", border: "1px solid rgba(28,28,28,.06)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {!activeId ? (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <p style={{ fontSize: 15, color: "#5a5457" }}>Select a conversation</p>
              </div>
            ) : msgLoading ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16, padding: 24 }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: i % 2 === 0 ? "flex-start" : "flex-end", gap: 10 }}>
                    <div className="bb-skeleton" style={{ width: "50%", maxWidth: 280, height: 48, borderRadius: 16 }} />
                  </div>
                ))}
              </div>
            ) : msgError ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <p style={{ fontSize: 14, color: "#a33" }}>{msgError}</p>
                <button onClick={() => activeId && void loadMessages(activeId)} className="bb-btn" style={{ marginTop: 14, padding: "10px 18px", borderRadius: 12, border: "none", background: "#1C1C1C", color: "#FAF8F7", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Retry</button>
              </div>
            ) : (
              <>
                {/* Header */}
                {activeConv && (
                  <div style={{ padding: "16px 22px", borderBottom: "1px solid rgba(28,28,28,.06)", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#B06A85", display: "flex", alignItems: "center", justifyContent: "center", color: "#FAF8F7", fontSize: 14, fontWeight: 600, flexShrink: 0 }}>
                      {activeConv.salonName.charAt(0)}
                    </div>
                    <div>
                      <span style={{ fontSize: 15, fontWeight: 600 }}>{activeConv.salonName}</span>
                    </div>
                  </div>
                )}

                {/* Messages */}
                <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 10 }}>
                  {messages.length === 0 ? (
                    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <p style={{ fontSize: 14, color: "#5a5457" }}>No messages yet. Start the conversation.</p>
                    </div>
                  ) : (
                    messages.map(m => {
                      const isSent = m.senderId === user.id;
                      return (
                        <div key={m.id} style={{ display: "flex", justifyContent: isSent ? "flex-end" : "flex-start" }}>
                          <div style={{ maxWidth: "70%", padding: "12px 16px", borderRadius: isSent ? "18px 18px 4px 18px" : "18px 18px 18px 4px", background: isSent ? "#1C1C1C" : "rgba(28,28,28,.06)", color: isSent ? "#FAF8F7" : "#1C1C1C", fontSize: 14, lineHeight: 1.5 }}>
                            <p style={{ whiteSpace: "pre-wrap" }}>{m.text}</p>
                            <p style={{ fontSize: 11, marginTop: 6, opacity: 0.6, textAlign: isSent ? "right" : "left" }}>{new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div style={{ padding: "14px 18px", borderTop: "1px solid rgba(28,28,28,.06)", display: "flex", gap: 10 }}>
                  <input
                    className="bb-input"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    style={{ flex: 1, borderRadius: 14, padding: "12px 16px", border: "1px solid rgba(28,28,28,.12)", fontSize: 14, background: "#FAF8F7", outline: "none" }}
                  />
                  <button
                    onClick={() => void sendMessage()}
                    disabled={!input.trim() || sending}
                    className="bb-btn"
                    style={{ padding: "12px 22px", borderRadius: 14, border: "none", background: "#1C1C1C", color: "#FAF8F7", fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: !input.trim() || sending ? 0.5 : 1 }}
                  >
                    {sending ? "..." : "Send"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
