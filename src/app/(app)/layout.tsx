"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// 登录门卫：本路由组里所有页面都要求先登录，未登录自动跳 /login
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<"loading" | "out" | "in">("loading");
  const [me, setMe] = useState<{ student_id: string; name: string; role: string } | null>(null);
  const pathname = usePathname();

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
      <header className="flex items-center justify-between gap-3 border-b border-zinc-200 px-6 py-2 text-sm text-zinc-600">
        <div>
          {pathname !== "/" && (
            <Link href="/" className="text-teal-700 hover:underline">
              ← 返回首页
            </Link>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span>
            {me?.name}
            {me?.student_id && <span className="text-zinc-400">（{me.student_id}）</span>}
            {me?.role === "admin" && (
              <span className="ml-1 rounded bg-teal-100 px-1.5 text-xs text-teal-700">管理员</span>
            )}
          </span>
          <button type="button" onClick={logout} className="text-zinc-400 hover:text-red-500 hover:underline">
            退出登录
          </button>
        </div>
      </header>
      {children}
    </div>
  );
}
