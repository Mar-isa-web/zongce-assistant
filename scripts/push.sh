#!/usr/bin/env bash
# 推送脚本：本机代理端口会变（7897 / 5454 / 换客户端后可能是别的），
# 这里依次试探，哪个通就用哪个推；都不通就直接直连试一次。
# 用法：npm run push   或   bash scripts/push.sh [分支名]
set -u

BRANCH="${1:-main}"
PORTS=(7897 5454 7890 1080)

echo "== 探测可用代理 =="
WORKING=""
for p in "${PORTS[@]}"; do
  if curl -s -o /dev/null --max-time 5 -x "http://127.0.0.1:$p" https://github.com; then
    echo "  ✓ 127.0.0.1:$p"
    WORKING="$p"
    break
  else
    echo "  ✗ 127.0.0.1:$p"
  fi
done

if [ -n "$WORKING" ]; then
  echo "== 用 127.0.0.1:$WORKING 推送 $BRANCH =="
  git -c http.proxy="http://127.0.0.1:$WORKING" push origin "$BRANCH"
else
  echo "== 没有可用代理，尝试直连 =="
  git -c http.proxy= -c https.proxy= push origin "$BRANCH"
fi
