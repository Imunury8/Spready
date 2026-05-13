import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getDemoUser } from "@/lib/users";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const user = await getDemoUser();

  const diary = await prisma.diary.findFirst({
    where: {
      id,
      userId: user.id,
    },
    select: {
      id: true,
      entryId: true,
    },
  });

  if (!diary) {
    return NextResponse.json({ message: "Diary not found" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.diary.delete({
      where: { id: diary.id },
    });

    if (diary.entryId) {
      const remainingDiaryCount = await tx.diary.count({
        where: { entryId: diary.entryId },
      });

      if (remainingDiaryCount === 0) {
        await tx.diaryEntry.delete({
          where: { id: diary.entryId },
        });
      }
    }
  });

  return NextResponse.json({ ok: true });
}
