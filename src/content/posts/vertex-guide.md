---
title: Vertex：下载器接入与 RSS 管理笔记
description: Vertex 接入下载器、配置 RSS 与自动删除的顺序，以及项目的维护状态。
author: Ayulog
pubDatetime: "2026-10-10T14:15:00+08:00"
draft: false
category: pt
tags:
  - Docker
---

Vertex 用于集中连接 BT/PT 下载器，按 RSS 订阅与筛选规则自动添加种子，并根据预设条件管理刷流或删种任务。在完整工作流中，Vertex 负责种子筛选与任务生命周期管理，文件落盘后的硬链接整理与刮削入库则可交给 [MoviePilot](/posts/moviepilot-guide/) 或 PTtool（Vertex 官方也提供基于软链接的[追剧配置流程](https://wiki.vertex-app.top/pei-zhi-liu-cheng/zhui-ju-pei-zhi-liu-cheng)，使用时需与现有硬链接整理工具明确分工，避免重复操作同一批文件）。

项目官方仓库与镜像说明已注明 **Vertex 目前处于仅修复问题、不再新增功能的状态**，选型与配置以现有功能范围为准。

## Docker 部署与下载器接入

### 部署与目录持久化

参照[官方安装说明](https://wiki.vertex-app.top/xin-shou-ru-men/an-zhuang-cao-zuo)，使用 `lswl/vertex:stable` 镜像部署，将容器内的 `/vertex` 目录映射到宿主机持久化保存配置与规则，默认 Web 端口为 `3000`。从容器内 `/vertex/data/password`（或首次启动日志）获取初始密码后，即可通过浏览器登录后台。

日常升级前先停止容器并备份 `/vertex` 挂载目录，拉取新镜像重建后再恢复自动化任务。

### 下载器兼容性与连接

根据[官方下载器文档](https://wiki.vertex-app.top/zhu-yao-mo-kuai/xia-zai-qi)，Vertex 优先适配 [qBittorrent](/posts/qbittorrent-guide/)；[Transmission](/posts/transmission-guide/) 虽然可以接入查看与推送任务，但不支持 Vertex 的刷流与自动删种功能。

添加下载器时，填写 Vertex 容器能够访问的下载器 WebUI / RPC 地址（如 `http://NAS_IP:8080`）与账号密码；若与下载器共用同一个自定义 Docker 网络，也可填写容器服务名与内部端口。保存后先确认能正常读取下载器的状态与任务列表，再配置后续规则。

## 配置 RSS 订阅与删种规则

### 按分类隔离自动化范围

当 Vertex 与 MoviePilot、IYUUPlus 等多个工具共用同一个下载器时，建议通过下载器**分类（Category）**或标签划清各自管理的任务范围，避免多个工具同时移动或清理同一批种子。初次配置 RSS 规则时，可按以下顺序验证：

1. **建立专用分类**：在下载器中新建独立分类（如 `vertex-rss`）并指定对应的保存路径，不直接接管下载器内的全部存量任务。
2. **设置筛选条件**：添加一条有效的站点 RSS 链接，配置体积范围、关键词或正则等过滤规则。
3. **验证命中与落盘**：先查看规则命中记录，确认推送到下载器后的分类和保存路径准确无误，再保持自动添加开启。

### 谨慎启用自动删种

自动添加任务跑通、种子正常完成下载与做种后，再单独配置自动删种规则：

- **核对站点保种要求**：删种条件需优先满足 PT 站点的最短做种时间、分享率或 H&R 考核要求，不能仅凭客户端本地分享率或磁盘剩余空间阈值直接删种；磁盘空间紧张时应优先暂停新增 RSS 任务。
- **区分删任务与删文件**：开启删种前确认操作类型是“仅移除下载器任务”还是“同时删除本地数据”。若文件已通过 IYUUPlus 跨站辅种，或仅通过软链接提供给媒体库，删除底层数据文件会直接影响其他辅种任务或媒体播放。

## 参考资料

- [Vertex 项目仓库](https://github.com/vertex-app/vertex)、[Docker Hub 镜像 `lswl/vertex`](https://hub.docker.com/r/lswl/vertex)与[官方 Wiki](https://wiki.vertex-app.top/)。
- [安装操作说明](https://wiki.vertex-app.top/xin-shou-ru-men/an-zhuang-cao-zuo)与[下载器设置](https://wiki.vertex-app.top/zhu-yao-mo-kuai/xia-zai-qi)。
- [追剧配置流程](https://wiki.vertex-app.top/pei-zhi-liu-cheng/zhui-ju-pei-zhi-liu-cheng)。
