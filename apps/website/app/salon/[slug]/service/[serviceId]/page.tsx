import Link from "next/link";
import { notFound } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import ShopLogo from "@/components/ShopLogo";
import { apiTryStatus, rupees, SalonDetail } from "@/lib/api";

const serif = "'Space Grotesk',sans-serif";

export default async function ServiceDetailPage({ params }: { params: { slug: string; serviceId: string } }) {
  const detail = await apiTryStatus<{ salon: SalonDetail }>(`/api/salons/${params.slug}`, 30);
  if (detail.status === 404) notFound();

  const salon = detail.data?.salon;
  if (!salon) {
    return (
      <>
        <Nav />
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "clamp(64px,12vh,140px) 24px 100px", textAlign: "center" }}>
          <h1 style={{ fontFamily: serif, fontWeight: 500, fontSize: "clamp(30px,5vw,48px)" }}>Just a moment…</h1>
          <p style={{ fontSize: 16, color: "#575153", marginTop: 14 }}>We couldn&apos;t load this item right now. Please refresh and try again.</p>
        </div>
        <Footer />
      </>
    );
  }

  const service = salon.services.find((s) => s.id === params.serviceId);
  if (!service) notFound();

  const related = salon.services.filter((s) => s.id !== service.id).slice(0, 6);

  return (
    <>
      <Nav />
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "clamp(20px,3vh,32px) clamp(24px,5vw,40px) 80px" }}>
        {/* Breadcrumb */}
        <div style={{ fontSize: 13, color: "#8A7F7A", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <Link href="/explore" style={{ color: "#8A7F7A", textDecoration: "none" }}>Explore</Link>
          <span>›</span>
          <Link href={`/salon/${salon.slug}`} style={{ color: "#8A7F7A", textDecoration: "none" }}>{salon.name}</Link>
          <span>›</span>
          <span style={{ color: "#1C1C1C" }}>{service.name}</span>
        </div>

        {/* Product layout */}
        <div className="bb-two-col" style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 40, marginTop: 22, alignItems: "start" }}>
          {/* Image */}
          <div className="bb-ph" style={{ position: "relative", height: 420, borderRadius: 20, border: "1px solid rgba(28,28,28,.06)", overflow: "hidden" }}>
            <span style={{ position: "absolute", left: 14, top: 14, fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#B06A85", background: "rgba(255,255,255,.85)", padding: "5px 11px", borderRadius: 100 }}>
              {service.category.name}
            </span>
          </div>

          {/* Info */}
          <div>
            <h1 style={{ fontFamily: serif, fontWeight: 500, fontSize: "clamp(30px,4vw,44px)", lineHeight: 1.08, letterSpacing: "-.02em" }}>{service.name}</h1>
            <p style={{ fontSize: 15, color: "#575153", marginTop: 8 }}>{service.category.name} · {service.durationMin} min · ★ {salon.rating.toFixed(1)} ({salon.reviewCount})</p>

            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 18 }}>
              <span style={{ fontFamily: serif, fontSize: 38, fontWeight: 600 }}>{rupees(service.price)}</span>
              <span style={{ fontSize: 14, color: "#8A7F7A" }}>· {service.durationMin} min appointment</span>
            </div>

            {service.description && (
              <p style={{ fontSize: 15, lineHeight: 1.65, color: "#4a4446", marginTop: 18 }}>{service.description}</p>
            )}

            <div style={{ display: "flex", gap: 12, marginTop: 26, flexWrap: "wrap" }}>
              <Link
                href={`/book/${salon.slug}?service=${service.id}`}
                className="bb-btn"
                style={{ borderRadius: 14, background: "#1C1C1C", color: "#FAF8F7", fontSize: 15, fontWeight: 600, padding: "14px 30px", textDecoration: "none", boxShadow: "0 6px 18px rgba(28,28,28,.14)" }}
              >
                Book this service
              </Link>
              <Link
                href={`/salon/${salon.slug}`}
                className="bb-btn-ghost"
                style={{ borderRadius: 14, border: "1px solid rgba(28,28,28,.14)", color: "#1C1C1C", fontSize: 15, fontWeight: 600, padding: "14px 26px", textDecoration: "none" }}
              >
                Visit store
              </Link>
            </div>

            {/* Sold by (the shop) */}
            <Link href={`/salon/${salon.slug}`} style={{ textDecoration: "none", color: "inherit", display: "block", marginTop: 26 }}>
              <div className="bb-lift" style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", borderRadius: 16, background: "#fff", border: "1px solid rgba(28,28,28,.08)" }}>
                <ShopLogo name={salon.name} size={48} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: "#8A7F7A" }}>Sold by</div>
                  <div style={{ fontFamily: serif, fontSize: 18, fontWeight: 600 }}>{salon.name}{salon.verified ? " ✓" : ""}</div>
                  <div style={{ fontSize: 13, color: "#575153" }}>{salon.area.name}, {salon.area.city.name}</div>
                </div>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#B06A85", whiteSpace: "nowrap" }}>Enter store →</span>
              </div>
            </Link>
          </div>
        </div>

        {/* More from this shop */}
        {related.length > 0 && (
          <div style={{ marginTop: 56 }}>
            <h2 style={{ fontFamily: serif, fontWeight: 500, fontSize: "clamp(24px,3vw,34px)" }}>More from {salon.name}</h2>
            <div className="bb-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginTop: 20 }}>
              {related.map((r) => (
                <Link key={r.id} href={`/salon/${salon.slug}/service/${r.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <div className="bb-lift" style={{ borderRadius: 16, background: "#fff", border: "1px solid rgba(28,28,28,.07)", overflow: "hidden" }}>
                    <div className="bb-ph" style={{ height: 130 }} />
                    <div style={{ padding: "14px 16px 16px" }}>
                      <div style={{ fontSize: 12, color: "#8A7F7A" }}>{r.category.name} · {r.durationMin} min</div>
                      <div style={{ fontFamily: serif, fontSize: 18, fontWeight: 600, marginTop: 3 }}>{r.name}</div>
                      <div style={{ fontFamily: serif, fontSize: 18, fontWeight: 600, marginTop: 8 }}>{rupees(r.price)}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
