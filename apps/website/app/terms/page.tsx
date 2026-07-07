import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

const serif = "'Space Grotesk',sans-serif";

export default function TermsPage() {
  return (
    <>
      <Nav />
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "clamp(48px,8vh,100px) clamp(24px,5vw,40px) 90px" }}>
        <h1 style={{ fontFamily: serif, fontWeight: 500, fontSize: "clamp(36px,5vw,56px)", lineHeight: 1.05 }}>Terms of Service</h1>
        <p style={{ fontSize: 15, color: "#5a5457", marginTop: 10 }}>Last updated: July 2026</p>

        <div style={{ marginTop: 36, display: "flex", flexDirection: "column", gap: 24, fontSize: 16, lineHeight: 1.7, color: "#2a2426" }}>
          <section>
            <h2 style={{ fontFamily: serif, fontSize: 26, fontWeight: 600, marginBottom: 12 }}>1. Acceptance of Terms</h2>
            <p>By using BeautyBook, you agree to these terms of service. If you do not agree, please do not use our platform.</p>
          </section>
          <section>
            <h2 style={{ fontFamily: serif, fontSize: 26, fontWeight: 600, marginBottom: 12 }}>2. Booking & Cancellation</h2>
            <p>Bookings are subject to salon availability. Cancellation policies vary by salon and are displayed at the time of booking. BeautyBook is not responsible for cancellations made by salons.</p>
          </section>
          <section>
            <h2 style={{ fontFamily: serif, fontSize: 26, fontWeight: 600, marginBottom: 12 }}>3. Reviews</h2>
            <p>Reviews must be honest and based on actual experiences. We reserve the right to remove reviews that violate our guidelines.</p>
          </section>
          <section>
            <h2 style={{ fontFamily: serif, fontSize: 26, fontWeight: 600, marginBottom: 12 }}>4. Payments</h2>
            <p>Payment is collected at the time of booking for card payments, or at the salon for cash payments. Refunds are processed according to salon policies.</p>
          </section>
          <section>
            <h2 style={{ fontFamily: serif, fontSize: 26, fontWeight: 600, marginBottom: 12 }}>5. Account Responsibility</h2>
            <p>You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account.</p>
          </section>
          <section>
            <h2 style={{ fontFamily: serif, fontSize: 26, fontWeight: 600, marginBottom: 12 }}>6. Limitation of Liability</h2>
            <p>BeautyBook acts as a marketplace connecting customers with service providers. We are not liable for the quality of services provided by salons.</p>
          </section>
          <section>
            <h2 style={{ fontFamily: serif, fontSize: 26, fontWeight: 600, marginBottom: 12 }}>7. Contact</h2>
            <p>For questions about these terms, contact legal@beautybook.pk.</p>
          </section>
        </div>
      </div>
      <Footer />
    </>
  );
}
