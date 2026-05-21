import { DiaryStyle } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/users";

type CreateDiaryBody = {
  content?: string;
  source?: string;
  title?: string;
  mood?: string;
  keywords?: string[];
  diary?: string;
  style?: string;
  diaryDate?: string;
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
  entry: {
    id: string;
    content: string;
    source: string;
    histories: Array<{
      id: string;
      previousContent: string;
      nextContent: string;
      createdAt: Date;
    }>;
  } | null;
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
    entry: diary.entry
      ? {
          ...diary.entry,
          histories: diary.entry.histories.map((history) => ({
            ...history,
            createdAt: history.createdAt.toISOString(),
          })),
        }
      : null,
  };
}

function getDayRange(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

  return { start, end };
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ diaries: [] });
  }
  const diaries = await prisma.diary.findMany({
    where: { userId: user.id },
    include: {
      entry: {
        select: {
          id: true,
          content: true,
          source: true,
          histories: {
            select: {
              id: true,
              previousContent: true,
              nextContent: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: 5,
          },
        },
      },
    },
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

  if (body.content.trim().length > 300 || body.diary.trim().length > 500) {
    return NextResponse.json(
      { message: "content must be 300 characters or less and diary must be 500 characters or less" },
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

  const diaryCount = await prisma.diary.count({
    where: { userId: user.id },
  });
  if (diaryCount >= 10) {
    return NextResponse.json(
      { message: "사용 한도를 초과했습니다. 새로운 일기를 추가할 수 없습니다." },
      { status: 403 }
    );
  }

  const diaryDate = body.diaryDate ? new Date(body.diaryDate) : new Date();

  if (Number.isNaN(diaryDate.getTime())) {
    return NextResponse.json(
      { message: "diaryDate must be a valid date" },
      { status: 400 },
    );
  }

  const { start, end } = getDayRange(diaryDate);
  const existingDiary = await prisma.diary.findFirst({
    where: {
      userId: user.id,
      diaryDate: {
        gte: start,
        lt: end,
      },
    },
    select: { id: true },
  });

  if (existingDiary) {
    return NextResponse.json(
      { message: "Only one diary can be saved per day" },
      { status: 409 },
    );
  }

  const diary = await prisma.$transaction(async (tx) => {
    const entry = await tx.diaryEntry.create({
      data: {
        userId: user.id,
        content: body.content!.trim(),
        source: body.source?.trim() || "web",
        entryDate: diaryDate,
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
        diaryDate,
      },
      include: {
        entry: {
          select: {
            id: true,
            content: true,
            source: true,
            histories: {
              select: {
                id: true,
                previousContent: true,
                nextContent: true,
                createdAt: true,
              },
              orderBy: { createdAt: "desc" },
              take: 5,
            },
          },
        },
      },
    });
  });

  return NextResponse.json({ diary: toClientDiary(diary) }, { status: 201 });
}
