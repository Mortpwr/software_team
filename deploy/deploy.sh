#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CRED="${ROOT}/deploy/server-credentials.env"

if [[ ! -f "${CRED}" ]]; then
  echo "请先创建 ${CRED}（可参考 deploy/server-credentials.example.env）" >&2
  exit 1
fi

# shellcheck disable=SC1090
source "${CRED}"

HOST="${SERVER_HOST:?}"
USER="${SERVER_USER:?}"
PASS="${SSH_PASSWORD:?}"
DIR="${DEPLOY_DIR:-/home/user/software_team}"
URL="${PUBLIC_URL:-http://${HOST}}"

askpass="$(mktemp)"
trap 'rm -f "${askpass}"' EXIT
printf '%s\n' '#!/bin/sh' "echo '${PASS}'" > "${askpass}"
chmod 700 "${askpass}"

ssh_cmd() {
  DISPLAY=:0 SSH_ASKPASS="${askpass}" SSH_ASKPASS_REQUIRE=force \
    ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 "${USER}@${HOST}" "$@"
}

rsync_cmd() {
  DISPLAY=:0 SSH_ASKPASS="${askpass}" SSH_ASKPASS_REQUIRE=force \
    rsync -az --delete \
      --exclude '.git/' \
      --exclude 'node_modules/' \
      --exclude 'web/node_modules/' \
      --exclude 'backend/.venv/' \
      --exclude 'backend/storage/uploads/' \
      --exclude 'backend/storage/*.json' \
      --exclude '.env' \
      --exclude 'deploy/server-credentials.env' \
      -e "ssh -o StrictHostKeyChecking=accept-new" \
      "${ROOT}/" "${USER}@${HOST}:${DIR}/"
}

preflight_build() {
  echo "==> 本地构建前端"
  (cd "${ROOT}/web" && npm ci --silent && npm run build)

  if [[ ! -d "${ROOT}/deploy/wheels" ]] || ! compgen -G "${ROOT}/deploy/wheels/*" >/dev/null; then
    echo "==> 下载 Python wheels"
    mkdir -p "${ROOT}/deploy/wheels"
    pip download -r "${ROOT}/backend/requirements.txt" -d "${ROOT}/deploy/wheels" \
      -i https://pypi.tuna.tsinghua.edu.cn/simple
  fi

  if [[ ! -d "${ROOT}/deploy/offline-debs" ]] || ! compgen -G "${ROOT}/deploy/offline-debs/*.deb" >/dev/null; then
    echo "缺少 deploy/offline-debs/*.deb，请先在本机下载离线系统包。" >&2
    exit 1
  fi
}

write_backend_env() {
  local env_file="${ROOT}/backend/.env.deploy.tmp"
  cat > "${env_file}" <<EOF
APP_NAME=学院学生综合服务与党团管理平台
APP_ENV=production
DATABASE_URL=postgresql+psycopg://${DB_USER}:${DB_PASSWORD}@127.0.0.1:5432/${DB_NAME}
CORS_ORIGINS=${URL},http://127.0.0.1,http://localhost
AUTO_CREATE_TABLES=true
AUTH_MODE=token
AUTH_SECRET=${AUTH_SECRET}
AUTH_TOKEN_HOURS=12
AUTH_DEMO_PASSWORD=${AUTH_DEMO_PASSWORD}
UPLOAD_DIR=${DIR}/backend/storage/uploads
MAX_UPLOAD_BYTES=31457280
DB_USER=${DB_USER}
DB_NAME=${DB_NAME}
DB_PASSWORD=${DB_PASSWORD}
EOF
  DISPLAY=:0 SSH_ASKPASS="${askpass}" SSH_ASKPASS_REQUIRE=force \
    scp -o StrictHostKeyChecking=accept-new "${env_file}" "${USER}@${HOST}:${DIR}/backend/.env"
  rm -f "${env_file}"
}

preflight_build

echo "==> 同步项目到 ${USER}@${HOST}:${DIR}"
ssh_cmd "mkdir -p '${DIR}'"
rsync_cmd

echo "==> 上传后端环境配置"
write_backend_env

echo "==> 在服务器执行安装脚本"
ssh_cmd "chmod +x '${DIR}/deploy/install-remote.sh' && SSH_PASSWORD='${PASS}' DEPLOY_DIR='${DIR}' bash '${DIR}/deploy/install-remote.sh'"

echo ""
echo "部署完成：${URL}"
echo "API 文档：${URL}/docs"
echo "演示登录口令见 deploy/server-credentials.env 中的 AUTH_DEMO_PASSWORD"
