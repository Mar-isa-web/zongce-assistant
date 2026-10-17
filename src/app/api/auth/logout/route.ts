import { NextResponse } from "next/server";
import { getSessionUser, destroySession, SESSION_COOKIE } from "@/lib/auth";

// POST /api/auth/logout → 删除会话并清 Cookie
export async function POST(request: Request) {
  const user = getSessionUser(request);
  if (user) {
    const token = request.headers
      .get("cookie") ?? "";
    const t = token
      .split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith(`${SESSION_COOKIE}=`))
      ?.slice(SESSION_COOKIE.length + 1);
    if (t) destroySession(t);
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
