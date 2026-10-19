---
title: Transmission 安装与设置
description: 在 Docker 或 Windows 上安装 Transmission，配置做种、Web 界面、RPC 与备份迁移。
author: Ayulog
pubDatetime: "2026-10-10T14:15:00+08:00"
draft: false
category: pt
tags:
  - Docker
  - 下载器
---

Transmission 资源占用低、运行稳定，常用于 NAS 或服务器上的大规模长期保种。它支持 Docker 容器、Linux 后台 daemon 以及 Windows 桌面 Qt 客户端等多种形态，前端则可通过内置 Web 或第三方界面 TrguiNG 统一管理。

<span id="在-nas-上使用-docker-compose"></span>

## 目录准备与 Docker 部署

在 NAS 上部署前，先创建独立的项目目录（如 `stacks/transmission/`）及 `config`、`watch` 子目录。若需与 qBittorrent、[MoviePilot](/posts/moviepilot-guide/) 配合实现硬链接整理，建议将 NAS 上的共享数据根目录统一映射为容器内的 `/data`（完整的共享目录树规划与硬链接原理见[下载目录与做种常识](/posts/nas-downloader/#共用的目录与权限准备)）。

通过 SSH 执行 `id nasuser`（替换为实际写入账户）查询账户的 `UID` 与 `GID`，在 NAS 权限管理中为该账户授予配置目录和数据根目录的读写权限，然后在项目目录下创建 `.env` 文件，一并填入 WebUI 管理账号与密码：

```dotenv
# 实际写入账户的 UID / GID
PUID=
PGID=
# NAS 上已创建的数据根目录绝对路径
MEDIA_ROOT=/path/to/data
# 自定义 WebUI 登录用户名与强密码
TR_USER=
TR_PASSWORD=
```

用于 PT 站点时，请先核对站点客户端白名单所允许的 Transmission 版本；稳定运行后可记录并固定镜像标签或 digest。在项目目录下保存 `compose.yaml`（基于 [LinuxServer 镜像][tr-image]）：

```yaml
services:
  transmission:
    image: lscr.io/linuxserver/transmission:latest
    environment:
      PUID: "${PUID:?请在 .env 中填写实际 UID}"
      PGID: "${PGID:?请在 .env 中填写实际 GID}"
      TZ: Asia/Singapore
      USER: "${TR_USER:?请在 .env 中填写管理用户名}"
      PASS: "${TR_PASSWORD:?请在 .env 中填写独立密码}"
    volumes:
      - ./config:/config
      - ./watch:/watch
      - ${MEDIA_ROOT:?请在 .env 中填写数据根目录}:/data
    ports:
      - "9091:9091"
      - "51413:51413/tcp"
      - "51413:51413/udp"
    restart: unless-stopped
```

创建子目录并启动容器：

```bash
mkdir -p config watch
docker compose config --quiet
docker compose pull
docker compose up -d
docker compose logs --tail=100 transmission
```

启动后在局域网浏览器打开 `http://NAS_IP:9091/transmission/web/`，使用 `.env` 中设置的凭据登录。

- **下载路径设置**：本例将数据根目录挂载为 `/data`，因此默认下载目录应设为 `/data/downloads/transmission`（如需分离未完成文件，可设为 `/data/downloads/incomplete/transmission`）；`/watch` 为自动监控加载种子的目录，不使用时可从 `volumes` 中移除。
- **鉴权与白名单**：LinuxServer 镜像通过 `USER`、`PASS`、`WHITELIST`、`HOST_WHITELIST` 等环境变量管理认证与访问白名单，如需限制来源 IP 或绑定反向代理域名，可按[镜像文档][tr-image]直接追加环境变量。

## WebUI 核心设置与前端替换

<span id="添加任务与校验已有文件"></span>

### 添加任务、辅种校验与限速

在 WebUI 中上传 `.torrent` 或粘贴磁力链接，确认保存路径后即可开始下载，完成后保持任务运行即进入做种状态。

当本地已有下载好的文件、需要添加种子继续辅种时，按以下步骤操作：

1. 添加对应种子文件，取消勾选“立即开始”。
2. 将保存位置指向已有文件所在的父目录（例如种子内包含 `Example.Release` 文件夹，保存位置应选在它的上一级目录）。
3. 右键任务执行 **校验本地数据（Verify Local Data）**。
4. 等待校验进度达到 `100%` 后再启动任务，直接转入做种。

日常限速与长期保种注意以下设置：

- **备用速度与定时计划**：界面左下角的“小乌龟”图标用于切换备用速度限制，定时计划直接按容器或后端所在系统的本地时区计算。
- **保种停止条件**：用于 PT 长期保种时，检查全局与单任务的分享率上限及空闲做种停止条件，避免任务在未满足站点最短做种时长或 H&R 考核前自动停止。

<span id="选择-trguing-或内置-web"></span>

### 配置 TrguiNG 桌面端或替换 Web 界面

确认内置 Web 界面能正常登录和收发任务后，可按需使用功能更丰富的第三方界面：

- **[openscopeproject/TrguiNG][trguing]**：上游原版项目，提供跨平台桌面客户端与编译好的 Web 前端（如 `v1.5.1`）。
- **[jayzcoder/TrguiNG][trguing-zh]**：中文汉化与功能增强分支（如 `trguing-web-v1.3.0-zh-240607a`），支持分类分组与 Tracker 筛选，发布节奏与上游独立。
- **[Transmission Web Control][tr-web-control]**：早期常用的第三方 Web 界面，已于 2025 年 6 月归档停止维护。

**方式一：使用 TrguiNG 桌面客户端远程连接**

在电脑上安装 TrguiNG 桌面版，新建服务器连接时填写 NAS 局域网 IP、端口 `9091`、RPC 路径 `/transmission/rpc` 以及管理账号密码。桌面端仅通过 RPC 控制 NAS 后端，关闭桌面程序不会中断 NAS 上的下载与做种。

**方式二：替换 Docker 容器内置 Web 界面**

1. 从上述 TrguiNG 仓库的 Releases 页面下载编译好的 Web 压缩包（切勿下载 `Source code` 源码包）。
2. 解压到容器配置目录下的 `webui/trguing-zh` 文件夹，确保容器内路径 `/config/webui/trguing-zh/index.html` 存在。
3. 在 `compose.yaml` 的 `environment` 下增加环境变量：
   ```yaml
   TRANSMISSION_WEB_HOME: /config/webui/trguing-zh
   ```
4. 执行 `docker compose up -d` 重建容器使环境变量生效，刷新浏览器页面即可看到新界面（如需恢复默认界面，移除该变量并重建容器即可）。

<span id="windows-安装与局域网管理"></span>

## Windows 原生安装与配置

### 安装桌面版与开启局域网 Web 管理

从 [Transmission 官方下载页][tr-download]下载对应架构的 MSI 安装包（如 4.1.3 x64 版本，支持 Windows 10 及以上系统；用于 PT 前先核对站点白名单）。

1. **选择安装组件**：日常桌面使用勾选 **Qt client + Web interface**（若漏选 Web interface 可重新运行安装器补装；暂不勾选后台服务组件 Daemon，以免同时启动两套实例）。
2. **设置下载目录**：启动 Transmission Qt，选择本地会话，在 **编辑 → 偏好设置** 中设置下载完成目录与未完成目录（建议放在同一块本地数据盘内，如 `D:\Downloads\Transmission` 与 `D:\Downloads\Transmission-Incomplete`，避免完成时跨盘复制）。
3. **开启远程 Web 访问**：在 **偏好设置 → 远程** 中勾选允许远程访问，端口保持 `9091`，勾选身份验证并设置用户名密码。IP 白名单默认包含 `127.0.0.1`；若需允许局域网手机或其他电脑访问，将来访设备的局域网 IP 加入白名单，并在 Windows 防火墙中对局域网放行 `9091` 端口，即可通过 `http://电脑局域网IP:9091/transmission/web/` 访问。

若希望在 Windows Qt 版中使用 TrguiNG Web 界面，可将编译好的 Web 包解压至 `D:\Apps\TrguiNG-Web`（确保该目录下直接包含 `index.html`），完全退出 Qt 客户端后在 PowerShell 中指定环境变量启动（验证无误后可写入 Windows 用户环境变量）：

```powershell
$env:TRANSMISSION_WEB_HOME = 'D:\Apps\TrguiNG-Web'
& 'C:\Program Files\Transmission\transmission-qt.exe'
```

<span id="修改-settingsjson-与-windows-自启动"></span>

### 修改 settings.json 与配置自启动

Transmission 在退出时会将内存中的配置写回 `settings.json`，因此手动编辑 `settings.json` 前必须**先正常退出客户端或停止服务**，并备份配置目录。不同运行形态下的默认配置目录如下：

| 运行实例                         | 默认配置目录位置                                                          |
| -------------------------------- | ------------------------------------------------------------------------- |
| Windows Qt 客户端（当前用户）    | `%LOCALAPPDATA%\transmission`                                             |
| Windows Daemon（当前用户）       | `%LOCALAPPDATA%\transmission-daemon`                                      |
| 4.1.3 MSI 默认 LocalService 服务 | `%WINDIR%\ServiceProfiles\LocalService\AppData\Local\transmission-daemon` |
| Docker 容器                      | 映射到容器 `/config` 的宿主机目录                                         |

Windows / 原生实例常用的 RPC 远程配置字段示例如下（编辑时合并至现有 JSON，注意保持合法 JSON 格式；Transmission 4.1 起虽兼容下划线写法，默认保存仍为连字符格式，同一参数勿混写两套键名）：

```json
{
  "rpc-enabled": true,
  "rpc-bind-address": "0.0.0.0",
  "rpc-port": 9091,
  "rpc-url": "/transmission/",
  "rpc-authentication-required": true,
  "rpc-username": "transmission-user",
  "rpc-password": "REPLACE_WITH_A_UNIQUE_PASSWORD",
  "rpc-whitelist-enabled": true,
  "rpc-whitelist": "127.0.0.1,192.168.1.30",
  "rpc-host-whitelist-enabled": true
}
```

停机状态下填入的明文密码（勿以 `{` 开头）在下次启动后会自动转换为带盐哈希格式保存；Windows 路径在 JSON 中需写为 `D:/Downloads/Transmission` 或双反斜杠 `D:\\Downloads\\Transmission`。

Windows 自启动可根据使用习惯选择两种方式：

- **桌面登录后自启（Qt 客户端）**：按 `Win + R` 输入 `shell:startup` 打开启动文件夹，放入 Transmission Qt 快捷方式。
- **开机后台运行（Daemon 服务）**：在 MSI 安装器中勾选 Daemon 组件，系统会注册名为 `Transmission`（显示名 `Transmission Daemon`）的系统服务，默认以 `LocalService` 账户开机自启。使用该模式时需确保下载目录已授予对应服务账户读写权限，平时通过网页或 Qt 的“连接远程会话”管理该后台服务。

## 常见问题与维护

### 备份、更新与迁移

备份或迁移 Transmission 时，需先停止容器或退出客户端，将整个配置目录（包含 `settings.json`、`torrents/` 种子文件与 `resume/` 任务恢复状态）完整打包备份；仅复制 `settings.json` 无法恢复已有任务列表。Docker 部署的更新流程如下：

```bash
docker compose stop
# 备份 compose.yaml、.env 与 ./config 目录后更新
docker compose pull
docker compose up -d
```

跨设备迁移或清理做种任务时，保持容器内挂载路径不变并先抽检校验几个任务；关于硬链接与删种的注意事项见[下载目录与做种常识](/posts/nas-downloader/#更新备份与迁移)。

### 故障排查

| 现象                             | 检查位置                                                                                   |
| -------------------------------- | ------------------------------------------------------------------------------------------ |
| 本机打不开 `9091` 端口           | 客户端或容器是否运行、远程访问开关、端口占用与监听地址                                     |
| 页面提示找不到 Web 资源          | Windows 是否安装了 Web interface 组件，自定义路径下是否有 `index.html`                     |
| 本机能打开，局域网其他设备不能   | 访问地址是否填了后端局域网 IP、`rpc-whitelist` 白名单与防火墙                              |
| 返回 `401 Unauthorized`          | 用户名或密码错误，检查客户端或浏览器是否缓存了旧凭据                                       |
| 返回 `403 Unauthorized IP`       | 来访 IP 未加入 `rpc-whitelist`，或反向代理改变了来源 IP                                    |
| 返回 `Invalid Hostname`          | 通过域名访问时，需将对应域名加入 `rpc-host-whitelist`                                      |
| 直接访问 `/transmission/rpc` 409 | 正常现象，RPC 接口需携带 `X-Transmission-Session-Id` 握手，日常请访问 `/transmission/web/` |
| 替换 TrguiNG Web 后页面白屏      | 检查 `index.html` 所在目录层级、文件读取权限并清理浏览器缓存                               |
| 修改 `settings.json` 后被还原    | 修改前未先停止 Transmission 进程，或被 Docker 环境变量覆盖                                 |
| 无法写入下载文件                 | 检查容器 `PUID`/`PGID` 或 Windows 服务账户对下载目录的写入权限                             |

## 参考资料

- [官方安装包][tr-download]、[4.1.3 Web Interface][tr-web]、[Configuration Files][tr-config]。
- [4.1.3 Windows 安装组件][tr-msi]、[Daemon 服务定义][tr-service]、[环境变量][tr-env]与[定时限速实现][tr-alt-speed]。
- [4.1.3 Editing Configuration Files][tr-edit]与[4.0.6 连字符字段参考][tr-old-config]。
- [TrguiNG 上游][trguing]与[汉化分支][trguing-zh]。
- [Transmission Web Control][tr-web-control]及其 [Windows 安装说明][tr-web-control-windows]。
- 磕巴白菜：[绿联新系统部署 Transmission][keba-transmission]；容器参数见 [LinuxServer 文档][tr-image]。
- 暮城：[Transmission 配置文件参数中文详细解释][tr-legacy-cn]（2022 年旧版参考，字段与默认值以当前官方文档为准）。

[tr-download]: https://transmissionbt.com/download
[tr-image]: https://docs.linuxserver.io/images/docker-transmission/
[tr-web]: https://github.com/transmission/transmission/blob/4.1.3/docs/Web-Interface.md
[tr-config]: https://github.com/transmission/transmission/blob/4.1.3/docs/Configuration-Files.md
[tr-msi]: https://github.com/transmission/transmission/blob/4.1.3/dist/msi/Transmission.wxs
[tr-service]: https://github.com/transmission/transmission/blob/4.1.3/dist/msi/components/Daemon.wxs
[tr-env]: https://github.com/transmission/transmission/blob/4.1.3/docs/Environment-Variables.md
[tr-alt-speed]: https://github.com/transmission/transmission/blob/4.1.3/libtransmission/session-alt-speeds.cc
[tr-edit]: https://github.com/transmission/transmission/blob/4.1.3/docs/Editing-Configuration-Files.md
[tr-old-config]: https://github.com/transmission/transmission/blob/4.0.6/docs/Editing-Configuration-Files.md
[trguing]: https://github.com/openscopeproject/TrguiNG
[trguing-zh]: https://github.com/jayzcoder/TrguiNG
[tr-web-control]: https://github.com/ronggang/transmission-web-control
[tr-web-control-windows]: https://github.com/ronggang/transmission-web-control/wiki/Windows-Installation-CN
[keba-transmission]: https://hi.keba.host/archives/transmission
[tr-legacy-cn]: https://cloud.tencent.com/developer/article/1966381
