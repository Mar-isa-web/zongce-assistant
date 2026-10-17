export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-6xl font-bold">综测小助手</h1>
      <p className="mt-4 text-zinc-500">v0.2 · 我的第一个全栈项目</p>
      <nav className="mt-8 flex gap-6 text-lg">
        <a href="/add" className="rounded bg-teal-600 px-5 py-2 text-white hover:bg-teal-700">录入活动</a>
        <a href="/list" className="rounded border border-zinc-400 px-5 py-2 hover:border-teal-600 hover:text-teal-700">活动列表</a>
      </nav>
    </main>
  );
}