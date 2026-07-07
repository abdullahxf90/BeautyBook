import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";

const serif = "'Space Grotesk',sans-serif";

const tips = [
  { cat: "Skincare", title: "The 5-step ritual for a lasting glow", desc: "Cleanse, tone, treat, moisturize, protect — the simple routine dermatologists swear by.", min: "4" },
  { cat: "Bridal", title: "How to plan your wedding beauty timeline", desc: "Month-by-month guide to ensure you shine on your big day.", min: "6" },
  { cat: "Hair", title: "Choosing the right salon for your hair type", desc: "Straight, curly, fine or thick — find the salon that gets your hair.", min: "3" },
  { cat: "Skin Care", title: "Summer skincare essentials for Pakistan", desc: "SPF, lightweight moisturizers, and weekly treatments to beat the heat.", min: "5" },
  { cat: "Nails", title: "Nail art trends for every occasion", desc: "From minimalist to statement — find the perfect nail look.", min: "3" },
  { cat: "Makeup", title: "Everyday makeup routine in 10 minutes", desc: "Quick and effortless steps for a fresh-faced look.", min: "4" },
];

export default function TipsPage() {
  return (
    <>
      <Nav />
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "clamp(48px,8vh,100px) clamp(24px,5vw,40px) 90px" }}>
        <Reveal style={{ textAlign: "center", marginBottom: 48 }}>
          <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: ".16em", textTransform: "uppercase", color: "#B06A85" }}>Beauty Tips</span>
          <h1 style={{ fontFamily: serif, fontWeight: 500, fontSize: "clamp(40px,6vw,72px)", marginTop: 14, lineHeight: 1.05 }}>Glow smarter</h1>
          <p style={{ fontSize: 17, lineHeight: 1.6, color: "#5a5457", marginTop: 18 }}>Quick beauty tips, tricks, and expert advice.</p>
        </Reveal>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 24 }}>
          {tips.map((tip, i) => (
            <Reveal key={i}>
              <Link href={`/blog#`} className="bb-lift" style={{ textDecoration: "none", color: "inherit", borderRadius: 22, overflow: "hidden", background: "#fff", border: "1px solid rgba(28,28,28,.06)", display: "block" }}>
                <div className="bb-ph" style={{ height: 150, position: "relative" }} />
                <div style={{ padding: 24 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "#B06A85" }}>{tip.cat}</span>
                  <h3 style={{ fontFamily: serif, fontSize: 22, fontWeight: 600, marginTop: 8, lineHeight: 1.15 }}>{tip.title}</h3>
                  <p style={{ fontSize: 14, color: "#5a5457", marginTop: 8, lineHeight: 1.5 }}>{tip.desc}</p>
                  <p style={{ fontSize: 13, color: "#5a5457", marginTop: 12 }}>{tip.min} min read</p>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>

        <Reveal style={{ marginTop: 60, padding: 32, borderRadius: 22, background: "#1C1C1C", color: "#FAF8F7", textAlign: "center" }}>
          <h2 style={{ fontFamily: serif, fontSize: 30, fontWeight: 600 }}>Want more?</h2>
          <p style={{ fontSize: 15, color: "rgba(250,248,247,.72)", marginTop: 10 }}>Read our full journal for in-depth beauty guides.</p>
          <Link href="/blog" className="bb-btn" style={{ display: "inline-block", marginTop: 18, borderRadius: 20, background: "#FAF8F7", color: "#1C1C1C", fontSize: 15, fontWeight: 600, padding: "14px 28px", textDecoration: "none" }}>Read the journal</Link>
        </Reveal>
      </div>
      <Footer />
    </>
  );
}
