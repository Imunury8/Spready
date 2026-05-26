import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/users";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "로그인이 필요합니다" }, { status: 401 });
  }

  return NextResponse.json({ reminderHour: user.reminderHour });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "로그인이 필요합니다" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { reminderHour } = body;

    if (typeof reminderHour !== "number" || reminderHour < 0 || reminderHour > 23) {
      return NextResponse.json(
        { message: "유효하지 않은 생성 시간입니다. (0 ~ 23 범위)" },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { reminderHour },
    });

    return NextResponse.json({ reminderHour: updatedUser.reminderHour });
  } catch {
    return NextResponse.json(
      { message: "설정을 저장하지 못했습니다." },
      { status: 500 }
    );
  }
}
