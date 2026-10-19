#!/usr/bin/env bash
# 推送脚本：本机代理端口会变（7897 / 5454 / 换客户端后可能是别的），
# 而且"端口开着"不等于"代理能出网"，所以这里直接拿真实的 git 操作去试：
# 先按端口顺序试推送，第一个成功的就完事；都不行再直连试一次。
# 用法：npm run push   或   bash scripts/push.sh [分支名]
set -u

BRANCH="${1:-main}"
PORTS=(7897 5454 7890 1080 2080 10809)

try_push() {
  # $1 = 代理端口，空字符串表示直连
  local label="$1"
  if [ -z "$label" ]; then
    echo "== 尝试直连 =="
    git -c http.proxy= -c https.proxy= push origin "$BRANCH" 2>&1 | tail -3
  else
    echo "== 尝试 127.0.0.1:$label =="
    git -c http.proxy="http://127.0.0.1:$label" push origin "$BRANCH" 2>&1 | tail -3
  fi
  return "${PIPESTATUS[0]}"
}

echo "== 本机在监听的候选端口 =="
OPEN=()
for p in "${PORTS[@]}"; do
  if (exec 3<>"/dev/tcp/127.0.0.1/$p") 2>/dev/null; then
    echo "  · $p 有监听"
    OPEN+=("$p")
  fi
done
[ ${#OPEN[@]} -eq 0 ] && echo "  （常见代理端口都没监听）"

for p in ${OPEN[@]+"${OPEN[@]}"}; do
  if try_push "$p"; then
    echo "✅ 已通过 127.0.0.1:$p 推送"
    exit 0
  fi
done

if try_push ""; then
  echo "✅ 已通过直连推送"
  exit 0
fi

echo "❌ 代理和直连都没推上去。检查代理客户端状态，或手动跑 git push 看具体报错。"
exit 1
