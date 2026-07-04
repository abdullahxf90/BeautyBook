import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

export default function NotFound() {
  return (
    <>
      <Nav />
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "120px 24px 140px", textAlign: "center" }}>
        <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 500, fontSize: "clamp(48px,8vw,90px)" }}>404</h1>
        <p style={{ fontSize: 17, color: "#5a5457", marginTop: 14 }}>This page has vanished like yesterday&apos;s blowdry.</p>
        <Link
          href="/"
          className="bb-btn"
          style={{ display: "inline-block", marginTop: 28, borderRadius: 20, background: "#1C1C1C", color: "#FAF8F7", fontSize: 15, fontWeight: 600, padding: "14px 28px", textDecoration: "none" }}
        >
          Back home
        </Link>
      </div>
      <Footer />
    </>
  );
}
