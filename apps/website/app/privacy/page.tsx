import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

const serif = "'Space Grotesk',sans-serif";

export default function PrivacyPage() {
  return (
    <>
      <Nav />
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "clamp(48px,8vh,100px) clamp(24px,5vw,40px) 90px" }}>
        <h1 style={{ fontFamily: serif, fontWeight: 500, fontSize: "clamp(36px,5vw,56px)", lineHeight: 1.05 }}>Privacy Policy</h1>
        <p style={{ fontSize: 15, color: "#5a5457", marginTop: 10 }}>Last updated: July 2026</p>

        <div style={{ marginTop: 36, display: "flex", flexDirection: "column", gap: 24, fontSize: 16, lineHeight: 1.7, color: "#2a2426" }}>
          <section>
            <h2 style={{ fontFamily: serif, fontSize: 26, fontWeight: 600, marginBottom: 12 }}>1. Information We Collect</h2>
            <p>We collect information you provide when creating an account, making a booking, writing a review, or contacting support. This includes your name, email address, phone number, and payment information.</p>
          </section>
          <section>
            <h2 style={{ fontFamily: serif, fontSize: 26, fontWeight: 600, marginBottom: 12 }}>2. How We Use Your Information</h2>
            <p>We use your information to facilitate bookings, process payments, send appointment reminders, personalize your experience, improve our services, and communicate with you about offers and updates.</p>
          </section>
          <section>
            <h2 style={{ fontFamily: serif, fontSize: 26, fontWeight: 600, marginBottom: 12 }}>3. Data Sharing</h2>
            <p>We share necessary information with salon partners to fulfill your bookings. We do not sell your personal information to third parties. Payment data is processed securely by our payment partners.</p>
          </section>
          <section>
            <h2 style={{ fontFamily: serif, fontSize: 26, fontWeight: 600, marginBottom: 12 }}>4. Data Security</h2>
            <p>We implement industry-standard security measures to protect your data, including encryption, secure servers, and regular security audits.</p>
          </section>
          <section>
            <h2 style={{ fontFamily: serif, fontSize: 26, fontWeight: 600, marginBottom: 12 }}>5. Your Rights</h2>
            <p>You have the right to access, correct, or delete your personal data. You can manage your data through your account settings or by contacting us.</p>
          </section>
          <section>
            <h2 style={{ fontFamily: serif, fontSize: 26, fontWeight: 600, marginBottom: 12 }}>6. Contact</h2>
            <p>For privacy inquiries, contact us at privacy@beautybook.pk.</p>
          </section>
        </div>
      </div>
      <Footer />
    </>
  );
}
