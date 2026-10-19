---
title: 下载目录与做种常识
description: 下载目录、挂载权限与端口的共用设置，做种、硬链接整理和衔接 MoviePilot 的顺序。
author: Ayulog
pubDatetime: "2026-10-10T14:15:00+08:00"
draft: false
category: pt
tags:
  - 下载器
  - Docker
---

在 NAS 上同时运行下载器、辅种工具与媒体整理服务时，容器能否顺利读写文件、辅种能否秒过校验、整理入库能否用上硬链接，都取决于前期的目录规划、挂载边界与账户权限。

本文梳理各下载器共用的目录结构、权限配置、硬链接原理与维护流程；各软件的具体部署与设置分别见 [qBittorrent](/posts/qbittorrent-guide/)、[Transmission](/posts/transmission-guide/) 和 [Aria2 与 AriaNg](/posts/aria2-guide/)。

## 下载器选型与端口分工

### 各工具的适用场景

| 工具                                       | 主要用途                                      | 常见定位                              |
| ------------------------------------------ | --------------------------------------------- | ------------------------------------- |
| [qBittorrent](/posts/qbittorrent-guide/)   | BT / 磁力下载与做种，支持分类、RSS 与筛选规则 | 主力下载、刷流与 MoviePilot 自动化    |
| [Transmission](/posts/transmission-guide/) | BT / 磁力下载与做种，资源占用低               | 大规模长期保种，同样可接入 MoviePilot |
| [Aria2 与 AriaNg](/posts/aria2-guide/)     | HTTP(S)、FTP、SFTP、BT、Metalink 下载与前端   | 浏览器直链、软件包与 AList 网盘下载   |

日常使用可先在 qBittorrent 与 Transmission 中选定一个主力 BT/PT 客户端，再按需搭配 Aria2 处理直链与网盘文件下载。用于 PT 站点时，需先核对各站点的**客户端版本白名单**，部署稳定后记录当前镜像标签或 digest，避免自动更新到尚未获站点放行的版本。

### 管理端口与 Peer 监听端口

各下载器在 Docker 部署中均包含两类端口：

| 服务           | 局域网管理入口                         | BT Peer 数据传输端口     |
| -------------- | -------------------------------------- | ------------------------ |
| qBittorrent    | `http://NAS_IP:8080`                   | `6881/TCP`、`6881/UDP`   |
| Transmission   | `http://NAS_IP:9091/transmission/web/` | `51413/TCP`、`51413/UDP` |
| AriaNg / Aria2 | 网页 `18080`；RPC `16800`              | `32516/TCP`、`32516/UDP` |

WebUI 与 RPC 管理端口仅供局域网或 VPN / 私有组网内部访问；若具备公网入站条件并希望提升 BT 连接率与上传速度，只需在路由器端口转发和 NAS 防火墙中放行对应的 **BT Peer 端口（TCP / UDP）**。

<span id="共用的目录与权限准备"></span>

## 目录规划、容器挂载与权限

### 统一数据根目录

每个下载器的容器配置独立存放在各自的项目目录中（如 `stacks/qbittorrent/config`、`stacks/transmission/config`），互不混用；而下载数据与媒体库则建议放在同一个宿主机数据根目录下：

```text
/path/to/data/
├── downloads/
│   ├── qbittorrent/
│   ├── transmission/
│   └── incomplete/
└── library/
    ├── movies/
    └── tv/
```

先在 NAS 存储池中创建上述实际目录（替换 `/path/to/data`），再将该根目录统一映射为 qBittorrent、Transmission 和 MoviePilot 容器内的 `/data`。这样各容器内部访问的 `/data/downloads/...` 和 `/data/library/...` 路径完全一致，既直观又满足硬链接条件。

### 写入账户 UID / GID 与 `.env` 配置

通过 SSH 登录 NAS，查询日常负责读写媒体文件的账户 `UID` 与 `GID`：

```bash
id nasuser
```

将 `nasuser` 替换为实际账户名，记录输出的 `UID` 与 `GID`，并在 NAS 权限管理中为该账户授予容器配置目录和数据根目录的读写权限（无需使用 `0/0` root 权限或将目录开放为 `777`）。

随后在 qBittorrent、Transmission 等各自的 Compose 项目目录中创建 `.env` 文件，填入同一组参数：

```dotenv
# 填写实际服务账户的 UID / GID
PUID=
PGID=
# 替换为 NAS 上已创建的数据根目录绝对路径
MEDIA_ROOT=/path/to/data
```

各容器的时区环境变量建议统一设为 `TZ=Asia/Singapore`，确保下载器的定时限速与计划任务按准确的本地时间执行。

## 做种、辅种与硬链接原理

### 做种与辅种校验

- **做种（Seeding）**：下载完成后保留任务与原始文件，持续向其他节点提供上传。PT 种子需满足站点规定的最短做种时间、分享率或 H&R 考核要求后方可移除。
- **辅种（Reseeding）**：利用本地已下载完成的资源，为其他站点的相同种子添加任务并直接进入做种。手动或自动添加辅种任务时，应先以暂停状态添加，确认保存路径层级与原文件完全对应后执行完整校验，待进度达到 `100%` 再启动任务。

### 硬链接（Hard Link）与挂载边界

为了在不影响原目录做种的前提下拥有整洁的媒体库目录，[MoviePilot](/posts/moviepilot-guide/) 或 PTtool 通常采用**硬链接整理**：下载目录保留原始种子文件名和目录层级继续做种，媒体库目录则生成按影视规范重命名的硬链接入口。两边指向磁盘上的同一份物理数据块，不会占用双倍存储空间；任一侧删除目录入口时，只要另一侧链接仍存在，底层文件数据就不会被清除。

硬链接正常工作需要同时满足两项底层条件：

