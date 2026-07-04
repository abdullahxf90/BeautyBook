"use client";

import { CSSProperties, useEffect, useRef } from "react";

/** Reproduces the original data-reveal scroll animation. */
export default function Reveal({
  children,
  style,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  style?: CSSProperties;
  as?: "div" | "section" | "h1" | "p";
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("bb-revealed");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Tag ref={ref as any} className="bb-reveal" style={style}>
      {children}
    </Tag>
  );
}
