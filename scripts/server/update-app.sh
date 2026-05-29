#!/usr/bin/env bash
# 日常安全更新（user 账号，无需 root/sudo）
# 用法：bash scripts/server/update-app.sh
#       bash scripts/server/update-app.sh --build-only
#       bash scripts/server/update-app.sh --no-backup

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=service-common.sh
source "$SCRIPT_DIR/service-common.sh"
service_common_init

APP_ROOT="${APP_ROOT:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
STAMP=$(date +%Y%m%d_%H%M%S)
DO_BACKUP=1
BUILD_ONLY=0
SKIP_GIT=0

for arg in "$@"; do
  case "$arg" in
    --no-backup) DO_BACKUP=0 ;;
    --build-only) BUILD_ONLY=1 ;;
    --skip-git) SKIP_GIT=1 ;;
  esac
done

ensure_run_as_app_user
cd "$APP_ROOT"
ensure_git_writable

export PIP_CACHE_DIR="${PIP_CACHE:-$BASE/.cache/pip}"
export npm_config_cache="${NPM_CACHE:-$BASE/.npm-cache}"
export npm_config_registry="${npm_config_registry:-https://registry.npmmirror.com}"

hash_file() {
  if command -v md5sum >/dev/null 2>&1; then md5sum "$1" | awk '{print $1}';
  elif command -v md5 >/dev/null 2>&1; then md5 -q "$1";
  else cksum "$1" | awk '{print $1}'; fi
}

need_pip=0
need_npm=0
REQ_HASH_FILE="$BASE/.requirements.txt.hash"
LOCK_HASH_FILE="$BASE/.package-lock.json.hash"

if [[ "$BUILD_ONLY" -eq 0 ]]; then
  if [[ "$DO_BACKUP" -eq 1 ]]; then
    if ! ensure_writable_dir "$BACKUP_ROOT"; then
      echo "WARN: $BACKUP_ROOT 不可写，跳过备份（可用 sudo chown -R user:user /opt/student_service 修复）"
    else
      echo "==> 备份到 $BACKUP_ROOT/$STAMP"
      mkdir -p "$BACKUP_ROOT/$STAMP"
      git rev-parse HEAD > "$BACKUP_ROOT/$STAMP/git_commit.txt"
      [[ -f "$ENV_FILE" ]] && cp "$ENV_FILE" "$BACKUP_ROOT/$STAMP/.env"
      [[ -d "$UPLOAD_DIR" ]] && cp -a "$UPLOAD_DIR" "$BACKUP_ROOT/$STAMP/uploads" 2>/dev/null || true
      [[ -d web/dist ]] && cp -a web/dist "$BACKUP_ROOT/$STAMP/web_dist" 2>/dev/null || true
      pg_dump_backup "$BACKUP_ROOT/$STAMP/student_service.sql"
      echo "备份 commit: $(cat "$BACKUP_ROOT/$STAMP/git_commit.txt")"
    fi
  fi

  if [[ "$SKIP_GIT" -eq 0 ]]; then
    git_sync_main || echo "WARN: git 同步失败，继续使用当前目录代码（scp 上传时可加 --skip-git 跳过）"
  else
    echo "==> 跳过 git 同步（使用当前目录已有代码）"
  fi

  current_req=$(hash_file backend/requirements.txt)
  if [[ ! -f "$REQ_HASH_FILE" ]] || [[ "$(cat "$REQ_HASH_FILE")" != "$current_req" ]]; then
    need_pip=1
  fi
fi

current_lock=$(hash_file web/package-lock.json)
if [[ ! -f "$LOCK_HASH_FILE" ]] || [[ "$(cat "$LOCK_HASH_FILE")" != "$current_lock" ]]; then
  need_npm=1
fi

# shellcheck disable=SC1091
source "$VENV_DIR/bin/activate"

if [[ "$need_pip" -eq 1 ]]; then
  echo "==> requirements.txt 有变化，更新 Python 依赖"
  pip install -r backend/requirements.txt
  echo "$current_req" > "$REQ_HASH_FILE"
else
  echo "==> Python 依赖无变化，跳过 pip install"
fi

if [[ "$BUILD_ONLY" -eq 0 ]]; then
  echo "==> 数据库轻量迁移"
  PYTHONPATH=backend python -m app.db.migrate
fi

if [[ "$need_npm" -eq 1 ]]; then
  echo "==> package-lock.json 有变化，npm install"
  cd web
  npm install
  cd ..
  echo "$current_lock" > "$LOCK_HASH_FILE"
else
  echo "==> 前端依赖无变化，跳过 npm install"
fi

echo "==> 构建前端"
cd web
VITE_API_BASE=/api npm run build
cd ..

if [[ "$BUILD_ONLY" -eq 0 ]]; then
  restart_backend
  health_check_backend || true
fi

echo "==> 完成"
