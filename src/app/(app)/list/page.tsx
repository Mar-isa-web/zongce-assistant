"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ActivityRow } from "@/lib/types";
import { deleteActivity, listActivities, updateActivity } from "@/lib/data";

const DIMENSIONS = ["德育", "智育", "体育", "美育", "劳育"];
const STATUSES = ["待审核", "通过", "不通过"];

// 单行编辑的草稿
type Draft = { title: string; evidencePath: string; remark: string; status: string };

export default function ListPage() {
  const [rows, setRows] = useState<ActivityRow[] | null>(null);
  const [error, setError] = useState("");
  const [dimFilter, setDimFilter] = useState<string>("全部");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let alive = true;
    listActivities()
      .then((r) => alive && setRows(r))
      .catch(() => alive && setError("加载失败，请刷新重试"));
    return () => {
      alive = false;
    };
  }, []);

  // 从总分页「看明细」带 ?dim=XX 进入时，直接筛到对应育别
  useEffect(() => {
    const dim = new URLSearchParams(window.location.search).get("dim");
    if (dim && DIMENSIONS.includes(dim)) setDimFilter(dim);
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

  function startEdit(r: ActivityRow) {
    setEditingId(r.activity_id);
    setConfirmDeleteId(null);
    setDraft({ title: r.title, evidencePath: r.evidence_path, remark: r.remark, status: r.status });
  }

  async function saveEdit(activityId: number) {
    if (!draft) return;
    setMessage("");
    try {
      await updateActivity(activityId, draft);
      setRows(
        (prev) =>
          prev?.map((r) =>
            r.activity_id === activityId
              ? { ...r, title: draft.title, evidence_path: draft.evidencePath, remark: draft.remark, status: draft.status }
              : r,
          ) ?? prev,
      );
      setEditingId(null);
      setDraft(null);
    } catch (err) {
      setMessage(`❌ ${err instanceof Error ? err.message : "保存失败"}`);
    }
  }

  async function doDelete(activityId: number) {
    setMessage("");
    try {
      await deleteActivity(activityId);
      setRows((prev) => prev?.filter((r) => r.activity_id !== activityId) ?? prev);
      setConfirmDeleteId(null);
    } catch (err) {
      setMessage(`❌ ${err instanceof Error ? err.message : "删除失败"}`);
    }
  }

  const input =
    "w-full rounded border border-zinc-300 px-2 py-1 text-zinc-900 focus:border-teal-500 focus:outline-none";

  if (error) return <main className="p-8 text-red-600">{error}</main>;
  if (!rows) return <main className="p-8 text-zinc-500">加载中…</main>;

  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold sm:text-3xl">活动列表</h1>
        <Link href="/add" className="text-sm text-teal-700 hover:underline sm:text-base">+ 录入一条</Link>
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

      {message && <p className="mt-2 text-sm">{message}</p>}

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
            <table className="table-cards mt-2 w-full text-left text-sm">
              <thead className="text-zinc-500">
                <tr>
                  <th className="py-1.5 pr-3">名称</th>
                  <th className="py-1.5 pr-3">匹配的细则</th>
                  <th className="py-1.5 pr-3 text-right">分值</th>
                  <th className="py-1.5 pr-3">状态</th>
                  <th className="py-1.5 w-32">操作</th>
                </tr>
              </thead>
              <tbody>
                {g.list.map((r) =>
                  editingId === r.activity_id ? (
                    <tr key={r.activity_id} className="border-b border-zinc-100 bg-teal-50/50 align-top">
                      <td data-label="名称" className="stacked py-1.5 pr-3">
                        <input className={input} value={draft!.title} onChange={(e) => setDraft({ ...draft!, title: e.target.value })} />
                        <div className="mt-1 grid grid-cols-2 gap-2">
                          <input className={input} value={draft!.evidencePath} onChange={(e) => setDraft({ ...draft!, evidencePath: e.target.value })} placeholder="证明材料路径" />
                          <input className={input} value={draft!.remark} onChange={(e) => setDraft({ ...draft!, remark: e.target.value })} placeholder="备注" />
                        </div>
                      </td>
                      <td data-label="细则" className="py-1.5 pr-3 text-zinc-500">
                        {r.item_no !== null ? `${r.item_no}. ${r.category} · ${r.level || "不分级"} · ${r.grade}` : "—"}
                        <div className="hidden text-xs text-zinc-400 sm:block">改规则请删除后重录</div>
                      </td>
                      <td data-label="分值" className="py-1.5 pr-3 text-right font-medium">{r.points}</td>
                      <td data-label="状态" className="stacked py-1.5 pr-3">
                        <select className={input} value={draft!.status} onChange={(e) => setDraft({ ...draft!, status: e.target.value })}>
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                      <td data-label="操作" className="py-1.5">
                        <span className="flex items-center gap-3">
                          <button type="button" onClick={() => saveEdit(r.activity_id)} className="text-teal-700 hover:underline">保存</button>
                          <button type="button" onClick={() => { setEditingId(null); setDraft(null); }} className="text-zinc-500 hover:underline">取消</button>
                        </span>
                      </td>
                    </tr>
                  ) : (
                    <tr
                      key={r.activity_id}
                      className={`border-b border-zinc-100 ${r.status === "不通过" ? "text-zinc-400 line-through" : ""}`}
                    >
                      <td data-label="名称" className="py-1.5 pr-3">{r.title}</td>
                      <td data-label="细则" className="py-1.5 pr-3 text-zinc-500">
                        {r.item_no !== null ? `${r.item_no}. ${r.category} · ${r.level || "不分级"} · ${r.grade}` : "—"}
                      </td>
                      <td data-label="分值" className="py-1.5 pr-3 text-right font-medium">{r.points}</td>
                      <td data-label="状态" className="py-1.5 pr-3">{r.status}</td>
                      <td data-label="操作" className="py-1.5">
                        <span className="flex items-center gap-3">
                          <button type="button" onClick={() => startEdit(r)} className="text-teal-700 hover:underline">编辑</button>
                          {confirmDeleteId === r.activity_id ? (
                            <>
                              <button type="button" onClick={() => doDelete(r.activity_id)} className="text-red-600 hover:underline">确认删除</button>
                              <button type="button" onClick={() => setConfirmDeleteId(null)} className="text-zinc-500 hover:underline">取消</button>
                            </>
                          ) : (
                            <button type="button" onClick={() => setConfirmDeleteId(r.activity_id)} className="text-zinc-400 hover:text-red-500 hover:underline">删除</button>
                          )}
                        </span>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </section>
        ))
      )}
    </main>
  );
}
