import "../src/config";
import { prisma } from "@beautybook/database";

// Removes smoke-test artifacts: salons/users created with timestamped test names/emails.
async function main() {
  const salons = await prisma.salon.deleteMany({
    where: { OR: [{ name: { startsWith: "Glow Studio 1" } }, { name: { startsWith: "Customer Salon 1" } }] },
  });
  const users = await prisma.user.deleteMany({
    where: { OR: [{ email: { startsWith: "partner1", endsWith: "@test.pk" } }, { email: { startsWith: "cust1", endsWith: "@test.pk" } }, { email: { startsWith: "evil1", endsWith: "@test.pk" } }] },
  });
  console.log(`deleted salons: ${salons.count}, users: ${users.count}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
