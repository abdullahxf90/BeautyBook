import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { apiTry } from "@/lib/api";

const serif = "'Cormorant Garamond',serif";

export const metadata = { title: "FAQ — BeautyBook" };

interface Faq {
  id: string;
  question: string;
  answer: string;
  category: string | null;
}

const fallbackFaqs: Faq[] = [
  { id: "f1", category: "Bookings", question: "How do I book an appointment?", answer: "Search for a salon or service, pick a stylist and a live time slot, and confirm. Your slot is reserved for 5 minutes while you complete checkout, so no one can take it while you pay." },
  { id: "f2", category: "Bookings", question: "Can I reschedule or cancel a booking?", answer: "Yes — open the booking in your dashboard and choose Reschedule or Cancel. Refunds follow the salon's cancellation policy, shown before you confirm (default: full refund over 24h ahead, 50% between 6–24h, none under 6h)." },
  { id: "f3", category: "Bookings", question: "What happens if my preferred day is fully booked?", answer: "Join the waitlist from the booking page. If a slot opens up, we notify the next person in line and hold the slot briefly so they can claim it." },
  { id: "f4", category: "Payments", question: "Which payment methods are supported?", answer: "Stripe (cards), JazzCash, EasyPaisa, BeautyBook Wallet, gift cards, and cash on visit." },
  { id: "f5", category: "Payments", question: "How long do refunds take?", answer: "Wallet refunds are instant. Card and mobile-wallet refunds take 5–10 business days depending on your provider. See our Refund Policy for details." },
  { id: "f6", category: "Reviews", question: "Who can leave a review?", answer: "Only customers with a completed booking at that salon can review it — every rating on BeautyBook comes from a verified visit." },
  { id: "f7", category: "Rewards", question: "How do loyalty points work?", answer: "You earn points for completed bookings, reviews, and referrals. Points can be redeemed against future bookings, and your tier (Bronze → Diamond) unlocks bigger perks." },
  { id: "f8", category: "Rewards", question: "How do referrals work?", answer: "Share your referral code from the Referrals page. When a friend signs up and completes a qualifying booking, you both earn bonus points." },
  { id: "f9", category: "Salons", question: "How do I list my salon on BeautyBook?", answer: "Apply through the Become a Partner page. After business verification you get a full salon dashboard: calendar, staff, CRM, inventory, marketing, and analytics." },
  { id: "f10", category: "Account", question: "How do I secure my account?", answer: "Enable two-factor authentication in Settings → Security, verify your email and phone, and review your active sessions and login history at any time." },
];

export default async function FaqPage() {
  const data = await apiTry<{ faqs: Faq[] }>("/api/cms/faqs", 300);
  const faqs = data?.faqs?.length ? data.faqs : fallbackFaqs;

  const categories = Array.from(new Set(faqs.map((f) => f.category || "General")));

  return (
    <>
      <Nav />
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "clamp(48px,8vh,100px) clamp(24px,5vw,40px) 90px" }}>
        <h1 style={{ fontFamily: serif, fontWeight: 500, fontSize: "clamp(36px,5vw,56px)", lineHeight: 1.05 }}>
          Frequently asked questions
        </h1>
        <p style={{ fontSize: 15, color: "#5a5457", marginTop: 10 }}>
          Everything about booking, paying, and glowing. Can&apos;t find it? Visit our Support page.
        </p>

        <div style={{ marginTop: 40, display: "flex", flexDirection: "column", gap: 36 }}>
          {categories.map((cat) => (
            <section key={cat}>
              <h2 style={{ fontFamily: serif, fontSize: 26, fontWeight: 600, marginBottom: 14 }}>{cat}</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {faqs
                  .filter((f) => (f.category || "General") === cat)
                  .map((f) => (
                    <details
                      key={f.id}
                      style={{ background: "#fff", borderRadius: 18, border: "1px solid rgba(28,28,28,.07)", padding: "16px 20px" }}
                    >
                      <summary style={{ fontSize: 16, fontWeight: 600, color: "#1C1C1C", cursor: "pointer", listStyle: "none" }}>
                        {f.question}
                      </summary>
                      <p style={{ fontSize: 15, lineHeight: 1.7, color: "#4a4446", marginTop: 10 }}>{f.answer}</p>
                    </details>
                  ))}
              </div>
            </section>
          ))}
        </div>
      </div>
      <Footer />
    </>
  );
}
