---
title: qBittorrent 安装与设置
description: 在 NAS、Windows、macOS 和 Debian 上装 qBittorrent，设置路径、端口与做种。
author: Ayulog
pubDatetime: "2026-10-10T14:15:00+08:00"
draft: false
category: pt
tags:
  - qBittorrent
  - Docker
  - 下载器
---

qBittorrent 适合作为主力 BT / PT 下载器，支持细致的分类管理、RSS 自动订阅与外部工具联动。根据运行环境不同，NAS 上通常使用 Docker 部署，Windows 与 macOS 可直接安装桌面版，无桌面环境的 Debian / Ubuntu 服务器则可运行 `qbittorrent-nox` 服务。

<span id="在-nas-上使用-docker-compose"></span>

## 目录准备与 Docker 部署

在 NAS 上部署前，先建立独立的项目目录（如 `stacks/qbittorrent/`）及 `config` 子目录。为了配合 [MoviePilot](/posts/moviepilot-guide/) 实现硬链接整理，建议将 NAS 上的共享数据根目录统一映射为容器内的 `/data`（完整的目录树规划与硬链接原理见[下载目录与做种常识](/posts/nas-downloader/#共用的目录与权限准备)）。

通过 SSH 执行 `id nasuser`（替换为实际写入账户）查询账户的 `UID` 与 `GID`，在 NAS 权限管理中为该账户授予配置目录和数据根目录的读写权限，然后在项目目录下创建 `.env` 文件：

```dotenv
# 实际写入账户的 UID / GID
PUID=
PGID=
# NAS 上已创建的数据根目录绝对路径
MEDIA_ROOT=/path/to/data
```

用于 PT 站点时，请先核对站点客户端白名单所允许的 qBittorrent 版本；稳定运行后可记录并固定镜像标签或 digest。在项目目录下保存 `compose.yaml`（基于 [LinuxServer 镜像][qbt-image]）：

```yaml
services:
  qbittorrent:
    image: lscr.io/linuxserver/qbittorrent:latest
    environment:
      PUID: "${PUID:?请在 .env 中填写实际 UID}"
      PGID: "${PGID:?请在 .env 中填写实际 GID}"
      TZ: Asia/Singapore
      WEBUI_PORT: "8080"
      TORRENTING_PORT: "6881"
    volumes:
      - ./config:/config
      - ${MEDIA_ROOT:?请在 .env 中填写数据根目录}:/data
    ports:
      - "8080:8080"
      - "6881:6881/tcp"
      - "6881:6881/udp"
    restart: unless-stopped
```

在项目目录启动容器并查看初始日志：

```bash
mkdir -p config
docker compose config --quiet
docker compose pull
docker compose up -d
docker compose logs --tail=100 qbittorrent
```

首次启动时，容器会在日志中打印 `admin` 账号的临时随机密码。在局域网浏览器打开 `http://NAS_IP:8080`，登录后进入 **工具 → 选项 → Web UI**，修改为自定义的强密码并保存（保持启用 CSRF 防护与 Host 头部校验）。

若宿主机 `8080` 端口冲突，需按[镜像文档][qbt-image]同步修改 `WEBUI_PORT` 与 `ports` 映射；若修改 BT 监听端口 `6881`，同样需同步修改 `TORRENTING_PORT`、TCP / UDP 端口映射以及路由器端口转发规则。

## WebUI 核心设置与联动

<span id="保存路径分类与做种"></span>

### 保存路径、分类与做种

在 **工具 → 选项 → 下载** 中，按容器内的 `/data` 挂载路径配置下载目录：

| 设置项                    | 推荐路径                                     |
| ------------------------- | -------------------------------------------- |
| 默认保存路径              | `/data/downloads/qbittorrent`                |
| 未完成任务保存目录        | `/data/downloads/incomplete/qbittorrent`     |
| MoviePilot 本地媒体库目标 | `/data/library/movies` 或 `/data/library/tv` |

配置完成后，可先添加一个 Linux 发行版官方种子测试下载，确认文件正常写入 NAS 对应目录且完成后转入做种状态。

日常做种与维护任务时注意两点：

- **移动做种文件**：需要保种的任务应保留原始文件名与目录结构。若确需调整存储位置，先暂停任务，右键选择 **设置位置** 指向新目录，再执行 **强制重新校验**，待进度达到 `100%` 后恢复做种。
- **公网 BT 与 PT 区分**：下载公网 BT 资源可开启 DHT、PeX 和本地节点发现；用于私有 PT 种子时客户端会自动遵循种子的私有标记，切勿向 PT 种子手动追加公共 Tracker。

<span id="限速队列与-rss"></span>

### 限速、连接数与 RSS

初次使用可先保持默认连接参数，再结合宽带实际上行、硬盘类型与设备性能微调：

- **速度限制**：上传限速可从实测可用上行带宽的 70%—80% 试起，为家庭网络其他设备留出余量（注意区分客户端的 `KiB/s`、`MiB/s` 与运营商宽带的 `Mbps` 换算）。需要分时段限速时，可启用备用速度限制并配置计划表。
- **连接数与队列**：常见起步范围为全局最大连接数 `300–800`、单任务最大连接数 `50–100`、全局上传槽 `20–50`、单任务上传槽 `4–8`、同时活跃下载 `3–5` 个。低功耗 NAS 或机械硬盘建议取偏低值，避免高并发随机读写引发磁盘满载和 WebUI 卡顿。
- **RSS 自动下载**：使用内置 RSS 时，先配置好分类、保存路径、体积范围与关键词过滤规则，确认命中预览无误后再开启自动添加。

### 接入 MoviePilot

当 qBittorrent 已能正常下载并做种后，即可在 [MoviePilot](/posts/moviepilot-guide/) 中添加下载器：MoviePilot 同样挂载 `/data` 根目录，下载来源目录填 `/data/downloads/qbittorrent`，整理目标目录填 `/data/library` 下的对应影视子目录。连接测试通过后，先用单个任务验证硬链接入库，确认原做种任务不受影响后再开启自动订阅（联动细节见[下载目录与做种常识](/posts/nas-downloader/#与-moviepilot-联动)）。

<span id="不用-docker-时的安装方法"></span>

## 原生安装（Windows / macOS / Debian）

### Windows 与 macOS 桌面版

从 [qBittorrent 官方下载页][qbt-download]获取对应系统与架构的安装包，保存路径直接选择本机磁盘目录。若需从局域网其他设备或自动化工具访问，可在 **工具 → 选项 → Web UI** 中勾选启用 Web 用户界面并设置监听端口与登录密码。

### Debian / Ubuntu 无桌面服务（qbittorrent-nox）

在无图形界面的 Debian / Ubuntu 服务器上，可直接通过 APT 安装 `qbittorrent-nox` 并配置专用系统用户：

```bash
sudo apt update
sudo apt install qbittorrent-nox
sudo adduser --system --group --home /var/lib/qbittorrent qbittorrent
sudo install -d -o qbittorrent -g qbittorrent /srv/downloads/{incomplete,complete}
sudo -u qbittorrent qbittorrent-nox --profile=/var/lib/qbittorrent
```

首次在前台运行时，从终端输出中获取初始临时密码，登录 WebUI 修改密码并完成基础路径设置（此时默认下载路径为本机的 `/srv/downloads/complete` 和 `/srv/downloads/incomplete`），然后按 `Ctrl + C` 正常退出前台进程。

接着创建 systemd 服务文件 `/etc/systemd/system/qbittorrent-nox.service`：

```ini
[Unit]
Description=qBittorrent-nox
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=qbittorrent
Group=qbittorrent
ExecStart=/usr/bin/qbittorrent-nox --profile=/var/lib/qbittorrent
Restart=on-failure
PrivateTmp=true
ProtectSystem=full
ProtectHome=true
ReadWritePaths=/var/lib/qbittorrent /srv/downloads

[Install]
WantedBy=multi-user.target
```

重载配置并设置开机自启：

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now qbittorrent-nox
sudo systemctl status qbittorrent-nox
```

若后续更改了本机下载目录，需同步调整目录所属权限以及服务文件中的 `ReadWritePaths` 白名单。

## 常见问题与维护

### 备份、更新与迁移

更新版本前先核对 PT 站点的客户端白名单，记录当前镜像版本，停止服务后备份 `compose.yaml`、`.env` 与整个 `config` 目录（原生安装备份 `/var/lib/qbittorrent` profile 目录）：

```bash
docker compose stop
# 完成配置备份后拉取并重建容器
docker compose pull
docker compose up -d
```

更新完成后登录 WebUI 检查版本号、任务列表及本地文件校验状态。跨设备迁移与删种注意事项见[下载目录与做种常识](/posts/nas-downloader/#更新备份与迁移)。

### 故障排查

| 现象                    | 检查位置                                                                  |
| ----------------------- | ------------------------------------------------------------------------- |
| Web UI 打不开           | 容器或服务状态、`WEBUI_PORT` 与端口映射、防火墙及反向代理设置             |
| 初始密码提示错误        | 查看当前容器启动日志中的临时密码，或确认是否连到了另一个实例              |
| Peer 端口连通性检测失败 | 检查 `6881`（或自定义端口）TCP/UDP 映射、防火墙、路由器转发及公网 IP 条件 |
| 下载或上传速度偏慢      | 种子活跃节点数、全局/备用限速开关、队列限制、连接数与磁盘负载             |
| 移动文件后任务报错缺失  | 暂停任务，右键“设置位置”指向新路径，再执行“强制重新校验”                  |
| MoviePilot 无法自动整理 | 任务分类、下载目录映射、容器 `/data` 挂载一致性与文件读写权限             |

## 参考资料

- [qBittorrent 官方下载页][qbt-download]。
- [LinuxServer qBittorrent 镜像说明][qbt-image]。
- [MoviePilot 文件整理说明][mp-reorganize]。

[qbt-download]: https://www.qbittorrent.org/download
[qbt-image]: https://docs.linuxserver.io/images/docker-qbittorrent/
[mp-reorganize]: https://wiki.movie-pilot.org/reorganize
