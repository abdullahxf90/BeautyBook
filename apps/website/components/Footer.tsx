import Link from "next/link";

const footerCols: Array<{ title: string; links: Array<[string, string]> }> = [
  {
    title: "Discover",
    links: [
      ["Explore salons", "/explore"],
      ["Services", "/explore#services"],
      ["Offers", "/#offers"],
      ["The journal", "/#journal"],
    ],
  },
  {
    title: "Company",
    links: [
      ["About", "/about"],
      ["Careers", "/about#careers"],
      ["Press", "/about#press"],
      ["Contact", "/about#contact"],
    ],
  },
  {
    title: "Partners",
    links: [
      ["Become a partner", "/partner"],
      ["Partner login", "/login"],
      ["Resources", "/partner#resources"],
      ["Support", "/about#contact"],
    ],
  },
];

export default function Footer() {
  return (
    <footer style={{ background: "#151313", color: "rgba(250,248,247,.7)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "clamp(48px,7vh,80px) clamp(24px,5vw,40px) 40px" }}>
        <div className="bb-footer-grid" style={{ display: "grid", gridTemplateColumns: "1.4fr repeat(3,1fr)", gap: 40 }}>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 26, fontWeight: 600, letterSpacing: ".12em", color: "#FAF8F7" }}>
              BeautyBook
            </div>
            <p style={{ fontSize: 15, lineHeight: 1.6, marginTop: 14, maxWidth: "34ch" }}>
              Pakistan&apos;s premium marketplace to find, book, and glow — trusted by thousands.
            </p>
          </div>
          {footerCols.map((col) => (
            <div key={col.title}>
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#FAF8F7", marginBottom: 16 }}>
                {col.title}
              </div>
              {col.links.map(([label, href]) => (
                <Link
                  key={label}
                  href={href}
                  className="bb-footlink"
                  style={{ display: "block", fontSize: 14, color: "rgba(250,248,247,.68)", textDecoration: "none", padding: "6px 0" }}
                >
                  {label}
                </Link>
              ))}
            </div>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 20,
            marginTop: 48,
            paddingTop: 24,
            borderTop: "1px solid rgba(250,248,247,.1)",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 13 }}>© 2026 BeautyBook. Find. Book. Glow.</span>
          <span style={{ fontSize: 13 }}>Karachi · Lahore · Islamabad</span>
        </div>
      </div>
    </footer>
  );
}
