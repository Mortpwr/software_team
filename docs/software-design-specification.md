# 学院学生综合服务与党团管理平台软件设计规格说明书

文档编号：学院学生综合服务与党团管理平台 – SDS – 2.0

课程名称：软件工程导论  
项目名称：学院学生综合服务与党团管理平台  
成员信息：李煜南、许珀铭、朱启哲、赵子涵  
提交日期：2026-05-15  
文档版本：V2.0

## 文档变更历史记录

| 序号 | 变更日期 | 变更人员 | 变更内容详情描述 | 版本 |
| --- | --- | --- | --- | --- |
| 1 | 2026-05-15 | 项目组 | 根据需求分析文档与当前前后端实现编写软件设计规格说明书初版 | V1.0 |
| 2 | 2026-05-15 | 项目组 | 将 Web 前端由原生静态 SPA 重构为 Vue 3 + Vite 单页应用，补充组件化页面、服务层 API 封装、Vite 构建与路由冒烟验证说明 | V1.1 |
| 3 | 2026-05-15 | 项目组 | 完成第 1 轮迭代：前后端契约对齐，补充工作台辅助接口、协同管理者数据范围控制和工作台统计展示 | V1.2 |
| 4 | 2026-05-15 | 项目组 | 完成第 2 轮迭代：审批流闭环增强，补充草稿保存、驳回重提、申请详情和审批轨迹展示 | V1.3 |
| 5 | 2026-05-15 | 项目组 | 完成第 3 轮迭代：文件与模板能力，补充文件上传下载、模板下载、附件提交前上传和 30MB 限制 | V1.4 |
| 6 | 2026-05-15 | 项目组 | 完成第 4 轮迭代：知识库管理端，补充知识条目维护、上下线控制和未命中词转知识能力 | V1.5 |
| 7 | 2026-05-15 | 项目组 | 完成第 5 轮迭代：权限体系落地，补充集中权限 helper、协同管理者范围复用和前端按角色菜单收敛 | V1.6 |
| 8 | 2026-05-15 | 项目组 | 完成第 6 轮迭代：通知推送增强，补充批次已读动态统计和渠道可观测性展示 | V1.7 |
| 9 | 2026-05-15 | 项目组 | 完成第 7 轮迭代：党团流程管理，补充管理端学生阶段推进入口 | V1.8 |
| 10 | 2026-05-15 | 项目组 | 完成第 8 轮迭代：学生画像与导出，补充脱敏 CSV 导出和前端导出入口 | V1.9 |
| 11 | 2026-05-15 | 项目组 | 完成第 9 轮迭代：荣誉展示管理，补充荣誉条目新增、编辑和管理端维护入口 | V2.0 |

## 迭代记录

后续每次功能迭代均按以下固定格式记录：

| 字段 | 说明 |
| --- | --- |
| 迭代编号 | 迭代序号与名称。 |
| 迭代日期 | 完成本轮迭代的日期。 |
| 迭代目标 | 本轮迭代希望解决的主要问题。 |
| 实现范围 | 本轮纳入修改的模块、接口和页面。 |
| 主要变更 | 代码、数据、接口、权限或文档层面的具体变更。 |
| 验证方式 | 构建、接口、页面或手工验证方式。 |
| 遗留问题 | 本轮未解决但需要后续继续处理的问题。 |

### IR-001 前后端契约对齐

| 字段 | 内容 |
| --- | --- |
| 迭代编号 | IR-001 前后端契约对齐 |
| 迭代日期 | 2026-05-15 |
| 迭代目标 | 缩小 Vue Web 前端 mock 模式与 FastAPI remote 模式之间的行为差异，优先保证工作台、通知、学生列表和领导看板等基础契约一致。 |
| 实现范围 | `backend/app/routers/students.py`、`backend/app/routers/applications.py`、`backend/app/routers/notices.py`、`backend/app/routers/workbench.py`、`web/src/services/api.js`、`web/src/views/WorkbenchView.vue`。 |
| 主要变更 | 后端新增 `/workbench/knowledge/misses` 和 `/workbench/sms` 辅助接口；协同管理者发布通知时目标范围限制为本人班级；协同管理者查看学生列表和工作台申请时按本人班级收窄；领导看板补充高频未命中词和学业高风险人数统计；前端工作台接入未命中词与短信模拟统计。 |
| 验证方式 | 已执行 `python3 -m compileall backend/app`、FastAPI TestClient 关键接口冒烟、`npm run build` 前端构建验证。 |
| 遗留问题 | 短信模拟仍由通知批次推导，尚未独立建表；协同管理者的“授权范围”当前以班级为默认规则，后续需扩展为字段白名单与人员范围配置。 |

### IR-002 审批流闭环增强

| 字段 | 内容 |
| --- | --- |
| 迭代编号 | IR-002 审批流闭环增强 |
| 迭代日期 | 2026-05-15 |
| 迭代目标 | 对齐需求文档中“草稿、审批中、驳回后保留原值重提、审批轨迹可追溯”的 P0 审批流要求，使学生端和管理端具备更完整的申请办理闭环。 |
| 实现范围 | `backend/app/routers/applications.py`、`web/src/api/mockGateway.js`、`web/src/services/api.js`、`web/src/views/ApplyView.vue`、`web/src/views/WorkbenchView.vue`。 |
| 主要变更 | 后端新增 `/applications/draft` 草稿读取/保存接口和 `/applications/{id}/submit` 草稿/驳回单提交接口；提交接口支持从草稿或已驳回状态进入审批中并记录审计轨迹；学生端支持保存草稿、继续编辑、驳回后按原值修改重提、查看申请详情与审批轨迹；管理端审批列表支持查看申请详情和审批轨迹；mock 网关同步实现相同契约。 |
| 验证方式 | 已执行 `python3 -m compileall backend/app`、FastAPI TestClient 草稿保存/读取/提交/详情接口冒烟、`npm run build` 前端构建验证。 |
| 遗留问题 | 当前附件仍是元数据而非真实文件上传；证明 PDF/Word 生成尚未实现；“已提交”作为瞬时业务动作记录在轨迹中，数据库当前状态仍直接进入“审批中”。 |

### IR-003 文件与模板能力

