---
title: 媒体库篇：Emby、Jellyfin 与 Plex
description: 在 NAS 上用 Docker Compose 部署 Emby、Jellyfin 和 Plex，统一整理媒体目录、权限、网络与备份，比较客户端、硬件转码和授权，并接入 MoviePilot 与 Cloud Media Sync。
author: Ayulog
pubDatetime: "2026-10-10T13:00:00+08:00"
draft: true
tags:
  - NAS
  - Docker
  - Emby
  - Jellyfin
  - Plex
  - 家庭影音
  - 教程
---

电影和剧集存进 NAS 以后，还需要一个方便浏览、播放和记录进度的入口。Emby、Jellyfin、Plex 都能把已有文件整理成媒体库：服务端管理海报、简介、用户和观看记录，手机、电视、电脑上的客户端负责连接与播放。

这篇把三个媒体库放在一起，围绕 **Linux NAS 上的 Docker Compose 部署**来写。先选一个，用一部本地影片跑通，再接入 MoviePilot、Cloud Media Sync（CMS）和云端媒体；完整自动化分工可结合 [DebNAS 自动观影流程](/posts/2026-10-09-debnas-media-workflow/)阅读。三个服务可以读取同一份媒体文件，但配置数据库必须各自独立。

资料核对于 **2026 年 10 月 10 日**。Emby 部分参考磕巴白菜的两篇部署与客户端文章，Jellyfin、Plex 的步骤依据各自官方文档和镜像仓库整理。下文为配置示例，未在各品牌 NAS、显卡与客户端组合上逐一实机验证。

## 目录

