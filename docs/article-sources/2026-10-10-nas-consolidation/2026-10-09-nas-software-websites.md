---
title: Debian 常用软件记录
description: Debian 与 NAS 的系统工具、容器管理、下载和网络服务清单，附安装与维护笔记。
author: Ayulog
pubDatetime: "2026-10-09T15:30:00+08:00"
draft: false
setupCategory: debian
setupRole: overview
tags:
  - Debian
  - NAS
  - 软件清单
  - Docker
---

Debian 和 NAS 上用到的工具放在这里。安装、配置和排错各写一篇，这页留用途、项目入口和教程链接。

影音应用见 [Home Media Center 常用软件记录](/posts/2026-10-10-home-media-center-software/)，做种工具见 [PT 常用软件记录](/posts/2026-10-09-pt-software/)。Windows 上的容器环境另见 [WSL 与 Docker](/posts/2026-10-10-windows-containers/)。

## 系统与容器基础

- **[DebNAS](https://kekylin.github.io/debnas-docs/)**：基于 Debian 的 NAS 初始化与管理脚本。[安装、磁盘共享与备份笔记](/posts/2026-10-09-debnas-installation-notes/)。
- **[Docker Engine](https://docs.docker.com/engine/install/debian/)**：运行容器；Debian 使用官方对应的软件源，品牌 NAS 按厂商应用安装。[安装准备与目录权限](/posts/2026-10-10-nas-docker-setup/)。
- **[Docker Compose](https://docs.docker.com/compose/)**：用文件保存服务配置。现成模板放在 [Compose 存档](/setup/compose/)。
- 拉不下镜像时，先看 [镜像加速、代理与离线导入](/posts/2026-10-10-docker-registry-mirrors/)。

## 容器管理与定时任务

| 软件                                                                       | 用途                                           | 教程                                                        |
| -------------------------------------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------- |
| [Dockge](https://github.com/louislam/dockge)                               | 编辑和管理 Compose 项目                        | [部署与栈管理](/posts/2026-10-10-dockge-guide/)             |
| [Portainer CE](https://www.portainer.io/)                                  | 管理容器、镜像、网络和卷                       | [部署与环境连接](/posts/2026-10-10-portainer-guide/)        |
| [Watchtower](https://github.com/containrrr/watchtower)                     | 监控镜像变化，可按标签更新；项目维护状态需留意 | [标签、通知与更新范围](/posts/2026-10-10-watchtower-guide/) |
| [DockerCopilot](https://github.com/onlyLTY/dockerCopilot)                  | 容器更新、清理和配置备份                       | [部署与使用](/posts/2026-10-10-dockercopilot/)              |
| [1Panel](https://1panel.cn/)                                               | Linux 服务与应用管理面板                       | [安装方式与应用管理](/posts/2026-10-10-1panel-guide/)       |
| [QD / QD-Today](https://qd-today.github.io/qd/zh_CN/guide/deployment.html) | 用 HTTP 模板执行签到等定时任务                 | [qiandao 部署与任务配置](/posts/qiandao-docker-guide/)      |

这些工具的职责有重叠，不必全装。同一个服务由哪个面板、哪份 Compose 管理，记清楚即可。选择与备份问题放在 [Docker 管理笔记](/posts/2026-10-10-docker-management/)。

QD 官方文档用 `qdtoday/qd`，现有教程保留的是 [`a76yyyy/qiandao`](https://hub.docker.com/r/a76yyyy/qiandao/tags)。两者的标签、参数和数据迁移要分别核对。

## 网络访问与浏览器配套

| 软件                                          | 用途                           | 教程                                                                            |
| --------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------- |
| [Lucky](https://github.com/gdy666/lucky)      | DDNS、反向代理、证书与转发     | [Lucky 设置](/posts/2026-10-10-lucky-guide/) · [项目网站](https://lucky666.cn/) |
| [ddns-go](https://github.com/jeessy2/ddns-go) | 跟踪公网地址并更新 DNS         | [ddns-go 设置](/posts/2026-10-10-ddns-go-guide/)                                |
| [Mihomo](https://github.com/MetaCubeX/mihomo) | 代理核心，配合 MetaCubeXD 管理 | [容器部署与配置](/posts/2026-10-09-mihomo-docker/)                              |
| [v2rayA](https://v2raya.org/)                 | 通过 Web 界面管理代理          | [部署与端口设置](/posts/2026-10-10-v2raya-guide/)                               |

公网 IPv4、IPv6、组网 VPN 和 VPS 转发各有适用条件，选方案看 [NAS 远程连接](/posts/2026-10-09-nas-remote-access/)。[CookieCloud](/posts/2026-10-09-cookiecloud-moviepilot/) 配合 MoviePilot，归在家庭影音里。

## 通用下载

- **[Aria2](https://aria2.github.io/)**：HTTP、FTP 等下载任务和 RPC 服务。[安装与 RPC 配置](/posts/2026-10-10-aria2-guide/)。
- **[AriaNg](https://github.com/mayswind/AriaNg)**：Aria2 的网页前端，本身不执行下载。[部署与连接](/posts/2026-10-10-ariang-guide/)。

qBittorrent 和 Transmission 的做种设置归在 [PT](/setup/pt/) 下。

## 路由器与家庭网络

路由系统、插件和设备资料移到了 [软路由常用软件记录](/posts/2026-10-10-soft-router-software/)，配网教程也收在 [软路由](/setup/soft-router/) 下。

## 媒体库与自动化整理

[Home Media Center 软件总篇](/posts/2026-10-10-home-media-center-software/)集中收录 Emby、Jellyfin、Plex、MoviePilot、CMS 与 StrmAssistant。各软件的部署和使用分别写在子篇里。

## 下载器与 PT 配套工具

[PT 软件总篇](/posts/2026-10-09-pt-software/)集中收录 qBittorrent、Transmission、TrguiNG、IYUUPlus、PTtool、Vertex 与浏览器扩展。

## 云盘、照片与音乐

[Home Media Center 软件总篇](/posts/2026-10-10-home-media-center-software/)保留 CloudDrive2、CloudSaver、MT Photos、Music Tag Web 与 Audiobookshelf 的入口。照片部署另见 [MT Photos](/posts/2026-10-10-mt-photos-guide/)。

## 服务器与常用网站

- **[Hetzner](https://www.hetzner.com/)**：独立服务器、云服务器与存储服务。
- **[HostLoc](https://hostloc.com/misc.php?mod=mobile)**：服务器、主机商和线路讨论。
- **[Dedicated-Seedbox](https://github.com/jerry048/Dedicated-Seedbox)**：Debian / Ubuntu 上的 Seedbox 部署脚本，使用笔记见 [PT 盒子](/posts/2026-10-09-pt-seedbox-guide/)。
- **[FrozenGEE/compose](https://github.com/FrozenGEE/compose)**：Compose 模板与 NAS 资料。
- **[HD-Icons](https://github.com/xushier/HD-Icons)**：NAS 导航页与应用图标。

## 教程与参考资料

- [windowBR：在 Docker 中使用 Mihomo](https://windowbr.top/2024/11/02/mihomo-docker/)。
- [kekylin：DebNAS 文档](https://kekylin.github.io/debnas-docs/)。
- [劲折腾的磕巴白菜](https://hi.keba.host/)：NAS、媒体库与 Compose 部署记录。

## 之后想单独整理的内容

现有教程按 [Debian](/setup/debian/)、[软路由](/setup/soft-router/)、[Home Media Center](/setup/home-media-center/) 和 [PT](/setup/pt/) 分开查。尚未写成教程的软件只保留项目入口。
