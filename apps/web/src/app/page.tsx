"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  CalendarDays,
  Check,
  Loader2,
  Save,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  DiaryResponse,
  SavedDiary,
  deleteDiary,
  generateDiary,
  listDiaries,
  saveDiary,
} from "@/lib/api";

export default function Home() {
  const [content, setContent] = useState("");
  const [result, setResult] = useState<DiaryResponse | null>(null);
  const [selectedDiaryId, setSelectedDiaryId] = useState<string | null>(null);
  const [diaries, setDiaries] = useState<SavedDiary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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
      setSelectedDiaryId(null);
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
      setSelectedDiaryId(savedDiary.id);
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
    setSelectedDiaryId(diary.id);
    setIsSaved(true);
    setError("");
  }

  async function onDeleteDiary(id: string) {
    setDeletingId(id);
    setError("");

    try {
      await deleteDiary(id);
      setDiaries((current) => current.filter((diary) => diary.id !== id));
      if (selectedDiaryId === id) {
        setResult(null);
        setSelectedDiaryId(null);
        setIsSaved(false);
      }
    } catch {
      setError("저장된 일기를 삭제하지 못했습니다.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="min-h-screen">
      <section className="mx-auto grid min-h-screen max-w-7xl grid-rows-[auto_1fr] gap-6 px-5 py-8 lg:px-8">
        <header className="flex flex-col gap-4 rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[#fbfaf8] px-3 py-1 text-sm text-[var(--muted)]">
              <Sparkles size={16} />
              AI 일기 챗봇
            </div>
            <h1 className="text-3xl font-semibold tracking-normal text-[var(--foreground)] sm:text-3xl lg:text-4xl">
              오늘의 감정과 생각을 일기로 정리합니다
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted)]">
              짧은 메모, 감정, 링크를 남기면 AI가 하루의 흐름을 분석해
              일기와 회고 초안을 만듭니다.
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-md border border-[var(--line)] bg-[#fbfaf8] px-3 py-2 text-sm text-[var(--muted)]">
            <CalendarDays size={16} />
            매일 21:00 생성 예정
          </span>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(300px,380px)_minmax(0,1fr)] xl:grid-cols-[minmax(320px,380px)_minmax(0,1fr)_320px]">
        <div className="space-y-6">
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
            <div className="mt-4 flex items-center justify-end gap-3">
              <span className="inline-flex items-center gap-2 text-sm text-[var(--muted)]">
                {content.trim().length.toLocaleString("ko-KR")}자
              </span>
              <button
                type="submit"
                disabled={isLoading || !content.trim()}
                className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Send size={18} />
                )}
                생성
              </button>
            </div>
          </form>

          {error ? <p className="text-sm text-red-700">{error}</p> : null}
        </div>

        <section className="min-h-[560px] rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 border-b border-[var(--line)] pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm text-[var(--muted)]">오늘의 회고</p>
              <h2 className="mt-1 text-2xl font-semibold leading-tight">
                {result?.title ?? "아직 생성된 일기가 없습니다"}
              </h2>
            </div>
            <span className="w-fit shrink-0 rounded-full bg-teal-50 px-3 py-1 text-sm font-medium text-teal-800">
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

        <aside className="rounded-lg border border-[var(--line)] bg-white p-4 shadow-sm lg:col-span-2 xl:col-span-1">
          <div className="mb-4">
            <p className="text-sm text-[var(--muted)]">아카이브</p>
            <h2 className="mt-1 text-xl font-semibold">최근 기록</h2>
          </div>
          {diaries.length ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {diaries.map((diary) => (
                <article
                  key={diary.id}
                  className="rounded-md border border-[var(--line)] bg-[#fbfaf8] p-3 transition hover:border-[var(--accent)] hover:bg-white"
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => selectDiary(diary)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="block truncate text-sm font-medium text-[var(--foreground)]">
                        {diary.title}
                      </span>
                      <span className="mt-1 block text-xs text-[var(--muted)]">
                        {new Date(diary.createdAt).toLocaleDateString("ko-KR", {
                          month: "2-digit",
                          day: "2-digit",
                        })}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteDiary(diary.id)}
                      disabled={deletingId === diary.id}
                      aria-label={`${diary.title} 삭제`}
                      title="삭제"
                      className="grid size-8 shrink-0 place-items-center rounded-md border border-transparent text-[var(--muted)] transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingId === diary.id ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => selectDiary(diary)}
                    className="mt-2 block w-full text-left"
                  >
                    <span className="line-clamp-3 text-sm leading-5 text-[var(--muted)]">
                    {diary.diary}
                    </span>
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-[var(--line)] bg-[#fbfaf8] p-4 text-sm leading-6 text-[var(--muted)]">
              저장된 일기가 없습니다. 생성한 일기를 저장하면 이곳에 표시됩니다.
            </div>
          )}
        </aside>
        </div>
      </section>
    </main>
  );
}
