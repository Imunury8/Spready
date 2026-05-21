const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

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
    id: string;
    content: string;
    source: string;
    histories: Array<{
      id: string;
      previousContent: string;
      nextContent: string;
      createdAt: string;
    }>;
  } | null;
};

export type DiaryPayload = DiaryResponse & {
  content: string;
  diaryDate?: string;
  style?: string;
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

export async function createDiary(payload: DiaryPayload): Promise<SavedDiary> {
  const response = await fetch("/api/diaries", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      source: "web",
      style: "diary",
      ...payload,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to create diary");
  }

  const data = (await response.json()) as { diary: SavedDiary };
  return data.diary;
}

export async function updateDiary(
  id: string,
  payload: DiaryPayload,
): Promise<SavedDiary> {
  const response = await fetch(`/api/diaries/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      style: "diary",
      ...payload,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to update diary");
  }

  const data = (await response.json()) as { diary: SavedDiary };
  return data.diary;
}

export async function deleteDiary(id: string): Promise<void> {
  const response = await fetch(`/api/diaries/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to delete diary");
  }
}

export async function getUserPreference(): Promise<number> {
  const response = await fetch("/api/user/preference");
  if (!response.ok) {
    throw new Error("Failed to load preference");
  }
  const data = (await response.json()) as { reminderHour: number };
  return data.reminderHour;
}

export async function updateUserPreference(reminderHour: number): Promise<number> {
  const response = await fetch("/api/user/preference", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ reminderHour }),
  });
  if (!response.ok) {
    throw new Error("Failed to update preference");
  }
  const data = (await response.json()) as { reminderHour: number };
  return data.reminderHour;
}
