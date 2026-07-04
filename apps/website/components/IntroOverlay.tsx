"use client";

import { CSSProperties, useEffect, useState } from "react";

type Phase = "intro" | "line" | "open" | "done";

const ease = "cubic-bezier(.65,0,.35,1)";

function particles(seed: number, side: "L" | "R"): CSSProperties[] {
  const arr: CSSProperties[] = [];
  for (let i = 0; i < 6; i++) {
    const left = (side === "L" ? 8 : 4) + ((i * 37 + seed * 13) % 82);
    const size = 4 + ((i * 7 + seed) % 6);
    const dur = 9 + ((i * 3 + seed) % 8);
    const delay = (i * 1.7 + seed) % 6;
    const bottom = (i * 19 + seed * 7) % 60;
    arr.push({
      position: "absolute",
      left: `${left}%`,
      bottom: `${bottom}%`,
      width: size,
      height: size,
      borderRadius: "50%",
      background: "radial-gradient(circle,rgba(176,106,133,.5),rgba(235,200,211,.15))",
      animation: `bbFloat ${dur}s ease-in-out ${delay}s infinite`,
      pointerEvents: "none",
    });
  }
  return arr;
}

const brand = (
  <div style={{ textAlign: "center", animation: `bbFadeIn 1s ${ease} both` }}>
    <h1
      style={{
        fontFamily: "'Cormorant Garamond',serif",
        fontWeight: 500,
        fontSize: "clamp(64px,11vw,150px)",
        letterSpacing: ".14em",
        color: "#1C1C1C",
        whiteSpace: "nowrap",
      }}
    >
      BeautyBook
    </h1>
    <div
      style={{
        fontSize: "clamp(15px,1.6vw,20px)",
        fontWeight: 500,
        letterSpacing: ".32em",
        textTransform: "uppercase",
        color: "#B06A85",
        marginTop: 22,
        whiteSpace: "nowrap",
      }}
    >
      Find. Book. Glow.
    </div>
  </div>
);

/** The "book opening" intro from the original design. Children = homepage content. */
export default function IntroOverlay({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<Phase>("intro");

  useEffect(() => {
    // Play the full intro once per browser session.
    if (sessionStorage.getItem("bb_intro_seen")) {
      setPhase("done");
      return;
    }
    document.body.style.overflow = "hidden";
    const timers = [
      setTimeout(() => setPhase("line"), 1150),
      setTimeout(() => setPhase("open"), 1900),
      setTimeout(() => {
        setPhase("done");
        document.body.style.overflow = "";
        sessionStorage.setItem("bb_intro_seen", "1");
      }, 3700),
    ];
    return () => {
      timers.forEach(clearTimeout);
      document.body.style.overflow = "";
    };
  }, []);

  const opening = phase === "open" || phase === "done";
  const done = phase === "done";

  const panelBase: CSSProperties = {
    position: "fixed",
    top: 0,
    height: "100vh",
    width: "50vw",
    overflow: "hidden",
    background: "#FAF8F7",
    backgroundImage:
      "radial-gradient(40vw 40vh at 20% 15%, rgba(235,200,211,.3), transparent 60%),radial-gradient(40vw 40vh at 80% 85%, rgba(176,106,133,.12), transparent 60%)",
    transition: `transform 1.7s ${ease}`,
  };
  const innerBase: CSSProperties = {
    position: "absolute",
    top: 0,
    width: "100vw",
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  };

  return (
    <div style={{ position: "relative", overflowX: "hidden" }}>
      <div
        style={{
          position: "relative",
          zIndex: 1,
          transform: opening ? "translateY(0)" : "translateY(56px)",
          opacity: opening ? 1 : 0,
          transition: `transform 1.7s ${ease}, opacity 1.4s ease`,
        }}
      >
        {children}
      </div>

      {!done && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, pointerEvents: "none" }}>
          <div
            style={{
              ...panelBase,
              left: 0,
              transform: opening ? "translateX(-100%)" : "translateX(0)",
              boxShadow: opening ? "18px 0 60px -20px rgba(28,28,28,.25)" : "none",
            }}
          >
            <div style={{ ...innerBase, left: 0 }}>{brand}</div>
            {particles(1, "L").map((s, i) => (
              <div key={i} style={s} />
            ))}
          </div>
          <div
            style={{
              ...panelBase,
              right: 0,
              transform: opening ? "translateX(100%)" : "translateX(0)",
              boxShadow: opening ? "-18px 0 60px -20px rgba(28,28,28,.25)" : "none",
            }}
          >
            <div style={{ ...innerBase, left: "-50vw" }}>{brand}</div>
            {particles(2, "R").map((s, i) => (
              <div key={i} style={s} />
            ))}
          </div>
          <div
            style={{
              position: "fixed",
              top: "12vh",
              left: "50%",
              transform: `translateX(-50%) scaleY(${phase === "line" || opening ? 1 : 0})`,
              transformOrigin: "top center",
              width: 1,
              height: "76vh",
              background: "linear-gradient(to bottom, transparent, rgba(176,106,133,.55), transparent)",
              opacity: phase === "line" ? 1 : 0,
              transition: `transform .8s ${ease}, opacity 1s ease`,
            }}
          />
        </div>
      )}
    </div>
  );
}
