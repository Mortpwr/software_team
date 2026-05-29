# 服务器部署

## 凭证

真实密码保存在 `deploy/server-credentials.env`（已加入 `.gitignore`）。模板见 `server-credentials.example.env`。

## 首次 / 更新部署

```bash
chmod +x deploy/deploy.sh deploy/install-remote.sh
./deploy/deploy.sh
```

脚本会：同步代码、生成 `backend/.env`、安装 PostgreSQL/Nginx/Node、构建前端、注册 systemd 与 Nginx。

## 访问

- Web：`http://10.10.0.21/`
- API 文档：`http://10.10.0.21/docs`
- 健康检查：`http://10.10.0.21/health`

生产构建默认使用 `/api` 作为后端地址，并自动切换为 Remote 模式。
