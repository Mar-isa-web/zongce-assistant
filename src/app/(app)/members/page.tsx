"use client";

import { useEffect, useState } from "react";

type Member = {
  student_id: string;
  name: string;
  class_name: string;
  college: string;
  major: string;
  phone: string;
  role: string;
  must_change_password: boolean;
  has_phone: boolean;
};

// 成员管理（仅管理员）：查看成员、把某人重置为临时密码
export default function MembersPage() {
  const [list, setList] = useState<Member[] | null>(null);
  const [error, setError] = useState("");
  const [confirmId, setConfirmId] = useState("");
  const [busyId, setBusyId] = useState("");
  const [result, setResult] = useState<{ name: string; studentId: string; tempPassword: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // 只负责取数据，不碰 state：这样可以在 effect 里安全调用
  async function fetchMembers(): Promise<Member[]> {
    const res = await fetch("/api/admin/members");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "加载失败，刷新重试");
    return data as Member[];
  }

  useEffect(() => {
    let alive = true;
    fetchMembers()
      .then((data) => {
        if (!alive) return;
        setList(data);
        setError("");
      })
      .catch((e: Error) => {
        if (!alive) return;
        setError(e.message);
        setList([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  async function reset(m: Member) {
    setConfirmId("");
    setBusyId(m.student_id);
    setError("");
    const res = await fetch("/api/admin/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: m.student_id }),
    });
    const data = await res.json().catch(() => ({}));
    setBusyId("");
    if (!res.ok) {
      setError(data.error ?? "重置失败，重试一次");
      return;
    }
    setResult({ name: data.name, studentId: data.studentId, tempPassword: data.tempPassword });
    setCopied(false);
    fetchMembers().then(setList).catch(() => {});
  }

  async function copy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.tempPassword);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold">成员管理</h1>
      <p className="mt-1 text-sm text-zinc-500">
        同学忘记密码时，在这里重置为临时密码。重置后他的所有设备会立即下线，用临时密码登录必须先改密码。
      </p>

      <a
        href="/ranking"
        className="mt-3 inline-block rounded border border-teal-600 px-3 py-1.5 text-sm text-teal-700 hover:bg-teal-50"
      >
        看全班排名 →
      </a>

      {result && (
        <div className="mt-4 rounded border border-teal-200 bg-teal-50 p-3 text-sm text-teal-900">
          <div className="font-medium">
            已重置：{result.name}（{result.studentId}）
          </div>
          <div className="mt-1">
            临时密码：
            <code className="mx-1 rounded bg-white px-1.5 py-0.5 font-mono text-base text-zinc-900">
              {result.tempPassword}
            </code>
            <button type="button" onClick={copy} className="text-xs text-teal-700 underline">
              {copied ? "已复制" : "复制"}
            </button>
          </div>
          <div className="mt-1 text-xs text-teal-700">请私下转告本人，不要发在群里。</div>
        </div>
      )}

      {error && <p className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {list === null && <p className="mt-6 text-sm text-zinc-500">加载中…</p>}

      {list && list.length > 0 && (
        <>
          <p className="mt-4 text-xs text-zinc-400">共 {list.length} 人</p>
          <ul className="mt-1">
            {list.map((m) => (
              <li key={m.student_id} className="flex items-start justify-between gap-3 border-b border-zinc-100 py-3">
                <div className="min-w-0">
                  <div className="font-medium text-zinc-900">
                    {m.name}
                    <span className="ml-1.5 text-xs font-normal text-zinc-400">{m.student_id}</span>
                    {m.role === "admin" && (
                      <span className="ml-1.5 rounded bg-teal-100 px-1.5 text-xs text-teal-700">管理员</span>
                    )}
                    {m.must_change_password && (
                      <span className="ml-1.5 rounded bg-amber-100 px-1.5 text-xs text-amber-800">待改密</span>
                    )}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-zinc-500">
                    {m.class_name}
                    {m.major && ` · ${m.major}`}
                    {" · "}
                    {m.has_phone ? `手机 ${m.phone}` : "未绑手机号"}
                  </div>
                </div>

                {m.role === "admin" ? (
                  <span className="shrink-0 pt-0.5 text-xs text-zinc-300">—</span>
                ) : confirmId === m.student_id ? (
                  <div className="flex shrink-0 items-center gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => reset(m)}
                      className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
                    >
                      确认重置
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmId("")}
                      className="text-xs text-zinc-500 hover:underline"
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={busyId === m.student_id}
                    onClick={() => setConfirmId(m.student_id)}
                    className="shrink-0 rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-600 hover:border-teal-600 hover:text-teal-700 disabled:opacity-50"
                  >
                    {busyId === m.student_id ? "重置中…" : "重置密码"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
