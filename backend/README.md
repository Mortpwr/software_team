# FastAPI + PostgreSQL 后端

轻量后端骨架，接口路径尽量与 `web/src/api/mockGateway.js` 保持一致，便于前端从 mock 切到真实服务。

## 模块边界

- `app/main.py`：FastAPI 应用创建、CORS、路由挂载。
- `app/routers/`：按业务域拆分接口，新增功能优先新增或扩展对应 router。
- `app/models.py`：SQLAlchemy 持久化模型。
- `app/schemas.py`：Pydantic 请求模型。
- `app/services/serializers.py`：数据库对象到前端响应对象的统一序列化。
- `app/services/permissions.py`：角色权限和协同管理者范围控制。
- `app/services/common.py`：通用 ID、时间戳、审计日志工具。
- `app/core/config.py`：环境变量和运行配置。

## 运行

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

也可以在仓库根目录直接运行：

```bash
./scripts/dev-backend.sh
```

本机开发数据库约定：

```text
数据库: student_service
用户: student_service
密码: student_service
```

初始化数据库并注入演示数据：

```bash
python -m app.seed
```

默认启动服务时不自动建表，避免数据库暂不可用时整个 API 进程无法启动。若需要启动时自动建表，可在 `.env` 中设置：

```text
AUTO_CREATE_TABLES=true
```

文件上传相关配置：

```text
UPLOAD_DIR=backend/storage/uploads
MAX_UPLOAD_BYTES=31457280
```

认证相关配置：

```text
AUTH_MODE=header
AUTH_SECRET=dev-secret-change-me
AUTH_TOKEN_HOURS=12
AUTH_DEMO_PASSWORD=demo123456
```

接口冒烟检查：

```bash
./scripts/smoke-backend.sh
```

## 前端切换

前端统一走 `web/src/api/client.js`。对接时将 API mode 设置为 `remote`，baseUrl 指向：

```text
http://127.0.0.1:8000/api
```

开发阶段支持两种认证模式。`AUTH_MODE=header` 时仍可用请求头模拟登录态：

- `X-Student-Id`
- `X-Role`: `student` / `teacher` / `coordinator` / `leader`

真实联调时可调用 `POST /api/auth/login` 获取 Bearer Token，再由业务接口通过 `Authorization: Bearer <token>` 识别当前用户。若设置 `AUTH_MODE=token`，未携带有效 Token 的业务请求会返回 `401`。

后续接微信登录或统一认证时，只需要替换 `app/routers/auth.py` 与 `app/deps.py` 中的认证实现，业务路由不需要感知认证来源。

## 新增接口约定

1. 请求模型先写入 `app/schemas.py`，避免路由中散落字段解析。
2. 权限判断复用 `require_roles()` 或 `scoped_student_ids()`。
3. 返回数据优先经过 `app/services/serializers.py`，保持前端字段名稳定。
4. 有管理操作时调用 `audit()` 写入审计日志。
5. 前端应在 `web/src/services/modules/<domain>.js` 增加同名调用，并在 `web/src/api/mockGateway.js` 补齐 mock 契约。

## 调试建议

- 单纯检查语法：`python3 -m compileall backend/app`
- 检查核心接口：`./scripts/smoke-backend.sh`
- 查看路由文档：`http://127.0.0.1:8000/docs`
- 查看当前运行配置：`GET /api/runtime`
- 查看当前会话解析：`GET /api/session`
