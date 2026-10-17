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

qBittorrent 负责下载、校验和做种。装在哪台机器上，文件就由那台后端保存，浏览器只是管理入口：NAS 上用 Docker 部署，Windows / macOS 装桌面版，Debian 上跑无桌面的 nox 服务。

## 目录、挂载路径与权限

单独建立项目目录，例如 `stacks/qbittorrent/`，将下文的 `compose.yaml` 与 `.env` 放在里面。`./config` 保存这个下载器的配置，下载文件另放在 NAS 数据盘。

下面把 NAS 数据根目录映射到容器的 `/data`，供下载器和 MoviePilot 共用：

```text
/path/to/data/
├── downloads/
│   ├── qbittorrent/
│   ├── transmission/
│   └── incomplete/
└── library/
    ├── movies/
    └── tv/
```

`/path/to/data` 是待替换路径，先在 NAS 上创建实际目录。通过 `id nasuser` 查询负责写入的账户，把 `nasuser` 换成自己的账户名，并给它配置和数据目录的读写权限。不要直接使用 `0/0` 或给整个共享目录开放 `777`。

在项目的 `.env` 中填写：

```dotenv
# 实际服务账户的 UID / GID
PUID=
PGID=
# NAS 上已经存在的数据根目录
MEDIA_ROOT=/path/to/data
```

需要长期做种时，先核对站点允许的客户端版本。下文 `latest` 是可变标签，使用稳定后记录实际版本或镜像 digest。管理入口通过局域网或私有组网访问；BT 入站端口与管理端口分开配置。

## 在 NAS 上使用 Docker Compose

在项目中创建 `config` 目录，填好 `.env`，再保存 `compose.yaml`：

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

在该项目目录执行：

```bash
mkdir -p config
docker compose config --quiet
docker compose pull
docker compose up -d
docker compose logs --tail=100 qbittorrent
```

首次登录用户名通常是 `admin`，初始临时密码从当前容器的启动日志取得。打开 `http://NAS_IP:8080`，登录后进入 **工具 → 选项 → Web UI**，立即设置独立密码。保留身份验证、CSRF 防护和主机头校验；使用反向代理时，按当前镜像与客户端文档核对域名和代理设置。

网页端口冲突时，按 [LinuxServer 镜像说明][qbt-image]同步修改 `WEBUI_PORT` 和对应映射；BT 端口改动则同步修改 `TORRENTING_PORT`、TCP / UDP 映射和路由器转发。

## 保存路径、分类与做种

在下载选项中设置：

| 设置                      | 本文示例                                 |
| ------------------------- | ---------------------------------------- |
| 默认保存路径              | `/data/downloads/qbittorrent`            |
| 未完成任务目录            | `/data/downloads/incomplete/qbittorrent` |
| MoviePilot 的本地媒体目标 | `/data/library` 下的电影或剧集目录       |

先添加一个有权下载的 Linux 发行版种子，确认文件出现在 NAS 的对应目录，完成后能校验并保持做种。分类需要自动化接管时，按 MoviePilot 中约定的分类和保存目录设置；手工任务可能不会被自动整理。

需要长期做种时，保留下载目录的文件名和层级。确实需要移动文件，先暂停任务，使用 **设置位置** 指向新目录，再执行 **强制重新校验**，核对完整性后恢复；不要直接删除 `.fastresume` 文件来处理路径错误。

公网 BT 可根据网络环境使用 DHT、PeX 和本地发现；PT 按站点要求配置，不要向私有种子随意追加公共 Tracker，也不要公开含 Passkey 的地址。协议加密只解决链路，匿名性另算。

## 限速、队列与 RSS

先用默认设置跑通任务，再根据带宽、硬盘负载和连接情况调整。上传上限可从实测可用上行的约 70%—80% 试起，为其他设备留出余量；这只是起点，最终值按线路和上行实测调整。注意客户端的 `kB/s`、`KiB/s` 与套餐的 `Mbps` 单位不同。

