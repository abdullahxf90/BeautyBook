import Link from "next/link";
import IntroOverlay from "@/components/IntroOverlay";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";
import SalonCard from "@/components/SalonCard";
import SearchBar from "@/components/SearchBar";
import { apiTry, SalonSummary } from "@/lib/api";

const serif = "'Cormorant Garamond',serif";

// Fallback content identical to the original design, used until the API/DB is online.
const fallbackCategories = [
  { name: "Hair", slug: "hair", mark: "H", tint: "rgba(235,200,211,.4)" },
  { name: "Bridal", slug: "bridal", mark: "B", tint: "rgba(212,175,55,.18)" },
  { name: "Facial", slug: "facial", mark: "F", tint: "rgba(235,200,211,.4)" },
  { name: "Nails", slug: "nails", mark: "N", tint: "rgba(176,106,133,.14)" },
  { name: "Spa", slug: "spa", mark: "S", tint: "rgba(235,200,211,.4)" },
  { name: "Massage", slug: "massage", mark: "M", tint: "rgba(176,106,133,.14)" },
  { name: "Skin Care", slug: "skin-care", mark: "Sk", tint: "rgba(235,200,211,.4)" },
  { name: "Makeup", slug: "makeup", mark: "Mk", tint: "rgba(212,175,55,.18)" },
];

const fallbackSalon = (s: Partial<SalonSummary> & { name: string; areaName: string; cityName: string }): SalonSummary => ({
  id: s.name,
  slug: s.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
  name: s.name,
  description: "",
  rating: s.rating ?? 4.8,
  reviewCount: s.reviewCount ?? 200,
  priceFrom: s.priceFrom ?? 2800,
  premium: s.premium ?? false,
  featured: true,
  trending: s.trending ?? false,
  verified: true,
  homeService: false,
  tag: s.tag ?? null,
  area: { name: s.areaName, city: { name: s.cityName } },
  images: [{ url: "", alt: "salon interior photo" }],
});

const fallbackFeatured: SalonSummary[] = [
  fallbackSalon({ name: "Maison Lumière", areaName: "Clifton", cityName: "Karachi", rating: 4.9, reviewCount: 312, priceFrom: 3500, premium: true }),
  fallbackSalon({ name: "The Glow Studio", areaName: "Gulberg", cityName: "Lahore", rating: 4.8, reviewCount: 248, priceFrom: 2800 }),
  fallbackSalon({ name: "Rosewood Atelier", areaName: "F-7", cityName: "Islamabad", rating: 5.0, reviewCount: 196, priceFrom: 4200, premium: true }),
];

const fallbackTrending: SalonSummary[] = [
  fallbackSalon({ name: "Velvet & Co.", areaName: "DHA", cityName: "Karachi", rating: 4.9, tag: "Hair", trending: true }),
  fallbackSalon({ name: "Aurora Beauty", areaName: "Cantt", cityName: "Lahore", rating: 4.7, tag: "Facial", trending: true }),
  fallbackSalon({ name: "Bloom Lounge", areaName: "Blue Area", cityName: "Islamabad", rating: 4.8, tag: "Nails", trending: true }),
];

const offers = [
  { badge: "Save 30%", title: "Bridal package season", desc: "Complete bridal glow-up at handpicked ateliers this wedding season.", bg: "rgba(235,200,211,.28)", code: "BRIDAL30" },
  { badge: "Members only", title: "First facial free", desc: "New members enjoy a complimentary signature facial on their first booking.", bg: "rgba(255,255,255,.7)", code: "FIRSTGLOW" },
  { badge: "Gold tier", title: "Spa day for two", desc: "Unwind together with a curated couples spa ritual at premium partners.", bg: "rgba(212,175,55,.12)", code: "SPADUO" },
];

const testimonials = [
  { text: "Booked a facial in under a minute. The salon was exactly as beautiful as the photos.", name: "Ayesha K.", area: "Karachi", mark: "A", tint: "rgba(235,200,211,.5)" },
  { text: "Finally a way to compare real reviews before I trust someone with my hair.", name: "Zara M.", area: "Lahore", mark: "Z", tint: "rgba(212,175,55,.2)" },
  { text: "My whole bridal party booked through BeautyBook. Effortless and so elegant.", name: "Hina R.", area: "Islamabad", mark: "H", tint: "rgba(176,106,133,.18)" },
];