| 字段 | 内容 |
| --- | --- |
| 迭代编号 | IR-003 文件与模板能力 |
| 迭代日期 | 2026-05-15 |
| 迭代目标 | 将申请附件和模板下载从“接口位/元数据模拟”推进到课程环境可运行的真实上传下载能力，并落实政策文档 30MB 限制口径。 |
| 实现范围 | `backend/app/routers/files.py`、`backend/app/main.py`、`backend/app/core/config.py`、`web/src/api/client.js`、`web/src/api/mockGateway.js`、`web/src/services/api.js`、`web/src/views/ApplyView.vue`、`web/src/views/KnowledgeView.vue`。 |
| 主要变更 | 新增 `/files/upload`、`/files/{id}/download`、`/templates/{id}/download` 后端接口；上传文件保存到本地课程演示目录并生成附件元数据；上传服务端限制单文件不超过 30MB 并阻断高风险脚本/可执行后缀；前端 API Client 支持 `FormData` 上传和 Blob 下载；申请提交/草稿保存前先上传原生文件并写入附件元数据；申请详情支持附件下载；知识库模板按钮接入真实下载；mock 网关同步返回文件元数据。 |
| 验证方式 | 已执行 `python3 -m compileall backend/app`、FastAPI TestClient 上传/下载/模板下载接口冒烟、`npm run build` 前端构建验证。 |
| 遗留问题 | 文件权限目前复用接口登录态但尚未实现细粒度业务单据级鉴权；模板下载当前生成演示占位文件，正式部署后需替换为真实 Word/Excel/PDF 文件；文件元数据目前存储在文件旁 JSON 中，后续可迁移到数据库表。 |

### IR-004 知识库管理端

| 字段 | 内容 |
| --- | --- |
| 迭代编号 | IR-004 知识库管理端 |
| 迭代日期 | 2026-05-15 |
| 迭代目标 | 将知识库从学生检索能力扩展为管理老师可维护能力，支持根据高频未命中词快速补充标准问答，提升知识库闭环运营能力。 |
| 实现范围 | `backend/app/routers/knowledge.py`、`backend/app/schemas.py`、`backend/app/services/serializers.py`、`web/src/api/mockGateway.js`、`web/src/services/api.js`、`web/src/views/WorkbenchView.vue`、`web/styles.css`。 |
| 主要变更 | 后端新增知识库管理列表、更新条目、上下线控制接口；知识条目序列化补充 `online` 字段；mock 网关同步支持创建、编辑、上线/下线和管理列表；前端工作台新增知识库维护表单、知识条目列表、高频未命中词转知识条目能力，管理老师可创建、编辑和上下线条目，学院领导可查看知识库管理列表。 |
| 验证方式 | 已执行 `python3 -m compileall backend/app`、FastAPI TestClient 知识库管理列表/创建/更新/下线接口冒烟、`npm run build` 前端构建验证。 |
| 遗留问题 | 知识条目的附件上传尚未与政策正文编辑联动；分类和标签仍为自由文本，后续可扩展为可维护字典；未命中词转知识目前生成草稿式内容，仍需管理老师人工完善后上线。 |

### IR-005 权限体系落地

| 字段 | 内容 |
| --- | --- |
| 迭代编号 | IR-005 权限体系落地 |
| 迭代日期 | 2026-05-15 |
| 迭代目标 | 将部分散落的角色判断收敛为统一权限函数，并在前端按角色收敛可见功能入口，降低越权访问和后续扩展成本。 |
| 实现范围 | `backend/app/services/permissions.py`、`backend/app/routers/students.py`、`backend/app/routers/applications.py`、`web/src/state/routes.js`、`web/src/App.vue`。 |
| 主要变更 | 新增后端 `require_roles`、`current_student`、`scoped_student_ids` 权限辅助函数；学生列表和工作台申请列表复用协同管理者班级范围规则；学生访问管理范围接口返回 403；前端路由配置补充角色可见范围，导航栏和移动端标签按当前角色过滤，不可访问路由自动回到首页。 |
| 验证方式 | 已执行 `python3 -m compileall backend/app`、FastAPI TestClient 学生/协同管理者权限接口冒烟、`npm run build` 前端构建验证。 |
| 遗留问题 | 后端仍有部分路由保留局部角色判断，后续可继续迁移到统一权限 helper；字段级可见/可编辑/可导出规则尚未完全配置化。 |

### IR-006 通知推送增强

| 字段 | 内容 |
| --- | --- |
| 迭代编号 | IR-006 通知推送增强 |
| 迭代日期 | 2026-05-15 |
| 迭代目标 | 进一步贴近需求文档中的通知统计口径，使站内渠道已读数根据实际消息阅读状态动态统计，并明确展示不同渠道的可观测性。 |
| 实现范围 | `backend/app/routers/notices.py`、`web/src/api/mockGateway.js`、`web/src/views/WorkbenchView.vue`。 |
| 主要变更 | 后端工作台批次列表返回时根据 `messages.read_at` 动态计算站内渠道已读数；mock 网关同步按站内信阅读状态回填批次已读数；前端批次统计表新增“可观测性”列，明确站内、邮件、短信模拟等渠道统计差异。 |
| 验证方式 | 已执行 `python3 -m compileall backend/app`、FastAPI TestClient 批次统计接口冒烟、`npm run build` 前端构建验证。 |
| 遗留问题 | 邮件和微信真实回执尚未接入，当前仍按“不可观测/模拟”展示；定时发送和失败重试队列尚未实现。 |

### IR-007 党团流程管理

| 字段 | 内容 |
| --- | --- |
| 迭代编号 | IR-007 党团流程管理 |
| 迭代日期 | 2026-05-15 |
| 迭代目标 | 在学生查看党团流程进度的基础上，补充管理老师维护学生党团阶段的最小闭环能力。 |
| 实现范围 | `web/src/services/api.js`、`web/src/views/WorkbenchView.vue`。 |
| 主要变更 | 前端服务层补充学生列表和党团阶段推进调用；管理工作台新增“党团阶段推进”表单，管理老师可选择学生、目标阶段并填写备注，调用后端 `/workbench/party/advance` 接口写入阶段历史。 |
| 验证方式 | 已执行 `python3 -m compileall backend/app`、FastAPI TestClient 党团阶段推进接口冒烟、`npm run build` 前端构建验证。 |
| 遗留问题 | 阶段定义和标准时间线仍使用前端/种子常量，尚未提供后台配置页面；自动提醒任务尚未随阶段推进自动生成。 |

