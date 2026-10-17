"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type DimResult = {
  dimension: string;
  baseScore: number;
  peerScore: number;
  deduction: number;
  bonus: number;
  bonusCount: number;
  raw: number;
  converted: number;
};

type ScoresResponse = {
  academicYear: string;
  current: {
    studentId: string;
    name: string;
    className: string;
    dims: DimResult[];
    total: number;
    majorRank: { college: string; major: string; rank: number; total: number };
  };
};

// 每个育的折算公式展示（和 src/lib/scores.ts 保持一致）
const FORMULAS: Record<string, string> = {
  德育: "基础×30% + 互评×20% + 加分×50% − 扣分",
  智育: "基础×80% + 加分×20%",
  体育: "基础×70% + 加分×30% − 扣分",
  美育: "基础×50% + 加分×50% − 扣分",
  劳育: "基础×50% + 加分×50% − 扣分",
};

export default function ScorePage() {
  const [data, setData] = useState<ScoresResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/scores")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError("加载失败，请刷新重试"));
  }, []);

  if (error) return <main className="p-8 text-red-600">{error}</main>;
  if (!data) return <main className="p-8 text-zinc-500">计算中…</main>;

  const { current } = data;

  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-3xl font-bold">综测总分</h1>
      <p className="mt-1 text-zinc-500">
        学年 {data.academicYear} · {current.name}（学号 {current.studentId}）· {current.className} 班
        {current.majorRank && (
          <>
            {" "}· 专业名次：<strong className="text-teal-700">第 {current.majorRank.rank} 名</strong>
            <span className="text-zinc-400"> / {current.majorRank.college}·{current.majorRank.major} 共 {current.majorRank.total} 人</span>
          </>
        )}
      </p>

      <table className="mt-6 w-full text-left text-sm">
        <thead className="border-b-2 border-zinc-300 text-zinc-500">
          <tr>
            <th className="py-2 pr-3">育别</th>
            <th className="py-2 pr-3 text-right">基础分</th>
            <th className="py-2 pr-3 text-right">互评分</th>
            <th className="py-2 pr-3 text-right">扣分</th>
            <th className="py-2 pr-3 text-right">加分小计</th>
            <th className="py-2 pr-3 text-right">原始总分</th>
            <th className="py-2 pr-3 text-right">折算分</th>
          </tr>
        </thead>
        <tbody>
          {current.dims.map((d) => (
            <tr key={d.dimension} className="border-b border-zinc-200">
              <td className="py-2 pr-3">
                {d.dimension}
                <div className="text-xs text-zinc-400">{FORMULAS[d.dimension]}</div>
              </td>
              <td className="py-2 pr-3 text-right">{d.baseScore}</td>
              <td className="py-2 pr-3 text-right">{d.peerScore}</td>
              <td className="py-2 pr-3 text-right">{d.deduction}</td>
              <td className="py-2 pr-3 text-right">
                {d.bonus}
                {d.bonusCount > 0 && <span className="ml-1 text-xs text-zinc-400">（{d.bonusCount}条）</span>}
                <div className="text-xs text-zinc-400">
                  <a href="/list" className="hover:text-teal-600 hover:underline">看明细</a>
                </div>
              </td>
              <td className="py-2 pr-3 text-right font-medium">{d.raw}</td>
              <td className="py-2 pr-3 text-right font-medium text-teal-700">{d.converted}</td>
            </tr>
          ))}
          <tr className="border-b-2 border-zinc-300 bg-teal-50">
            <td className="py-3 pr-3 font-bold">综合测评总分</td>
            <td colSpan={5} className="py-3 pr-3 text-right text-xs text-zinc-500">
              各育折算分相加（占比 德20% 智60% 体10% 美5% 劳5%）
            </td>
            <td className="py-3 pr-3 text-right text-lg font-bold text-teal-700">{current.total}</td>
          </tr>
        </tbody>
      </table>

      <div className="mt-8 flex gap-4 text-sm">
        <Link href="/add" className="text-teal-700 hover:underline">+ 录入活动</Link>
        <Link href="/base" className="text-teal-700 hover:underline">改基础分</Link>
      </div>
    </main>
  );
}
