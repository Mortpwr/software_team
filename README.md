# 学院学生综合服务与党团管理平台

本项目是“学院学生综合服务与党团管理平台”的课程实现版，当前包含：

- `backend/`：Python + FastAPI + PostgreSQL 后端。
- `web/`：Vue 3 + Vite 响应式 Web 前端。
- 根目录小程序代码：早期微信小程序结构与本地仓储实现，保留作课程过程材料。
- `docs/`：软件设计规格说明书和迭代记录。

## 快速启动

后端：

```bash
./scripts/dev-backend.sh
```

前端：

```bash
./scripts/dev-web.sh
```

访问：

```text
Web: http://127.0.0.1:5177/
API: http://127.0.0.1:8000/api
Docs: http://127.0.0.1:8000/docs
```

前端右上角可在 `Mock` 和 `Remote` 间切换。`Remote` 默认连接 `http://127.0.0.1:8000/api`，演示登录口令为：

```text
demo123456
```

## 模块划分

后端按业务路由拆分：

| 模块 | 文件 | 说明 |
| --- | --- | --- |
| 认证 | `backend/app/routers/auth.py` | 登录、Token 签发。 |
| 学生画像 | `backend/app/routers/students.py` | 学生信息、字段权限、导入导出。 |
| 知识库 | `backend/app/routers/knowledge.py` | 政策问答、附件、上下线。 |
| 申请审批 | `backend/app/routers/applications.py` | 草稿、提交、审批、证明文档。 |
| 通知消息 | `backend/app/routers/notices.py` | 通知发布、定时批次、站内信。 |
| 党团流程 | `backend/app/routers/party.py` | 阶段、时间线、提醒。 |
| 理论自测 | `backend/app/routers/theory.py` | 题库、答题、判分。 |
| 学业分析 | `backend/app/routers/academic.py` | 培养方案、学分进度、风险分析。 |
| 荣誉展示 | `backend/app/routers/honors.py` | 荣誉条目、证明材料可见范围。 |
| 工作台 | `backend/app/routers/workbench.py` | 统计、日志、管理端聚合接口。 |

前端按页面和接口域拆分：

| 层级 | 路径 | 说明 |
| --- | --- | --- |
| 应用壳 | `web/src/App.vue` | 路由分发、会话切换、API 模式切换。 |
| 页面 | `web/src/views/` | 每个业务页面一个 Vue 组件。 |
| API 门面 | `web/src/services/api.js` | 聚合各业务 API，保持页面调用统一。 |
| API 模块 | `web/src/services/modules/` | 按学生、知识库、党团、审批等业务域拆分。 |
| 请求层 | `web/src/api/client.js` | 统一处理 Mock/Remote、Header、Token、Blob。 |
| Mock 网关 | `web/src/api/mockGateway.js` | 本地演示数据和接口模拟。 |
| 状态 | `web/src/state/` | 会话与路由状态。 |

## 统一接口约定

前端页面只调用 `createApi(session)` 返回的方法，不直接访问 `fetch`、`localStorage` 或后端 URL。

新增前端接口时按这个顺序：

1. 在 `web/src/services/modules/<domain>.js` 增加方法。
2. 如需本地演示，在 `web/src/api/mockGateway.js` 增加同路径 mock。
3. 后端在对应 `backend/app/routers/<domain>.py` 增加路由。
4. 页面组件只通过 `api.xxx()` 调用。

后端新增业务时建议遵守：

- 请求/响应字段优先使用前端已有驼峰命名。
- 数据库模型放 `backend/app/models.py`。
- 请求模型放 `backend/app/schemas.py`。
- 返回序列化放 `backend/app/services/serializers.py`。
- 权限判断优先复用 `backend/app/services/permissions.py`。
- 操作留痕优先调用 `audit()`。

## 调试流程

常用检查：

```bash
python3 -m compileall backend/app
./scripts/smoke-backend.sh
cd web && npm run build
```

接口调试：

- Swagger: `http://127.0.0.1:8000/docs`
- 健康检查: `GET /health`
- 运行配置: `GET /api/runtime`
- 当前会话: `GET /api/session`

前端调试：

- `Mock` 模式：确认页面逻辑和交互，不依赖数据库。
- `Remote` 模式：确认 FastAPI 接口、权限和数据。
- 浏览器 DevTools 的 Network 面板可直接查看请求路径和响应。

## 数据与本地文件

本地演示文件默认写入：

```text
backend/storage/
```

其中上传文件、理论题库、荣誉附件元数据等均为课程演示数据，已通过 `.gitignore` 忽略。

## 后续扩展建议

- 新增业务模块时同时补：后端路由、前端 API 模块、Mock 契约、页面入口、README 说明。
- 生产化部署时建议把 JSON 演示存储迁移到数据库表。
- 文件下载后续可按业务来源增加单文件级权限校验。
- 定时通知后续可接入后台任务调度，而非手动派发。
