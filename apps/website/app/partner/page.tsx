import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";

const serif = "'Cormorant Garamond',serif";

const perks = [
  { title: "Reach thousands", desc: "Get discovered by customers actively searching for your services across Pakistan." },
  { title: "Effortless bookings", desc: "A live calendar, automatic confirmations and reminders — no more phone tag." },
  { title: "Verified reputation", desc: "Only real, completed appointments can leave reviews. Your rating means something." },
  { title: "Zero setup fees", desc: "List your salon for free. You only grow from here." },
];

export default function PartnerPage() {
  return (
    <>
      <Nav />
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "clamp(48px,8vh,100px) clamp(24px,5vw,40px) 90px" }}>
        <Reveal style={{ textAlign: "center" }}>
          <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: ".16em", textTransform: "uppercase", color: "#B06A85" }}>Become a partner</span>
          <h1 style={{ fontFamily: serif, fontWeight: 500, fontSize: "clamp(40px,6vw,72px)", marginTop: 14, lineHeight: 1.05 }}>Grow your salon with BeautyBook</h1>
          <p style={{ fontSize: 17, lineHeight: 1.6, color: "#5a5457", marginTop: 18, maxWidth: "58ch", marginLeft: "auto", marginRight: "auto" }}>
            Join Pakistan&apos;s premium beauty marketplace. Manage bookings, showcase your work, and build a reputation that shines.
          </p>
          <Link
            href="/signup"
            className="bb-btn"
            style={{ display: "inline-block", marginTop: 30, borderRadius: 20, background: "#1C1C1C", color: "#FAF8F7", fontSize: 15, fontWeight: 600, padding: "15px 32px", textDecoration: "none", boxShadow: "0 8px 20px rgba(28,28,28,.2)" }}
          >
            Create a partner account
          </Link>
        </Reveal>

        <div id="resources" className="bb-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 20, marginTop: 70 }}>
          {perks.map((p) => (
            <Reveal key={p.title}>
              <div className="bb-lift" style={{ borderRadius: 22, background: "#fff", border: "1px solid rgba(28,28,28,.06)", padding: 30, height: "100%" }}>
                <h3 style={{ fontFamily: serif, fontSize: 26, fontWeight: 600 }}>{p.title}</h3>
                <p style={{ fontSize: 15, color: "#5a5457", marginTop: 10, lineHeight: 1.55 }}>{p.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
      <Footer />
    </>
  );
}
