"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// 每个育的分数来源说明 + 折算公式（数据来自《实施办法》第五~九条）
// peer/deduction = 该育是否存在互评分/扣分（不存在的格子像纸质表一样画斜线）
const ROWS: {
  dimension: string;
  baseHint: string;
  formula: string;
  peer: boolean;
  deduction: boolean;
}[] = [
  {
    dimension: "德育",
    baseHint: "个人学年总结自评（政治素养/思想水平/道德品质/文明修养/法纪观念 5 项各 20，满分 100）",
    formula: "德育总分 = 基础分×30% + 互评分×20% + 加分×50% − 扣分",
    peer: true,
    deduction: true,
  },
  {
    dimension: "智育",
    baseHint: "你的学年平均绩点 ÷ 年级专业第一名的绩点 × 100（教务处数据为准）",
    formula: "智育总分 = 基础分×80% + 加分×20%",
    peer: false,
    deduction: false,
  },
  {
    dimension: "体育",
    baseHint: "本学年体测成绩折算",
    formula: "体育总分 = 基础分×70% + 加分×30% − 扣分",
    peer: false,
    deduction: true,
  },
  {
    dimension: "美育",
    baseHint: "学生互评与美育课程修读情况各占一半",
    formula: "美育总分 = 基础分×50% + 加分×50% − 扣分",
    peer: true,
    deduction: true,
  },
  {
    dimension: "劳育",
    baseHint: "《劳动教育》课程成绩",
    formula: "劳育总分 = 基础分×50% + 加分×50% − 扣分",
    peer: false,
    deduction: true,
  },
];

type RowState = { baseScore: string; peerScore: string; deduction: string };

const EMPTY: RowState = { baseScore: "0", peerScore: "0", deduction: "0" };

// 不适用的格子：斜线划掉（和纸质表一致），防止误填
function NotApplicable() {
  return (
    <div
      className="relative h-[38px] overflow-hidden rounded border border-zinc-200 bg-zinc-50"
      title="这一项该育没有"
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom right, transparent 49.6%, #a1a1aa 49.6%, #a1a1aa 50.4%, transparent 50.4%)",
        }}
      />
      <span className="absolute inset-0 flex items-center justify-center text-xs text-zinc-400">
        不适用
      </span>
    </div>
  );
}

export default function BasePage() {
  const [state, setState] = useState<Record<string, RowState> | null>(null);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/base-scores")
      .then((r) => r.json())
      .then((rows: { dimension: string; base_score: number; peer_score: number; deduction: number }[]) => {
        const next: Record<string, RowState> = {};
        for (const row of ROWS) {
          const found = rows.find((r) => r.dimension === row.dimension);
          next[row.dimension] = found
            ? {
                baseScore: String(found.base_score),
                peerScore: String(found.peer_score),
                deduction: String(found.deduction),
              }
            : { ...EMPTY };
        }
        setState(next);
      })
      .catch(() => setLoadError("加载失败，请刷新重试"));
  }, []);

  function setField(dimension: string, field: keyof RowState, value: string) {
    setState((prev) => prev && { ...prev, [dimension]: { ...prev[dimension], [field]: value } });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!state) return;
    setMessage("");
    setSaving(true);
    const res = await fetch("/api/base-scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rows: ROWS.map(({ dimension }) => ({
          dimension,
          baseScore: state[dimension].baseScore,
          peerScore: state[dimension].peerScore,
          deduction: state[dimension].deduction,
        })),
      }),
    });
    const data = await res.json();
    setSaving(false);
    setMessage(res.ok ? "✅ 已保存" : `❌ ${data.error ?? "保存失败"}`);
  }

  const input = "w-full rounded border border-zinc-300 px-2 py-1.5 text-zinc-900 focus:border-teal-500 focus:outline-none";

  if (loadError) return <main className="p-8 text-red-600">{loadError}</main>;
  if (!state) return <main className="p-8 text-zinc-500">加载中…</main>;

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-8">
      <h1 className="text-2xl font-bold sm:text-3xl">基础分登记</h1>
      <p className="mt-1 text-sm text-zinc-500 sm:text-base">
        学年 2025-2026 · 这些分不是活动加分，来源见每行说明；加分在<a href="/add" className="text-teal-700 hover:underline">录入活动</a>里
      </p>

      <form onSubmit={save} className="mt-6 space-y-4">
        {ROWS.map(({ dimension, baseHint, formula, peer, deduction }) => (
          <div key={dimension} className="rounded border border-zinc-200 p-4">
            <div className="flex items-baseline justify-between gap-2">
              <span className="shrink-0 font-medium text-zinc-800">{dimension}</span>
              <span className="text-right text-xs text-zinc-500">{formula}</span>
            </div>
            <p className="mt-1 text-xs text-zinc-500">来源：{baseHint}</p>
            <div className="mt-2 grid grid-cols-3 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs text-zinc-600">基础分</span>
                <input
                  type="number" min="0" step="0.01"
                  className={input}
                  value={state[dimension].baseScore}
                  onChange={(e) => setField(dimension, "baseScore", e.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-zinc-600">互评分</span>
                {peer ? (
                  <input
                    type="number" min="0" step="0.01"
                    className={input}
                    value={state[dimension].peerScore}
                    onChange={(e) => setField(dimension, "peerScore", e.target.value)}
                  />
                ) : (
                  <NotApplicable />
                )}
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-zinc-600">扣分</span>
                {deduction ? (
                  <input
                    type="number" min="0" step="0.01"
                    className={input}
                    value={state[dimension].deduction}
                    onChange={(e) => setField(dimension, "deduction", e.target.value)}
                  />
                ) : (
                  <NotApplicable />
                )}
              </label>
            </div>
          </div>
        ))}

        <div className="flex items-center gap-4">
          <button type="submit" disabled={saving} className="rounded bg-teal-600 px-6 py-2 font-medium text-white hover:bg-teal-700 disabled:opacity-50">
            {saving ? "保存中…" : "全部保存"}
          </button>
          <Link href="/list" className="text-teal-700 hover:underline">查看活动列表 →</Link>
          {message && <span>{message}</span>}
        </div>
      </form>
    </main>
  );
}
