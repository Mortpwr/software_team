# FastAPI + PostgreSQL 后端

轻量后端骨架，接口路径尽量与 `web/src/api/mockGateway.js` 保持一致，便于前端从 mock 切到真实服务。

## 运行

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
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

## 前端切换

前端统一走 `web/src/api/client.js`。对接时将 API mode 设置为 `remote`，baseUrl 指向：

```text
http://127.0.0.1:8000/api
```

当前后端用请求头临时模拟登录态：

- `X-Student-Id`
- `X-Role`: `student` / `teacher` / `coordinator` / `leader`

后续接微信登录或统一认证时，只需要替换 `app/deps.py` 中的 `get_current_session()`。
