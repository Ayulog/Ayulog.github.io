---
title: MT Photos：Docker 安装与照片目录
description: 用 Compose 部署 MT Photos，分清配置、上传原件与已有图库的挂载位置。
author: Ayulog
pubDatetime: "2026-10-10T10:00:00+08:00"
draft: false
category: nas
tags:
  - Docker
---

在 NAS 上用 MT Photos 管理家庭照片时，提前将“应用配置数据库、手机端上传目录、NAS 已有图库目录”分开挂载，后续无论扩容硬盘、迁移容器还是执行定期备份都会清晰很多。

底层磁盘挂载与系统准备见 [DebNAS 安装笔记](/posts/debnas-installation-notes/)，其他照片与媒体工具见 [NAS 服务清单](/posts/nas-software-websites/)。

## 目录规划与挂载映射

确保宿主机已安装 [Docker Engine](https://docs.docker.com/engine/install/) 与 Compose V2。为 MT Photos 创建一个独立的项目目录，用于存放 `compose.yaml`、配置文件夹 `./config` 与默认上传目录 `./upload`，同时将硬盘上已有的照片目录挂载进容器：

| 宿主机路径        | 容器内路径      | 用途说明                                             |
| ----------------- | --------------- | ---------------------------------------------------- |
| `./config`        | `/config`       | 保存 MT Photos 数据库、账号设置及默认缩略图缓存      |
| `./upload`        | `/upload`       | 手机 App 备份上传的照片与视频默认保存位置            |
| `/path/to/photos` | `/photos`       | NAS 上已有的存量照片目录（部署前替换为实际绝对路径） |
| `/path/to/cache`  | `/config/cache` | （可选）将缩略图缓存单独挂载至 SSD 以加快浏览加载    |

## Compose 部署与初始化

在项目目录保存以下 `compose.yaml`（可直接[下载配套 Compose](/examples/debnas/mtphotos/compose.yaml)，本例默认使用 `x86_64` / `amd64` 镜像，ARM 设备请按 [MT Photos 官方安装说明](https://mtmt.tech/docs/start/install/) 选用对应架构标签）：

```yaml
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

将 `/path/to/photos` 替换为实际照片目录后，启动服务并查看日志：

```bash
docker compose up -d
docker compose logs --tail=100 mtphotos
```

启动后浏览器访问 `http://NAS_IP:8063`（将 `NAS_IP` 替换为设备局域网地址），按向导创建管理员账号。进入后台添加图库时，选择容器内的 `/photos`（以及 `/upload`）即可开始扫描索引。若宿主机 `8063` 端口已被占用，可修改 `ports` 左侧的宿主机端口（如 `8064:8063`）。

## 缓存分离、备份与升级

- **缩略图缓存分离**：缩略图默认生成在 `./config/cache` 下。若存量照片较多且 `./config` 位于机械硬盘上，可在 `volumes` 中额外增加一行 `/path/to/ssd/cache:/config/cache`，将缩略图放到 SSD 上提升时间线滑动体验。
- **完整备份范围**：日常备份需同时涵盖 `./config`（包含相册分类、人物识别结果与系统数据库）以及 `./upload` 和 `/path/to/photos` 中的照片原件。备份 `./config` 下的数据库前建议先短暂停止 `mtphotos` 容器，确保数据一致性。
- **版本升级**：升级前查看上游更新说明并完成备份，随后在项目目录拉取最新镜像并重建容器：

```bash
docker compose pull mtphotos
docker compose up -d mtphotos
```

## 参考资料

- [MT Photos 官方安装说明](https://mtmt.tech/docs/start/install/)
