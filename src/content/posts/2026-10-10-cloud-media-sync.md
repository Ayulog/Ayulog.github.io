---
title: Cloud Media Sync：同步 115 媒体库与 Emby 302 播放
description: 在 NAS 上部署 Cloud-Media-Sync，配置 115 登录、STRM 全量与增量同步、Emby 路径映射和 302 播放，整理自动分类、MoviePilot 分工及常见问题。
author: Ayulog
pubDatetime: "2026-10-10T12:00:00+08:00"
draft: false
setupCategory: nas
tags:
  - CMS
  - NAS
  - Docker
  - "115"
  - STRM
  - Emby
---

[Cloud-Media-Sync（CMS）][cms-docs] 读取网盘目录，在本地生成 STRM，让 Emby 扫描这些小文件，播放时再获取远端视频。这里记录 **115 → CMS → Emby** 的部署、同步与 302 播放。

如果需要本地文件系统路径，可以走 [CloudDrive2 挂载](/posts/2026-10-10-cloud-storage-local-mount/)；两种接法不要混用目录。Emby 自身配置见 [Emby 教程](/posts/2026-10-10-emby-guide/)，其他工具见 [NAS 总篇](/posts/2026-10-09-nas-software-websites/)。

当前官方安装说明将 `DONATE_CODE` 列为必填，并限定个人测试、局域网使用，禁止公网部署及商业行为。部署前核对[当前授权条件][cms-install]，旧教程里没有捐赠码的 Compose 不能直接沿用。

## 目录

