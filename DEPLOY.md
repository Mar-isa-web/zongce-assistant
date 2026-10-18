# 部署指南（切片 7）——阿里云 ECS

> ✅ **2026-10-18 已在深圳实例（47.112.8.28）实际部署成功并全流程验证**（注册/录入/算分/Word 导出）。
> 预算：99 元/年（2核2G 经济型e + 40G ESSD + 3M 带宽，特价不可用券，续费仅 1 次同价）。

## 0. 实战踩坑记录（2026-10-18，北京实例全套故障 + 深圳实例定位真因）

1. **better-sqlite3 必须用 v12**：v13.0.3 在"经济型e + Ubuntu 22.04 + 内核 5.15"组合下，加载后首次 SQLite 操作 100% SIGSEGV（预编译与源码编译皆崩，Windows/其他平台正常）。package.json 已锁 `12.4.1`，**不要升级到 13**；
2. **GitHub 直连不通**（北京/深圳 ECS 均被掐）：`git clone https://gh-proxy.com/https://github.com/...` 镜像前缀可用；
3. **Node 用阿里云官方镜像**：`https://mirrors.aliyun.com/nodejs-release/v20.18.1/node-v20.18.1-linux-x64.tar.xz`（解压到 /usr/local 即用，官方原版文件）；
4. **swap 要用 dd 创建**（不要 fallocate，云助手 SWAP 插件用的就是 fallocate）：`dd if=/dev/zero of=/swapfile bs=1M count=2048`；
5. 依赖安装统一走 `--registry=https://registry.npmmirror.com`。

## 1. 购买与初始化 ECS

1. 阿里云"快速购买-基础版"：2核2G、Ubuntu 22.04 64位、40G ESSD，买 1 年（99 元）；地域随便（本次深圳可用区C正常）；
2. 安全组放行端口：**22**（SSH）、**3000**（应用，购买后需手动加规则）；
3. 控制台「重置实例密码」——选**在线重置**（无需重启生效）；
4. 本机连接：`ssh root@服务器IP`。

## 2. 服务器环境（一次性）

```bash
# Node.js 20（阿里云官方镜像，解压即用）
cd /tmp && curl -fsSLO https://mirrors.aliyun.com/nodejs-release/v20.18.1/node-v20.18.1-linux-x64.tar.xz
tar -xJf node-v20.18.1-linux-x64.tar.xz -C /usr/local --strip-components=1 && cd / && rm -f /tmp/*.tar.xz
apt-get update && apt-get install -y git

# 2G 内存防构建 OOM：swap 用 dd 创建（实打实写零，避免 fallocate 空洞风险）
dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
grep -q swapfile /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

## 3. 拉代码 + 构建（服务器上直接构建即可，2G 内存 + swap 实测通过）

```bash
cd /opt
git clone https://gh-proxy.com/https://github.com/Mar-isa-web/zongce-assistant.git
cd zongce-assistant
npm ci --registry=https://registry.npmmirror.com
npm run build    # 约 2-4 分钟
```


## 4. 数据库初始化（⚠️ 需要人工决策）

- **方案 A（推荐，给全班用）**：全新空库，同学自己注册
  ```bash
  npm run db:init
  ```
- **方案 B（带本地真实数据）**：`scp db/zongce.db root@服务器IP:/opt/zongce-assistant/db/`
  ⚠️ 含个人真实测评数据，放公网服务器前自行权衡隐私。

注：`db/` 在 .gitignore 里不会随 git 上去；`templates/综测表_template.docx` 在仓库里，git clone 自带。

## 5. 常驻启动（systemd）

`/etc/systemd/system/zongce.service`：

```ini
[Unit]
Description=zongce-assistant
After=network.target

[Service]
WorkingDirectory=/opt/zongce-assistant
ExecStart=/usr/local/bin/npm start
Environment=PORT=3000
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl enable --now zongce
```

## 6. 验证与首次使用

- 浏览器访问 `http://服务器IP:3000`（IP:端口方式**无需 ICP 备案**；以后绑域名才需要）；
- 管理员：先注册自己，再把数据库里自己那行的 `role` 改成 `admin`（`/rules` 编辑权限用）。

## 7. 更新版本

```bash
cd /opt/zongce-assistant && git pull && npm ci --registry=https://registry.npmmirror.com && npm run build && systemctl restart zongce
```

## 8. 试用阶段须知

- **备份**：`cp db/zongce.db db/backup-$(date +%F).db`（上改动前先备份）；
- **注册开放**：3000 公网开放 = 任何人可注册，试用阶段接受，v2 再加邀请码；
- **无 HTTPS**：密码散列存库（scrypt）但传输是明文 HTTP，试用前知情；以后绑了域名可用 Caddy 一键上 HTTPS。
