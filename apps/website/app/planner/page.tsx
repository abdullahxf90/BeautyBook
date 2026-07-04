"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const serif = "'Cormorant Garamond',serif";
const EVENTS = ["Wedding", "Eid", "Graduation", "Photoshoot", "Vacation"] as const;
type EventType = (typeof EVENTS)[number];

interface TimelineStep {
  daysBefore: number;
  label: string;
  serviceSlug: string;
}

interface TimelineItem extends TimelineStep {
  completed: boolean;
  dateISO: string;
}

interface SavedPlan {
  id: string;
  title: string;
  targetDate: string;
  description: string;
  timeline: { id: string; title: string; description: string; date: string; completed: boolean }[];
}

const EVENT_TIMELINES: Record<EventType, { days: number; steps: TimelineStep[] }> = {
  Wedding: {
    days: 45,
    steps: [
      { daysBefore: 45, label: "Hair consultation", serviceSlug: "hair-consultation" },
      { daysBefore: 30, label: "Skin treatment", serviceSlug: "facial" },
      { daysBefore: 14, label: "Trial makeup", serviceSlug: "bridal-makeup" },
      { daysBefore: 7, label: "Hair color", serviceSlug: "hair-color" },
      { daysBefore: 2, label: "Manicure & pedicure", serviceSlug: "manicure-pedicure" },
      { daysBefore: 1, label: "Bridal makeup", serviceSlug: "bridal-makeup" },
    ],
  },
  Eid: {
    days: 14,
    steps: [
      { daysBefore: 14, label: "Hair treatment", serviceSlug: "hair-treatment" },
      { daysBefore: 7, label: "Facial", serviceSlug: "facial" },
      { daysBefore: 2, label: "Haircut & color", serviceSlug: "hair-color" },
      { daysBefore: 1, label: "Manicure", serviceSlug: "manicure" },
    ],
  },
  Graduation: {
    days: 7,
    steps: [
      { daysBefore: 7, label: "Facial", serviceSlug: "facial" },
      { daysBefore: 3, label: "Haircut", serviceSlug: "haircut" },
      { daysBefore: 1, label: "Makeup", serviceSlug: "makeup" },
    ],
  },
  Photoshoot: {
    days: 10,
    steps: [
      { daysBefore: 10, label: "Skin care", serviceSlug: "facial" },
      { daysBefore: 5, label: "Hair color", serviceSlug: "hair-color" },
      { daysBefore: 1, label: "Makeup & styling", serviceSlug: "makeup" },
    ],
  },
  Vacation: {
    days: 5,
    steps: [
      { daysBefore: 5, label: "Waxing", serviceSlug: "waxing" },
      { daysBefore: 3, label: "Facial", serviceSlug: "facial" },
      { daysBefore: 1, label: "Manicure & pedicure", serviceSlug: "manicure-pedicure" },
    ],
  },
};

const EVENT_ICONS: Record<EventType, string> = {
  Wedding: "💍",
  Eid: "🌙",
  Graduation: "🎓",
  Photoshoot: "📸",
  Vacation: "✈️",
};

function calculateTimeline(event: EventType, targetDate: string): TimelineItem[] {
  const template = EVENT_TIMELINES[event];
  if (!template || !targetDate) return [];
  const eventDate = new Date(targetDate);
  return template.steps.map((step) => {
    const d = new Date(eventDate);
    d.setDate(d.getDate() - step.daysBefore);
    return { ...step, completed: false, dateISO: d.toISOString().slice(0, 10) };
  });
}

