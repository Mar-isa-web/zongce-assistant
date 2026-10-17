"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ActivityRow } from "@/lib/types";

export default function ListPage() {
  const [rows, setRows] = useState<ActivityRow[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/activities")
      .then((r) => r.json())
      .then(setRows)
      .catch(() => setError("加载失败，请刷新重试"));
  }, []);

  if (error) return <main className="p-8 text-red-600">{error}</main>;
  if (!rows) return <main className="p-8 text-zinc-500">加载中…</main>;

  return (
    <main className="mx-auto max-w-5xl p-8">
      <div className="flex items-baseline justify-between">
        <h1 className="text-3xl font-bold">活动列表</h1>
        <Link href="/add" className="text-teal-700 hover:underline">+ 录入一条</Link>
      </div>

      {rows.length === 0 ? (
        <p className="mt-8 text-zinc-500">还没有记录，去<a href="/add" className="text-teal-700 hover:underline">录入第一条</a>吧。</p>
      ) : (
        <table className="mt-6 w-full text-left text-sm">
          <thead className="border-b-2 border-zinc-300 text-zinc-500">
            <tr>
              <th className="py-2 pr-3">学号</th>
              <th className="py-2 pr-3">名称</th>
              <th className="py-2 pr-3">日期</th>
              <th className="py-2 pr-3">育别</th>
              <th className="py-2 pr-3">匹配的细则</th>
              <th className="py-2 pr-3 text-right">分值</th>
              <th className="py-2">状态</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.activity_id} className="border-b border-zinc-200">
                <td className="py-2 pr-3">{r.student_id}</td>
                <td className="py-2 pr-3">{r.title}</td>
                <td className="py-2 pr-3 whitespace-nowrap">{r.activity_date}</td>
                <td className="py-2 pr-3">{r.dimension}</td>
                <td className="py-2 pr-3 text-zinc-500">
                  {r.item_no !== null ? `${r.item_no}. ${r.category} · ${r.level || "不分级"} · ${r.grade}` : "—"}
                </td>
                <td className="py-2 pr-3 text-right font-medium">{r.points}</td>
                <td className="py-2">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
