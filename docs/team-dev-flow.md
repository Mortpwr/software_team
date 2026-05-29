# 组内本地开发环境说明

## 1. 仓库与目录

仓库地址：

```text
git@github.com:zhuqizhe122/software_team.git
```

拉下来后的项目根目录就是：

```text
software_team/
```

开发时主要关注这几个目录：

- `web/`：Vue 3 + Vite 前端
- `backend/`：FastAPI 后端
- `scripts/`：本地启动和辅助脚本
- `docs/`：说明文档

## 2. 本地环境要求

建议本地具备：

- Python 3
- Node.js 18+
- npm
- PostgreSQL

## 3. 本地配置文件

后端配置会优先读取下面两个位置之一：

```text
项目根目录/.env
backend/.env
```

可以直接参考：

```text
backend/.env.example
```

常用配置项包括：

```text
DATABASE_URL=postgresql+psycopg://student_service:student_service@127.0.0.1:5432/student_service
CORS_ORIGINS=http://127.0.0.1:5177,http://localhost:5177,http://10.10.0.21
AUTH_MODE=token
AUTH_SECRET=自行设置
UPLOAD_DIR=backend/storage/uploads
```

如果本地没有单独配 `.env`，后端也有默认值，但数据库和密钥最好自己明确配置。

## 4. 第一次安装依赖

### Windows

在项目根目录执行：

```powershell
.\scripts\setup-local.ps1
```

这个脚本会做两件事：

- 安装 `backend/requirements.txt`
- 安装 `web/package.json` 依赖

### Linux / macOS

在项目根目录执行：

```bash
pip install -r backend/requirements.txt
cd web && npm install && cd ..
```

## 5. 第一次初始化数据

项目本地联调用到种子数据时，在项目根目录执行：

### Windows

```powershell
$env:PYTHONPATH="backend"
python -m app.seed
```

### Linux / macOS

```bash
PYTHONPATH=backend python -m app.seed
```

## 6. 本地启动命令

### 启动后端

Windows：

```powershell
.\scripts\dev-backend.ps1
```

Linux / macOS：

```bash
./scripts/dev-backend.sh
```

后端实际启动方式是：

```text
PYTHONPATH=backend
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 启动前端

Windows：

```powershell
.\scripts\dev-web.ps1
```

Linux / macOS：

```bash
./scripts/dev-web.sh
```

前端实际启动端口是：

```text
127.0.0.1:5177
```

## 7. 本地访问地址

启动完成后访问：

```text
前端：http://127.0.0.1:5177/
后端 API：http://127.0.0.1:8000/api
后端健康检查：http://127.0.0.1:8000/health
接口文档：http://127.0.0.1:8000/docs
```

## 8. 常用测试账号

默认密码规则：

```text
Stu@ + 学号后 6 位
```

常用账号：

| 角色 | 学号 | 默认密码 |
| --- | --- | --- |
| 学生 | `2024201581` | `Stu@201581` |
| 三级协同管理者 | `2023200444` | `Stu@200444` |
| 管理老师 | `2022200999` | `Stu@200999` |
| 学院领导 | `2024210888` | `Stu@210888` |

## 9. 本地更新代码时常用命令

拉取最新代码：

```bash
git checkout main
git pull origin main
```

查看本地改动：

```bash
git status
```

提交本地改动：

```bash
git add .
git commit -m "你的提交说明"
git push origin main
```

## 10. 提交前常用检查命令

后端语法检查：

```bash
python -m compileall backend/app
```

前端构建检查：

```bash
cd web
npm run build
cd ..
```

接口冒烟检查：

```bash
./scripts/smoke-backend.sh
```

## 11. 本地文件与忽略项

仓库已经忽略了这些常见本地内容：

- `.env`
- 虚拟环境目录
- `node_modules/`
- 构建产物
- `backend/storage/uploads/`
- 本地课程资料目录

如果只是本地调试或个人资料文件，不需要额外提交到 GitHub。