1. **同一物理文件系统**：下载源目录（`downloads`）与整理目标目录（`library`）必须位于宿主机同一个分区或存储池上；跨硬盘、跨独立共享文件夹或指向云盘挂载目录均无法创建硬链接。
2. **单一容器挂载点**：在 Docker 中，如果把 `/path/to/data/downloads:/downloads` 和 `/path/to/data/library:/library` 拆成两条独立的挂载映射，容器内核会将它们视为两个不同的文件系统边界，导致跨目录硬链接报错（`EXDEV`）并退化为耗时的完整文件复制。将父目录 `/path/to/data` 统一挂载为容器内的 `/data`，即可在 `/data/downloads` 与 `/data/library` 之间顺畅创建硬链接。

<span id="与-moviepilot-联动"></span>

## 与 MoviePilot 联动

当 qBittorrent 或 Transmission 已能正常完成下载后，即可接入 [MoviePilot](/posts/moviepilot-guide/) 实现自动识别、重命名与硬链接入库。

MoviePilot 容器同样将宿主机数据根目录挂载为 `/data`，其下载来源与整理目标目录对应如下：

| 下载器       | 下载来源目录                   | 本地媒体库整理目标目录                       |
| ------------ | ------------------------------ | -------------------------------------------- |
| qBittorrent  | `/data/downloads/qbittorrent`  | `/data/library/movies` 或 `/data/library/tv` |
| Transmission | `/data/downloads/transmission` | `/data/library/movies` 或 `/data/library/tv` |

连接下载器 API 时，若各服务位于独立的 Compose 项目中，直接填写 NAS 局域网地址（如 `http://NAS_IP:8080` 或 `http://NAS_IP:9091`）及下载器凭据；若已按[媒体流程说明](/posts/debnas-media-workflow/#目录与容器路径规划)将各容器加入同一个自定义 Docker 网络，则可使用容器服务名（如 `http://qbittorrent:8080`）。

首次配置联动时，建议按以下顺序验证：

1. 在 MoviePilot 中测试下载器连接成功，确认能正常读取任务列表。
2. 核对下载分类、来源目录与整理方式（硬链接），先下发一个小体积测试任务。
3. 下载完成后查看 MoviePilot 整理日志，确认 `/data/library` 下已生成对应的硬链接文件（可通过 `ls -li` 检查源文件和目标文件的 inode 编号是否一致）。
4. 确认下载器内原任务做种状态正常、媒体服务器能正常刮削播放后，再开启日常订阅。

<span id="更新备份与迁移"></span>

## 更新、备份与迁移

### 日常备份与镜像更新

各下载器项目分别维护配置备份。更新镜像前，先记录当前镜像版本或 digest，并在对应 Compose 目录停止容器，确保种子恢复状态与配置文件完整落盘：

```bash
docker compose stop
```

备份项目目录下的 `compose.yaml`、`.env` 以及整个 `config` 目录（其中包含 `.torrent` 种子文件、`.fastresume` 恢复状态及客户端设置，仅备份单个设置文件无法恢复任务列表）。备份完成后拉取新镜像并启动：

```bash
docker compose pull
docker compose up -d
```

启动后登录 WebUI 检查客户端版本号、任务列表状态，并任选一个任务执行校验测试。

### 迁移与任务清理

迁移下载目录或更换设备时，只要保持容器内挂载路径（如 `/data`）与子目录结构不变，下载器即可直接识别原路径下的文件；迁移后建议先抽检几个任务执行本地数据校验，确认达到 `100%` 后再批量恢复做种。

在客户端移除任务时，请注意区分“仅移除任务”与“同时删除本地数据”：对于存在跨站辅种或媒体库硬链接的文件，仅移除任务或清理下载目录入口不会影响媒体库播放，但若多个做种任务共用同一份文件，切勿勾选删除数据文件。

<span id="常见问题"></span>

## 常见故障排查

| 现象                              | 优先检查                                                                     |
| --------------------------------- | ---------------------------------------------------------------------------- |
| 文件在 NAS 上，但下载器提示找不到 | 容器是否已挂载该目录、任务保存路径是否填写了容器内路径、目录层级是否一致     |
| 下载器 API 连通，但无法自动整理   | MoviePilot 是否挂载了同一 `/data` 根目录、来源目录路径及 `PUID`/`PGID` 权限  |
| 辅种或转种后开始从零重新下载      | 立即暂停任务；核对目标保存路径是否多套或少套了一层文件夹，修正后重新校验     |
| 硬链接整理失败或退化为复制        | 源与目标是否位于同一存储池分区，以及容器是否统一挂载了父目录 `/data`         |
| 在下载器删种并删文件后空间未释放  | 媒体库 `/data/library` 中是否仍保留着指向该数据的硬链接文件                  |
| 任务处于做种中但几乎没有上传      | 种子当前是否有下载需求、Tracker 返回状态、是否设置了分享率自动停止及端口转发 |
| 重启后任务列表全部消失            | 容器 `./config` 挂载路径是否发生变动，或是否误连到了另一个新建的下载器实例   |

## 参考资料

- [LinuxServer qBittorrent 镜像说明][qbt-image]与 [Transmission 镜像说明][tr-image]。
- [MoviePilot 文件整理][mp-reorganize]。
- [Docker host 网络][docker-host]。
- [Aria2 官方手册][aria2-manual]。

[qbt-image]: https://docs.linuxserver.io/images/docker-qbittorrent/
[mp-reorganize]: https://wiki.movie-pilot.org/reorganize
[docker-host]: https://docs.docker.com/engine/network/drivers/host/
[tr-image]: https://docs.linuxserver.io/images/docker-transmission/
[aria2-manual]: https://aria2.github.io/manual/en/html/aria2c.html
