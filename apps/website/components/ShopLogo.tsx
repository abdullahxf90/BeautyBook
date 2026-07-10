// A store "logo": the salon's initials in a tinted circle. Gives every salon a
// recognisable ecommerce-style shop mark without needing an uploaded logo.
const TINTS = [
  { bg: "rgba(235,200,211,.55)", fg: "#B06A85" },
  { bg: "rgba(212,175,55,.28)", fg: "#9c7c1e" },
  { bg: "rgba(176,106,133,.22)", fg: "#B06A85" },
  { bg: "rgba(28,28,28,.08)", fg: "#1C1C1C" },
];

function initials(name: string): string {
  const parts = name.replace(/[^a-zA-Z0-9 ]/g, "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "BB";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function ShopLogo({ name, size = 48 }: { name: string; size?: number }) {
  const tint = TINTS[name.length % TINTS.length];
  return (
    <div
      aria-hidden="true"
      style={{
        flex: `0 0 ${size}px`,
        width: size,
        height: size,
        borderRadius: size * 0.28,
        background: tint.bg,
        color: tint.fg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Space Grotesk',sans-serif",
        fontWeight: 600,
        fontSize: size * 0.36,
        letterSpacing: "-.02em",
      }}
    >
      {initials(name)}
    </div>
  );
}
