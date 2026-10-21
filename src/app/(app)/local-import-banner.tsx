"use client";

import { useEffect, useState } from "react";
import * as local from "@/lib/local-store";

// 登录后如果发现这台设备上还留着"本地试算"的数据，提示一次性导入账号
export default function LocalImportBanner() {
  const [counts, setCounts] = useState<{ acts: number; base: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let alive = true;
    // 放到微任务里读，避免在 effect 里同步 setState
    Promise.resolve().then(() => {
      if (!alive) return;
      const acts = local.readActivities().length;
      const base = Object.keys(local.readBase()).length;
      setCounts(acts + base > 0 ? { acts, base } : null);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!counts) return null;

  async function doImport() {
    setBusy(true);
    setMessage("");
    try {
      const payload = local.exportForImport();
      const res = await fetch("/api/import-local", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "导入失败");
      local.clearAll();
      setMessage(`✅ 已导入 ${data.imported} 条活动、${data.baseSaved} 项基础分`);
      setCounts(null);
      setTimeout(() => location.reload(), 900);
    } catch (err) {
      setMessage(`❌ ${err instanceof Error ? err.message : "导入失败"}`);
      setBusy(false);
    }
  }

  function discard() {
    local.clearAll();
    setCounts(null);
    setMessage("已丢弃本地试算数据");
  }

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 sm:px-6">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-3 gap-y-2">
        <span>
          这台设备上还有<b>本地试算</b>的数据（{counts.acts} 条活动
          {counts.base > 0 ? `、${counts.base} 项基础分` : ""}），要导入当前账号吗？
        </span>
        <button
          type="button"
          disabled={busy}
          onClick={doImport}
          className="rounded bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
        >
          {busy ? "导入中…" : "导入账号"}
        </button>
        <button type="button" onClick={discard} className="text-xs text-amber-800 underline">
          不要，丢掉
        </button>
        {message && <span className="text-xs">{message}</span>}
      </div>
    </div>
  );
}