function daysUntil(targetDate: string): number {
  if (!targetDate) return 0;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export default function PlannerPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [selectedEvent, setSelectedEvent] = useState<EventType | null>(null);
  const [targetDate, setTargetDate] = useState("");
  const [timeline, setTimeline] = useState<(TimelineItem & { dateISO: string })[]>([]);
  const [savedPlan, setSavedPlan] = useState<SavedPlan | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login?next=/planner");
      return;
    }
    if (token) {
      loadExistingPlan();
    }
  }, [loading, user, token]);

  const loadExistingPlan = async () => {
    if (!token) return;
    setLoadingPlan(true);
    setError(null);
    try {
      const data = await api<{ goals: SavedPlan[] }>("/api/beauty/goals", { token });
      const goal = data.goals?.[0];
      if (goal) {
        setSavedPlan(goal);
        const ev = EVENTS.find((e) => goal.title.startsWith(e));
        if (ev) setSelectedEvent(ev);
        setTargetDate(goal.targetDate?.slice(0, 10) || "");
        if (goal.timeline?.length) {
          setTimeline(
            goal.timeline.map((t) => ({
              daysBefore: 0,
              label: t.title,
              serviceSlug: "",
              completed: t.completed,
              dateISO: t.date?.slice(0, 10) || "",
            })),
          );
        }
      }
    } catch {
      setError("Could not load your saved plans. Please try again.");
    } finally {
      setLoadingPlan(false);
    }
  };

  const handleEventSelect = (ev: EventType) => {
    setSelectedEvent(ev);
    setSavedPlan(null);
    const template = EVENT_TIMELINES[ev];
    if (targetDate) {
      setTimeline(calculateTimeline(ev, targetDate));
    } else {
      const future = new Date();
      future.setDate(future.getDate() + template.days);
      const dateStr = future.toISOString().slice(0, 10);
      setTargetDate(dateStr);
      setTimeline(calculateTimeline(ev, dateStr));
    }
  };

  const handleDateChange = (date: string) => {
    setTargetDate(date);
    if (selectedEvent && date) {
      setTimeline(calculateTimeline(selectedEvent, date));
    }
  };

  const toggleComplete = (idx: number) => {
    setTimeline((prev) => prev.map((item, i) => (i === idx ? { ...item, completed: !item.completed } : item)));
  };

  const completedCount = timeline.filter((t) => t.completed).length;
  const progress = timeline.length > 0 ? Math.round((completedCount / timeline.length) * 100) : 0;
  const daysAway = daysUntil(targetDate);

  const savePlan = async () => {
    if (!token || !selectedEvent || !targetDate) return;
    setSaving(true);
    setError(null);
    try {
      const desc = JSON.stringify(timeline.map((t) => ({ label: t.label, date: t.dateISO, completed: t.completed, serviceSlug: t.serviceSlug })));
      const data = await api<{ goal: SavedPlan }>(`/api/beauty/goals`, {
        method: "POST",
        token,
        body: JSON.stringify({
          title: `${selectedEvent} — ${new Date(targetDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
          description: desc,
          targetDate,
        }),
      });
      setSavedPlan(data.goal);

      for (const item of timeline) {
        const d = new Date(item.dateISO);
        d.setHours(12, 0, 0, 0);
        await api("/api/beauty/timeline", {
          method: "POST",
          token,
          body: JSON.stringify({
            goalId: data.goal.id,
            title: item.label,
            description: item.serviceSlug,
            date: d.toISOString(),
            type: "GOAL_STEP",
          }),
        });
      }

      setMsg("Your beauty plan has been saved!");
      setTimeout(() => setMsg(""), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save plan");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <Nav />
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "clamp(32px,5vh,56px) clamp(24px,5vw,40px) 90px" }}>
          <Skeleton width={160} height={14} />
          <Skeleton width={280} height={42} style={{ marginTop: 14 }} />
          <Skeleton width="100%" height={120} style={{ marginTop: 30 }} />
          <Skeleton width="100%" height={200} style={{ marginTop: 20 }} />
        </div>
        <Footer />
      </>
    );
  }

  if (!user) return null;

  return (
    <>
      <Nav />
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "clamp(32px,5vh,56px) clamp(24px,5vw,40px) 90px" }}>
        <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: ".16em", textTransform: "uppercase", color: "#B06A85" }}>Beauty Planner</span>
        <h1 style={{ fontFamily: serif, fontWeight: 500, fontSize: "clamp(34px,5vw,54px)", marginTop: 10 }}>
          {savedPlan ? "Your Plan" : "Plan your next big event"}
        </h1>
        <p style={{ fontSize: 15, color: "#5a5457", marginTop: 8 }}>
          {savedPlan ? "Track your preparation timeline" : "Select an event and we'll build your personalised preparation timeline"}
        </p>

        {error && (
          <div style={{ marginTop: 20, padding: "14px 18px", borderRadius: 14, background: "rgba(163,51,51,.1)", color: "#a33", fontSize: 14 }}>
            {error}
            <button onClick={loadExistingPlan} style={{ marginLeft: 14, padding: "4px 12px", borderRadius: 8, border: "1px solid rgba(163,51,51,.3)", background: "transparent", color: "#a33", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              Retry
            </button>
          </div>
        )}

        {msg && (
          <div style={{ marginTop: 20, padding: "14px 18px", borderRadius: 14, background: "rgba(235,200,211,.3)", color: "#B06A85", fontSize: 14, fontWeight: 600 }}>
            {msg}
          </div>
        )}

        {loadingPlan ? (
          <div style={{ marginTop: 30 }}>
            <Skeleton width="100%" height={100} style={{ marginBottom: 16 }} />
            <Skeleton width="100%" height={100} style={{ marginBottom: 16 }} />
            <Skeleton width="100%" height={100} />
          </div>
        ) : savedPlan ? (
          <ExistingPlanView
            plan={savedPlan}
            timeline={timeline}
            toggleComplete={toggleComplete}
            progress={progress}
            completedCount={completedCount}
            daysAway={daysAway}
          />
        ) : (
          <>
            <div style={{ marginTop: 30 }}>
              <h2 style={{ fontFamily: serif, fontSize: 22, fontWeight: 600, marginBottom: 16 }}>What's the occasion?</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14 }}>
                {EVENTS.map((ev) => {
                  const active = selectedEvent === ev;
                  return (
                    <button
                      key={ev}
                      onClick={() => handleEventSelect(ev)}
                      style={{
                        padding: "24px 16px",
                        borderRadius: 20,
                        border: active ? "2px solid #B06A85" : "1px solid rgba(28,28,28,.08)",
                        background: active ? "rgba(235,200,211,.2)" : "#fff",
                        cursor: "pointer",
                        textAlign: "center",
                        transition: "all .2s",
                        boxShadow: active ? "0 8px 24px rgba(176,106,133,.15)" : "0 2px 8px rgba(28,28,28,.04)",
                      }}
                    >
                      <span style={{ fontSize: 32 }}>{EVENT_ICONS[ev]}</span>
                      <div style={{ fontFamily: serif, fontSize: 18, fontWeight: 600, marginTop: 8, color: active ? "#B06A85" : "#1C1C1C" }}>{ev}</div>
                      <div style={{ fontSize: 13, color: "#5a5457", marginTop: 4 }}>{EVENT_TIMELINES[ev].days} day plan</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedEvent && (
              <div style={{ marginTop: 30 }}>
                <h2 style={{ fontFamily: serif, fontSize: 22, fontWeight: 600, marginBottom: 14 }}>When is it?</h2>
                <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="bb-input"
                    style={{ padding: "12px 16px", borderRadius: 14, border: "1px solid rgba(28,28,28,.12)", background: "#fff", fontSize: 15, minWidth: 200 }}
                  />
                  {daysAway > 0 && (
                    <span style={{ fontSize: 15, color: "#B06A85", fontWeight: 600 }}>
                      {daysAway} day{daysAway === 1 ? "" : "s"} away
                    </span>
                  )}
                  {daysAway < 0 && (
                    <span style={{ fontSize: 15, color: "#a33", fontWeight: 600 }}>
                      {Math.abs(daysAway)} day{Math.abs(daysAway) === 1 ? "" : "s"} past
                    </span>
                  )}
                  {daysAway === 0 && (
                    <span style={{ fontSize: 15, color: "#7a5c14", fontWeight: 600 }}>Today!</span>
                  )}
                </div>
              </div>
            )}

            {timeline.length > 0 && (
              <div style={{ marginTop: 30 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h2 style={{ fontFamily: serif, fontSize: 22, fontWeight: 600 }}>Preparation timeline</h2>
                  <span style={{ fontSize: 14, color: "#5a5457" }}>
                    {completedCount}/{timeline.length} done
                  </span>
                </div>

                <div style={{ width: "100%", height: 8, borderRadius: 4, background: "rgba(28,28,28,.08)", marginBottom: 20, overflow: "hidden" }}>
                  <div style={{ width: `${progress}%`, height: "100%", borderRadius: 4, background: "#B06A85", transition: "width .5s ease" }} />
                </div>
                <p style={{ fontSize: 13, color: "#5a5457", marginBottom: 18 }}>
                  Readiness: {progress}%
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {timeline.map((item, idx) => {
                    const d = daysUntil(item.dateISO);
                    return (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                          padding: "16px 20px",
                          borderRadius: 18,
                          background: item.completed ? "rgba(235,200,211,.12)" : "#fff",
                          border: `1px solid ${item.completed ? "rgba(176,106,133,.15)" : "rgba(28,28,28,.06)"}`,
                          opacity: item.completed ? 0.7 : 1,
                        }}
                      >
                        <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={item.completed}
                            onChange={() => toggleComplete(idx)}
                            style={{ width: 20, height: 20, accentColor: "#B06A85", cursor: "pointer" }}
                          />
                        </label>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontFamily: serif, fontSize: 17, fontWeight: 600, textDecoration: item.completed ? "line-through" : "none", color: item.completed ? "#5a5457" : "#1C1C1C" }}>
                            {item.label}
                          </div>
                          <div style={{ fontSize: 13, color: "#5a5457", marginTop: 3 }}>
                            {item.dateISO} {d > 0 && `— ${d} day${d === 1 ? "" : "s"} to go`}
                            {d === 0 && " — Today"}
                            {d < 0 && ` — ${Math.abs(d)} day${Math.abs(d) === 1 ? "" : "s"} past`}
                          </div>
                        </div>
                        <Link
                          href={`/explore?service=${item.serviceSlug}`}
                          style={{
                            padding: "9px 16px",
                            borderRadius: 12,
                            border: "none",
                            background: "#1C1C1C",
                            color: "#FAF8F7",
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: "pointer",
                            textDecoration: "none",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Book Now
                        </Link>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => void savePlan()}
                  disabled={saving}
                  className="bb-btn"
                  style={{
                    marginTop: 24,
                    padding: "14px 32px",
                    borderRadius: 16,
                    border: "none",
                    background: "#B06A85",
                    color: "#FAF8F7",
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: "pointer",
                    opacity: saving ? 0.6 : 1,
                    boxShadow: "0 6px 20px rgba(176,106,133,.25)",
                  }}
                >
                  {saving ? "Saving..." : "Save plan"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
      <Footer />
    </>
  );
}

function ExistingPlanView({
  plan,
  timeline,
  toggleComplete,
  progress,
  completedCount,
  daysAway,
}: {
  plan: SavedPlan;
  timeline: (TimelineItem & { dateISO: string })[];
  toggleComplete: (idx: number) => void;
  progress: number;
  completedCount: number;
  daysAway: number;
}) {
  const [copyTimeline, setCopyTimeline] = useState(timeline);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const { token } = useAuth();

  const localToggle = (idx: number) => {
    setCopyTimeline((prev) => prev.map((item, i) => (i === idx ? { ...item, completed: !item.completed } : item)));
    toggleComplete(idx);
  };

  const localCompletedCount = copyTimeline.filter((t) => t.completed).length;
  const localProgress = copyTimeline.length > 0 ? Math.round((localCompletedCount / copyTimeline.length) * 100) : 0;

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    try {
      await api(`/api/beauty/goals/${plan.id}`, {
        method: "PUT",
        token,
        body: JSON.stringify({
          description: JSON.stringify(copyTimeline.map((t) => ({ label: t.label, date: t.dateISO, completed: t.completed, serviceSlug: t.serviceSlug }))),
        }),
      });
      setMsg("Progress updated!");
      setTimeout(() => setMsg(""), 3000);
    } catch {
      setMsg("Failed to update");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    setCopyTimeline(timeline);
  }, [timeline]);

  return (
    <>
      <div style={{ marginTop: 24 }}>
        <div style={{ padding: "20px 24px", borderRadius: 22, background: "#fff", border: "1px solid rgba(28,28,28,.06)", marginBottom: 20 }}>
          <div style={{ fontFamily: serif, fontSize: 24, fontWeight: 600 }}>{plan.title}</div>
          <div style={{ fontSize: 14, color: "#5a5457", marginTop: 6 }}>
            {daysAway > 0 ? `${daysAway} day${daysAway === 1 ? "" : "s"} away` : daysAway === 0 ? "Today!" : `${Math.abs(daysAway)} day${Math.abs(daysAway) === 1 ? "" : "s"} past`} · Target: {new Date(plan.targetDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontFamily: serif, fontSize: 22, fontWeight: 600 }}>Timeline</h2>
          <span style={{ fontSize: 14, color: "#5a5457" }}>{localCompletedCount}/{copyTimeline.length} done</span>
        </div>

        <div style={{ width: "100%", height: 8, borderRadius: 4, background: "rgba(28,28,28,.08)", marginBottom: 20, overflow: "hidden" }}>
          <div style={{ width: `${localProgress}%`, height: "100%", borderRadius: 4, background: "#B06A85", transition: "width .5s ease" }} />
        </div>
        <p style={{ fontSize: 13, color: "#5a5457", marginBottom: 18 }}>Readiness: {localProgress}%</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {copyTimeline.map((item, idx) => {
            const d = daysUntil(item.dateISO);
            return (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "16px 20px",
                  borderRadius: 18,
                  background: item.completed ? "rgba(235,200,211,.12)" : "#fff",
                  border: `1px solid ${item.completed ? "rgba(176,106,133,.15)" : "rgba(28,28,28,.06)"}`,
                  opacity: item.completed ? 0.7 : 1,
                }}
              >
                <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => localToggle(idx)}
                    style={{ width: 20, height: 20, accentColor: "#B06A85", cursor: "pointer" }}
                  />
                </label>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: serif, fontSize: 17, fontWeight: 600, textDecoration: item.completed ? "line-through" : "none", color: item.completed ? "#5a5457" : "#1C1C1C" }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: 13, color: "#5a5457", marginTop: 3 }}>
                    {item.dateISO} {d > 0 && `— ${d} day${d === 1 ? "" : "s"} to go`}
                    {d === 0 && " — Today"}
                    {d < 0 && ` — ${Math.abs(d)} day${Math.abs(d) === 1 ? "" : "s"} past`}
                  </div>
                </div>
                <Link
                  href={`/explore?service=${item.serviceSlug}`}
                  style={{
                    padding: "9px 16px",
                    borderRadius: 12,
                    border: "none",
                    background: "#1C1C1C",
                    color: "#FAF8F7",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  Book Now
                </Link>
              </div>
            );
          })}
        </div>

        {msg && <p style={{ marginTop: 14, fontSize: 14, color: "#B06A85", fontWeight: 600 }}>{msg}</p>}

        <button
          onClick={() => void handleSave()}
          disabled={saving}
          className="bb-btn"
          style={{
            marginTop: 20,
            padding: "12px 28px",
            borderRadius: 14,
            border: "none",
            background: "#B06A85",
            color: "#FAF8F7",
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
            opacity: saving ? 0.6 : 1,
            boxShadow: "0 6px 20px rgba(176,106,133,.25)",
          }}
        >
          {saving ? "Saving..." : "Update progress"}
        </button>
      </div>
    </>
  );
}

function Skeleton({ width, height, style }: { width: number | string; height: number; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 12,
        background: "linear-gradient(90deg,rgba(28,28,28,.06) 25%,rgba(28,28,28,.02) 50%,rgba(28,28,28,.06) 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s infinite",
        ...style,
      }}
    />
  );
}


