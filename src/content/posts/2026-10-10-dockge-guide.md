---
title: Dockge：用网页管理 Compose 项目
description: Dockge 的 Compose 部署、Stack 目录约定、旧项目导入，以及更新和备份。
author: Ayulog
pubDatetime: "2026-10-10T10:00:00+08:00"
draft: false
setupCategory: nas
setupRole: guide
tags:
  - Debian
  - Docker
  - Docker Compose
  - Dockge
---

Dockge 可以在网页里编辑 `compose.yaml`、部署应用和查看日志。一个项目放一个目录，文件仍留在磁盘上，随时能回到终端用 Compose 命令维护。

返回 [NAS 常用软件记录](/posts/2026-10-09-nas-software-websites/)；工具怎么选、升级前要备份什么，见 [Docker 管理工具与维护笔记](/posts/2026-10-10-docker-management/)。

## 开始之前

需要 Linux Docker Engine 和 Compose V2。还没装好时，先看 [Docker 官方安装文档](https://docs.docker.com/engine/install/)。每个工具放在独立目录中，下面的命令都在它自己的 Compose 项目目录执行。

文中的 `NAS_IP` 换成设备地址。管理页面只放在可信局域网或私有组网内；挂载 `/var/run/docker.sock` 后，工具就能操作宿主机 Docker，追加 `:ro` 也不会把 Docker API 变成只读。

## 部署与首次打开

准备管理器目录和项目目录，在管理器目录创建 `compose.yaml`。以下与[配套下载](/examples/debnas/dockge/compose.yaml)采用相同的基础参数：

```yaml
services:
  dockge:
    image: louislam/dockge:1
    restart: unless-stopped
    ports:
      - "5001:5001"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./data:/app/data
      - /opt/stacks:/opt/stacks
    environment:
      DOCKGE_STACKS_DIR: /opt/stacks
```

按自己的设备创建目录后，在项目目录启动：

```bash
docker compose config --quiet
docker compose up -d
docker compose logs --tail=100 dockge
```

访问 `http://NAS_IP:5001`，完成账号初始化。端口冲突时可以改左侧宿主机端口，例如 `5002:5001`，浏览器同步改用 `5002`。

**Stack 目录挂载左右两侧必须是同一个绝对路径，并与 `DOCKGE_STACKS_DIR` 一致**。例如改成 `/volume1/docker/stacks`，三处一起调整：

```yaml
volumes:
  - /volume1/docker/stacks:/volume1/docker/stacks
environment:
  DOCKGE_STACKS_DIR: /volume1/docker/stacks
```

这是合并片段，原来的 socket 和 `/app/data` 挂载仍需保留。Dockge 最终让宿主机 Docker 创建应用，路径不一致容易让配置落到错误位置。

## 新建项目与接管旧项目

新应用可以在 Dockge 中新建 Stack，填写名称和完整 Compose，检查环境变量、端口及持久化目录后部署。启动后查看日志，再打开应用页面验证数据和功能。

[官方导入步骤][dockge-readme]是：停止原 Stack，把 Compose 放到 `/opt/stacks/项目名/compose.yaml`，再在 Dockge 菜单中执行 **Scan Stacks Folder**。迁移前还要处理两件事：

1. `./data` 等相对路径会随着 Compose 文件位置变化。一起迁移对应数据，或改用确认过的绝对路径，不能只移动 YAML。
2. Compose 项目名变化可能改变自动生成的卷名和网络名。先核对原来的项目名、实际卷名及网络，避免连到新建的空卷。

原服务的目录和挂载复杂时，先保留现有维护方式，在测试应用上熟悉导入。扫描到项目后，也要核对实际数据和容器，不能只凭列表里出现名称就认为迁移完成。

## 更新与备份

更新应用时，先阅读应用升级说明；需要切换固定版本时，在对应 Compose 中改镜像标签，再用 Dockge 执行更新、部署并检查日志。管理器自身则从它原来的项目目录维护：

```bash
docker compose pull dockge
docker compose up -d dockge
```

备份 Dockge 的 `data/`、Stack 目录中的 Compose 与环境文件，以及各个应用实际使用的数据。Stack 文件夹不一定包含所有数据，使用外部绝对路径或命名卷的服务要单独覆盖。

## 参考资料

- [Dockge 官方 README][dockge-readme]
- [官方 Compose 配置][dockge-compose]
- [Docker 绑定挂载][docker-bind]

[dockge-readme]: https://github.com/louislam/dockge
[dockge-compose]: https://github.com/louislam/dockge/blob/master/compose.yaml
[docker-bind]: https://docs.docker.com/engine/storage/bind-mounts/
