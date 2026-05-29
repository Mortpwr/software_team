#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${DEPLOY_DIR:-/home/user/software_team}"
BACKEND_ENV="${APP_DIR}/backend/.env"
OFFLINE_DEBS="${APP_DIR}/deploy/offline-debs"

if [[ ! -f "${BACKEND_ENV}" ]]; then
  echo "缺少 ${BACKEND_ENV}，请先执行 deploy.sh。" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "${BACKEND_ENV}"
set +a

sudo_cmd() {
  echo "${SSH_PASSWORD:?需要 SSH_PASSWORD 环境变量}" | sudo -S "$@"
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "未找到命令: $1" >&2
    exit 1
  fi
}

install_offline_debs() {
  if [[ ! -d "${OFFLINE_DEBS}" ]] || ! compgen -G "${OFFLINE_DEBS}/*.deb" >/dev/null; then
    echo "未找到离线 deb 包目录 ${OFFLINE_DEBS}" >&2
    return 1
  fi
  echo "==> 离线安装系统包（postgresql / nginx）"
  for _ in 1 2 3; do
    sudo_cmd dpkg -i "${OFFLINE_DEBS}"/*.deb 2>/dev/null || true
  done
  sudo_cmd dpkg --configure -a || true
}

echo "==> 检查 / 安装系统依赖"
if ! command -v psql >/dev/null 2>&1 || ! command -v nginx >/dev/null 2>&1; then
  install_offline_debs
fi

require_cmd psql
require_cmd nginx
require_cmd python3

echo "==> 安装 Python 依赖（离线 wheels）"
WHEELS="${APP_DIR}/deploy/wheels"
if [[ ! -d "${WHEELS}" ]] || ! compgen -G "${WHEELS}/*" >/dev/null; then
  echo "缺少 ${WHEELS}" >&2
  exit 1
fi
cd "${APP_DIR}/backend"
python3 -m venv .venv
.venv/bin/pip install -q --no-index --find-links "${WHEELS}" -r requirements.txt

if [[ ! -f "${APP_DIR}/web/dist/index.html" ]]; then
  echo "缺少前端构建产物 web/dist" >&2
  exit 1
fi

echo "==> 配置 PostgreSQL"
db_user="${DB_USER:-student_service}"
db_name="${DB_NAME:-student_service}"
db_pass="${DB_PASSWORD:?缺少 DB_PASSWORD}"

sudo_cmd systemctl enable postgresql
sudo_cmd systemctl start postgresql

sudo_cmd -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='${db_user}'" | grep -q 1 \
  || sudo_cmd -u postgres psql -c "CREATE USER ${db_user} WITH PASSWORD '${db_pass}';"
sudo_cmd -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='${db_name}'" | grep -q 1 \
  || sudo_cmd -u postgres psql -c "CREATE DATABASE ${db_name} OWNER ${db_user};"
sudo_cmd -u postgres psql -c "ALTER USER ${db_user} WITH PASSWORD '${db_pass}';"
sudo_cmd -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${db_name} TO ${db_user};"

mkdir -p "${APP_DIR}/backend/storage/uploads"

echo "==> 初始化数据库"
cd "${APP_DIR}"
PYTHONPATH=backend backend/.venv/bin/python -m app.seed

echo "==> 配置 systemd"
sudo_cmd cp "${APP_DIR}/deploy/software-team-api.service" /etc/systemd/system/software-team-api.service
sudo_cmd systemctl daemon-reload
sudo_cmd systemctl enable software-team-api
sudo_cmd systemctl restart software-team-api

echo "==> 配置 Nginx"
chmod o+x /home/"$(whoami)" 2>/dev/null || chmod o+x "${HOME}"
chmod -R a+rX "${APP_DIR}/web/dist"
sudo_cmd cp "${APP_DIR}/deploy/nginx-software-team.conf" /etc/nginx/sites-available/software-team
sudo_cmd ln -sf /etc/nginx/sites-available/software-team /etc/nginx/sites-enabled/software-team
sudo_cmd rm -f /etc/nginx/sites-enabled/default
sudo_cmd nginx -t
sudo_cmd systemctl enable nginx
sudo_cmd systemctl restart nginx

sleep 2
echo "==> 健康检查"
curl -fsS "http://127.0.0.1/health"
echo
curl -fsS "http://127.0.0.1/api/runtime" | head -c 300
echo
