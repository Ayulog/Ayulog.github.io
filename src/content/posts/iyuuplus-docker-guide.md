---
title: IYUUPlus：自动辅种与下载器转种
description: 在绿联 NAS 的 Docker 中部署 IYUUPlus，接入下载器并配置辅种与转种。
author: Ayulog
pubDatetime: "2026-10-10T13:55:00+08:00"
draft: false
category: pt
tags:
  - IYUU
  - PT
  - NAS
  - Docker
  - 绿联
---

IYUUPlus 拿已有种子去查跨站匹配，命中后把新任务交给下载器校验、做种；也能在 qBittorrent 与 Transmission 之间转移任务。转移的是种子任务，下载文件留在原处。

下面的步骤用 Docker 部署，参数核对日期为 **2026 年 10 月 10 日**，未在绿联 NAS 上实机部署。镜像用 `iyuucn/iyuuplus-dev:latest`，统一入口是 `8780`；界面操作参考磕巴白菜的[绿联 IYUU 教程](https://hi.keba.host/archives/ugreen-iyuu)。

<span id="iyuuplus-解决什么问题"></span>

## 辅种和转种的工作方式

### 自动辅种

辅种会复用已有数据，增加匹配站点的任务：

1. IYUUPlus 通过下载器 API 读取现有任务的 `info_hash` 等信息。
2. IYUU 服务返回其他支持站点上的匹配种子。
3. IYUUPlus 根据站点凭据生成种子链接，并提交给下载器。
4. 下载器从站点取得种子文件，扫描本地数据并执行校验。
5. 校验通过后，按下载器设置启动做种，并检查实际任务状态。

跨站匹配查询由 IYUU 服务处理；下载种子和做种阶段仍由下载器与 PT 站点交互，文件校验在本地执行。匹配成功后仍要过校验，文件缺失、目录层级不同或资源版本不同，都可能导致任务重新下载。

不要用“跳过校验”来掩盖路径错误。先确认下载器看到的保存路径确实指向已有数据，再观察校验结果和日志。

### 自动转种

自动转种是把一个下载器里的种子任务提交给另一个下载器，**不会搬运已经存在的数据文件**。IYUUPlus 读取来源下载器保存的 `.torrent` 文件，通过目标下载器的 API 添加任务，并按路径转换规则填写目标保存路径。

转种前必须同时满足两点：

- IYUUPlus 能读取来源下载器的种子目录。
- 目标下载器能通过自己的容器路径访问同一份数据。

转移到另一台设备时，也要让目标下载器实际访问到这些文件，例如通过已挂载的共享存储。只修改路径字符串不会把文件传过去。

因此，种子目录和数据目录是两个概念。qBittorrent 的种子目录通常叫 `BT_backup`，Transmission 的种子目录通常叫 `torrents`；下载完成的影片、音频等文件则位于数据目录。只把数据目录挂给 IYUUPlus 无法完成转种，种子目录要单独挂载。

## 部署前准备

开始前先确认：

| 项目     | 需要确认的内容                                                       |
| -------- | -------------------------------------------------------------------- |
| Docker   | 绿联 NAS 已安装并能正常启动容器                                      |
| 下载器   | qBittorrent、Transmission 至少已经部署一个，并能从局域网打开 WebUI   |
| NAS 地址 | 为 NAS 设置 DHCP 地址保留，避免容器入口地址变化                      |
| 配置目录 | 为 IYUUPlus 单独准备源码目录和数据库目录                             |
| 种子目录 | 找到 qBittorrent 的 `BT_backup`、Transmission 的 `torrents` 实际路径 |
| 数据目录 | 确认下载器和目标下载器看到的路径，以及两者是否指向同一份数据         |

IYUUPlus 的持久化目录需要新建；下载器种子目录则要在已有配置中查找，里面应能看到以种子哈希命名的 `.torrent` 文件。不要新建一个空 `BT_backup` 文件夹来代替正在使用的目录。下面的结构仅作示例：

```text
/volume1/docker/AppData/iyuuplus/
├── compose.yaml
├── iyuu/         # IYUUPlus 源码及相关文件
└── data/         # MySQL 数据库

/volume1/docker/AppData/qb/qBittorrent/BT_backup/
/volume1/docker/AppData/transmission/torrents/
```

上面的路径只是 NAS 宿主机路径示例。Compose 中左侧要填写绿联文件管理器显示的真实路径；右侧是 IYUUPlus 容器内路径。后续在 IYUUPlus 下载器设置的“种子文件夹”中填写 `/qb` 或 `/tr`，数据保存路径则以对应下载器看到的路径为准。

只做普通辅种时，通过下载器 API 工作即可，不必为 IYUUPlus 挂载整个媒体数据盘。自动转种才需要读取来源下载器的种子文件夹。

Docker 基础准备可以先看 [Docker 官方安装文档](https://docs.docker.com/engine/install/)；下载器安装见 [qBittorrent](/posts/qbittorrent-guide/)和 [Transmission](/posts/transmission-guide/)，目录映射另见[下载目录与做种常识](/posts/nas-downloader/)。普通辅种有一个下载器即可，转种至少需要来源与目标两个下载器实例。

## 使用 Docker Compose 部署

在绿联 Docker 的项目管理中创建项目，保存下面的 `compose.yaml`，替换为自己 NAS 的真实路径。如果只从 qBittorrent 转出种子，保留 `/qb` 挂载即可；只做普通辅种时可以删除 `/qb` 和 `/tr` 两行。

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

这里的四个挂载分别用于：

| 容器路径 | 用途                                     |
| -------- | ---------------------------------------- |
| `/iyuu`  | 保存 IYUUPlus 源码及相关文件             |
| `/data`  | 保存 MySQL 数据库                        |
| `/qb`    | 读取 qBittorrent 的 `BT_backup` 种子文件 |
| `/tr`    | 读取 Transmission 的 `torrents` 种子文件 |

`/iyuu` 和 `/data` 是官方要求的两个独立持久化目录，数据库不要改挂到 `/iyuu/data`。`/qb` 与 `/tr` 使用只读挂载，转移脚本通过 API 添加任务，只需读取来源种子文件；仍要确保 NAS 权限允许容器读取。

这里采用 bridge 网络，将 NAS 的 `8780` 映射到容器的 `8780`。端口冲突时只改左侧，例如 `18780:8780`，后续浏览器也改用 `18780`。当前镜像内置 Nginx，已经把 WebUI 和 WebSocket 汇集到这个入口，无需再公开 `8787` 和 `3131`。

保存项目后点击部署并查看启动日志。首次启动还需要获取源码并初始化数据库，应确认启动完成再访问页面。允许使用 SSH 的环境，也可以在 `compose.yaml` 所在目录执行：

```bash
docker compose config
docker compose up -d
docker compose logs --tail=100 iyuuplus
```

`docker compose config` 只核验配置结构；镜像能否拉取、目录是否可读、应用能否启动，要看启动日志。若日志提示源码下载失败，检查 NAS 到项目源站的网络；若是挂载路径或权限问题，先核对实际目录，避免把空目录误当作下载器的种子目录。

## 首次登录与基础配置

容器启动后，在局域网浏览器打开：

```text
http://NAS_IP:8780
```

将 `NAS_IP` 换成绿联 NAS 的实际地址。[官方安装向导](https://doc.iyuu.cn/guide/getting-started)要求填写爱语飞飞 Token，再设置用于登录的管理员用户名和密码。按向导完成初始化、进入后台后，再配置下载器和站点。

### 添加下载器

先添加 qBittorrent 或 Transmission，再进行辅种和转种测试。填写下载器 WebUI 的访问地址、端口、账号和密码。Docker 容器中的 `localhost` 指向当前 IYUUPlus 容器自身；如果下载器是另一个容器，不要直接把 `localhost` 当作下载器地址。

下载器 API 连接成功只说明接口通了；种子文件是否可读、目标数据路径是否对应，要在转种前检查种子目录挂载和数据目录映射。

使用这里的 bridge 网络时，可以填写 NAS 局域网 IP 和下载器已映射的 WebUI / RPC 端口；只有两个容器加入同一个自定义 Docker 网络时，才可用服务名和容器内部端口。下载器设置的“协议主机”只填协议、主机和端口，不带子路径，也不以斜杠结尾；“接入点”另填 qBittorrent 的 `/` 或 Transmission 默认的 `/transmission/rpc`，按下载器设置界面显示的值填写。

要转出 qBittorrent 任务，在来源下载器的“种子文件夹”填写 `/qb`；从 Transmission 转出则填 `/tr`。官方转移文档还提醒：qBittorrent 4.5.0 及以上版本作为来源时，“恢复数据存储类型”需使用**快速恢复文件**，不要选择 SQLite 数据库。已有下载器调整前先备份配置，核对当前版本和实际种子保存位置。

### 添加站点

在“管理中心 → 站点”先同步新站点，再按[官方站点说明](https://doc.iyuu.cn/guide/site)填写自己拥有的站点凭据，补全配置并启用。常见字段包括 Passkey、UID 或 Cookie；IYUU Token 用于 IYUU 服务，与 PT 站点的 Passkey 不能互换。

当前官方文档要求**绑定合作站点后才能完整使用 IYUUPlus**，通常需要对应站点的 Passkey 和 UID。合作站点绑定与其他支持站点的配置是两件事，其他支持站点按各自的凭据配置。凭据写入配置后，不要把配置文件、截图和日志直接公开。

### 先做一次小规模验证

第一次运行时只选择少量已经完成、文件结构明确的资源。按“读取任务 → 找到匹配 → 添加种子 → 校验数据 → 进入做种”的顺序检查日志。确认路径和权限正确后，再开启定时任务和更多站点。

## 配置自动转种

在计划任务中创建“自动转移”任务，选择来源下载器和目标下载器，再配置路径转换。路径转换针对的是**数据目录**，不是 `BT_backup` 或 `torrents` 这样的种子目录。

首次执行不要勾选“删除源做种”，保留来源任务作为核对依据，也不要开启“跳校验”。可以先让目标任务以暂停状态加入，确认保存位置后执行校验，再决定是否启动。路径过滤器排除选中的目录，路径选择器只处理选中的目录，同一个目录只能交给其中一种规则。

如果两个下载器在容器内使用完全相同的数据路径，路径转换类型可以选择“相等”，规则留空。例如两边都把宿主机的下载目录映射为 `/downloads`，目标任务可以直接复用这个路径。

如果一个下载器使用 `/downloads`，另一个下载器使用 `/volume1/downloads`，就需要把来源路径改成目标路径。下面的规则依据[官方计划任务说明](https://doc.iyuu.cn/guide/cron)，均以两个路径对应同一份真实数据为前提，一行填写一条规则。

### 加：给路径增加前缀

假设 qBittorrent 的保存目录是 `/downloads/movies`，Transmission 中对应目录是 `/volume1/downloads/movies`，选择“加”，填写：

```text
/downloads{#**#}/volume1
```

转换结果：

```text
/downloads/movies
→ /volume1/downloads/movies
```

### 替换：把一个目录替换成另一个目录

假设来源下载器使用 `/downloads`，目标下载器使用 `/media`，选择“替换”，填写：

```text
/downloads{#**#}/media
```

转换结果：

```text
/downloads/movies
→ /media/movies
```

这里填写的是保存目录的前缀，不需要为每个视频文件单独写一条规则。`{#**#}` 左侧是匹配部分，右侧是替换后的目录前缀。

### 减：移除路径前缀

如果来源下载器的保存目录为 `/volume1/media/downloads/movies`，目标下载器只需要 `/downloads/movies`，选择“减”，只填写要去掉的前缀：

```text
/volume1/media
```

“减”不使用 `{#**#}` 分隔符，也不填写目标路径。无论使用哪一种规则，都要先用一两个任务验证；在“管理中心 → 自动转移”查看“转换前目录”和“转换后目录”，分别与两个下载器的实际路径核对。目标任务开始向空目录重新下载时，应先暂停，修正路径后再校验。

目标任务校验通过、可以继续做种后，再按站点规则决定是否停止或移除来源任务。多个任务共用同一份数据时，清理来源任务不能顺手删除数据文件。

## 配置自动辅种

在计划任务中创建“自动辅种”任务，选择需要扫描的下载器、参与本次任务的“辅种站点”，再配置执行时间。站点需要先在站点管理中配置、启用；仅启用站点而未在任务中选中，不会参与该任务，新加站点后也要回来补选。

按官方说明勾选任务的“自动校验”，较新的 qBittorrent 需要这个选项来触发校验。按需启用下载器设置的“校验后做种”；官方文档说明 v8.2.10 起该开关会定期处理已完成的 IYUU 自动辅种任务，不一定在校验完成瞬间启动。先手动执行一次，确认日志中的匹配、添加、校验和做种状态，再开启定时运行。

官方建议辅种每天运行一次并错峰。各站点的每日数量上限和间隔先沿用合理默认值；达到上限的任务可能被标记为“待辅种”，次日继续即可，不是服务失效，也不用立即反复重跑。

## 反向代理：只转发 8780

按当前 Docker 镜像部署时，Lucky、Nginx 等外部代理只需转发到 `http://NAS_IP:8780`，并启用 WebSocket 支持；如果改过宿主机端口，替换成实际映射端口。先确认局域网入口正常，再配置 HTTPS 和管理入口的访问范围。

参考教程中的双端口方案对应直接代理应用端口的方式。三个端口的关系如下：

| 端口   | 作用                                    | 本文配置如何使用                              |
| ------ | --------------------------------------- | --------------------------------------------- |
| `8780` | 镜像内置 Nginx 统一入口                 | 唯一需要映射的入口，网页和 WebSocket 都走这里 |
| `8787` | IYUUPlus HTTP / WebUI                   | 由容器内 Nginx 转发                           |
| `3131` | WebSocket，供计划任务实时终端等功能使用 | 由容器内 Nginx 转发                           |

只有自己绕过内置 Nginx、直接代理 `8787` 的部署，才需要另行把 WebSocket 路径转给 `3131`。官方配置当前使用固定路径：

```text
/app/d9422b72cffad23098ad301eea0f8419
```

这个路径不是用户 Token 或随机生成的实例标识。直接代理时要保留该路径、支持 WebSocket Upgrade；通过 `8780` 访问时，内置 Nginx 已经处理这部分路由。若页面能打开但实时终端连不上，优先检查外层代理是否支持 WebSocket。

## 更新与备份

备份 Compose 文件、`/iyuu` 和 `/data` 对应的宿主机目录，并另外备份下载器配置。数据库文件需要一致性备份；复制整个持久化目录时先停止 IYUUPlus 容器，复制完成后再启动。配置与数据库包含站点凭据，备份按私有数据保存。

[官方更新说明](https://doc.iyuu.cn/guide/qa-iyuuplus-update)将应用源码和 Docker 镜像分开：当前 8.x 可从仪表盘“系统信息 → IYUU 版本”旁的更新入口更新，或按文档通过重启容器更新源码；镜像本身主要提供 Nginx、MySQL、PHP 运行环境。镜像拉取并重建与应用源码更新是两个步骤，`docker compose pull` 只更新镜像，应用版本要到仪表盘确认。

旧版 2.x 迁移需按官方流程重新安装，旧版本映射目录不要直接复用。先备份旧版 `/db/user_sites.json`，在新版站点管理中导入旧版配置，再补全并启用。更新后复查下载器连接、站点和一条辅种或转移任务的结果。

<span id="常见问题与检查顺序"></span>

## 排错：现象与检查位置

| 现象                   | 优先检查                                               |
| ---------------------- | ------------------------------------------------------ |
| 容器不断重启           | 镜像架构、配置目录权限、挂载路径是否存在、启动日志     |
| WebUI 打不开           | NAS 地址、8780 的实际端口映射、端口占用、容器启动日志  |
| 下载器连接失败         | API 地址、端口、账号密码、容器网络是否能访问目标下载器 |
| 能连下载器但不能转种   | 来源种子目录是否挂载，IYUUPlus 是否有读取权限          |
| 转种后重新下载         | 目标数据路径不对应、路径转换规则错误、文件不完整       |
| 辅种任务校验失败       | 文件结构、目录层级、资源版本和下载器保存路径           |
| 反代后实时终端连接失败 | 外层代理是否转发到 8780，并支持 WebSocket              |

## 参考资料

- 磕巴白菜：[新绿联部署 IYUU 容器，实现全自动化辅种+转种](https://hi.keba.host/archives/ugreen-iyuu)：部署场景、目录映射与转种的实践参考；参数按当前官方文档重新整理。
- [IYUUPlus 开发版仓库](https://github.com/ledccn/iyuuplus-dev)：项目源码和镜像说明。
- [官方快速开始](https://doc.iyuu.cn/guide/getting-started)与 [Docker Compose 安装](https://doc.iyuu.cn/guide/install-docker-compose)：镜像、8780 入口、持久化目录和安装向导。
- [下载器设置](https://doc.iyuu.cn/guide/downloader)、[站点设置](https://doc.iyuu.cn/guide/site)与[自动辅种](https://doc.iyuu.cn/guide/reseed-torrent)：接入方式、合作站点绑定和辅种限制。
- [自动转移](https://doc.iyuu.cn/guide/transfer-torrent)与[计划任务](https://doc.iyuu.cn/guide/cron)：种子文件夹、路径规则、校验和执行频率。
- [常见问题](https://doc.iyuu.cn/guide/qa-iyuuplus)、[镜像内置 Nginx 配置](https://github.com/ledccn/iyuuplus-dev/blob/master/docker/rootfs/etc/nginx/nginx.conf)与[更新或迁移](https://doc.iyuu.cn/guide/qa-iyuuplus-update)。
- [IYUU 官网](https://www.iyuu.cn/)：服务入口和支持站点信息。
- [qBittorrent](https://www.qbittorrent.org/) 与 [Transmission](https://transmissionbt.com/)：下载器项目入口。
