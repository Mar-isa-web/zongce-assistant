"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Rule } from "@/lib/types";

// 级别下拉的展示顺序：校级最高频放前面（默认选中），四级全保留
const LEVEL_ORDER = ["校级", "院级", "省级", "国家级"];

export default function AddPage() {
  const [rules, setRules] = useState<Rule[] | null>(null);
  const [loadError, setLoadError] = useState("");

  const [combo, setCombo] = useState(""); // "育别|条目号" 合成一个下拉，少点一次
  const [level, setLevel] = useState("");
  const [ruleId, setRuleId] = useState("");
  const [title, setTitle] = useState("");
  const [evidencePath, setEvidencePath] = useState("");
  const [remark, setRemark] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/rules")
      .then((r) => r.json())
      .then(setRules)
      .catch(() => setLoadError("规则加载失败，请刷新重试"));
  }, []);

  // 育别+条目 合并下拉：如 "智育 · 1. 竞赛"
  const comboOptions = useMemo(() => {
    if (!rules) return [];
    const seen = new Map<string, string>();
    for (const r of rules) seen.set(`${r.dimension}|${r.item_no}`, `${r.dimension} · ${r.item_no}. ${r.category}`);
    return [...seen.entries()];
  }, [rules]);

  const [dimension, itemNo] = combo ? combo.split("|") : ["", ""];

  const levelOptions = useMemo(() => {
    if (!rules || !itemNo) return [];
    const levels = new Set(
      rules.filter((r) => r.dimension === dimension && r.item_no === Number(itemNo)).map((r) => r.level),
    );
    const list = [...levels];
    list.sort((a, b) => {
      const ia = LEVEL_ORDER.indexOf(a), ib = LEVEL_ORDER.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
    return list;
  }, [rules, dimension, itemNo]);

  const gradeOptions = useMemo(
    () =>
      rules?.filter(
        (r) => r.dimension === dimension && r.item_no === Number(itemNo) && r.level === level,
      ) ?? [],
    [rules, dimension, itemNo, level],
  );

  const selectedRule = rules?.find((r) => String(r.rule_id) === ruleId) ?? null;

  function pickCombo(v: string) {
    setCombo(v);
    setRuleId("");
    if (!rules || !v) return;
    const [d, n] = v.split("|");
    const levels = new Set(
      rules.filter((r) => r.dimension === d && r.item_no === Number(n)).map((r) => r.level),
    );
    // 默认选中"校级"；单项类等没有级别概念的自动选唯一项
    setLevel(levels.has("校级") ? "校级" : [...levels][0] ?? "");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    if (!selectedRule) {
      setMessage("请先把 规则→级别→等级 选完整");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ruleId: selectedRule.rule_id,
        title,
        evidencePath,
        remark,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (res.ok) {
      setMessage(`✅ 已保存（记录 #${data.activity_id}），${selectedRule.points} 分`);
      setTitle("");
      setEvidencePath("");
      setRemark("");
      // 联动选择保留不动：连续录同类活动（比如一堆"活动参与者"）时不用重新选
    } else {
      setMessage(`❌ ${data.error ?? "保存失败"}`);
    }
  }

  const input =
    "w-full rounded border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-teal-500 focus:outline-none";
  const label = "mb-1 block text-sm font-medium text-zinc-800";

  if (loadError) return <main className="p-8 text-red-600">{loadError}</main>;
  if (!rules) return <main className="p-8 text-zinc-500">规则加载中…</main>;

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-3xl font-bold">录入活动</h1>
      <p className="mt-1 text-zinc-500">选规则自动带分，带 <span className="text-red-500">*</span> 的才必填</p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <span className={label}>规则 <span className="text-red-500">*</span></span>
          <select className={input} value={combo} onChange={(e) => pickCombo(e.target.value)} required>
            <option value="">育别 · 条目</option>
            {comboOptions.map(([key, text]) => (
              <option key={key} value={key}>{text}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className={label}>级别 <span className="text-red-500">*</span></span>
            <select className={input} value={level} onChange={(e) => { setLevel(e.target.value); setRuleId(""); }} required disabled={!combo}>
              {levelOptions.map((l) => (
                <option key={l} value={l}>{l === "" ? "（不分级）" : l}</option>
              ))}
            </select>
          </div>
          <div>
            <span className={label}>等级 / 身份 <span className="text-red-500">*</span></span>
            <select className={input} value={ruleId} onChange={(e) => setRuleId(e.target.value)} required disabled={!combo}>
              <option value="">请选择</option>
              {gradeOptions.map((r) => (
                <option key={r.rule_id} value={r.rule_id}>{r.grade}</option>
              ))}
            </select>
          </div>
        </div>

        {selectedRule && (
          <div className="rounded bg-teal-50 px-4 py-3 text-teal-800">
            分值 <strong className="text-lg">{selectedRule.points}</strong> 分
            {selectedRule.note && <span className="ml-2 text-sm">（{selectedRule.note}）</span>}
          </div>
        )}

        <div>
          <span className={label}>活动名称 <span className="text-red-500">*</span></span>
          <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="如：第十七届蓝桥杯大赛C/C++广东赛区二等奖" required />
        </div>

        <div>
          <span className={label}>证明材料路径（可选，可后补）</span>
          <input className={input} value={evidencePath} onChange={(e) => setEvidencePath(e.target.value)} placeholder="照片文件名或链接" />
        </div>

        <div>
          <span className={label}>备注（可选）</span>
          <input className={input} value={remark} onChange={(e) => setRemark(e.target.value)} />
        </div>

        <div className="flex items-center gap-4">
          <button type="submit" disabled={submitting} className="rounded bg-teal-600 px-6 py-2 font-medium text-white hover:bg-teal-700 disabled:opacity-50">
            {submitting ? "保存中…" : "保存"}
          </button>
          <Link href="/list" className="text-teal-700 hover:underline">查看列表 →</Link>
          {message && <span>{message}</span>}
        </div>
      </form>
    </main>
  );
}
