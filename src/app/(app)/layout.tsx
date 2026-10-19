"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// 登录门卫：本路由组里所有页面都要求先登录，未登录自动跳 /login
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<"loading" | "out" | "in">("loading");
  const [me, setMe] = useState<{ student_id: string; name: string; role: string } | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  // 返回站内上一页（如 总分→看明细 的二级层级）；直接打开本页时没有站内来路，回首页
  function goBack() {
    try {
      const ref = document.referrer ? new URL(document.referrer) : null;
      const fromInApp = ref && ref.origin === location.origin && ref.pathname !== "/login";
      if (fromInApp) router.back();
      else router.push("/");
    } catch {
      router.push("/");
    }
  }

  useEffect(() => {
    fetch("/api/me")
      .then((r) => {
        setState(r.ok ? "in" : "out");
        return r.ok ? r.json() : null;
      })
      .then((u) => u && setMe(u))
      .catch(() => setState("out"));
  }, []);

  useEffect(() => {
    if (state === "out") location.href = "/login";
  }, [state]);

  if (state !== "in") {
    return (
      <main className="flex min-h-screen items-center justify-center text-zinc-500">
        {state === "loading" ? "身份确认中…" : "未登录，正在跳转登录页…"}
      </main>
    );
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    location.href = "/login";
  }

  return (
    <div className="min-h-screen">
      <header className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-b border-zinc-200 px-4 py-2 text-sm text-zinc-600 sm:gap-x-3 sm:px-6">
        <div>
          {pathname !== "/" && (
            <button type="button" onClick={goBack} className="whitespace-nowrap text-teal-700 hover:underline">
              ← 返回
            </button>
          )}
        </div>
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <span className="truncate">
            {me?.name}
            {me?.student_id && (
              <span className="hidden text-zinc-400 min-[340px]:inline">（{me.student_id}）</span>
            )}
            {me?.role === "admin" && (
              <span className="ml-1 rounded bg-teal-100 px-1.5 text-xs text-teal-700">管理员</span>
            )}
          </span>
          <a href="/password" className="whitespace-nowrap text-zinc-400 hover:text-teal-700 hover:underline">
            修改密码
          </a>
          <button type="button" onClick={logout} className="whitespace-nowrap text-zinc-400 hover:text-red-500 hover:underline">
            退出登录
          </button>
        </div>
      </header>
      {children}
    </div>
  );
}
