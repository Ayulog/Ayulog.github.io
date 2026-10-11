---
title: NAS 常用软件记录
description: NAS 的系统工具、容器管理、网络服务、家庭影音与网盘软件清单，附项目入口和安装维护笔记。
author: Ayulog
pubDatetime: "2026-10-09T15:30:00+08:00"
draft: false
setupCategory: nas
setupRole: overview
tags:
  - Debian
  - NAS
  - 软件清单
  - Docker
  - 家庭影音
---

NAS 上用到的系统工具、容器和影音服务放在这里。安装、配置和排错各写一篇，这页留用途、项目入口和教程链接。

做种工具见 [PT 常用软件记录](/posts/2026-10-09-pt-software/)，路由系统见 [软路由常用软件记录](/posts/2026-10-10-soft-router-software/)。Windows 上的容器环境另见 [WSL 与 Docker](/posts/2026-10-10-windows-containers/)。

## 系统与容器基础

- **[DebNAS](https://kekylin.github.io/debnas-docs/)**：基于 Debian 的 NAS 初始化与管理脚本。[安装、磁盘共享与备份笔记](/posts/2026-10-09-debnas-installation-notes/)。
- **[Docker Engine](https://docs.docker.com/engine/install/debian/)**：运行容器；Debian 按官方文档配置软件源和安装，品牌 NAS 使用厂商提供的容器应用或安装方式。
- **[Docker Compose](https://docs.docker.com/compose/)**：用文件保存服务配置。现成模板放在 [Compose 存档](/setup/compose/)。
- 拉不下镜像时，先看 [镜像加速、代理与离线导入](/posts/2026-10-10-docker-registry-mirrors/)。

## 容器管理与定时任务

| 软件                                                                       | 用途                                           | 教程                                                        |
| -------------------------------------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------- |
| [Dockge](https://github.com/louislam/dockge)                               | 编辑和管理 Compose 项目                        | [部署与栈管理](/posts/2026-10-10-dockge-guide/)             |
| [Portainer CE](https://www.portainer.io/)                                  | 管理容器、镜像、网络和卷                       | [部署与环境连接](/posts/2026-10-10-portainer-guide/)        |
| [Watchtower](https://github.com/containrrr/watchtower)                     | 监控镜像变化，可按标签更新；项目维护状态需留意 | [标签、通知与更新范围](/posts/2026-10-10-watchtower-guide/) |
| [DockerCopilot](https://github.com/onlyLTY/dockerCopilot)                  | 容器更新、清理和配置备份                       | [部署与使用](/posts/2026-10-10-dockercopilot/)              |
| [1Panel](https://1panel.cn/)                                               | Linux 服务与应用管理面板                       | [直接安装与 Docker 部署](/posts/2026-10-10-1panel-guide/)   |
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

公网 IPv4、IPv6、组网 VPN 和 VPS 转发各有适用条件，选方案看 [NAS 远程连接](/posts/2026-10-09-nas-remote-access/)。

## 通用下载

- **[Aria2](https://aria2.github.io/)**：HTTP、FTP 等下载任务和 RPC 服务。
- **[AriaNg](https://github.com/mayswind/AriaNg)**：Aria2 的网页前端，本身不执行下载。

两者的部署、RPC 连接和下载设置合在 [Aria2 与 AriaNg 教程](/posts/2026-10-10-aria2-guide/)里。

qBittorrent 和 Transmission 的做种设置归在 [PT](/setup/pt/) 下。

## 路由器与家庭网络

路由系统、插件和设备资料移到了 [软路由常用软件记录](/posts/2026-10-10-soft-router-software/)，配网教程也收在 [软路由](/setup/soft-router/) 下。

## 媒体库与自动化整理

### 媒体库

| 软件                              | 记录                                                  | 选择时关注                                      |
| --------------------------------- | ----------------------------------------------------- | ----------------------------------------------- |
| [Emby](https://emby.media/)       | [部署、媒体库与客户端](/posts/2026-10-10-emby-guide/) | 本地账号、Premiere 硬解，以及常用的客户端       |
| [Jellyfin](https://jellyfin.org/) | [部署与硬件转码](/posts/2026-10-10-jellyfin-guide/)   | 官方服务端与客户端免费，核显权限需要配置        |
| [Plex](https://www.plex.tv/)      | [部署与远程播放](/posts/2026-10-10-plex-guide/)       | 账号认领、客户端体验和 Plex Pass / 远程播放要求 |

三者可以读取同一份媒体文件，配置数据库各自独立。比较时用同一部电影和一集剧，检查字幕、音轨、拖动与续播；整库分析会占用资源，错开执行。

[StrmAssistant（Emby 神医助手）](https://github.com/sjtuross/StrmAssistant) 是 Emby 的增强插件，提供媒体信息提取、外挂字幕扫描、中文搜索和视频预览图等功能。[Emby 教程](/posts/2026-10-10-emby-guide/#神医助手按需安装)中记录了接入位置；另存 [PRO 版安装与授权](https://github.com/sjtuross/StrmAssistant/wiki/PRO%E7%89%88%E5%AE%89%E8%A3%85%E5%92%8C%E6%8E%88%E6%9D%83)。社区版和 PRO 的维护状态、功能与适配版本分别看项目说明。

### 订阅、整理与云端同步

| 软件                                                     | 记录                                                                  | 用途                                          |
| -------------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------- |
| [MoviePilot](https://github.com/jxxghp/MoviePilot)       | [V3 部署与配置](/posts/2026-10-10-moviepilot-guide/)                  | 搜索、订阅、下载联动、整理和媒体库刷新        |
| [Cloud Media Sync](https://github.com/imaliang/cms-docs) | [115 同步与 Emby 302](/posts/2026-10-10-cloud-media-sync/)            | 同步云端目录、生成 STRM，并按配置提供播放入口 |
| [CookieCloud](https://github.com/easychen/CookieCloud)   | [浏览器与 MoviePilot 同步](/posts/2026-10-09-cookiecloud-moviepilot/) | 加密上传浏览器 Cookie，供受支持的应用读取     |

MoviePilot 当前部署入口是 [V3 镜像](https://hub.docker.com/r/jxxghp/moviepilot-v3)，原收藏的[旧版镜像](https://hub.docker.com/r/jxxghp/moviepilot)保留作对照。[Windows-MoviePilot](https://github.com/developer-wlj/Windows-MoviePilot/releases) 是第三方 Windows 服务管理面板，不是官方 V3 Docker 镜像的 Windows 版本。

CMS 上面的项目链接是文档仓库，另有 [CMSHelp 补充帮助](https://github.com/guyue2005/CMSHelp)。部署时按当前安装页核对授权条件和参数。

[DebNAS 自动观影流程](/posts/2026-10-09-debnas-media-workflow/)记录本地文件、网盘原文件与 STRM 的存放位置，以及命名、同步和入库的分工。

## 下载器与 PT 配套工具

[PT 软件总篇](/posts/2026-10-09-pt-software/)集中收录 qBittorrent、Transmission、TrguiNG、IYUUPlus、PTtool、Vertex 与浏览器扩展。

## 云盘、照片与音乐

### 网盘挂载与文件管理

| 软件                                                     | 记录                                                                 | 用途                                                               |
| -------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [CloudDrive2](https://www.clouddrive2.com/)              | [挂载、目录共享与缓存](/posts/2026-10-10-cloud-storage-local-mount/) | 把远端文件显示成 NAS 目录或 Windows 盘符                           |
| [AList](https://alistgo.com/)                            | [部署、WebDAV 与路径权限](/posts/2026-10-10-alist-guide/)            | 聚合多种存储，提供文件列表和 WebDAV                                |
| [CloudSaver](https://github.com/jiangrui1994/CloudSaver) | 项目文档                                                             | 网盘资源搜索与转存；仓库公开源码停留在较早版本，新版以项目镜像为准 |

原收藏的 [CloudDrive2 第三方安装脚本](https://github.com/sublaim/clouddrive2)也留在这里。它是社区安装方案，和官方核心服务、fnOS 套件、Docker 镜像分开核对。

支持 WebDAV 的播放器可以直接连 AList，只认文件路径的应用再接 CloudDrive2。挂载目录中出现文件名，并不代表本地有离线副本，写入结束也要检查远端上传是否完成。

### 照片、音乐和有声书

| 软件                                                                       | 记录或文档                                             | 用途                                         |
| -------------------------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------- |
| [MT Photos](https://mtmt.tech/)                                            | [部署与照片库设置](/posts/2026-10-10-mt-photos-guide/) | NAS 照片整理、浏览与客户端访问               |
| [Music Tag Web V2](https://xiers-organization.gitbook.io/music-tag-web-v2) | 项目文档                                               | 音乐标签、元数据刮削和播放，适合整理文件信息 |
| [Audiobookshelf](https://audiobookshelf.org/)                              | 项目文档                                               | 自建有声书与播客库                           |

配置和原始文件分开备份。照片整理、音乐标签写入会修改文件，自动任务先限制在测试目录。

## 直播、命名与刮削

- [IPTV：Allinone 与频道整理](/posts/2026-10-10-iptv-guide/)：记录 M3U、EPG、播放器与服务端的关系。Allinone 当前完整授权参数尚未确认，文章中保留了部署前提。
- [影视资源命名](/posts/2026-10-10-media-resource-naming/)：读懂发布名，整理电影、剧集、字幕与多版本入库名称。
- [TMDB 代理](/posts/2026-10-10-vercel-tmdb-proxy/)：Vercel 部署、API 与图片检查，以及媒体软件的地址设置。
- [IPTVindex](https://iptvindex.com/)：播放器、直播源、节目单和资料的导航收藏。

## 播放器和下载配套

手机、电视与桌面的 Emby 客户端入口放在 [Emby 客户端设置](/posts/2026-10-10-emby-guide/#各平台客户端怎么选)。Jellyfin、Plex 教程中也有官方客户端目录。电视端尤其需要试一下遥控器操作、字幕和音轨切换。

下载交给 qBittorrent、Transmission 等工具，配置见 [PT 常用软件记录](/posts/2026-10-09-pt-software/)。原收藏的 [VERTEX](https://hub.docker.com/r/lswl/vertex) 用于 PT 场景的追剧、下载与任务管理；[PTtool](https://github.com/appotry/PTtool) 提供硬链接整理脚本与资料。硬链接要求同一文件系统，不能用来把本地文件“零空间上传”到网盘。

## 服务器与常用网站

- **[Hetzner](https://www.hetzner.com/)**：独立服务器、云服务器与存储服务。
- **[HostLoc](https://hostloc.com/misc.php?mod=mobile)**：服务器、主机商和线路讨论。
- **[Dedicated-Seedbox](https://github.com/jerry048/Dedicated-Seedbox)**：Debian / Ubuntu 上的 Seedbox 部署脚本，使用笔记见 [PT 盒子](/posts/2026-10-09-pt-seedbox-guide/)。
- **[FrozenGEE/compose](https://github.com/FrozenGEE/compose)**：Compose 模板与 NAS 资料。
- **[HD-Icons](https://github.com/xushier/HD-Icons)**：NAS 导航页与应用图标。

## 教程与参考资料

各教程保留对应原文。Compose 示例需要核对镜像维护者、版本与目录后再用。

### 教程来源

- [windowBR：在 Docker 中使用 Mihomo](https://windowbr.top/2024/11/02/mihomo-docker/)。
- [kekylin：DebNAS 文档](https://kekylin.github.io/debnas-docs/)：Debian HomeNAS 的系统配置和配套服务。
- [劲折腾的磕巴白菜](https://hi.keba.host/)：NAS、Emby、MoviePilot、网盘与 Compose 部署记录。
- [《EMBY 搭建教程基于docker-compose，CMS + emby + 115+MOVIEPILOT v2+Qbittorrent》](https://www.nodeseek.com/post-616021-1)：NodeSeek 上收藏的组合方案。原文是 MoviePilot v2 背景，不能直接套入 V3；页面此前遇到站点验证，正文尚待完整核对。

## 之后想单独整理的内容

尚未写成教程的软件先保留项目入口，后续补安装、配置和排错记录。
