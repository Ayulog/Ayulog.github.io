---
title: IYUUPlus：自动辅种与下载器转种
description: 在绿联 NAS 的 Docker 中部署 IYUUPlus，接入下载器并配置辅种与转种。
author: Ayulog
pubDatetime: "2026-10-10T13:55:00+08:00"
draft: false
category: pt
tags:
  - Docker
---

IYUUPlus 用于 PT 跨站自动辅种与下载器之间的任务转移：它读取下载器内已有任务的 `info_hash` 查询跨站匹配，命中后将新种子推送给下载器校验并做种；同时也支持将种子任务在 [qBittorrent](/posts/qbittorrent-guide/) 与 [Transmission](/posts/transmission-guide/) 之间批量转移（例如用 qBittorrent 下载完成后转入 Transmission 长期保种）。

本文使用官方 `iyuucn/iyuuplus-dev:latest` 镜像（统一入口端口 `8780`）在 NAS Docker 环境中部署，界面操作可配合参考磕巴白菜的[绿联 IYUU 教程](https://hi.keba.host/archives/ugreen-iyuu)。

<span id="iyuuplus-解决什么问题"></span>

## 辅种与转种原理及目录准备

### 辅种与转种的区别

- **自动辅种**：IYUUPlus 通过下载器 API 读取现有任务特征，向 IYUU 服务查询其他支持站点的同源种子，再将匹配的种子链接提交给下载器。下载器对本地已有数据执行校验，达到 `100%` 后直接开始做种。仅使用自动辅种时，全流程均通过 API 完成，无需将影视数据盘挂载给 IYUUPlus 容器。
- **自动转种**：将来源下载器中的种子任务批量添加到目标下载器，**仅转移种子任务本身，不搬运底层数据文件**。因此自动转种需同时满足两项条件：
  1. 将来源下载器存放 `.torrent` 种子文件的目录（qBittorrent 的 `BT_backup` 目录，或 Transmission 的 `torrents` 目录）只读挂载到 IYUUPlus 容器内。
  2. 目标下载器能够通过自身的容器路径访问同一份已下载的数据文件（共享目录规划见[下载目录与做种常识](/posts/nas-downloader/)）。

### 宿主机目录结构准备

部署前先为 IYUUPlus 新建两个独立的持久化目录（`iyuu` 存放应用源码，`data` 存放 MySQL 数据库），并在已有下载器的配置目录中确认 `BT_backup` 或 `torrents` 的真实宿主机路径（该目录内应能看到以哈希值命名的 `.torrent` 文件）：

```text
/volume1/docker/AppData/iyuuplus/
├── compose.yaml
├── iyuu/         # IYUUPlus 源码与配置文件
└── data/         # MySQL 数据库目录

/volume1/docker/AppData/qb/qBittorrent/BT_backup/
/volume1/docker/AppData/transmission/torrents/
```

## Docker Compose 部署

在 NAS 的 Docker Compose 项目管理中新建项目，保存以下 `compose.yaml`（请将冒号左侧的 `/volume1/...` 替换为 NAS 上的真实宿主机路径；若仅做自动辅种而不做转种，可删去 `/qb` 和 `/tr` 两行挂载）：

```yaml
services:
  iyuuplus:
    image: iyuucn/iyuuplus-dev:latest
    container_name: iyuuplus
    restart: always
    stdin_open: true
    tty: true
    ports:
      - "8780:8780"
    volumes:
      - /volume1/docker/AppData/iyuuplus/iyuu:/iyuu
      - /volume1/docker/AppData/iyuuplus/data:/data
      - /volume1/docker/AppData/qb/qBittorrent/BT_backup:/qb:ro
      - /volume1/docker/AppData/transmission/torrents:/tr:ro
```

四个挂载路径的用途对应如下：

| 容器内路径 | 用途说明                                              |
| ---------- | ----------------------------------------------------- |
| `/iyuu`    | 持久化 IYUUPlus 源码及运行文件（与 `/data` 分开挂载） |
| `/data`    | 持久化容器内置 MySQL 数据库                           |
| `/qb`      | 只读挂载 qBittorrent 的 `BT_backup` 种子文件夹        |
| `/tr`      | 只读挂载 Transmission 的 `torrents` 种子文件夹        |

当前镜像已内置 Nginx，将 WebUI（内部 `8787`）与实时终端 WebSocket（内部 `3131`）统一汇总到容器的 `8780` 端口；若宿主机 `8780` 已被占用，只需修改端口映射左侧（如 `"18780:8780"`）。

在项目目录启动容器并查看初始化日志：

```bash
docker compose config
docker compose up -d
docker compose logs --tail=100 iyuuplus
```

首次启动时容器会自动拉取最新源码并初始化 MySQL 数据库，待日志提示服务就绪后再访问网页端。

## WebUI 核心设置

### 初始化、添加下载器与绑定站点

在局域网浏览器打开 `http://NAS_IP:8780`，按[官方安装向导](https://doc.iyuu.cn/guide/getting-started)填入爱语飞飞 Token 并设置管理员账号密码。进入后台后依次配置下载器与站点：

1. **添加下载器**：填写 qBittorrent 和 Transmission 的访问地址与账号密码。使用默认 bridge 网络时，“协议主机”填写 `http://NAS_IP:端口`（不带末尾斜杠），“接入点”按界面提示填写 `/`（qBittorrent）或 `/transmission/rpc`（Transmission）。
2. **配置转种种子目录**：需要从 qBittorrent 转出任务时，在其“种子文件夹”栏填写容器内路径 `/qb`；从 Transmission 转出则填 `/tr`。注意：若使用 qBittorrent 4.5.0 及以上版本作为转出来源，需确认 qBittorrent 高级设置中的“恢复数据存储类型”为默认的**快速恢复文件（Fastresume files）**，而非 SQLite 数据库。
3. **绑定合作站点与启用普通站点**：按[官方站点说明](https://doc.iyuu.cn/guide/site)先完成合作站点绑定（填入对应站点的 Passkey 与 UID）以解锁完整功能；随后在“管理中心 → 站点”中同步站点列表，为自己持有的其他站点填入 Passkey、UID 或 Cookie 并启用。

### 配置自动辅种

在“计划任务”中新建 **自动辅种** 任务：

1. 勾选需要扫描的下载器以及本次参与匹配的**辅种站点**（后续在站点管理中新启用的站点，也需回到计划任务中补充勾选）。
2. 勾选任务设置中的 **自动校验**（新版 qBittorrent 依赖该选项触发本地数据校验），并按需在下载器设置中开启“校验后做种”。
3. 先手动运行一次辅种任务，只选少量文件结构明确的任务测试，在日志中按“读取任务 → 匹配成功 → 推送种子 → 本地校验 → 进入做种”核对结果。
4. 验证无误后设置每日错峰定时执行。达到单日辅种上限的任务会标记为“待辅种”，由次日定时任务继续处理。

### 配置自动转种与路径转换

在“计划任务”中新建 **自动转移** 任务，选定来源下载器与目标下载器。首次验证时**切勿勾选“删除源做种”和“跳校验”**，保留原下载器中的任务以便核对。

路径转换针对的是下载器内部的**数据保存路径**（而非 `/qb`、`/tr` 种子目录），不同挂载方式下的规则写法如下（参照[官方计划任务说明](https://doc.iyuu.cn/guide/cron)，每行一条规则）：

- **路径完全相同（相等）**：若两个下载器容器内的数据挂载路径一致（例如都挂载为 `/data/downloads` 或 `/downloads`），转换类型直接选 **相等**，规则留空。
- **替换路径前缀（替换）**：若来源下载器内路径为 `/downloads/movies`，目标下载器内路径为 `/media/movies`，转换类型选 **替换**，用 `{#**#}` 分隔源前缀与目标前缀：
  ```text
  /downloads{#**#}/media
  ```
- **增加路径前缀（加）**：若来源路径为 `/downloads/movies`，目标路径为 `/volume1/downloads/movies`，转换类型选 **加**，填入：
  ```text
  /downloads{#**#}/volume1
  ```
- **移除路径前缀（减）**：若来源路径为 `/volume1/media/downloads/movies`，目标路径为 `/downloads/movies`，转换类型选 **减**，直接填入要去除的前缀（不使用 `{#**#}` 分隔符）：
  ```text
  /volume1/media
  ```

保存后先用一两个任务手动测试，在“管理中心 → 自动转移”中核对“转换前目录”与“转换后目录”，确认目标下载器能够完成 `100%` 校验并正常做种（若目标任务变为从零开始下载，立即暂停并修正路径转换规则）。

## 常见问题与维护

### 反向代理设置

使用 Lucky、Nginx 等外部反向代理时，只需将域名转发到 `http://NAS_IP:8780`（或自定义的宿主机映射端口）并开启 **WebSocket 支持**即可，容器内置的 Nginx 会自动处理网页与实时日志终端（`/app/d9422b72cffad23098ad301eea0f8419`）的分流。

### 更新与备份

日常备份需保留 `compose.yaml` 以及映射到 `/iyuu` 和 `/data` 的两个宿主机目录（为保证 MySQL 数据库一致性，备份前请先执行 `docker compose stop iyuuplus`，复制完成后再启动）。

IYUUPlus 8.x 的应用代码与运行环境镜像分开维护：

- **更新应用版本**：直接在 WebUI 仪表盘的“系统信息 → IYUU 版本”旁点击更新，或按[官方更新说明](https://doc.iyuu.cn/guide/qa-iyuuplus-update)重启容器拉取最新源码。
- **更新基础环境镜像**：在项目目录执行 `docker compose pull` 与 `docker compose up -d`。
- **从旧版 2.x 迁移**：2.x 与 8.x 目录结构不兼容，需为 8.x 新建独立目录部署，再将旧版备份的 `/db/user_sites.json` 导入新版站点管理中补全配置。

<span id="常见问题与检查顺序"></span>

### 故障排查

| 现象                   | 优先检查                                                                   |
| ---------------------- | -------------------------------------------------------------------------- |
| 容器反复重启           | 镜像架构、宿主机挂载目录读写权限及 `docker compose logs` 输出              |
| WebUI `8780` 打不开    | NAS 局域网地址、端口映射是否冲突、容器是否已完成首次数据库初始化           |
| 下载器 API 连接失败    | “协议主机”与“接入点”写法、账号密码，确认未在 bridge 容器中误填 `localhost` |
| 能连下载器但无法转种   | `/qb` 或 `/tr` 是否指向真实种子目录、qBittorrent 是否使用了快速恢复文件    |
| 转种后任务从零重新下载 | 目标下载器数据挂载路径与路径转换规则是否对应同一份文件                     |
| 辅种任务校验失败       | 任务是否勾选了“自动校验”、下载保存路径层级与原文件结构是否一致             |
| 反向代理后实时终端断开 | 外层反向代理是否转发到 `8780` 端口并开启了 WebSocket Upgrade               |

## 参考资料

- 磕巴白菜：[新绿联部署 IYUU 容器，实现全自动化辅种+转种](https://hi.keba.host/archives/ugreen-iyuu)。
- [IYUUPlus 开发版仓库](https://github.com/ledccn/iyuuplus-dev)与 [IYUU 官网](https://www.iyuu.cn/)。
- [官方快速开始](https://doc.iyuu.cn/guide/getting-started)与 [Docker Compose 安装](https://doc.iyuu.cn/guide/install-docker-compose)。
- [下载器设置](https://doc.iyuu.cn/guide/downloader)、[站点设置](https://doc.iyuu.cn/guide/site)与[自动辅种](https://doc.iyuu.cn/guide/reseed-torrent)。
- [自动转移](https://doc.iyuu.cn/guide/transfer-torrent)与[计划任务](https://doc.iyuu.cn/guide/cron)。
- [常见问题](https://doc.iyuu.cn/guide/qa-iyuuplus)、[镜像内置 Nginx 配置](https://github.com/ledccn/iyuuplus-dev/blob/master/docker/rootfs/etc/nginx/nginx.conf)与[更新或迁移](https://doc.iyuu.cn/guide/qa-iyuuplus-update)。
