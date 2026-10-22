"use client";

import { useEffect, useState } from "react";
import { getMode } from "@/lib/data";

// 首页：登录用户看到全部入口；免登录（本地试算）用户看不到「规则配置」，
// 那是管理员维护细则用的，点进去只会被弹回登录页
export default function Home() {
  const [localMode, setLocalMode] = useState(false);

  useEffect(() => {
    let alive = true;
    getMode()
      .then((m) => alive && setLocalMode(m === "local"))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return (
    <main className="flex flex-col items-center px-4 pb-16 pt-10 sm:pt-20">
      <h1 className="text-center text-4xl font-bold sm:text-6xl">综测小助手</h1>
      <p className="mt-3 text-sm text-zinc-500 sm:mt-4 sm:text-base">v0.2 · 我的第一个全栈项目</p>

      {localMode && (
        <p className="mt-6 w-full max-w-sm rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
          不用登录就能用，数据只存在这台设备。<br />
          按顺序来：先<b>填基础分</b>（不知道就留 0）→ 再<b>录入活动</b> → 看<b>我的总分</b>，最后可以导出综测表。
        </p>
      )}

      <nav className="mt-6 grid w-full max-w-sm grid-cols-2 gap-3 text-base sm:mt-10 sm:flex sm:w-auto sm:max-w-none sm:gap-6 sm:text-lg">
        <a
          href="/score"
          className="col-span-2 rounded bg-teal-600 px-5 py-3 text-center text-white hover:bg-teal-700 sm:col-span-1 sm:py-2"
        >
          我的总分
        </a>
        <a
          href="/add"
          className="rounded border border-zinc-400 px-5 py-3 text-center hover:border-teal-600 hover:text-teal-700 sm:py-2"
        >
          录入活动
        </a>
        <a
          href="/list"
          className="rounded border border-zinc-400 px-5 py-3 text-center hover:border-teal-600 hover:text-teal-700 sm:py-2"
        >
          活动列表
        </a>
        <a
          href="/base"
          className="rounded border border-zinc-400 px-5 py-3 text-center hover:border-teal-600 hover:text-teal-700 sm:py-2"
        >
          基础分
        </a>
        {!localMode && (
          <a
            href="/rules"
            className="rounded border border-zinc-400 px-5 py-3 text-center hover:border-teal-600 hover:text-teal-700 sm:py-2"
          >
            规则配置
          </a>
        )}
      </nav>
    </main>
  );
}
