"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getScore, getMode } from "@/lib/data";

type DimResult = {
  dimension: string;
  baseScore: number;
  peerScore: number;
  deduction: number;
  bonus: number;
  bonusCount: number;
  raw: number;
  converted: number;
  capped: boolean;
};

type ScoresResponse = {
  academicYear: string;
  current: {
    studentId: string;
    name: string;
    className: string;
    dims: DimResult[];
    total: number;
    majorRank?: { college: string; major: string; rank: number; total: number } | null;
  };
};

// 每个育的折算公式展示（和 src/lib/scores.ts 保持一致）；原始总分均为百分制
// peer/deduction = 该育是否有互评分/扣分（没有的显示"—"，和纸质表斜线格一致）
const FORMULAS: Record<string, { formula: string; peer: boolean; deduction: boolean }> = {
  德育: { formula: "基础×30% + 互评×20% + 加分×50% − 扣分", peer: true, deduction: true },
  智育: { formula: "基础×80% + 加分×20%", peer: false, deduction: false },
  体育: { formula: "基础×70% + 加分×30% − 扣分", peer: false, deduction: true },
  美育: { formula: "基础×50% + 加分×50% − 扣分", peer: true, deduction: true },
  劳育: { formula: "基础×50% + 加分×50% − 扣分", peer: false, deduction: true },
};

export default function ScorePage() {
  const [data, setData] = useState<ScoresResponse | null>(null);
  const [error, setError] = useState("");
  const [localMode, setLocalMode] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([getScore(), getMode()])
      .then(([d, mode]) => {
        if (!alive) return;
        setData(d);
        setLocalMode(mode === "local");
      })
      .catch(() => alive && setError("加载失败，请刷新重试"));
    return () => {
      alive = false;
    };
  }, []);

  if (error) return <main className="p-8 text-red-600">{error}</main>;
  if (!data) return <main className="p-8 text-zinc-500">计算中…</main>;

  const { current } = data;

  return (
    <main className="mx-auto max-w-4xl p-4 sm:p-8">
      <h1 className="text-2xl font-bold sm:text-3xl">综测总分</h1>
      {localMode ? (
        <p className="mt-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          当前是<b>本地试算</b>：数据只存在这台设备的浏览器里，不会上传。
          想保存到账号、换手机继续用，<Link href="/login" className="underline">登录 / 注册</Link>即可。
        </p>
      ) : (
        <p className="mt-1 text-sm text-zinc-500 sm:text-base">
          学年 {data.academicYear} · {current.name}（学号 {current.studentId}）· {current.className} 班
        </p>
      )}
      {current.majorRank && (
        <p className="mt-0.5 text-sm text-zinc-500">
          专业名次：<strong className="text-teal-700">第 {current.majorRank.rank} 名</strong>
          <span className="text-zinc-400"> / {current.majorRank.college}·{current.majorRank.major} 共 {current.majorRank.total} 人</span>
        </p>
      )}

      {/* 窄屏：一育一张卡片，省掉横向挤压的表格 */}
      <div className="mt-5 space-y-3 md:hidden">
        {current.dims.map((d) => {
          const f = FORMULAS[d.dimension];
          return (
            <div key={d.dimension} className="rounded border border-zinc-200 p-3">
              <div className="flex items-baseline justify-between">
                <span className="font-medium text-zinc-900">{d.dimension}</span>
                <span className="text-lg font-bold text-teal-700">{d.converted}</span>
              </div>
              <div className="mt-0.5 text-xs text-zinc-400">{f.formula}（百分制，满分 100）</div>
              <dl className="mt-2 space-y-0.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-zinc-500">基础分</dt>
                  <dd>{d.baseScore}</dd>
                </div>
                {f.peer && (
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">互评分</dt>
                    <dd>{d.peerScore}</dd>
                  </div>
                )}
                {f.deduction && (
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">扣分</dt>
                    <dd>{d.deduction}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-zinc-500">加分小计</dt>
                  <dd>{d.bonus}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">原始总分</dt>
                  <dd className="font-medium">{d.raw}</dd>
                </div>
              </dl>
              <div className="mt-2 flex items-center justify-between text-xs">
                <a href={`/list?dim=${d.dimension}`} className="text-teal-700 hover:underline">
                  {d.bonusCount > 0 ? `看明细（${d.bonusCount} 条）` : "看明细"}
                </a>
                {d.capped && <span className="text-amber-600">超出按 100 计，已封顶</span>}
              </div>
            </div>
          );
        })}
        <div className="rounded bg-teal-50 p-3">
          <div className="flex items-baseline justify-between">
            <span className="font-bold">综合测评总分</span>
            <span className="text-2xl font-bold text-teal-700">{current.total}</span>
          </div>
          <div className="mt-1 text-xs text-zinc-500">各育折算分相加（占比 德20% 智60% 体10% 美5% 劳5%）</div>
        </div>
      </div>

      <table className="mt-6 hidden w-full text-left text-sm md:table">
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
                <div className="text-xs text-zinc-400">
                  {FORMULAS[d.dimension].formula}（百分制，满分 100）
                </div>
              </td>
              <td className="py-2 pr-3 text-right">{d.baseScore}</td>
              <td className="py-2 pr-3 text-right">
                {FORMULAS[d.dimension].peer ? d.peerScore : <span className="text-zinc-300">—</span>}
              </td>
              <td className="py-2 pr-3 text-right">
                {FORMULAS[d.dimension].deduction ? d.deduction : <span className="text-zinc-300">—</span>}
              </td>
              <td className="py-2 pr-3 text-right">
                {d.bonus}
                {d.bonusCount > 0 && <span className="ml-1 text-xs text-zinc-400">（{d.bonusCount}条）</span>}
                <div className="text-xs text-zinc-400">
                  <a href={`/list?dim=${d.dimension}`} className="hover:text-teal-600 hover:underline">看明细</a>
                </div>
              </td>
              <td className="py-2 pr-3 text-right font-medium">
                {d.raw}
                {d.capped && <div className="text-xs text-amber-600">超出按100计</div>}
              </td>
              <td className="py-2 pr-3 text-right font-medium text-teal-700">
                {d.converted}
                {d.capped && <div className="text-xs text-amber-600">已封顶</div>}
              </td>
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

      <div className="mt-6 flex flex-col gap-2 text-sm sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
        {localMode ? (
          <p className="rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
            导出综测表需要登录（表格要读你账号里的数据）。
            <Link href="/login" className="ml-1 text-teal-700 underline">
              登录 / 注册
            </Link>
          </p>
        ) : (
          <>
            <a href="/api/export/word" className="rounded bg-teal-600 px-4 py-2 text-center font-medium text-white hover:bg-teal-700">导出综测表（Word，可提交）</a>
            <a href="/api/export/excel" className="rounded border border-teal-600 px-4 py-2 text-center text-teal-700 hover:bg-teal-50">导出 Excel（核对数据用）</a>
          </>
        )}
        <Link href="/add" className="px-2 py-2 text-center text-teal-700 hover:underline">+ 录入活动</Link>
        <Link href="/base" className="px-2 py-2 text-center text-teal-700 hover:underline">改基础分</Link>
      </div>
    </main>
  );
}
