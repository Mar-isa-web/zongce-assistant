"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// 修改密码：旧密码校验 → 设置新密码。放 (app) 路由组内，自动受登录门卫保护
export default function PasswordPage() {
  const router = useRouter();
  const [forced, setForced] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  // 判断是不是"临时密码登录"：是的话改密前哪儿都去不了，这里给个说明
  useEffect(() => {
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => u && setForced(Boolean(u.must_change_password)))
      .catch(() => {});
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setDone(false);

    // 前端先挡一遍，省一次来回；真正的校验在后端重做一次
    if (newPassword.length < 6) {
      setError("新密码至少 6 位");
      return;
    }
    if (newPassword !== confirm) {
      setError("两次输入的新密码不一致");
      return;
    }
    if (newPassword === oldPassword) {
      setError("新密码不能和旧密码一样");
      return;
    }

    setBusy(true);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldPassword, newPassword }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);

    if (res.ok) {
      setDone(true);
      setOldPassword("");
      setNewPassword("");
      setConfirm("");
    } else if (res.status === 401) {
      router.push("/login");
    } else {
      setError(data.error ?? "出错了，重试一次");
    }
  }

  const input =
    "w-full rounded border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-teal-500 focus:outline-none";
  const label = "mb-1 block text-sm font-medium text-zinc-800";

  return (
    <main className="mx-auto max-w-sm p-8">
      <h1 className="text-2xl font-bold">修改密码</h1>
      {forced ? (
        <p className="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          你现在用的是管理员给的临时密码。请先设置自己的新密码，改完才能继续使用。
        </p>
      ) : (
        <p className="mt-2 text-sm text-zinc-500">改完后本机会保持登录，其他设备需要重新登录。</p>
      )}

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <span className={label}>旧密码</span>
          <input
            type="password"
            autoComplete="current-password"
            className={input}
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            required
          />
        </div>
        <div>
          <span className={label}>新密码（至少 6 位）</span>
          <input
            type="password"
            autoComplete="new-password"
            className={input}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
        </div>
        <div>
          <span className={label}>再输一次新密码</span>
          <input
            type="password"
            autoComplete="new-password"
            className={input}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded bg-teal-600 py-2 font-medium text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {busy ? "请稍候…" : "确认修改"}
        </button>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {done && <p className="text-sm text-teal-700">密码已修改，请保管好新密码。</p>}
        {done && forced && (
          <button
            type="button"
            onClick={() => router.push("/")}
            className="w-full rounded border border-teal-600 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50"
          >
            去首页
          </button>
        )}
      </form>
    </main>
  );
}
