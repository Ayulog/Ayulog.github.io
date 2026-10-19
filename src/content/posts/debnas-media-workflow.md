---
title: DebNAS 自动观影流程
description: 本地下载、115 转存与 MoviePilot 整理到网盘三种接法，后两条经 CMS 生成 STRM 汇入 Emby。
author: Ayulog
pubDatetime: "2026-10-09T18:00:00+08:00"
draft: false
category: nas
tags:
  - Debian
  - DebNAS
  - Docker
---

在 DebNAS 上搭建自动化影视库，核心是打通“资源获取 → 识别改名 → 媒体库入库 → 客户端播放”四个环节。根据存储位置的不同，可以分为三条路线：全部保存在本地机械硬盘、直接转存到 115 网盘生成 STRM，或是本地 PT 下载保种后再上传至网盘生成 STRM，最终统一汇总到 Emby 播放。

底层系统、磁盘挂载与基础容器环境见 [DebNAS 安装记录](/posts/debnas-installation-notes/)，相关工具汇总在 [NAS 服务清单](/posts/nas-software-websites/)。文中的 `/path/to/...` 为宿主机共享目录占位符，`./config` 为各 Compose 项目的相对配置目录。

## 架构分工与三种观影路线

整套方案涉及的组件与职责如下：

| 环节           | 工具或来源                                            | 在流程中的职责                                         |
| -------------- | ----------------------------------------------------- | ------------------------------------------------------ |
| 媒体来源       | PT、公开 BT / 磁链、ed2k、115 分享                    | 提供待下载或待转存的影视资源                           |
| 本地下载       | qBittorrent、Transmission                             | 下载 BT / PT 资源并保留原文件做种                      |
| 网盘接收       | 115 转存、115 离线任务                                | 将分享资源或磁力/ed2k 离线任务直接存入 115 网盘        |
| 订阅与本地整理 | MoviePilot V3                                         | 站点搜索、订阅下发，并将本地下载文件整理至硬盘或网盘   |
| 云端整理与同步 | Cloud Media Sync（CMS）                               | 整理云端文件、监控目录变更并在本地生成 `.strm` 文件    |
| 媒体库与增强   | Emby、Emby 神医助手（StrmAssistant）                  | 刮削海报展示、管理播放进度，配合插件提取媒体信息与字幕 |
| 播放终端       | Yamby、Infuse、SenPlayer、FloePlayer、小幻影视、iPlay | 各平台客户端，连接 Emby 播放本地视频或网盘直链         |
| 网盘挂载与远程 | CloudDrive2、Tailscale、Lucky、ZeroTier、ddns-go      | 为本地应用提供云盘目录挂载，以及提供外网访问入口       |

在组合这些工具时，先明确几个边界：

