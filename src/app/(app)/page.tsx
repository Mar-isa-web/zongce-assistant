export default function Home() {
  return (
    <main className="flex flex-col items-center px-4 pb-16 pt-10 sm:pt-20">
      <h1 className="text-center text-4xl font-bold sm:text-6xl">综测小助手</h1>
      <p className="mt-3 text-sm text-zinc-500 sm:mt-4 sm:text-base">v0.2 · 我的第一个全栈项目</p>
      <nav className="mt-8 grid w-full max-w-sm grid-cols-2 gap-3 text-base sm:mt-10 sm:flex sm:w-auto sm:max-w-none sm:gap-6 sm:text-lg">
        <a
          href="/score"
          className="col-span-2 rounded bg-teal-600 px-5 py-2.5 text-center text-white hover:bg-teal-700 sm:col-span-1 sm:py-2"
        >
          我的总分
        </a>
        <a
          href="/add"
          className="rounded border border-zinc-400 px-5 py-2.5 text-center hover:border-teal-600 hover:text-teal-700 sm:py-2"
        >
          录入活动
        </a>
        <a
          href="/list"
          className="rounded border border-zinc-400 px-5 py-2.5 text-center hover:border-teal-600 hover:text-teal-700 sm:py-2"
        >
          活动列表
        </a>
        <a
          href="/base"
          className="rounded border border-zinc-400 px-5 py-2.5 text-center hover:border-teal-600 hover:text-teal-700 sm:py-2"
        >
          基础分
        </a>
        <a
          href="/rules"
          className="rounded border border-zinc-400 px-5 py-2.5 text-center hover:border-teal-600 hover:text-teal-700 sm:py-2"
        >
          规则配置
        </a>
      </nav>
    </main>
  );
}
