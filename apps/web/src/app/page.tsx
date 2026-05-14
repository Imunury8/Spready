"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Menu,
  Pencil,
  Plus,
  Save,
  Sparkles,
  UserCircle,
  X,
} from "lucide-react";

import {
  DiaryResponse,
  SavedDiary,
  createDiary,
  generateDiary,
  listDiaries,
  updateDiary,
} from "@/lib/api";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

type EditorState = {
  content: string;
  direction: string;
};

type ReviewState = {
  mode: "new" | "edit";
  diaryId: string | null;
  sourceContent: string;
  aiDiary: DiaryResponse;
};

const EMPTY_EDITOR: EditorState = {
  content: "",
  direction: "",
};

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function toDisplayDate(date: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(date);
}

function getMonthDays(month: Date) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0);
  const days: Array<Date | null> = [];

  for (let index = 0; index < firstDay.getDay(); index += 1) {
    days.push(null);
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    days.push(new Date(year, monthIndex, day));
  }

  return days;
}

function buildAiPrompt(editor: EditorState, selectedDate: Date) {
  return [
    `날짜: ${toDisplayDate(selectedDate)}`,
    editor.direction.trim()
      ? `사용자가 원하는 수정 방향: ${editor.direction.trim()}`
      : "사용자가 원하는 수정 방향: 자연스럽고 진솔한 한국어 일기",
    "원문:",
    editor.content.trim(),
  ].join("\n");
}

