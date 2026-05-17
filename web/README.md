# Vue Web 端适配说明

这是学院学生综合服务与党团管理平台的 Vue 3 + Vite Web 适配版，保留与小程序相同的业务模块，并将页面组件、会话、API、mock 仓储拆分。前端默认使用浏览器本地 mock 数据，也可以切换到 FastAPI 后端。

## 运行

首次运行安装依赖：

```bash
cd web
npm install
```

启动开发服务：

```bash
npm run dev
```

访问：

```text
http://127.0.0.1:5177/
```

构建与预览：

```bash
npm run build
npm run preview
```

## 模块边界

- `src/main.js`：Vue 应用入口。
- `src/App.vue`：应用外壳、角色切换、导航与视图分发。
- `src/views/`：各业务页面组件，按知识库、党团流程、申请审批、通知、荣誉、学业、画像、工作台拆分。
- `src/services/api.js`：面向页面的统一 API 门面，聚合各业务模块。
- `src/services/modules/`：按业务域拆分的 API 模块，例如 `students.js`、`knowledge.js`、`applications.js`、`partyTheory.js`。
- `src/api/client.js`：统一请求入口。默认 `mock`，后续对接后端时切换 `mode/baseUrl`。
- `src/api/mockGateway.js`：本地 mock API，尽量保持 REST 风格路径，模拟后端权限与业务规则。
- `src/api/store.js`：localStorage 数据仓储。
- `src/state/session.js`：当前登录学生与角色会话。
- `src/state/routes.js`：前端功能导航与 hash 路由配置。
- `src/data/seed.js`：演示种子数据与常量。

## 后端对接预留

后续接真实后端时优先替换 `src/api/client.js` 的配置。页面组件通过 `src/services/api.js` 调用业务函数，不直接访问 localStorage，也不直接耦合 mock 数据结构。

新增前端接口时优先放入 `src/services/modules/<domain>.js`，再由 `src/services/api.js` 聚合导出。页面组件保持调用 `api.xxx()`，这样后续替换 mock、切真实后端或调整 URL 时不需要改页面。

当前也支持通过浏览器控制台切换：

```js
localStorage.setItem("ss_web_api_mode", "remote");
localStorage.setItem("ss_web_api_base_url", "http://127.0.0.1:8000/api");
location.reload();
```

恢复本地 mock：

```js
localStorage.setItem("ss_web_api_mode", "mock");
location.reload();
```

页面右上角也提供 `Mock / Remote` 快速切换按钮。Remote 默认指向：

```text
http://127.0.0.1:8000/api
```

切换到 `Remote` 后，页面右上角会显示登录表单。开发演示口令默认是：

```text
demo123456
```

登录成功后前端保存后端签发的 Bearer Token，并由统一请求层自动带到后续接口。Mock 模式仍保留角色与学生快捷切换，方便课堂演示和前端独立调试。
