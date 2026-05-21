import { DiaryStyle } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/users";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type UpdateDiaryBody = {
  content?: string;
  title?: string;
  mood?: string;
  keywords?: string[];
  diary?: string;
  style?: string;
};

function toDiaryStyle(style: string | undefined): DiaryStyle | undefined {
  switch (style) {
    case "diary":
      return DiaryStyle.DIARY;
    case "reflection":
      return DiaryStyle.REFLECTION;
    case "summary":
      return DiaryStyle.SUMMARY;
    default:
      return undefined;
  }
}

function toClientDiary(diary: {
  id: string;
  title: string;
  mood: string;
  keywords: string[];
  body: string;
  style: DiaryStyle;
  diaryDate: Date;
  createdAt: Date;
  entry: { content: string; source: string } | null;
}) {
  return {
    id: diary.id,
    title: diary.title,
    mood: diary.mood,
    keywords: diary.keywords,
    diary: diary.body,
    style: diary.style.toLowerCase(),
    diaryDate: diary.diaryDate.toISOString(),
    createdAt: diary.createdAt.toISOString(),
    entry: diary.entry,
  };
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = (await request.json()) as UpdateDiaryBody;

  if (!body.title?.trim() || !body.diary?.trim()) {
    return NextResponse.json(
      { message: "title and diary are required" },
      { status: 400 },
    );
  }

  if (
    (body.content?.trim().length ?? 0) > 300 ||
    body.diary.trim().length > 800
  ) {
    return NextResponse.json(
      { message: "content must be 300 characters or less and diary must be 800 characters or less" },
      { status: 400 },
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { message: "로그인이 필요합니다" },
      { status: 401 }
    );
  }
  const existingDiary = await prisma.diary.findFirst({
    where: {
      id,
      userId: user.id,
    },
    select: {
      id: true,
      entryId: true,
    },
  });

  if (!existingDiary) {
    return NextResponse.json({ message: "Diary not found" }, { status: 404 });
  }

  const style = toDiaryStyle(body.style);
  const diary = await prisma.$transaction(async (tx) => {
    if (existingDiary.entryId && body.content?.trim()) {
      await tx.diaryEntry.update({
        where: { id: existingDiary.entryId },
        data: { content: body.content.trim() },
      });
    }

    return tx.diary.update({
      where: { id: existingDiary.id },
      data: {
        title: body.title!.trim(),
        mood: body.mood?.trim() || "미분류",
        keywords: body.keywords?.filter(Boolean).slice(0, 8) ?? [],
        body: body.diary!.trim(),
        ...(style ? { style } : {}),
      },
      include: { entry: { select: { content: true, source: true } } },
    });
  });

  return NextResponse.json({ diary: toClientDiary(diary) });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { message: "로그인이 필요합니다" },
      { status: 401 }
    );
  }

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
