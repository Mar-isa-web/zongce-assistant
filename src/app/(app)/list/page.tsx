"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ActivityRow } from "@/lib/types";

const DIMENSIONS = ["德育", "智育", "体育", "美育", "劳育"];

export default function ListPage() {
  const [rows, setRows] = useState<ActivityRow[] | null>(null);
  const [error, setError] = useState("");
  const [dimFilter, setDimFilter] = useState<string>("全部");

  useEffect(() => {
    fetch("/api/activities")
      .then((r) => r.json())
      .then(setRows)
      .catch(() => setError("加载失败，请刷新重试"));
  }, []);

  // 计分口径与总分页一致：状态"不通过"的不计
  const countable = (r: ActivityRow) => r.status !== "不通过";

  const groups = useMemo(() => {
    if (!rows) return [];
    const dims = dimFilter === "全部" ? DIMENSIONS : [dimFilter];
    return dims
      .map((dim) => {
        const list = rows
          .filter((r) => r.dimension === dim)
          .sort((a, b) => b.activity_id - a.activity_id);
        return {
          dimension: dim,
          list,
          subtotal: list.filter(countable).reduce((s, r) => s + r.points, 0),
          count: list.length,
        };
      })
      .filter((g) => dimFilter !== "全部" || g.count > 0);
  }, [rows, dimFilter]);

  if (error) return <main className="p-8 text-red-600">{error}</main>;
  if (!rows) return <main className="p-8 text-zinc-500">加载中…</main>;

  return (
    <main className="mx-auto max-w-5xl p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-3xl font-bold">活动列表</h1>
        <Link href="/add" className="text-teal-700 hover:underline">+ 录入一条</Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {["全部", ...DIMENSIONS].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDimFilter(d)}
            className={`rounded-full px-4 py-1 text-sm ${dimFilter === d ? "bg-teal-600 text-white" : "border border-zinc-300 text-zinc-600 hover:border-teal-500"}`}
          >
            {d}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="mt-8 text-zinc-500">
          还没有记录，去<a href="/add" className="text-teal-700 hover:underline">录入第一条</a>吧。
        </p>
      ) : (
        groups.map((g) => (
          <section key={g.dimension} className="mt-6">
            <div className="flex items-baseline justify-between border-b border-zinc-300 pb-1">
              <h2 className="font-bold text-zinc-800">
                {g.dimension}
                <span className="ml-2 text-xs font-normal text-zinc-400">{g.count} 条</span>
              </h2>
              <span className="text-sm text-zinc-600">
                小计 <strong className="text-teal-700">{Math.round(g.subtotal * 100) / 100}</strong> 分
                <span className="ml-1 text-xs text-zinc-400">（不含不通过）</span>
              </span>
            </div>
            <table className="mt-2 w-full text-left text-sm">
              <thead className="text-zinc-500">
                <tr>
                  <th className="py-1.5 pr-3">名称</th>
                  <th className="py-1.5 pr-3">匹配的细则</th>
                  <th className="py-1.5 pr-3 text-right">分值</th>
                  <th className="py-1.5">状态</th>
                </tr>
              </thead>
              <tbody>
                {g.list.map((r) => (
                  <tr
                    key={r.activity_id}
                    className={`border-b border-zinc-100 ${r.status === "不通过" ? "text-zinc-400 line-through" : ""}`}
                  >
                    <td className="py-1.5 pr-3">{r.title}</td>
                    <td className="py-1.5 pr-3 text-zinc-500">
                      {r.item_no !== null ? `${r.item_no}. ${r.category} · ${r.level || "不分级"} · ${r.grade}` : "—"}
                    </td>
                    <td className="py-1.5 pr-3 text-right font-medium">{r.points}</td>
                    <td className="py-1.5">{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))
      )}
    </main>
  );
}
