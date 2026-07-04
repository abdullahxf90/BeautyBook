import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";

const serif = "'Cormorant Garamond',serif";

export default function AboutPage() {
  return (
    <>
      <Nav />
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "clamp(48px,8vh,100px) clamp(24px,5vw,40px) 90px" }}>
        <Reveal style={{ textAlign: "center" }}>
          <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: ".16em", textTransform: "uppercase", color: "#B06A85" }}>About us</span>
          <h1 style={{ fontFamily: serif, fontWeight: 500, fontSize: "clamp(40px,6vw,72px)", marginTop: 14, lineHeight: 1.05 }}>Find. Book. Glow.</h1>
          <p style={{ fontSize: 17, lineHeight: 1.7, color: "#5a5457", marginTop: 20, maxWidth: "60ch", marginLeft: "auto", marginRight: "auto" }}>
            BeautyBook is Pakistan&apos;s beauty services ecosystem. We help customers discover, compare, review and instantly
            book beauty professionals across Karachi, Lahore, Islamabad and beyond — while giving salons the tools of a
            world-class business.
          </p>
        </Reveal>

        <Reveal style={{ marginTop: 60 }}>
          <div id="careers" style={{ borderRadius: 22, background: "#fff", border: "1px solid rgba(28,28,28,.06)", padding: 30 }}>
            <h2 style={{ fontFamily: serif, fontSize: 30, fontWeight: 600 }}>Careers</h2>
            <p style={{ fontSize: 15, color: "#5a5457", marginTop: 10, lineHeight: 1.6 }}>
              We&apos;re building the future of beauty in Pakistan and always looking for exceptional engineers, designers and
              operators. Write to us at <strong>careers@beautybook.pk</strong>.
            </p>
          </div>
        </Reveal>

        <Reveal style={{ marginTop: 20 }}>
          <div id="press" style={{ borderRadius: 22, background: "#fff", border: "1px solid rgba(28,28,28,.06)", padding: 30 }}>
            <h2 style={{ fontFamily: serif, fontSize: 30, fontWeight: 600 }}>Press</h2>
            <p style={{ fontSize: 15, color: "#5a5457", marginTop: 10, lineHeight: 1.6 }}>
              For media inquiries and brand assets, contact <strong>press@beautybook.pk</strong>.
            </p>
          </div>
        </Reveal>

        <Reveal style={{ marginTop: 20 }}>
          <div id="contact" style={{ borderRadius: 22, background: "#1C1C1C", color: "#FAF8F7", padding: 30 }}>
            <h2 style={{ fontFamily: serif, fontSize: 30, fontWeight: 600 }}>Contact</h2>
            <p style={{ fontSize: 15, color: "rgba(250,248,247,.75)", marginTop: 10, lineHeight: 1.6 }}>
              Support: <strong>hello@beautybook.pk</strong> · Partners: <strong>partners@beautybook.pk</strong>
              <br />
              Karachi · Lahore · Islamabad
            </p>
          </div>
        </Reveal>
      </div>
      <Footer />
    </>
  );
}
