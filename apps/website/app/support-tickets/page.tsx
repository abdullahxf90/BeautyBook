"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const serif = "'Cormorant Garamond',serif";

type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

interface TicketMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  createdAt: string;
}

interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: string;
  createdAt: string;
  updatedAt: string;
  messages: TicketMessage[];
}

const statusColors: Record<TicketStatus, { bg: string; fg: string; label: string }> = {
  OPEN: { bg: "rgba(212,175,55,.2)", fg: "#7a5c14", label: "Open" },
  IN_PROGRESS: { bg: "rgba(176,106,133,.2)", fg: "#B06A85", label: "In Progress" },
  RESOLVED: { bg: "rgba(28,28,28,.08)", fg: "#1C1C1C", label: "Resolved" },
  CLOSED: { bg: "rgba(163,51,51,.12)", fg: "#a33", label: "Closed" },
};

const priorityColors: Record<TicketPriority, string> = {
  LOW: "#5a5457",
  MEDIUM: "#7a5c14",
  HIGH: "#B06A85",
  URGENT: "#a33",
};

const categories = ["Booking Issue", "Payment", "Account", "Salon Inquiry", "Technical Problem", "Other"];

export default function SupportTicketsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [ticketsError, setTicketsError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ subject: "", description: "", category: categories[0], priority: "MEDIUM" as TicketPriority });
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [replyText, setReplyText] = useState("");
  const [replySending, setReplySending] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login?next=/support-tickets");
  }, [loading, user, router]);

  const loadTickets = useCallback(async () => {
    if (!token) return;
    setTicketsLoading(true);
    setTicketsError("");
    const res = await api<{ tickets: Ticket[] }>("/api/support/tickets", { token }).catch(() => {
      setTicketsError("Could not load support tickets. Please try again.");
      return { tickets: [] };
    });
    setTickets(res.tickets);
    setTicketsLoading(false);
  }, [token]);

  useEffect(() => { void loadTickets(); }, [loadTickets]);

  const createTicket = async () => {
    if (!token || !form.subject.trim() || !form.description.trim()) return;
    setFormSaving(true);
    setFormError("");
    const res = await api<{ ticket: Ticket }>("/api/support/tickets", {
      method: "POST",
      token,
      body: JSON.stringify({ subject: form.subject.trim(), description: form.description.trim(), category: form.category, priority: form.priority }),
    }).catch(() => {
      setFormError("Failed to create ticket. Please try again.");
      return null;
    });
    if (res?.ticket) {
      setTickets(prev => [res.ticket, ...prev]);
      setShowForm(false);
      setForm({ subject: "", description: "", category: categories[0], priority: "MEDIUM" });
    }
    setFormSaving(false);
  };

  const sendReply = async (ticketId: string) => {
    if (!token || !replyText.trim()) return;
    setReplySending(true);
    const text = replyText.trim();
    setReplyText("");
    const res = await api<{ message: TicketMessage }>(`/api/support/tickets/${ticketId}/messages`, {
      method: "POST",
      token,
      body: JSON.stringify({ text }),
    }).catch(() => null);
    if (res?.message) {
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, messages: [...t.messages, res.message], status: t.status === "CLOSED" ? "OPEN" as TicketStatus : t.status } : t));
    }
    setReplySending(false);
  };

  if (loading || !user) return null;

  const expandedTicket = tickets.find(t => t.id === expandedId);

  return (
    <>
      <Nav />
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "clamp(32px,5vh,56px) clamp(24px,5vw,40px) 80px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: ".16em", textTransform: "uppercase", color: "#B06A85" }}>Support</span>
            <h1 style={{ fontFamily: serif, fontWeight: 500, fontSize: "clamp(34px,5vw,54px)", marginTop: 10 }}>Support tickets</h1>
          </div>
          <button onClick={() => { setShowForm(!showForm); setFormError(""); }} className="bb-btn" style={{ padding: "12px 22px", borderRadius: 14, border: "none", background: "#1C1C1C", color: "#FAF8F7", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            {showForm ? "Cancel" : "New ticket"}
          </button>
        </div>

        {/* New ticket form */}
        {showForm && (
          <div style={{ marginTop: 24, borderRadius: 20, background: "#fff", border: "1px solid rgba(28,28,28,.06)", padding: 28 }}>
            <h2 style={{ fontFamily: serif, fontSize: 24, fontWeight: 600, marginBottom: 18 }}>Create a new ticket</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <input className="bb-input" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="Subject" style={{ padding: "12px 16px", borderRadius: 14, border: "1px solid rgba(28,28,28,.12)", fontSize: 14, background: "#FAF8F7", outline: "none" }} />
              <textarea className="bb-input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe your issue..." rows={4} style={{ padding: "12px 16px", borderRadius: 14, border: "1px solid rgba(28,28,28,.12)", fontSize: 14, background: "#FAF8F7", outline: "none", resize: "vertical" }} />
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <select className="bb-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={{ flex: 1, minWidth: 140, padding: "12px 16px", borderRadius: 14, border: "1px solid rgba(28,28,28,.12)", fontSize: 14, background: "#FAF8F7", outline: "none" }}>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select className="bb-select" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as TicketPriority })} style={{ flex: 1, minWidth: 120, padding: "12px 16px", borderRadius: 14, border: "1px solid rgba(28,28,28,.12)", fontSize: 14, background: "#FAF8F7", outline: "none" }}>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
              {formError && <p style={{ fontSize: 13, color: "#a33" }}>{formError}</p>}
              <button onClick={() => void createTicket()} disabled={!form.subject.trim() || !form.description.trim() || formSaving} className="bb-btn" style={{ padding: "12px 0", borderRadius: 14, border: "none", background: "#1C1C1C", color: "#FAF8F7", fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: !form.subject.trim() || !form.description.trim() || formSaving ? 0.5 : 1 }}>
                {formSaving ? "Creating..." : "Submit ticket"}
              </button>
            </div>
          </div>
        )}

        {/* Ticket list */}
        <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 12 }}>
          {ticketsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ borderRadius: 18, background: "#fff", border: "1px solid rgba(28,28,28,.06)", padding: "20px 22px" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}>
                  <div className="bb-skeleton" style={{ width: 80, height: 22, borderRadius: 10 }} />
                  <div className="bb-skeleton" style={{ width: 60, height: 22, borderRadius: 10 }} />
                </div>
                <div className="bb-skeleton" style={{ height: 16, width: "55%", borderRadius: 6, marginBottom: 6 }} />
                <div className="bb-skeleton" style={{ height: 12, width: "35%", borderRadius: 6 }} />
              </div>
            ))
          ) : ticketsError ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <p style={{ fontSize: 14, color: "#a33" }}>{ticketsError}</p>
              <button onClick={() => void loadTickets()} className="bb-btn" style={{ marginTop: 14, padding: "10px 18px", borderRadius: 12, border: "none", background: "#1C1C1C", color: "#FAF8F7", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Retry</button>
            </div>
          ) : tickets.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <p style={{ fontSize: 16, color: "#5a5457" }}>No tickets yet</p>
              <p style={{ fontSize: 14, color: "#5a5457", marginTop: 6 }}>Create a ticket and we&apos;ll get back to you shortly.</p>
            </div>
          ) : (
            tickets.map(t => {
              const sc = statusColors[t.status];
              return (
                <div key={t.id} style={{ borderRadius: 18, background: "#fff", border: "1px solid rgba(28,28,28,.06)", overflow: "hidden" }}>
                  <button
                    onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                    style={{ width: "100%", border: "none", background: "transparent", cursor: "pointer", padding: "20px 22px", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", padding: "5px 10px", borderRadius: 10, background: sc.bg, color: sc.fg }}>{sc.label}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: priorityColors[t.priority] }}>{t.priority}</span>
                        <span style={{ fontSize: 12, color: "#5a5457" }}>· {t.category}</span>
                      </div>
                      <p style={{ fontSize: 16, fontWeight: 600, marginTop: 8 }}>{t.subject}</p>
                      <p style={{ fontSize: 13, color: "#5a5457", marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.description}</p>
                    </div>
                    <div style={{ fontSize: 12, color: "#5a5457", whiteSpace: "nowrap", alignSelf: "flex-start", marginTop: 4 }}>
                      {new Date(t.createdAt).toLocaleDateString()}
                      <span style={{ marginLeft: 8 }}>{expandedId === t.id ? "▲" : "▼"}</span>
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {expandedId === t.id && expandedTicket && (
                    <div style={{ borderTop: "1px solid rgba(28,28,28,.06)", padding: "20px 22px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
                        {expandedTicket.messages.length === 0 ? (
                          <p style={{ fontSize: 14, color: "#5a5457" }}>No replies yet. Our team will respond shortly.</p>
                        ) : (
                          expandedTicket.messages.map(m => (
                            <div key={m.id} style={{ padding: "14px 16px", borderRadius: 16, background: m.senderId === user.id ? "rgba(28,28,28,.04)" : "rgba(176,106,133,.08)", fontSize: 14, lineHeight: 1.5 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                <span style={{ fontWeight: 600, fontSize: 13 }}>{m.senderName}</span>
                                <span style={{ fontSize: 11, color: "#5a5457" }}>{new Date(m.createdAt).toLocaleString()}</span>
                              </div>
                              <p style={{ whiteSpace: "pre-wrap" }}>{m.text}</p>
                            </div>
                          ))
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 10 }}>
                        <input
                          className="bb-input"
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          placeholder="Type your reply..."
                          style={{ flex: 1, padding: "12px 16px", borderRadius: 14, border: "1px solid rgba(28,28,28,.12)", fontSize: 14, background: "#FAF8F7", outline: "none" }}
                        />
                        <button
                          onClick={() => void sendReply(t.id)}
                          disabled={!replyText.trim() || replySending}
                          className="bb-btn"
                          style={{ padding: "12px 20px", borderRadius: 14, border: "none", background: "#1C1C1C", color: "#FAF8F7", fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: !replyText.trim() || replySending ? 0.5 : 1 }}
                        >
                          {replySending ? "..." : "Reply"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