### IR-008 学生画像与导出

| 字段 | 内容 |
| --- | --- |
| 迭代编号 | IR-008 学生画像与导出 |
| 迭代日期 | 2026-05-15 |
| 迭代目标 | 在现有学生画像展示基础上，补充管理老师可使用的脱敏数据导出能力，为后续批量维护和精准推送提供数据支撑。 |
| 实现范围 | `backend/app/routers/students.py`、`web/src/services/api.js`、`web/src/views/WorkbenchView.vue`。 |
| 主要变更 | 后端新增 `/students/export` CSV 导出接口，仅管理老师可访问；导出内容包含学号、姓名、年级、专业、班级、民族、脱敏手机号、政治面貌和导师信息；学生访问导出接口返回 403；前端工作台新增学生画像导出入口并通过 Blob 下载 CSV。 |
| 验证方式 | 已执行 `python3 -m compileall backend/app`、FastAPI TestClient 教师导出/学生拒绝访问接口冒烟、`npm run build` 前端构建验证。 |
| 遗留问题 | Excel 导入、字段白名单配置和导出审批授权尚未实现；当前导出格式为 CSV，后续可扩展为 xlsx。 |

### IR-009 荣誉展示管理

| 字段 | 内容 |
| --- | --- |
| 迭代编号 | IR-009 荣誉展示管理 |
| 迭代日期 | 2026-05-15 |
| 迭代目标 | 将奖励荣誉模块从学生侧展示扩展为管理老师可维护模块，支持持续更新榜样展示内容。 |
| 实现范围 | `backend/app/routers/honors.py`、`backend/app/schemas.py`、`web/src/api/mockGateway.js`、`web/src/services/api.js`、`web/src/views/WorkbenchView.vue`。 |
| 主要变更 | 后端新增荣誉条目创建和更新接口，仅管理老师可操作；mock 网关同步支持新增和编辑荣誉；前端工作台新增荣誉展示维护表单和荣誉条目列表，管理老师可新增、编辑荣誉名称、获奖人、年份、类别、专业、年级和简介。 |
| 验证方式 | 已执行 `python3 -m compileall backend/app`、FastAPI TestClient 荣誉创建/更新/学生拒绝访问接口冒烟、`npm run build` 前端构建验证。 |
| 遗留问题 | 荣誉附件上传和可见范围控制尚未接入；删除/下线能力暂未实现，后续可加入审计确认流程。 |

## 目录

