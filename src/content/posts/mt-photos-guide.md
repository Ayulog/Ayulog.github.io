---
title: MT Photos：Docker 安装与照片目录
description: MT Photos 的基础 Compose 部署，区分配置、上传原件和已有图库，记录端口、缓存和备份位置。
author: Ayulog
pubDatetime: "2026-10-10T10:00:00+08:00"
draft: false
category: nas
tags:
  - NAS
  - Docker
  - MT Photos
  - 照片管理
---

MT Photos 用来管理照片。先把原件、上传目录和应用数据分清楚，后面扫描图库、迁移磁盘和备份都方便些。

这篇从 [DebNAS 安装笔记](/posts/debnas-installation-notes/)中拆出，保留原来的基础配置。需要先装好 Linux Docker Engine 和 Compose V2，步骤见 [Docker 官方安装文档](https://docs.docker.com/engine/install/)。本例面向 amd64，其他架构按 [MT Photos 官方安装说明](https://mtmt.tech/docs/start/install/)选择镜像。

其他媒体服务见 [NAS 服务清单](/posts/nas-software-websites/)。

## 准备目录

单独建一个 MT Photos 项目目录，里面保存 `compose.yaml`、`config/` 和 `upload/`。已有照片留在原位置，通过挂载交给 MT Photos。

| 宿主机位置        | 容器内位置 | 保存内容                       |
| ----------------- | ---------- | ------------------------------ |
| `./config`        | `/config`  | 应用配置、数据库与默认缓存     |
| `./upload`        | `/upload`  | 上传的照片原件                 |
| `/path/to/photos` | `/photos`  | 已有图库，使用前替换成真实目录 |

相对路径以 Compose 项目目录为准。`/photos` 是这里给已有图库取的容器路径，不是系统要求的固定目录。已有实例迁移时，要先确认旧数据和挂载位置，避免接到新建的空目录。

## Compose 部署

保存下面的配置，也可以[直接下载](/examples/debnas/mtphotos/compose.yaml)：

```yaml
# Generic example based on the upstream MT Photos installation guide.
services:
  mtphotos:
    image: mtphotos/mt-photos:latest
    restart: unless-stopped
    ports:
      - 8063:8063
    volumes:
      - ./config:/config
      - ./upload:/upload
      - /path/to/photos:/photos
    environment:
      TZ: Asia/Shanghai
```

把 `/path/to/photos` 改成照片原件所在目录，再确认应用能读写需要的目录。在项目目录中检查并启动：

```bash
docker compose config --quiet
docker compose up -d
docker compose logs --tail=100 mtphotos
```

浏览器打开 `http://NAS_IP:8063`，将 `NAS_IP` 换成设备地址，按页面提示初始化。已有图库在容器里对应 `/photos`，添加图库时使用这个路径。`8063` 被占用时，只改 Compose 左侧的宿主机端口，浏览器也跟着改。

## 缓存与备份

默认缩略图和缓存位于 `./config` 下。想把缓存放到另一块磁盘时，再按官方文档单独映射 `/config/cache`。基础配置没有附带 AI 服务，也没有设置自动更新。

备份要覆盖 `compose.yaml`、`config/`、`upload/` 和实际挂载的图库原件。只备份数据库或缩略图，不能恢复照片；只保存原件，也没有保留应用的整理状态。复制数据库前按应用要求停止写入，升级前保留配置与数据备份。

`latest` 是可变标签，拉取镜像前先看上游版本说明。更新后检查图库是否正常、照片能否打开，再处理旧镜像。

## 参考资料

- [MT Photos 官方安装说明](https://mtmt.tech/docs/start/install/)
