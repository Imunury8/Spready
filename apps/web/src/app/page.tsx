"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  CalendarDays,
  Check,
  Loader2,
  Save,
  Send,
  Sparkles,
} from "lucide-react";
import {
  DiaryResponse,
  SavedDiary,
  generateDiary,
  listDiaries,
  saveDiary,
} from "@/lib/api";

export default function Home() {
  const [content, setContent] = useState("");
  const [result, setResult] = useState<DiaryResponse | null>(null);
  const [diaries, setDiaries] = useState<SavedDiary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    listDiaries()
      .then(setDiaries)
      .catch(() => {
        setError("저장된 기록을 불러오지 못했습니다. DATABASE_URL과 PostgreSQL 상태를 확인해주세요.");
      });
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!content.trim()) {
      return;
    }

    setIsLoading(true);
    setError("");
    setIsSaved(false);

    try {
      const diary = await generateDiary(content);
      setResult(diary);
    } catch {
      setError("일기를 생성하지 못했습니다. API 서버 상태를 확인해주세요.");
    } finally {
      setIsLoading(false);
    }
  }

  async function onSave() {
    if (!result || !content.trim()) {
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const savedDiary = await saveDiary(content, result);
      setDiaries((current) => [savedDiary, ...current]);
      setIsSaved(true);
    } catch {
      setError("일기를 저장하지 못했습니다. PostgreSQL과 Prisma 설정을 확인해주세요.");
    } finally {
      setIsSaving(false);
    }
  }

  function selectDiary(diary: SavedDiary) {
    setResult({
      title: diary.title,
      mood: diary.mood,
      keywords: diary.keywords,
      diary: diary.diary,
    });
    setContent(diary.entry?.content ?? "");
    setIsSaved(true);
    setError("");
  }

  return (
    <main className="min-h-screen">
      <section className="mx-auto grid min-h-screen max-w-7xl gap-6 px-5 py-8 lg:grid-cols-[380px_minmax(0,1fr)_300px] lg:items-start lg:px-8">
        <div className="space-y-6">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white px-3 py-1 text-sm text-[var(--muted)]">
              <Sparkles size={16} />
              AI 일기 챗봇
            </div>
            <h1 className="text-4xl font-semibold tracking-normal text-[var(--foreground)] md:text-5xl">
              오늘의 감정과 생각을 일기로 정리합니다
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-[var(--muted)]">
              짧은 메모, 감정, 링크를 남기면 AI가 하루의 흐름을 분석해
              일기와 회고 초안을 만듭니다.
            </p>
          </div>

          <form
            onSubmit={onSubmit}
            className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4 shadow-sm"
          >
            <label
              htmlFor="entry"
              className="mb-3 block text-sm font-medium text-[var(--foreground)]"
            >
              오늘 남길 기록
            </label>
            <textarea
              id="entry"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={8}
              placeholder="예: 오늘은 집중이 잘 됐다. 점심 때 본 생산성 글이 인상 깊었고, 밤에는 조금 지쳤다."
              className="w-full resize-none rounded-md border border-[var(--line)] bg-white p-3 text-sm leading-6 outline-none transition focus:border-[var(--accent)]"
            />
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-sm text-[var(--muted)]">
                <CalendarDays size={16} />
                매일 21:00 생성 예정
              </span>
              <button
                type="submit"
                disabled={isLoading || !content.trim()}
                className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                생성
              </button>
            </div>
          </form>

          {error ? <p className="text-sm text-red-700">{error}</p> : null}
        </div>

        <section className="min-h-[560px] rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between border-b border-[var(--line)] pb-4">
            <div>
              <p className="text-sm text-[var(--muted)]">오늘의 회고</p>
              <h2 className="mt-1 text-2xl font-semibold">
                {result?.title ?? "아직 생성된 일기가 없습니다"}
              </h2>
            </div>
            <span className="rounded-full bg-teal-50 px-3 py-1 text-sm font-medium text-teal-800">
              {result?.mood ?? "대기"}
            </span>
          </div>

          {result ? (
            <div className="space-y-5">
              <p className="whitespace-pre-wrap text-base leading-8 text-[var(--foreground)]">
                {result.diary}
              </p>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {result.keywords.map((keyword) => (
                    <span
                      key={keyword}
                      className="rounded-full border border-[var(--line)] px-3 py-1 text-sm text-[var(--muted)]"
                    >
                      #{keyword}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={onSave}
                  disabled={isSaving || isSaved}
                  className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : isSaved ? (
                    <Check size={18} />
                  ) : (
                    <Save size={18} />
                  )}
                  {isSaved ? "저장됨" : "저장"}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid min-h-80 place-items-center rounded-md border border-dashed border-[var(--line)] bg-[#fbfaf8] p-6 text-center text-[var(--muted)]">
              왼쪽 입력창에 오늘의 기록을 남기고 생성 버튼을 눌러보세요.
            </div>
          )}
        </section>

        <aside className="rounded-lg border border-[var(--line)] bg-white p-4 shadow-sm">
          <div className="mb-4">
            <p className="text-sm text-[var(--muted)]">아카이브</p>
            <h2 className="mt-1 text-xl font-semibold">최근 기록</h2>
          </div>
          {diaries.length ? (
            <div className="space-y-3">
              {diaries.map((diary) => (
                <button
                  key={diary.id}
                  type="button"
                  onClick={() => selectDiary(diary)}
                  className="block w-full rounded-md border border-[var(--line)] bg-[#fbfaf8] p-3 text-left transition hover:border-[var(--accent)] hover:bg-white"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-[var(--foreground)]">
                      {diary.title}
                    </span>
                    <span className="shrink-0 text-xs text-[var(--muted)]">
                      {new Date(diary.createdAt).toLocaleDateString("ko-KR", {
                        month: "2-digit",
                        day: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm leading-5 text-[var(--muted)]">
                    {diary.diary}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-[var(--line)] bg-[#fbfaf8] p-4 text-sm leading-6 text-[var(--muted)]">
              저장된 일기가 없습니다. 생성한 일기를 저장하면 이곳에 표시됩니다.
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}