export default function Home() {
  const [diaries, setDiaries] = useState<SavedDiary[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [view, setView] = useState<"diary" | "calendar">("diary");
  const [editingDiaryId, setEditingDiaryId] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState>(EMPTY_EDITOR);
  const [review, setReview] = useState<ReviewState | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    listDiaries()
      .then((loadedDiaries) => {
        setDiaries(loadedDiaries);

        if (loadedDiaries[0]) {
          const latestDate = new Date(loadedDiaries[0].diaryDate);
          setSelectedDate(latestDate);
          setVisibleMonth(
            new Date(latestDate.getFullYear(), latestDate.getMonth(), 1),
          );
        }
      })
      .catch(() => {
        setError(
          "저장된 기록을 불러오지 못했습니다. 서버와 데이터베이스 상태를 확인해주세요.",
        );
      });
  }, []);

  const diariesByDate = useMemo(() => {
    return diaries.reduce<Record<string, SavedDiary[]>>((acc, diary) => {
      const key = toDateKey(new Date(diary.diaryDate));
      acc[key] = [...(acc[key] ?? []), diary];
      return acc;
    }, {});
  }, [diaries]);

  const selectedDateKey = toDateKey(selectedDate);
  const selectedDiaries = diariesByDate[selectedDateKey] ?? [];
  const selectedDiary = selectedDiaries[0] ?? null;
  const monthDays = getMonthDays(visibleMonth);
  const monthLabel = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
  }).format(visibleMonth);

  function moveMonth(direction: -1 | 1) {
    setVisibleMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + direction, 1),
    );
  }

  function selectDate(date: Date) {
    setSelectedDate(date);
    setView("diary");
    setEditingDiaryId(null);
    setReview(null);
    setEditor(EMPTY_EDITOR);
    setError("");
  }

  function startCreate() {
    setEditingDiaryId("new");
    setReview(null);
    setEditor(EMPTY_EDITOR);
    setError("");
  }

  function startEdit(diary: SavedDiary) {
    setEditingDiaryId(diary.id);
    setReview(null);
    setEditor({
      content: diary.entry?.content || diary.diary,
      direction: "기존 일기를 더 자연스럽고 읽기 좋게 다듬어줘.",
    });
    setError("");
  }

  function cancelWork() {
    setEditingDiaryId(null);
    setReview(null);
    setEditor(EMPTY_EDITOR);
    setError("");
  }

  async function generateReview() {
    if (!editor.content.trim()) {
      setError("AI가 다듬을 원문을 입력해주세요.");
      return;
    }

    setIsGenerating(true);
    setError("");

    try {
      const aiDiary = await generateDiary(buildAiPrompt(editor, selectedDate));
      setReview({
        mode: editingDiaryId === "new" ? "new" : "edit",
        diaryId: editingDiaryId === "new" ? null : editingDiaryId,
        sourceContent: editor.content.trim(),
        aiDiary,
      });
    } catch {
      setError("AI가 일기를 다듬지 못했습니다. API 서버 상태를 확인해주세요.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function confirmSave() {
    if (!review) {
      return;
    }

    setIsSaving(true);
    setError("");

    const payload = {
      content: review.sourceContent,
      title: review.aiDiary.title,
      mood: review.aiDiary.mood,
      keywords: review.aiDiary.keywords,
      diary: review.aiDiary.diary,
      diaryDate: selectedDate.toISOString(),
      style: "diary",
    };

    try {
      if (review.mode === "new") {
        const createdDiary = await createDiary(payload);
        setDiaries((current) => [createdDiary, ...current]);
      } else if (review.diaryId) {
        const updatedDiary = await updateDiary(review.diaryId, payload);
        setDiaries((current) =>
          current.map((diary) =>
            diary.id === updatedDiary.id ? updatedDiary : diary,
          ),
        );
      }

      cancelWork();
    } catch {
      setError("검토한 일기를 저장하지 못했습니다. 서버 상태를 확인해주세요.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <section className="mx-auto flex min-h-[calc(100vh-40px)] max-w-4xl flex-col overflow-hidden rounded-lg border border-[var(--line)] bg-white shadow-sm">
        <header className="flex min-h-16 items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={() =>
              setView((current) => (current === "calendar" ? "diary" : "calendar"))
            }
            aria-label="달력 열기"
            title="달력"
            className="grid size-10 shrink-0 place-items-center rounded-md border border-[var(--line)] text-[var(--foreground)] transition hover:border-[var(--accent)] hover:bg-[#fbfaf8]"
          >
            <Menu size={22} />
          </button>

          <div className="min-w-0 text-center">
            <p className="text-xs text-[var(--muted)]">
              {view === "calendar" ? "날짜 선택" : "일기 보기"}
            </p>
            <h1 className="truncate text-lg font-semibold text-[var(--foreground)] sm:text-xl">
              AI Diary
            </h1>
          </div>

          <button
            type="button"
            aria-label="회원 정보"
            title="회원 정보"
            className="grid size-10 shrink-0 place-items-center rounded-md border border-[var(--line)] text-[var(--muted)]"
          >
            <UserCircle size={24} />
          </button>
        </header>

        {error ? (
          <p className="border-b border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {view === "calendar" ? (
          <div className="flex-1 p-4 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => moveMonth(-1)}
                aria-label="이전 달"
                title="이전 달"
                className="grid size-10 place-items-center rounded-md border border-[var(--line)] text-[var(--foreground)] transition hover:border-[var(--accent)]"
              >
                <ChevronLeft size={20} />
              </button>
              <h2 className="text-xl font-semibold">{monthLabel}</h2>
              <button
                type="button"
                onClick={() => moveMonth(1)}
                aria-label="다음 달"
                title="다음 달"
                className="grid size-10 place-items-center rounded-md border border-[var(--line)] text-[var(--foreground)] transition hover:border-[var(--accent)]"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            <div className="grid grid-cols-7 border-y border-[var(--line)] text-center text-xs font-medium text-[var(--muted)]">
              {WEEKDAYS.map((weekday) => (
                <div key={weekday} className="py-3">
                  {weekday}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 pt-3 sm:gap-2">
              {monthDays.map((date, index) => {
                if (!date) {
                  return <div key={`blank-${index}`} className="aspect-square" />;
                }

                const key = toDateKey(date);
                const hasDiary = Boolean(diariesByDate[key]?.length);
                const isSelected = key === selectedDateKey;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => selectDate(date)}
                    className={[
                      "relative aspect-square rounded-md border text-sm transition",
                      isSelected
                        ? "border-[var(--accent)] bg-teal-50 text-teal-900"
                        : "border-[var(--line)] bg-[#fbfaf8] text-[var(--foreground)] hover:border-[var(--accent)] hover:bg-white",
                    ].join(" ")}
                  >
                    <span className="absolute left-2 top-2">{date.getDate()}</span>
                    {hasDiary ? (
                      <span className="absolute bottom-2 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-[var(--accent)]" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ) : review ? (
          <article className="flex flex-1 flex-col p-5 sm:p-7">
            <div className="mb-6 flex flex-col gap-3 border-b border-[var(--line)] pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="inline-flex items-center gap-2 text-sm text-[var(--muted)]">
                  <Sparkles size={16} />
                  AI가 다듬은 일기를 검토하세요
                </p>
                <h2 className="mt-2 text-2xl font-semibold leading-tight text-[var(--foreground)] sm:text-3xl">
                  {review.aiDiary.title}
                </h2>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setReview(null)}
                  className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium text-[var(--foreground)] transition hover:border-[var(--accent)]"
                >
                  <Pencil size={16} />
                  다시 수정
                </button>
                <button
                  type="button"
                  onClick={confirmSave}
                  disabled={isSaving}
                  className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <Save size={16} />
                  )}
                  DB 저장
                </button>
              </div>
            </div>

            <div className="space-y-5">
              <span className="w-fit rounded-full bg-teal-50 px-3 py-1 text-sm font-medium text-teal-800">
                {review.aiDiary.mood}
              </span>
              <p className="whitespace-pre-wrap text-base leading-8 text-[var(--foreground)]">
                {review.aiDiary.diary}
              </p>
              <div className="flex flex-wrap gap-2">
                {review.aiDiary.keywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="rounded-full border border-[var(--line)] px-3 py-1 text-sm text-[var(--muted)]"
                  >
                    #{keyword}
                  </span>
                ))}
              </div>
            </div>
          </article>
        ) : editingDiaryId ? (
          <article className="flex flex-1 flex-col p-5 sm:p-7">
            <div className="mb-6 flex flex-col gap-3 border-b border-[var(--line)] pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="inline-flex items-center gap-2 text-sm text-[var(--muted)]">
                  <CalendarDays size={16} />
                  {toDisplayDate(selectedDate)}
                </p>
                <h2 className="mt-2 text-2xl font-semibold leading-tight text-[var(--foreground)] sm:text-3xl">
                  {editingDiaryId === "new" ? "일기 작성" : "일기 수정"}
                </h2>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={cancelWork}
                  className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium text-[var(--foreground)] transition hover:border-[var(--accent)]"
                >
                  <X size={16} />
                  취소
                </button>
                <button
                  type="button"
                  onClick={generateReview}
                  disabled={isGenerating}
                  className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isGenerating ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <Sparkles size={16} />
                  )}
                  AI 다듬기
                </button>
              </div>
            </div>

            <div className="grid gap-4">
              <label className="grid gap-2 text-sm font-medium text-[var(--foreground)]">
                원하는 방향
                <input
                  value={editor.direction}
                  onChange={(event) =>
                    setEditor((current) => ({
                      ...current,
                      direction: event.target.value,
                    }))
                  }
                  placeholder="예: 담백하게, 감성적으로, 짧게 요약해서"
                  className="min-h-11 rounded-md border border-[var(--line)] bg-white px-3 text-sm outline-none transition focus:border-[var(--accent)]"
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-[var(--foreground)]">
                원문
                <textarea
                  value={editor.content}
                  onChange={(event) =>
                    setEditor((current) => ({
                      ...current,
                      content: event.target.value,
                    }))
                  }
                  rows={12}
                  placeholder="오늘 있었던 일이나 수정하고 싶은 일기를 적어주세요."
                  className="resize-none rounded-md border border-[var(--line)] bg-white p-3 text-sm leading-7 outline-none transition focus:border-[var(--accent)]"
                />
              </label>
            </div>
          </article>
        ) : (
          <article className="flex flex-1 flex-col p-5 sm:p-7">
            <div className="mb-6 flex flex-col gap-3 border-b border-[var(--line)] pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="inline-flex items-center gap-2 text-sm text-[var(--muted)]">
                  <CalendarDays size={16} />
                  {toDisplayDate(selectedDate)}
                </p>
                <h2 className="mt-2 text-2xl font-semibold leading-tight text-[var(--foreground)] sm:text-3xl">
                  {selectedDiary?.title ?? "저장된 일기가 없습니다"}
                </h2>
              </div>
              {selectedDiary ? (
                <button
                  type="button"
                  onClick={() => startEdit(selectedDiary)}
                  className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium text-[var(--foreground)] transition hover:border-[var(--accent)]"
                >
                  <Pencil size={16} />
                  수정
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startCreate}
                  className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] transition hover:bg-teal-800"
                >
                  <Plus size={16} />
                  작성
                </button>
              )}
            </div>

            {selectedDiaries.length ? (
              <div className="space-y-8">
                {selectedDiaries.map((diary) => (
                  <section key={diary.id} className="space-y-5">
                    {selectedDiaries.length > 1 ? (
                      <h3 className="text-lg font-semibold">{diary.title}</h3>
                    ) : null}
                    <span className="w-fit rounded-full bg-teal-50 px-3 py-1 text-sm font-medium text-teal-800">
                      {diary.mood}
                    </span>
                    <p className="whitespace-pre-wrap text-base leading-8 text-[var(--foreground)]">
                      {diary.diary}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {diary.keywords.map((keyword) => (
                        <span
                          key={`${diary.id}-${keyword}`}
                          className="rounded-full border border-[var(--line)] px-3 py-1 text-sm text-[var(--muted)]"
                        >
                          #{keyword}
                        </span>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="grid flex-1 place-items-center rounded-md border border-dashed border-[var(--line)] bg-[#fbfaf8] p-6 text-center text-[var(--muted)]">
                작성 버튼을 눌러 AI가 다듬을 원문을 입력하세요.
              </div>
            )}
          </article>
        )}
      </section>
    </main>
  );
}