1. [引言](#1引言)  
   1.1 [编写目的](#11-编写目的)  
   1.2 [读者对象](#12-读者对象)  
   1.3 [软件项目概述](#13-软件项目概述)  
   1.4 [文档概述](#14-文档概述)  
   1.5 [定义](#15-定义)  
   1.6 [参考资料](#16-参考资料)  
2. [软件设计约束](#2软件设计约束)  
   2.1 [软件设计目标和原则](#21-软件设计目标和原则)  
   2.2 [软件设计的约束和限制](#22-软件设计的约束和限制)  
3. [软件设计](#3软件设计)  
   3.1 [软件体系结构设计](#31-软件体系结构设计)  
   3.2 [用户界面设计](#32-用户界面设计)  
   3.3 [用例设计](#33-用例设计)  
   3.4 [类设计](#34-类设计)  
   3.5 [数据设计](#35-数据设计)  
   3.6 [部署设计](#36-部署设计)

## 1、引言

### 1.1 编写目的

本文档用于描述“学院学生综合服务与党团管理平台”的软件设计方案，明确系统的总体架构、模块划分、用户界面、核心用例实现、主要类与服务设计、数据库设计以及部署方案。

本文档在需求分析文档基础上进一步说明“如何实现系统”，为后续编码、联调、测试、部署和课程答辩提供统一设计依据。

### 1.2 读者对象

本文档面向以下读者：

- 项目组开发成员：依据本文档完成前端、后端、数据库和接口开发。
- 测试人员：依据本文档设计接口测试、功能测试和集成测试用例。
- 课程教师与答辩评审人员：了解系统设计思路、技术选型和模块边界。
- 甲方代表或学院管理方：确认设计方案是否符合学生事务管理场景。

### 1.3 软件项目概述

项目名称：学院学生综合服务与党团管理平台  
项目简称：学生综合服务平台  
项目代号：Student Service Platform

用户单位：学院学生工作相关管理部门  
开发单位：软件工程导论课程项目组

本系统面向学院学生事务办理与党团管理场景，提供政策知识库、党团流程进度、通知公告、办事申请与审批、奖励荣誉展示、学生画像、学业分析和管理工作台等功能。

系统首版采用 Web 端优先适配方案，同时保留原微信小程序代码。当前 Web 前端采用 Vue 3 + Vite 实现，后端采用 Python + FastAPI + PostgreSQL 技术栈。系统通过模块化 API 设计预留后续与真实认证、文件服务、消息服务和学校系统对接的能力。

### 1.4 文档概述

本文档主要包括以下内容：

- 引言：说明文档目的、读者、项目概况和术语。
- 软件设计约束：说明设计目标、原则、运行环境、技术栈和限制。
- 软件设计：说明体系结构、界面、用例、类/模块、数据和部署设计。

### 1.5 定义

| 术语 | 定义 |
| --- | --- |
| 学生端 | 普通学生使用的功能入口，用于查看通知、查询政策、提交申请、查看进度等。 |
| 管理端 / 工作台 | 管理老师、协同管理者、学院领导使用的后台功能集合。 |
| 管理老师 | 具备知识库维护、通知发布、审批、数据查看等权限的角色。 |
| 三级协同管理者 | 班团骨干或助教等协同角色，可在授权范围内辅助发布通知或查看部分信息，不具备审批权限。 |
| 学院领导 | 主要查看统计数据和运行概览，不参与日常审批。 |
| 知识库 | 存储政策条目、标准问答、模板说明、附件等内容的数据集合。 |
| 精准推送 | 按年级、专业、班级、身份等学生画像条件进行通知分发。 |
| 审批流 | 学生提交事务申请后，由管理老师进行审核、驳回、撤回或重批的流程。 |
| SPA | Single Page Application，单页 Web 应用。 |
| API | Application Programming Interface，前后端交互接口。 |
| JSONB | PostgreSQL 提供的 JSON 二进制存储类型，适合存储扩展字段和灵活表单数据。 |

### 1.6 参考资料

1. 《学院学生综合服务与党团管理平台初版需求分析文档 V3.0》，项目组，2026-04-17。
2. 《软件工程导论》课程设计要求。
3. FastAPI 官方文档。
4. SQLAlchemy 官方文档。
5. PostgreSQL 官方文档。
6. 微信小程序开发文档。

## 2、软件设计约束

### 2.1 软件设计目标和原则

#### 2.1.1 设计目标

系统设计目标如下：

- 满足学院学生事务“一站式服务”需求。
- 支持学生、管理老师、三级协同管理者、学院领导四类角色。
- 支持政策查询、党团流程、通知推送、办事审批、荣誉展示、学生画像和学业分析等核心模块。
- 前后端职责清晰，便于从本地 mock 数据逐步迁移到真实后端服务。
- 后端接口模块化，便于后续扩展文件上传、统一认证、消息通道、导入导出等能力。
- 数据模型兼顾稳定业务字段与灵活扩展字段。
- 系统可在课程验收环境中稳定部署和演示。

#### 2.1.2 设计原则

系统设计遵循以下原则：

- 模块化原则：按业务域拆分前端页面、后端路由、服务和数据模型。
- 低耦合原则：前端页面不直接依赖数据库结构，通过统一 API 访问数据。
- 可替换原则：前端支持 mock API 与真实后端 API 切换。
- 权限优先原则：敏感数据、审批操作、管理操作均需经过角色校验。
- 渐进实现原则：先实现核心业务闭环，再逐步增强高级能力。
- 可追溯原则：审批、通知、知识库访问和管理操作需记录审计日志。
- 易部署原则：后端采用轻量 FastAPI 服务，数据库采用 PostgreSQL，便于本地和服务器部署。

### 2.2 软件设计的约束和限制

#### 2.2.1 运行环境约束

| 类别 | 约束 |
| --- | --- |
| 前端运行环境 | 现代浏览器，推荐 Chrome / Edge / Firefox。 |
| 后端运行环境 | Python 3.12，FastAPI，Uvicorn。 |
| 数据库 | PostgreSQL，当前本地开发数据库为 `student_service`。 |
| 操作系统 | 开发环境为 Linux；部署环境可为 Linux 服务器。 |
| 移动端适配 | Web 端需支持手机浏览器访问，页面无明显横向滚动。 |

#### 2.2.2 开发语言与工具约束

| 层次 | 技术 |
| --- | --- |
| Web 前端 | Vue 3、Vite、HTML、CSS、JavaScript ES Modules |
| 小程序端 | 微信小程序 WXML / WXSS / JavaScript |
| 后端 | Python、FastAPI、SQLAlchemy |
| 数据库 | PostgreSQL、JSONB |
| 接口格式 | REST 风格 HTTP API，JSON 数据 |
| 前端包管理与构建 | npm、Vite build / preview |
| 版本管理 | Git |

#### 2.2.3 容量与性能约束

- 首版面向学院约 1200 名学生规模设计。
- 常规查询、通知查看、申请列表等接口目标响应时间不超过 2 秒。
- 文件上传、成绩单解析、批量导入等耗时任务后续应设计异步处理或进度反馈。
- 当前课程实现阶段优先保证核心流程可用，不实现大规模并发压测和消息通道真实投递。

#### 2.2.4 设计限制

- 当前 Web 前端仍保留部分 mock 和演示逻辑，需在正式部署前切换到真实后端。
- 当前认证使用请求头模拟：`X-Student-Id`、`X-Role`，后续需替换为微信登录或统一认证。
- 当前文件上传已支持本地课程演示目录存储和元数据返回，正式部署时仍建议迁移到对象存储或受控文件服务器。
- 当前通知的邮件、短信、微信渠道以数据结构和统计口径预留为主，真实发送需后续接入通道。
- 当前学业分析采用培养方案与学分数据比对，PDF 成绩单解析为后续扩展能力。

## 3、软件设计

### 3.1 软件体系结构设计

#### 3.1.1 总体架构

系统采用前后端分离架构，前端包括 Web 端和保留的小程序端，后端提供统一 REST API，数据库使用 PostgreSQL 存储业务数据。

```mermaid
flowchart TB
    UserStudent["普通学生"]
    UserTeacher["管理老师"]
    UserCoordinator["三级协同管理者"]
    UserLeader["学院领导"]

    Web["Web 前端 SPA"]
    MiniProgram["微信小程序端（保留）"]
    ApiClient["统一 API Client"]
    Backend["FastAPI 后端服务"]
    Auth["认证与会话依赖"]
    Routers["业务路由层"]
    Services["服务/序列化层"]
    DB["PostgreSQL 数据库"]
    FileService["文件服务（预留）"]
    MessageService["消息通道（预留）"]

    UserStudent --> Web
    UserTeacher --> Web
    UserCoordinator --> Web
    UserLeader --> Web
    UserStudent --> MiniProgram

    Web --> ApiClient
    MiniProgram --> ApiClient
    ApiClient --> Backend
    Backend --> Auth
    Backend --> Routers
    Routers --> Services
    Services --> DB
    Services -.-> FileService
    Services -.-> MessageService
```

#### 3.1.2 前端逻辑架构

Web 前端位于 `web/` 目录，采用 Vue 3 + Vite 单页应用结构。

```text
web/
  index.html              Web 入口
  package.json            前端依赖与脚本
  vite.config.js          Vite 构建配置
  styles.css              全局响应式样式
  src/
    main.js               Vue 应用入口
    App.vue               应用外壳、导航、角色切换
    views/                业务页面组件
    services/
      api.js              页面级业务 API 封装
    api/
      client.js           统一 API 访问入口
      mockGateway.js      本地 mock API
      store.js            localStorage 仓储
    data/
      seed.js             mock 种子数据与常量
    state/
      routes.js           前端导航与 hash 路由配置
      session.js          当前角色与学生会话
    utils.js              格式化、转义、工具函数
```

页面组件通过 `src/services/api.js` 访问业务数据，服务层再调用 `request({ path, method, data, session })`。默认模式为 `mock`，可通过浏览器 `localStorage` 切换到真实后端。

```mermaid
flowchart LR
    Page["Vue 页面组件"]
    Service["services/api.js"]
    Client["api/client.js"]
    Mock["mockGateway.js"]
    Remote["FastAPI /api"]
    Store["localStorage"]

    Page --> Service
    Service --> Client
    Client -->|mode=mock| Mock
    Mock --> Store
    Client -->|mode=remote| Remote
```

#### 3.1.3 后端逻辑架构

后端位于 `backend/` 目录，采用 FastAPI 模块化结构。

```text
backend/
  app/
    main.py               FastAPI 应用入口
    deps.py               当前会话依赖
    models.py             SQLAlchemy ORM 模型
    schemas.py            请求/响应模型
    core/
      config.py           环境配置
    db/
      session.py          数据库连接与 Session
    routers/
      students.py         学生画像接口
      knowledge.py        知识库接口
      applications.py     办事申请与审批接口
      notices.py          通知与站内信接口
      party.py            党团流程接口
      academic.py         学业分析接口
      honors.py           荣誉展示接口
      workbench.py        工作台与领导看板接口
      health.py           健康检查接口
    services/
      common.py           通用工具与审计日志
      serializers.py      ORM 到前端 JSON 的转换
      seed_data.py        演示数据常量
    seed.py               建表与种子数据初始化
```

```mermaid
flowchart TB
    Main["main.py"]
    Deps["deps.py 当前会话"]
    Routers["routers/*"]
    Schemas["schemas.py"]
    Services["services/*"]
    Models["models.py"]
    Session["db/session.py"]
    DB[("PostgreSQL")]

    Main --> Routers
    Routers --> Deps
    Routers --> Schemas
    Routers --> Services
    Services --> Models
    Routers --> Session
    Session --> DB
```

#### 3.1.4 后端接口分层

| 层次 | 职责 |
| --- | --- |
| API 路由层 | 接收请求、进行角色校验、调用数据库和服务方法。 |
| Schema 层 | 定义请求体结构，如申请创建、通知发布、学业进度更新。 |
| Service 层 | 提供通用工具、审计日志、数据序列化、种子数据。 |
| Model 层 | 定义 PostgreSQL 表结构和 ORM 映射。 |
| DB Session 层 | 管理 SQLAlchemy Engine 和 Session 生命周期。 |

### 3.2 用户界面设计

#### 3.2.1 Web 端页面结构

Web 端采用左侧导航 + 主内容区布局，移动端自动切换为底部导航。

```mermaid
flowchart LR
    Layout["Web 页面框架"]
    Sidebar["左侧导航 / 移动端底部导航"]
    Topbar["顶部标题与角色切换"]
    Content["主内容区域"]

    Layout --> Sidebar
    Layout --> Topbar
    Layout --> Content
```

主要页面如下：

| 页面 | 路由 | 主要功能 |
| --- | --- | --- |
| 首页 | `#/home` | 展示核心入口、站内消息、近期通知。 |
| 政策知识库 | `#/knowledge` | 政策搜索、分类筛选、模板展示。 |
| 党团流程 | `#/party` | 入党阶段、历史节点、待办提醒。 |
| 办事申请 | `#/apply` | 提交证明/请假/盖章申请，查看申请列表。 |
| 通知消息 | `#/notices` | 查看通知公告和站内信。 |
| 奖励荣誉 | `#/honors` | 浏览、筛选荣誉条目。 |
| 学业分析 | `#/academic` | 查看学分缺口、风险和修读建议。 |
| 学生画像 | `#/profile` | 查看基础画像和扩展画像。 |
| 管理工作台 | `#/workbench` | 查看统计、审批处理、通知发布、批次统计、审计日志。 |

#### 3.2.2 页面跳转关系

```mermaid
flowchart TD
    Home["首页"]
    Knowledge["政策知识库"]
    Party["党团流程"]
    Apply["办事申请"]
    Notices["通知消息"]
    Honors["奖励荣誉"]
    Academic["学业分析"]
    Profile["学生画像"]
    Workbench["管理工作台"]

    Home --> Knowledge
    Home --> Party
    Home --> Apply
    Home --> Notices
    Home --> Academic
    Home --> Workbench

    Profile --> Workbench
    Workbench --> Apply
    Workbench --> Notices
    Workbench --> Profile
```

#### 3.2.3 角色视图设计

| 角色 | 可见入口 | 说明 |
| --- | --- | --- |
| 普通学生 | 首页、政策、党团、办事、通知、荣誉、学业、画像 | 仅查看本人数据与本人申请。 |
| 管理老师 | 学生入口 + 工作台 | 可审批、发布通知、查看统计、查看日志。 |
| 三级协同管理者 | 学生入口 + 部分工作台 | 可在授权范围内协助发布通知，默认不可审批。 |
| 学院领导 | 学生入口 + 领导看板/统计 | 只读查看统计和审计信息。 |

#### 3.2.4 用户界面原型说明

Web 端界面采用信息密度适中的后台系统风格：

- 卡片用于承载单条通知、申请、知识条目和统计项。
- 表格用于批次统计、日志等结构化数据。
- 表单用于申请提交、通知发布、学业进度维护。
- 标签用于展示分类、状态和风险等级。
- 移动端减少横向布局，采用单列卡片和底部导航。

### 3.3 用例设计

#### 3.3.1 用例总览

```mermaid
flowchart TB
    Student(("普通学生"))
    Teacher(("管理老师"))
    Coordinator(("三级协同管理者"))
    Leader(("学院领导"))

    UC1["查询政策知识"]
    UC2["查看党团进度"]
    UC3["提交办事申请"]
    UC4["查看通知消息"]
    UC5["查看学业分析"]
    UC6["审批申请"]
    UC7["发布定向通知"]
    UC8["查看统计看板"]
    UC9["维护知识库"]

    Student --> UC1
    Student --> UC2
    Student --> UC3
    Student --> UC4
    Student --> UC5

    Teacher --> UC6
    Teacher --> UC7
    Teacher --> UC8
    Teacher --> UC9

    Coordinator --> UC7
    Leader --> UC8
```

#### 3.3.2 用例一：政策查询

参与者：普通学生、管理老师  
前置条件：用户已进入系统。  
后置条件：系统返回匹配的知识条目；若无匹配则记录未命中关键词。

```mermaid
sequenceDiagram
    participant U as 用户
    participant FE as Web前端
    participant API as FastAPI后端
    participant DB as PostgreSQL

    U->>FE: 输入关键词并提交
    FE->>API: GET /api/knowledge?q=关键词
    API->>DB: 查询知识库条目
    DB-->>API: 返回条目列表
    API-->>FE: 返回 JSON
    FE-->>U: 展示标准答案和分类标签
```

异常流程：

- 若无搜索结果，前端调用 `/api/knowledge/miss` 记录关键词。
- 若数据库不可用，前端提示加载失败。

#### 3.3.3 用例二：提交办事申请

参与者：普通学生  
前置条件：学生已登录并具备学生身份。  
后置条件：系统生成申请单，状态为“审批中”。

```mermaid
sequenceDiagram
    participant S as 学生
    participant FE as Web前端
    participant API as FastAPI后端
    participant DB as PostgreSQL

    S->>FE: 填写申请类型、说明、附件
    FE->>FE: 前端校验必填项
    FE->>API: POST /api/applications
    API->>API: 校验盖章申请附件
    API->>DB: 写入申请单和审计日志
    DB-->>API: 写入成功
    API-->>FE: 返回申请单
    FE-->>S: 展示提交成功
```

状态流转：

```mermaid
stateDiagram-v2
    [*] --> 审批中
    审批中 --> 已通过: 管理老师通过
    审批中 --> 已驳回: 管理老师驳回
    已通过 --> 已撤回: 规则窗口内撤回
    已驳回 --> 已撤回: 规则窗口内撤回
    已通过 --> 已重批: 规则窗口内重批
    已驳回 --> 已重批: 规则窗口内重批
```

#### 3.3.4 用例三：审批申请

参与者：管理老师  
前置条件：用户角色为管理老师，存在待审批申请。  
后置条件：申请状态更新，审批日志写入。

```mermaid
sequenceDiagram
    participant T as 管理老师
    participant FE as 管理工作台
    participant API as FastAPI后端
    participant DB as PostgreSQL

    T->>FE: 点击通过或驳回
    FE->>API: POST /api/workbench/applications/{id}/{action}
    API->>API: 校验角色和状态
    API->>DB: 更新申请状态与流转记录
    API->>DB: 写入审计日志
    DB-->>API: 更新成功
    API-->>FE: 返回最新申请单
    FE-->>T: 刷新审批列表
```

#### 3.3.5 用例四：发布定向通知

参与者：管理老师、三级协同管理者  
前置条件：用户具备通知发布权限。  
后置条件：系统生成通知、站内信、批次统计。

```mermaid
sequenceDiagram
    participant M as 管理角色
    participant FE as 工作台
    participant API as FastAPI后端
    participant DB as PostgreSQL

    M->>FE: 填写标题、正文、标签、受众规则
    FE->>API: POST /api/workbench/notices/publish
    API->>DB: 查询目标学生
    API->>DB: 写入通知
    API->>DB: 写入站内信
    API->>DB: 写入批次统计
    API-->>FE: 返回批次号和触达人群数
```

#### 3.3.6 用例五：查看学业分析

参与者：普通学生  
前置条件：学生有培养方案和学业进度数据。  
后置条件：系统展示学分缺口、风险等级和修读建议。

```mermaid
sequenceDiagram
    participant S as 学生
    participant FE as Web前端
    participant API as FastAPI后端
    participant DB as PostgreSQL

    S->>FE: 进入学业分析页
    FE->>API: GET /api/academic/report
    API->>DB: 查询培养方案与学生学业进度
    API->>API: 计算模块缺口和风险等级
    API-->>FE: 返回分析报告
    FE-->>S: 展示风险与建议
```

### 3.4 类设计

本项目采用前后端分离设计，后端主要类为 ORM 数据模型、请求模型和服务函数；前端主要模块为页面渲染模块、API 客户端和状态管理模块。

#### 3.4.1 后端主要类图

```mermaid
classDiagram
    class Student {
        +string student_id
        +string name
        +string grade
        +string major
        +string class_name
        +string nation
        +string phone
        +string political_status
        +dict extension
    }

    class KnowledgeItem {
        +string id
        +string title
        +string category
        +list tags
        +string summary
        +string body
        +bool sensitive_hint
        +int hit_count
    }

    class Application {
        +string id
        +string student_id
        +string type
        +string subtype
        +string status
        +dict form
        +list attachments
        +string teacher_comment
        +list audit_trail
    }

    class Notice {
        +string id
        +string title
        +list tags
        +string summary
        +string content
        +datetime published_at
    }

    class Message {
        +string id
        +string student_id
        +string notice_id
        +string batch_id
        +list channels
        +datetime read_at
    }

    class NoticeBatch {
        +string id
        +string title
        +dict target_rule
        +list channels
    }

    class PartyProgress {
        +string student_id
        +string current_key
        +list history
        +list tasks
    }

    class AcademicPlan {
        +string key
        +string grade
        +string major
        +list modules
    }

    class AcademicProgress {
        +string student_id
        +list modules
        +list uploads
    }

    class AuditLog {
        +int id
        +datetime at
        +string actor_id
        +string role
        +string action
        +string target
        +dict detail
    }

    Student "1" --> "many" Application
    Student "1" --> "many" Message
    Student "1" --> "1" PartyProgress
    Student "1" --> "1" AcademicProgress
    Notice "1" --> "many" Message
    NoticeBatch "1" --> "many" Message
```

#### 3.4.2 后端模型类说明

| 类 | 文件 | 说明 |
| --- | --- | --- |
| `Student` | `backend/app/models.py` | 学生基础画像。 |
| `KnowledgeItem` | `backend/app/models.py` | 政策知识库条目。 |
| `TemplateFile` | `backend/app/models.py` | 常用模板文件元数据。 |
| `Application` | `backend/app/models.py` | 办事申请单。 |
| `Notice` | `backend/app/models.py` | 通知公告。 |
| `Message` | `backend/app/models.py` | 学生站内信。 |
| `NoticeBatch` | `backend/app/models.py` | 通知批次统计。 |
| `PartyProgress` | `backend/app/models.py` | 学生党团阶段进度。 |
| `AcademicPlan` | `backend/app/models.py` | 培养方案。 |
| `AcademicProgress` | `backend/app/models.py` | 学生学业进度。 |
| `Honor` | `backend/app/models.py` | 奖励荣誉展示条目。 |
| `AuditLog` | `backend/app/models.py` | 管理和关键操作日志。 |

#### 3.4.3 前端模块设计

```mermaid
classDiagram
    class Main {
        +createApp(App)
    }

    class AppShell {
        +currentView
        +onRoleChange(event)
        +onStudentChange(event)
        +showToast(message)
        +reloadShell()
    }

    class ViewComponents {
        +load()
        +submit()
        +markRead(id)
        +saveProgress(event)
    }

    class ApiService {
        +getCurrentStudent()
        +searchKnowledge(query)
        +listApplications(query)
        +submitApplication(payload)
        +publishNotice(payload)
        +getAcademicReport()
    }

    class ApiClient {
        +request(options)
        +configureApi(config)
    }

    class Routes {
        +readRoute()
        +go(routeId)
    }

    class MockGateway {
        +mockRequest(options)
    }

    class Store {
        +readDb()
        +writeDb(db)
        +withDb(mutator)
        +resetDb()
    }

    class Session {
        +getSession(db)
        +setSession(session)
    }

    Main --> AppShell
    AppShell --> ViewComponents
    AppShell --> Routes
    AppShell --> Session
    ViewComponents --> ApiService
    ApiService --> ApiClient
    ApiClient --> MockGateway
    MockGateway --> Store
```

| 模块 | 文件 | 说明 |
| --- | --- | --- |
| `main.js` | `web/src/main.js` | Vue 应用入口。 |
| `App.vue` | `web/src/App.vue` | 应用外壳、导航、角色切换与视图分发。 |
| `views` | `web/src/views/` | 按业务拆分的页面组件。 |
| `api.js` | `web/src/services/api.js` | 面向页面组件的业务 API 封装。 |
| `client.js` | `web/src/api/client.js` | 统一 API 调用，可切换 mock/remote。 |
| `mockGateway.js` | `web/src/api/mockGateway.js` | 浏览器本地 mock 后端。 |
| `store.js` | `web/src/api/store.js` | localStorage 数据仓储。 |
| `session.js` | `web/src/state/session.js` | 当前角色与学生身份。 |
| `routes.js` | `web/src/state/routes.js` | 前端导航与 hash 路由配置。 |
| `seed.js` | `web/src/data/seed.js` | 前端 mock 种子数据。 |

本次 V1.1 迭代后，前端模块边界调整为“组件层 -> 业务 API 服务层 -> 请求客户端 -> mock/remote 后端”。各 Vue 页面组件仅负责界面状态、表单校验和用户交互，不直接拼接后端 URL；具体接口路径集中在 `web/src/services/api.js` 中，后续 FastAPI 路由调整或接入真实后端时主要修改服务层与 `client.js` 配置。

组件拆分如下：

| 页面组件 | 对应功能 |
| --- | --- |
| `HomeView.vue` | 首页概览、近期通知和功能入口。 |
| `KnowledgeView.vue` | 政策知识库检索、模板展示和未命中关键词记录。 |
| `PartyView.vue` | 党团流程阶段、历史节点和待办提醒。 |
| `ApplyView.vue` | 证明、请假、盖章申请提交和申请列表。 |
| `NoticesView.vue` | 通知公告、站内信和已读状态。 |
| `HonorsView.vue` | 奖励荣誉浏览与筛选。 |
| `AcademicView.vue` | 学业分析、培养方案比对和成绩单上传接口位。 |
| `ProfileView.vue` | 学生画像与字段脱敏展示。 |
| `WorkbenchView.vue` | 管理端审批、通知发布、批次统计和审计日志。 |

#### 3.4.4 关键方法活动图：审批操作

```mermaid
flowchart TD
    A[接收审批请求] --> B{角色是否为管理老师}
    B -->|否| C[返回 403]
    B -->|是| D[查询申请单]
    D --> E{申请单是否存在}
    E -->|否| F[返回 404]
    E -->|是| G{状态是否允许操作}
    G -->|否| H[返回 400]
    G -->|是| I[更新申请状态]
    I --> J[追加审批流转记录]
    J --> K[写入审计日志]
    K --> L[提交事务]
    L --> M[返回最新申请单]
```

### 3.5 数据设计

#### 3.5.1 数据库总体设计

数据库采用 PostgreSQL。稳定字段使用普通列，灵活表单、扩展画像、附件、渠道统计、阶段历史等使用 JSONB 存储。

```mermaid
erDiagram
    STUDENTS ||--o{ APPLICATIONS : submits
    STUDENTS ||--o{ MESSAGES : receives
    STUDENTS ||--|| PARTY_PROGRESS : has
    STUDENTS ||--|| ACADEMIC_PROGRESS : has
    NOTICES ||--o{ MESSAGES : generates
    NOTICE_BATCHES ||--o{ MESSAGES : groups

    STUDENTS {
        string student_id PK
        string name
        string grade
        string major
        string class_name
        string phone
        jsonb extension
    }

    APPLICATIONS {
        string id PK
        string student_id
        string type
        string subtype
        string status
        jsonb form
        jsonb attachments
        jsonb audit_trail
    }

    KNOWLEDGE_ITEMS {
        string id PK
        string title
        string category
        jsonb tags
        text summary
        text body
    }

    NOTICES {
        string id PK
        string title
        jsonb tags
        text content
        datetime published_at
    }

    MESSAGES {
        string id PK
        string student_id
        string notice_id
        string batch_id
        jsonb channels
        datetime read_at
    }

    NOTICE_BATCHES {
        string id PK
        string title
        jsonb target_rule
        jsonb channels
    }
```

#### 3.5.2 主要数据表说明

##### students

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `student_id` | String PK | 学号。 |
| `name` | String | 姓名。 |
| `grade` | String | 年级。 |
| `major` | String | 专业。 |
| `class_name` | String | 班级。 |
| `nation` | String | 民族。 |
| `phone` | String | 手机号。 |
| `political_status` | String | 政治面貌。 |
| `tutor` | String | 导师。 |
| `hometown` | String | 生源地/户籍地。 |
| `extension` | JSONB | 扩展画像，如竞赛、科研、实践经历。 |

##### knowledge_items

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | String PK | 知识条目 ID。 |
| `title` | String | 标题。 |
| `category` | String | 分类。 |
| `tags` | JSONB | 标签数组。 |
| `summary` | Text | 标准答案摘要。 |
| `body` | Text | 详细内容。 |
| `sensitive_hint` | Boolean | 是否敏感摘要条目。 |
| `attachments` | JSONB | 附件元数据。 |
| `hit_count` | Integer | 阅读次数。 |
| `online` | Boolean | 是否上线。 |

##### applications

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | String PK | 申请单 ID。 |
| `student_id` | String | 申请人学号。 |
| `type` | String | 申请类型，如证明申请、请假申请、盖章申请。 |
| `subtype` | String | 申请子类。 |
| `status` | String | 审批状态。 |
| `form` | JSONB | 表单字段。 |
| `attachments` | JSONB | 附件元数据。 |
| `teacher_comment` | Text | 审批意见。 |
| `decided_at` | DateTime | 审批时间。 |
| `audit_trail` | JSONB | 单据流转记录。 |

##### notices / messages / notice_batches

| 表 | 说明 |
| --- | --- |
| `notices` | 通知正文和基础信息。 |
| `messages` | 分发到学生侧的站内信。 |
| `notice_batches` | 通知批次、目标规则和渠道统计。 |

##### academic_plans / academic_progress

| 表 | 说明 |
| --- | --- |
| `academic_plans` | 按年级和专业维护培养方案模块要求。 |
| `academic_progress` | 记录学生已获学分、成绩单上传记录等。 |

#### 3.5.3 数据操作活动图：通知发布

```mermaid
flowchart TD
    A[接收通知发布请求] --> B[校验发布角色]
    B --> C[解析受众规则]
    C --> D[查询目标学生]
    D --> E[写入 notices]
    E --> F[写入 notice_batches]
    F --> G[为目标学生生成 messages]
    G --> H[写入审计日志]
    H --> I[提交事务]
    I --> J[返回批次号和触达人群数]
```

#### 3.5.4 数据安全设计

- 学生只允许访问本人申请、本人站内信、本人学业数据。
- 管理老师可访问审批和管理数据。
- 学院领导只读访问统计数据。
- 手机号、身份证号等敏感字段前端展示时应脱敏。
- 管理操作通过 `audit_logs` 表记录操作人、角色、动作、对象和时间。
- 文件附件当前通过本地文件服务上传下载并在业务数据中保存元数据，后续正式部署时需补充单据级访问鉴权。

### 3.6 部署设计

#### 3.6.1 部署架构

```mermaid
flowchart TB
    Browser["浏览器 / 手机浏览器"]
    Static["Vite 构建产物 / 静态 Web 服务<br/>web/dist"]
    API["FastAPI 服务<br/>Uvicorn"]
    DB[("PostgreSQL<br/>student_service")]
    FutureFile["文件服务（后续）"]
    FutureMsg["消息服务（后续）"]

    Browser --> Static
    Browser --> API
    API --> DB
    API -.-> FutureFile
    API -.-> FutureMsg
```

#### 3.6.2 本地开发部署

前端启动：

```bash
cd web
npm install
npm run dev
```

后端启动：

```bash
cd /home/mort/Desktop/code/software_team
PYTHONPATH=backend uvicorn app.main:app --host 127.0.0.1 --port 8000
```

数据库初始化：

```bash
PYTHONPATH=backend python3 -m app.seed
```

当前本地数据库连接配置：

```text
DATABASE_URL=postgresql+psycopg://student_service:student_service@127.0.0.1:5432/student_service
```

#### 3.6.3 前端连接后端配置

Web 前端默认使用本地 mock。如需切换到真实后端，在浏览器控制台执行：

```javascript
localStorage.setItem("ss_web_api_mode", "remote");
localStorage.setItem("ss_web_api_base_url", "http://127.0.0.1:8000/api");
location.reload();
```

恢复 mock：

```javascript
localStorage.setItem("ss_web_api_mode", "mock");
location.reload();
```

V1.1 前端重构后，本地开发与构建命令如下：

```bash
cd web
npm install
npm run dev
npm run build
```

其中 `npm run dev` 默认启动 Vite 开发服务，访问 `http://127.0.0.1:5177/`；`npm run build` 生成 `web/dist/` 静态产物，可交由 Nginx 或其他静态服务托管。

#### 3.6.4 目标部署建议

目标部署可采用如下方式：

- 使用 Nginx 托管 Web 静态文件。
- 使用 Uvicorn 或 Gunicorn + Uvicorn Worker 部署 FastAPI。
- 使用 PostgreSQL 独立数据库服务。
- 使用 `.env` 管理数据库连接、CORS、启动选项等配置。
- 文件上传当前使用服务器本地目录，配置项为 `UPLOAD_DIR`，单文件大小限制配置项为 `MAX_UPLOAD_BYTES`，默认 30MB。
- 后续文件上传建议接入对象存储或受控文件服务器，并在数据库中保存附件元数据。
- 后续真实通知建议接入邮件服务、微信订阅消息或短信网关。

#### 3.6.5 部署节点说明

| 节点 | 职责 |
| --- | --- |
| Web 静态服务 | 提供前端页面、CSS、JS 文件。 |
| FastAPI 应用服务 | 提供业务接口、角色校验、数据处理。 |
| PostgreSQL 数据库 | 存储学生、知识库、申请、通知、学业等数据。 |
| 文件服务 | 课程阶段使用本地目录存储上传文件并提供下载接口，后续可替换为对象存储。 |
| 消息服务（预留） | 对接邮件、微信、短信等通知渠道。 |

## 附录：当前实现进度

截至 2026-05-15，当前实现状态如下：

- Web 前端已由原生静态 SPA 重构为 Vue 3 + Vite 单页应用，已完成主要页面组件化和 mock/remote API 适配。
- FastAPI 后端已完成基础模型、路由和 PostgreSQL 连接。
- 本地 PostgreSQL 已创建 `student_service` 数据库和账号。
- 种子数据已成功写入，包含学生、知识库、通知、申请、荣誉、党团进度、学业数据等。
- 已验证 `/health`、`/api/knowledge`、`/api/applications`、`/api/workbench/summary` 等接口可访问。
- 前端已通过 `npm run build` 构建验证，并对 `home`、`knowledge`、`party`、`apply`、`notices`、`honors`、`academic`、`profile`、`workbench` 等 hash 路由进行了浏览器冒烟检查。
- 后续重点为权限菜单细化、知识库管理、文件细粒度鉴权、证明生成、真实认证对接和前后端联调测试。
