"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function FavoriteButton({ slug }: { slug: string }) {
  const { token } = useAuth();
  const router = useRouter();
  const [favorited, setFavorited] = useState(false);

  useEffect(() => {
    if (!token) return;
    api<{ favorites: { salon: { slug: string } }[] }>("/api/favorites", { token })
      .then((res) => setFavorited(res.favorites.some((f) => f.salon.slug === slug)))
      .catch(() => {});
  }, [token, slug]);

  const toggle = async () => {
    if (!token) return router.push("/login");
    try {
      const res = await api<{ favorited: boolean }>(`/api/favorites/${slug}/toggle`, { method: "POST", token });
      setFavorited(res.favorited);
    } catch {
      // API offline — ignore
    }
  };

  return (
    <button
      onClick={() => void toggle()}
      aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
      className="bb-btn"
      style={{
        border: "1px solid rgba(28,28,28,.12)",
        borderRadius: 20,
        background: favorited ? "rgba(235,200,211,.4)" : "rgba(255,255,255,.8)",
        color: favorited ? "#B06A85" : "#1C1C1C",
        fontSize: 15,
        fontWeight: 600,
        padding: "14px 20px",
        cursor: "pointer",
      }}
    >
      {favorited ? "♥ Saved" : "♡ Save"}
    </button>
  );
}