- [先选一个媒体库](#先选一个媒体库)
- [准备目录与权限](#准备目录与权限)
- [Emby](#emby)
- [Jellyfin](#jellyfin)
- [Plex](#plex)
- [直接播放与硬件转码](#直接播放与硬件转码)
- [连接服务器与验证播放](#连接服务器与验证播放)
- [远程访问、备份与更新](#远程访问备份与更新)
- [常见问题](#常见问题)
- [参考资料](#参考资料)

## 先选一个媒体库

| 项目           | Emby                                                 | Jellyfin                                       | Plex                                                         |
| -------------- | ---------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------ |
| 适合从哪里开始 | 已使用 Emby 客户端，或准备接入本文的 CMS / STRM 方案 | 希望服务端与官方客户端免费，由自己管理本地账号 | 希望使用 Plex 账号与客户端连接家庭媒体库                     |
| 本文镜像       | LinuxServer 维护的 `lscr.io/linuxserver/emby`        | 官方 `jellyfin/jellyfin`                       | 官方 `plexinc/pms-docker`                                    |
| 账号           | 本地服务端账号；Emby Connect 为可选连接功能          | 本地服务端账号                                 | 本文通过 Plex 账号认领服务器                                 |
| 硬件转码       | 需要 Emby Premiere，并满足硬件、驱动条件             | 无付费解锁，仍需匹配硬件、驱动与设备权限       | 本文 Docker 方案需要服务器所有者有 Plex Pass，并满足硬件条件 |
| 客户端费用     | 按官方客户端播放解锁、Premiere、第三方应用分别核对   | 官方服务端与客户端免费；第三方应用另看自身授权 | 本地个人视频播放与远程播放要求不同，远程权限见下文           |
| 示例访问入口   | `http://NAS_IP:8096`                                 | `http://NAS_IP:8097`                           | `http://NAS_IP:32400/web`                                    |

媒体库本身不提供影片，也不代替下载器和整理工具。先确认电视、手机上有适合自己的客户端，再决定服务端。只播放客户端支持的本地视频时，直接播放通常比转码省资源；不必为了比较三个软件，同时开启整库扫描和预览图任务。

## 准备目录与权限

先安装 NAS 的 Docker 应用，并固定局域网地址。各平台的准备方式见 [NAS Docker 安装及设置](/posts/2026-10-10-nas-docker-setup/)。本文容器示例面向 Linux 宿主机；Windows / macOS 上运行 Jellyfin 时，官方建议使用原生安装，不把 Docker Desktop 的 GPU、路径行为视为与 NAS 相同。

下面是目录关系示意，绝对路径要在自己的 NAS 上确认：

```text
stacks/
├── emby/
│   ├── compose.yaml
│   ├── .env
│   ├── config/
│   └── transcode/
├── jellyfin/
│   ├── compose.yaml
│   ├── .env
│   ├── config/
│   └── cache/
└── plex/
    ├── compose.yaml
    ├── .env
    ├── config/
    └── transcode/

data/
├── downloads/          # 下载与做种目录，不重复加入媒体库
└── library/
    ├── movies/
    └── tv/
```

三份 `config` 分别保存数据库、账号、插件与设置，**不能给不同服务共用同一个配置目录**。配置与缓存优先放在可靠的本地存储上；Plex 官方尤其要求其数据库所在文件系统支持文件锁，不要把网盘挂载目录当作数据库目录。临时转码目录应留足空间，也不要放进电影库。

支持 SSH 的系统可以查询准备使用的服务账户：

```bash
id <service-user>
```

将 `<service-user>` 替换为实际账户，记录 UID 和 GID。该账户应能读写对应服务的配置、缓存或转码目录，读取媒体目录，并具有逐层访问父目录的权限。NAS 使用 ACL 时，还要检查共享文件夹权限。不要直接套用别人的 `0` 或 `1000`，也不要把所有目录改成 `777` 来掩盖权限问题。

本文每个项目都有独立的 `.env`，使用 `PUID`、`PGID` 保存查到的数字，`MEDIA_ROOT` 指向示意中的 `data` 根目录。**这些是本文 Compose 使用的变量名，实际传给镜像的方式各不相同：**

| 镜像              | 使用方式                                       |
| ----------------- | ---------------------------------------------- |
| LinuxServer Emby  | `environment.PUID`、`environment.PGID`         |
| Jellyfin 官方镜像 | Compose 的 `user: UID:GID`                     |
| Plex 官方镜像     | `environment.PLEX_UID`、`environment.PLEX_GID` |

不要只替换镜像名而沿用其他镜像的权限参数。媒体统一挂载为 `/data/library:ro`，于是三个服务添加电影库时都填 `/data/library/movies`，剧集库填 `/data/library/tv`。只读挂载允许读现有视频、NFO、海报和字幕；若要让服务保存字幕或元数据到媒体旁边，需有意取消 `:ro` 并授予写权限。由多个服务读取同一媒体目录时，尽量明确一个元数据维护者。

推荐先用下面的基础命名，按电影和剧集分库；动画也按这两类区分：

```text
movies/Movie Name (2024)/Movie Name (2024).mkv
tv/Series Name (2024)/Season 01/Series Name S01E01.mkv
```

三个示例使用不同的宿主端口，便于并行比较。Emby、Jellyfin 的容器内部都仍是 `8096`。Plex 使用 Linux host 网络，直接监听宿主机端口；host 模式不再填写 `ports`。更完整的说明见 [Docker host 网络文档][docker-host]。

## Emby

Emby 这一节使用 LinuxServer 镜像，依次完成部署、媒体库初始化、MoviePilot / CMS 接入和客户端设置。Jellyfin 和 Plex 分别使用后文自己的官方镜像与设置。

### 先分清服务端、客户端和 Premiere

| 名称          | 用途                                               | 安装或使用位置                 |
| ------------- | -------------------------------------------------- | ------------------------------ |
| Emby Server   | 扫描媒体、提供海报墙、管理用户与播放记录，按需转码 | NAS、长期运行的电脑或服务器    |
| Emby 客户端   | 连接服务器、浏览媒体库与播放视频                   | 手机、平板、电视、电脑或浏览器 |
| Emby Premiere | 解锁官方列出的高级功能，例如硬件加速转码           | 在自己的服务器中配置授权       |
| 第三方客户端  | 使用自己的界面与播放引擎连接 Emby                  | 依各项目支持的平台安装         |

Emby 本身不提供影片。下载、订阅和整理可以交给下载器、MoviePilot 等工具；已有本地视频时，也可以直接建立媒体库，不必先搭好整套自动化服务。

**服务器授权、官方客户端播放解锁、第三方播放器的付费功能是不同的项目。** 不要把某个客户端的会员当成 Emby Premiere，也不要默认买了 Premiere 就包含所有第三方应用。购买前对照 [Premiere 说明][premiere]及应用商店中的功能要求。

### 使用 Docker Compose 部署

#### 选定镜像，保持参数一致

参考文章使用 LinuxServer 镜像，它由 LinuxServer 团队维护；Emby 自家另有 `emby/embyserver` 镜像。两者的权限变量不同：

| 镜像                       | 权限变量                | 本站示例                    |
| -------------------------- | ----------------------- | --------------------------- |
| `lscr.io/linuxserver/emby` | `PUID`、`PGID`          | 本文独立部署示例            |
| `emby/embyserver`          | `UID`、`GID`、`GIDLIST` | DebNAS 自动观影流程中的示例 |

已有稳定部署时，继续按现有镜像的文档维护。更换镜像需要重新核对环境变量、配置目录和权限，不能只改 `image` 一行。下面采用 LinuxServer 的稳定通道 `latest`；正式长期运行可在验证后固定具体版本标签或 digest。

#### 保存配置文件

在项目目录创建 `.env`，填写自己的值。`MEDIA_ROOT` 指向前面示意中的 `data` 根目录，其下应已有 `library/movies`、`library/tv`：

```dotenv
PUID=
PGID=
MEDIA_ROOT=/path/to/data
```

同一目录创建 `compose.yaml`：

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

这里使用 Compose 默认的 bridge 网络，外部访问宿主机的 `8096`。端口冲突时可以改成 `"18096:8096"`，之后使用 `http://NAS_IP:18096` 访问，容器内端口仍是 `8096`。

媒体目录以 `:ro` 只读挂载，适合由 MoviePilot 等工具维护 NFO、海报与字幕的情况。如果准备让 Emby 把这些文件保存到影片旁边，需要有意移除相应挂载的 `:ro`，并给应用账户写入权限；同时核对 Emby 的元数据保存选项。

`/transcode` 是本文自定义的临时目录，**还需要在 Emby 的转码设置中将临时路径设为 `/transcode`**。单独挂载目录不会自动更改应用设置。

本地媒体播放不需要默认开启特权模式，也不要求先添加 GPU。参考文章同时写了 `network_mode: host` 和 `ports`；根据 [Docker host 网络说明][docker-host]，host 模式下端口映射不生效。若因特定发现协议改用 host，应删除 `ports`，并直接使用 Emby 在宿主机上监听的端口。

`8920` 是 Emby 的 HTTPS 端口，但需要配置证书和相关设置。只写 `8920:8920` 不会自动得到 HTTPS；初次部署先验证局域网 HTTP，远程访问时再配置 HTTPS 入口。

#### 启动并查看日志

启动前先在 `compose.yaml` 所在目录创建 `config` 和 `transcode`，并检查媒体源目录已经存在。可用 NAS 文件管理器创建，或在 Linux shell 中执行：

```bash
mkdir -p config transcode
```

将这两个目录的读写权限授予前面填写的服务账户，尤其是自定义的 `transcode` 目录。不要依赖 Docker 自动创建目录后就一定可写；`PUID` / `PGID` 也不会自动修复所有宿主目录的权限。然后在项目目录执行：

```bash
docker compose config -q
docker compose pull
docker compose up -d
docker compose ps
docker compose logs --tail=100 emby
```

先确认变量已填、挂载源存在、日志没有持续报错，再打开 `http://NAS_IP:8096`。NAS 面板部署时，在 Compose 项目中录入相同配置，并确认面板怎样读取 `.env`、怎样解析 `./config`；相对路径应落到这次项目的持久化目录。

如果镜像拉取失败，参考 [Docker 镜像加速与拉取排查](/posts/2026-10-10-docker-registry-mirrors/)。不要为了处理一个下载错误，同时更换镜像、网络和整个配置目录，否则很难判断问题来源。

### 初始化与媒体库设置

#### 完成首次向导

1. 设置界面语言，创建服务端管理员及密码。
2. 建立一个电影库和一个剧集库，先各放少量文件。
3. 按需要设置元数据语言与地区，完成初始化。
4. 在转码设置中填写前面准备的 `/transcode`。
5. 为日常观看创建普通用户，按需分配媒体库访问权限。

手动连接自己的服务器时，使用服务器上创建的本地账号即可。Emby Connect 是另外的账号连接功能；它不能代替服务器本身的网络可达性，也不会自动完成家庭网络穿透。

#### 添加的是容器内路径

按照本文配置，Emby 看到的是 `/data/library`，不是宿主机上的 `/path/to/data/library`：

| 媒体库   | 内容类型 | Emby 中填写的目录      |
| -------- | -------- | ---------------------- |
| 本地电影 | 电影     | `/data/library/movies` |
| 本地剧集 | 电视节目 | `/data/library/tv`     |
| 动画电影 | 电影     | 对应的动画电影目录     |
| 动画剧集 | 电视节目 | 对应的动画剧集目录     |

动画应按电影和连续剧区分库类型。开始时不必复制复杂的地区分类；如果后续使用 `tv/国产剧`、`tv/欧美剧` 等中间层，按 [Emby 剧集命名说明][tv-naming]，可在同一个剧集库中分别添加这些分类目录，使每个路径下面直接对应各部剧集。

#### 文件命名先做到清楚

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

电影使用片名与年份，剧集明确季号和集号。识别错误时先检查文件结构、名称和元数据 ID，再针对单个条目进行识别或刷新。不要先对整库执行覆盖性刷新，把已经整理好的海报和简介一并替换。

#### 明确谁负责刮削

刮削就是识别影片并获取简介、海报等元数据，可以由 Emby 或上游整理工具负责：

- **只有视频文件**：在 Emby 中选择适合的元数据与图片提供方，设置语言、地区，先验证一部影片的识别结果。
- **MoviePilot / CMS 已经生成 NFO 和海报**：让 Emby 读取现有本地元数据，按需求减少在线刮削和重复下载。检查当前版本的读取器、下载器与保存设置，不能把参考截图里的选项数量当成所有环境通用的规则。

使用本文只读挂载时，Emby 可以读媒体旁已有的元数据，但不能把新 NFO、海报或字幕写回媒体目录。要启用“保存到媒体文件夹”一类功能，需同时调整挂载和目录权限。

没有海报也可能是元数据服务无法连接。先看服务端日志、DNS 和目标服务连通性；代理地址应来自自己的环境，不能直接复制参考文中的内网 IP。容器内的 `127.0.0.1` 指向容器自身，添加代理后还要确认本地媒体服务的访问不会被错误转发。

### 接入 MoviePilot、CMS 与插件

#### 创建 API 密钥并配置 MoviePilot

在 Emby 管理面板中找到 **API 密钥**页面，按用途创建密钥，例如分别标记为 `MoviePilot` 和 `CMS`。不同版本菜单位置可能变化。密钥只填入本机应用配置，不写进公开 Compose、文章或截图。

在 MoviePilot 的媒体服务器设置中填写 Emby 地址和对应密钥，测试连接、读取媒体库，再验证整理完成后的刷新。服务间地址取决于网络：

- 使用 NAS 发布端口：填写实际可达的 `http://NAS_IP:8096`，若改过宿主端口则同步修改。
- 使用共同的 Docker 网络：服务名可解析时填写 `http://emby:8096`。

**独立 Compose 项目的默认网络彼此不同。** 只有加入共同网络，才能直接按服务名互相访问。如果沿用 DebNAS 流程中的外部 `media` 网络，先检查是否存在，不存在时创建：

```bash
docker network inspect media
# 仅在网络不存在时执行
docker network create media
```

再将下面配置合并到本文 Compose 的对应层级；其他需要通信的服务也加入同一个网络：

```yaml
services:
  emby:
    # 保留前面的 image、environment、volumes 等配置
    networks:
      - media

networks:
  media:
    external: true
```

已有名为 `emby` 的服务时，先确认目标实例，避免同一共享网络出现重复别名。MoviePilot 的目录映射应与实际文件布局对应；本文沿用 `/data/library`，不会把下载和保种目录重复加入 Emby。

#### 加入 CMS 生成的 STRM

STRM 是保存媒体地址或文件路径的文本文件。CMS 生成 STRM 后，Emby 扫描这些文件并建立媒体条目；播放时还要访问它们指向的视频。

如果要接入 CMS，在 `.env` 中补充：

```dotenv
STRM_ROOT=/path/to/strm
```

然后在 Emby 服务原有的 `volumes` 下增加：

```yaml
- ${STRM_ROOT:?Set STRM_ROOT in .env}:/strm:ro
```

重建容器后，按实际输出结构添加 `/strm/movies`、`/strm/tv` 等媒体库。CMS 与 Emby 必须使用同一个宿主机 STRM 目录；如果 CMS 内是 `/media`、Emby 内是 `/strm`，通知刷新时要配置对应的路径替换。

先分别建立本地电影、本地剧集、云端电影和云端剧集库，容易看清哪个环节出问题。**STRM 不等于 302，也不自动保证视频流量绕过 NAS。** 如果使用 CMS 的 Emby 302 代理，还要按对应版本的说明配置入口，验证播放器是否能访问跳转后的地址。

CloudDrive2 / rclone 将网盘挂到宿主机后再交给 Emby 读取，是另一种接法，需要另外处理挂载先后顺序、断线恢复和容器可见性；不要把网盘挂载目录与 CMS 的 STRM 输出目录混为一谈。

#### 神医助手按需安装

[StrmAssistant（Emby 神医助手）][strmassistant]提供媒体信息提取、字幕扫描、预览图、搜索等增强功能。它不负责下载资源，也不能代替 CMS 生成 STRM。

先确认 Emby 原生播放正常，再按插件项目说明核对 Emby 版本、插件版本及社区版 / PRO 的适配条件。生成预览图、提取媒体信息可能实际读取远程视频，云端库需要控制任务频率，并观察请求与流量。

### Emby 硬件转码

#### Linux NAS 上的 Intel / AMD 设备

先检查宿主机是否存在设备节点：

```bash
ls -l /dev/dri
```

确认宿主机驱动、硬件与所需编解码格式受支持后，在本文 LinuxServer 镜像的服务下增加：

```yaml
devices:
  - /dev/dri:/dev/dri
```

这是 `services.emby` 下的配置，与 `volumes`、`ports` 同级。没有 `/dev/dri` 时不要机械添加，否则容器可能无法启动。LinuxServer 文档说明其初始化会处理应用用户访问设备的权限；如果仍报权限错误，检查设备、宿主机驱动和该镜像日志，而不是直接打开特权模式。

NVIDIA 通常还需要宿主机驱动及 NVIDIA Container Toolkit，按 [LinuxServer 的 NVIDIA 说明][lsio]配置运行时。ARM、虚拟机中的核显直通以及各品牌 NAS 的支持范围，要分别按设备与系统核对。

#### 在 Emby 内启用并验证

官方将硬件加速转码列入 [Emby Premiere][premiere] 功能。完成适用授权与设备配置后，在转码设置中选择可用的硬件加速方式。HDR 转 SDR 的色调映射还取决于具体 GPU、驱动、系统和视频格式，不能仅凭出现一个开关就判断整条链路可用。

选择一段测试视频，将客户端质量临时调低以触发转码，查看会话、服务端转码日志和资源占用；结束后恢复日常质量设置。确认视频正常、字幕正确、拖动可用，并核对实际使用的是哪种硬件处理方式。

### 各平台客户端怎么选

先从 [Emby 官方下载页][emby-download]找对应平台的客户端，用它验证服务器和账号，再比较自己喜欢的第三方界面。手机、电视和桌面版面向的操作方式不同，电视端尤其要确认遥控器、字幕与音轨切换是否顺手。

#### Android 手机、平板与 Android TV

| 客户端          | 入口与适用设备                                                                                   | 选择时注意                                                                |
| --------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Emby 官方客户端 | [官方下载][emby-download]，分别查看 Android 与 Android TV                                        | 先核对设备系统版本及该客户端的播放解锁要求                                |
| Yamby           | [Google Play](https://play.google.com/store/apps/details?id=com.hush.yamby)，Android 手机 / 平板 | 商店明确为第三方 Emby 客户端，含应用内购买；按功能说明区分基础与 PRO 功能 |
| iPlay           | [项目入口](https://github.com/saltpi/iPlay)中的 Android 下载                                     | 支持 Emby / Jellyfin，按项目当前下载表选择安装包                          |
| AfuseKt         | [移动版发布页](https://github.com/AttemptD/AfuseKt-release)                                      | 项目说明支持 Emby 直连，移动版要求 Android 8 或以上                       |
| AfuseKt TV      | [TV 版发布页](https://github.com/AttemptD/AfuseKtV-release)                                      | 与移动版分开发布，按电视版本说明安装和配置                                |

AfuseKt 的发布仓库明确只提供安装包，不含源码，不能因为托管在 GitHub 就称它为开源客户端。各应用的付费方式、设备限制和 TV 版授权是否通用，以对应版本说明为准。

手动下载 APK 时，再看文件名中的架构标记：

| 标记             | 含义             | 选择依据                                              |
| ---------------- | ---------------- | ----------------------------------------------------- |
| `arm64-v8a`      | 64 位 ARM        | 系统实际支持该 ABI，常见于现代 Android 手机           |
| `armeabi-v7a`    | 32 位 ARM        | 系统实际支持 32 位 ARM 应用，部分旧设备或电视仍会用到 |
| `x86` / `x86_64` | 32 / 64 位 x86   | 按对应设备或模拟器的系统架构选择                      |
| `universal`      | 通常包含多个 ABI | 仍需查看项目打包范围、最低系统要求和设备兼容性        |

**看系统支持的 ABI，不按内存大小判断。** 64 位芯片上的系统不一定支持所有 32 位应用，电视盒子的系统位数也可能与芯片能力不同。已配置 ADB 时，可用下面的命令辅助查询，再与项目提供的安装包核对：

```bash
adb shell getprop ro.product.cpu.abilist
```

仅凭 `mobile-release.apk` 这类名称，无法确定是不是通用包；`universal` 也不是“所有 Android 设备都能装”。更新能否覆盖安装还涉及应用包名、签名、版本与系统限制，不能只按 ARM 的位数判断。相关概念见 [Android ABI 文档][android-abi]。

#### iPhone、iPad、Mac 与 Apple TV

苹果平台的选择比较多，下面按当前项目或商店说明列出。表中的设备范围用于初筛，购买前再核对最低系统版本；“iPhone / iPad 应用可在 Apple 芯片 Mac 上运行”与原生 macOS 客户端也应分别看待。

| 客户端                                                  | 已核实的平台或兼容范围                                      | 说明                                                             |
| ------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------- |
| Emby 官方客户端                                         | 从[官方下载页][emby-download]进入对应 Apple 平台            | 用于连接自己的 Emby Server                                       |
| [Infuse](https://firecore.com/infuse)                   | iPhone、iPad、Mac、Apple TV、Vision                         | 官方明确支持 Emby；部分播放与同步功能属于 Infuse Pro             |
| [VidHub](https://apps.apple.com/cn/app/id1659622164)    | iPhone、iPad、Mac、Apple TV                                 | 商店说明支持 Emby 等媒体服务                                     |
| [SenPlayer](https://apps.apple.com/cn/app/id6443975850) | iPhone、iPad、Mac、Apple TV                                 | 商店说明支持 Emby / Jellyfin / Plex                              |
| [Filebar](https://apps.apple.com/cn/app/id1558391784)   | iPhone、iPad、Apple TV；另有 Apple 芯片 Mac 兼容项          | 参考文章称为 Fileball，同一商店 ID 当前名称为 Filebar；支持 Emby |
| [yybx](https://apps.apple.com/cn/app/id1519723194)      | iPhone、iPad、Apple TV、Apple 芯片 Mac                      | 商店说明支持 Emby                                                |
| [iemc](https://apps.apple.com/cn/app/id1467462861)      | iPhone、iPad；另列 Vision 兼容项                            | 商店说明支持 Emby / Jellyfin，不按原文的整个平台标题推定有 TV 版 |
| [Reflix](https://apps.apple.com/cn/app/id6621243955)    | iPhone、iPad、Apple TV；另有 Apple 芯片 Mac / Vision 兼容项 | 商店描述为私人 Emby 客户端                                       |
| [HamHub](https://apps.apple.com/cn/app/id6458691598)    | iPhone、iPad、Mac、Apple TV                                 | 商店说明支持 Emby                                                |
| [Conflux](https://apps.apple.com/cn/app/id6450330892)   | iPhone、iPad、Mac、Apple TV、Vision Pro                     | 商店说明支持 Emby                                                |
| [iPlay](https://github.com/saltpi/iPlay)                | 项目下载表列出 iOS、macOS、tvOS                             | 由项目下载表进入对应商店，避免误装同名应用                       |

不要只按“支持 Emby”选播放器。实际常用的是字幕样式与偏移、音轨切换、续播与观看记录同步，以及电视上的遥控器体验。HDR、杜比视界和音频输出，还要结合文件格式、设备、电视或功放一起验证。

参考文另收录了 [Forward](https://apps.apple.com/cn/app/id6503940939)。本次未能从所查商店入口确认当前可用页面，因此这里只保留原入口，不据此判断它已下架，也不列为已核实的平台选项。

#### Windows、Linux 与桌面端

Windows 上可以先用浏览器或 [Emby 官方桌面客户端][emby-download]。希望换一种界面时，再查看 [iPlay](https://github.com/saltpi/iPlay) 的 Windows 发行入口；它的项目说明明确支持 Emby / Jellyfin。

参考文提到的“终点站”是 [Terminus Media Player](https://github.com/Terminus-Media/jellyfin-media-player)。其 [v221122 发行说明](https://github.com/Terminus-Media/jellyfin-media-player/releases/tag/v221122)明确支持 Emby 和 Jellyfin，不能仅因仓库名中有 Jellyfin 就把它排除。不过核对时标记为 Latest 的版本发布于 **2022 年 11 月 22 日**，适合作为旧版备选，需自行验证与当前服务端、系统及视频格式的兼容性。仓库虽然提到 Linux，该版本说明又注明没有编译 Linux 包，不能直接当作现成 Linux 下载教程。

[Tsukimi](https://github.com/tsukinaha/tsukimi) 的当前项目说明是 **Linux 上的 Jellyfin 客户端**。本次未从当前说明中确认 Windows 或 Emby 支持，因此不沿用参考文章中的 Windows Emby 推荐位置。

iPlay 的参考链接 `ourfor/iPlay` 当前是上游的 fork，本文使用其 README 指向的 `saltpi/iPlay` 入口。客户端下载以当前项目发布页或官方商店为准，不固定到旧网盘合集中的某一版安装包。

## Jellyfin

[Jellyfin 官方说明][jellyfin-home]明确：服务端与官方客户端免费，硬件加速没有额外的订阅解锁。使用第三方播放器时，其收费仍由该应用决定。免费不代表自动适配所有显卡和字幕，部署时仍要分别验证路径、播放与转码。

### 使用官方 Docker 镜像

在 `stacks/jellyfin` 这样的独立项目目录创建 `.env`，填入实际值：

```dotenv
PUID=
PGID=
MEDIA_ROOT=/path/to/data
```

同目录创建 `compose.yaml`：

```yaml
services:
  jellyfin:
    image: jellyfin/jellyfin:latest
    restart: unless-stopped
    user: "${PUID:?Set PUID in .env}:${PGID:?Set PGID in .env}"
    environment:
      TZ: Asia/Shanghai
    volumes:
      - ./config:/config
      - ./cache:/cache
      - ${MEDIA_ROOT:?Set MEDIA_ROOT in .env}/library:/data/library:ro
    ports:
      - "8097:8096"
```

这是依据[官方容器文档][jellyfin-container]整理的基础配置。`/config` 保存设置和数据库，`/cache` 保存缓存；两处都要允许 `user` 指定的 UID / GID 写入。官方镜像不通过 LinuxServer 的 `PUID`、`PGID` 环境变量设置运行身份。

先在项目目录建立 `config`、`cache` 并赋予服务账户权限，再启动：

```bash
mkdir -p config cache
docker compose config -q
docker compose pull
docker compose up -d
docker compose ps
docker compose logs --tail=100 jellyfin
```

打开 `http://NAS_IP:8097`。这里仅映射手动连接所需的 HTTP 端口；如果要用客户端自动发现，可按官方说明另加 `7359:7359/udp`，并检查防火墙。需要 DLNA 时，官方容器文档要求 host 网络；这会使用实际服务端的 `8096`，与 Emby 并行运行前应解决端口冲突，且删除 `ports`。初次验证可以先手动输入地址。

### 首次配置与媒体库

按[官方初始化向导][jellyfin-wizard]完成以下步骤：

1. 选择界面语言，创建本地管理员账号与密码。
2. 添加“电影”库，目录填 `/data/library/movies`；添加“电视节目”库，目录填 `/data/library/tv`。
3. 设置元数据首选语言与地区；有需要时再按库单独调整。
4. 根据自己的网络方案设置远程连接选项。允许远程连接不等于已经配置公网入口，也不需要因此启用自动端口映射。
5. 扫描少量影片，确认识别、海报、字幕和播放，再添加其余目录与普通观看用户。

如果上游已经生成 NFO 与图片，检查库中的本地元数据读取、图片下载和保存选项，先用一个条目验证是否沿用预期内容。本文媒体目录只读，不能让 Jellyfin 把新字幕或海报写回原目录。

### Intel 核显与设备权限

先确认 Linux 宿主机能看到设备，再查询实际设备组的数字 GID：

```bash
ls -l /dev/dri
ls -ln /dev/dri/renderD128
```

只有确实存在且适用于当前 GPU 时，才使用下面示例。把设备所属组的数字填入 `.env`：

```dotenv
RENDER_GID=
```

在 `services.jellyfin` 下与 `volumes` 同级补充：

```yaml
group_add:
  - "${RENDER_GID:?Set the render device group ID in .env}"
devices:
  - /dev/dri/renderD128:/dev/dri/renderD128
```

随后执行 `docker compose up -d` 重建容器。这里的 `group_add` 是为了让指定的非 root 用户访问设备；不要假设所有 NAS 的设备组都叫 `render`，或都具有相同的 GID。多显卡环境也可能需要选择其他 `renderD*` 节点。

在 Jellyfin 管理面板的转码设置中，按[官方 Intel 指南][jellyfin-intel]选择 QSV 或适用的 VA-API，设备路径与映射保持一致，并只勾选硬件实际支持的解码格式。可先运行官方镜像内的工具检查驱动：

```bash
docker compose exec jellyfin /usr/lib/jellyfin-ffmpeg/vainfo
```

AMD、NVIDIA、Rockchip 等平台分别按[硬件加速文档][jellyfin-hardware]配置，不能把上述 Intel 示例直接套用到所有设备。HDR 色调映射、字幕烧录与特定编码可能只能部分加速；面板中选中硬件加速并不能代替播放日志验证。

### 客户端与自动整理

先用浏览器验证，再从[Jellyfin 官方客户端目录][jellyfin-clients]选择设备对应的应用，例如桌面的 Jellyfin Media Player、Android / Android TV、iOS 或 Kodi 插件。官方目录会区分官方与第三方客户端，按实际平台下载，不能假设一个包同时适合手机与电视。

客户端手动填写 `http://NAS_IP:8097` 和本地账号。MoviePilot 接入时选择 Jellyfin 类型，在 Jellyfin 后台按用途创建 API 密钥，填写可达地址与密钥，再验证整理后的刷新。使用宿主地址时端口是 `8097`；只有服务处于共同 Docker 网络时，才能使用 `http://jellyfin:8096`。CMS 插件、Emby 神医助手或 Emby 302 代理不能仅凭接口相似就视为兼容 Jellyfin，应按所选项目明确列出的版本与服务端支持范围配置。

## Plex

Plex 使用自己的服务器认领与账号体系。本文采用 [Plex 官方 Docker 镜像][plex-docker]，以 Linux host 网络部署，先从同一局域网完成认领与媒体库初始化。

### 使用官方 Docker 镜像

在独立项目目录创建 `.env`：

```dotenv
PUID=
PGID=
MEDIA_ROOT=/path/to/data
PLEX_CLAIM=
```

`PUID`、`PGID` 仍填前面查到的服务账户数字，Compose 会把它们传给官方镜像的 `PLEX_UID`、`PLEX_GID`。准备启动时，登录自己的 Plex 账号，从 [Claim 页面][plex-claim]获取令牌，填入 `PLEX_CLAIM`。认领令牌是敏感配置，不写进公开文章、仓库或截图；若过期，重新获取后再启动。

创建 `compose.yaml`：

```yaml
services:
  plex:
    image: plexinc/pms-docker:latest
    restart: unless-stopped
    network_mode: host
    environment:
      TZ: Asia/Shanghai
      PLEX_UID: ${PUID:?Set PUID in .env}
      PLEX_GID: ${PGID:?Set PGID in .env}
      PLEX_CLAIM: ${PLEX_CLAIM:-}
    volumes:
      - ./config:/config
      - ./transcode:/transcode
      - ${MEDIA_ROOT:?Set MEDIA_ROOT in .env}/library:/data/library:ro
```

host 模式直接使用 NAS 网络，不需要 `ports`。如果 NAS 上已有原生 Plex 或另一个 Plex 容器，应先检查 `32400` 等端口占用。仅支持 bridge 网络的环境，请按照官方仓库的 bridge 示例配置端口与 `ADVERTISE_IP`；不能只删掉 `network_mode: host` 就期待客户端发现和访问仍然正常。

建立 `config`、`transcode` 并检查服务账户的读写权限；媒体目录需要可读。Plex 官方镜像默认会处理配置目录归属，因此 `config` 应是本服务专用目录，不要映射整个共享文件夹或其他应用的数据根目录。

```bash
mkdir -p config transcode
docker compose config -q
docker compose pull
docker compose up -d
docker compose ps
docker compose logs --tail=100 plex
```

在同一局域网打开 `http://NAS_IP:32400/web`，使用刚才的 Plex 账号登录。认领成功后可以清空 `.env` 中的 `PLEX_CLAIM`；官方镜像在服务器已登录时会忽略该参数。没有成功认领时，先检查令牌、服务器访问 Plex 的网络以及初始化日志，不要反复删除已有的 `config`。

### 首次配置与媒体库

按[Plex 安装与初始化说明][plex-install]完成以下步骤：

1. 确认看到的是自己的 Plex Media Server，设置服务器名称。
2. 添加电影库与电视节目库，选择语言，分别使用 `/data/library/movies` 和 `/data/library/tv`。
3. 完成一次小范围扫描；识别错误时先核对片名、年份、季集编号，再手动匹配单个条目。
4. 在服务器的转码设置中显示高级选项，确认临时目录为 `/transcode`，并为其保留可用空间。
5. 使用同一账号的客户端播放本地影片，再按需要配置家庭成员访问与远程连接。

Plex 的媒体代理和本地元数据读取规则与 Emby / Jellyfin 不完全相同，不能因为文件旁有 NFO 就假定所有内容会被同样导入。先检查一个样本的标题、海报、季集与字幕，再扩大扫描范围。`/transcode` 只存临时文件，不应选电影库、数据库目录或含其他资料的目录。

若初始化时无法找到或认领服务器，官方文档提供 SSH 隧道方式：在自己的电脑连接 NAS，将本地端口转到 NAS 的 Plex 端口，然后访问本机地址完成设置。下面的 `NAS_USER` 和 `NAS_IP` 均需替换为实际值：

```bash
ssh -N -L 8888:127.0.0.1:32400 NAS_USER@NAS_IP
```

保持隧道运行，在浏览器打开 `http://127.0.0.1:8888/web`。这是初始化访问手段，不是公网转发配置，也不需要为了认领而把未完成设置的服务暴露到外网。

### Plex Pass、远程播放与硬件转码

按当前[免费与付费说明][plex-paid]，同一局域网内播放自己的个人视频与远程播放采用不同规则。**Remote Watch Pass 只提供对应账号的远程播放权限，不包含硬件转码等 Plex Pass 高级功能。** [Plex Pass 说明][plex-pass]列明：账号自身可远程播放；服务器所有者有 Plex Pass 时，其授权访问该服务器的其他用户也可获得相应远程播放能力。具体客户端与账号要求按当前官方说明核对，不沿用“所有平台外网播放永久免费”的旧教程结论。

本文 Docker 场景中，硬件转码需要服务器所有者具有 Plex Pass。以受支持的 Intel 核显为例，宿主机确认 `/dev/dri` 可用后，在 `services.plex` 下增加：

```yaml
devices:
  - /dev/dri:/dev/dri
```

重建容器后，在服务器 **Settings → Transcoder** 中启用 **Use hardware acceleration when available**，按需要启用硬件编码。详细硬件、驱动、编码格式和平台限制见[Plex 硬件加速文档][plex-hardware]，不能把 Intel 的映射示例当成 NVIDIA 的完整配置。

主动降低一次客户端播放质量以触发转码，在服务器的播放活动详情中确认视频格式旁出现 `(hw)`，同时观察画面、字幕、拖动和日志。只显示“正在转码”并不能证明 GPU 已参与；音频转换、字幕处理或部分解码仍可能消耗 CPU。

### 客户端与上游工具

从[Plex 官方下载页][plex-download]选择桌面、移动或电视客户端，登录有权访问自己服务器的账号。先验证家庭局域网内播放，再按自己的账号权限、网络入口与带宽测试外网。客户端可连接云端账号，不等于 NAS 的媒体流已经有可达且足够快的路径。

需要 MoviePilot 刷新 Plex 时，在其媒体服务器配置中选择 Plex，按当前界面要求设置服务器地址与凭据，验证媒体库列表后再测试整理刷新。Plex 使用自己的认证与媒体库接口；Emby 的 API 密钥、插件和 CMS 的 Emby 302 入口不能直接照搬。若自己的自动化链路主要围绕 Emby / Jellyfin 的 STRM 展开，先核对生成器与播放器对 Plex 的支持，再决定是否迁移。

## 直接播放与硬件转码

### 先看当前播放方式

| 播放方式                  | 服务端主要做什么                     | 需要关注什么                   |
| ------------------------- | ------------------------------------ | ------------------------------ |
| 直接播放（Direct Play）   | 以客户端支持的原始媒体形式提供播放   | 客户端解码、字幕支持和网络带宽 |
| 直接串流（Direct Stream） | 保留视频编码，按需重新封装或转换音频 | 封装、音轨与客户端兼容性       |
| 转码（Transcoding）       | 重新编码视频，可能同时处理音频、字幕 | CPU / GPU 能力、码率、临时目录 |

在对应服务端的播放会话、转码日志或客户端播放信息中查看实际模式和原因。视频可以直播放时，不需要为了“用上核显”强行转码；直接播放也不代表播放器一定绕过服务器直接连接网盘。

字幕格式、音轨、客户端能力和播放质量限制都可能触发处理。比如某些客户端无法直接显示 PGS 字幕，需要服务端将字幕烧录进画面，即使启用了硬件加速，仍可能有较高 CPU 占用。

## 连接服务器与验证播放

地址分成两类：手机、电视使用宿主机可达地址或自己的 HTTPS 域名；同一 Docker 网络中的应用才可能直接使用服务名。按本文配置，局域网入口如下：

| 服务     | 客户端与局域网地址        | 容器间连接注意事项                                           |
| -------- | ------------------------- | ------------------------------------------------------------ |
| Emby     | `http://NAS_IP:8096`      | 共同网络内可以用 `http://emby:8096`                          |
| Jellyfin | `http://NAS_IP:8097`      | 共同网络内可以用 `http://jellyfin:8096`，内部端口仍是 `8096` |
| Plex     | `http://NAS_IP:32400/web` | 本文使用 host 网络，其他服务应连接实际可达的 NAS 地址        |

独立 Compose 项目的默认网络彼此不同。`http://emby:8096` 这类名字也通常不能直接填进手机或电视。若使用 CMS 的播放代理，应按对应服务端的方案填写入口，不要把 CMS 管理端口、媒体服务端口和播放代理端口混用。

先验证账号和服务端，再用常用客户端做一次完整测试：

1. 播放一部本地影片，查看实际播放模式。
2. 切换字幕与音轨，观察是否意外触发转码。
3. 拖动进度，暂停后退出，再进入检查续播位置。
4. 换另一台设备，确认观看记录是否按预期同步。
5. 使用云端挂载、STRM 或播放代理时，分别验证起播、拖动、字幕与地址有效期。
6. 最后切换外部网络，核对远程授权、连接方式和播放质量。

能登录、能看到海报，只能证明媒体库接口可用。视频、字幕与重定向地址可能走不同路径，需要分别验证。

## 远程访问、备份与更新

### 远程访问

仅自己和家人使用时，可先考虑设备组网；已有可用公网入口时，再配置域名、HTTPS 反向代理和用户权限。具体网络选择见 [NAS 远程访问](/posts/2026-10-09-nas-remote-access/)。Plex 还要检查自己的远程访问状态与账号授权；不能只验证浏览器能登录云端账号。

本地视频从家中 NAS 发往外网时，家庭上行带宽会限制播放质量。云端 STRM 或挂载文件是否占用家庭带宽，取决于实际取流、转发与转码路径，要结合服务端会话、代理日志和 NAS 流量判断。直接播放不自动等于媒体流绕过 NAS。

### 备份后再更新

每个服务分别保存 Compose、`.env` 与持久化的 `config`。媒体原文件、NFO、字幕和 STRM 另行备份；`cache`、`transcode` 不是媒体备份。`.env` 或配置数据库可能含账号、令牌和密钥，不要公开。

先记录当前镜像版本或 digest，停止对应服务后复制配置，减少数据库写入时备份不一致。下面以 Emby 为例，在 Jellyfin / Plex 项目中把服务名换成 `jellyfin` / `plex`：

```bash
docker compose stop emby
# 此时备份 compose.yaml、.env 与 config 目录
docker compose pull emby
docker compose up -d emby
docker compose logs --tail=100 emby
```

本文使用稳定 `latest` 方便首次部署，长期运行可在验证后固定版本或 digest。Plex 的 `public`、`beta` 标签另有启动时下载安装服务端的行为，不能与本文 `latest` 示例混为一谈。

更新后检查登录、媒体库、插件与播放。回退可能需要恢复与旧版本匹配的数据库备份，不能假定旧镜像能直接打开升级后的数据库。迁移 NAS 时，尽量保持容器内路径一致，并重新核对目录权限。更换媒体服务应让新服务使用自己的配置目录读取媒体，不要把 Emby 数据库直接交给 Jellyfin 或 Plex。

## 常见问题

| 现象                        | 优先排查                                                                                     |
| --------------------------- | -------------------------------------------------------------------------------------------- |
| 容器启动失败                | `.env` 是否填写、挂载源是否存在、端口是否冲突，是否映射了不存在的 GPU 设备                   |
| 页面打不开                  | 容器日志、宿主端口、防火墙和 NAS 地址；Jellyfin 示例从外部访问 `8097`，host 模式不用 `ports` |
| 媒体库没有文件              | 使用的是否为容器内路径、目录读取与父目录访问权限、内容类型、文件命名                         |
| 配置无法保存或容器反复重启  | `config` / `cache` / `transcode` 是否可写；有没有混用其他镜像的 UID / GID 参数               |
| 有影片但没有海报            | 元数据来源、语言、网络连通性，本地文件命名与该服务的读取规则                                 |
| 保存字幕失败                | 媒体挂载是否仍为只读、服务账户是否有写入权限                                                 |
| MoviePilot 能连接但不刷新   | 实际整理目标、路径映射、服务端类型、刷新设置与日志                                           |
| STRM 能入库但无法播放       | 生成器与服务端是否兼容，文件中的地址是否有效，实际取流方能否访问，认证与跳转是否满足要求     |
| Emby 客户端提示解锁         | 区分该客户端播放授权、Emby Premiere 与第三方应用付费功能                                     |
| Jellyfin 设备权限不足       | 映射的 `renderD*` 是否正确，非 root 用户是否加入设备所属的数字组                             |
| Plex 找不到或无法认领服务器 | 是否登录正确账号、令牌是否有效、服务器网络与日志，必要时使用官方初始化隧道方案               |
| Plex 本地能播、外网不能播   | 远程访问状态、对应账号与服务器所有者的远程播放权限、网络入口和带宽                           |
| 开启硬件加速仍然卡顿        | 实际硬件使用情况、字幕烧录、视频格式、驱动、临时空间、温度与可用带宽                         |
| 电视 APK 安装失败或无法操作 | 系统支持的 ABI、Android 版本、应用签名，以及是否为遥控器适配的 TV 版                         |
| 外网只看到海报              | 视频实际地址、HTTPS 与代理入口、跳转后的内网地址和家庭上行能力                               |

## 参考资料

- 磕巴白菜：[绿联 NAS 部署 Emby，打造家庭影音中心][keba-emby]、[Emby 全平台客户端攻略][keba-client]：本文部署顺序与客户端整理的参考，品牌界面截图可对照原文。
- LinuxServer：[Emby 镜像说明][lsio]：架构、权限变量、挂载与 GPU 配置。
- Emby：[官方下载][emby-download]、[Premiere 功能说明][premiere]、[媒体库设置][library]、[电影命名][movie-naming]、[剧集命名][tv-naming]。
- Emby：[播放方式说明][playback]、[硬件加速概览][hardware]、[STRM 文件][strm]。
- Jellyfin：[项目与授权][jellyfin-home]、[官方容器部署][jellyfin-container]、[初始化向导][jellyfin-wizard]、[硬件加速概览][jellyfin-hardware]、[Intel 加速配置][jellyfin-intel]、[客户端下载][jellyfin-clients]。
- Plex：[官方 Docker 仓库][plex-docker]、[安装与初始化][plex-install]、[转码目录与设置][plex-transcoder]、[硬件加速][plex-hardware]、[免费与付费功能][plex-paid]、[Plex Pass][plex-pass]。
- Docker：[host 网络驱动][docker-host]。
- Android：[ABI 与架构说明][android-abi]；各客户端项目与商店入口见上文平台表。
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
[jellyfin-home]: https://jellyfin.org/
[jellyfin-container]: https://jellyfin.org/docs/general/installation/container/
[jellyfin-wizard]: https://jellyfin.org/docs/general/post-install/setup-wizard/
[jellyfin-hardware]: https://jellyfin.org/docs/general/post-install/transcoding/hardware-acceleration/
[jellyfin-intel]: https://jellyfin.org/docs/general/post-install/transcoding/hardware-acceleration/intel/
[jellyfin-clients]: https://jellyfin.org/downloads/clients/
[plex-docker]: https://github.com/plexinc/pms-docker
[plex-claim]: https://www.plex.tv/claim/
[plex-install]: https://support.plex.tv/articles/200288586-installation/
[plex-transcoder]: https://support.plex.tv/articles/200250347-transcoder/
[plex-hardware]: https://support.plex.tv/articles/115002178853-using-hardware-accelerated-streaming/
[plex-paid]: https://support.plex.tv/articles/202526943-plex-free-vs-paid/
[plex-pass]: https://support.plex.tv/articles/201751006-plex-pass-feature-overview/
[plex-download]: https://www.plex.tv/media-server-downloads/?cat=plex+apps
