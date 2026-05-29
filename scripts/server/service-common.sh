#!/usr/bin/env bash
# 无 root 部署共用函数（user 账号 + systemd --user 或 PID 文件进程管理）
# 被 update-app.sh / restart-backend.sh / once-setup-china.sh source

service_common_init() {
  if [[ -z "${BASE:-}" ]]; then
    if [[ -d /opt/student_service ]] && [[ -w /opt/student_service ]]; then
      BASE="/opt/student_service"
    elif [[ -d "$HOME/student_service" ]]; then
      BASE="$HOME/student_service"
    else
      BASE="/opt/student_service"
    fi
  fi
  BASE="${BASE:-$HOME/student_service}"
  APP_ROOT="${APP_ROOT:-$BASE/software_team}"
  VENV_DIR="${VENV_DIR:-$BASE/venv}"
  UPLOAD_DIR="${UPLOAD_DIR:-$BASE/uploads}"
  ENV_FILE="${ENV_FILE:-$BASE/.env}"
  PIP_CACHE="${PIP_CACHE:-$BASE/.cache/pip}"
  NPM_CACHE="${NPM_CACHE:-$BASE/.npm-cache}"
  LOG_DIR="${LOG_DIR:-$BASE/logs}"
  PID_FILE="${PID_FILE:-$BASE/student-service.pid}"
  BACKUP_ROOT="${BACKUP_ROOT:-$BASE/backups}"
  if [[ ! -d "$BACKUP_ROOT" ]] || [[ ! -w "$BACKUP_ROOT" ]]; then
    BACKUP_ROOT="$HOME/student_service_backups"
  fi
  RUN_USER="${RUN_USER:-$(whoami)}"
}

ensure_writable_dir() {
  local dir="$1"
  mkdir -p "$dir" 2>/dev/null || true
  if [[ -d "$dir" ]] && [[ -w "$dir" ]]; then
    return 0
  fi
  return 1
}

ensure_run_as_app_user() {
  if [[ "$(id -u)" -eq 0 ]]; then
    echo "ERROR: 请勿使用 root 运行本脚本。"
    echo "      本环境仅配置 user 账号，请执行：bash scripts/server/update-app.sh"
    exit 1
  fi
}

ensure_git_writable() {
  local git_dir="$APP_ROOT/.git"
  if [[ ! -d "$git_dir" ]]; then
    return 0
  fi
  if [[ ! -w "$git_dir" ]]; then
    echo "ERROR: $git_dir 不可写（可能曾被 sudo 修改过）。"
    echo "      需一次性修复目录归属（由虚拟机管理员执行，无 root 时可联系运维）："
    echo "      chown -R $RUN_USER:$RUN_USER $APP_ROOT"
    exit 1
  fi
}

git_sync_main() {
  echo "==> 同步 GitHub main（fetch + reset，避免 merge 冲突）"
  git fetch origin
  git reset --hard origin/main
  echo "当前版本：$(git log -1 --oneline)"
}

pg_dump_backup() {
  local out_file="$1"
  if ! command -v pg_dump >/dev/null 2>&1; then
    echo "WARN: 未安装 pg_dump，跳过数据库备份"
    return 0
  fi
  local db_url=""
  if [[ -f "$ENV_FILE" ]]; then
    db_url=$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")
  fi
  if [[ -n "$db_url" ]]; then
    pg_dump "$db_url" > "$out_file" 2>/dev/null && return 0
  fi
  pg_dump student_service > "$out_file" 2>/dev/null && return 0
  echo "WARN: pg_dump 失败（检查 .env 中 DATABASE_URL 或本机 PostgreSQL 权限），已跳过数据库备份"
  return 0
}

backend_is_active() {
  if systemctl --user is-active --quiet student-service 2>/dev/null; then
    return 0
  fi
  if systemctl is-active --quiet student-service 2>/dev/null; then
    return 0
  fi
  if [[ -f "$PID_FILE" ]]; then
    local pid
    pid=$(cat "$PID_FILE" 2>/dev/null || true)
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      return 0
    fi
  fi
  return 1
}

restart_backend() {
  mkdir -p "$LOG_DIR"

  if systemctl --user is-active --quiet student-service 2>/dev/null || \
     systemctl --user list-unit-files student-service.service 2>/dev/null | grep -q student-service; then
    echo "==> 重启 systemd --user student-service"
    systemctl --user restart student-service
    systemctl --user status student-service --no-pager || true
    return 0
  fi

  if systemctl is-active --quiet student-service 2>/dev/null; then
    echo "==> 重启 systemd student-service（当前用户有权限）"
    systemctl restart student-service
    systemctl status student-service --no-pager || true
    return 0
  fi

  echo "==> 使用 PID 文件重启 uvicorn（无 systemd 或未安装单元）"
  bash "$APP_ROOT/scripts/server/restart-backend.sh"
}

health_check_backend() {
  if curl -sf http://127.0.0.1:8000/health >/dev/null 2>&1; then
    echo "==> 健康检查通过"
    return 0
  fi
  echo "WARN: /health 未响应"
  echo "      用户 systemd 日志：journalctl --user -u student-service -n 50 --no-pager"
  echo "      或查看：$LOG_DIR/student-service.log"
  return 1
}
