const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export type DiaryResponse = {
  title: string;
  mood: string;
  keywords: string[];
  diary: string;
};

export type SavedDiary = DiaryResponse & {
  id: string;
  style: string;
  diaryDate: string;
  createdAt: string;
  entry: {
    content: string;
    source: string;
  } | null;
};

export async function generateDiary(content: string): Promise<DiaryResponse> {
  const response = await fetch(`${API_BASE_URL}/api/diary/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      entries: [
        {
          content,
          source: "web",
        },
      ],
      style: "diary",
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to generate diary");
  }

  return response.json();
}

export async function listDiaries(): Promise<SavedDiary[]> {
  const response = await fetch("/api/diaries", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to load diaries");
  }

  const data = (await response.json()) as { diaries: SavedDiary[] };
  return data.diaries;
}

export async function saveDiary(
  content: string,
  diary: DiaryResponse,
  style = "diary",
): Promise<SavedDiary> {
  const response = await fetch("/api/diaries", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content,
      source: "web",
      style,
      ...diary,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to save diary");
  }

  const data = (await response.json()) as { diary: SavedDiary };
  return data.diary;
}
