---
title: PT 工具清单
description: PT 常用工具的分工：下载器、订阅、辅种、整理与远程管理各对应一篇文章。
author: Ayulog
pubDatetime: "2026-10-09T22:55:00+08:00"
modDatetime: "2026-10-11T00:00:00+08:00"
draft: false
category: pt
tags:
  - PT
  - 软件清单
  - 下载器
  - 做种
---

PT 的日常操作都落在下载器上：qBittorrent 或 Transmission 保存任务和文件，订阅、辅种、整理和远程管理由另外几个工具接过去。

## 从规划存储到远端盒子的顺序

| 阶段               | 先完成什么                                                 | 对应文章                                                                              |
| ------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 规划存储           | 确定下载目录、容器路径和权限，区分管理端口与 Peer 端口     | [下载目录与做种常识](/posts/nas-downloader/)                                          |
| 建立下载与做种环境 | 核对站点允许的客户端版本，完成一次下载、校验与做种         | [qBittorrent](/posts/qbittorrent-guide/) · [Transmission](/posts/transmission-guide/) |
| 订阅与任务管理     | 接入已可用的下载器，按分类与规则逐步启用 RSS               | [Vertex](/posts/vertex-guide/)                                                        |
| 辅种与转移任务     | 核对文件和目录映射，先校验已有数据，再处理辅种或转移       | [IYUUPlus](/posts/iyuuplus-docker-guide/)                                             |
| 使用远端 Seedbox   | 核对服务器与成本，安装下载器，安排远程管理、备份和退租迁移 | [PT Seedbox](/posts/pt-seedbox-guide/)                                                |

整理进媒体库的步骤见 [NAS 自动观影流程](/posts/debnas-media-workflow/)。下载、做种和入库是相连的步骤，各自保留原始任务与数据位置，不靠修改原做种目录来满足媒体库命名。

<span id="先看各自负责什么"></span>
<span id="下载器qbittorrent-与-transmission"></span>

## 下载器与远程管理

