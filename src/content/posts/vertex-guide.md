---
title: Vertex：下载器接入与 RSS 管理笔记
description: 记录 Vertex 的下载器适配、RSS 接入、任务分类、自动删除与维护状态，保留官方部署入口。
author: Ayulog
pubDatetime: "2026-10-10T14:15:00+08:00"
draft: false
category: pt
tags:
  - Vertex
  - PT
  - RSS
  - Docker
---

入口：[Docker Hub 镜像 `lswl/vertex`](https://hub.docker.com/r/lswl/vertex)、[项目仓库](https://github.com/vertex-app/vertex)、[官方 Wiki](https://wiki.vertex-app.top/)。

Vertex 面向 PT 场景提供订阅和任务管理。它可以连接下载器，结合 RSS、筛选规则和任务管理功能，把“看到资源、判断是否需要、添加下载、管理后续任务”串起来。

Vertex 管理任务；PTtool 整理落盘文件。媒体识别、刮削和播放还需要各自的工具。

Vertex 官方也提供[追剧配置流程](https://wiki.vertex-app.top/pei-zhi-liu-cheng/zhui-ju-pei-zhi-liu-cheng)，包含选种、下载后建立软链接和媒体服务扫描。这里的软链接依赖原目标路径，与 PTtool 的硬链接机制不同；启用时先确认与现有整理工具的分工。

## 接入时先控制自动化范围

建议先连接一个下载器，用一个 RSS 订阅和简单规则，确认任务能进入预期分类、保存到正确目录，再逐步增加条件。

自动添加和自动删除应分开配置。尤其开启删种规则前，要弄清楚它操作的是任务还是连同数据一起删除，以及是否会影响其他任务或媒体库。站点的最短做种时间、H&R 等要求，也需要纳入自己的保留策略。

如果 Vertex 与其他工具共同连接同一个下载器，可以用分类、标签或规则划定各自管理的任务。避免多个工具同时决定同一批任务的移动、删除和整理。

## 当前维护状态

截至本文核对时，官方 README 和镜像说明均写明：**Vertex 已处于不新增功能、仅做问题修复的状态。** 这不等于完全停止更新，但选型时应以现有功能为依据，不把未来新增适配作为前提。

官方[安装说明](https://wiki.vertex-app.top/xin-shou-ru-men/an-zhuang-cao-zuo)使用 `lswl/vertex:stable`，持久化容器目录 `/vertex`，默认 HTTP 端口为 `3000`。实际部署前再核对标签与架构；通知渠道和站点适配同样需要看当前文档，旧教程里的功能未必仍按原方式维护。

## 下载器适配

[官方文档](https://wiki.vertex-app.top/zhu-yao-mo-kuai/xia-zai-qi)优先适配 qBittorrent。Transmission 可以接入，但不支持 Vertex 所说的刷流与自动删种，不能把两者当作功能完全一致。站点是否允许当前客户端版本还要另外核对。

添加下载器时填写 Vertex 所在环境能够访问的 API 地址和凭据。Docker 中的 `localhost` 是 Vertex 自己；使用 NAS IP 和已发布端口，或在同一自定义网络中使用服务名和容器端口。连通后核对任务列表，再配置 RSS。

## 一条 RSS 规则的检查顺序

1. 先连接一个下载器，建立独立分类，不接管现有全部任务。
2. 添加一个有效 RSS 订阅，设置资源类型、体积和关键词等当前版本支持的筛选条件。
3. 检查命中结果、任务分类和保存路径，再允许自动添加。
4. 等任务下载并满足站点做种要求后，才单独评估自动删除规则。

自动删除需确认操作的是任务还是连同数据。跨站辅种共用文件、媒体库的链接关系，以及站点 H&R 都不能由一个分享率数字代替。磁盘不足时先限制新增，不把空间阈值作为忽略保种要求的理由。

## 安装与维护入口

部署按[官方安装说明](https://wiki.vertex-app.top/xin-shou-ru-men/an-zhuang-cao-zuo)执行，使用该版本的完整参数；这篇保留接入笔记，不另造一套安装命令。更新前备份 `/vertex` 对应目录和规则，确认版本变更后再恢复自动任务。

## 参考资料

- [Vertex 仓库](https://github.com/vertex-app/vertex)、[镜像](https://hub.docker.com/r/lswl/vertex)与[官方 Wiki](https://wiki.vertex-app.top/)。
- [下载器设置](https://wiki.vertex-app.top/zhu-yao-mo-kuai/xia-zai-qi)。
- [追剧配置流程](https://wiki.vertex-app.top/pei-zhi-liu-cheng/zhui-ju-pei-zhi-liu-cheng)。
