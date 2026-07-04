import { PrismaClient, Gender } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

async function main() {
  // ---- Cities & areas ----
  const cityDefs: Record<string, string[]> = {
    Karachi: ["Clifton", "DHA", "Gulshan-e-Iqbal", "PECHS"],
    Lahore: ["Gulberg", "Cantt", "DHA Phase 5", "Johar Town"],
    Islamabad: ["F-7", "Blue Area", "F-10", "G-11"],
    Rawalpindi: ["Saddar", "Bahria Town", "Satellite Town"],
  };
  const areas: Record<string, string> = {};
  for (const [cityName, areaNames] of Object.entries(cityDefs)) {
    const city = await prisma.city.upsert({
      where: { name: cityName },
      update: {},
      create: { name: cityName },
    });
    for (const a of areaNames) {
      const area = await prisma.area.upsert({
        where: { name_cityId: { name: a, cityId: city.id } },
        update: {},
        create: { name: a, cityId: city.id },
      });
      areas[`${a}, ${cityName}`] = area.id;
    }
  }

  // ---- Categories (match homepage design) ----
  const categoryDefs = [
    { name: "Hair", mark: "H", tint: "rgba(235,200,211,.4)" },
    { name: "Bridal", mark: "B", tint: "rgba(212,175,55,.18)" },
    { name: "Facial", mark: "F", tint: "rgba(235,200,211,.4)" },
    { name: "Nails", mark: "N", tint: "rgba(176,106,133,.14)" },
    { name: "Spa", mark: "S", tint: "rgba(235,200,211,.4)" },
    { name: "Massage", mark: "M", tint: "rgba(176,106,133,.14)" },
    { name: "Skin Care", mark: "Sk", tint: "rgba(235,200,211,.4)" },
    { name: "Makeup", mark: "Mk", tint: "rgba(212,175,55,.18)" },
  ];
  const categories: Record<string, string> = {};
  for (const c of categoryDefs) {
    const cat = await prisma.category.upsert({
      where: { name: c.name },
      update: {},
      create: { ...c, slug: slugify(c.name) },
    });
    categories[c.name] = cat.id;
  }

  // ---- Users ----
  const password = await bcrypt.hash("Password123!", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@beautybook.pk" },
    update: {},
    create: { email: "admin@beautybook.pk", name: "BeautyBook Admin", passwordHash: password, role: "ADMIN", emailVerified: true },
  });
  const owner = await prisma.user.upsert({
    where: { email: "owner@beautybook.pk" },
    update: {},
    create: { email: "owner@beautybook.pk", name: "Salon Owner", passwordHash: password, role: "OWNER", emailVerified: true },
  });
  const customer = await prisma.user.upsert({
    where: { email: "ayesha@example.com" },
    update: {},
    create: { email: "ayesha@example.com", name: "Ayesha Khan", passwordHash: password, role: "CUSTOMER", emailVerified: true, loyaltyPoints: 120 },
  });

  // ---- Salons (featured trio + trending trio from the design, plus more) ----
  type SalonSeed = {
    name: string; area: string; description: string; priceFrom: number;
    premium?: boolean; featured?: boolean; trending?: boolean; tag?: string;
    gender?: Gender; homeService?: boolean; rating: number;
  };
  const salonDefs: SalonSeed[] = [
    { name: "Maison Lumière", area: "Clifton, Karachi", description: "A luxury atelier for hair, skin and bridal artistry in the heart of Clifton.", priceFrom: 3500, premium: true, featured: true, rating: 4.9 },
    { name: "The Glow Studio", area: "Gulberg, Lahore", description: "Modern styling studio known for precision cuts and radiant facials.", priceFrom: 2800, featured: true, rating: 4.8 },
    { name: "Rosewood Atelier", area: "F-7, Islamabad", description: "Islamabad's most-loved bridal suite with a serene, rose-scented calm.", priceFrom: 4200, premium: true, featured: true, rating: 5.0 },
    { name: "Velvet & Co.", area: "DHA, Karachi", description: "Editorial hair colour and styling by award-winning stylists.", priceFrom: 3000, trending: true, tag: "Hair", rating: 4.9 },
    { name: "Aurora Beauty", area: "Cantt, Lahore", description: "Signature facials and skin rituals with dermatologist-approved lines.", priceFrom: 2400, trending: true, tag: "Facial", rating: 4.7 },
    { name: "Bloom Lounge", area: "Blue Area, Islamabad", description: "A playful nail bar with gel art, spa manicures and chrome finishes.", priceFrom: 1800, trending: true, tag: "Nails", rating: 4.8 },
    { name: "Serene Spa House", area: "DHA Phase 5, Lahore", description: "Deep-tissue massage and hammam rituals for total reset.", priceFrom: 3200, homeService: true, rating: 4.6 },
    { name: "Noor Beauty Bar", area: "Gulshan-e-Iqbal, Karachi", description: "Budget-friendly threading, waxing and party makeup.", priceFrom: 900, rating: 4.4 },
    { name: "Amber & Ash", area: "Bahria Town, Rawalpindi", description: "Gentlemen's grooming lounge — cuts, beard sculpting and facials.", priceFrom: 1200, gender: "MALE", rating: 4.5 },
  ];

  const serviceMenu: Array<{ cat: string; name: string; price: number; dur: number; desc: string }> = [
    { cat: "Hair", name: "Signature Haircut & Blowdry", price: 2500, dur: 60, desc: "Consultation, precision cut and styled finish." },
    { cat: "Hair", name: "Full Hair Colour", price: 6500, dur: 120, desc: "Ammonia-free global colour with gloss." },
    { cat: "Facial", name: "Signature Glow Facial", price: 4000, dur: 75, desc: "Deep cleanse, exfoliation, massage and mask." },
    { cat: "Skin Care", name: "HydraBoost Treatment", price: 5500, dur: 60, desc: "Hydra-dermabrasion with serum infusion." },
    { cat: "Nails", name: "Gel Manicure", price: 2000, dur: 45, desc: "Cuticle care, shaping and long-wear gel polish." },
    { cat: "Spa", name: "Aromatherapy Massage", price: 4500, dur: 90, desc: "Full-body relaxation with essential oil blends." },
    { cat: "Makeup", name: "Party Makeup", price: 8000, dur: 90, desc: "Full-glam evening look with lashes." },
    { cat: "Bridal", name: "Bridal Signature Package", price: 45000, dur: 240, desc: "Complete bridal look — makeup, hair, draping." },
  ];

  const employeeNames = [
    ["Sana Malik", "Senior Stylist"],
    ["Mehwish Ali", "Skin Specialist"],
    ["Rabia Hussain", "Nail Artist"],
    ["Fatima Noor", "Makeup Artist"],
  ];

  for (const [i, def] of salonDefs.entries()) {
    const slug = slugify(def.name);
    const existing = await prisma.salon.findUnique({ where: { slug } });
    if (existing) continue;

    const salon = await prisma.salon.create({
      data: {
        slug,
        name: def.name,
        description: def.description,
        address: `${def.area.split(",")[0]} Main Boulevard`,
        phone: `+92 3${i}1 234567${i}`,
        email: `hello@${slug.replace(/-/g, "")}.pk`,
        areaId: areas[def.area],
        ownerId: owner.id,
        priceFrom: def.priceFrom,
        premium: !!def.premium,
        featured: !!def.featured,
        trending: !!def.trending,
        verified: true,
        homeService: !!def.homeService,
        gender: def.gender ?? "UNISEX",
        tag: def.tag ?? null,
        rating: def.rating,
        images: {
          create: [
            { url: "", alt: "salon interior photo", sort: 0 },
            { url: "", alt: "styling chair photo", sort: 1 },
            { url: "", alt: "treatment room photo", sort: 2 },
          ],
        },
        employees: {
          create: employeeNames.slice(0, 3).map(([name, title]) => ({ name, title })),
        },
        services: {
          create: serviceMenu.map((s) => ({
            categoryId: categories[s.cat],
            name: s.name,
            description: s.desc,
            price: Math.round(s.price * (0.85 + (i % 4) * 0.1)),
            durationMin: s.dur,
          })),
        },
        workingHours: {
          create: Array.from({ length: 7 }, (_, d) => ({
            dayOfWeek: d,
            openMin: d === 0 ? 12 * 60 : 10 * 60,
            closeMin: 21 * 60,
            closed: false,
          })),
        },
      },
    });

    // A completed booking + verified review per salon so ratings are real
    const svc = await prisma.service.findFirstOrThrow({ where: { salonId: salon.id } });
    const past = new Date();
    past.setDate(past.getDate() - 7 - i);
    past.setHours(15, 0, 0, 0);
    const booking = await prisma.booking.create({
      data: {
        code: `BB-${1000 + i}`,
        userId: customer.id,
        salonId: salon.id,
        startAt: past,
        durationMin: svc.durationMin,
        status: "COMPLETED",
        subtotal: svc.price,
        total: svc.price,
        paymentMethod: "CASH",
        items: { create: [{ serviceId: svc.id, name: svc.name, price: svc.price, durationMin: svc.durationMin }] },
        payment: { create: { method: "CASH", status: "PAID", amount: svc.price } },
      },
    });
    const reviewTexts = [
      "Booked a facial in under a minute. The salon was exactly as beautiful as the photos.",
      "Finally a way to compare real reviews before I trust someone with my hair.",
      "My whole bridal party booked through BeautyBook. Effortless and so elegant.",
    ];
    await prisma.review.create({
      data: {
        userId: customer.id,
        salonId: salon.id,
        bookingId: booking.id,
        rating: Math.round(def.rating),
        text: reviewTexts[i % reviewTexts.length],
      },
    });
    const agg = await prisma.review.aggregate({ where: { salonId: salon.id }, _avg: { rating: true }, _count: true });
    await prisma.salon.update({
      where: { id: salon.id },
      data: { reviewCount: agg._count, rating: def.rating },
    });
  }

  // ---- Coupons (the three homepage offers) ----
  const coupons = [
    { code: "BRIDAL30", type: "PERCENT" as const, value: 30, minTotal: 20000 },
    { code: "FIRSTGLOW", type: "PERCENT" as const, value: 100, minTotal: 0, maxUses: 1000 },
    { code: "SPADUO", type: "FIXED" as const, value: 2000, minTotal: 8000 },
  ];
  for (const c of coupons) {
    await prisma.coupon.upsert({ where: { code: c.code }, update: {}, create: c });
  }

  console.log("Seed complete.");
  console.log("Logins — admin@beautybook.pk / owner@beautybook.pk / ayesha@example.com, password: Password123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
