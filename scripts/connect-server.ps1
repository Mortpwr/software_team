# 在 Windows 上快速 SSH 连接云服务器
# 用法：.\scripts\connect-server.ps1 -User root -Host 10.10.0.21

param(
    [string]$User = "root",
    [Parameter(Mandatory = $true)]
    [string]$ServerIp
)

Write-Host ""
Write-Host "即将连接: ${User}@${ServerIp}" -ForegroundColor Cyan
Write-Host "提示："
Write-Host "  1) 第一次会问 yes/no，输入 yes"
Write-Host "  2) 输入密码时屏幕不显示字符，输完直接回车"
Write-Host "  3) 登录成功后执行："
Write-Host "     cd /opt/student_service/software_team"
Write-Host "     sudo bash scripts/server/update-app.sh"
Write-Host ""

ssh "${User}@${ServerIp}"
