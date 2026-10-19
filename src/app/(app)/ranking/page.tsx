"use client";

import { useEffect, useState } from "react";

type DimCell = { dimension: string; converted: number };
type Row = {
  rank: number;
  studentId: string;
  name: string;
  className: string;
  major: string;
  total: number;
  dims: DimCell[];
};
type Payload = {
  academicYear: string;
  classes: string[];
  className: string;
  count: number;
  rows: Row[];
};

// 全班排名（仅管理员）：谁多少分、排第几，评优评先直接看这张表
export default function RankingPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState("");
  const [cls, setCls] = useState("");

  useEffect(() => {
    let alive = true;
    const url = cls ? `/api/admin/ranking?className=${encodeURIComponent(cls)}` : "/api/admin/ranking";
    fetch(url)
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!alive) return;
        if (!r.ok) {
          setError(d.error ?? "加载失败，刷新重试");
          setData(null);
          return;
        }
        setError("");
        setData(d);
      })
      .catch(() => alive && setError("加载失败，刷新重试"));
    return () => {
      alive = false;
    };
  }, [cls]);

  if (error) return <main className="p-4 text-red-600 sm:p-8">{error}</main>;
  if (!data) return <main className="p-4 text-zinc-500 sm:p-8">排名计算中…</main>;

  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-8">
      <h1 className="text-2xl font-bold sm:text-3xl">全班排名</h1>
      <p className="mt-1 text-sm text-zinc-500 sm:text-base">
        学年 {data.academicYear} · 同分并列取靠前名次 · 只统计状态不是「不通过」的活动
      </p>

      {data.classes.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {["", ...data.classes].map((c) => (
            <button
              key={c || "all"}
              type="button"
              onClick={() => setCls(c)}
              className={`rounded-full px-4 py-1 text-sm ${
                cls === c ? "bg-teal-600 text-white" : "border border-zinc-300 text-zinc-600 hover:border-teal-500"
              }`}
            >
              {c || "全部"}
            </button>
          ))}
        </div>
      )}

      <p className="mt-3 text-xs text-zinc-400">
        共 {data.count} 人{data.className ? `（${data.className} 班）` : ""}
      </p>

      {data.count === 0 ? (
        <p className="mt-8 text-zinc-500">这个范围里还没有学生。</p>
      ) : (
        <>
          {/* 窄屏：一名学生一行，五育压成一行小字，避免 9 个格子各占一行 */}
          <ul className="mt-2 divide-y divide-zinc-100 md:hidden">
            {data.rows.map((r) => (
              <li key={r.studentId} className="flex items-center gap-3 py-2">
                <span className={`w-7 shrink-0 text-center ${r.rank <= 3 ? "font-bold text-teal-700" : "text-zinc-500"}`}>
                  {r.rank}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-zinc-900">
                    {r.name}
                    <span className="ml-1.5 text-xs font-normal text-zinc-400">{r.studentId}</span>
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    {["德育", "智育", "体育", "美育", "劳育"]
                      .map((d) => `${d.slice(0, 1)}${r.dims.find((x) => x.dimension === d)?.converted ?? 0}`)
                      .join(" · ")}
                  </div>
                </div>
                <span className="shrink-0 font-bold text-teal-700">{r.total}</span>
              </li>
            ))}
          </ul>

          <table className="mt-2 hidden w-full text-left text-sm md:table">
            <thead className="border-b-2 border-zinc-300 text-zinc-500">
              <tr>
                <th className="py-2 pr-3 w-16">名次</th>
                <th className="py-2 pr-3">姓名</th>
                <th className="py-2 pr-3">学号</th>
                <th className="py-2 pr-3 text-right">德育</th>
                <th className="py-2 pr-3 text-right">智育</th>
                <th className="py-2 pr-3 text-right">体育</th>
                <th className="py-2 pr-3 text-right">美育</th>
                <th className="py-2 pr-3 text-right">劳育</th>
                <th className="py-2 pr-3 text-right">总分</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.studentId} className="border-b border-zinc-100">
                  <td className="py-2 pr-3">
                    <span className={r.rank <= 3 ? "font-bold text-teal-700" : "text-zinc-500"}>{r.rank}</span>
                  </td>
                  <td className="py-2 pr-3 font-medium text-zinc-900">{r.name}</td>
                  <td className="py-2 pr-3 text-zinc-500">{r.studentId}</td>
                  {["德育", "智育", "体育", "美育", "劳育"].map((d) => (
                    <td key={d} className="py-2 pr-3 text-right text-zinc-600">
                      {r.dims.find((x) => x.dimension === d)?.converted ?? "—"}
                    </td>
                  ))}
                  <td className="py-2 pr-3 text-right font-bold text-teal-700">{r.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </main>
  );
}
