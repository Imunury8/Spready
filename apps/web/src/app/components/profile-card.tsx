"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { LogOut, UserCircle } from "lucide-react";

export function ProfileCard() {
  const { data: session, status } = useSession();
  const isLoading = status === "loading";
  const userName = session?.user?.name ?? "하루기록러";
  const userEmail = session?.user?.email ?? "@daily_memo";

  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-slate-100 text-slate-500">
          {session?.user?.image ? (
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
          <p className="truncate text-sm font-semibold text-slate-900">
            {isLoading ? "확인 중" : userName}
          </p>
          <p className="truncate text-xs text-slate-400">{userEmail}</p>
        </div>
      </div>

      {session ? (
        <button
          type="button"
          onClick={() => signOut()}
          aria-label="로그아웃"
          title="로그아웃"
          className="grid size-10 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
        >
          <LogOut size={17} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => signIn("google")}
          disabled={isLoading}
          className="h-10 shrink-0 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          Google 로그인
        </button>
      )}
    </div>
  );
}
