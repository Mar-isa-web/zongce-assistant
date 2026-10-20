# 项目交接说明（PROJECT-HANDOFF）

> 给任何接手本项目的工具或人：先读完这份文档再动代码。
> 最后更新：2026-10-20（MVP 切片 0-6 + v2 第 1-5 项已完成并上线，线上版本见文末）

## 一、这是什么

**综测小助手**：面向高校综合测评场景的全栈 Web 应用。学生录入活动 → 按学院评分细则（224 条，真实 PDF 入库）自动算分 → 一键生成官方综测表 Word。已部署于阿里云 ECS：`http://47.112.8.28:3000`。

## 二、技术栈与运行

- **Next.js 16（App Router）+ TypeScript + Tailwind**，`src/` 目录结构
- **数据库**：SQLite（better-sqlite3 **必须锁 v12.4.1，见下方大坑**），库文件 `db/zongce.db`（gitignore，不入仓库）
- **本地开发**：`npm install && npm run dev`（需先 `npm run db:init` 建库）
- **Word 导出**：docxtemplater + `templates/综测表_template.docx`（官方表格掏空的模板，53 个占位符）

## 三、⚠️ 已知大坑（踩过一次，别再踩）

1. **better-sqlite3 不能升 v13**：v13.0.3 在"阿里云经济型e + Ubuntu 22.04 + 内核 5.15 + Xeon"组合下，require 后首次 SQLite 操作 100% SIGSEGV（预编译和源码编译都崩；Windows 正常；二进制 md5 与官方一致非下载损坏）。**v12.4.1 全部正常**。升级前必须在这类服务器上冒烟验证；
2. **swap 必须用 dd 创建**：`fallocate` 方式（含云助手 SWAP 插件）在此类网络盘上不可靠；
3. **服务器访问 GitHub 直连不通**：克隆/拉取用 `https://gh-proxy.com/https://github.com/...` 前缀；
4. **本机代理端口会变**（7897 / 5454 / 换客户端后可能是别的），推送一律用 `npm run push`：
   `scripts/push.sh` 会先列出本机在监听的候选端口，再依次用真实 `git push` 去试（幂等，失败不影响远程），
   第一个成功的收工，全失败才回退直连。**不要手写 `-c http.proxy=...`**，也不要靠 curl 探 HTTPS——
   Clash 会做中间人证书、节点异常时返回 502，会把可用端口误判成不可用；
5. **中文经 GitBash 传 curl 会 GBK 乱码**：测 API 用 node fetch 或 `--data-binary @file`；
6. **测试前先查当前记录 id**：导入/重建后 id 会重排。

## 四、部署速查（深圳实例 47.112.8.28）

详见 `DEPLOY.md`（完整步骤）。核心命令：

```bash
# 服务器上更新版本
cd /opt/zongce-assistant && git pull https://gh-proxy.com/https://github.com/Mar-isa-web/zongce-assistant.git main \
  && npm ci --registry=https://registry.npmmirror.com && npm run build && systemctl restart zongce
# 备份数据库
cp db/zongce.db db/backup-$(date +%F).db
```

- systemd 服务名 `zongce`，`WorkingDirectory` 必须是项目根（db 和 templates 是 cwd 相对路径）
- 管理员账号 251543528（admin），线上库为全新空库+224 规则+演示账号 251500000/张三
- 当前线上版本见 `git log -1`（截至 2026-10-20 为 `ec70954`；v2 全部功能已上线）
- 部署前务必 `cp db/zongce.db db/backup-$(date +%F-%H%M).db`，服务器上已按此保留多份快照

## 五、v2 迭代状态（2026-10-19 完成）

已完成并上线：

1. **修改密码页** `/password`：旧密码校验 → 新密码 ≥6 位，改完踢掉其他设备会话、保留当前设备；
2. **注册绑定手机号 + 忘记密码入口**：手机号选填，`^1[3-9]\d{9}$` 格式校验 + 唯一性校验（含存量号码）；
3. **管理员重置成员密码** `/members`：临时密码 `zc+学号`，重置即删该生全部会话，并置 `must_change_password=1` 强制首次登录改密；`db.ts` 启动时幂等补列，**线上无需手动迁移**；
4. **移动端适配**：`globals.css` 的 `.table-cards` 在 <768px 把表格折成「标签—值」，总分页单独做卡片；
5. **班委视图** `/ranking`：全班排名，支持班级筛选，同分并列取靠前名次（与 `computeMajorRank` 口径一致）；
6. **注册数据规范**：班级必须 7 位数字（防止"2515435班"把同班拆组），专业去掉尾部"专业"二字。

明确**不做**：三级审核流、批量导入历史活动、数量型封顶规则（用户判断暂无必要）。

## 六、已知限制（接手前请知悉）

- 手机号唯一性只在接口层校验，**未建数据库唯一索引**；加索引需单独迁移（线上有存量数据）；
- 细则里"学年累计不超过 X 分"这类数量型封顶**尚未执行**，仅作为备注展示——目前 224 条里有 5 条带此类上限；
- 无短信 / 邮件验证码，忘记密码只能由管理员重置；
- 前端有两处历史 lint 报错（`rules` 页直引号、`list` 页 effect 内 setState），不影响运行。

## 七、验收文化（接手者请遵守）

- 小切片开发，一个切片一个提交，提交信息用中文描述功能；
- **双通道验收**：数值核对（API 输出 vs 手算）+ 界面肉眼/截图验收；
- 涉及算分的改动必须与手算逐分核对后才能合入；
- 深色模式、手机宽度（320px）也要能看。
