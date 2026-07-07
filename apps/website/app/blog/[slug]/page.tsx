import Link from "next/link";
import { notFound } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { apiTry } from "@/lib/api";

const serif = "'Space Grotesk',sans-serif";

interface BlogPost { id: string; slug: string; title: string; excerpt: string; content: string; category: string; tags: string; coverUrl: string | null; authorName: string; published: boolean; readTimeMin: number; createdAt: string }

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const res = await apiTry<{ post: BlogPost }>(`/api/blog/${params.slug}`, 60);
  if (!res?.post) notFound();
  const post = res.post;
  let tags: string[] = [];
  try { tags = JSON.parse(post.tags); } catch { tags = []; }

  return (
    <>
      <Nav />
      <article style={{ maxWidth: 760, margin: "0 auto", padding: "clamp(40px,6vh,80px) clamp(24px,5vw,40px) 90px" }}>
        <div style={{ marginBottom: 32 }}>
          <Link href="/blog" style={{ fontSize: 14, fontWeight: 600, color: "#B06A85", textDecoration: "none" }}>← Back to journal</Link>
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#B06A85", background: "rgba(235,200,211,.35)", padding: "6px 12px", borderRadius: 14 }}>{post.category}</span>
        <h1 style={{ fontFamily: serif, fontWeight: 500, fontSize: "clamp(34px,5vw,56px)", marginTop: 20, lineHeight: 1.05 }}>{post.title}</h1>
        <div style={{ display: "flex", gap: 16, alignItems: "center", marginTop: 16, fontSize: 14, color: "#5a5457" }}>
          <span>By {post.authorName}</span>
          <span>·</span>
          <span>{post.readTimeMin} min read</span>
          <span>·</span>
          <span>{new Date(post.createdAt).toLocaleDateString("en-PK", { year: "numeric", month: "long", day: "numeric" })}</span>
        </div>
        <div className="bb-ph" style={{ height: 280, borderRadius: 22, marginTop: 28, display: "flex", alignItems: "flex-end" }} />

        <div style={{ marginTop: 40, fontSize: 17, lineHeight: 1.8, color: "#2a2426" }}>
          {post.content.split("\n").map((line, i) => {
            if (line.startsWith("## ")) return <h2 key={i} style={{ fontFamily: serif, fontSize: 26, fontWeight: 600, marginTop: 32, marginBottom: 12 }}>{line.slice(3)}</h2>;
            if (line.startsWith("# ")) return <h1 key={i} style={{ fontFamily: serif, fontSize: 32, fontWeight: 600, marginTop: 32, marginBottom: 12 }}>{line.slice(2)}</h1>;
            if (line.trim() === "") return <div key={i} style={{ height: 16 }} />;
            return <p key={i} style={{ marginBottom: 12 }}>{line}</p>;
          })}
        </div>

        {tags.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 40, paddingTop: 28, borderTop: "1px solid rgba(28,28,28,.08)" }}>
            {tags.map((tag) => (
              <span key={tag} style={{ fontSize: 12, fontWeight: 600, color: "#B06A85", background: "rgba(235,200,211,.25)", padding: "6px 14px", borderRadius: 14 }}>#{tag}</span>
            ))}
          </div>
        )}

        <div style={{ marginTop: 48, padding: 28, borderRadius: 22, background: "rgba(235,200,211,.15)", textAlign: "center" }}>
          <p style={{ fontFamily: serif, fontSize: 22, fontWeight: 600 }}>Ready to book your glow?</p>
          <p style={{ fontSize: 15, color: "#5a5457", marginTop: 8 }}>Find and book the best beauty professionals near you.</p>
          <Link href="/explore" className="bb-btn" style={{ display: "inline-block", marginTop: 16, borderRadius: 20, background: "#1C1C1C", color: "#FAF8F7", fontSize: 15, fontWeight: 600, padding: "14px 28px", textDecoration: "none" }}>Explore salons</Link>
        </div>
      </article>
      <Footer />
    </>
  );
}
