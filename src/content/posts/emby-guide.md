---
title: Emby：Docker 部署、媒体库与客户端设置
description: 用 Docker 部署 Emby，设置媒体库、刮削、硬件转码与客户端，并接入 MoviePilot 和 CMS。
author: Ayulog
pubDatetime: "2026-10-10T13:00:00+08:00"
draft: false
category: library
tags:
  - Emby
  - Docker
---

Emby 可将 NAS 上的电影和剧集整理成海报墙，统一管理多用户、观看记录与播放进度。本文使用 LinuxServer 维护的 Docker 镜像部署 Emby，涵盖目录权限、媒体库初始化、硬件转码及各平台客户端配置。

视频文件由 MoviePilot 整理入库，或由 CMS 生成 STRM 文件后，均可交给 Emby 扫描。完整自动化链路见 [DebNAS 自动观影流程](/posts/debnas-media-workflow/)，相关工具汇总在 [NAS 服务清单](/posts/nas-software-websites/)。

## 服务端、客户端与 Premiere 授权

| 组件          | 作用                                                 | 部署或安装位置                 |
| ------------- | ---------------------------------------------------- | ------------------------------ |
| Emby Server   | 扫描媒体、提供海报墙、管理用户与播放记录、按需转码   | NAS、长期运行的电脑或服务器    |
| Emby 客户端   | 连接服务端、浏览媒体库与播放视频                     | 手机、平板、电视、电脑或浏览器 |
| Emby Premiere | 解锁服务端硬件加速转码及官方客户端完整播放等高级功能 | 在 Emby Server 后台配置授权    |
| 第三方客户端  | 使用自带界面与播放内核直连 Emby                      | 按各应用支持的系统平台安装     |

Emby 本身仅负责媒体库管理与串流播放，已有本地视频即可直接建库。

在付费机制上，Emby Premiere 用于解锁服务端硬件加速转码与官方客户端播放限制；Infuse、VidHub、Yamby 等第三方播放器则采用各自独立的买断或订阅机制，与 Premiere 互不包含。购买前可对照 [Premiere 功能说明][premiere]及各客户端商店页面。

## 准备目录与权限

