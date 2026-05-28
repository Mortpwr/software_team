#!/usr/bin/env bash
# 无 root 环境：清理残留 + 全新 clone + 部署（user 账号）
# 用法：bash scripts/server/fresh-install-user.sh
# 会保留：/opt/student_service/.env 、uploads/ 、venv/（若存在）
# 会删除：旧代码目录、旧备份、pip/npm 缓存、重复 clone

set -euo pipefail

BASE="${BASE:-/opt/student_service}"
APP_ROOT="${APP_ROOT:-$BASE/software_team}"
REPO_URL="${REPO_URL:-https://github.com/zhuqizhe122/software_team.git}"
KEEP_BACKUPS="${KEEP_BACKUPS:-1}"   # 保留最近 N 个备份目录，0=全删
STAMP=$(date +%Y%m%d_%H%M%S)
SAFE="/tmp/student_service_safety_$STAMP"

if [[ "$(id -u)" -eq 0 ]]; then
  echo "ERROR: 不要用 root 运行。请用 user 账号执行。"
  exit 1
fi

echo "=========================================="
echo "  学生服务平台 — 环境清理 + 全新部署"
echo "  用户: $(whoami)  基目录: $BASE"
echo "=========================================="

mkdir -p "$SAFE"

# ---- 0. 停后端 ----
echo ""
echo "==> [0/7] 停止旧后端进程"
systemctl --user stop student-service 2>/dev/null || true
if [[ -f "$BASE/student-service.pid" ]]; then
  pid=$(cat "$BASE/student-service.pid" 2>/dev/null || true)
  [[ -n "$pid" ]] && kill "$pid" 2>/dev/null || true
  rm -f "$BASE/student-service.pid"
fi
pkill -u "$(whoami)" -f "uvicorn app.main:app" 2>/dev/null || true
sleep 1

# ---- 1. 备份必留文件 ----
echo ""
echo "==> [1/7] 备份 .env 与 uploads"
[[ -f "$BASE/.env" ]] && cp -a "$BASE/.env" "$SAFE/.env" && echo "    已备份 .env"
[[ -d "$BASE/uploads" ]] && cp -a "$BASE/uploads" "$SAFE/uploads" && echo "    已备份 uploads"
# 旧目录里若也有 .env
for d in "$BASE"/software_team* "$HOME"/software_team; do
  [[ -f "$d/../.env" ]] && [[ ! -f "$SAFE/.env" ]] && cp -a "$d/../.env" "$SAFE/.env" 2>/dev/null || true
done

# ---- 2. 列出并删除重复/旧代码目录 ----
echo ""
echo "==> [2/7] 清理旧项目目录"
TO_REMOVE=(
  "$BASE/software_team.old"
  "$BASE/software_team.old."*
  "$BASE/software_team.bak"
  "$BASE/software_team.bak."*
  "$BASE/software_team_broken"
  "$HOME/software_team"
  "$HOME/software_team.old"
)
# 当前 software_team 也删掉以便全新 clone
TO_REMOVE+=("$APP_ROOT")

for p in "${TO_REMOVE[@]}"; do
  for match in $p; do
    [[ -e "$match" ]] || continue
    echo "    删除: $match"
    rm -rf "$match"
  done
done

# 仓库内旧 Node 本地网关数据（若曾拷贝到 BASE 下）
[[ -d "$BASE/server" ]] && echo "    删除旧 Node 目录: $BASE/server" && rm -rf "$BASE/server"

# ---- 3. 清理备份与缓存 ----
echo ""
echo "==> [3/7] 清理备份与缓存"
if [[ -d "$BASE/backups" ]]; then
  if [[ "$KEEP_BACKUPS" -eq 0 ]]; then
    rm -rf "$BASE/backups"
    mkdir -p "$BASE/backups"
    echo "    已清空 backups/"
  else
    mapfile -t dirs < <(ls -1dt "$BASE/backups"/*/ 2>/dev/null || true)
    n=${#dirs[@]}
    for ((i=KEEP_BACKUPS; i<n; i++)); do
      echo "    删除旧备份: ${dirs[$i]}"
      rm -rf "${dirs[$i]}"
    done
  fi
fi
rm -rf "$BASE/.cache/pip" "$BASE/.npm-cache" 2>/dev/null || true
rm -f "$BASE/.requirements.txt.hash" "$BASE/.package-lock.json.hash" 2>/dev/null || true
echo "    已清 pip/npm 缓存与依赖哈希标记"

# ---- 4. 清理日志与临时 ----
echo ""
echo "==> [4/7] 清理日志"
mkdir -p "$BASE/logs"
: > "$BASE/logs/student-service.log" 2>/dev/null || true
journalctl --user --vacuum-time=3d 2>/dev/null || true

# ---- 5. 全新 clone ----
echo ""
echo "==> [5/7] 克隆最新代码"
mkdir -p "$BASE"
git clone "$REPO_URL" "$APP_ROOT"
cd "$APP_ROOT"
echo "    版本: $(git log -1 --oneline)"

# ---- 6. 恢复 .env / uploads ----
echo ""
echo "==> [6/7] 恢复配置与上传文件"
if [[ -f "$SAFE/.env" ]]; then
  cp -a "$SAFE/.env" "$BASE/.env"
  echo "    已恢复 $BASE/.env"
else
  cp backend/.env.example "$BASE/.env"
  echo "    WARN: 未找到旧 .env，已从模板生成，请编辑 $BASE/.env"
fi
if [[ -d "$SAFE/uploads" ]]; then
  mkdir -p "$BASE/uploads"
  cp -a "$SAFE/uploads/." "$BASE/uploads/"
  echo "    已恢复 uploads/"
fi
rm -rf "$SAFE"

# ---- 7. 初始化 + 部署 ----
echo ""
echo "==> [7/7] 安装依赖并部署"
bash scripts/server/once-setup-china.sh
bash scripts/server/update-app.sh

systemctl --user start student-service 2>/dev/null || bash scripts/server/restart-backend.sh

echo ""
echo "=========================================="
echo "  完成。请浏览器访问: http://10.10.0.21/"
echo "  健康检查: curl -s http://127.0.0.1:8000/health"
echo "  日志: journalctl --user -u student-service -n 30 --no-pager"
echo "=========================================="