- [CMS、STRM 和 302 各自负责什么](#cmsstrm-和-302-各自负责什么)
- [准备目录、账号与 Emby](#准备目录账号与-emby)
- [用 Docker Compose 部署 CMS](#用-docker-compose-部署-cms)
- [登录 115 并配置 STRM](#登录-115-并配置-strm)
- [先完成一次全量同步](#先完成一次全量同步)
- [让 Emby 读取 STRM 并验证 302](#让-emby-读取-strm-并验证-302)
- [增量同步与自动整理](#增量同步与自动整理)
- [更新、备份与日常维护](#更新备份与日常维护)
- [常见问题](#常见问题)
- [参考资料](#参考资料)

## CMS、STRM 和 302 各自负责什么

**STRM 是保存媒体地址或文件路径的文本文件。** 它占用空间很小，可以按影片和剧集命名，让媒体服务器识别；真正的视频仍然保存在网盘里。删除网盘原文件、登录失效或链接不可达时，本地保留 STRM 也不能继续播放原片。

CMS 负责把选定网盘目录同步成本地 STRM，并按配置下载已有的字幕、图片和 NFO 等文件。它还提供自动整理和 Emby 302 代理入口，这些是可以分别配置的功能。

| 环节         | 主要工作                              | 得到的结果                 |
| ------------ | ------------------------------------- | -------------------------- |
| 115          | 保存视频和相关文件                    | 云端媒体目录               |
| CMS 同步     | 读取目录、生成 STRM、下载选定附件     | NAS 上可供扫描的媒体目录   |
| Emby         | 扫描 STRM、识别影片、读取或刮削元数据 | 海报墙、媒体详情和播放记录 |
| CMS 302 代理 | 在适配的播放请求中返回重定向地址      | 播放器按地址向网盘取流     |

理想的直连播放路径如下，实际是否走这条路径还要验证：

```text
同步入库：115 媒体目录 → CMS → 本地 STRM / 字幕 / 元数据 → Emby

播放请求：播放器 → CMS 的 Emby 代理入口 → 获取网盘播放地址
视频取流：播放器 → 网盘
```

**生成 STRM 不等于已经实现 302。** 如果播放走了 Emby 转发或转码，视频流量仍可能经过 NAS；播放器也必须能访问跳转后的地址，并支持相应格式、请求条件和重定向。

减少视频流量经过 NAS，可以降低 NAS 的转发负担，但不能消除网盘限速、客户端网络和解码能力的限制。同步目录、提取媒体信息、字幕读取等操作也仍可能请求网盘，不能把 CMS 当作“不会触发风控”的保证。

如果需要把网盘呈现为普通文件夹或盘符，可以选择 CloudDrive2 或 WebDAV 等挂载方案。CMS 直接连接 115 生成 STRM 时，不要求先安装 CloudDrive2；挂载上传是另一环节。

## 准备目录、账号与 Emby

先准备好 Docker Compose、可正常使用的 115 账号、当前版本所需的 CMS 授权，以及一个能正常访问的 Emby 服务。Emby 中先创建一枚供 CMS 使用的 API 密钥，后面填入本机配置。

下面把 CMS 配置与 STRM 输出分开：

```text
/path/to/docker/cms/
├── compose.yaml
├── .env
├── config/
├── logs/
└── cache/

/path/to/strm/       # 本地 STRM、字幕和元数据的输出目录
```

`/path/to/...` 都是**宿主机绝对路径占位符**，使用时换成 NAS 文件管理器或 SSH 中查到的真实路径。这里的 `strm` 是普通本地目录，不是 CloudDrive2 挂载点，也不放视频原片。

本文沿用本站媒体工作流的路径约定：

| 同一份目录 | 宿主机          | CMS 容器内 | Emby 容器内 |
| ---------- | --------------- | ---------- | ----------- |
| STRM 输出  | `/path/to/strm` | `/media`   | `/strm`     |

因此，CMS 生成的 `/media/movies/示例电影.strm`，在 Emby 中应当对应 `/strm/movies/示例电影.strm`。**两边必须映射同一个宿主机目录**；仅让容器内目录名字相同，不能共享文件。

NAS 上的 CMS 进程需要写入配置、日志、缓存和 STRM 目录；Emby 至少要能读取 STRM。`PUID`、`PGID` 按自己的服务账号与目录权限填写，不必为了套用教程把所有目录都开放给所有用户。

## 用 Docker Compose 部署 CMS

### 保存 Compose 与环境变量

在前面准备的 CMS 文件夹中保存 `compose.yaml`。这份配置与本站[媒体服务 Compose](/posts/2026-10-09-debnas-media-workflow/#媒体服务-compose)采用相同的 `media` 共享网络和路径。

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
      - "9527:9527"
      - "9096:9096"
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

同目录创建 `.env`，填完空值后再启动：

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

也可以下载现有的 [compose.yaml](/examples/debnas/cloud-media-sync/compose.yaml) 和 [env.example](/examples/debnas/cloud-media-sync/env.example)，将 `env.example` 复制为 `.env` 后填写。

几项凭据的用途不同：

- `CMS_ADMIN_USERNAME`、`CMS_ADMIN_PASSWORD`：CMS 后台的登录账号和密码。
- `CMS_API_TOKEN`：自己设置的独立随机令牌，供 CMS 接口或通知集成使用。
- `EMBY_API_KEY`：从 Emby 创建的 API 密钥，用于 CMS 访问 Emby。
- `CMS_DONATE_CODE`：当前 CMS 版本要求的授权码，传入容器后变量名是 `DONATE_CODE`。

它们不能互相代替。真实值只保留在本机 `.env` 和备份中，不上传公开仓库或截图。

`privileged: true` 沿用当前官方安装模板，会给容器较多宿主权限；部署时结合所用版本确认需求，不要因此给其他容器一并开启特权模式。这里使用端口映射，未设置 `network_mode: host`，不要再把旧教程的 host 模式与 `ports` 混在一起。

### 让 CMS 能访问现有 Emby

`http://emby:8096` 中的 `emby` 是 Docker 网络内的服务名。使用这份配置时，需要满足：

1. 已经创建名为 `media` 的 Docker 网络。
2. Emby 也加入该网络，并可通过服务名或网络别名 `emby` 访问。
3. Emby 在容器内监听 `8096`。

先运行 `docker network inspect media` 检查。网络不存在时，创建一次即可：

```bash
docker network create media
```

本站现有的 CMS 与 Emby 模板已经声明这个外部网络。已有其他 Emby Compose 时，在保留原有卷、端口和设备设置的基础上加入共同网络；两个独立的 Compose 项目不会自动共享默认网络。

如果 Emby 使用 host 模式、原生套件，或暂时不方便加入该网络，就把 `EMBY_HOST_PORT` 改为 CMS 容器能够访问的 NAS 局域网地址，例如 `http://NAS_IP:8096`。这是示例地址，应替换为实际地址。不要在桥接容器中填写 `http://127.0.0.1:8096`，它指向 CMS 容器自己。

### 启动并区分三个入口

进入保存配置的 CMS 文件夹，执行：

```bash
docker compose config --quiet
docker compose pull
docker compose up -d
docker compose ps
docker compose logs --tail=100 cloud-media-sync
```

`config --quiet` 用于检查 Compose 和变量是否完整，不会启动服务。启动后检查日志中的版本、授权校验和错误信息。

| 地址                 | 用途                                           |
| -------------------- | ---------------------------------------------- |
| `http://NAS_IP:9527` | CMS 管理后台，以及生成的 STRM 所使用的服务入口 |
| `http://NAS_IP:8096` | Emby 原始入口，具体端口取决于现有部署          |
| `http://NAS_IP:9096` | CMS 集成的 Emby 302 代理入口                   |

将 `NAS_IP` 换成实际局域网地址。本文按官方使用范围在局域网内配置，不把这几个端口映射到公网。

能打开 `9527` 只说明 CMS 管理服务可达；能打开 `9096` 的 Emby 页面，也还需要继续验证视频播放。

## 登录 115 并配置 STRM

### 扫码登录

进入 **核心配置 → 115 账号**，按当前界面的设备类型提示扫码授权，优先使用 CMS 自带的登录流程。选择不与日常客户端频繁冲突的设备类型，并确认后台能够显示账号与容量信息，再保存配置。

手动填 Cookie 时，登录设备类型和 Cookie 不匹配可能导致异常。后续登录失效，先在这里重新核对会话，不要反复运行全量同步来解决认证问题。

增量同步依赖 115 的**生活事件／最近操作记录**，需要在 115 中保持相关记录开启。首次接入前了解记录范围；如果还运行着其他依赖这些事件的工具，不要直接照旧教程清空全部历史记录。

### 填写 STRM 服务地址

在 **核心配置 → STRM 配置**中，将“STRM 直连域名”设为实际可访问的 CMS 地址。本文局域网示例为：

```text
http://NAS_IP:9527
```

这里要填协议、主机地址和端口，不是只填一个 IP，也不是填 Emby 的 `8096` 或代理的 `9096`。保持 NAS 地址稳定，能减少地址变化后重新生成 STRM 的麻烦。

这个地址必须对实际读取它的程序可达。使用 NAS 局域网地址，便于 Emby 容器和局域网客户端共同访问；`cloud-media-sync` 这样的 Docker 服务名通常只有同一网络内的容器能够解析，手机和电视未必能用。

STRM 具体路径和文件标识交给 CMS 生成，不手动拼接接口，也不把浏览器里复制到的临时网盘下载 URL 当作长期内容。

CMSHelp 提到 `pick_code_name` 格式；是否选用，以当前版本提供的选项和播放器兼容性测试为准。修改服务地址或直连格式后，要检查已有 STRM 的实际内容，按当前版本的覆盖生成方式更新，不能只改设置就假定所有旧文件已经变化。

## 先完成一次全量同步

第一次先选只有少量电影或剧集的测试目录。确认视频已经完整保存到 115，再让 CMS 处理它。

### 云端 CID 与本地路径分开填

**CID 是 115 文件夹的标识，不是 NAS 路径。** 可以从 115 网页目录链接或 CMS 当前界面的目录选择功能核对；不要把示例 CID、父目录或文件自身 ID 混用。

配置全量同步时，重点检查以下项目，具体字段名以当前页面为准：

| 项目                 | 填写思路                                                            |
| -------------------- | ------------------------------------------------------------------- |
| 云端目录             | 选定已经整理好的媒体目录，核对对应 CID                              |
| 本地输出目录         | 使用 CMS 容器内路径，如 `/media/movies`，不要填宿主机路径           |
| 视频后缀             | 按实际资源选择，如 `mkv`、`mp4`；视频生成 STRM                      |
| 字幕、元数据后缀     | 按需要选择 `srt`、`ass`、`nfo`、`jpg`、`png` 等，相关文件下载到本地 |
| 文件已存在时如何处理 | 首次用独立测试目录，之后按是否需要更新链接决定覆盖策略              |

上游把全量同步定义为：视频生成 STRM，选定的图片、字幕和 NFO 等下载到本地。它不会把视频原片完整下载到 NAS，也不表示会自动补齐云端原本没有的海报与 NFO；缺失元数据仍需由 Emby 等工具刮削。

保存配置后执行一次全量同步，观察日志直到完成。有多个媒体目录时，按官方建议逐个执行，等待当前目录完成后再开始下一个。

### 用实际输出验收

先在 NAS 文件管理器中核对 `/path/to/strm`，再看 CMS 容器内的 `/media`。假设输出结构如下：

```text
/path/to/strm/
├── movies/
│   └── 示例电影 (2024)/
│       ├── 示例电影 (2024).strm
│       └── 示例电影 (2024).chs.srt
└── tv/
    └── 示例剧集 (2024)/
        └── Season 01/
            └── 示例剧集 - S01E01.strm
```

这是目录示意，不是 CMS 固定生成的唯一结构；实际结果取决于云端目录和同步设置。用文本编辑器打开一份 STRM，检查服务地址是否正确、文件是否为空，再确认字幕和影片名称对应。

先证明“云端文件 → 本地 STRM”这一段成功，再继续入库，排错会更直接。

## 让 Emby 读取 STRM 并验证 302

### 给 Emby 增加目录映射

在现有 Emby 的 `volumes` 中增加同一个宿主机目录，例如：

```yaml
volumes:
  # 保留原有配置目录和媒体目录映射，再增加这一行。
  - /path/to/strm:/strm:ro
```

这里只展示需要合并的片段，不是完整 Emby Compose。修改后重新应用 Emby 配置，让容器获得新映射，再在媒体库中选择实际的 `/strm/movies`、`/strm/tv` 等目录，分别使用电影和电视剧类型。

示例给 Emby 只读权限，适合读取 CMS 下载好的附件。需要让 Emby 把 NFO 或图片保存到这些媒体目录时，再按需求开放写入权限并明确元数据由谁维护；只读映射下不能期待 Emby 写回文件。

### 配置入库刷新路径

CMS 与 Emby 的容器内路径不同，需要在 CMS 的 **Emby 入库刷新**中设置路径替换：

```text
/media#/strm
```

按照 [CMSHelp 核心配置说明][cms-core]，`#` 左边是 CMS 看到的路径，右边是 Emby 看到的对应路径。两边路径一致时可以留空；本文两边都是 Linux 容器，采用 Unix 路径风格。

这项设置用于把刷新通知中的路径转换给 Emby，**不会创建目录映射，也不会修改 STRM 内部播放地址**。目录不可见时，应先检查 Emby 的卷配置。

保存并启用刷新设置，首次手动扫描一次 Emby 媒体库，核对标题、季集、字幕和元数据。看到海报以后还要点开播放。

### 从 9096 验证整条播放路径

在支持 Emby 的客户端中，用 `http://NAS_IP:9096` 添加服务器，使用 **Emby 账号**登录。它呈现的是代理后的 Emby 服务，不是 CMS 管理后台。

挑一部客户端本来就能直接播放的影片，依次验证：

1. 正常进入影片详情，开始播放。
2. 拖动进度条，暂停后恢复，确认不是只能播放开头。
3. 有外挂字幕时，切换字幕并核对显示。
4. 查看客户端播放信息、Emby 会话及 CMS 日志；必要时通过客户端网络请求检查是否收到重定向，以及后续媒体请求是否发往网盘。

Emby 显示“直接播放”并不能单独证明流量已经绕过 NAS，它主要反映是否需要转码。判断 302 是否生效，要看实际请求和取流地址。

如果客户端不支持视频、音频或字幕格式，可能需要转码，也可能无法按预期走直连。先用兼容性明确的文件排查地址与同步，再处理格式问题。

### 图片缓存与插件按需启用

CMS 提供可选环境变量 `IMAGE_CACHE_POLICY`，可加入前面的 `environment`。官方说明的含义是：

| 值  | 图片缓存方式                                               |
| --- | ---------------------------------------------------------- |
| `0` | 不同尺寸共用先缓存的图片，空间较省，但可能出现大屏图片模糊 |
| `1` | 不同尺寸分别缓存                                           |
| `2` | 移除 Emby 缩放参数，缓存原图，空间占用更大                 |
| `3` | 关闭 Nginx 图片缓存，不处理已有缓存文件                    |

这是海报等图片的缓存，不是影片原片缓存。先把基础播放跑通，再根据页面体验和磁盘占用调整。

[StrmAssistant（神医助手）][strmassistant]可增强媒体信息提取、字幕等功能，但不是生成 STRM 的必需组件。安装前核对它与当前 Emby 的兼容性；媒体探测、缩略图和片头片尾分析可能增加远端读取，按需启用即可。

## 增量同步与自动整理

### 全量同步成功后，再看增量

官方说明要求先完成一次全量同步，随后由增量任务处理已同步范围内的变动。正常使用不需要为了每次新增文件反复扫描整库。

先往测试目录新增一份文件，确认 115 生活事件有对应记录，等待 CMS 的增量任务，再依次检查 STRM 和 Emby 条目。这样可以区分是云端没有事件、CMS 没处理，还是 Emby 没刷新。

**115 文件重命名不会产生 CMS 所依赖的相应生活事件，不能指望增量同步自动更新所有名称变化。** 上游说明这通常不影响原有直连获取，但本地名称和目录仍应单独核对；需要更新时，按当前版本提供的同步或重建方式处理。

删除联动也先用测试文件验证。云端删除、本地 STRM 清理、Emby 删除以及插件的“深度删除”不是同一个动作；日常清理海报墙前，先确认有没有配置反向删除云端资源。

### 已整理的成品目录，直接同步即可

如果 MoviePilot 已经完成命名、分类和上传，CMS 可以只同步成品目录，避免两边同时改名移动。

```text
MoviePilot 整理并上传 → 确认云端文件完整 → CMS 同步 → Emby 入库
```

本地写入 CloudDrive2 挂载目录后，还要等实际上传完成；仅看本地复制结束，不一定说明网盘已收到完整文件。完整分工见[DebNAS 自动观影流程](/posts/2026-10-09-debnas-media-workflow/#moviepilot-v3-与-cms-如何配合)。

### 需要 CMS 自动整理时，再配置分类

通过转存或离线得到的散乱文件，可以交给 CMS 自动识别、重命名并移动到分类目录。[官方自动整理文档][cms-organize]要求先完成全量同步、创建二级分类策略，并把待整理文件夹放在同步媒体库之外。

可以按下面的关系规划云端目录：

```text
115/
├── 待整理/          # 在同步媒体库之外
├── 已存在/          # 接收被判定为重复的文件
├── 冗余/            # 接收未处理或整理后的剩余内容
└── 媒体库/          # 全量同步范围
    ├── 电影/
    └── 剧集/
```

“已存在”目录接收重复判定的结果，不是正常影片最终入库的总目录；分类策略中的目标 CID 才指向具体媒体分类。

配置顺序可以保持简单：

1. 按需完成 TMDB 配置，确认能够识别测试影片。
2. 完成目标媒体库的全量同步，让分类目标处于已同步范围内。
3. 填写待整理、已存在和冗余目录 CID。
4. 从电影、剧集两类开始设置二级分类，保留兜底规则。
5. 使用当前版本的默认命名规则或少量自定义规则，先处理一两部文件，检查影片识别、字幕和移动结果。
6. 基础流程稳定后，再增加复杂分类、多版本和洗版策略。

同一份文件由一个工具负责命名和移动。洗版会影响保留哪些版本，不宜在尚未确认分类与重复判定时直接套用复杂替换规则。

[CMSHelp][cms-organize-help]注明，**从 0.3.4 开始，新版自动整理已去除对 MoviePilot 的依赖**。旧截图中的 MP 2.0 地址、令牌配置不是当前独立整理的必经步骤；MoviePilot 仍然可以作为另一条路线里的订阅、下载与整理工具。

## 更新、备份与日常维护

备份至少保留 `compose.yaml`、本机 `.env`、CMS 的 `config` 目录，以及需要保留的本地字幕和元数据。STRM 虽然可以重新生成，保留副本仍方便恢复原有目录；仅备份 STRM 不能备份云端视频。

更新前记录当前版本或镜像摘要，确认备份可用，再在 CMS 目录运行：

```bash
docker compose pull
docker compose up -d
docker compose logs --tail=100 cloud-media-sync
```

`latest` 是可变标签，重新拉取可能改变版本、配置和授权行为。升级后重新检查登录状态、小目录同步和一部影片的播放；不要把旧镜像回退视为一定可用，版本有效期与数据兼容性仍要看上游说明。

后台日志、截图和 STRM 内容都可能包含账号信息、令牌或带签名的播放地址，分享排错资料前先遮盖这些值。

## 常见问题

| 现象                               | 优先检查                                                                              |
| ---------------------------------- | ------------------------------------------------------------------------------------- |
| Compose 提示变量缺失               | `.env` 是否与 Compose 放在同目录，必填值是否仍为空，NAS 项目管理界面是否加载了该文件  |
| 启动卡在授权校验                   | 授权码、系统时间、网络与 DNS，结合当前版本日志和官方 FAQ 判断                         |
| 出现 `this license key is expired` | 官方 FAQ 将这一报错归为版本过期，先按上游说明核对更新，不要直接认定为自己的捐赠码失效 |
| `9527` 能开，`9096` 打不开         | `9096` 端口映射与防火墙，`EMBY_HOST_PORT` 对 CMS 是否可达，共享网络与服务名是否正确   |
| 网盘有文件但没有 STRM              | 登录状态、CID、同步范围、视频后缀、任务结果，以及 `/media` 的写权限                   |
| STRM 已生成，Emby 看不到           | 是否映射了同一宿主机目录，媒体库路径、读取权限与 `/media#/strm` 是否匹配              |
| 有海报但不能播放                   | STRM 地址、115 会话、重定向后的地址与客户端格式支持；海报不证明原片可用               |
| 修改 STRM 地址后仍访问旧地址       | 已有 STRM 是否按当前版本的覆盖方式重新生成                                            |
| 增量没有处理新增文件               | 是否完成过全量同步，父目录是否在同步记录中，115 生活事件是否开启并有记录              |
| 改名后本地名称没更新               | 这类变化可能没有生活事件，需要另外核对同步或重建结果                                  |
| 自动整理提示目录不存在             | 分类 CID、全量同步范围、YAML 缩进和待整理目录位置                                     |
| 播放时 NAS 仍有较大流量            | 是否连接 `9096`，实际是否重定向，是否发生转码、媒体探测或其他后台任务                 |

按 **网盘文件 → CMS 同步 → 本地 STRM → Emby 入库 → 实际播放** 的顺序检查，每一步都能单独验证，通常比反复重装容器更容易定位问题。

## 参考资料

- [磕巴白菜：绿联新系统部署 CMS][keba-cms]：本文的参考起点，保留原作者与出处；旧版截图、接口和配置需与当前文档对照。
- [CMS 官方文档与安装说明][cms-install]：部署范围、授权、环境变量、STRM 地址和基础同步流程。
- [CMS 官方镜像说明][cms-image]：功能与镜像入口，部分示例早于当前安装文档。
- [CMS 全量同步][cms-full]：STRM 与附件的处理范围。
- [CMS 自动整理][cms-organize]：目录前提、二级分类、命名与洗版。
- [CMS 常见问题][cms-faq]：授权校验、版本过期、网络及整理故障。
- [CMSHelp 核心配置][cms-core]与[自动整理说明][cms-organize-help]：路径替换、刷新通知及版本差异。
- [StrmAssistant 项目][strmassistant]：Emby 媒体信息与字幕等增强功能。

[keba-cms]: https://hi.keba.host/archives/ugreen-cloud-media-sync
[cms-docs]: https://docs.cmscc.cc/
[cms-install]: https://docs.cmscc.cc/install
[cms-image]: https://hub.docker.com/r/imaliang/cloud-media-sync
[cms-full]: https://docs.cmscc.cc/docs/full-sync
[cms-organize]: https://docs.cmscc.cc/docs/auto-organize
[cms-faq]: https://docs.cmscc.cc/faq
[cms-core]: https://github.com/guyue2005/CMSHelp/wiki/7.-%E6%A0%B8%E5%BF%83%E9%85%8D%E7%BD%AE
[cms-organize-help]: https://github.com/guyue2005/CMSHelp/wiki/6.%E8%87%AA%E5%8A%A8%E6%95%B4%E7%90%86
[strmassistant]: https://github.com/sjtuross/StrmAssistant
