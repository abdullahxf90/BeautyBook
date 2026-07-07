import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";

const serif = "'Space Grotesk',sans-serif";

const openings = [
  { title: "Senior Full Stack Engineer", dept: "Engineering", location: "Karachi (Hybrid)", type: "Full-time" },
  { title: "Product Designer", dept: "Design", location: "Lahore (Remote)", type: "Full-time" },
  { title: "Growth Marketing Lead", dept: "Marketing", location: "Islamabad (On-site)", type: "Full-time" },
  { title: "Customer Success Manager", dept: "Operations", location: "Karachi (On-site)", type: "Full-time" },
];

export default function CareersPage() {
  return (
    <>
      <Nav />
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "clamp(48px,8vh,100px) clamp(24px,5vw,40px) 90px" }}>
        <Reveal style={{ textAlign: "center", marginBottom: 48 }}>
          <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: ".16em", textTransform: "uppercase", color: "#B06A85" }}>Careers</span>
          <h1 style={{ fontFamily: serif, fontWeight: 500, fontSize: "clamp(40px,6vw,72px)", marginTop: 14, lineHeight: 1.05 }}>Join the team</h1>
          <p style={{ fontSize: 17, lineHeight: 1.6, color: "#5a5457", marginTop: 18, maxWidth: "60ch", marginLeft: "auto", marginRight: "auto" }}>
            We&apos;re building the future of beauty in Pakistan. Come help us shape it.
          </p>
        </Reveal>

        <Reveal style={{ borderRadius: 24, background: "#1C1C1C", color: "#FAF8F7", padding: 32, marginBottom: 48 }}>
          <h2 style={{ fontFamily: serif, fontSize: 26, fontWeight: 600 }}>Why BeautyBook?</h2>
          <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, fontSize: 15, lineHeight: 1.6 }}>
            {["Competitive compensation & equity", "Flexible work arrangements", "Learning & development budget", "Health & wellness benefits", "Annual team retreats", "Make an impact at scale"].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, color: "rgba(250,248,247,.85)" }}>
                <span style={{ color: "#EBC8D3" }}>✦</span> {item}
              </div>
            ))}
          </div>
        </Reveal>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {openings.map((job, i) => (
            <Reveal key={i}>
              <div className="bb-lift" style={{ borderRadius: 20, background: "#fff", border: "1px solid rgba(28,28,28,.06)", padding: 24, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <div>
                  <h3 style={{ fontFamily: serif, fontSize: 22, fontWeight: 600 }}>{job.title}</h3>
                  <p style={{ fontSize: 14, color: "#5a5457", marginTop: 4 }}>{job.dept} · {job.location} · {job.type}</p>
                </div>
                <a href="mailto:careers@beautybook.pk" className="bb-btn" style={{ padding: "11px 22px", borderRadius: 16, border: "none", background: "#1C1C1C", color: "#FAF8F7", fontSize: 14, fontWeight: 600, cursor: "pointer", textDecoration: "none" }}>Apply →</a>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal style={{ marginTop: 40, padding: 28, borderRadius: 20, background: "rgba(235,200,211,.15)", textAlign: "center" }}>
          <p style={{ fontSize: 15, color: "#4a4446" }}>Don&apos;t see the right role? Write to us at <strong>careers@beautybook.pk</strong>.</p>
        </Reveal>
      </div>
      <Footer />
    </>
  );
}
