---
title: Portainer CE：安装与日常管理
description: 用 Compose 安装 Portainer CE，记录 HTTPS 入口、首次初始化、Stack 管理和数据备份。
author: Ayulog
pubDatetime: "2026-10-10T10:00:00+08:00"
draft: false
setupCategory: nas
setupRole: guide
tags:
  - Debian
  - Docker
  - Portainer
---

Portainer CE 更适合集中查看容器、镜像、网络、卷和 Stack。本文连接本机 Linux Docker Engine，沿用[官方安装文档][portainer-install]的 `lts` 镜像和 HTTPS `9443` 端口。

返回 [NAS 总篇](/posts/2026-10-09-nas-software-websites/)；工具怎么选、升级前要备份什么，见 [Docker 管理工具与维护笔记](/posts/2026-10-10-docker-management/)。

## 开始之前

需要 Linux Docker Engine 和 Compose V2。还没装好时，先看 [Docker 官方安装文档](https://docs.docker.com/engine/install/)。每个工具放在独立目录中，下面的命令都在它自己的 Compose 项目目录执行。

文中的 `NAS_IP` 换成设备地址。管理页面只放在可信局域网或私有组网内；挂载 `/var/run/docker.sock` 后，工具就能操作宿主机 Docker，追加 `:ro` 也不会把 Docker API 变成只读。

## 部署与持久化

在独立项目中保存以下配置，也可以[下载 Portainer Compose](/examples/debnas/portainer/compose.yaml)：

```yaml
services:
  portainer:
    image: portainer/portainer-ce:lts
    restart: always
    ports:
      - "9443:9443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data

volumes:
  portainer_data:
```

`8000` 用于 Edge Agents 的相关通信，本机基础管理不需要开放；旧版 HTTP `9000` 也没有放进示例。`/data` 用来保存 Portainer 自己的数据库，不能省略持久化。

```bash
docker compose config --quiet
docker compose up -d
docker compose logs --tail=100 portainer
```

访问 `https://NAS_IP:9443`。默认使用自签名证书，浏览器可能提示证书不受信任；先核对地址确实是自己的 NAS，再按需要配置可信证书。不要因为提示就把地址改成 HTTP。

## 首次初始化与日常管理

当前官方文档说明，新版本的全新实例需要 **setup token** 完成初始设置。按页面提示，从容器日志中找到 `setup_token=`，填入初始化表单，创建管理员账号；已初始化实例不受这一流程影响。具体适用版本和说明见 [setup token 文档][portainer-token]。

进入后先确认连接的是预期的本地环境，再查看容器列表、日志、挂载、网络和卷。新应用可以通过 Stack 部署，但原来由 NAS 或其他 Compose 项目创建的应用，仍应保留原文件与维护入口。

看到一个容器，不代表它已经成为 Portainer 维护的 Stack。尤其是多服务应用，不要为了“接管”而把每个容器拆开重新创建；数据库、网络和环境变量应按原项目一起核对。

## 更新与备份

按照[官方升级说明][portainer-upgrade]，先备份 Portainer 配置，再更新服务器容器。使用本文 Compose 部署时，在原项目目录执行：

```bash
docker compose pull portainer
docker compose up -d portainer
docker compose logs --tail=100 portainer
```

保留原 `portainer_data` 卷，项目名也不要无意改变；否则 Compose 可能创建另一只卷，让页面看起来像全新安装。已有 Agent 的环境，还要按官方要求让 Agent 与 Server 版本匹配。

Portainer 自己的配置备份与应用数据备份分别保存。它的数据库可能随版本升级，回退时也要核对对应版本与升级前备份，不能只拉回旧镜像。

## 参考资料

- [Portainer CE 安装文档][portainer-install]
- [首次设置 token][portainer-token]
- [Docker 环境升级][portainer-upgrade]

[portainer-install]: https://docs.portainer.io/start/install-ce/server/docker/linux
[portainer-token]: https://docs.portainer.io/faqs/installing/setup-token
[portainer-upgrade]: https://docs.portainer.io/start/upgrade/docker
