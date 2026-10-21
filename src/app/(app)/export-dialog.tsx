"use client";

import { useEffect, useState } from "react";
import type { DimResult } from "@/lib/score-core";
import { listActivities } from "@/lib/data";
import type { ExportAct, ExportInfo } from "@/lib/export-client";
import { exportExcel, exportWord } from "@/lib/export-client";

// 免登录导出：官方综测表要填姓名学号等信息，这里临时问一次
// 填过的会记在本机，下次自动带出；只用于生成文件，不上传
const PROFILE_KEY = "zc.local.profile";

const EMPTY: ExportInfo = {
  name: "",
  studentId: "",
  className: "",
  college: "",
  major: "",
  phone: "",
};

export default function ExportDialog({
  dims,
  total,
  onClose,
}: {
  dims: DimResult[];
  total: number;
  onClose: () => void;
}) {
  // 上次填过的姓名学号等存在本机，直接用作初始值（不用 effect 里 setState，避免多余渲染）
  const [info, setInfo] = useState<ExportInfo>(() => {
    if (typeof window === "undefined") return EMPTY;
    try {
      const saved = localStorage.getItem(PROFILE_KEY);
      return saved ? { ...EMPTY, ...(JSON.parse(saved) as Partial<ExportInfo>) } : EMPTY;
    } catch {
      return EMPTY;
    }
  });
  const [acts, setActs] = useState<ExportAct[] | null>(null);
  const [busy, setBusy] = useState<"" | "word" | "excel">("");
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    listActivities()
      .then((rows) => alive && setActs(rows as unknown as ExportAct[]))
      .catch(() => alive && setError("读取本地活动失败"));
    return () => {
      alive = false;
    };
  }, []);

  function set(field: keyof ExportInfo, v: string) {
    setInfo((prev) => ({ ...prev, [field]: v }));
  }

  async function run(kind: "word" | "excel") {
    setError("");
    if (!info.name.trim()) {
      setError("请先填姓名——这张表要交给学校，不能空着");
      return;
    }
    setBusy(kind);
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(info));
      if (kind === "word") await exportWord(info, dims, acts ?? []);
      else await exportExcel(info, dims, acts ?? [], total);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "导出失败，重试一次");
    } finally {
      setBusy("");
    }
  }

  const input =
    "w-full rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-teal-500 focus:outline-none";
  const label = "mb-1 block text-xs font-medium text-zinc-700";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-xl bg-white p-4 shadow-xl sm:rounded-xl">
        <h2 className="text-lg font-bold">导出前填一下</h2>
        <p className="mt-1 text-xs text-zinc-500">
          表单里要有你的姓名学号，所以这里单独问一次。只用来生成文件，<b>不会上传</b>，填过会记在本机。
        </p>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="col-span-1">
            <span className={label}>姓名 *</span>
            <input className={input} value={info.name} onChange={(e) => set("name", e.target.value)} placeholder="如 张三" />
          </div>
          <div className="col-span-1">
            <span className={label}>学号</span>
            <input
              className={input}
              inputMode="numeric"
              value={info.studentId}
              onChange={(e) => set("studentId", e.target.value.replace(/\D/g, "").slice(0, 9))}
              placeholder="9 位"
            />
          </div>
          <div>
            <span className={label}>班级</span>
            <input
              className={input}
              inputMode="numeric"
              value={info.className}
              onChange={(e) => set("className", e.target.value.replace(/\D/g, "").slice(0, 7))}
              placeholder="7 位"
            />
          </div>
          <div>
            <span className={label}>手机号（选填）</span>
            <input
              className={input}
              inputMode="numeric"
              value={info.phone}
              onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 11))}
              placeholder="11 位"
            />
          </div>
          <div>
            <span className={label}>学院</span>
            <input className={input} value={info.college} onChange={(e) => set("college", e.target.value)} placeholder="如 计算机学院" />
          </div>
          <div>
            <span className={label}>专业</span>
            <input className={input} value={info.major} onChange={(e) => set("major", e.target.value)} placeholder="如 软件工程" />
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            disabled={!!busy}
            onClick={() => run("word")}
            className="rounded bg-teal-600 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {busy === "word" ? "生成中…" : "导出综测表（Word，可提交）"}
          </button>
          <button
            type="button"
            disabled={!!busy}
            onClick={() => run("excel")}
            className="rounded border border-teal-600 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50 disabled:opacity-50"
          >
            {busy === "excel" ? "生成中…" : "导出 Excel（核对数据用）"}
          </button>
          <button type="button" onClick={onClose} className="py-1 text-sm text-zinc-500 hover:underline">
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