可从以下范围试起：全局连接数 300—800、每任务 50—100、全局上传槽 20—50、每任务上传槽 4—8、活跃下载 3—5 个。低功耗 NAS 或机械盘先取较低值；网页卡顿、丢包或磁盘持续繁忙时，优先降低上传、并发和连接数。无人做种的资源不会因为连接数增加而有数据。

需要分时限速时配置备用速度和计划表。RSS 自动下载先建立分类、目录、大小和关键词过滤规则，再启用自动添加。桌面版搜索功能可能需要 Python 与搜索插件，只使用可信来源的插件。

## 不用 Docker 时的安装方法

Windows 和 macOS 从 [qBittorrent 官方下载页][qbt-download]选择适合系统和架构的安装包。保存路径使用本机目录；桌面程序启用 Web UI 后，其他设备才能远程管理。

Debian / Ubuntu 可安装无桌面界面的 `qbittorrent-nox`：

```bash
sudo apt update
sudo apt install qbittorrent-nox
sudo adduser --system --group --home /var/lib/qbittorrent qbittorrent
sudo install -d -o qbittorrent -g qbittorrent /srv/downloads/{incomplete,complete}
sudo -u qbittorrent qbittorrent-nox --profile=/var/lib/qbittorrent
```

安装后的版本看包管理器输出。前台首次运行时查看 Web UI 初始化信息，完成初步设置后正常停止这一实例，再配置服务，避免两套进程争用端口和配置。

创建 `/etc/systemd/system/qbittorrent-nox.service`：

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

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now qbittorrent-nox
sudo systemctl status qbittorrent-nox
```

此安装方式的下载路径是 `/srv/downloads/complete` 和 `/srv/downloads/incomplete`，不是 Docker 示例的 `/data`。如果改变实际下载根目录，应同步核对账户权限和服务的 `ReadWritePaths`。

## 接入 MoviePilot

MoviePilot 挂载与下载器相同的数据根目录，来源填 `/data/downloads/qbittorrent`，整理目标用 `/data/library` 下的电影或剧集目录。填好下载器地址与凭据后，先检查分类、一次下载和整理记录，再增加订阅。需要继续做种的文件保持原名和位置；硬链接条件见[下载目录与做种常识](/posts/nas-downloader/#与-moviepilot-联动)。

## 更新与迁移

更新前核对站点白名单，记录当前镜像版本，停止服务后备份 `compose.yaml`、私有 `.env` 与整个 `config`；原生安装备份 profile。配置包含任务恢复数据，但不包含下载文件。

```bash
docker compose stop
# 完成配置和数据备份后再更新
docker compose pull
docker compose up -d
```

只做备份时用 `docker compose start` 恢复。更新后检查登录、任务列表、实际版本与一次校验。迁移路径和删除数据的区别见[下载目录与做种常识](/posts/nas-downloader/#更新备份与迁移)。

## 排错：现象与检查位置

| 现象              | 检查位置                                                      |
| ----------------- | ------------------------------------------------------------- |
| Web UI 打不开     | 服务状态、端口映射、防火墙、端口占用和代理域名设置            |
| 初始密码不对      | 当前实例启动日志，是否已修改密码或连到了另一实例              |
| 端口检测失败      | 是否检测 BT 端口，容器监听、TCP / UDP、防火墙、路由器与 CGNAT |
| 有任务但速度很慢  | 做种者、限速、队列、连接数和磁盘空间                          |
| 移动文件后报错    | 暂停任务，设置位置，强制重新校验；保留恢复数据                |
| MoviePilot 不整理 | 任务分类、下载目录、共享挂载、权限与整理日志                  |

## 参考资料

- [qBittorrent 官方下载页][qbt-download]。
- [LinuxServer qBittorrent 镜像说明][qbt-image]。
- [MoviePilot 文件整理说明][mp-reorganize]。

[qbt-download]: https://www.qbittorrent.org/download
[qbt-image]: https://docs.linuxserver.io/images/docker-qbittorrent/
[mp-reorganize]: https://wiki.movie-pilot.org/reorganize
