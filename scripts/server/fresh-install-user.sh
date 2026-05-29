#!/usr/bin/env bash
# 无 root 环境：清理残留 + 全新 clone + 部署（user 账号）
# 用法：bash fresh-install-user.sh
#       BASE=$HOME/student_service bash fresh-install-user.sh   # /opt 无权限时

set -u pipefail

REPO_URL="${REPO_URL:-https://github.com/zhuqizhe122/software_team.git}"
KEEP_BACKUPS="${KEEP_BACKUPS:-1}"
STAMP=$(date +%Y%m%d_%H%M%S)
SAFE="$HOME/.student_service_safety_$STAMP"
LEGACY_BASE="/opt/student_service"

if [[ "$(id -u)" -eq 0 ]]; then
  echo "ERROR: 不要用 root 运行。"
  exit 1
fi

pick_base() {
  if [[ -n "${BASE:-}" ]]; then
    mkdir -p "$BASE" 2>/dev/null || true
    if [[ -d "$BASE" ]] && [[ -w "$BASE" ]]; then
      export APP_ROOT="${APP_ROOT:-$BASE/software_team}"
      return 0
    fi
    echo "ERROR: 指定的 BASE=$BASE 不可写"
    exit 1
  fi
  if [[ -d "$LEGACY_BASE" ]] && [[ -w "$LEGACY_BASE" ]]; then
    BASE="$LEGACY_BASE"
  else
    BASE="$HOME/student_service"
    echo "==> /opt/student_service 不可写，改用: $BASE"
  fi
  export BASE APP_ROOT="$BASE/software_team"
  mkdir -p "$BASE"
}

safe_rm() {
  local target="$1"
  [[ -e "$target" ]] || return 0
  if rm -rf "$target" 2>/dev/null; then
    echo "    已删除: $target"
  else
    echo "    跳过(无权限): $target"
  fi
}

try_copy_env_uploads() {
  local src_base="$1"
  [[ -f "$src_base/.env" ]] && [[ ! -f "$SAFE/.env" ]] && cp -a "$src_base/.env" "$SAFE/.env" 2>/dev/null && echo "    已从 $src_base 备份 .env"
  [[ -d "$src_base/uploads" ]] && [[ ! -d "$SAFE/uploads" ]] && cp -a "$src_base/uploads" "$SAFE/uploads" 2>/dev/null && echo "    已从 $src_base 备份 uploads"
}

sync_dist_to_legacy_nginx() {
  local legacy_dist="$LEGACY_BASE/software_team/web/dist"
  local new_dist="$APP_ROOT/web/dist"
  [[ -d "$new_dist" ]] || return 0
  [[ "$BASE" == "$LEGACY_BASE" ]] && return 0
  if [[ -d "$(dirname "$legacy_dist")" ]] && [[ -w "$(dirname "$legacy_dist")" ]]; then
    echo "==> 同步前端到 Nginx 常用路径: $legacy_dist"
    mkdir -p "$(dirname "$legacy_dist")"
    safe_rm "$legacy_dist"
    cp -a "$new_dist" "$legacy_dist"
    echo "    已同步 web/dist"
  else
    echo "WARN: 无法写入 $legacy_dist"
    echo "      请让管理员把 Nginx root 改为: $new_dist"
    echo "      或执行: sudo chown -R $(whoami):$(id -gn) $LEGACY_BASE"
  fi
}

pick_base

echo "=========================================="
echo "  环境清理 + 全新部署"
echo "  用户: $(whoami)  BASE: $BASE"
echo "=========================================="

mkdir -p "$SAFE"

echo ""
echo "==> [0] 停止旧后端"
systemctl --user stop student-service 2>/dev/null || true
for pidfile in "$BASE/student-service.pid" "$LEGACY_BASE/student-service.pid"; do
  if [[ -f "$pidfile" ]]; then
    pid=$(cat "$pidfile" 2>/dev/null || true)
    [[ -n "$pid" ]] && kill "$pid" 2>/dev/null || true
    rm -f "$pidfile" 2>/dev/null || true
  fi
done
pkill -u "$(whoami)" -f "uvicorn app.main:app" 2>/dev/null || true
sleep 1

echo ""
echo "==> [1] 备份 .env / uploads（可读即可，不要求可写 /opt）"
try_copy_env_uploads "$BASE"
try_copy_env_uploads "$LEGACY_BASE"
try_copy_env_uploads "$HOME"

echo ""
echo "==> [2] 清理当前用户可写的旧目录"
for p in \
  "$BASE/software_team" \
  "$BASE/software_team.old" \
  "$BASE/software_team.bak" \
  "$HOME/software_team" \
  "$HOME/software_team.old" \
  "$HOME/software_team_tmp" \
  "$HOME/fresh-install-user.sh"; do
  safe_rm "$p"
done
for p in "$BASE"/software_team.old.* "$BASE"/software_team.bak.*; do
  safe_rm "$p"
done
safe_rm "$BASE/server"

echo ""
echo "==> [3] 清理缓存（仅 BASE 下）"
if [[ -d "$BASE/backups" ]] && [[ -w "$BASE/backups" ]]; then
  mapfile -t dirs < <(ls -1dt "$BASE/backups"/*/ 2>/dev/null || true)
  n=${#dirs[@]}
  for ((i=KEEP_BACKUPS; i<n; i++)); do
    safe_rm "${dirs[$i]}"
  done
fi
safe_rm "$BASE/.cache"
safe_rm "$BASE/.npm-cache"
rm -f "$BASE/.requirements.txt.hash" "$BASE/.package-lock.json.hash" 2>/dev/null || true

echo ""
echo "==> [4] 克隆最新代码 -> $APP_ROOT"
mkdir -p "$BASE"
if [[ -d "$APP_ROOT/.git" ]]; then
  echo "ERROR: $APP_ROOT 仍存在且无法删除，请改用: BASE=$HOME/student_service bash $0"
  exit 1
fi
git clone "$REPO_URL" "$APP_ROOT"
cd "$APP_ROOT"
echo "    $(git log -1 --oneline)"

echo ""
echo "==> [5] 恢复 .env / uploads"
if [[ -f "$SAFE/.env" ]]; then
  cp -a "$SAFE/.env" "$BASE/.env"
  echo "    已恢复 $BASE/.env"
else
  cp backend/.env.example "$BASE/.env"
  echo "    已从模板生成 $BASE/.env ，请检查 DATABASE_URL"
fi
if [[ -d "$SAFE/uploads" ]]; then
  mkdir -p "$BASE/uploads"
  cp -a "$SAFE/uploads/." "$BASE/uploads/"
fi
rm -rf "$SAFE"

echo ""
echo "==> [6] 安装并部署"
export BASE APP_ROOT
bash scripts/server/once-setup-china.sh
bash scripts/server/update-app.sh

sync_dist_to_legacy_nginx

systemctl --user start student-service 2>/dev/null || bash scripts/server/restart-backend.sh

echo ""
echo "=========================================="
echo "  完成"
echo "  BASE=$BASE"
echo "  健康: curl -s http://127.0.0.1:8000/health"
echo "  访问: http://10.10.0.21/"
echo "=========================================="
