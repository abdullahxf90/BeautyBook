# BeautyBook — 5-Year Evolution Roadmap

*Last updated: July 2026. This is a strategy document, not a commitment — revisit quarterly against real usage data.*

## Where we are today

The platform is technically far ahead of its market validation. Built and working: auth (email/OTP/2FA/social), salon management, booking engine (slot locking, waitlists, reschedule/refund), customer experience (wallet, loyalty, referrals, favorites, recommendations), salon owner dashboard, admin control center, search & discovery, notifications, BI/analytics with forecasting, support tickets + chat, legal/compliance (consent, data export, deletion workflow), and observability endpoints. Not yet built: real payment gateway integrations (JazzCash/EasyPaisa/Stripe are modeled but not wired to providers), push notifications (Firebase), realtime WebSockets, and mobile apps.

**The single most important truth: stop building, start launching.** Everything below is sequenced around getting real bookings in one city first.

---

## Release phases

### MVP — "One city, real bookings" (target: 3 months)
Goal: 20 live salons in Islamabad, 500 completed bookings.

- Wire ONE real payment method (JazzCash or cash-on-arrival + deposits) — not all three
- Onboard 20 salons by hand; use the admin panel yourself daily
- Booking, search, salon profiles, reviews, customer dashboard — already built; polish the paths users actually hit
- WhatsApp-based booking confirmations (cheap, high open rate in Pakistan) before investing in push infrastructure
- Cut/hide everything else from the UI. Feature flags exist — use them.

KPIs: bookings/week, booking completion rate (>85%), salon weekly retention (>80%), time-to-first-booking for a new user (<10 min).

### v1.1 — "Repeat usage" (months 4–8)
- EasyPaisa + card payments; automated payouts to salons
- Firebase push notifications; booking reminders (biggest no-show reducer)
- Loyalty + referral programs turned on (already built) once there are users to retain
- Salon subscription tiers (FREE → PRO): charge for featured placement and analytics
- React Native customer app (single codebase, Android first — that's the market)

KPIs: repeat booking rate (>30%), no-show rate (<10%), first paying salon subscriptions, CAC < Rs. 500/customer.

### v2.0 — "Multi-city + revenue engine" (year 2)
- Lahore, Karachi, Rawalpindi expansion — one city at a time, each with a local ops hire
- Salon-side mobile app (calendar, walk-ins, CRM)
- AI recommendations and smart search promoted from backend features to headline UX
- Marketing automation (win-back, abandoned booking recovery — endpoints exist)
- Advertising products: sponsored listings, homepage banners (admin tooling exists)

KPIs: GMV Rs. 10M+/month, take rate 8–12%, 3 cities each unit-profitable, NPS > 40.

### v3.0 — "Platform" (years 3–4)
- White-label SaaS: branded booking sites for large chains (Depilex, Toni & Guy tier)
- Public API + webhooks for POS/accounting integrations
- Enterprise multi-branch: head-office dashboards, branch comparison, staff transfer
- Predictive ops: dynamic pricing suggestions, demand forecasting for salons (heuristics exist; upgrade to trained models only when data volume justifies it)

### Long-term vision (year 5+)
- International: Gulf states first (Pakistani diaspora, similar service culture, higher ARPU) — multi-currency, RTL, localized payments
- Home services vertical
- Beauty e-commerce (product sales through salon recommendations)
- Financing: salon working-capital via booking-revenue underwriting

---

## Hiring roadmap

| Stage | Team |
|---|---|
| MVP | Founder + 1 full-stack dev + 1 salon ops (part-time) |
| v1.1 | +1 mobile dev, +1 support/ops, +1 growth marketer |
| v2.0 | ~10: 3 eng, 1 designer, 2 city ops, 2 support, 1 sales, 1 finance |
| v3.0 | ~25–40: eng lead + squads (consumer/salon/platform), city GMs, sales team for chains |

Hire ops and sales before more engineers — the codebase is ahead of the business.

## Funding strategy

- **MVP → v1.1: bootstrap.** Costs are low (Supabase + Vercel ≈ $50–100/mo). Revenue from salon subscriptions can cover infra by month 8.
- **Raise seed only after** 1,000+ monthly bookings and >30% repeat rate — the metrics that make the round cheap. Target: local VCs (Indus Valley, i2i) or Gulf angels; $250–500K for city expansion.
- **Series A** (if pursued) gates on 3 unit-profitable cities and Rs. 10M+/month GMV.

## Marketing / go-to-market

1. **Supply first**: personally onboard the 20 best salons in one upscale area (F-7/F-10 Islamabad). Offer free professional photos as the onboarding hook.
2. **Demand via salons**: each salon promotes "book online" to its existing clients (QR codes at reception) — cheaper than ads and pre-qualified.
3. Instagram/TikTok before-and-after content with onboarded salons; bridal season (Oct–Dec) is the annual acquisition spike — plan campaigns around it.
4. Referral program (built) activates once repeat rate proves retention.

## Infrastructure scaling plan

| Users | Stack |
|---|---|
| 0–50K | Current: Supabase + Vercel + single API instance. Do nothing. |
| 50–500K | Managed Redis (cache + queues), read replica, move API to autoscaling containers (Railway/Fly/ECS), CDN for images |
| 500K+ | Dedicated Postgres with partitioning (bookings by month), queue workers, multi-region CDN, observability stack (the endpoints exist; add Grafana/alerting) |

## Risk assessment

| Risk | Mitigation |
|---|---|
| Salons take bookings offline to avoid commission | Subscription pricing (not just commission), give salons real value: CRM, no-show reduction, analytics |
| Low digital-payment adoption | Cash-on-arrival with deposit option; WhatsApp confirmations |
| Copycat with funding (e.g., regional player entering) | Speed + supply lock-in: exclusive featured placement contracts with top salons |
| No-shows poison salon trust | Reminders, deposits, no-show scoring (built) |
| Regulatory (data protection law) | Consent/export/deletion already implemented; keep audit logs |
| Founder burnout / scope creep | This roadmap. Ship the MVP. Ignore prompts 28+. |

## Competitive landscape

- **Fresha/Booksy**: global leaders, weak Pakistan presence, no local payments — window is open but not forever.
- **Local directories** (no booking): beat them with real-time availability.
- **Instagram DM booking** (the real competitor): beat it with instant confirmation, reminders, loyalty, and not requiring the salon to answer DMs at 11pm.

## KPI ladder by stage

- **MVP**: 500 bookings, 20 salons, 85% completion
- **v1.1**: 2K bookings/mo, 30% repeat, first Rs. 100K MRR from subscriptions
- **v2.0**: Rs. 10M GMV/mo, 3 cities, take rate ≥ 8%, CAC:LTV ≥ 1:3
- **v3.0**: 10K salons, white-label revenue ≥ 20% of total, API partners live
- **Year 5**: category leader in Pakistan, first international market live
