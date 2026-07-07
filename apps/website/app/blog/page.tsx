import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";
import { apiTry } from "@/lib/api";

const serif = "'Space Grotesk',sans-serif";

interface BlogPostSummary { id: string; slug: string; title: string; excerpt: string; category: string; coverUrl: string | null; authorName: string; readTimeMin: number; createdAt: string; featured: boolean }

export default async function BlogPage() {
  const res = await apiTry<{ posts: BlogPostSummary[] }>("/api/blog", 120);
  const posts = res?.posts || [];

  return (
    <>
      <Nav />
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "clamp(48px,8vh,100px) clamp(24px,5vw,40px) 90px" }}>
        <Reveal style={{ textAlign: "center", marginBottom: 48 }}>
          <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: ".16em", textTransform: "uppercase", color: "#B06A85" }}>The Journal</span>
          <h1 style={{ fontFamily: serif, fontWeight: 500, fontSize: "clamp(40px,6vw,72px)", marginTop: 14, lineHeight: 1.05 }}>Beauty tips &amp; stories</h1>
          <p style={{ fontSize: 17, lineHeight: 1.6, color: "#5a5457", marginTop: 18 }}>Expert advice, trends, and rituals to help you glow.</p>
        </Reveal>

        {posts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <p style={{ fontSize: 16, color: "#5a5457" }}>Journal entries coming soon. Check back for expert beauty tips.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 28 }}>
            {posts.map((post) => (
              <Reveal key={post.id}>
                <Link href={`/blog/${post.slug}`} className="bb-lift" style={{ textDecoration: "none", color: "inherit", borderRadius: 22, overflow: "hidden", background: "#fff", border: "1px solid rgba(28,28,28,.06)", display: "block", height: "100%" }}>
                  <div className="bb-ph" style={{ height: 180, position: "relative", display: "flex", alignItems: "flex-end" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "#B06A85", background: "rgba(255,255,255,.85)", padding: "6px 12px", borderRadius: "0 12px 0 0" }}>{post.category}</span>
                  </div>
                  <div style={{ padding: 24 }}>
                    <h3 style={{ fontFamily: serif, fontSize: 22, fontWeight: 600, lineHeight: 1.2 }}>{post.title}</h3>
                    <p style={{ fontSize: 14, color: "#5a5457", marginTop: 10, lineHeight: 1.5 }}>{post.excerpt}</p>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 18, fontSize: 13, color: "#5a5457" }}>
                      <span>{post.authorName}</span>
                      <span>{post.readTimeMin} min read</span>
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
