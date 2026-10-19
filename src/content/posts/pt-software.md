---
title: PT 工具清单
description: PT 常用工具的分工：下载器、订阅、辅种、整理与远程管理各对应一篇文章。
author: Ayulog
pubDatetime: "2026-10-09T22:55:00+08:00"
modDatetime: "2026-10-17T21:00:00+08:00"
draft: false
category: pt
tags:
  - 下载器
---

PT 日常使用围绕下载器展开：先由 [qBittorrent](/posts/qbittorrent-guide/) 或 [Transmission](/posts/transmission-guide/) 完成下载与做种，再按需接入 RSS 订阅、跨站辅种、硬链接整理以及远程盒子（Seedbox）管理。

## 部署与接入顺序

从零搭建或扩展 PT 环境时，建议按以下顺序逐步推进：

| 阶段              | 核心内容                                                   | 对应笔记                                                                                   |
| ----------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 1. 规划存储与权限 | 统一数据根目录 `/data`、容器 `UID`/`GID`、管理与 Peer 端口 | [下载目录与做种常识](/posts/nas-downloader/)                                               |
| 2. 部署主力下载器 | 核对站点客户端白名单，完成下载、本地校验与持续做种         | [qBittorrent](/posts/qbittorrent-guide/) · [Transmission](/posts/transmission-guide/)      |
| 3. 订阅与任务管理 | 按独立分类接入下载器，配置 RSS 筛选与刷流规则              | [Vertex](/posts/vertex-guide/)                                                             |
| 4. 跨站辅种与转种 | 挂载种子目录、配置路径转换，基于本地已有数据跨站辅种或转种 | [IYUUPlus](/posts/iyuuplus-docker-guide/)                                                  |
| 5. 整理入媒体库   | 通过硬链接在不改动原做种目录的前提下生成影视库结构         | [MoviePilot](/posts/moviepilot-guide/) · [NAS 自动观影流程](/posts/debnas-media-workflow/) |
| 6. 远端 Seedbox   | 核算月流量与站规，在远端服务器部署下载器、SSH 隧道与 RSS   | [PT Seedbox](/posts/pt-seedbox-guide/)                                                     |

## 下载器与前端界面

| 软件                                                                             | 用途与特点                                      | 配置笔记                                                                                                        |
| -------------------------------------------------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| [qBittorrent](https://www.qbittorrent.org/)                                      | 主力下载与做种，内置分类、标签与 RSS 管理       | [安装与设置](/posts/qbittorrent-guide/)                                                                         |
| [Transmission](https://transmissionbt.com/download)                              | 资源占用低，适合 NAS 或服务器大规模长期保种     | [安装与设置](/posts/transmission-guide/)                                                                        |
| [TrguiNG](https://github.com/openscopeproject/TrguiNG)                           | Transmission 第三方桌面端与 Web 管理界面        | [连接与替换 Web](/posts/transmission-guide/#选择-trguing-或内置-web)                                            |
| [TrguiNG 汉化增强分支](https://github.com/jayzcoder/TrguiNG)                     | 增加中文界面、分类分组与 Tracker 筛选，独立发布 | 同上，部署时从对应分支 Releases 下载编译包                                                                      |
| [Transmission Web Control](https://github.com/ronggang/transmission-web-control) | 早期常用的第三方 Web 界面（已于 2025 年归档）   | 归档留存：[Windows 安装说明](https://github.com/ronggang/transmission-web-control/wiki/Windows-Installation-CN) |

选择下载器版本时以目标 PT 站点的客户端白名单为准；日常通用直链与网盘文件下载则可另行搭配 [Aria2 与 AriaNg](/posts/aria2-guide/)。

## 订阅、辅种与文件整理

| 软件                                               | 用途与特点                                         | 配置笔记                                                                                                   |
| -------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| [Vertex](https://github.com/vertex-app/vertex)     | RSS 订阅、条件筛选与刷流任务管理                   | [下载器接入与 RSS](/posts/vertex-guide/)                                                                   |
| [IYUUPlus](https://github.com/ledccn/iyuuplus-dev) | 跨站自动辅种，以及 qBittorrent / Transmission 转种 | [Docker 部署与路径转换](/posts/iyuuplus-docker-guide/)                                                     |
| [MoviePilot](https://github.com/jxxghp/MoviePilot) | 影视资源订阅、TMDB 识别、硬链接重命名入库          | [MoviePilot 设置](/posts/moviepilot-guide/) · [CookieCloud 同步](/posts/cookiecloud-moviepilot/)           |
| [PTtool](https://github.com/appotry/PTtool)        | 轻量级文件复制或硬链接整理，保留原目录继续做种     | [项目说明](https://github.com/appotry/PTtool#readme)                                                       |
| [autobrr](https://autobrr.com/)                    | 监听站点 IRC / 公告与 RSS，按过滤规则实时推送种子  | [过滤规则文档](https://autobrr.com/filters/) · [Seedbox 接入思路](/posts/pt-seedbox-guide/#rss-与自动管理) |

各工具协作时的关键边界：

- **Vertex**：优先适配 qBittorrent（Transmission 接入后不支持刷流与自动删种），项目目前已处于仅修复问题的维护状态。镜像为 [lswl/vertex](https://hub.docker.com/r/lswl/vertex)，文档见[官方 Wiki](https://wiki.vertex-app.top/)。
- **IYUUPlus**：自动辅种直接通过下载器 API 工作；自动转种还需只读挂载来源下载器的种子目录（`BT_backup` 或 `torrents`），仅迁移种子任务而不搬运底层数据文件。相关入口：[Gitee 镜像仓库](https://gitee.com/ledc/iyuuplus-dev)、[官方文档](https://doc.iyuu.cn/)与 [IYUU 社区](https://www.iyuu.cn/)。
- **多工具共用下载器**：当 MoviePilot、Vertex、IYUUPlus 同时连接同一个下载器时，建议用分类或标签隔离各自管理的种子，并将“自动添加”与“自动删种”分开验证，防止多工具冲突或误删未满保种期的文件。

## 浏览器扩展与辅助脚本

- **[PT-Depiler](https://github.com/pt-plugins/PT-depiler)**（原 PT-Plugin-Plus 演进项目）：支持多站点聚合搜索、个人数据统计汇总，并可一键将种子推送到 qBittorrent、Transmission 等下载器。
- **[auto-feed](https://github.com/tomorrow505/auto_feed_js)**：浏览器用户脚本，用于跨站转载发种时自动提取与填充种子简介、查重及图床转存（使用前请确认目标站点的发种与转载规范）。

## 参考与社区入口

- [Transmission 配置文件参数中文详细解释](https://cloud.tencent.com/developer/article/1966381)：2022 年整理的 `settings.json` 中文参数说明（4.x 新版字段以官方文档为准）。
- [Transmission 官方论坛](https://forum.transmissionbt.com/viewtopic.php?t=18976)：客户端配置与排错讨论存档。
- [Hostloc](https://hostloc.com/misc.php?mod=mobile)：VPS 与独立服务器交流社区，选机时可配合核对机房线路与商家最新流量条款。
