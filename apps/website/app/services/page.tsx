import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";
import { apiTry } from "@/lib/api";

const serif = "'Space Grotesk',sans-serif";

interface CategoryInfo { name: string; slug: string; mark: string; tint: string; _count?: { services: number } }

export default async function ServicesPage() {
  const res = await apiTry<{ categories: CategoryInfo[] }>("/api/meta", 60);
  const categories = res?.categories || [
    { name: "Hair", slug: "hair", mark: "H", tint: "rgba(235,200,211,.4)" },
    { name: "Bridal", slug: "bridal", mark: "B", tint: "rgba(212,175,55,.18)" },
    { name: "Facial", slug: "facial", mark: "F", tint: "rgba(235,200,211,.4)" },
    { name: "Nails", slug: "nails", mark: "N", tint: "rgba(176,106,133,.14)" },
    { name: "Spa", slug: "spa", mark: "S", tint: "rgba(235,200,211,.4)" },
    { name: "Massage", slug: "massage", mark: "M", tint: "rgba(176,106,133,.14)" },
    { name: "Skin Care", slug: "skin-care", mark: "Sk", tint: "rgba(235,200,211,.4)" },
    { name: "Makeup", slug: "makeup", mark: "Mk", tint: "rgba(212,175,55,.18)" },
  ];

  const serviceDescs: Record<string, string> = {
    "Hair": "From precision cuts to vibrant colour transformations, our partner salons offer every hair service imaginable.",
    "Bridal": "Complete bridal packages including makeup, hairstyling, draping, and trial sessions for your big day.",
    "Facial": "Deep cleansing, hydrating, and anti-aging facials tailored to your skin type by certified aestheticians.",
    "Nails": "Gel manicures, acrylic extensions, nail art, and spa pedicures at premium nail studios.",
    "Spa": "Full-body relaxation with massages, hammam rituals, steam baths, and holistic wellness treatments.",
    "Massage": "Swedish, deep tissue, aromatherapy, and hot stone massages for ultimate relaxation.",
    "Skin Care": "Advanced skincare treatments including chemical peels, microdermabrasion, and laser therapies.",
    "Makeup": "Professional makeup for parties, events, photoshoots, and everyday glam by top artists.",
  };

  return (
    <>
      <Nav />
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "clamp(48px,8vh,100px) clamp(24px,5vw,40px) 90px" }}>
        <Reveal style={{ textAlign: "center", marginBottom: 56 }}>
          <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: ".16em", textTransform: "uppercase", color: "#B06A85" }}>Services</span>
          <h1 style={{ fontFamily: serif, fontWeight: 500, fontSize: "clamp(40px,6vw,72px)", marginTop: 14, lineHeight: 1.05 }}>All beauty services</h1>
          <p style={{ fontSize: 17, lineHeight: 1.6, color: "#5a5457", marginTop: 18, maxWidth: "58ch", marginLeft: "auto", marginRight: "auto" }}>
            Explore every service category and find the best salons for your needs.
          </p>
        </Reveal>

        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {categories.map((cat, idx) => (
            <Reveal key={cat.slug}>
              <Link href={`/explore?category=${cat.slug}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                <div className="bb-lift" style={{ display: "flex", alignItems: "center", gap: 28, padding: "clamp(20px,3vw,32px)", borderRadius: 24, background: idx % 2 === 0 ? "#fff" : "rgba(235,200,211,.1)", border: "1px solid rgba(28,28,28,.06)" }}>
                  <div style={{ width: 80, height: 80, borderRadius: 24, background: cat.tint, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: serif, fontSize: 36, color: "#B06A85", flexShrink: 0 }}>{cat.mark}</div>
                  <div style={{ flex: 1 }}>
                    <h2 style={{ fontFamily: serif, fontSize: 30, fontWeight: 600 }}>{cat.name}</h2>
                    <p style={{ fontSize: 15, color: "#5a5457", marginTop: 8, lineHeight: 1.6 }}>{serviceDescs[cat.name]}</p>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#B06A85", whiteSpace: "nowrap" }}>Explore {cat.name} →</span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
      <Footer />
    </>
  );
}
