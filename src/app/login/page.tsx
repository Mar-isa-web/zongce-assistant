"use client";

import { useState } from "react";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [studentId, setStudentId] = useState("");
  const [name, setName] = useState("");
  const [college, setCollege] = useState("");
  const [className, setClassName] = useState("");
  const [major, setMajor] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showForgot, setShowForgot] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const url = mode === "login" ? "/api/auth/login" : "/api/auth/register";
    const payload =
      mode === "login"
        ? { studentId, password }
        : { studentId, name, college, className, major, phone, password };
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      location.href = "/";
    } else {
      setError(data.error ?? "出错了，重试一次");
    }
  }

  const input =
    "w-full rounded border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-teal-500 focus:outline-none";
  const label = "mb-1 block text-sm font-medium text-zinc-800";

  return (
    <main className="mx-auto max-w-sm p-8">
      <h1 className="text-center text-3xl font-bold">综测小助手</h1>

      <div className="mt-6 flex rounded border border-zinc-300 text-sm">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`flex-1 py-2 ${mode === "login" ? "bg-teal-600 text-white" : "text-zinc-600"}`}
        >
          登录
        </button>
        <button
          type="button"
          onClick={() => setMode("register")}
          className={`flex-1 py-2 ${mode === "register" ? "bg-teal-600 text-white" : "text-zinc-600"}`}
        >
          注册新同学
        </button>
      </div>

      <form onSubmit={submit} className="mt-5 space-y-4">
        <div>
          <span className={label}>学号</span>
          <input
            className={input}
            value={studentId}
            onChange={(e) =>
              setStudentId(mode === "register" ? e.target.value.replace(/\D/g, "").slice(0, 9) : e.target.value)
            }
            inputMode={mode === "register" ? "numeric" : "text"}
            maxLength={mode === "register" ? 9 : undefined}
            placeholder={mode === "register" ? "9 位数字，如 251543528" : ""}
            required
          />
          {mode === "register" && (
            <p className="mt-1 text-xs text-zinc-400">只用来区分同学和导出综测表，不会公开</p>
          )}
        </div>
        {mode === "register" && (
          <>
            <div>
              <span className={label}>姓名</span>
              <input className={input} value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <span className={label}>学院</span>
              <input className={input} value={college} onChange={(e) => setCollege(e.target.value)} placeholder="如 计算机学院" required />
            </div>
            <div>
              <span className={label}>班级</span>
              <input
                type="text"
                inputMode="numeric"
                maxLength={7}
                className={input}
                value={className}
                onChange={(e) => setClassName(e.target.value.replace(/\D/g, "").slice(0, 7))}
                placeholder="7 位数字，如 2515435"
                required
              />
            </div>
            <div>
              <span className={label}>专业</span>
              <input className={input} value={major} onChange={(e) => setMajor(e.target.value)} placeholder="全称，如 软件工程" required />
            </div>
            <div>
              <span className={label}>手机号（选填）</span>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={11}
                className={input}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                placeholder="用于忘记密码时核验身份"
              />
            </div>
          </>
        )}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-800">
              密码{mode === "register" && "（至少 6 位）"}
            </span>
            {mode === "login" && (
              <button
                type="button"
                onClick={() => setShowForgot((v) => !v)}
                className="text-xs text-teal-700 hover:underline"
              >
                忘记密码？
              </button>
            )}
          </div>
          <input type="password" className={input} value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>

        {mode === "login" && showForgot && (
          <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
            忘记密码需要重置：请联系本班班委或管理员。注册时填了手机号的，管理员会核对手机号后 4 位来确认你的身份。
          </p>
        )}

        <button type="submit" disabled={busy} className="w-full rounded bg-teal-600 py-2 font-medium text-white hover:bg-teal-700 disabled:opacity-50">
          {busy ? "请稍候…" : mode === "login" ? "登录" : "注册并进入"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </main>
  );
}
