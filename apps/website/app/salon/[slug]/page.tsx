import Link from "next/link";
import { notFound } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";
import FavoriteButton from "@/components/FavoriteButton";
import ShopLogo from "@/components/ShopLogo";
import { apiTry, apiTryStatus, ReviewInfo, rupees, SalonDetail } from "@/lib/api";

const serif = "'Space Grotesk',sans-serif";
const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const fmtMin = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export default async function SalonPage({ params }: { params: { slug: string } }) {
  const [detail, reviewsRes] = await Promise.all([
    apiTryStatus<{ salon: SalonDetail }>(`/api/salons/${params.slug}`, 30),
    apiTry<{ reviews: ReviewInfo[] }>(`/api/salons/${params.slug}/reviews`, 30),
  ]);
  // Only a confirmed 404 from the API means the salon doesn't exist;
  // a transient API/DB failure should not masquerade as a missing page.
  if (detail.status === 404) notFound();
  if (!detail.data?.salon) {
    return (
      <>
        <Nav />
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "clamp(64px,12vh,140px) 24px 100px", textAlign: "center" }}>
          <h1 style={{ fontFamily: serif, fontWeight: 500, fontSize: "clamp(32px,5vw,52px)" }}>Just a moment…</h1>
          <p style={{ fontSize: 16, lineHeight: 1.6, color: "#5a5457", marginTop: 16 }}>
            We couldn&apos;t reach this salon&apos;s details right now. Please refresh the page or try again shortly.
          </p>
          <Link href={`/salon/${params.slug}`} className="bb-btn" style={{ display: "inline-block", marginTop: 28, borderRadius: 20, background: "#1C1C1C", color: "#FAF8F7", fontSize: 15, fontWeight: 600, padding: "14px 30px", textDecoration: "none" }}>
            Try again
          </Link>
        </div>
        <Footer />
      </>
    );
  }
  const salon = detail.data.salon;
  const reviews = reviewsRes?.reviews || [];

  return (
    <>
      <Nav />
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "clamp(32px,5vh,56px) clamp(24px,5vw,40px) 80px" }}>
        {/* HEADER */}
        <Reveal>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
            <div>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                {salon.verified && (
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#B06A85", background: "rgba(235,200,211,.35)", padding: "6px 12px", borderRadius: 14 }}>
                    Verified
                  </span>
                )}
                {salon.premium && (
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#7a5c14", background: "rgba(212,175,55,.85)", padding: "6px 12px", borderRadius: 14 }}>
                    Premium
                  </span>
                )}
                {salon.homeService && (
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#4a4446", background: "rgba(28,28,28,.07)", padding: "6px 12px", borderRadius: 14 }}>
                    Home service
                  </span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 14 }}>
                <ShopLogo name={salon.name} size={60} />
                <h1 style={{ fontFamily: serif, fontWeight: 500, fontSize: "clamp(34px,5vw,60px)", lineHeight: 1.05 }}>{salon.name}</h1>
              </div>
              <p style={{ fontSize: 16, color: "#5a5457", marginTop: 10 }}>
                {salon.area.name}, {salon.area.city.name} · ★ {salon.rating.toFixed(1)} ({salon.reviewCount} reviews)
              </p>
              <p style={{ fontSize: 16, lineHeight: 1.6, color: "#5a5457", marginTop: 14, maxWidth: "62ch" }}>{salon.description}</p>
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <FavoriteButton slug={salon.slug} />
              <Link
                href={`/book/${salon.slug}`}
                className="bb-btn"
                style={{ border: "none", borderRadius: 20, background: "#1C1C1C", color: "#FAF8F7", fontSize: 15, fontWeight: 600, padding: "14px 28px", textDecoration: "none", whiteSpace: "nowrap", boxShadow: "0 6px 18px rgba(28,28,28,.14)" }}
              >
                Book now
              </Link>
            </div>
          </div>
        </Reveal>

        {/* GALLERY */}
        <Reveal style={{ marginTop: 34 }}>
          <div className="bb-grid-3" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 14 }}>
            {(salon.images.length ? salon.images : [{ url: "", alt: "salon interior photo" }, { url: "", alt: "styling chair photo" }, { url: "", alt: "treatment room photo" }]).slice(0, 3).map((img, i) => (
              <div key={i} className="bb-ph" style={{ position: "relative", height: i === 0 ? 320 : 320, borderRadius: 22, overflow: "hidden", border: "1px solid rgba(28,28,28,.06)" }}>
                <span style={{ position: "absolute", left: 0, bottom: 0, fontFamily: "'Menlo',monospace", fontSize: 11, color: "#B06A85", padding: "8px 12px" }}>{img.alt}</span>
              </div>
            ))}
          </div>
        </Reveal>

        <div className="bb-two-col" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 40, marginTop: 48, alignItems: "start" }}>
          <div>
            {/* SERVICES */}
            <Reveal>
              <h2 style={{ fontFamily: serif, fontWeight: 500, fontSize: "clamp(28px,3.5vw,40px)" }}>Services</h2>
              <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 12 }}>
                {salon.services.map((svc) => (
                  <div
                    key={svc.id}
                    className="bb-lift"
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "18px 20px", borderRadius: 18, background: "#fff", border: "1px solid rgba(28,28,28,.06)" }}
                  >
                    <Link href={`/salon/${salon.slug}/service/${svc.id}`} style={{ textDecoration: "none", color: "inherit", flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 600 }}>{svc.name}</div>
                      <div style={{ fontSize: 13, color: "#5a5457", marginTop: 3 }}>
                        {svc.category.name} · {svc.durationMin} min{svc.description ? ` · ${svc.description}` : ""}
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#B06A85" }}>View details →</span>
                    </Link>
                    <div style={{ display: "flex", alignItems: "center", gap: 16, whiteSpace: "nowrap" }}>
                      <span style={{ fontFamily: serif, fontSize: 20, fontWeight: 600 }}>{rupees(svc.price)}</span>
                      <Link
                        href={`/book/${salon.slug}?service=${svc.id}`}
                        className="bb-btn"
                        style={{ borderRadius: 14, background: "#1C1C1C", color: "#FAF8F7", fontSize: 13, fontWeight: 600, padding: "10px 16px", textDecoration: "none" }}
                      >
                        Book
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>

            {/* REVIEWS */}
            <Reveal style={{ marginTop: 48 }}>
              <h2 style={{ fontFamily: serif, fontWeight: 500, fontSize: "clamp(28px,3.5vw,40px)" }}>Reviews</h2>
              <p style={{ fontSize: 14, color: "#5a5457", marginTop: 6 }}>Verified reviews from completed appointments only.</p>
              <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 14 }}>
                {reviews.length === 0 && <p style={{ fontSize: 15, color: "#5a5457" }}>No reviews yet — be the first after your visit.</p>}
                {reviews.map((r) => (
                  <div key={r.id} style={{ borderRadius: 20, background: "#fff", padding: 24, border: "1px solid rgba(28,28,28,.05)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ color: "#D4AF37", fontSize: 14, letterSpacing: 2 }}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                      <span style={{ fontSize: 12, color: "#5a5457" }}>{new Date(r.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p style={{ fontFamily: serif, fontSize: 19, lineHeight: 1.4, fontStyle: "italic", color: "#2a2426", marginTop: 12 }}>&ldquo;{r.text}&rdquo;</p>
                    <div style={{ fontSize: 13, fontWeight: 600, marginTop: 12 }}>{r.user.name}</div>
                    {r.ownerReply && (
                      <div style={{ marginTop: 12, padding: "12px 16px", borderRadius: 14, background: "rgba(235,200,211,.18)", fontSize: 14, color: "#4a4446" }}>
                        <strong style={{ color: "#B06A85" }}>Owner reply:</strong> {r.ownerReply}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          {/* SIDEBAR */}
          <Reveal>
            <div style={{ borderRadius: 22, background: "#fff", border: "1px solid rgba(28,28,28,.06)", padding: 26, boxShadow: "0 10px 30px -22px rgba(28,28,28,.4)" }}>
              <h3 style={{ fontFamily: serif, fontSize: 24, fontWeight: 600 }}>Details</h3>
              <div style={{ marginTop: 16, fontSize: 14, color: "#4a4446", display: "flex", flexDirection: "column", gap: 10 }}>
                <div><strong>Address:</strong> {salon.address}, {salon.area.name}, {salon.area.city.name}</div>
                <div><strong>Phone:</strong> {salon.phone}</div>
                {salon.email && <div><strong>Email:</strong> {salon.email}</div>}
                <div><strong>From:</strong> {rupees(salon.priceFrom)}</div>
              </div>

              <h3 style={{ fontFamily: serif, fontSize: 24, fontWeight: 600, marginTop: 28 }}>Opening hours</h3>
              <div style={{ marginTop: 12, fontSize: 14, color: "#4a4446" }}>
                {salon.workingHours.map((h) => (
                  <div key={h.dayOfWeek} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid rgba(28,28,28,.05)" }}>
                    <span>{days[h.dayOfWeek]}</span>
                    <span>{h.closed ? "Closed" : `${fmtMin(h.openMin)} – ${fmtMin(h.closeMin)}`}</span>
                  </div>
                ))}
              </div>

              <h3 style={{ fontFamily: serif, fontSize: 24, fontWeight: 600, marginTop: 28 }}>Specialists</h3>
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                {salon.employees.map((e) => (
                  <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(235,200,211,.5)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: serif, fontSize: 17, color: "#B06A85" }}>
                      {e.name[0]}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{e.name}</div>
                      <div style={{ fontSize: 12, color: "#5a5457" }}>{e.title}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
      <Footer />
    </>
  );
}
