"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Rule } from "@/lib/types";

// 本地时区的今天（不用 toISOString：那是 UTC，早上8点前会得到昨天）
function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const DIMENSIONS = ["德育", "智育", "体育", "美育", "劳育"];
// 级别下拉的展示顺序：校级最高频放前面（默认选中），四级全保留
const LEVEL_ORDER = ["校级", "院级", "省级", "国家级"];

export default function AddPage() {
  const [rules, setRules] = useState<Rule[] | null>(null);
  const [loadError, setLoadError] = useState("");

  const [studentId, setStudentId] = useState("251543528");
  const [dimension, setDimension] = useState("");
  const [itemNo, setItemNo] = useState("");
  const [level, setLevel] = useState("");
  const [ruleId, setRuleId] = useState("");
  const [title, setTitle] = useState("");
  const [activityDate, setActivityDate] = useState("");

  useEffect(() => {
    setActivityDate(localToday());
  }, []);
  const [evidencePath, setEvidencePath] = useState("");
  const [remark, setRemark] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  if (rules === null && loadError === "") {
    fetch("/api/rules")
      .then((r) => r.json())
      .then(setRules)
      .catch(() => setLoadError("规则加载失败，请刷新重试"));
  }

  // 四级联动：每一级的可选项都由上一级的选中值过滤出来
  const itemOptions = useMemo(() => {
    if (!rules || !dimension) return [];
    const seen = new Map<number, string>();
    for (const r of rules) {
      if (r.dimension === dimension) seen.set(r.item_no, r.category);
    }
    return [...seen.entries()].sort((a, b) => a[0] - b[0]);
  }, [rules, dimension]);

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

  function pickDimension(v: string) {
    setDimension(v);
    setItemNo("");
    setLevel("");
    setRuleId("");
  }

  function pickItem(v: string) {
    setItemNo(v);
    setRuleId("");
    // 级别默认选中"校级"（没有校级这一级时选第一项；单项类只有"不分级"）
    if (!rules) return;
    const levels = new Set(
      rules.filter((r) => r.dimension === dimension && r.item_no === Number(v)).map((r) => r.level),
    );
    setLevel(levels.has("校级") ? "校级" : [...levels][0] ?? "");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    if (!selectedRule) {
      setMessage("请先把 育别→条目→级别→等级 选完整");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId,
        ruleId: selectedRule.rule_id,
        title,
        activityDate,
        evidencePath,
        remark,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (res.ok) {
      setMessage(`✅ 已保存（记录 #${data.activity_id}），分值 ${selectedRule.points} 分`);
      setTitle("");
      setEvidencePath("");
      setRemark("");
    } else {
      setMessage(`❌ ${data.error ?? "保存失败"}`);
    }
  }

  const input =
    "w-full rounded border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-teal-500 focus:outline-none";
  const label = "mb-1 block text-sm text-zinc-600";

  if (loadError) return <main className="p-8 text-red-600">{loadError}</main>;
  if (!rules) return <main className="p-8 text-zinc-500">规则加载中…</main>;

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-3xl font-bold">录入活动</h1>
      <p className="mt-1 text-zinc-500">选完 育别→条目→级别→等级，分值自动带出，不用手填</p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className={label}>学号</span>
            <input className={input} value={studentId} onChange={(e) => setStudentId(e.target.value)} required />
          </div>
          <div>
            <span className={label}>活动日期</span>
            <input type="date" className={input} value={activityDate} onChange={(e) => setActivityDate(e.target.value)} required />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className={label}>育别</span>
            <select className={input} value={dimension} onChange={(e) => pickDimension(e.target.value)} required>
              <option value="">请选择</option>
              {DIMENSIONS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <span className={label}>条目（细则第几条）</span>
            <select className={input} value={itemNo} onChange={(e) => pickItem(e.target.value)} required disabled={!dimension}>
              <option value="">请选择</option>
              {itemOptions.map(([no, cat]) => (
                <option key={no} value={no}>{no}. {cat}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className={label}>级别</span>
            <select className={input} value={level} onChange={(e) => { setLevel(e.target.value); setRuleId(""); }} required disabled={!itemNo}>
              {levelOptions.map((l) => (
                <option key={l} value={l}>{l === "" ? "（不分级）" : l}</option>
              ))}
            </select>
          </div>
          <div>
            <span className={label}>等级 / 身份</span>
            <select className={input} value={ruleId} onChange={(e) => setRuleId(e.target.value)} required disabled={!level}>
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
          <span className={label}>活动名称（证书/活动全称）</span>
          <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="如：第十七届蓝桥杯大赛C/C++程序设计大学B组广东赛区二等奖" required />
        </div>

        <div>
          <span className={label}>证明材料路径（照片文件名或链接，可后补）</span>
          <input className={input} value={evidencePath} onChange={(e) => setEvidencePath(e.target.value)} placeholder="如 D:\photos\lanqiao.jpg" />
        </div>

        <div>
          <span className={label}>备注（可不填）</span>
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
