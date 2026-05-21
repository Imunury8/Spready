"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { LogOut, UserCircle, MoreVertical } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export function ProfileCard() {
  const { data: session, status } = useSession();
  const [showPopup, setShowPopup] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  const isLoading = status === "loading";
  const userName = session?.user?.name ?? "하루기록러";
  const userEmail = session?.user?.email ?? "";

  // Close popup when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setShowPopup(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-4 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-slate-200 dark:bg-slate-800" />
          <div className="space-y-2">
            <div className="h-4 w-20 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-3 w-32 rounded bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
      </div>
    );
  }

  // Not logged in view
  if (!session) {
    return (
      <div className="mb-5 flex flex-col gap-4 rounded-3xl border border-slate-200/60 dark:border-slate-850 bg-slate-50/70 dark:bg-slate-900/40 p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white dark:bg-slate-950 text-slate-400 dark:text-slate-500 shadow-sm border border-slate-100 dark:border-slate-900">
            <UserCircle size={28} className="stroke-[1.5]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">로그인이 필요합니다</h3>
            <p className="text-xs text-slate-400 dark:text-slate-550 mt-0.5">로그인하고 일기를 저장해보세요</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => signIn("google")}
          className="w-full flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-900 dark:bg-white px-4 text-sm font-semibold text-white dark:text-slate-950 shadow-sm hover:bg-slate-800 dark:hover:bg-slate-100 transition-all active:scale-[0.98]"
        >
          {/* Custom minimal Google G Logo */}
          <svg className="h-4 w-4 fill-current mr-1" viewBox="0 0 24 24">
            <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.41 0-6.19-2.78-6.19-6.19s2.78-6.19 6.19-6.19c1.7 0 3.25.69 4.39 1.8l3.23-3.23C19.71 2.91 16.2 1.5 12.24 1.5 6.033 1.5 1 6.533 1 12.74s5.033 11.24 11.24 11.24c6.48 0 10.74-4.54 10.74-10.9 0-.67-.06-1.34-.18-1.795H12.24z" />
          </svg>
          Google로 로그인
        </button>
      </div>
    );
  }

  // Logged in view
  return (
    <div className="relative mb-5 flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 shadow-sm">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500">
          {session.user?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={session.user.image}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            <UserCircle size={24} />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">
            {userName}
          </p>
          <p className="truncate text-xs text-slate-400 dark:text-slate-500 mt-0.5">{userEmail}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowPopup((prev) => !prev)}
        aria-label="더보기"
        title="더보기"
        className="grid size-9 shrink-0 place-items-center rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-650 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition active:scale-95"
      >
        <MoreVertical size={18} />
      </button>

      {/* Account Management Popover (계정 관리 팝업) */}
      {showPopup && (
        <div
          ref={popupRef}
          className="absolute right-4 top-16 z-50 w-64 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 shadow-xl ring-1 ring-black/5 dark:ring-white/5 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          <div className="mb-3 border-b border-slate-100 dark:border-slate-900 pb-3">
            <p className="text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">로그인 계정</p>
            <p className="mt-1 truncate text-xs font-semibold text-slate-650 dark:text-slate-300">{userEmail}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowPopup(false);
              signOut();
            }}
            className="flex w-full h-9 items-center justify-center gap-2 rounded-xl bg-red-50 dark:bg-red-950/20 text-xs font-bold text-red-650 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-700 dark:hover:text-red-300 transition active:scale-[0.98]"
          >
            <LogOut size={14} />
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
}
