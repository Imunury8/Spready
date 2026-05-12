import { prisma } from "@/lib/db";

export const DEMO_USER_EMAIL = "demo@ai-diary.local";

export async function getDemoUser() {
  return prisma.user.upsert({
    where: { email: DEMO_USER_EMAIL },
    update: {},
    create: {
      email: DEMO_USER_EMAIL,
      displayName: "Demo User",
    },
  });
}
