---
title: Home Media Center 常用软件记录
description: 记录家庭影音会用到的媒体库、订阅整理、网盘挂载、照片、音乐和直播工具，集中放项目入口、选择理由与各软件的独立配置笔记。
author: Ayulog
pubDatetime: "2026-10-10T16:00:00+08:00"
draft: true
setupCategory: home-media-center
setupRole: overview
tags:
  - 家庭影音
  - NAS
  - 软件清单
  - Docker
---

家里的电影、剧集、照片和音乐，用到的软件放在这里。总篇留入口和用途，安装步骤、设置与排错放进各自的文章，以后换一项服务也容易查。

系统和容器基础见 [Debian 常用软件记录](/posts/2026-10-09-nas-software-websites/)，下载与做种见 [PT 常用软件记录](/posts/2026-10-09-pt-software/)。

## 媒体库

| 软件                              | 记录                                                  | 选择时关注                                      |
| --------------------------------- | ----------------------------------------------------- | ----------------------------------------------- |
| [Emby](https://emby.media/)       | [部署、媒体库与客户端](/posts/2026-10-10-emby-guide/) | 本地账号、Premiere 硬解，以及自己常用的客户端   |
| [Jellyfin](https://jellyfin.org/) | [部署与硬件转码](/posts/2026-10-10-jellyfin-guide/)   | 官方服务端与客户端免费，核显权限需要自己配好    |
| [Plex](https://www.plex.tv/)      | [部署与远程播放](/posts/2026-10-10-plex-guide/)       | 账号认领、客户端体验和 Plex Pass / 远程播放要求 |

三者都可以读取同一份媒体文件，但配置数据库各自独立。比较时先用同一部电影和一集剧，检查字幕、音轨、拖动与续播；不必同时开启三个服务的整库分析任务。

[StrmAssistant（Emby 神医助手）](https://github.com/sjtuross/StrmAssistant) 是 Emby 的增强插件，提供媒体信息提取、外挂字幕扫描、中文搜索和视频预览图等功能。[Emby 教程](/posts/2026-10-10-emby-guide/#神医助手按需安装)中记录了接入位置；另存 [PRO 版安装与授权](https://github.com/sjtuross/StrmAssistant/wiki/PRO%E7%89%88%E5%AE%89%E8%A3%85%E5%92%8C%E6%8E%88%E6%9D%83)。社区版、PRO 的维护状态、功能与适配版本分别看项目说明。

## 订阅、整理与云端同步

| 软件                                                     | 记录                                                                  | 用途                                          |
| -------------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------- |
| [MoviePilot](https://github.com/jxxghp/MoviePilot)       | [V3 部署与配置](/posts/2026-10-10-moviepilot-guide/)                  | 搜索、订阅、下载联动、整理和媒体库刷新        |
| [Cloud Media Sync](https://github.com/imaliang/cms-docs) | [115 同步与 Emby 302](/posts/2026-10-10-cloud-media-sync/)            | 同步云端目录、生成 STRM，并按配置提供播放入口 |
| [CookieCloud](https://github.com/easychen/CookieCloud)   | [浏览器与 MoviePilot 同步](/posts/2026-10-09-cookiecloud-moviepilot/) | 加密上传浏览器 Cookie，供受支持的应用读取     |

MoviePilot 当前部署入口是 [V3 镜像](https://hub.docker.com/r/jxxghp/moviepilot-v3)，原收藏的[旧版镜像](https://hub.docker.com/r/jxxghp/moviepilot)继续保留作对照。[Windows-MoviePilot](https://github.com/developer-wlj/Windows-MoviePilot/releases) 是第三方 Windows 服务管理面板，不是官方 V3 Docker 镜像的 Windows 版本。

CMS 上面的项目链接是文档仓库，另有 [CMSHelp 补充帮助](https://github.com/guyue2005/CMSHelp)。部署前看当前安装页的授权条件，不能只复制旧版 Compose。

完整交接关系放在 [DebNAS 自动观影流程](/posts/2026-10-09-debnas-media-workflow/)：本地文件、网盘原文件与 STRM 分别放在哪，谁负责命名、谁负责同步，都在那篇对应。

## 网盘挂载与文件管理

| 软件                                                     | 记录                                                                 | 用途                                                                   |
| -------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [CloudDrive2](https://www.clouddrive2.com/)              | [挂载、目录共享与缓存](/posts/2026-10-10-cloud-storage-local-mount/) | 把远端文件显示成 NAS 目录或 Windows 盘符                               |
| [AList](https://alistgo.com/)                            | [部署、WebDAV 与路径权限](/posts/2026-10-10-alist-guide/)            | 聚合多种存储，提供文件列表和 WebDAV                                    |
| [CloudSaver](https://github.com/jiangrui1994/CloudSaver) | 项目文档                                                             | 网盘资源搜索与转存；仓库说明公开源码停留在较早版本，新版以项目镜像为准 |

原收藏的 [CloudDrive2 第三方安装脚本](https://github.com/sublaim/clouddrive2) 也留在这里。它是社区安装方案，和官方核心服务、fnOS 套件、Docker 镜像分开核对。

WebDAV 和本地挂载是两层：支持 WebDAV 的播放器可以直接连 AList，只认文件路径的应用再接 CloudDrive2。挂载目录中出现文件名，并不代表本地有离线副本，写入结束也要检查远端上传是否完成。

## 照片、音乐和有声书

| 软件                                                                       | 记录或文档                                             | 用途                                         |
| -------------------------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------- |
| [MT Photos](https://mtmt.tech/)                                            | [部署与照片库设置](/posts/2026-10-10-mt-photos-guide/) | NAS 照片整理、浏览与客户端访问               |
| [Music Tag Web V2](https://xiers-organization.gitbook.io/music-tag-web-v2) | 项目文档                                               | 音乐标签、元数据刮削和播放，适合整理文件信息 |
| [Audiobookshelf](https://audiobookshelf.org/)                              | 项目文档                                               | 自建有声书与播客库                           |

这些库的配置和原始文件分开备份。照片整理、音乐标签写入会修改文件，自动任务先限制在测试目录。

## 直播、命名与刮削

- [IPTV：Allinone 与频道整理](/posts/2026-10-10-iptv-guide/)：记录 M3U、EPG、播放器与服务端的关系。Allinone 当前完整授权参数尚未确认，文章中保留了明确的部署前提。
- [影视资源命名](/posts/2026-10-10-media-resource-naming/)：读懂发布名，整理电影、剧集、字幕与多版本入库名称。
- [TMDB 代理](/posts/2026-10-10-vercel-tmdb-proxy/)：Vercel 部署、API 与图片检查，以及媒体软件的地址设置。
- [IPTVindex](https://iptvindex.com/)：播放器、直播源、节目单和资料的导航收藏。

## 播放器和下载配套

手机、电视与桌面的 Emby 客户端入口放在 [Emby 客户端设置](/posts/2026-10-10-emby-guide/#各平台客户端怎么选)。Jellyfin、Plex 则在各自教程中链接当前官方客户端目录，先确认电视端的遥控器、字幕和音轨切换是否合用。

下载交给 qBittorrent、Transmission 或其他适合的工具，具体记录见 [PT 常用软件记录](/posts/2026-10-09-pt-software/)。原收藏的 [VERTEX](https://hub.docker.com/r/lswl/vertex) 用于 PT 场景的追剧、下载与任务管理；[PTtool](https://github.com/appotry/PTtool) 提供硬链接整理脚本与资料。硬链接要求同一文件系统，不能用来把本地文件“零空间上传”到网盘。

## 教程来源

- [磕巴白菜](https://hi.keba.host/)：NAS、Emby、MoviePilot、网盘与 Compose 的部署参考，各子篇保留对应原文。
- [DebNAS 文档](https://kekylin.github.io/debnas-docs/)：kekylin 整理的 Debian HomeNAS 方案，作为系统基础和媒体服务的配套参考。
- [FrozenGEE/compose](https://github.com/FrozenGEE/compose)：Compose 示例与 NAS 配置资料，使用时核对镜像维护者、版本与目录。
