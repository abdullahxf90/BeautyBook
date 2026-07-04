import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

const serif = "'Cormorant Garamond',serif";

export const metadata = { title: "Refund Policy — BeautyBook" };

export default function RefundPolicyPage() {
  return (
    <>
      <Nav />
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "clamp(48px,8vh,100px) clamp(24px,5vw,40px) 90px" }}>
        <h1 style={{ fontFamily: serif, fontWeight: 500, fontSize: "clamp(36px,5vw,56px)", lineHeight: 1.05 }}>Refund Policy</h1>
        <p style={{ fontSize: 15, color: "#5a5457", marginTop: 10 }}>Last updated: July 2026</p>

        <div style={{ marginTop: 36, display: "flex", flexDirection: "column", gap: 24, fontSize: 16, lineHeight: 1.7, color: "#2a2426" }}>
          <section>
            <h2 style={{ fontFamily: serif, fontSize: 26, fontWeight: 600, marginBottom: 12 }}>1. Cancellation Windows</h2>
            <p>Refund eligibility depends on how far in advance you cancel your appointment. Unless a salon specifies a different policy on its profile, the platform default applies:</p>
            <ul style={{ marginTop: 12, paddingLeft: 22, display: "flex", flexDirection: "column", gap: 8 }}>
              <li><strong>More than 24 hours</strong> before the appointment — full refund.</li>
              <li><strong>6 to 24 hours</strong> before the appointment — 50% refund.</li>
              <li><strong>Less than 6 hours</strong> before the appointment — no refund.</li>
            </ul>
            <p style={{ marginTop: 12 }}>Individual salons may set their own cancellation rules. When they do, the salon&apos;s policy is shown on its profile and at checkout before you confirm, and that policy takes precedence.</p>
          </section>
          <section>
            <h2 style={{ fontFamily: serif, fontSize: 26, fontWeight: 600, marginBottom: 12 }}>2. How Refunds Are Issued</h2>
            <p>Refunds are returned to the original payment method. Card and mobile-wallet payments (Stripe, JazzCash, EasyPaisa) are refunded to the source within 5–10 business days depending on your provider. Wallet payments are refunded to your BeautyBook Wallet instantly. Cash-on-visit bookings that were never paid have nothing to refund and are simply cancelled.</p>
          </section>
          <section>
            <h2 style={{ fontFamily: serif, fontSize: 26, fontWeight: 600, marginBottom: 12 }}>3. Salon Cancellations &amp; No-Shows</h2>
            <p>If a salon cancels your confirmed appointment or is unable to serve you at the booked time, you receive a full refund regardless of the cancellation window, plus loyalty points as an apology. If you do not show up for an appointment without cancelling, the booking is treated as a late cancellation and no refund is due.</p>
          </section>
          <section>
            <h2 style={{ fontFamily: serif, fontSize: 26, fontWeight: 600, marginBottom: 12 }}>4. Gift Cards, Memberships &amp; Coupons</h2>
            <p>Gift cards are non-refundable but never expire and are freely transferable. Membership fees are refundable in full within 7 days of purchase if no membership benefit has been used. Discounts applied via coupons are deducted from any refund amount.</p>
          </section>
          <section>
            <h2 style={{ fontFamily: serif, fontSize: 26, fontWeight: 600, marginBottom: 12 }}>5. Disputes</h2>
            <p>If you believe a charge or refund was handled incorrectly, open a support ticket from the Support page within 30 days of the appointment. Our team reviews booking logs, payment records, and salon responses, and can issue manual refunds where warranted. Every dispute decision is recorded and auditable.</p>
          </section>
          <section>
            <h2 style={{ fontFamily: serif, fontSize: 26, fontWeight: 600, marginBottom: 12 }}>6. Contact</h2>
            <p>For refund questions, contact us at support@beautybook.pk or via the in-app Support page.</p>
          </section>
        </div>
      </div>
      <Footer />
    </>
  );
}
