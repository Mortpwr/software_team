# 学院学生综合服务与党团管理平台

本项目是《软件工程导论》课程中的“学院学生综合服务与党团管理平台”课程实现版，当前主交付形态为 `web/ + backend/`。

- **线上访问地址**：http://10.10.0.21/
- **前端**：`web/`，Vue 3 + Vite 响应式 Web
- **后端**：`backend/`，FastAPI + PostgreSQL
- **根目录小程序代码**：已冻结，仅作过程材料保留，不作为当前互测主入口
- **文档目录**：`docs/`

## 给互测同学

如果你是其他小组成员，优先看这两份文档：

- [互测使用说明](docs/test-guide.md)：账号、推荐测试顺序、重点功能、已知边界、反馈格式
- [验收检查清单](docs/acceptance-checklist.md)：适合快速勾选关键测试点

当前系统默认直连真实后端，不再把浏览器本地 Mock 作为正式互测入口。

## 登录说明

当前测试版本使用 **学号 + 个人密码** 登录，角色由后端账号绑定返回，前端不需要手动选择角色。

- 默认初始密码规则：`Stu@` + 学号后 6 位
- 管理老师可在工作台中重置学生密码
- 常用测试账号：
  - `2024201581`：学生
  - `2023200444`：三级协同管理者
  - `2022200999`：管理老师
  - `2024210888`：学院领导

## 项目概览

当前主要能力包括：

- 学号密码登录、改密、重置密码
- 知识库检索、收藏、附件、官方链接
- 党团进度、理论自测、官方依据与校历
- 办事申请、草稿、审批、证明文档
- 通知发布、批次追踪、站内消息
- 荣誉展示、学生画像、学业分析、成绩单解析
- 工作台统计、日志、导入导出、模板管理

明确不做：

- 微信 OAuth
- 真实短信
- 电子签章
- 复杂选课
- 开放式 AI 对话

## 本地启动（开发）

**Windows（PowerShell）**

```powershell
.\scripts\setup-local.ps1
$env:PYTHONPATH="backend"; python -m app.seed
# 终端 1
.\scripts\dev-backend.ps1
# 终端 2
.\scripts\dev-web.ps1
```

**Linux / macOS**

```bash
pip install -r backend/requirements.txt
cd web && npm install && cd ..
PYTHONPATH=backend python -m app.seed
./scripts/dev-backend.sh
./scripts/dev-web.sh
```

访问：

```text
Web: http://127.0.0.1:5177/
API: http://127.0.0.1:8000/api
Docs: http://127.0.0.1:8000/docs
Cloud: http://10.10.0.21/
```

生产构建：

```bash
cd web && VITE_API_BASE=/api npm run build
```

云部署详见 [docs/deploy-cloud.md](docs/deploy-cloud.md)。仅 `user` 账号的服务器部署见 [docs/deploy-user-account.md](docs/deploy-user-account.md)。上云更新见 [docs/cloud-update-safe.md](docs/cloud-update-safe.md)。

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
| 应用壳 | `web/src/App.vue` | 路由分发、登录会话与导航。 |
| 页面 | `web/src/views/` | 每个业务页面一个 Vue 组件。 |
| API 门面 | `web/src/services/api.js` | 聚合各业务 API，保持页面调用统一。 |
| API 模块 | `web/src/services/modules/` | 按学生、知识库、党团、审批等业务域拆分。 |
| 请求层 | `web/src/api/client.js` | 统一处理真实后端请求、Token、Blob。 |
| Mock 网关 | `web/src/api/mockGateway.js` | 仅保留开发兼容，不作为默认互测入口。 |
| 状态 | `web/src/state/` | 会话与路由状态。 |

## 统一接口约定

前端页面只调用 `createApi(session)` 返回的方法，不直接访问 `fetch`、`localStorage` 或后端 URL。

新增前端接口时按这个顺序：

1. 在 `web/src/services/modules/<domain>.js` 增加方法。
2. 如需补离线兼容，再在 `web/src/api/mockGateway.js` 增加同路径 mock。
3. 后端在对应 `backend/app/routers/<domain>.py` 增加路由。
4. 页面组件只通过 `api.xxx()` 调用。

后端新增业务时建议遵守：

- 请求/响应字段优先使用前端已有驼峰命名。
- 数据库模型放 `backend/app/models.py`。
- 请求模型放 `backend/app/schemas.py`。
- 返回序列化放 `backend/app/services/serializers.py`。
- 权限判断优先复用 `backend/app/services/permissions.py`。
- 操作留痕优先调用 `audit()`。

## 调试与验证

常用检查：

```bash
python3 -m compileall backend/app
./scripts/smoke-backend.sh
BASE_URL=http://10.10.0.21 ./scripts/smoke-backend.sh
cd web && npm run build
```

接口调试：

- Swagger: `http://127.0.0.1:8000/docs`
- 健康检查: `GET /health`
- 运行配置: `GET /api/runtime`
- 当前会话: `GET /api/session`

前端调试：

- 默认走 `Remote`：确认 FastAPI 接口、权限和数据。
- 浏览器 DevTools 的 Network 面板可直接查看请求路径和响应。
- 若模板下载返回“template file not uploaded”，表示需先在工作台上传真实模板文件后再测试下载链路。

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
