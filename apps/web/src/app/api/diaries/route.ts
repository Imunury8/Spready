import { DiaryStyle } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getDemoUser } from "@/lib/users";

type CreateDiaryBody = {
  content?: string;
  source?: string;
  title?: string;
  mood?: string;
  keywords?: string[];
  diary?: string;
  style?: string;
};

function toDiaryStyle(style: string | undefined): DiaryStyle {
  switch (style) {
    case "reflection":
      return DiaryStyle.REFLECTION;
    case "summary":
      return DiaryStyle.SUMMARY;
    default:
      return DiaryStyle.DIARY;
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

export async function GET() {
  const user = await getDemoUser();
  const diaries = await prisma.diary.findMany({
    where: { userId: user.id },
    include: { entry: { select: { content: true, source: true } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ diaries: diaries.map(toClientDiary) });
}

export async function POST(request: Request) {
  const body = (await request.json()) as CreateDiaryBody;

  if (!body.content?.trim() || !body.title?.trim() || !body.diary?.trim()) {
    return NextResponse.json(
      { message: "content, title, and diary are required" },
      { status: 400 },
    );
  }

  const user = await getDemoUser();
  const diary = await prisma.$transaction(async (tx) => {
    const entry = await tx.diaryEntry.create({
      data: {
        userId: user.id,
        content: body.content!.trim(),
        source: body.source?.trim() || "web",
      },
    });

    return tx.diary.create({
      data: {
        userId: user.id,
        entryId: entry.id,
        title: body.title!.trim(),
        mood: body.mood?.trim() || "미분류",
        keywords: body.keywords?.filter(Boolean).slice(0, 8) ?? [],
        body: body.diary!.trim(),
        style: toDiaryStyle(body.style),
      },
      include: { entry: { select: { content: true, source: true } } },
    });
  });

  return NextResponse.json({ diary: toClientDiary(diary) }, { status: 201 });
}
