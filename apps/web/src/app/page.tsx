"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Pencil,
  Plus,
  Save,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import {
  DiaryResponse,
  SavedDiary,
  createDiary,
  deleteDiary,
  generateDiary,
  listDiaries,
  updateDiary,
} from "@/lib/api";
import { ProfileCard } from "@/app/components/profile-card";

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
  const [editingDiaryId, setEditingDiaryId] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState>(EMPTY_EDITOR);
  const [review, setReview] = useState<ReviewState | null>(null);
  const [generationTime, setGenerationTime] = useState("21:00");
  const [generationOpen, setGenerationOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingDiaryId, setDeletingDiaryId] = useState<string | null>(null);
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

  async function removeDiary(diary: SavedDiary) {
    setDeletingDiaryId(diary.id);
    setError("");

    try {
      await deleteDiary(diary.id);
      setDiaries((current) =>
        current.filter((currentDiary) => currentDiary.id !== diary.id),
      );

      if (editingDiaryId === diary.id) {
        cancelWork();
      }
    } catch {
      setError("일기를 삭제하지 못했습니다. 서버 상태를 확인해주세요.");
    } finally {
      setDeletingDiaryId(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto grid min-h-[calc(100vh-32px)] max-w-7xl items-stretch gap-6 lg:min-h-[calc(100vh-48px)] lg:grid-cols-[minmax(320px,1fr)_minmax(0,2fr)]">
        <aside className="flex min-w-0 flex-col gap-5">
          <div className="px-1 sm:px-2">
            <div className="mb-2 flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-slate-900 font-bold text-white">
                S
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Spready</h1>
                <p className="text-xs text-slate-400">
                  흩어진 하루를 하나의 일기로
                </p>
              </div>
            </div>
          </div>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <button
                type="button"
                onClick={() => moveMonth(-1)}
                aria-label="이전 달"
                className="grid size-9 place-items-center rounded-xl text-slate-700 hover:bg-slate-100"
              >
                <ChevronLeft size={19} />
              </button>
              <h2 className="font-bold text-slate-900">{monthLabel}</h2>
              <button
                type="button"
                onClick={() => moveMonth(1)}
                aria-label="다음 달"
                className="grid size-9 place-items-center rounded-xl text-slate-700 hover:bg-slate-100"
              >
                <ChevronRight size={19} />
              </button>
            </div>

            <div className="mb-2 grid grid-cols-7 text-center text-xs text-slate-400">
              {WEEKDAYS.map((weekday) => (
                <div key={weekday}>{weekday}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {monthDays.map((date, index) => {
                if (!date) {
                  return <div key={`blank-${index}`} className="h-10" />;
                }

                const key = toDateKey(date);
                const hasDiary = Boolean(diariesByDate[key]?.length);
                const isSelected = key === selectedDateKey;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => selectDate(date)}
                    aria-label={`${date.getDate()}일 ${
                      hasDiary ? "저장된 일기 있음" : "저장된 일기 없음"
                    }`}
                    className={[
                      "relative h-10 rounded-xl text-sm transition",
                      isSelected
                        ? "bg-slate-900 text-white"
                        : "text-slate-700 hover:bg-slate-100",
                    ].join(" ")}
                  >
                    {date.getDate()}
                    {hasDiary ? (
                      <span
                        className={[
                          "absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full",
                          isSelected ? "bg-white" : "bg-slate-900",
                        ].join(" ")}
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <ProfileCard />

            <div className="mb-3 rounded-2xl bg-slate-50 p-3">
              <p className="mb-2 text-xs font-semibold text-slate-400">
                생성 시간
              </p>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setGenerationOpen((current) => !current)}
                  className="flex h-10 w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-4 text-sm text-slate-800"
                  aria-label="생성 시간 선택"
                >
                  <span>{generationTime}</span>
                  <Clock size={15} />
                </button>

                {generationOpen ? (
                  <div className="absolute left-0 right-0 top-11 z-20 overflow-hidden rounded-lg border border-slate-300 bg-white shadow-lg">
                    {["21:00", "22:00", "23:00", "00:00"].map((time) => (
                      <button
                        key={time}
                        type="button"
                        onClick={() => {
                          setGenerationTime(time);
                          setGenerationOpen(false);
                        }}
                        className={[
                          "flex h-10 w-full items-center px-4 text-left text-sm hover:bg-slate-50",
                          generationTime === time
                            ? "font-semibold text-slate-900"
                            : "text-slate-500",
                        ].join(" ")}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-400">저장된 일기</p>
                <span className="text-xs text-slate-400">{diaries.length}개</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-slate-900"
                  style={{ width: `${Math.min(diaries.length * 10, 100)}%` }}
                />
              </div>
            </div>
          </section>
        </aside>

        <main className="grid min-w-0 auto-rows-max gap-5 lg:pt-[58px]">
          {error ? (
            <p className="rounded-3xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          {review ? (
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <p className="text-xs font-semibold text-slate-400">
                    AI REVIEW
                  </p>
                  <h2 className="mt-1 text-2xl font-bold text-slate-900">
                    {review.aiDiary.title}
                  </h2>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setReview(null)}
                    className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Pencil size={16} />
                    다시 수정
                  </button>
                  <button
                    type="button"
                    onClick={confirmSave}
                    disabled={isSaving}
                    className="inline-flex h-11 items-center gap-2 rounded-2xl bg-slate-900 px-5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
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
                <span className="inline-flex h-8 items-center rounded-full bg-slate-100 px-3 text-xs text-slate-600">
                  {review.aiDiary.mood}
                </span>
                <div className="rounded-2xl bg-slate-50 p-4 text-base leading-8 text-slate-700">
                  <p className="whitespace-pre-wrap">{review.aiDiary.diary}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {review.aiDiary.keywords.map((keyword) => (
                    <span
                      key={keyword}
                      className="rounded-full border border-slate-200 px-3 py-2 text-xs text-slate-600"
                    >
                      #{keyword}
                    </span>
                  ))}
                </div>
              </div>
            </section>
          ) : editingDiaryId ? (
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <p className="text-xs font-semibold text-slate-400">
                    TODAY MEMO
                  </p>
                  <h2 className="mt-1 text-2xl font-bold text-slate-900">
                    {editingDiaryId === "new" ? "오늘 메모" : "일기 수정"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    {toDisplayDate(selectedDate)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={cancelWork}
                    className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <X size={16} />
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={generateReview}
                    disabled={isGenerating}
                    className="inline-flex h-11 items-center gap-2 rounded-2xl bg-slate-900 px-5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
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

              <div className="mb-4">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  원하는 방향
                </label>
                <input
                  value={editor.direction}
                  onChange={(event) =>
                    setEditor((current) => ({
                      ...current,
                      direction: event.target.value,
                    }))
                  }
                  placeholder="예: 담백하게, 감성적으로, 짧게 요약해서"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-slate-900"
                />
              </div>

              <div className="flex h-[520px] flex-col rounded-3xl border border-slate-200 bg-slate-50 p-5 transition-all duration-300">
                <textarea
                  value={editor.content}
                  onChange={(event) =>
                    setEditor((current) => ({
                      ...current,
                      content: event.target.value,
                    }))
                  }
                  placeholder="오늘 있었던 일이나 수정하고 싶은 일기를 적어주세요."
                  className="flex-1 resize-none bg-transparent text-lg leading-8 text-slate-800 outline-none"
                  maxLength={1200}
                />
                <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                  <span className="text-sm text-slate-400">
                    {editor.content.length.toLocaleString("ko-KR")}/1200
                  </span>
                  <span className="text-sm text-slate-400">
                    AI 검토 후 저장
                  </span>
                </div>
              </div>
            </section>
          ) : selectedDiary ? (
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <p className="text-xs text-slate-400">
                    {toDisplayDate(selectedDate)}
                  </p>
                  <h2 className="mt-1 text-2xl font-bold text-slate-900">
                    저장된 일기
                  </h2>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(selectedDiary)}
                    className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Pencil size={16} />
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() => removeDiary(selectedDiary)}
                    disabled={deletingDiaryId === selectedDiary.id}
                    className="inline-flex h-11 items-center gap-2 rounded-2xl border border-red-100 bg-white px-4 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deletingDiaryId === selectedDiary.id ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      <Trash2 size={16} />
                    )}
                    삭제
                  </button>
                </div>
              </div>

              <div className="mb-4 flex items-start justify-between gap-3">
                <h3 className="text-lg font-bold text-slate-900">
                  {selectedDiary.title}
                </h3>
                <span className="flex h-8 shrink-0 items-center rounded-full bg-slate-100 px-3 text-xs text-slate-600">
                  {selectedDiary.mood}
                </span>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-700">
                <p className="whitespace-pre-wrap">{selectedDiary.diary}</p>
              </div>

              <div className="mt-5">
                <h4 className="mb-2 text-sm font-semibold text-slate-900">
                  주요 키워드
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedDiary.keywords.map((keyword) => (
                    <span
                      key={`${selectedDiary.id}-${keyword}`}
                      className="rounded-full border border-slate-200 px-3 py-2 text-xs text-slate-600"
                    >
                      #{keyword}
                    </span>
                  ))}
                </div>
              </div>

              {selectedDiary.entry?.content ? (
                <div className="mt-5">
                  <h4 className="mb-2 text-sm font-semibold text-slate-900">
                    내가 보낸 기록
                  </h4>
                  <div className="rounded-2xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">
                    {selectedDiary.entry.content}
                  </div>
                </div>
              ) : null}
            </section>
          ) : (
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                <CalendarDays className="mb-4 text-slate-300" size={34} />
                <p className="mb-2 text-sm font-semibold text-slate-700">
                  작성된 일기가 없습니다
                </p>
                <p className="mb-5 text-xs leading-5 text-slate-400">
                  {toDisplayDate(selectedDate)}에는 저장된 일기가 없어요.
                </p>
                <button
                  type="button"
                  onClick={startCreate}
                  className="inline-flex h-10 items-center gap-2 rounded-2xl bg-slate-900 px-5 text-sm text-white"
                >
                  <Plus size={16} />
                  새로 쓰기
                </button>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