const tips = [
  { cat: "Skincare", title: "The 5-step ritual for a lasting glow", min: "4", ph: "editorial photo" },
  { cat: "Bridal", title: "How to plan your wedding beauty timeline", min: "6", ph: "bridal photo" },
  { cat: "Hair", title: "Choosing the right salon for your hair type", min: "3", ph: "hair photo" },
];

const slotHints = [["Today 4:00", "Today 6:30", "Tomorrow"], ["Today 2:15", "Tomorrow 11:00"], ["Fri 1:00", "Sat 3:30", "Sun"]];

export default async function HomePage() {
  const [featuredRes, trendingRes, metaRes] = await Promise.all([
    apiTry<{ salons: SalonSummary[] }>("/api/salons?featured=true&limit=3"),
    apiTry<{ salons: SalonSummary[] }>("/api/salons?trending=true&limit=3"),
    apiTry<{ cities: { name: string }[]; categories: { name: string; slug: string; mark: string; tint: string }[] }>("/api/meta"),
  ]);

  const featured = featuredRes?.salons?.length ? featuredRes.salons : fallbackFeatured;
  const trending = trendingRes?.salons?.length ? trendingRes.salons : fallbackTrending;
  const categories = metaRes?.categories?.length ? metaRes.categories : fallbackCategories;
  const cities = metaRes?.cities?.length ? metaRes.cities.map((c) => c.name) : ["Karachi", "Lahore", "Islamabad", "Rawalpindi"];

  return (
    <IntroOverlay>
      {/* corner blush gradients */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          background:
            "radial-gradient(60vw 50vh at 0% 0%, rgba(235,200,211,.28), transparent 60%),radial-gradient(55vw 45vh at 100% 8%, rgba(235,200,211,.22), transparent 60%),radial-gradient(50vw 40vh at 100% 100%, rgba(176,106,133,.10), transparent 60%)",
        }}
      />
      <Nav />
      <div style={{ position: "relative", zIndex: 1 }}>
        {/* HERO */}
        <section style={{ maxWidth: 1120, margin: "0 auto", padding: "clamp(56px,9vh,120px) clamp(24px,5vw,40px) 40px", textAlign: "center" }}>
          <Reveal>
            <span
              style={{
                display: "inline-block",
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: ".16em",
                textTransform: "uppercase",
                color: "#B06A85",
                padding: "8px 16px",
                border: "1px solid rgba(176,106,133,.28)",
                borderRadius: 20,
                background: "rgba(255,255,255,.5)",
              }}
            >
              Pakistan&apos;s beauty marketplace
            </span>
          </Reveal>
          <Reveal as="h1" style={{ fontFamily: serif, fontWeight: 500, fontSize: "clamp(44px,7vw,96px)", lineHeight: 1.02, letterSpacing: "-.01em", margin: "26px auto 0", maxWidth: "14ch" }}>
            Find Pakistan&apos;s Best Beauty Professionals
          </Reveal>
          <Reveal as="p" style={{ fontSize: "clamp(16px,1.5vw,19px)", lineHeight: 1.6, color: "#5a5457", maxWidth: "56ch", margin: "26px auto 0", fontWeight: 400 }}>
            Discover salons, compare real reviews, explore every service, and book your appointment in seconds — all in one beautifully simple place.
          </Reveal>

          <Reveal>
            <SearchBar cities={cities} categories={categories} />
          </Reveal>

          {/* CATEGORIES */}
          <Reveal style={{ margin: "44px auto 0" }}>
            <div className="bb-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, maxWidth: 820, margin: "0 auto" }}>
              {categories.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/explore?category=${cat.slug}`}
                  className="bb-card"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 12,
                    padding: "22px 10px",
                    borderRadius: 20,
                    background: "rgba(255,255,255,.55)",
                    border: "1px solid rgba(28,28,28,.05)",
                    cursor: "pointer",
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <div style={{ width: 52, height: 52, borderRadius: 16, background: cat.tint, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: serif, fontSize: 24, color: "#B06A85" }}>
                    {cat.mark}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#1C1C1C" }}>{cat.name}</span>
                </Link>
              ))}
            </div>
          </Reveal>
        </section>

        {/* FEATURED SALONS */}
        <section style={{ maxWidth: 1200, margin: "0 auto", padding: "clamp(48px,8vh,90px) clamp(24px,5vw,40px)" }}>
          <Reveal style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, marginBottom: 34 }}>
            <div>
              <h2 style={{ fontFamily: serif, fontWeight: 500, fontSize: "clamp(32px,4.5vw,52px)", lineHeight: 1.05 }}>Featured salons</h2>
              <p style={{ fontSize: 16, color: "#5a5457", marginTop: 8 }}>Hand-picked studios our community loves most.</p>
            </div>
            <Link href="/explore" style={{ fontSize: 14, fontWeight: 600, color: "#B06A85", textDecoration: "none", whiteSpace: "nowrap" }}>
              View all →
            </Link>
          </Reveal>
          <div className="bb-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24 }}>
            {featured.map((s, i) => (
              <SalonCard key={s.slug} salon={s} slots={slotHints[i % slotHints.length]} />
            ))}
          </div>
        </section>

        {/* TRENDING (dark band) */}
        <section style={{ background: "#1C1C1C", color: "#FAF8F7", marginTop: 20 }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "clamp(52px,8vh,96px) clamp(24px,5vw,40px)" }}>
            <Reveal style={{ marginBottom: 34 }}>
              <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: ".16em", textTransform: "uppercase", color: "#EBC8D3" }}>Trending this week</span>
              <h2 style={{ fontFamily: serif, fontWeight: 500, fontSize: "clamp(32px,4.5vw,52px)", marginTop: 10 }}>Where everyone&apos;s booking now</h2>
            </Reveal>
            <div className="bb-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24 }}>
              {trending.map((t) => (
                <Reveal key={t.slug}>
                  <Link
                    href={`/salon/${t.slug}`}
                    className="bb-lift-dark"
                    style={{
                      display: "block",
                      borderRadius: 22,
                      overflow: "hidden",
                      background: "rgba(255,255,255,.05)",
                      border: "1px solid rgba(255,255,255,.09)",
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <div className="bb-ph-dark" style={{ height: 170, position: "relative" }}>
                      <span style={{ position: "absolute", left: 0, bottom: 0, fontFamily: "'Menlo',monospace", fontSize: 11, color: "#EBC8D3", padding: "8px 12px" }}>
                        studio photo
                      </span>
                    </div>
                    <div style={{ padding: "20px 22px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <h3 style={{ fontFamily: serif, fontSize: 23, fontWeight: 600 }}>{t.name}</h3>
                        <span style={{ fontSize: 13, color: "#EBC8D3" }}>★ {t.rating.toFixed(1)}</span>
                      </div>
                      <p style={{ fontSize: 14, color: "rgba(250,248,247,.62)", marginTop: 4 }}>
                        {t.area.name}, {t.area.city.name}
                        {t.tag ? ` · ${t.tag}` : ""}
                      </p>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* OFFERS */}
        <section id="offers" style={{ maxWidth: 1200, margin: "0 auto", padding: "clamp(52px,8vh,96px) clamp(24px,5vw,40px)" }}>
          <Reveal style={{ textAlign: "center", marginBottom: 38 }}>
            <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: ".16em", textTransform: "uppercase", color: "#B06A85" }}>Beauty offers</span>
            <h2 style={{ fontFamily: serif, fontWeight: 500, fontSize: "clamp(32px,4.5vw,52px)", marginTop: 10 }}>Curated deals worth glowing for</h2>
          </Reveal>
          <div className="bb-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24 }}>
            {offers.map((o) => (
              <Reveal key={o.title}>
                <div
                  className="bb-lift"
                  style={{ position: "relative", borderRadius: 22, padding: "30px 28px", background: o.bg, border: "1px solid rgba(28,28,28,.06)", overflow: "hidden" }}
                >
                  <span style={{ display: "inline-block", fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#7a5c14", background: "rgba(212,175,55,.85)", padding: "6px 12px", borderRadius: 14 }}>
                    {o.badge}
                  </span>
                  <h3 style={{ fontFamily: serif, fontSize: 30, fontWeight: 600, marginTop: 20, lineHeight: 1.1 }}>{o.title}</h3>
                  <p style={{ fontSize: 15, color: "#5a5457", marginTop: 10, lineHeight: 1.5 }}>{o.desc}</p>
                  <p style={{ fontSize: 13, color: "#5a5457", marginTop: 14 }}>
                    Use code <strong style={{ color: "#1C1C1C" }}>{o.code}</strong> at checkout
                  </p>
                  <Link
                    href="/explore"
                    style={{ display: "inline-block", marginTop: 14, fontSize: 14, fontWeight: 600, color: "#1C1C1C", textDecoration: "none", borderBottom: "1.5px solid #B06A85", paddingBottom: 2 }}
                  >
                    Claim offer →
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* REVIEWS */}
        <section style={{ background: "rgba(235,200,211,.16)" }}>
          <div style={{ maxWidth: 1120, margin: "0 auto", padding: "clamp(52px,8vh,96px) clamp(24px,5vw,40px)" }}>
            <Reveal style={{ textAlign: "center", marginBottom: 40 }}>
              <h2 style={{ fontFamily: serif, fontWeight: 500, fontSize: "clamp(32px,4.5vw,52px)" }}>Loved by thousands</h2>
              <p style={{ fontSize: 16, color: "#5a5457", marginTop: 8 }}>Real words from people who found their glow.</p>
            </Reveal>
            <div className="bb-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24 }}>
              {testimonials.map((r) => (
                <Reveal
                  key={r.name}
                  style={{ borderRadius: 22, background: "#fff", padding: 28, border: "1px solid rgba(28,28,28,.05)", boxShadow: "0 10px 30px -22px rgba(28,28,28,.4)" }}
                >
                  <div style={{ color: "#D4AF37", fontSize: 15, letterSpacing: 2 }}>★★★★★</div>
                  <p style={{ fontFamily: serif, fontSize: 21, lineHeight: 1.4, fontStyle: "italic", color: "#2a2426", marginTop: 16 }}>
                    &ldquo;{r.text}&rdquo;
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 22 }}>
                    <div style={{ width: 42, height: 42, borderRadius: "50%", background: r.tint, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: serif, fontSize: 18, color: "#B06A85" }}>
                      {r.mark}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{r.name}</div>
                      <div style={{ fontSize: 13, color: "#5a5457" }}>{r.area}</div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* BEAUTY TIPS */}
        <section id="journal" style={{ maxWidth: 1200, margin: "0 auto", padding: "clamp(52px,8vh,96px) clamp(24px,5vw,40px)" }}>
          <Reveal style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, marginBottom: 34 }}>
            <div>
              <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: ".16em", textTransform: "uppercase", color: "#B06A85" }}>The journal</span>
              <h2 style={{ fontFamily: serif, fontWeight: 500, fontSize: "clamp(32px,4.5vw,52px)", marginTop: 10 }}>Beauty tips &amp; rituals</h2>
            </div>
            <Link href="/#journal" style={{ fontSize: 14, fontWeight: 600, color: "#B06A85", textDecoration: "none", whiteSpace: "nowrap" }}>
              Read the journal →
            </Link>
          </Reveal>
          <div className="bb-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24 }}>
            {tips.map((tip) => (
              <Reveal key={tip.title}>
                <Link
                  href="/#journal"
                  className="bb-lift"
                  style={{ textDecoration: "none", color: "inherit", borderRadius: 22, overflow: "hidden", background: "#fff", border: "1px solid rgba(28,28,28,.06)", display: "block" }}
                >
                  <div className="bb-ph" style={{ height: 160, position: "relative" }}>
                    <span style={{ position: "absolute", left: 0, bottom: 0, fontFamily: "'Menlo',monospace", fontSize: 11, color: "#B06A85", padding: "8px 12px" }}>{tip.ph}</span>
                  </div>
                  <div style={{ padding: 22 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "#B06A85" }}>{tip.cat}</span>
                    <h3 style={{ fontFamily: serif, fontSize: 23, fontWeight: 600, marginTop: 8, lineHeight: 1.15 }}>{tip.title}</h3>
                    <p style={{ fontSize: 14, color: "#5a5457", marginTop: 8 }}>{tip.min} min read</p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>

        {/* PARTNER CTA */}
        <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 clamp(24px,5vw,40px) clamp(20px,4vh,50px)" }}>
          <Reveal style={{ position: "relative", borderRadius: 28, overflow: "hidden", background: "#1C1C1C", color: "#FAF8F7", padding: "clamp(40px,6vw,72px)" }}>
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(50vw 40vh at 100% 0%, rgba(235,200,211,.16), transparent 60%)" }} />
            <div style={{ position: "relative", maxWidth: 620 }}>
              <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: ".16em", textTransform: "uppercase", color: "#EBC8D3" }}>Become a partner</span>
              <h2 style={{ fontFamily: serif, fontWeight: 500, fontSize: "clamp(32px,4.5vw,56px)", marginTop: 14, lineHeight: 1.06 }}>Grow your salon with BeautyBook</h2>
              <p style={{ fontSize: 17, lineHeight: 1.6, color: "rgba(250,248,247,.72)", marginTop: 16 }}>
                Reach thousands of clients, manage bookings effortlessly, and build a reputation that shines. Zero setup fees.
              </p>
              <div style={{ display: "flex", gap: 14, marginTop: 28, flexWrap: "wrap" }}>
                <Link
                  href="/partner"
                  className="bb-btn"
                  style={{ border: "none", borderRadius: 20, background: "#FAF8F7", color: "#1C1C1C", fontSize: 15, fontWeight: 600, padding: "14px 28px", cursor: "pointer", textDecoration: "none" }}
                >
                  List your salon
                </Link>
                <Link
                  href="/about#contact"
                  className="bb-btn-ghost"
                  style={{ border: "1px solid rgba(250,248,247,.28)", borderRadius: 20, background: "transparent", color: "#FAF8F7", fontSize: 15, fontWeight: 600, padding: "14px 28px", cursor: "pointer", textDecoration: "none" }}
                >
                  Talk to us
                </Link>
              </div>
            </div>
          </Reveal>
        </section>

        {/* APP DOWNLOAD */}
        <section style={{ maxWidth: 1200, margin: "0 auto", padding: "clamp(40px,7vh,90px) clamp(24px,5vw,40px)" }}>
          <div className="bb-two-col" style={{ display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 48, alignItems: "center" }}>
            <Reveal>
              <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: ".16em", textTransform: "uppercase", color: "#B06A85" }}>The app</span>
              <h2 style={{ fontFamily: serif, fontWeight: 500, fontSize: "clamp(32px,4.5vw,52px)", marginTop: 12, lineHeight: 1.06 }}>Your glow, in your pocket</h2>
              <p style={{ fontSize: 17, lineHeight: 1.6, color: "#5a5457", marginTop: 16, maxWidth: "44ch" }}>
                Book on the go, track your appointments, save your favourite artists, and unlock members-only offers.
              </p>
              <div style={{ display: "flex", gap: 14, marginTop: 28, flexWrap: "wrap" }}>
                <a href="#" className="bb-btn" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10, padding: "13px 22px", borderRadius: 18, background: "#1C1C1C", color: "#FAF8F7" }}>
                  <span style={{ fontFamily: serif, fontSize: 20 }}></span>
                  <span>
                    <span style={{ fontSize: 11, display: "block", opacity: 0.7 }}>Download on the</span>
                    <span style={{ fontSize: 15, fontWeight: 600 }}>App Store</span>
                  </span>
                </a>
                <a href="#" className="bb-btn" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10, padding: "13px 22px", borderRadius: 18, background: "#1C1C1C", color: "#FAF8F7" }}>
                  <span style={{ fontSize: 16 }}>▶</span>
                  <span>
                    <span style={{ fontSize: 11, display: "block", opacity: 0.7 }}>Get it on</span>
                    <span style={{ fontSize: 15, fontWeight: 600 }}>Google Play</span>
                  </span>
                </a>
              </div>
            </Reveal>
            <Reveal style={{ display: "flex", justifyContent: "center" }}>
              <div
                style={{
                  width: 260,
                  height: 400,
                  borderRadius: 36,
                  background: "repeating-linear-gradient(45deg,#F0E4E8,#F0E4E8 14px,#EBDCE0 14px,#EBDCE0 28px)",
                  border: "1px solid rgba(28,28,28,.08)",
                  boxShadow: "0 30px 70px -30px rgba(28,28,28,.45)",
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "center",
                  padding: 16,
                }}
              >
                <span style={{ fontFamily: "'Menlo',monospace", fontSize: 11, color: "#B06A85" }}>app screen mockup</span>
              </div>
            </Reveal>
          </div>
        </section>

        <Footer />
      </div>
    </IntroOverlay>
  );
}
