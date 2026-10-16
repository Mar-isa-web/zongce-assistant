<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- 以下是本项目的工作约定，2026-10-16 由复盘会话与作者共同确定 -->

## 项目背景（给 AI 协作者）

这是江圳宇（Mar-isa-web）的第一个全栈项目「综测小助手」：帮同学自动核算综合测评分数的 Web 应用，真实用户是广东金融学院的同学们；同时也是作者练习 AI 协作开发的作品集项目。

- **路线图与进度以 README.md 的「开发路线图（MVP 切片）」为准**，完成一项勾一项，不要凭记忆猜进度。
- 技术栈：Next.js（App Router）+ TypeScript + Tailwind CSS；数据库计划用 SQLite。

## 与作者的协作约定（务必遵守）

作者（大二学生、编程新手）正在刻意练习 AI 协作开发，以下约定是训练的一部分：

1. **需求卡片先行**：动手前先和作者对齐「目标 / 约束 / 验收标准」三行；验收标准必须具体到可检查，不写"做好看一点"这种话。
2. **小步切片**：一个切片一次交付；每完成一个可见步骤就停下给作者看，单轮别闷头跑太远。
3. **边做边解释**：每次交付用新手能懂的话讲清楚"改了什么、为什么"；出现新概念（组件、路由、ORM……）顺带一段话讲明白。
4. **弱项自查**：格式细节、视觉呈现、数字计算、和现有代码的衔接是 AI 常错处，交付前主动逐项自查并如实报告结果。
5. **commit 纪律**：每到一个能运行的状态就提交；message 用中文说明"做了什么"，能跑的状态永远可以回退。
6. **会话收尾写接力简报**：按五行格式输出——「目标 / 完成 / 决定 / 未决 / 下一步」——供下个会话接手或复盘会话验收使用。
7. **学习红线**：作者需要真正掌握的原理性内容（如数据库设计、鉴权原理），优先讲解和引导思路，不直接代写成品。