在 NAS 上安装 Docker 环境并固定局域网 IP；自建 Debian 系统可参照 [Docker 官方安装文档](https://docs.docker.com/engine/install/debian/)配置 Docker Engine 与 Compose 插件。

建议将容器配置与媒体数据分为以下目录结构：

```text
stacks/emby/
├── compose.yaml
├── .env
├── config/             # 数据库、账号、插件与服务设置
└── transcode/          # 临时转码缓存目录

data/
├── downloads/          # 下载与做种目录，不加入 Emby 媒体库
└── library/
    ├── movies/         # 整理后的电影
    └── tv/             # 整理后的剧集
```

`config` 目录会随媒体库元数据、海报和插件增长，`transcode` 目录在实时转码时也会产生较大缓存，两处均需预留充足的可用空间。

本文使用的 `lscr.io/linuxserver/emby` 镜像通过 `PUID` 和 `PGID` 指定容器内运行用户（详见[镜像说明][lsio]）。在支持 SSH 的系统中可执行以下命令查询服务账户的 UID 与 GID：

```bash
id <service-user>
```

将 `<service-user>` 替换为实际账户名，并确保该账户对 `config` 和 `transcode` 拥有读写权限，对媒体目录及上层父目录拥有读取和访问权限（若 NAS 启用了共享文件夹 ACL，需同步核对 ACL 权限）。

## 使用 Docker Compose 部署

### 镜像选择与权限变量

常用的两款 Emby 镜像使用的权限环境变量不同，部署或迁移时注意区分：

| 镜像                       | 权限变量                | 本站对应示例                |
| -------------------------- | ----------------------- | --------------------------- |
| `lscr.io/linuxserver/emby` | `PUID`、`PGID`          | 本文独立部署示例            |
| `emby/embyserver`          | `UID`、`GID`、`GIDLIST` | DebNAS 自动观影流程中的示例 |

### 编写 Compose 配置

1. 在项目目录创建 `.env`，填入服务账户的 `PUID`、`PGID` 以及宿主机数据根目录路径（其下应包含 `library/movies` 与 `library/tv`）：

   ```dotenv
   PUID=1000
   PGID=1000
   MEDIA_ROOT=/path/to/data
   ```

2. 在同一目录创建 `compose.yaml`：

   ```yaml
   services:
     emby:
       image: lscr.io/linuxserver/emby:latest
       restart: unless-stopped
       environment:
         PUID: ${PUID:?Set PUID in .env}
         PGID: ${PGID:?Set PGID in .env}
         TZ: Asia/Shanghai
       volumes:
         - ./config:/config
         - ./transcode:/transcode
         - ${MEDIA_ROOT:?Set MEDIA_ROOT in .env}/library:/data/library:ro
       ports:
         - "8096:8096"
   ```

配置要点说明：

- **网络与端口**：默认使用 bridge 网络并映射 `8096` HTTP 端口（若宿主机 `8096` 冲突，可改为 `"18096:8096"`）。若因局域网自动发现或 DLNA 改用 `network_mode: host`，需删去 `ports` 段（参见 [Docker host 网络说明][docker-host]）。`8920` 为 HTTPS 端口，需配置证书后才可使用，初次部署先通过局域网 HTTP 访问即可。
- **只读媒体挂载**：媒体目录挂载了 `:ro` 只读后缀，适合由 MoviePilot 等上游工具统一维护 NFO、海报与字幕。若希望让 Emby 将下载的字幕或元数据直接写回影片目录，需去掉 `:ro` 并授予服务账户写权限。
- **转码临时目录**：挂载 `/transcode` 后，还需在 Emby 后台的“转码”设置中将临时路径手动指定为 `/transcode`。

### 启动并查看日志

在项目目录先创建持久化文件夹并授予服务账户读写权限，再启动容器：

```bash
mkdir -p config transcode
docker compose config -q
docker compose pull
docker compose up -d
docker compose ps
docker compose logs --tail=100 emby
```

确认日志无持续报错后，在浏览器打开 `http://NAS_IP:8096`。若镜像拉取缓慢或报错，可参考 [Docker 镜像加速与拉取排查](/posts/docker-registry-mirrors/)。

## 初始化与媒体库设置

### 完成首次向导

1. 选择界面显示语言，创建服务端管理员账号与密码。
2. 添加电影库与剧集库，初期可先放入少量测试影片。
3. 设置元数据首选语言与地区（中文环境通常选 `Chinese` / `People's Republic of China`）。
4. 进入管理后台的**转码**页面，将转码临时目录设为 `/transcode`。
5. 按需为家人或日常观看创建普通本地用户，并分配对应媒体库的访问权限（局域网与自有域名直连使用本地账号即可，无需绑定 Emby Connect）。

### 媒体库路径配置

添加媒体库文件夹时，选择的是**容器内挂载路径** `/data/library`：

| 媒体库   | 内容类型 | Emby 中选择的目录      |
| -------- | -------- | ---------------------- |
| 本地电影 | 电影     | `/data/library/movies` |
| 本地剧集 | 电视节目 | `/data/library/tv`     |
| 动画电影 | 电影     | 对应的动画电影子目录   |
| 动画剧集 | 电视节目 | 对应的动画剧集子目录   |

动画电影与番剧连载应分别归入“电影”和“电视节目”库。若剧集目录下细分了 `tv/国产剧`、`tv/欧美剧` 等二级分类，按照 [Emby 剧集命名说明][tv-naming]，可在同一个剧集库中把这些二级分类目录逐一添加进去，使每个库路径直接指向各部剧集文件夹。

### 文件命名规范

清晰的目录层级与命名能显著提升刮削准确率：

```text
movies/
└── Movie Name (2024)/
    └── Movie Name (2024).mkv

tv/
└── Series Name (2024)/
    └── Season 01/
        ├── Series Name S01E01.mkv
        └── Series Name S01E02.mkv
```

电影目录和文件名保留片名与上映年份，剧集按 `Season XX` 分季并在文件名中标明 `S01E01` 季集号。个别影片识别有误时，针对单个条目使用“识别”功能手动填入 TMDB / IMDb ID 即可，避免对整库执行覆盖刷新。

### 元数据与海报刮削

根据上游工具的分工决定刮削策略：

- **仅有视频文件**：在 Emby 媒体库设置中启用 TMDB 等元数据与图片下载器，先用单部影片验证简介与海报获取情况。
- **上游已生成 NFO 与海报**：由 MoviePilot 或 CMS 负责刮削时，让 Emby 优先读取本地 NFO 与图片，减少重复在线请求。

若刮削不到海报，可检查容器日志中的 TMDB 连接状态与 DNS 解析；在容器内配置网络代理时，注意桥接模式下容器的 `127.0.0.1` 指向自身，需填写宿主机局域网 IP（如 `http://NAS_IP:7890`），并确保局域网内部流量不被代理误拦截。

## 接入 MoviePilot、CMS 与插件

### 创建 API 密钥并连接 MoviePilot

在 Emby 管理后台打开 **高级 → API 密钥**，按用途创建独立密钥（例如分别命名为 `MoviePilot` 和 `CMS`），填入对应工具的配置中。

MoviePilot 连接 Emby 时的地址取决于容器网络方式：

- **通过宿主机端口访问**：填写 `http://NAS_IP:8096`。
- **共用自定义 Docker 网络**：当两个容器加入同一个外部网络（如 `media`）时，可直接填写 `http://emby:8096`。

若需加入外部 `media` 网络，先确认或创建该网络：

```bash
docker network inspect media || docker network create media
```

再将网络配置合入 `compose.yaml`：

```yaml
services:
  emby:
    # 保留原有的 image、environment、volumes、ports 等配置
    networks:
      - media

networks:
  media:
    external: true
```

### 接入 CMS 生成的 STRM

CMS 会将网盘视频同步为本地 `.strm` 文本文件，交由 Emby 扫描入库。接入步骤如下：

1. 在 `.env` 中补充宿主机 STRM 目录路径：

   ```dotenv
   STRM_ROOT=/path/to/strm
   ```

2. 在 `compose.yaml` 的 `volumes` 下增加挂载：

   ```yaml
   - ${STRM_ROOT:?Set STRM_ROOT in .env}:/strm:ro
   ```

3. 执行 `docker compose up -d` 重建容器后，在 Emby 后台新增云端电影库（`/strm/movies`）与云端剧集库（`/strm/tv`）。若 CMS 容器内路径为 `/media`、Emby 容器内为 `/strm`，需在 CMS 入库刷新设置中配置 `/media#/strm` 路径替换。

注意：`.strm` 文件仅记录播放地址；实际播放时视频流是否绕过 NAS 直连网盘，取决于是否通过 CMS 的 Emby 302 代理端口（默认 `9096`）访问。建议将本地媒体库与云端 STRM 库分开建立，便于排查播放链路。

### StrmAssistant（神医助手）插件

[StrmAssistant（神医助手）][strmassistant]可为 Emby 补充媒体信息提取、外挂字幕扫描、章节预览图、搜索增强与替代 TMDB 地址等功能。先确认 Emby 基础播放正常，再对照插件文档核对当前 Emby 服务端版本适配情况。对云端 STRM 媒体库启用媒体信息提取或预览图生成时，注意控制任务执行频率，避免高频请求触发网盘风控。

<span id="emby-硬件转码"></span>

## 直接播放与硬件转码

### 播放模式与 Premiere 硬解要求

Emby 根据客户端解码能力与网络带宽自动选择三种播放方式：

| 播放方式                  | 服务端处理动作                        | 适用条件与负载                   |
| ------------------------- | ------------------------------------- | -------------------------------- |
| 直接播放（Direct Play）   | 原样输出视频、音频与字幕文件          | 客户端支持原封装与编码，负载最低 |
| 直接串流（Direct Stream） | 保留视频流不重编码，仅重封装或转音频  | 视频编码兼容但容器或音轨不兼容   |
| 转码（Transcoding）       | 重新编码视频流（或烧录图形/特效字幕） | 需调用 CPU 或 GPU 硬件加速       |

客户端能直接播放（Direct Play）时画质无损且不消耗 NAS 算力，无需强行开启转码。当客户端不支持某种编码（如 HEVC / AV1）、受限于外网带宽限速、或需要将 PGS 图形字幕烧录进画面时，服务端才会触发转码。

在 Emby 中，**开启 GPU 硬件加速转码需要有效的 [Emby Premiere][premiere] 授权**。

### Linux NAS 映射核显与启用验证

1. **检查宿主机核显设备**：在 Linux 终端确认 `/dev/dri` 节点存在：

   ```bash
   ls -l /dev/dri
   ```

2. **挂载设备节点**：在 `compose.yaml` 的 `services.emby` 下增加 `devices` 映射：

   ```yaml
   devices:
     - /dev/dri:/dev/dri
   ```

   LinuxServer 镜像在启动时会自动适配容器内运行用户对 `/dev/dri` 的访问权限（NVIDIA 独显则需安装宿主机驱动与 NVIDIA Container Toolkit，按 [LinuxServer NVIDIA 说明][lsio]配置运行时）。

3. **后台启用与实测**：重建容器后，在 Emby 管理后台打开发送端**转码**设置，将“启用硬件加速”设为“是”或“高级”，勾选硬件支持的解码/编码项与 HDR 色调映射。随后播放一段视频并在客户端手动调低画质档位触发转码，在后台“控制台 → 活动会话”中确认转码工序旁已显示硬件加速图标。测试完毕后将客户端画质恢复为原始质量。

## 各平台客户端选择

初次连接建议先使用 [Emby 官方客户端][emby-download]或网页端验证服务器与账号，再根据界面偏好和解码能力选用第三方客户端。

### Android 手机、平板与 Android TV

| 客户端          | 获取渠道与适用设备                                                                         | 特点说明                                            |
| --------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| Emby 官方客户端 | [官方下载页][emby-download]（区分 Android 移动版与 Android TV 版）                         | 原生适配服务端全部管理与播放功能                    |
| Yamby           | [Google Play](https://play.google.com/store/apps/details?id=com.hush.yamby)（手机 / 平板） | 第三方 Emby 客户端，基础功能免费，含应用内 PRO 解锁 |
| iPlay           | [saltpi/iPlay](https://github.com/saltpi/iPlay) 发布页                                     | 同时支持 Emby / Jellyfin，开源跨平台                |
| AfuseKt         | [移动版发布页](https://github.com/AttemptD/AfuseKt-release)（Android 8+）                  | 第三方 Emby 客户端，支持直连与海报墙                |
| AfuseKt TV      | [TV 版发布页](https://github.com/AttemptD/AfuseKtV-release)                                | 独立发布的电视端版本，针对遥控器交互适配            |

手动下载 APK 安装包时，需按设备系统实际支持的 [Android ABI 架构][android-abi]选择（不可仅凭内存大小判断，部分搭载 64 位芯片的电视盒子运行的是 32 位系统）：

| 架构标记         | 含义                  | 适用场景                                 |
| ---------------- | --------------------- | ---------------------------------------- |
| `arm64-v8a`      | 64 位 ARM             | 绝大多数现代 Android 手机与 64 位平板    |
| `armeabi-v7a`    | 32 位 ARM             | 部分智能电视、机顶盒及旧款设备           |
| `x86` / `x86_64` | 32 / 64 位 x86        | x86 架构设备或桌面模拟器                 |
| `universal`      | 打包多种 ABI 的通用包 | 体积较大，不确定架构但满足系统版本时选用 |

若已连接 ADB，可通过 `adb shell getprop ro.product.cpu.abilist` 查询设备支持的 ABI 列表。

### iPhone、iPad、Mac 与 Apple TV

| 客户端                                                  | 支持平台                                               | 特点说明                                             |
| ------------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------- |
| Emby 官方客户端                                         | [iOS / macOS / tvOS][emby-download]                    | 官方客户端，连接自有 Emby Server                     |
| [Infuse](https://firecore.com/infuse)                   | iPhone、iPad、Mac、Apple TV、Vision                    | 解码与杜比视界/全景声支持成熟，高级功能需 Infuse Pro |
| [VidHub](https://apps.apple.com/cn/app/id1659622164)    | iPhone、iPad、Mac、Apple TV                            | 支持 Emby 直连、网盘挂载与多端同步                   |
| [SenPlayer](https://apps.apple.com/cn/app/id6443975850) | iPhone、iPad、Mac、Apple TV                            | 支持 Emby / Jellyfin / Plex                          |
| [Filebar](https://apps.apple.com/cn/app/id1558391784)   | iPhone、iPad、Apple TV（兼容 Apple 芯片 Mac）          | 原名 Fileball，支持 Emby 接入与自定义播放器内核      |
| [Forward](https://apps.apple.com/cn/app/id6503940939)   | Apple 平台                                             | 支持 Emby 接入（以当前商店上架状态为准）             |
| [yybx](https://apps.apple.com/cn/app/id1519723194)      | iPhone、iPad、Apple TV（兼容 Apple 芯片 Mac）          | 轻量 Emby 客户端                                     |
| [iemc](https://apps.apple.com/cn/app/id1467462861)      | iPhone、iPad（兼容 Vision）                            | 支持 Emby / Jellyfin                                 |
| [Reflix](https://apps.apple.com/cn/app/id6621243955)    | iPhone、iPad、Apple TV（兼容 Apple 芯片 Mac / Vision） | 第三方私人 Emby 客户端                               |
| [HamHub](https://apps.apple.com/cn/app/id6458691598)    | iPhone、iPad、Mac、Apple TV                            | 支持 Emby 与网盘媒体库                               |
| [Conflux](https://apps.apple.com/cn/app/id6450330892)   | iPhone、iPad、Mac、Apple TV、Vision Pro                | 支持 Emby 与本地串流                                 |
| [iPlay](https://github.com/saltpi/iPlay)                | iOS、macOS、tvOS（从项目下载表进入对应商店）           | 跨平台客户端                                         |

挑选 Apple 端播放器时，除确认支持 Emby 协议外，建议重点对比 ASS 特效字幕渲染、字幕时间轴偏移调节、音轨切换、跨设备续播同步以及 Apple TV 遥控器操作手感。

### Windows 与桌面端

- **Emby 官方桌面端 / 网页端**：从[官方下载页][emby-download]获取 Emby Theater，或直接使用浏览器访问。
- **[iPlay](https://github.com/saltpi/iPlay)**：提供 Windows 安装包，支持 Emby 与 Jellyfin。
- **[Terminus Media Player（终点站）](https://github.com/Terminus-Media/jellyfin-media-player)**：基于 Jellyfin Media Player 修改，[v221122 版本](https://github.com/Terminus-Media/jellyfin-media-player/releases/tag/v221122)支持接入 Emby 和 Jellyfin；因最后发布停留在 2022 年 11 月，可作为桌面端备选。

## 连接服务器与验证播放

在客户端添加服务器时，填写当前设备可访问的 Emby 地址（如局域网 `http://NAS_IP:8096` 或反向代理 HTTPS 域名；若接入了 CMS 302 代理则填 `http://NAS_IP:9096`）及本地用户账号。

建议按以下清单完成首次验收：

1. 播放一部本地电影，在后台确认处于 Direct Play 直接播放模式。
2. 切换内外挂字幕与多音轨，观察画面及是否触发不必要的转码。
3. 拖动进度条并退出播放，重新进入并切换另一台设备，确认续播位置同步正常。
4. 若接入了云端 STRM 库，单独测试云端影片的起播速度、拖动响应与外挂字幕加载。

## 远程访问、备份与更新

### 远程访问

供自己和家人外出观看时，可优先通过 Tailscale / WireGuard 异地组网直连；若有公网 IP 或域名，可配合 HTTPS 反向代理对外提供服务，详见 [NAS 远程访问](/posts/nas-remote-access/)。注意本地高清原盘串流受限于家庭宽带的上行带宽，而云端 STRM 走 302 直连时视频流由客户端直接向网盘拉取。

### 备份与更新

日常备份重点保留 `compose.yaml`、`.env` 和 `config` 目录（`transcode` 为临时缓存无需备份）。更新前建议先停止容器再复制 `config`，以保证 SQLite 数据库状态一致：

```bash
docker compose stop emby
# 此时备份 compose.yaml、.env 与 config 目录
docker compose pull emby
docker compose up -d emby
docker compose logs --tail=100 emby
```

服务端升级可能会更新数据库结构，若需回退旧版本镜像，应同步恢复升级前配套的 `config` 备份。

## 常见问题

| 现象                        | 优先排查                                                                          |
| --------------------------- | --------------------------------------------------------------------------------- |
| 容器启动失败                | `.env` 变量是否已填、挂载源目录是否存在、端口是否被占用、是否误挂不存在的核显节点 |
| 网页打不开                  | 容器运行日志、宿主机端口映射、防火墙策略；若改用 host 模式需直接检查服务监听端口  |
| 媒体库扫描不到文件          | 媒体库路径是否填了容器内路径（`/data/library/...`）、服务账户是否有目录读取权限   |
| 有影片条目但无海报          | TMDB 网络连通性、元数据语言设置，或本地 NFO 与图片命名是否规范                    |
| 在线下载字幕保存失败        | 媒体卷是否仍带有 `:ro` 只读限制，宿主机目录是否授予了服务账户写权限               |
| MoviePilot 入库后不刷新     | MoviePilot 中的 Emby 地址、API 密钥及容器路径映射关系是否正确                     |
| STRM 能入库但无法播放       | STRM 内记录的地址是否可达、115 登录会话是否有效、是否通过 302 代理端口访问        |
| 启用硬解后 CPU 占用依然很高 | 查看播放会话是否真正走硬件加速，是否因 PGS 字幕烧录或不支持的编码回退到了 CPU     |
| 电视安装 APK 失败或无法操控 | 核对设备支持的 ABI（`arm64-v8a` / `armeabi-v7a`），并确认下载的是 TV 专用版       |

## 其他媒体库

Emby、Jellyfin 与 Plex 可以同时读取同一份只读媒体目录，只需将各自的 `config` 数据库与缓存目录分开存放：

- **Jellyfin**：免费开源且硬件转码无需订阅，部署与核显配置见 [Jellyfin：Docker 部署与硬件转码设置](/posts/jellyfin-guide/)。
- **Plex**：采用云端账号认领机制，部署与远程播放配置见 [Plex：Docker 部署、媒体库与远程播放](/posts/plex-guide/)。

## 参考资料

- 磕巴白菜：[绿联 NAS 部署 Emby，打造家庭影音中心][keba-emby]、[Emby 全平台客户端攻略][keba-client]。
- LinuxServer：[Emby 镜像说明][lsio]。
- Emby：[官方下载][emby-download]、[Premiere 功能说明][premiere]、[媒体库设置][library]、[电影命名][movie-naming]、[剧集命名][tv-naming]、[播放方式说明][playback]、[硬件加速概览][hardware]、[STRM 文件][strm]。
- Docker：[host 网络驱动][docker-host]。
- Android：[ABI 与架构说明][android-abi]。
- [StrmAssistant 项目][strmassistant]。

[keba-emby]: https://hi.keba.host/archives/emby
[keba-client]: https://hi.keba.host/archives/EmbyClient
[lsio]: https://docs.linuxserver.io/images/docker-emby/
[premiere]: https://emby.media/premiere.html
[emby-download]: https://emby.media/download.html
[library]: https://emby.media/support/articles/Library-Setup.html
[movie-naming]: https://emby.media/support/articles/Movie-Naming.html
[tv-naming]: https://emby.media/support/articles/TV-Naming.html
[playback]: https://emby.media/support/articles/DirectPlay-Stream-Transcoding.html
[hardware]: https://emby.media/support/articles/Hardware-Acceleration-Overview.html
[strm]: https://emby.media/support/articles/Strm-Files.html
[docker-host]: https://docs.docker.com/engine/network/drivers/host/
[android-abi]: https://developer.android.com/ndk/guides/abis
[strmassistant]: https://github.com/sjtuross/StrmAssistant
