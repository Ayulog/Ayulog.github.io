---
title: NAS 常用软件及网站记录
description: 按用途整理 NAS 软件、容器镜像、文档和常用网站，涵盖媒体库、下载与 PT、网络访问、容器管理和家庭影音，并保留后续实践要用到的教程来源。
author: Ayulog
pubDatetime: "2026-10-09T15:30:00+08:00"
draft: false
tags:
  - NAS
  - 装机
  - 软件清单
  - Docker
---

把折腾 NAS 时会用到的软件、文档和网站集中记在这里。按用途整理一下，以后搭服务、查配置或者找资料时，能少翻几次收藏夹。

有些链接是别人的教程，这次先保留原文和来源。后续实际搭建时，再单独写成使用记录，补上环境、配置和遇到的问题。

## 目录

- [媒体库与自动化整理](#媒体库与自动化整理)
- [下载器与 PT 配套工具](#下载器与-pt-配套工具)
- [网络访问与浏览器配套](#网络访问与浏览器配套)
- [容器管理与定时任务](#容器管理与定时任务)
- [云盘、照片与音乐](#云盘照片与音乐)
- [路由器与家庭网络](#路由器与家庭网络)
- [服务器与常用网站](#服务器与常用网站)
- [教程与参考资料](#教程与参考资料)
- [之后想单独整理的内容](#之后想单独整理的内容)

## 媒体库与自动化整理

- **[StrmAssistant（Emby 神医助手）](https://github.com/sjtuross/StrmAssistant)**：面向 Emby 的增强插件，提供媒体信息提取、外挂字幕扫描、中文搜索和视频预览图等功能。另存 [PRO 版安装和授权说明](https://github.com/sjtuross/StrmAssistant/wiki/PRO%E7%89%88%E5%AE%89%E8%A3%85%E5%92%8C%E6%8E%88%E6%9D%83)，社区版与 PRO 的功能、维护状态和适配版本需要分别查看。
- **[CloudMediaSynC（CMS）](https://github.com/imaliang/cms-docs)**：云端媒体库同步工具，可监控 115 文件夹并生成供 Emby 使用的 STRM 文件，也提供增量同步和媒体整理等功能。这里链接的是文档仓库，另有 [CMSHelp 补充帮助](https://github.com/guyue2005/CMSHelp)。
- **[MoviePilot](https://github.com/jxxghp/MoviePilot)**：NAS 媒体库自动化管理工具，覆盖订阅、搜索、下载、整理、刮削和媒体库刷新。当前部署入口为 [MoviePilot V3 镜像](https://hub.docker.com/r/jxxghp/moviepilot-v3)，同时保留原先收藏的 [旧版镜像入口](https://hub.docker.com/r/jxxghp/moviepilot)。第三方 Windows 服务管理面板 [Windows-MoviePilot 发布页](https://github.com/developer-wlj/Windows-MoviePilot/releases)。
- **[VERTEX](https://hub.docker.com/r/lswl/vertex)**：面向 PT 场景的追剧、下载与任务管理工具。
- **[PTtool](https://github.com/appotry/PTtool)**：提供媒体文件硬链接整理脚本，便于保留下载目录用于做种，同时建立媒体库目录；仓库也收集了相关工具和教程。

## 下载器与 PT 配套工具

这一组既有 NAS 上运行的下载服务，也有电脑或浏览器端的管理工具，按实际使用位置选择即可。

- **[Transmission](https://transmissionbt.com/download)**：跨平台 BitTorrent 客户端，提供桌面程序以及面向服务器、NAS 的使用方式，可通过远程管理界面操作下载任务。
- **[TrguiNG](https://github.com/openscopeproject/TrguiNG)**：用于远程管理 Transmission 的图形界面，可作为桌面应用或网页界面使用。另存 [jayzcoder 的汉化增强分支](https://github.com/jayzcoder/TrguiNG)，基于上游增加了汉化、分组展示和 Tracker 筛选等功能。
- **[Transmission Web Control](https://github.com/ronggang/transmission-web-control)**：Transmission 的第三方网页管理界面，提供任务和 Tracker 分组等管理功能。项目已归档、不再维护，相关旧教程放在后面的参考资料中。
- **[IYUUPlus 开发版](https://gitee.com/ledc/iyuuplus-dev)**：查找不同站点间的相同资源，并联动 Transmission、qBittorrent 完成校验与辅种，支持多个下载器和下载目录。另存 [官方文档](https://doc.iyuu.cn/) 与 [IYUU 社区入口](https://www.iyuu.cn/)。
- **[PT-Depiler](https://github.com/pt-plugins/PT-depiler)**：浏览器端的 PT 辅助扩展，支持多站搜索、站点信息汇总，并可向 Transmission、qBittorrent 等下载器推送种子。
- **[auto-feed](https://github.com/tomorrow505/auto_feed_js)**：用于 PT 站点间转载时辅助填写发布信息的浏览器用户脚本，也提供查重、图片转存和部分下载器推送功能。

## 网络访问与浏览器配套

- **[Lucky（万吉）](https://github.com/gdy666/lucky)**：集成端口转发、动态域名解析和 Web 服务等功能的网络工具，可用于整理家庭网络的访问入口。另存 [项目网站](https://lucky666.cn/)。
- **[ddns-go](https://github.com/jeessy2/ddns-go)**：自动获取本机的公网 IPv4 或 IPv6 地址，并更新域名解析，适合公网地址会变化的家庭网络。
- **[CookieCloud](https://github.com/easychen/CookieCloud)**：将浏览器 Cookie 加密后同步到自建服务端，方便与支持它的工具配合使用，省去反复手动复制的步骤。

## 容器管理与定时任务

- **[Dockge](https://github.com/louislam/dockge)**：基于 Docker Compose 的容器栈管理界面，用于编辑 Compose 文件、启动和停止服务以及查看运行日志。
- **[FrozenGEE/compose](https://github.com/FrozenGEE/compose)**：收集 Docker Compose 模板和 NAS 配置资料的仓库，适合查找部署示例、对照配置注释。
- **[QD / QD-Today](https://qd-today.github.io/qd/zh_CN/guide/deployment.html)**：基于 HTTP 请求模板执行签到等定时任务的工具，链接为项目部署文档。另存 [a76yyyy/qiandao 镜像标签页](https://hub.docker.com/r/a76yyyy/qiandao/tags)；当前官方文档使用 `qdtoday/qd`，部署时以对应版本的说明为准。
- **[HD-Icons](https://github.com/xushier/HD-Icons)**：面向 NAS 导航页、容器和仪表盘的图标库，提供多种样式的图标，方便给自建服务补上易辨认的入口图标。

## 云盘、照片与音乐

- **[CloudDrive2 第三方安装脚本](https://github.com/sublaim/clouddrive2)**：用于安装 CloudDrive2 的辅助脚本。CloudDrive2 可将云盘挂载到本地；这里收藏的是社区安装方案，后续需要按自己的系统环境核对。
- **[CloudSaver](https://github.com/jiangrui1994/CloudSaver)**：网盘资源搜索与转存工具，支持通过 Docker 自行部署。仓库说明公开源码停留在较早版本，新版以项目提供的镜像为准。
- **[MT Photos](https://mtmt.tech/)**：面向 NAS 的照片管理系统，用于整理和浏览个人照片库，并提供多个平台的客户端。
- **[Music Tag Web V2](https://xiers-organization.gitbook.io/music-tag-web-v2)**：集音乐标签整理、元数据刮削和播放于一体的个人音乐库工具，适合批量补充和规范音乐文件信息。
- **[Audiobookshelf](https://audiobookshelf.org/)**：可自行部署的有声书与播客服务，用于集中管理和收听个人音频库。

## 路由器与家庭网络

- **[Are-u-ok](https://github.com/AUK9527/Are-u-ok/tree/main/apps)**：iStore 相关的第三方插件包集合，属于路由器侧的配套资料，安装前需要对照固件、处理器架构和各插件说明。
- **[恩山无线论坛](https://www.right.com.cn/forum/index.php)**：路由器与家庭网络爱好者社区，可以查找固件、设备折腾和网络配置方面的讨论。
- **[acwifi](https://www.acwifi.net/)**：路由器技术分享网站，收录路由器拆机、评测、设置和选购资料，适合规划家庭网络时参考。

## 服务器与常用网站

- **[Dedicated-Seedbox](https://github.com/jerry048/Dedicated-Seedbox)**：面向 Debian、Ubuntu 的 Seedbox 部署与管理项目，围绕 qBittorrent 和相关辅助组件提供环境搭建与维护工具。
- **[Hetzner](https://www.hetzner.com/)**：提供独立服务器、云服务器和存储等服务，可作为了解远程服务器与存储方案的入口。
- **[HostLoc（全球主机交流论坛）](https://hostloc.com/misc.php?mod=mobile)**：围绕 VPS、服务器、主机商和网络线路展开交流的社区。
- **[IPTVindex](https://iptvindex.com/)**：汇集 IPTV 播放器、直播源、节目单和相关说明的导航网站，作为家庭影音资料入口收藏。

## 教程与参考资料

下面这些资料保留原作者或项目的链接。旧版本教程里的路径、参数和镜像名称，需要在实际整理时重新核对。

- **[《EMBY 搭建教程基于docker-compose，CMS + emby + 115+MOVIEPILOT v2+Qbittorrent》](https://www.nodeseek.com/post-616021-1)**：NodeSeek 上的自动化观影流程教程，涉及 CMS、Emby、115、MoviePilot v2 和 qBittorrent 的组合。先保留原文，后续再按自己的环境拆解部署流程；原文的 v2 配置需要与当前 MoviePilot 版本分别核对。
- **[《Transmission 配置文件参数中文详细解释》](https://cloud.tencent.com/developer/article/1966381)**：暮城发表于腾讯云开发者社区的参数说明文章，可作为整理配置笔记的参考。原文发表于 2022 年，参数含义和默认值仍需对照所用版本。
- **[Transmission Web Control：《在 Windows 下安装与更新》](https://github.com/ronggang/transmission-web-control/wiki/Windows-Installation-CN)**：项目 Wiki 中的安装与更新说明，作为已归档管理界面的旧方案资料保留。
- **[Transmission bug 排查讨论](https://forum.transmissionbt.com/viewtopic.php?t=18976)**：收藏的 Transmission 社区讨论，留待遇到相关问题时对照排查。
- **[《VPS安装刷流环境》](https://www.yuque.com/liyaohui-4vwmf/kb/ut79tysu7a79ysby#Cd381)**：语雀上的 VPS 环境搭建参考，页面摘要以 Hetzner Cloud 为例。正文尚待完整阅读，后续再核对配置和适用环境。
- **[《在 docker 中使用 mihomo》](https://windowbr.top/2024/11/02/mihomo-docker/)**：windowBR 的 Docker 部署教程，涉及 mihomo 配置、Compose 和管理界面，可作为以后整理自己的网络服务配置时的参考。
- **[DebNAS 文档](https://kekylin.github.io/debnas-docs/)**：kekylin 整理的 Debian HomeNAS 搭建方案与文档，留作整理系统基础环境与服务部署时的参考。
- **[劲折腾的磕巴白菜](https://hi.keba.host/)**：磕巴白菜的 NAS 折腾博客，包含媒体库、MoviePilot、Compose 和不同 NAS 平台的部署记录。

> NodeSeek 原文标题与用途、Transmission 论坛的排查主题来自收藏时的记录；本次访问仍遇到站点验证页，正文留待后续阅读。

## 之后想单独整理的内容

- **自动化观影流程**：从目录规划开始，记录 CMS、Emby、115、MoviePilot 与下载器之间如何配合。
- **Transmission 使用与排错**：整理参数、远程管理界面和实际遇到的问题，明确版本与复现条件。
- **Debian NAS 与容器部署**：记录基础环境、Compose 文件、目录挂载、权限和更新方式。
- **网络访问与云盘挂载**：整理 DDNS、服务入口、mihomo 与 CloudDrive2 的配置关系。
- **远程服务器与 Seedbox**：记录服务器环境、下载目录、任务管理和维护经验。

这些先作为待办。之后每篇记录都会附上参考来源，再补充自己实际验证过的步骤。