- **下载方式**：PT 任务需由本地 qBittorrent 或 Transmission 完成下载与做种统计；ed2k 链接则交由支持该协议的客户端或 115 离线下载处理。
- **整理职责**：同一批文件只交给一个工具负责重命名与分类。本地下载的文件由 [MoviePilot V3](https://github.com/jxxghp/MoviePilot)（镜像为 [jxxghp/moviepilot-v3](https://hub.docker.com/r/jxxghp/moviepilot-v3)）整理；直接进 115 网盘的文件由 CMS（0.3.4 及以上版本已内置独立自动整理，不再依赖 MoviePilot）处理。如需同步站点 Cookie，可按需搭配 [CookieCloud](https://github.com/easychen/CookieCloud)。

### 路线一：本地硬盘下载与硬链接入库

本地路线将视频保存在 NAS 机械硬盘上，兼顾 PT 保种与局域网高码率播放。下载器与 MoviePilot 统一将宿主机数据盘挂载为 `/data`，下载目录设为 `/data/downloads`，整理目标设为 `/data/library`。

![本地观影流程：PT 或公开 BT 资源经订阅命中或手动添加，交给 qBittorrent 或 Transmission 下载到本地数据盘，再由 MoviePilot V3 整理，最终进入 Emby 供播放器播放。](/images/posts/debnas-local-flow.svg)

1. **订阅与下载**：在 MoviePilot V3 中配置站点与订阅规则，命中后自动推送给 qBittorrent 或 Transmission 下载至 `/data/downloads`。手动添加的种子可通过对应分类与目录规则交由 MoviePilot 整理。
2. **硬链接整理**：下载完成后，MoviePilot 识别影片信息，采用**硬链接（Hardlink）**方式将文件整理至 `/data/library` 下的电影或剧集目录，并生成元数据、通知 Emby 刷新。
3. **扫描与播放**：Emby 仅添加 `/data/library` 作为媒体库目录，避免扫描 `/data/downloads` 导致重复条目。

**注意事项**：硬链接要求下载目录与媒体库目录位于同一块硬盘的同一文件系统内，且容器内共享同一个挂载根路径（如 `/data`）。硬链接让两个路径指向同一份底层数据，不额外占用双倍空间，适合一边保种一边按规范命名入库。

### 路线二：115 网盘转存与 CMS 生成 STRM

云端路线适合将大容量视频存放在 115 网盘，NAS 本地仅保存配置数据库、`.strm` 文本文件以及字幕和海报。示例中 CMS 与 Emby 共享宿主机 `STRM_ROOT` 目录，分别映射为容器内的 `/media` 与 `/strm`。

![115 观影流程：分享转存或离线任务完成后，由 CMS 整理云端媒体并生成本地 STRM，再由 Emby 入库，播放器播放时取得云端视频。](/images/posts/debnas-cloud-flow.svg)

1. **文件存入网盘**：通过 115 分享转存或添加磁力/ed2k 离线任务将视频存入网盘。可参考 CMSHelp 的 [转存下载说明](https://github.com/guyue2005/CMSHelp/wiki/3.%E8%BD%AC%E5%AD%98%E4%B8%8B%E8%BD%BD) 配置接收目录 CID，或在电脑端使用第三方客户端 [115-Desktop](https://github.com/Shimily-3/115-Desktop) 辅助管理。
2. **云端整理与生成 STRM**：在 CMS 中配置网盘源目录 CID、分类规则与本地输出路径（`/media`）。首次使用先执行全量同步，随后开启自动整理与增量同步；也可按需配置直接基于分享链接的 [115 分享同步](https://docs.cmscc.cc/docs/share-sync)。
3. **Emby 入库与 302 播放**：CMS 在本地生成按影视规范命名的 `.strm` 文件（内容为指向媒体流地址的单行文本，如 `https://media.example.com/path/to/video`），并通知 Emby 刷新 `/strm` 目录。客户端通过 CMS 的 302 代理端口（默认 `9096`）或直链重定向拉取云端视频流。

**注意事项**：

- **增量同步限制**：115 增量同步依赖网盘“生活事件”，在网盘中直接重命名文件不会触发生活事件，手动改名后需在 CMS 中手动触发同步。
- **待整理目录隔离**：CMS 的网盘待整理目录应独立于已整理的同步媒体库目录之外，防止反复扫描。
- **通知路径替换**：由于 CMS 输出路径为 `/media`、Emby 读取路径为 `/strm`，在 CMS 配置 Emby 刷新通知时需设置路径替换规则（如 `/media → /strm` 或 `/media#/strm`）。

### 路线三：本地下载保种后上传网盘

路线三结合了前两者的特点：资源先通过本地 BT/PT 下载器落盘保种，再由 MoviePilot V3 识别改名并上传至 115 网盘，最后由 CMS 同步生成 STRM 供 Emby 播放。

![本地下载后上传观影流程：qBittorrent 或 Transmission 把媒体下载到 HDD，MoviePilot V3 按规则整理并复制到网盘，确认云端上传完成后由 CMS 同步生成 STRM，最后进入 Emby 供播放器播放。](/images/posts/debnas-upload-flow.svg)

1. **配置网盘写入通道**：可选择将 CloudDrive2 挂载目录（`CLOUD_MEDIA_ROOT`）映射为 MoviePilot 容器的 `/cloud`，或直接配置 MoviePilot V3 内置的 [原生 115 存储适配器](https://github.com/jxxghp/MoviePilot/tree/v3/app/modules/filemanager/storages)。
2. **复制整理并上传**：下载器在 `/data/downloads` 完成下载后，MoviePilot 采用**复制整理**模式，将识别改名后的文件写入 `/cloud`（或通过原生接口上传至网盘目标目录），同时保留本地源文件继续做种。
3. **CMS 同步生成 STRM**：待 CloudDrive2 后台上传任务或原生上传全部完成后，由 CMS 同步网盘中的成品目录，在本地生成 STRM 并通知 Emby 刷新。

**注意事项**：此路线中影片的识别、改名与分类已由 MoviePilot 完成，CMS 只需开启目录同步与 STRM 生成，切勿对同一网盘目录再次开启 CMS 自动整理。后续若需清理本地保种文件腾出硬盘空间，先确认云端 STRM 可正常播放，再按站点规则在下载器中删除。

## 目录规划与容器网络

### 宿主机目录与容器映射

各服务使用独立的 Compose 项目目录（如 `stacks/moviepilot/`、`stacks/emby/`），项目内的 `./config` 仅保存当前容器的配置。需要跨容器共享的媒体、云盘和 STRM 目录通过宿主机绝对路径变量统一挂载：

```text
/path/to/data/         # MEDIA_ROOT：本地数据盘根目录
  downloads/           # 下载原始文件与做种目录
  library/             # 整理后的本地媒体库
/path/to/cloud/        # CLOUD_MEDIA_ROOT：CloudDrive2 云盘挂载目录
/path/to/strm/         # STRM_ROOT：CMS 生成的本地 STRM 与附属字幕目录
```

各项目 `.env` 中的路径变量与容器内路径对应关系如下：

| 宿主机环境变量                 | 容器内挂载路径              | 用途说明                           |
| ------------------------------ | --------------------------- | ---------------------------------- |
| `MEDIA_ROOT`                   | 下载器、MoviePilot：`/data` | 共享同一挂载根路径，支持硬链接整理 |
| `MEDIA_ROOT` 的 library 子目录 | Emby：`/data/library:ro`    | Emby 只读挂载整理后的本地媒体库    |
| `CLOUD_MEDIA_ROOT`             | MoviePilot：`/cloud`        | 路线三挂载写入网盘的目标路径       |
| `STRM_ROOT`                    | CMS：`/media`               | CMS 输出 STRM 与元数据的本地目录   |
| `STRM_ROOT`                    | Emby：`/strm:ro`            | Emby 只读挂载 STRM 媒体库          |

如果仅使用路线一（纯本地），可移除 MoviePilot 的 `/cloud` 挂载及 `CLOUD_MEDIA_ROOT` 变量；如果仅使用路线二（纯网盘），则可移除 Emby 的 `/data/library` 挂载。若需让 Emby 向媒体目录写入字幕或 NFO，可去掉挂载末尾的 `:ro` 并核对运行账户的 UID/GID 权限。

### 容器互联网络

为了让不同 Compose 项目的服务直接通过容器名通信，需提前创建一个名为 `media` 的外部 bridge 网络：

```bash
docker network inspect media >/dev/null 2>&1 || docker network create media
```

加入 `media` 网络后，服务之间的后台对接统一填写容器名与容器内部监听端口：

- **MoviePilot 连接 qBittorrent**：`http://qbittorrent:8080`
- **MoviePilot 连接 Transmission**：`http://transmission:9091`
- **CMS 连接 Emby**：`http://emby:8096`

局域网内的电脑、手机或电视客户端访问时，则使用 `http://NAS_IP:宿主机端口`（如 `http://NAS_IP:8096`）。

## 媒体服务 Compose

以下五套 Compose 模板默认采用上游推荐端口，并通过 `.env` 文件注入路径、UID/GID 与账号凭据。你可以直接[下载全部 10 套 Compose 示例与说明](/examples/debnas-compose.zip)（容器面板、照片与网络工具的另外五套配置见 [安装篇的配套 Compose](/posts/debnas-installation-notes/#配套-compose管理照片与网络)）。

部署每个服务前，先在对应目录复制环境变量模板并填好实际参数，校验无误后启动：

```bash
cp -n env.example .env
# 编辑 .env 填入实际路径、UID/GID 与密码后启动
docker compose up -d
```

### MoviePilot V3

采用官方单容器方案（WebUI 端口 `3000`，后端 API 端口 `3001`，内置 SQLite 与内存缓存）。文件下载：[Compose](/examples/debnas/moviepilot/compose.yaml) · [env.example](/examples/debnas/moviepilot/env.example) · [官方安装说明](https://github.com/jxxghp/MoviePilot-Wiki/blob/main/install.md)

```yaml
services:
  moviepilot:
    image: jxxghp/moviepilot-v3:latest
    container_name: moviepilot-v3
    restart: always
    stop_grace_period: 120s
    ports:
      - 3000:3000
      - 3001:3001
    volumes:
      - ./config:/config
      - ${MEDIA_ROOT:?Set MEDIA_ROOT in .env}:/data
      - ${CLOUD_MEDIA_ROOT:?Set CLOUD_MEDIA_ROOT in .env}:/cloud
    environment:
      NGINX_PORT: "3000"
      PORT: "3001"
      PUID: ${PUID:?Set PUID in .env}
      PGID: ${PGID:?Set PGID in .env}
      TZ: Asia/Shanghai
    networks:
      - media
networks:
  media:
    external: true
```

环境变量模板 `env.example`：

```dotenv
PUID=
PGID=
MEDIA_ROOT=/path/to/data
CLOUD_MEDIA_ROOT=/path/to/cloud
```

启动后访问 `http://NAS_IP:3000` 完成初始化。本地下载源填 `/data/downloads`，本地媒体库填 `/data/library`，云盘挂载目标填 `/cloud`。浏览器数据等目录结构以 V3 的 [启动与数据说明](https://github.com/jxxghp/MoviePilot/blob/v3/docs/docker-startup.md) 为准。

### qBittorrent

采用 LinuxServer 镜像（WebUI 端口 `8080`，BT 监听端口 `6881` TCP/UDP）。文件下载：[Compose](/examples/debnas/qbittorrent/compose.yaml) · [env.example](/examples/debnas/qbittorrent/env.example) · [镜像说明](https://docs.linuxserver.io/images/docker-qbittorrent/)

```yaml
services:
  qbittorrent:
    image: lscr.io/linuxserver/qbittorrent:latest
    container_name: qbittorrent
    restart: unless-stopped
    environment:
      PUID: ${PUID:?Set PUID in .env}
      PGID: ${PGID:?Set PGID in .env}
      TZ: Etc/UTC
      WEBUI_PORT: "8080"
      TORRENTING_PORT: "6881"
    volumes:
      - ./config:/config
      - ${MEDIA_ROOT:?Set MEDIA_ROOT in .env}:/data
    ports:
      - 8080:8080
      - 6881:6881
      - 6881:6881/udp
    networks:
      - media
networks:
  media:
    external: true
```

环境变量模板 `env.example`：

```dotenv
PUID=
PGID=
MEDIA_ROOT=/path/to/data
```

首次启动后通过 `docker compose logs qbittorrent` 查看临时初始密码，登录 `http://NAS_IP:8080` 修改密码，并将默认保存路径设为 `/data/downloads`。

### Transmission

采用 LinuxServer 镜像（RPC/WebUI 端口 `9091`，BT 端口 `51413` TCP/UDP），可与 qBittorrent 二选一或同时使用。文件下载：[Compose](/examples/debnas/transmission/compose.yaml) · [env.example](/examples/debnas/transmission/env.example) · [镜像说明](https://docs.linuxserver.io/images/docker-transmission/)

```yaml
services:
  transmission:
    image: lscr.io/linuxserver/transmission:latest
    container_name: transmission
    restart: unless-stopped
    environment:
      PUID: ${PUID:?Set PUID in .env}
      PGID: ${PGID:?Set PGID in .env}
      TZ: Etc/UTC
      USER: ${TR_USER:?Set TR_USER in .env}
      PASS: ${TR_PASSWORD:?Set TR_PASSWORD in .env}
    volumes:
      - ./config:/config
      - ./watch:/watch
      - ${MEDIA_ROOT:?Set MEDIA_ROOT in .env}:/data
    ports:
      - 9091:9091
      - 51413:51413
      - 51413:51413/udp
    networks:
      - media
networks:
  media:
    external: true
```

环境变量模板 `env.example`：

```dotenv
PUID=
PGID=
TR_USER=
TR_PASSWORD=
MEDIA_ROOT=/path/to/data
```

下载目录同样设置为 `/data/downloads`，`./watch` 可用于自动监控并添加放入其中的 `.torrent` 文件。

### CMS

采用官方推荐配置（后台管理端口 `9527`，Emby 302 反代端口 `9096`）。文件下载：[Compose](/examples/debnas/cloud-media-sync/compose.yaml) · [env.example](/examples/debnas/cloud-media-sync/env.example) · [官方安装说明](https://docs.cmscc.cc/install)

```yaml
services:
  cloud-media-sync:
    privileged: true
    container_name: cloud-media-sync
    image: imaliang/cloud-media-sync:latest
    restart: always
    volumes:
      - ./config:/config
      - ./logs:/logs
      - ./cache:/var/cache/nginx/emby
      - ${STRM_ROOT:?Set STRM_ROOT in .env}:/media
    ports:
      - 9527:9527
      - 9096:9096
    environment:
      PUID: ${PUID:?Set PUID in .env}
      PGID: ${PGID:?Set PGID in .env}
      UMASK: "022"
      TZ: Asia/Shanghai
      RUN_ENV: online
      ADMIN_USERNAME: ${CMS_ADMIN_USERNAME:?Set CMS_ADMIN_USERNAME in .env}
      ADMIN_PASSWORD: ${CMS_ADMIN_PASSWORD:?Set CMS_ADMIN_PASSWORD in .env}
      CMS_API_TOKEN: ${CMS_API_TOKEN:?Set CMS_API_TOKEN in .env}
      EMBY_HOST_PORT: http://emby:8096
      EMBY_API_KEY: ${EMBY_API_KEY:?Set EMBY_API_KEY in .env}
      DONATE_CODE: ${CMS_DONATE_CODE:?Set CMS_DONATE_CODE in .env}
    networks:
      - media
networks:
  media:
    external: true
```

环境变量模板 `env.example`：

```dotenv
PUID=
PGID=
CMS_ADMIN_USERNAME=
CMS_ADMIN_PASSWORD=
CMS_API_TOKEN=
EMBY_API_KEY=
CMS_DONATE_CODE=
STRM_ROOT=/path/to/strm
```

在 `.env` 中填入管理密码、API Token、Emby API Key 与捐赠授权码。配置保留了上游示例的 `privileged: true`，内部通过 `http://emby:8096` 对接 Emby，路径替换规则设为 `/media → /strm`。

### Emby

默认开放 HTTP `8096` 与 HTTPS `8920` 端口，同时挂载本地媒体库 `/data/library` 与云端 STRM 库 `/strm`。文件下载：[Compose](/examples/debnas/emby/compose.yaml) · [env.example](/examples/debnas/emby/env.example) · [官方镜像](https://hub.docker.com/r/emby/embyserver)

```yaml
services:
  emby:
    image: emby/embyserver:latest
    container_name: embyserver
    restart: on-failure
    environment:
      UID: ${EMBY_UID:?Set EMBY_UID in .env}
      GID: ${EMBY_GID:?Set EMBY_GID in .env}
      GIDLIST: ${EMBY_GIDLIST:?Set EMBY_GIDLIST in .env}
    volumes:
      - ./config:/config
      - ${MEDIA_ROOT:?Set MEDIA_ROOT in .env}/library:/data/library:ro
      - ${STRM_ROOT:?Set STRM_ROOT in .env}:/strm:ro
    ports:
      - 8096:8096
      - 8920:8920
    networks:
      - media
networks:
  media:
    external: true
```

环境变量模板 `env.example`：

```dotenv
EMBY_UID=
EMBY_GID=
EMBY_GIDLIST=
MEDIA_ROOT=/path/to/data
STRM_ROOT=/path/to/strm
```

启动后访问 `http://NAS_IP:8096` 完成向导。如需启用硬件解码，再按宿主机显卡类型将 `/dev/dri` 及渲染组 ID 加入配置。

## 媒体库设置、客户端与远程访问

### Emby 媒体库与神医助手

建议在 Emby 中将本地电影、本地剧集、云端电影、云端剧集分别建库，方便核对各自的路径与扫描状态。若 MoviePilot 或 CMS 已经生成了完备的 NFO 与海报，可在 Emby 媒体库设置中关闭重复刮削写入，直接读取本地元数据。

在基础播放跑通后，可按需安装 [Emby 神医助手（StrmAssistant）](https://github.com/sjtuross/StrmAssistant) 插件，用于提取 STRM 媒体信息（音轨、分辨率、编码）、扫描外挂字幕以及优化中文搜索。注意云盘媒体库开启媒体信息提取或视频预览图生成时会实际请求云端视频片段，建议合理控制扫描任务频率。

播放时可在 Emby 后台面板观察会话状态：

- **直接播放（Direct Play）**：客户端原生支持当前视频封装与编码，无服务端转码开销；配合 302 直链时，视频流直接由客户端从网盘拉取。
- **直接串流（Direct Stream）**：视频流不重编码，仅由服务端实时转换容器封装或音轨。
- **转码（Transcoding）**：因客户端兼容或带宽限制由 NAS 重新编码视频，需消耗 CPU 或核显资源。

### 各平台播放客户端

根据终端设备选择支持 Emby 协议及 STRM 302 重定向的客户端：

- **[Yamby](https://play.google.com/store/apps/details?id=com.hush.yamby)**：Android 手机与平板端常用的第三方 Emby 客户端，支持 STRM 直连播放与多服切换。
- **[Infuse](https://firecore.com/infuse)**：Apple 生态（iOS / iPadOS / tvOS / macOS）主力播放器，支持直连 Emby 媒体库并同步播放进度。
- **[SenPlayer](https://apps.apple.com/cn/app/id6443975850)**：支持 iPhone、iPad、Mac 与 Apple TV，具备 Emby 连接与画质调节功能。
- **[FloePlayer](https://t.me/FloePlayer)**：提供桌面端版本并支持 Emby 接入，可从官方频道获取更新。
- **小幻影视、iPlay**：跨平台 Emby 客户端候选，下载时注意核对发布者与所用版本的 STRM 支持情况。

添加服务器时，若使用 CMS 的 302 反代功能，客户端连接地址应填写 CMS 的 `9096` 端口入口。测试时完整走一遍外挂字幕加载、多音轨切换、大幅拖动进度条以及暂停续播，确认播放记录能正常回传至 Emby。

### CloudDrive2 与外网访问方案

路线三若通过 [CloudDrive2](https://www.clouddrive2.com/) 挂载网盘（第三方安装脚本参考 [sublaim/clouddrive2](https://github.com/sublaim/clouddrive2)），当 CloudDrive2 重启或重连挂载后，需重启依赖该挂载点的 MoviePilot 容器以刷新 Docker 绑定挂载（原理与处理方式见安装篇 [CloudDrive2 挂载与容器恢复](/posts/debnas-installation-notes/#clouddrive2-挂载与容器恢复)）。

需要在外网观看时，可根据家庭宽带条件选择接入方案：

| 工具      | 适用场景                                   | 配置要点                                          |
| --------- | ------------------------------------------ | ------------------------------------------------- |
| Tailscale | 无公网 IP，授权自用设备组网访问            | 客户端登录同一网络后，直接通过组网 IP 访问        |
| ZeroTier  | 无公网 IP，自建虚拟局域网                  | 确认控制器成员授权、路由规则及直连状态            |
| Lucky     | 拥有公网 IPv4 / IPv6，配置域名反代与 HTTPS | 内置 DDNS、证书申请与反向代理，仅对外暴露观影端口 |
| ddns-go   | 仅需将动态公网 IP 解析至域名               | 若已用 Lucky 维护同一域名 DDNS，则无需重复运行    |

对外暴露服务时，建议仅开放 Emby（或 CMS 302 入口）端口，并将日常观影账户与管理员账户分离；下载器、MoviePilot 和 CMS 管理后台仅限局域网或 Tailscale 私网访问。同时注意外网播放 STRM 时，重定向后的地址不能是 `127.0.0.1` 或容器内部主机名，且宿主机与容器防火墙规则应按 [防火墙、系统更新与持久日志](/posts/debnas-installation-notes/#防火墙系统更新与持久日志) 核对放行范围。

## 联调顺序与常见问题排查

### 分步接入与备份要点

部署或改动配置时，建议按以下顺序逐项联调：

1. **核对挂载与网络**：确认宿主机数据盘与云盘挂载就绪，`media` 网络已创建，各服务 `.env` 变量已填好。
2. **验证路线一（本地）**：下载一部测试视频，确认下载器保种、MoviePilot 硬链接整理至 `/data/library`、Emby 入库播放全流程打通。
3. **验证路线二（115 直转）**：在 115 转存一部影片，确认 CMS 整理、本地 `/strm` 生成以及 Emby 302 播放正常。
4. **验证路线三（本地上传网盘）**：通过 MoviePilot 将本地视频复制整理至网盘，待上传完毕后由 CMS 同步生成 STRM 并验证播放。
5. **验证外网与重启恢复**：在移动网络下测试播放与拖动，重启 NAS 后确认磁盘挂载、CloudDrive2 与各容器自动恢复。

日常备份需覆盖各项目的 `compose.yaml`、`.env`、MoviePilot 配置与站点数据、下载器种子状态（`BT_backup` 等）、CMS 配置以及 Emby 数据库。升级镜像前记录当前版本号，并在停止写入后归档数据库。

### 常见故障排查

- **订阅未触发下载**：检查 MoviePilot 站点连通性、Cookie 状态、订阅规则过滤条件及匹配日志。
- **下载完成但未自动整理**：检查下载器分类与保存路径是否与 MoviePilot 监控目录一致，确认容器内 `/data` 路径映射无误。
- **硬链接失败退化为复制（`EXDEV`）**：检查下载目录与媒体库目录是否跨盘，或容器内是否被拆成了两个独立的挂载点。
- **115 有文件但未生成 STRM**：检查 CMS 同步目录 CID 范围、全量/增量同步日志及 `/media` 目录写入权限；网盘内直接改名的文件需手动同步。
- **已生成 STRM 但 Emby 未入库**：检查 Emby 容器 `/strm` 挂载路径、媒体库类型以及 CMS 通知中的路径替换规则（`/media → /strm`）。
- **Emby 有海报但播放报错**：检查客户端连接的是 Emby 原生端口还是 CMS `9096` 端口，核对 115 账号登录态、直链有效期及外网重定向地址可达性。
- **同一影片出现重复条目或被反复移动**：确认 Emby 未将 `/data/downloads` 加入扫描，且没有同时对同一网盘目录开启 MoviePilot 整理与 CMS 自动整理。

## 参考资料

### 基础环境与核心服务

- [DebNAS 安装及折腾记录](/posts/debnas-installation-notes/)：系统、存储、网络与维护的配套说明。
- [DebNAS 文档](https://kekylin.github.io/debnas-docs/)：kekylin 的 Debian HomeNAS 方案。
- [MoviePilot 官方安装说明](https://wiki.movie-pilot.org/install)、[文件整理说明](https://wiki.movie-pilot.org/reorganize) 与 [MoviePilot V3 镜像](https://hub.docker.com/r/jxxghp/moviepilot-v3)；原收藏的 [jxxghp/moviepilot 镜像](https://hub.docker.com/r/jxxghp/moviepilot) 保留作旧版入口。
- [CMS 文档仓库](https://github.com/imaliang/cms-docs) 与 [CMSHelp](https://github.com/guyue2005/CMSHelp)：核对整理、同步和 STRM 相关设置，注意各页面对应的版本。
- CMS：[安装与基础配置](https://docs.cmscc.cc/install)、[全量同步](https://docs.cmscc.cc/docs/full-sync)、[自动整理](https://docs.cmscc.cc/docs/auto-organize) 与 [核心配置中的 Emby 路径替换](https://github.com/guyue2005/CMSHelp/wiki/7.-%E6%A0%B8%E5%BF%83%E9%85%8D%E7%BD%AE)。
- [Emby STRM 文档](https://emby.media/support/articles/Strm-Files.html) 与 [播放方式说明](https://emby.media/support/articles/DirectPlay-Stream-Transcoding.html)。
- [FrozenGEE/compose](https://github.com/FrozenGEE/compose)：容器配置模板与参数参考，使用前调整路径、权限和网络方式。
- [Windows-MoviePilot 发布页](https://github.com/developer-wlj/Windows-MoviePilot/releases)：第三方 Windows 工具，保留作其他设备的参考。

### 下载器与管理界面

- [qBittorrent 官网](https://www.qbittorrent.org/) 与 [Transmission 下载页](https://transmissionbt.com/download)。
- [TrguiNG 上游](https://github.com/openscopeproject/TrguiNG) 与 [jayzcoder 汉化增强分支](https://github.com/jayzcoder/TrguiNG)：Transmission 远程管理界面。
- [Transmission Web Control](https://github.com/ronggang/transmission-web-control) 及其 [Windows 安装说明](https://github.com/ronggang/transmission-web-control/wiki/Windows-Installation-CN)：已归档的旧方案资料。
- 暮城：[《Transmission 配置文件参数中文详细解释》](https://cloud.tencent.com/developer/article/1966381)，腾讯云开发者社区（2022 年）。
- [Transmission bug 排查讨论](https://forum.transmissionbt.com/viewtopic.php?t=18976)：故障排查参考。

### 网络与组合方案

- [Lucky 项目](https://github.com/gdy666/lucky) 与 [官方网站](https://lucky666.cn/)、[ddns-go](https://github.com/jeessy2/ddns-go)、[Tailscale 连接类型说明](https://tailscale.com/kb/1257/connection-types)、[ZeroTier 文档](https://docs.zerotier.com/what/)。
- [劲折腾的磕巴白菜](https://hi.keba.host/)：NAS、Emby、MoviePilot 与 Compose 相关实践文章。
