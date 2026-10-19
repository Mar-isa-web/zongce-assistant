"use client";

import { useEffect, useMemo, useState } from "react";
import type { Rule } from "@/lib/types";

const DIMENSIONS = ["全部", "德育", "智育", "体育", "美育", "劳育"];

// 单行编辑的草稿状态
type Draft = { points: string; aliases: string; note: string };

export default function RulesPage() {
  const [rules, setRules] = useState<Rule[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [dimFilter, setDimFilter] = useState("全部");
  const [searchQ, setSearchQ] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/rules")
      .then((r) => r.json())
      .then(setRules)
      .catch(() => setLoadError("规则加载失败，请刷新重试"));
  }, []);

  const visible = useMemo(() => {
    if (!rules) return [];
    const q = searchQ.trim().toLowerCase();
    return rules.filter((r) => {
      if (dimFilter !== "全部" && r.dimension !== dimFilter) return false;
      if (!q) return true;
      return [r.aliases, r.category, r.grade, r.level, r.dimension, r.item_no + "", r.note]
        .join(",")
        .toLowerCase()
        .includes(q);
    });
  }, [rules, dimFilter, searchQ]);

  function startEdit(r: Rule) {
    setEditingId(r.rule_id);
    setDraft({ points: String(r.points), aliases: r.aliases, note: r.note });
    setMessage("");
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
  }

  async function saveEdit(ruleId: number) {
    if (!draft) return;
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/rules", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ruleId, points: Number(draft.points), aliases: draft.aliases, note: draft.note }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      setRules((prev) =>
        prev?.map((r) =>
          r.rule_id === ruleId ? { ...r, points: Number(draft.points), aliases: draft.aliases, note: draft.note } : r,
        ) ?? prev,
      );
      setEditingId(null);
      setDraft(null);
      setMessage("✅ 已保存，录入页搜索立即生效");
    } else {
      setMessage(`❌ ${data.error ?? "保存失败"}`);
    }
  }

  const input = "w-full rounded border border-zinc-300 px-2 py-1 text-zinc-900 focus:border-teal-500 focus:outline-none";

  if (loadError) return <main className="p-8 text-red-600">{loadError}</main>;
  if (!rules) return <main className="p-8 text-zinc-500">规则加载中…</main>;

  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-8">
      <h1 className="text-2xl font-bold sm:text-3xl">规则配置</h1>
      <p className="mt-1 text-sm text-zinc-500 sm:text-base">
        学校改细则时在这里改分值；"常见例子"是录入页搜索用的关键词。改完点保存立即生效。
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {DIMENSIONS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDimFilter(d)}
            className={`rounded-full px-4 py-1 text-sm ${dimFilter === d ? "bg-teal-600 text-white" : "border border-zinc-300 text-zinc-600 hover:border-teal-500"}`}
          >
            {d}
          </button>
        ))}
        <input
          className="w-full rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-900 focus:border-teal-500 focus:outline-none sm:ml-auto sm:w-64"
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          placeholder="筛这个页面里的规则……"
        />
      </div>
      <p className="mt-2 text-xs text-zinc-400">共 {visible.length} 条</p>

      {message && <p className="mt-2 text-sm">{message}</p>}

      <table className="table-cards mt-3 w-full text-left text-sm">
        <thead className="border-b-2 border-zinc-300 text-zinc-500">
          <tr>
            <th className="py-2 pr-3">规则</th>
            <th className="py-2 pr-3 w-20">分值</th>
            <th className="py-2 pr-3">常见例子（搜索用）</th>
            <th className="py-2 pr-3">备注</th>
            <th className="py-2 w-24">操作</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((r) =>
            editingId === r.rule_id ? (
              <tr key={r.rule_id} className="border-b border-zinc-200 bg-teal-50/50">
                <td data-label="规则" className="py-2 pr-3 text-zinc-500">
                  {r.dimension} · {r.item_no}. {r.category} · {r.level || "不分级"} · {r.grade}
                </td>
                <td data-label="分值" className="stacked py-2 pr-3">
                  <input type="number" min="0" step="0.25" className={`${input} w-20`} value={draft!.points} onChange={(e) => setDraft({ ...draft!, points: e.target.value })} />
                </td>
                <td data-label="常见例子" className="stacked py-2 pr-3">
                  <input className={input} value={draft!.aliases} onChange={(e) => setDraft({ ...draft!, aliases: e.target.value })} />
                </td>
                <td data-label="备注" className="stacked py-2 pr-3">
                  <input className={input} value={draft!.note} onChange={(e) => setDraft({ ...draft!, note: e.target.value })} />
                </td>
                <td data-label="操作" className="py-2">
                  <span className="flex items-center gap-3">
                    <button type="button" disabled={saving} onClick={() => saveEdit(r.rule_id)} className="text-teal-700 hover:underline disabled:opacity-50">
                      {saving ? "保存中…" : "保存"}
                    </button>
                    <button type="button" onClick={cancelEdit} className="text-zinc-500 hover:underline">取消</button>
                  </span>
                </td>
              </tr>
            ) : (
              <tr key={r.rule_id} className="border-b border-zinc-200">
                <td data-label="规则" className="py-2 pr-3">
                  {r.dimension} · {r.item_no}. {r.category} · {r.level || "不分级"} · {r.grade}
                  {r.unit && <span className="ml-1 text-xs text-zinc-400">（按{r.unit}计）</span>}
                </td>
                <td data-label="分值" className="py-2 pr-3 font-medium">{r.points}</td>
                <td data-label="例子" className="py-2 pr-3 text-zinc-500">{r.aliases || "—"}</td>
                <td data-label="备注" className="py-2 pr-3 text-zinc-500">{r.note || "—"}</td>
                <td data-label="操作" className="py-2">
                  <button type="button" onClick={() => startEdit(r)} className="text-teal-700 hover:underline">编辑</button>
                </td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </main>
  );
}