| 软件                                                                             | 用途                                               | 设置笔记                                                                                                                     |
| -------------------------------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| [qBittorrent](https://www.qbittorrent.org/)                                      | 下载、做种、分类和 RSS                             | [安装与设置](/posts/qbittorrent-guide/)                                                                                      |
| [Transmission](https://transmissionbt.com/download)                              | 桌面或后台下载，长期做种                           | [安装与设置](/posts/transmission-guide/)                                                                                     |
| [TrguiNG](https://github.com/openscopeproject/TrguiNG)                           | Transmission 的桌面和网页管理界面                  | [连接与替换 Web](/posts/transmission-guide/#选择-trguing-或内置-web)                                                         |
| [TrguiNG 汉化增强分支](https://github.com/jayzcoder/TrguiNG)                     | 汉化、分组展示、Tracker 筛选等，发布节奏与上游不同 | 同上，安装时分别核对发布页                                                                                                   |
| [Transmission Web Control](https://github.com/ronggang/transmission-web-control) | 旧版第三方 Web 管理界面                            | 已归档、不再维护；保留 [Windows 安装说明](https://github.com/ronggang/transmission-web-control/wiki/Windows-Installation-CN) |

下载器版本先看站点白名单，再看管理工具是否兼容。TrguiNG 只控制后端，不负责保存文件；NAS 上的任务应填写 NAS 后端看到的路径。

通用直链和网盘下载放在 NAS 分类，部署与网页管理合在 [Aria2 与 AriaNg](/posts/aria2-guide/)一篇里。

<span id="pttool保留做种目录整理媒体文件"></span>
<span id="vertex集中管理订阅和下载任务"></span>
<span id="iyuuplus给已有资源辅种与转移任务"></span>

## 订阅、辅种和文件整理

| 软件                                               | 用途                                       | 使用笔记                                                                                                          |
| -------------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| [Vertex](https://github.com/vertex-app/vertex)     | RSS、筛选和下载任务管理                    | [下载器接入与 RSS](/posts/vertex-guide/)                                                                          |
| [IYUUPlus](https://github.com/ledccn/iyuuplus-dev) | 跨站匹配、自动辅种、下载器之间转移种子任务 | [Docker 与路径转换](/posts/iyuuplus-docker-guide/)                                                                |
| [PTtool](https://github.com/appotry/PTtool)        | 按大小复制文件或建立硬链接，保留原目录做种 | [项目说明](https://github.com/appotry/PTtool#readme)                                                              |
| [MoviePilot](https://github.com/jxxghp/MoviePilot) | 订阅、媒体识别和整理入库                   | [MoviePilot 设置](/posts/moviepilot-guide/)                                                                       |
| [autobrr](https://autobrr.com/)                    | 根据支持站点的公告匹配资源并推送下载器     | [过滤规则](https://autobrr.com/filters/)；[Seedbox 笔记](/posts/pt-seedbox-guide/#rss-与自动管理)中记录了接入思路 |

Vertex 优先适配 qBittorrent，Transmission 接入不支持它的刷流与自动删种功能。项目已处于不新增功能、仅修复问题的状态，按现有功能选用。镜像入口为 [lswl/vertex](https://hub.docker.com/r/lswl/vertex)，配置看[官方 Wiki](https://wiki.vertex-app.top/)。

IYUUPlus 普通辅种通过下载器 API 工作；自动转移还需要读取来源下载器的种子文件。它转移任务，不搬运下载数据。另存 [开发版 Gitee 仓库](https://gitee.com/ledc/iyuuplus-dev)、[官方文档](https://doc.iyuu.cn/)与 [IYUU 社区](https://www.iyuu.cn/)。

PTtool 的硬链接也不会添加种子任务。媒体库里多出的文件入口不改变这一点，文件内容和保存层级仍要交给下载器校验。

## 浏览器配套

- [PT-Depiler](https://github.com/pt-plugins/PT-depiler)：多站搜索、站点信息汇总，可向 Transmission、qBittorrent 等下载器推送种子。
- [auto-feed](https://github.com/tomorrow505/auto_feed_js)：辅助 PT 站点间转载时填写发布信息，提供查重、图片转存和部分下载器推送功能。

这类扩展和用户脚本会接触站点登录状态，安装前查看项目来源和支持站点。是否允许转载、怎样填写来源，按对应站点的规则执行。

<span id="目录与容器路径怎么规划"></span>
<span id="按需求搭配逐步开启自动化"></span>

## 设置与常识

- [下载目录与做种常识](/posts/nas-downloader/)：挂载、UID / GID、管理与 Peer 端口、硬链接、MoviePilot 联动和迁移备份。
- [PT Seedbox：选机、安装与做种](/posts/pt-seedbox-guide/)：服务器成本、Dedicated-Seedbox 安装 qBittorrent、SSH 隧道、RSS 和退租迁移。
- [媒体服务与自动化观影流程](/posts/debnas-media-workflow/)：本地或网盘媒体入库之后的播放流程。

同一个下载器接多个工具时，用分类或规则分清各自管理的任务。自动添加和自动删除分开启用，先保留一次完整下载、校验和做种记录。配置、Cookie、Passkey、RSS 地址和 Token 都放在私有文件里。

<span id="项目入口与参考资料"></span>

## 留存的参考资料

- [Transmission 配置文件参数中文详细解释](https://cloud.tencent.com/developer/article/1966381)：2022 年的中文参数资料，默认值与字段需对照当前版本。
- [Transmission 论坛讨论](https://forum.transmissionbt.com/viewtopic.php?t=18976)：收藏入口，正文尚未核实，不据此给出配置结论。
- [Hostloc](https://hostloc.com/misc.php?mod=mobile)：社区入口，选机时同时核对具体产品、测试时间和商家条款。
