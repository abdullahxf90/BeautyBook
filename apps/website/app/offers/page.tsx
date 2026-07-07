import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";

const serif = "'Space Grotesk',sans-serif";

const offers = [
  { badge: "Save 30%", title: "Bridal package season", desc: "Complete bridal glow-up at handpicked ateliers this wedding season.", bg: "rgba(235,200,211,.28)", code: "BRIDAL30", expiry: "Dec 31, 2026", terms: "Valid on bridal packages above Rs 20,000. Cannot be combined with other offers." },
  { badge: "Members only", title: "First facial free", desc: "New members enjoy a complimentary signature facial on their first booking.", bg: "rgba(255,255,255,.7)", code: "FIRSTGLOW", expiry: "Ongoing", terms: "Valid for first-time customers only. One per person." },
  { badge: "Gold tier", title: "Spa day for two", desc: "Unwind together with a curated couples spa ritual at premium partners.", bg: "rgba(212,175,55,.12)", code: "SPADUO", expiry: "Dec 31, 2026", terms: "Valid at participating premium salons. Min spend Rs 8,000." },
  { badge: "New", title: "20% off first haircut", desc: "Get 20% off your first visit to any new partner salon. Fresh look, fresh start.", bg: "rgba(235,200,211,.28)", code: "NEWLOOK20", expiry: "Mar 31, 2027", terms: "Valid for new customers at partner salons." },
  { badge: "Flash sale", title: "Mani-Pedi combo", desc: "Book a gel manicure and pedicure together and save Rs 1,000.", bg: "rgba(176,106,133,.14)", code: "NAILCARE", expiry: "Aug 15, 2026", terms: "Valid on combo bookings only." },
  { badge: "Loyalty", title: "Double points weekend", desc: "Earn double loyalty points on all bookings made Friday through Sunday.", bg: "rgba(255,255,255,.7)", code: "DOUBLE", expiry: "Every weekend", terms: "Points credited after appointment completion." },
];

export default function OffersPage() {
  return (
    <>
      <Nav />
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "clamp(48px,8vh,100px) clamp(24px,5vw,40px) 90px" }}>
        <Reveal style={{ textAlign: "center", marginBottom: 48 }}>
          <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: ".16em", textTransform: "uppercase", color: "#B06A85" }}>Offers</span>
          <h1 style={{ fontFamily: serif, fontWeight: 500, fontSize: "clamp(40px,6vw,72px)", marginTop: 14, lineHeight: 1.05 }}>Curated deals worth glowing for</h1>
          <p style={{ fontSize: 17, lineHeight: 1.6, color: "#5a5457", marginTop: 18 }}>Exclusive offers from BeautyBook and our partner salons.</p>
        </Reveal>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 24 }}>
          {offers.map((o) => (
            <Reveal key={o.code}>
              <div className="bb-lift" style={{ borderRadius: 22, padding: "32px 28px", background: o.bg, border: "1px solid rgba(28,28,28,.06)", height: "100%", display: "flex", flexDirection: "column" }}>
                <span style={{ display: "inline-block", fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#7a5c14", background: "rgba(212,175,55,.85)", padding: "6px 12px", borderRadius: 14, alignSelf: "flex-start" }}>{o.badge}</span>
                <h3 style={{ fontFamily: serif, fontSize: 28, fontWeight: 600, marginTop: 20, lineHeight: 1.1 }}>{o.title}</h3>
                <p style={{ fontSize: 15, color: "#5a5457", marginTop: 10, lineHeight: 1.5, flex: 1 }}>{o.desc}</p>
                <p style={{ fontSize: 13, color: "#5a5457", marginTop: 14 }}>Use code <strong style={{ color: "#1C1C1C" }}>{o.code}</strong> at checkout</p>
                <p style={{ fontSize: 12, color: "#5a5457", marginTop: 6 }}>Expires: {o.expiry}</p>
                <details style={{ marginTop: 12, fontSize: 12, color: "#5a5457", cursor: "pointer" }}>
                  <summary style={{ fontWeight: 600 }}>Terms &amp; conditions</summary>
                  <p style={{ marginTop: 8, lineHeight: 1.5 }}>{o.terms}</p>
                </details>
                <Link href="/explore" style={{ display: "inline-block", marginTop: 16, fontSize: 14, fontWeight: 600, color: "#1C1C1C", textDecoration: "none", borderBottom: "1.5px solid #B06A85", paddingBottom: 2, alignSelf: "flex-start" }}>Claim offer →</Link>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
      <Footer />
    </>
  );
}
