import "../src/config";
import { prisma } from "@beautybook/database";
import bcrypt from "bcryptjs";

const email = process.argv[2];
const password = process.argv[3];
if (!email) {
  console.error("Usage: ts-node scripts/make-admin.ts <email> [passwordIfCreating]");
  process.exit(1);
}

async function retry<T>(fn: () => Promise<T>, attempts = 5): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw lastErr;
}

async function main() {
  const existing = await retry(() => prisma.user.findUnique({ where: { email } }));
  if (existing) {
    const user = await prisma.user.update({
      where: { email },
      data: { role: "ADMIN", status: "ACTIVE" },
      select: { id: true, email: true, name: true, role: true, status: true },
    });
    console.log("Promoted existing user:", JSON.stringify(user));
  } else {
    if (!password) {
      console.error("User does not exist — pass a password to create the account.");
      process.exit(1);
    }
    const user = await prisma.user.create({
      data: {
        email,
        name: "Abdullah",
        passwordHash: await bcrypt.hash(password, 10),
        role: "ADMIN",
        status: "ACTIVE",
        emailVerified: true,
      },
      select: { id: true, email: true, name: true, role: true, status: true },
    });
    console.log("Created admin user:", JSON.stringify(user));
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
