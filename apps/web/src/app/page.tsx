"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
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
  Send,
  AlertTriangle,
  BookOpen,
  MessageSquare,
  Sun,
  Moon
} from "lucide-react";

import {
  SavedDiary,
  createDiary,
  deleteDiary,
  generateDiary,
  listDiaries,
  updateDiary,
  getUserPreference,
  updateUserPreference,
} from "@/lib/api";
import { ProfileCard } from "@/app/components/profile-card";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MAX_DIARY_LENGTH = 300;
const MAX_EDITED_DIARY_LENGTH = 800;
const TOTAL_LIMIT = 10;

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDisplayDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

// Format selected date for ISO string payload
function toDiaryDateISOString(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    12,
  ).toISOString();
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

// Convert hour (0-23) to dropdown time format
function hourToTimeStr(hour: number): string {
  if (hour === 0) return "00:00";
  return `${String(hour).padStart(2, "0")}:00`;
}

// Convert dropdown time format to hour
function timeStrToHour(timeStr: string): number {
  const parts = timeStr.split(":");
  return parseInt(parts[0] || "21", 10);
}

function formatMemoTime(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd} ${hh}:${min}`;
}

function formatTransmissionTime(dateString: string) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "09:00";
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${min}`;
}

export default function Home() {
  const { data: session, status: sessionStatus } = useSession();

  // Core Theme State
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const [diaries, setDiaries] = useState<SavedDiary[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );

  // Today's Memo text input states
  const [memoContent, setMemoContent] = useState("");
  const [isMemoExpanded, setIsMemoExpanded] = useState(false);
  const [memoTime, setMemoTime] = useState("");

  // Saved diary editing text state
  const [editedDiaryText, setEditedDiaryText] = useState("");
  const [isUpdatingDiary, setIsUpdatingDiary] = useState(false);

  // Preference states
  const [generationTime, setGenerationTime] = useState("21:00");
  const [generationOpen, setGenerationOpen] = useState(false);

  // Status & API triggers
  const [isSending, setIsSending] = useState(false);
  const [deletingDiaryId, setDeletingDiaryId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const isLoggedIn = sessionStatus === "authenticated" && !!session;

  // Initialize Theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const initialTheme = savedTheme || "light";
    setTheme(initialTheme);
    if (initialTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }

  // Load diaries and preferences on login
  useEffect(() => {
    if (!isLoggedIn) {
      setDiaries([]);
      return;
    }

    // Load diaries
    listDiaries()
      .then((loadedDiaries) => {
        setDiaries(loadedDiaries);
      })
      .catch(() => {
        setError("저장된 기록을 불러오지 못했습니다. 서버 상태를 확인해주세요.");
      });

    // Load preference
    getUserPreference()
      .then((reminderHour) => {
        setGenerationTime(hourToTimeStr(reminderHour));
      })
      .catch(() => {
        // Fallback to default
        setGenerationTime("21:00");
      });
  }, [isLoggedIn]);

  // Map diaries by Date
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

  // Today's Memo character calculations
  const previousContentLength = selectedDiary?.entry?.content?.trim().length ?? 0;
  const extraChar = previousContentLength > 0 ? 1 : 0; // separating newline
  const maxMemoInputLength = Math.max(0, MAX_DIARY_LENGTH - previousContentLength - extraChar);
  const currentTotalLength = previousContentLength + extraChar + memoContent.length;

  const monthLabel = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
  }).format(visibleMonth);

  // Initialize edited diary text when selectedDiary changes
  useEffect(() => {
    if (selectedDiary) {
      setEditedDiaryText(selectedDiary.diary);
    } else {
      setEditedDiaryText("");
    }
  }, [selectedDiary]);

  // Lock the time when expanding Today's Memo
  useEffect(() => {
    if (isMemoExpanded) {
      setMemoTime(formatMemoTime(new Date()));
    }
  }, [isMemoExpanded]);

  const isLimitExceeded = diaries.length >= TOTAL_LIMIT;

  function moveMonth(direction: -1 | 1) {
    setVisibleMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + direction, 1),
    );
  }

  function selectDate(date: Date) {
    setSelectedDate(date);
    setIsMemoExpanded(false); // Date selection collapses Today's Memo
    setError("");
  }

  // Handle dropdown change
  async function handlePreferenceChange(timeStr: string) {
    setGenerationTime(timeStr);
    setGenerationOpen(false);
    if (!isLoggedIn) return;

    try {
      const hour = timeStrToHour(timeStr);
      await updateUserPreference(hour);
    } catch {
      setError("알림 시간 설정을 저장하지 못했습니다.");
    }
  }

  // Today's Memo submission logic
  async function handleSendMemo() {
    if (!isLoggedIn) {
      setError("일기를 저장하려면 로그인이 필요합니다.");
      return;
    }

    const trimmedContent = memoContent.trim();
    if (!trimmedContent) return;

    // Determine if we are updating (fusing) or creating a new diary
    const isUpdateFlow = !!selectedDiary;

    if (!isUpdateFlow && isLimitExceeded) {
      setError("사용 한도를 초과했습니다. 새로운 일기를 작성할 수 없습니다.");
      return;
    }

    // Determine merged content and length
    const previousContent = selectedDiary?.entry?.content || "";
    const mergedContent = previousContent.trim()
      ? `${previousContent.trim()}\n${trimmedContent}`
      : trimmedContent;

    if (mergedContent.length > MAX_DIARY_LENGTH) {
      setError(`전체 메모의 길이는 ${MAX_DIARY_LENGTH}자 이하로 제한됩니다.`);
      return;
    }

    setIsSending(true);
    setError("");

    try {
      // 1. Generate diary reflection with FastAPI via Next.js api proxy
      const generated = await generateDiary(mergedContent);
      const slicedDiaryText = generated.diary.slice(0, 500); // AI generated diary limited to 500 characters

      if (isUpdateFlow) {
        // 2a. Update (fuse) existing diary (PATCH)
        const payload = {
          content: mergedContent,
          title: generated.title,
          mood: generated.mood,
          keywords: generated.keywords,
          diary: slicedDiaryText,
          style: selectedDiary.style,
        };

        const updated = await updateDiary(selectedDiary.id, payload);

        // 3a. Update local state
        setDiaries((current) =>
          current.map((d) => (d.id === updated.id ? updated : d)),
        );
      } else {
        // 2b. Create new diary (POST)
        const payload = {
          content: mergedContent,
          title: generated.title,
          mood: generated.mood,
          keywords: generated.keywords,
          diary: slicedDiaryText,
          diaryDate: toDiaryDateISOString(selectedDate),
          style: "diary",
        };

        const created = await createDiary(payload);

        // 3b. Update local state
        setDiaries((current) => [created, ...current]);
      }

      setMemoContent(""); // Clear input text area
      setIsMemoExpanded(false); // Collapse memo input area
    } catch (err: any) {
      setError(err?.message || "일기를 생성 및 저장하는 중에 문제가 발생했습니다.");
    } finally {
      setIsSending(false);
    }
  }

  // Edit AI-generated diary reflection
  async function handleUpdateDiary() {
    if (!selectedDiary) return;

    const trimmed = editedDiaryText.trim();
    if (!trimmed) {
      setError("일기 내용을 입력해주세요.");
      return;
    }

    if (trimmed.length > MAX_EDITED_DIARY_LENGTH) {
      setError("수정할 본문은 800자 이하로 작성해주세요.");
      return;
    }

    setIsUpdatingDiary(true);
    setError("");

    try {
      const payload = {
        content: selectedDiary.entry?.content || "",
        title: selectedDiary.title,
        mood: selectedDiary.mood,
        keywords: selectedDiary.keywords,
        diary: trimmed,
        style: selectedDiary.style,
      };

      const updated = await updateDiary(selectedDiary.id, payload);

      setDiaries((current) =>
        current.map((d) => (d.id === updated.id ? updated : d)),
      );
    } catch {
      setError("일기를 수정하지 못했습니다. 서버 상태를 확인해주세요.");
    } finally {
      setIsUpdatingDiary(false);
    }
  }

  // Delete diary
  async function removeDiary(diary: SavedDiary) {
    setDeletingDiaryId(diary.id);
    setError("");

    try {
      await deleteDiary(diary.id);
      setDiaries((current) =>
        current.filter((currentDiary) => currentDiary.id !== diary.id),
      );
    } catch {
      setError("일기를 삭제하지 못했습니다. 서버 상태를 확인해주세요.");
    } finally {
      setDeletingDiaryId(null);
    }
  }

  return (
    <div className={`min-h-screen ${theme === "dark" ? "dark bg-slate-900 text-slate-100" : "bg-slate-50 text-slate-800"} p-4 sm:p-6 font-sans transition-colors duration-300`}>
      <div className="mx-auto grid min-h-[calc(100vh-32px)] max-w-7xl items-stretch gap-6 lg:min-h-[calc(100vh-48px)] lg:grid-cols-[minmax(320px,1fr)_minmax(0,2fr)]">
        
        {/* Left Pane */}
        <aside className="flex min-w-0 flex-col gap-5">
          <div className="px-2">
            <div className="mb-2 flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-indigo-650 dark:bg-indigo-600 font-black text-white shadow-lg shadow-indigo-600/10 text-lg">
                S
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Spready</h1>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  흩어진 하루를 하나의 일기로
                </p>
              </div>
            </div>
          </div>

          {/* Calendar Card */}
          <section className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 shadow-sm dark:shadow-xl sm:p-6 transition-all">
            <div className="mb-5 flex items-center justify-between">
              <button
                type="button"
                onClick={() => moveMonth(-1)}
                aria-label="이전 달"
                className="grid size-9 place-items-center rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-900 transition-all"
              >
                <ChevronLeft size={18} />
              </button>
              <h2 className="font-bold text-slate-800 dark:text-white tracking-tight">{monthLabel}</h2>
              <button
                type="button"
                onClick={() => moveMonth(1)}
                aria-label="다음 달"
                className="grid size-9 place-items-center rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-900 transition-all"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="mb-3 grid grid-cols-7 text-center text-xs font-semibold text-slate-400 dark:text-slate-500">
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
                      "relative h-11 rounded-xl text-sm font-semibold transition-all duration-200 flex flex-col items-center justify-center gap-0.5",
                      isSelected
                        ? "bg-slate-900 dark:bg-indigo-600 text-white shadow-md shadow-slate-900/10 dark:shadow-indigo-600/30 scale-105"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white",
                    ].join(" ")}
                  >
                    <span>{date.getDate()}</span>
                    {hasDiary ? (
                      <span
                        className={[
                          "size-1.5 rounded-full mt-0.5",
                          isSelected ? "bg-white" : "bg-slate-900 dark:bg-indigo-500",
                        ].join(" ")}
                      />
                    ) : (
                      // Dot placeholder to keep layout stable
                      <span className="size-1.5 mt-0.5 opacity-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Profile & Setting Card */}
          <section className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 shadow-sm dark:shadow-xl sm:p-6 flex-1 flex flex-col justify-between gap-5 transition-all">
            <div>
              <ProfileCard />

              {/* Reminder Dropdown */}
              <div className="mb-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 p-4 border border-slate-100 dark:border-slate-800/40">
                <p className="mb-2.5 text-xs font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase">일기 생성 시간</p>
                <div className="relative">
                  <button
                    type="button"
                    disabled={!isLoggedIn}
                    onClick={() => setGenerationOpen((current) => !current)}
                    className="flex h-11 w-full items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 text-sm font-semibold text-slate-800 dark:text-slate-200 hover:border-slate-350 dark:hover:border-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="생성 시간 선택"
                  >
                    <span>{generationTime}</span>
                    <Clock size={16} className="text-slate-400" />
                  </button>

                  {generationOpen && (
                    <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-2xl animate-in fade-in slide-in-from-top-1 duration-100">
                      {["21:00", "22:00", "23:00", "00:00"].map((time) => (
                        <button
                          key={time}
                          type="button"
                          onClick={() => handlePreferenceChange(time)}
                          className={[
                            "flex h-10 w-full items-center px-4 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-900 transition",
                            generationTime === time
                              ? "font-bold text-slate-900 dark:text-indigo-400 bg-slate-100/50 dark:bg-indigo-950/20"
                              : "text-slate-500 dark:text-slate-400",
                          ].join(" ")}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Usage limit bar */}
            {isLoggedIn && (
              <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/60 p-4 border border-slate-100 dark:border-slate-800/40">
                <div className="mb-2.5 flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase">사용량 한도</p>
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    {diaries.length} / {TOTAL_LIMIT}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-950 border border-slate-300/40 dark:border-slate-850">
                  <div
                    className={[
                      "h-full rounded-full transition-all duration-500",
                      isLimitExceeded ? "bg-red-500 shadow-md shadow-red-500/20" : "bg-indigo-500 shadow-md shadow-indigo-500/20"
                    ].join(" ")}
                    style={{ width: `${Math.min((diaries.length / TOTAL_LIMIT) * 100, 100)}%` }}
                  />
                </div>

                {isLimitExceeded && (
                  <div className="mt-3 flex items-start gap-2 text-red-650 dark:text-red-400 bg-red-50 dark:bg-red-950/10 border border-red-100 dark:border-red-950/30 rounded-xl p-2.5 text-xs animate-in fade-in duration-200">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <span>사용 한도를 초과했습니다. 새로운 일기 작성이 제한됩니다.</span>
                  </div>
                )}
              </div>
            )}
          </section>
        </aside>

        {/* Right Pane */}
        <main className="grid min-w-0 auto-rows-max gap-5 lg:pt-[58px]">
          
          {error && (
            <div className="rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 p-4 text-sm text-red-700 dark:text-red-300 flex items-start gap-2.5 shadow-sm">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Today's Memo (Expanded / Input State) */}
          {isMemoExpanded ? (
            <section className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 shadow-sm dark:shadow-xl sm:p-7 transition-all">
              <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-2.5 w-2.5 rounded-full bg-indigo-550 dark:bg-indigo-500 animate-pulse" />
                    <p className="text-xs font-bold text-slate-450 dark:text-slate-400 tracking-wider uppercase">TODAY MEMO</p>
                  </div>
                  <h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                    {selectedDiary ? "메모 추가 및 융합" : "오늘 메모"}
                  </h2>
                  <p className="mt-1 text-xs text-slate-450 dark:text-slate-500 font-semibold">{memoTime}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMemoExpanded(false);
                      setError("");
                    }}
                    className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-transparent px-4 text-sm font-semibold text-slate-650 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-900 transition active:scale-95"
                  >
                    <X size={15} />
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleSendMemo}
                    disabled={isSending || (!selectedDiary && isLimitExceeded) || !memoContent.trim() || currentTotalLength > MAX_DIARY_LENGTH}
                    className="inline-flex h-11 items-center gap-2 rounded-2xl bg-slate-900 dark:bg-indigo-600 px-5 text-sm font-bold text-white shadow-lg shadow-slate-950/10 dark:shadow-indigo-600/20 hover:bg-slate-800 dark:hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 transition active:scale-95"
                  >
                    {isSending ? (
                      <Loader2 className="animate-spin" size={15} />
                    ) : (
                      <Send size={15} />
                    )}
                    {selectedDiary ? "융합 및 생성" : "전송"}
                  </button>
                </div>
              </div>

              {/* Text Area Card */}
              <div className="flex h-[420px] flex-col rounded-3xl border border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/40 p-5 transition-all">
                <textarea
                  value={memoContent}
                  onChange={(event) => setMemoContent(event.target.value)}
                  placeholder={
                    previousContentLength > 0
                      ? (maxMemoInputLength === 0 ? "더 이상 추가할 수 없습니다 (최대 300자)" : "기존 메모에 추가할 내용을 적어보세요...")
                      : "지금 생각나는 대로 적어보세요..."
                  }
                  className="flex-1 resize-none bg-transparent text-lg leading-relaxed text-slate-800 dark:text-slate-100 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600"
                  maxLength={maxMemoInputLength}
                  disabled={isSending}
                />
                <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800/80 pt-4 mt-3">
                  <span className="text-xs font-bold text-slate-405 dark:text-slate-500 flex flex-col gap-0.5">
                    <span>전체 글자 수: {currentTotalLength} / {MAX_DIARY_LENGTH}</span>
                    {previousContentLength > 0 && (
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
                        (기존: {previousContentLength}자 + 추가: {memoContent.length}자)
                      </span>
                    )}
                  </span>
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <Sparkles size={12} className="text-indigo-550 dark:text-indigo-400" />
                    {selectedDiary ? "기존 메모와 융합 후 재생성" : "AI 분석 후 자동 저장"}
                  </span>
                </div>
              </div>
            </section>
          ) : (
            
            // Collapsed Today's Memo Strip and Saved Diary logic
            <div className="space-y-5">
              
              {/* 4-1. Collapsed Today's Memo block */}
              <section className="rounded-3xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-950/80 p-5 shadow-sm dark:shadow-lg flex items-center justify-between gap-4 transition-all">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">오늘 메모</h3>
                  <p className="text-xs text-slate-450 dark:text-slate-500 mt-0.5">
                    {selectedDiary
                      ? "기존 일기의 메모와 융합하여 새로운 일기를 생성합니다."
                      : "지금 떠오르는 생각을 기록해보세요."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMemoExpanded(true)}
                  disabled={(!selectedDiary && isLimitExceeded) || !isLoggedIn || (!!selectedDiary && previousContentLength >= MAX_DIARY_LENGTH)}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-800 px-4 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-slate-950 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-slate-850 dark:hover:border-slate-700 transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                >
                  <Plus size={14} />
                  {selectedDiary ? "메모 추가하기" : "입력하기"}
                </button>
              </section>

              {/* 4-2. Saved Diary details */}
              {selectedDiary ? (
                <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 shadow-sm dark:shadow-xl sm:p-7 transition-all">
                  <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div>
                      <p className="text-xs font-bold text-slate-400 dark:text-slate-500 tracking-tight">
                        {toDisplayDate(selectedDate)}
                      </p>
                      <h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                        <BookOpen size={20} className="text-indigo-550 dark:text-indigo-400" />
                        저장된 일기
                      </h2>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => removeDiary(selectedDiary)}
                        disabled={deletingDiaryId === selectedDiary.id}
                        className="inline-flex h-10 items-center gap-2 rounded-xl border border-red-200 dark:border-red-950/20 bg-red-50 dark:bg-red-950/10 px-4 text-xs font-bold text-red-650 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/30 hover:text-red-750 dark:hover:text-red-300 disabled:opacity-40 transition active:scale-95"
                      >
                        {deletingDiaryId === selectedDiary.id ? (
                          <Loader2 className="animate-spin" size={14} />
                        ) : (
                          <Trash2 size={14} />
                        )}
                        삭제
                      </button>
                    </div>
                  </div>

                  <div className="mb-4 flex flex-col gap-2 border-b border-slate-100 dark:border-slate-900 pb-4">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {selectedDiary.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold text-slate-600 dark:text-indigo-400 bg-slate-100 dark:bg-indigo-950/30 border border-slate-200/60 dark:border-indigo-900/30 px-2 py-0.5 rounded-md uppercase">감정</span>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {selectedDiary.mood}
                      </span>
                    </div>
                  </div>

                  {/* AI Generated Diary Textarea (Editable) */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase">생성된 일기</label>
                      <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                        {editedDiaryText.length} / {MAX_EDITED_DIARY_LENGTH}
                      </span>
                    </div>
                    <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/60 p-4 border border-slate-150 dark:border-slate-800/40 relative">
                      <textarea
                        value={editedDiaryText}
                        onChange={(e) => setEditedDiaryText(e.target.value)}
                        className="w-full min-h-[360px] resize-none bg-transparent text-sm leading-relaxed text-slate-750 dark:text-slate-200 outline-none"
                        maxLength={MAX_EDITED_DIARY_LENGTH}
                        disabled={isUpdatingDiary}
                      />
                      <div className="flex justify-end mt-2">
                        <button
                          type="button"
                          onClick={handleUpdateDiary}
                          disabled={isUpdatingDiary || !editedDiaryText.trim() || editedDiaryText.length > MAX_EDITED_DIARY_LENGTH}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-slate-900 dark:bg-indigo-600 px-3 text-[11px] font-bold text-white shadow hover:bg-slate-800 dark:hover:bg-indigo-500 transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {isUpdatingDiary ? (
                            <Loader2 className="animate-spin" size={11} />
                          ) : (
                            <Pencil size={11} />
                          )}
                          수정
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Hashtags */}
                  <div className="mt-5 border-t border-slate-100 dark:border-slate-900 pt-4">
                    <h4 className="mb-2 text-xs font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase">주요 키워드</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedDiary.keywords.slice(0, 5).map((keyword) => (
                        <span
                          key={`${selectedDiary.id}-${keyword}`}
                          className="rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 px-2.5 py-1 text-xs text-slate-650 dark:text-slate-400 font-medium"
                        >
                          #{keyword}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* My Sent Record */}
                  {selectedDiary.entry?.content && (
                    <div className="mt-5 border-t border-slate-100 dark:border-slate-900 pt-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase flex items-center gap-1.5">
                          <MessageSquare size={13} className="text-indigo-550 dark:text-indigo-400" />
                          내가 보낸 기록
                        </h4>
                        <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-550">
                          {formatTransmissionTime(selectedDiary.createdAt)}
                        </span>
                      </div>
                      <div className="rounded-xl bg-slate-50/50 dark:bg-slate-900/30 p-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-900/60 whitespace-pre-wrap">
                        {selectedDiary.entry.content}
                      </div>
                    </div>
                  )}
                </section>
              ) : (
                
                // If there's no diary
                <section className="rounded-3xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-950 p-6 shadow-sm dark:shadow-xl sm:p-7 transition-all">
                  <div className="flex min-h-[380px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 p-6 text-center">
                    <CalendarDays className="mb-4 text-slate-300 dark:text-slate-700" size={38} />
                    <p className="mb-1 text-sm font-bold text-slate-800 dark:text-slate-350">
                      작성된 일기가 없습니다
                    </p>
                    <p className="mb-5 text-xs text-slate-450 dark:text-slate-500">
                      {toDisplayDate(selectedDate)}에는 저장된 일기가 없어요.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsMemoExpanded(true)}
                      disabled={isLimitExceeded || !isLoggedIn}
                      className="inline-flex h-11 items-center gap-2 rounded-2xl bg-slate-900 dark:bg-indigo-600 px-5 text-xs font-bold text-white shadow-lg shadow-slate-900/10 dark:shadow-indigo-600/20 hover:bg-slate-800 dark:hover:bg-indigo-500 transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Plus size={14} />
                      새로 쓰기
                    </button>
                  </div>
                </section>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Floating Theme Switcher in the Bottom Right Corner */}
      <button
        type="button"
        onClick={toggleTheme}
        aria-label="테마 전환"
        title={theme === "light" ? "다크 모드로 전환" : "라이트 모드로 전환"}
        className="fixed bottom-6 right-6 z-55 grid size-12 place-items-center rounded-full border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md text-slate-650 dark:text-slate-300 shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
      >
        {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
      </button>
    </div>
  );
}
