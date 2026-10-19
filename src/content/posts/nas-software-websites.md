---
title: NAS 服务清单
description: NAS 上按用途分组的软件清单，每项附部署文章或项目入口。
author: Ayulog
pubDatetime: "2026-10-09T15:30:00+08:00"
modDatetime: "2026-10-17T21:00:00+08:00"
draft: false
category: nas
tags:
  - Debian
  - Docker
---

这份清单将家用 NAS 常用软件按“底层系统与容器管理、网络与远程入口、媒体库与自动化下载、云盘与个人资料库”四类整理，每项附对应的部署笔记与上游仓库入口。

专项工具分流在对应清单中：做种与刷流工具见 [PT 工具清单](/posts/pt-software/)，旁路由与代理固件见 [软路由系统与插件清单](/posts/soft-router-software/)，Windows 下的容器环境见 [WSL 与 Docker](/posts/windows-containers/)。

## 流程概览

按实际需求从对应主线切入，同类工具挑顺手的一套即可：

| 目标任务            | 实施路径                                                                  | 对应文章                                                                        |
| ------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 从零搭建 Debian NAS | 安装系统与 SSH → 挂载数据盘与共享 → 部署容器 → 重启与备份恢复验证         | [DebNAS 安装与验收](/posts/debnas-installation-notes/)                          |
| 维护和升级容器      | 固定维护入口 → 记录镜像版本与挂载 → 备份配置与数据 → 升级验证并清理旧镜像 | [Docker 应用维护](/posts/docker-management/)                                    |
| 从外网访问家中服务  | 确认公网 IP 或组网条件 → 选择 DDNS / 反代或虚拟组网 → 客户端实测连通性    | [NAS 远程访问](/posts/nas-remote-access/)                                       |
| 自动化追剧与观影    | 本地下载或网盘转存 → 识别整理或生成 STRM → Emby 入库 → 客户端播放         | [DebNAS 自动观影流程](/posts/debnas-media-workflow/)                            |
| 将网盘接入本地应用  | 按应用需求选择本地路径挂载或 WebDAV → 配置缓存并验证重连恢复              | [CloudDrive2](/posts/cloud-storage-local-mount/) · [AList](/posts/alist-guide/) |
| 管理家庭照片与直播  | 照片按原件、配置与上传目录分离挂载；直播按源列表、EPG 与播放器接入        | [MT Photos](/posts/mt-photos-guide/) · [IPTV 教程入口](#直播命名与刮削)         |

## 系统与容器基础

- **[DebNAS](https://kekylin.github.io/debnas-docs/)**：基于 Debian 12 / 13 的 HomeNAS 初始化与管理脚本，配套说明见 [安装、磁盘共享与备份笔记](/posts/debnas-installation-notes/)。
- **[Docker Engine](https://docs.docker.com/engine/install/debian/)**：Linux 容器运行环境；自建 Debian 按官方文档配置软件源安装，品牌 NAS 直接使用系统自带的容器套件。
- **[Docker Compose](https://docs.docker.com/compose/)**：使用 YAML 文件声明式管理容器配置，常用模板汇总于 [Compose 存档](/setup/compose/)。
- **镜像拉取配置**：遇到拉取超时或限流时，参考 [镜像加速、代理与离线导入](/posts/docker-registry-mirrors/) 配置加速器或 daemon 代理。

## 容器管理与定时任务

| 软件                                                                       | 适用场景与特点                                                      | 教程入口                                               |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------ |
| [Dockge](https://github.com/louislam/dockge)                               | 网页端编辑与部署 `compose.yaml`，配置文件直接保存在宿主机目录       | [部署与栈管理](/posts/dockge-guide/)                   |
| [Portainer CE](https://www.portainer.io/)                                  | 集中查看与管理容器、镜像、网络、卷及多套 Docker 环境                | [部署与环境连接](/posts/portainer-guide/)              |
| [Watchtower](https://github.com/containrrr/watchtower)                     | 按标签监控镜像更新并通知或重建容器（官方仓库已归档于 `v1.7.1`）     | [标签、通知与更新范围](/posts/watchtower-guide/)       |
| [DockerCopilot](https://github.com/onlyLTY/dockerCopilot)                  | 在网页端手动勾选更新容器、清理旧镜像并导出容器创建参数备份          | [部署与使用](/posts/dockercopilot/)                    |
| [1Panel](https://1panel.cn/)                                               | 集成应用商店、容器、网站与系统监控的 Linux 面板（含原生与容器部署） | [直接安装与 Docker 部署](/posts/1panel-guide/)         |
| [QD / QD-Today](https://qd-today.github.io/qd/zh_CN/guide/deployment.html) | 基于 HAR / HTTP 模板定时执行网页签到任务                            | [qiandao 部署与任务配置](/posts/qiandao-docker-guide/) |

- **面板分工**：同一应用建议固定由一个入口维护（如 Dockge 或原 Compose 目录），日常迁移、备份与手动更新流程见 [Docker 应用维护](/posts/docker-management/)。
- **签到镜像说明**：QD 上游当前使用 `qdtoday/qd` 镜像，站内现有笔记基于旧分支 [`a76yyyy/qiandao`](https://hub.docker.com/r/a76yyyy/qiandao/tags) 整理，两者环境变量与数据目录结构有所区别。

## 网络访问与浏览器配套

| 软件                                          | 用途说明                                 | 教程与项目入口                                                       |
| --------------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------- |
| [Lucky](https://github.com/gdy666/lucky)      | 集成 DDNS、反向代理、证书与转发          | [Lucky 设置](/posts/lucky-guide/) · [项目网站](https://lucky666.cn/) |
| [ddns-go](https://github.com/jeessy2/ddns-go) | 自动检测公网 IPv4 / IPv6 并更新域名解析  | [ddns-go 设置](/posts/ddns-go-guide/)                                |
| [Mihomo](https://github.com/MetaCubeX/mihomo) | 规则代理核心，常配合 MetaCubeXD 面板使用 | [容器部署与配置](/posts/mihomo-docker/)                              |
| [v2rayA](https://v2raya.org/)                 | 带 Web 图形界面的 Linux 代理客户端       | [部署与端口设置](/posts/v2raya-guide/)                               |

家庭宽带公网 IPv4、IPv6 直连、Tailscale / ZeroTier 虚拟组网以及云服务器中转的选型对比，详见 [NAS 远程连接](/posts/nas-remote-access/)；主路由与旁路由配置见 [软路由系统与插件清单](/posts/soft-router-software/)。

## 媒体库与自动化整理

### 媒体库与播放终端

| 软件                              | 部署教程                                   | 特点与关注项                                      |
| --------------------------------- | ------------------------------------------ | ------------------------------------------------- |
| [Emby](https://emby.media/)       | [部署、媒体库与客户端](/posts/emby-guide/) | 支持本地账号管理，客户端生态丰富，硬解需 Premiere |
| [Jellyfin](https://jellyfin.org/) | [部署与硬件转码](/posts/jellyfin-guide/)   | 开源免费，原生支持核显硬件转码                    |
| [Plex](https://www.plex.tv/)      | [部署与远程播放](/posts/plex-guide/)       | 海报刮削与跨平台客户端成熟，依赖在线账号认领      |

- **共享媒体目录**：三套服务端可只读挂载同一份影视目录进行对比测试，各自配置数据库独立存放。
- **Emby 增强与客户端**：[StrmAssistant（Emby 神医助手）](https://github.com/sjtuross/StrmAssistant) 提供媒体信息提取、外挂字幕扫描与中文搜索优化，接入说明见 [Emby 教程](/posts/emby-guide/#神医助手按需安装) 及 [PRO 版安装与授权](https://github.com/sjtuross/StrmAssistant/wiki/PRO%E7%89%88%E5%AE%89%E8%A3%85%E5%92%8C%E6%8E%88%E6%9D%83)。手机、桌面与 Apple TV 端播放器选型见 [Emby 客户端设置](/posts/emby-guide/#各平台客户端怎么选)。

### 订阅、整理与云端同步

| 软件                                                     | 部署教程                                                   | 用途说明                                          |
| -------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------- |
| [MoviePilot](https://github.com/jxxghp/MoviePilot)       | [V3 部署与配置](/posts/moviepilot-guide/)                  | 站点搜索、订阅下发、文件硬链接/复制整理与入库刷新 |
| [Cloud Media Sync](https://github.com/imaliang/cms-docs) | [115 同步与 Emby 302](/posts/cloud-media-sync/)            | 云盘媒体整理、本地 STRM 生成及 Emby 302 直链反代  |
| [CookieCloud](https://github.com/easychen/CookieCloud)   | [浏览器与 MoviePilot 同步](/posts/cookiecloud-moviepilot/) | 端到端加密同步浏览器站点 Cookie                   |

- **版本与补充入口**：MoviePilot 当前主流版本为 [V3 镜像](https://hub.docker.com/r/jxxghp/moviepilot-v3)（旧版归档于 [`jxxghp/moviepilot`](https://hub.docker.com/r/jxxghp/moviepilot)），另有第三方维护的 [Windows-MoviePilot](https://github.com/developer-wlj/Windows-MoviePilot/releases) 供 Windows 环境参考。CMS 除官方仓库外可参考 [CMSHelp 社区文档](https://github.com/guyue2005/CMSHelp)。
- **联动方案**：本地硬盘、115 网盘与 MoviePilot + CMS 的组合方式见 [DebNAS 自动观影流程](/posts/debnas-media-workflow/)。

### 通用下载与 PT 工具

- **[Aria2](https://aria2.github.io/) + [AriaNg](https://github.com/mayswind/AriaNg)**：用于常规 HTTP / FTP / BT 下载任务，RPC 对接与 Web 前端部署合集见 [Aria2 与 AriaNg 教程](/posts/aria2-guide/)。
- **PT 下载与辅种**：qBittorrent、Transmission、TrguiNG、IYUUPlus 等工具集中在 [PT 工具清单](/posts/pt-software/)；另有追剧刷流工具 [VERTEX](https://hub.docker.com/r/lswl/vertex) 及硬链接整理脚本 [PTtool](https://github.com/appotry/PTtool)。

## 云盘、照片与音乐

### 网盘挂载与文件管理

| 软件                                                     | 教程或文档                                                | 用途说明                                                                                                |
| -------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| [CloudDrive2](https://www.clouddrive2.com/)              | [挂载、目录共享与缓存](/posts/cloud-storage-local-mount/) | 将网盘挂载为 NAS 本地目录或 Windows 盘符（含 [第三方安装脚本](https://github.com/sublaim/clouddrive2)） |
| [AList](https://alistgo.com/)                            | [部署、WebDAV 与路径权限](/posts/alist-guide/)            | 聚合多网盘存储，对外提供网页文件浏览与 WebDAV 接口                                                      |
| [CloudSaver](https://github.com/jiangrui1994/CloudSaver) | 项目文档                                                  | 网盘资源搜索与一键转存工具                                                                              |

支持 WebDAV 协议的播放器可直接连接 AList；需要读取本地文件路径的容器（如 MoviePilot 挂载整理）则搭配 CloudDrive2 使用。

### 照片、音乐与有声书

| 软件                                                                       | 教程或文档                                  | 用途说明                                   |
| -------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------ |
| [MT Photos](https://mtmt.tech/)                                            | [部署与照片库设置](/posts/mt-photos-guide/) | 家庭照片备份、人脸与时间线整理、手机端同步 |
| [Music Tag Web V2](https://xiers-organization.gitbook.io/music-tag-web-v2) | 项目文档                                    | 音乐文件标签编辑、歌词封面刮削与在线播放   |
| [Audiobookshelf](https://audiobookshelf.org/)                              | 项目文档                                    | 自建有声书与播客媒体服务器                 |

## 直播、命名与刮削

- **[IPTV：Allinone 与频道整理](/posts/iptv-guide/)**：介绍 M3U 播放列表、EPG 电子节目单与直播源聚合服务的对接方式。
- **[IPTVindex：直播源、播放器与节目单](/posts/iptv-index/)**：通过 [IPTVindex](https://iptvindex.com/) 获取直播源与 EPG 地址，导入 VLC 或电视端播放器。
- **[影视资源命名](/posts/media-resource-naming/)**：解析常见影视发布组命名规范，配置电影、剧集、多版本与外挂字幕的标准入库名称。
- **[TMDB 代理](/posts/vercel-tmdb-proxy/)**：利用 Vercel 部署 TMDB API 与图片反代，解决媒体库刮削连接超时问题。

## 服务器与参考站点

### 常用主机与模板仓库

- **[Hetzner](https://www.hetzner.com/)**：欧洲独立服务器、VPS 与存储块服务商。
- **[HostLoc](https://hostloc.com/misc.php?mod=mobile)**：主机、网络线路与运维交流社区。
- **[Dedicated-Seedbox](https://github.com/jerry048/Dedicated-Seedbox)**：Debian / Ubuntu 独立服务器 Seedbox 环境一键调优脚本，使用说明见 [PT 盒子](/posts/pt-seedbox-guide/)。
- **[FrozenGEE/compose](https://github.com/FrozenGEE/compose)**：常用 NAS 容器的 Docker Compose 模板集合。
- **[HD-Icons](https://github.com/xushier/HD-Icons)**：高清透明背景的 NAS 导航页应用图标库。

### 博客与文档参考

- **[kekylin：DebNAS 文档](https://kekylin.github.io/debnas-docs/)**：Debian HomeNAS 系统初始化与配套组件指南。
- **[windowBR：在 Docker 中使用 Mihomo](https://windowbr.top/2024/11/02/mihomo-docker/)**：容器化部署 Mihomo 的配置参考。
- **[劲折腾的磕巴白菜](https://hi.keba.host/)**：绿联、极空间、飞牛等 NAS 的 Docker 容器与观影流程折腾笔记。
