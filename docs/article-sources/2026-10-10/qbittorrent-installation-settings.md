---
title: "qBittorrent 安装及设置教程"
description: "从安装、Web UI 初始化到网络、速度、存储与安全设置，配置一台稳定易用的 qBittorrent 下载器。"
pubDatetime: 2026-10-10T09:00:00+08:00
author: Ayulog
tags: [qBittorrent, BT, 下载器, 教程]
draft: true
---

qBittorrent 是一个开源、跨平台的 BitTorrent 客户端，支持 Windows、macOS、Linux 和 Docker。本文以 qBittorrent 5.x 为例，完成安装、Web UI、端口、速度、存储和安全设置。界面名称可能因版本或语言略有不同。

## 安装

### Windows 和 macOS

从 [qBittorrent 官方下载页](https://www.qbittorrent.org/download) 获取对应系统的安装包。Windows 选择稳定版安装程序，macOS 选择与芯片架构匹配的包。安装时保留默认组件即可；不要从来历不明的下载站获取客户端。

### Debian/Ubuntu

```bash
sudo apt update
sudo apt install qbittorrent-nox
sudo adduser --system --group --home /var/lib/qbittorrent qbittorrent
sudo install -d -o qbittorrent -g qbittorrent /srv/downloads/{incomplete,complete}
```

`qbittorrent-nox` 不带桌面界面，适合服务器。第一次运行会显示 Web UI 的临时管理员密码：

```bash
sudo -u qbittorrent qbittorrent-nox --profile=/var/lib/qbittorrent
```

生产环境应使用 systemd 管理服务。创建 `/etc/systemd/system/qbittorrent-nox.service`：

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

### Docker Compose

```yaml
services:
  qbittorrent:
    image: lscr.io/linuxserver/qbittorrent:latest
    container_name: qbittorrent
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=Asia/Shanghai
      - WEBUI_PORT=8080
      - TORRENTING_PORT=6881
    volumes:
      - ./config:/config
      - ./downloads:/downloads
    ports:
      - "8080:8080"
      - "6881:6881"
      - "6881:6881/udp"
    restart: unless-stopped
```

先创建挂载目录，再启动容器：

```bash
mkdir -p config downloads
docker compose up -d
docker compose logs qbittorrent
```

将 `PUID`、`PGID` 换成宿主机运行下载目录的用户和组 ID，并确认这两个目录对该用户可写。日志中会显示初始 Web UI 密码。

如果用于私有站点，先查看站点的客户端白名单。参考教程当时选择了 `4.6.7`，因为部分站点尚未接受 5.x；这里使用 `latest` 只是示例，长期运行时建议固定到已经验证过的版本标签，避免镜像自动升级造成兼容问题。

## 第一次进入 Web UI

浏览器打开 `http://服务器地址:8080`。首次登录用户名通常是 `admin`，临时密码写在 qBittorrent 启动日志中。登录后进入“工具 → 选项 → Web UI”修改管理员密码。

服务器只在内网使用时也建议设置防火墙；需要公网访问时，应通过 VPN 或带 HTTPS 的反向代理，不要直接把 8080 暴露到互联网。启用身份验证、CSRF 防护和主机头校验；反向代理场景把代理域名加入白名单，并转发 WebSocket。

## 网络与端口

在“连接”中设置一个固定的监听端口，例如 `6881`。同一端口同时允许 TCP 和 UDP：

1. 在路由器为运行 qBittorrent 的设备做端口转发；服务器有防火墙时放行该 TCP/UDP 端口。
2. UPnP/NAT-PMP 可临时用于自动映射；家庭服务器更建议手工转发并关闭自动映射。
3. 点击“应用”后使用端口检测确认端口可达。

若运营商使用 CGNAT，普通端口转发可能无效，需要公网 IPv4、IPv6、VPN 端口映射或中继服务。不要把 Web UI 端口和 BitTorrent 端口混用。

“BitTorrent”选项可按网络环境设置：公网下载可保留 DHT、PeX 和本地发现；私有站点按站点规则关闭 DHT、PeX、LSD。加密协议选择“优先加密”，但加密不是匿名工具，不能替代 VPN 或代理。

## 保存路径与任务管理

在“下载”选项中设置默认保存路径（如 `/downloads/complete` 或 `D:\\Downloads\\complete`）和未完成任务路径（如 `/downloads/incomplete`）。需要长期做种时，保持文件原位置不变；移动文件后使用“设置位置”并重新校验。队列可设置同时下载 3–5 个任务，机械硬盘或低功耗设备应减少并发任务和连接数。

## 速度和连接数

在“速度”中填写运营商实际带宽的 70%–80% 作为上传上限，为网页、视频会议和 ACK 流量留出余量。下载上限通常可以不设；若下载占满带宽，再设置低于线路峰值的上限。需要定时让路由器空闲时，可启用备用速度限制和计划表。

可从以下保守值开始，再观察 CPU、内存、磁盘延迟和路由器负载：

- 全局连接数：300–800。
- 每个任务连接数：50–100。
- 全局上传槽：20–50，每个任务上传槽：4–8。
- 活跃下载：3–5，活跃做种数量按上传能力设置。

遇到网页卡顿、丢包或磁盘占用 100% 时，先降低上传速度、连接数和并发任务。

## 搜索、RSS 和自动化

“搜索”功能在桌面版中可能需要 Python 运行时和搜索插件。只安装可信来源、能核对代码的插件；未知插件不要使用。RSS 自动下载建议先建立分类、保存路径和大小/关键词过滤规则，再启用自动下载，避免误下重复内容。

## 安全与维护

- 定期更新 qBittorrent、操作系统和容器镜像，升级前备份 `/config` 或 profile 目录。
- 使用强密码；不要把密码写在公开 compose 文件、脚本或截图中。
- 只给下载目录和配置目录授予 qBittorrent 用户权限，避免用 root 运行。
- 公开服务优先使用 VPN、内网穿透或 HTTPS 反向代理，并在防火墙中只开放必要端口。
- 对下载文件做病毒扫描，谨慎运行下载目录中的可执行文件或脚本。
- 遵守所在地区法律和版权许可，只下载并分享自己有权处理的内容。

## 常见问题

**Web UI 打不开**：确认服务运行状态、8080 监听地址、防火墙和容器端口映射；反向代理下检查域名白名单和 WebSocket 转发。

**端口检测失败**：确认检测的是 BitTorrent 监听端口而不是 Web UI 端口，检查路由器转发、主机防火墙、运营商 CGNAT，以及 qBittorrent 是否在容器内监听正确地址。

**速度很慢**：先确认任务有可用做种者，再检查端口可达、上传限速、磁盘空间和连接数。热门任务速度受对端和网络拥塞影响，修改参数不能保证提速。

**移动后任务报错**：暂停任务，在 qBittorrent 中使用“设置位置”指向新目录，然后执行“强制重新校验”；不要直接删除 `.fastresume` 文件。

完成以上设置后，先用一个公开且合法的 Linux 发行版种子测试下载、校验和做种，确认路径、端口、限速和权限均符合预期，再添加长期任务。
