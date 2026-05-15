# Web 端适配说明

这是学院学生综合服务与党团管理平台的静态 Web 适配版，保留与小程序相同的业务模块，并将页面、会话、API、mock 仓储拆分。

## 运行

在 `web/` 目录启动静态服务：

```bash
python3 -m http.server 5177
```

访问：

```text
http://127.0.0.1:5177/
```

## 模块边界

- `src/app.js`：Web 路由、页面渲染、表单事件绑定。
- `src/api/client.js`：统一请求入口。默认 `mock`，后续对接后端时切换 `mode/baseUrl`。
- `src/api/mockGateway.js`：本地 mock API，尽量保持 REST 风格路径，模拟后端权限与业务规则。
- `src/api/store.js`：localStorage 数据仓储。
- `src/state/session.js`：当前登录学生与角色会话。
- `src/data/seed.js`：演示种子数据与常量。

## 后端对接预留

后续接真实后端时优先替换 `src/api/client.js` 的配置，并让页面继续调用 `request({ path, method, data, session })`。页面层不直接访问 localStorage，也不直接耦合 mock 数据结构。

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
