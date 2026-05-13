import { NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8000";

export async function POST(request: Request) {
  const response = await fetch(`${API_BASE_URL}/api/diary/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: await request.text(),
  });

  const data = await response.text();

  return new NextResponse(data, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") ?? "application/json",
    },
  });
}
