---
title: Emby：Docker 部署、媒体库与客户端设置
description: 用 Docker 部署 Emby，设置媒体库、刮削、硬件转码与客户端，并接入 MoviePilot 和 CMS。
author: Ayulog
pubDatetime: "2026-10-10T13:00:00+08:00"
draft: false
category: library
tags:
  - NAS
  - Emby
  - Docker
  - 家庭影音
  - 教程
---

Emby 把 NAS 上的电影和剧集整理成海报墙，保存用户、观看记录和播放进度。部署使用 LinuxServer 的 Docker 镜像，主要工作在目录权限、首次配置、硬件转码和手机、电视、电脑端的客户端选择上。

文件由 MoviePilot 整理好，或由 CMS 生成 STRM 之后，都可以交给 Emby 入库。完整接法见 [DebNAS 自动观影流程](/posts/debnas-media-workflow/)；其他媒体库与配套工具放在 [NAS 服务清单](/posts/nas-software-websites/)。

## 先分清服务端、客户端和 Premiere

| 名称          | 用途                                               | 安装或使用位置                 |
| ------------- | -------------------------------------------------- | ------------------------------ |
| Emby Server   | 扫描媒体、提供海报墙、管理用户与播放记录，按需转码 | NAS、长期运行的电脑或服务器    |
| Emby 客户端   | 连接服务器、浏览媒体库与播放视频                   | 手机、平板、电视、电脑或浏览器 |
| Emby Premiere | 解锁官方列出的高级功能，例如硬件加速转码           | 在自己的服务器中配置授权       |
| 第三方客户端  | 使用自己的界面与播放引擎连接 Emby                  | 依各项目支持的平台安装         |

Emby 本身不提供影片。下载、订阅和整理可以交给下载器、MoviePilot 等工具；已有本地视频时，也可以直接建立媒体库，不必先搭好整套自动化服务。

**服务器授权、官方客户端播放解锁、第三方播放器的付费功能是不同的项目。** 不要把某个客户端的会员当成 Emby Premiere，也不要默认买了 Premiere 就包含所有第三方应用。购买前对照 [Premiere 说明][premiere]及应用商店中的功能要求。

## 准备目录与权限

先安装 NAS 厂商提供的 Docker 应用，并固定局域网地址；自建 Debian 则按 [Docker 官方安装文档](https://docs.docker.com/engine/install/debian/)准备引擎和 Compose 插件。

下面使用三类目录，实际路径在自己的 NAS 上确认：

```text
stacks/emby/
├── compose.yaml
├── .env
├── config/             # 数据库、账号、插件与服务设置
└── transcode/          # 临时转码文件

data/
├── downloads/          # 下载与做种目录，不加入 Emby 媒体库
└── library/
    ├── movies/         # 整理后的电影
    └── tv/             # 整理后的剧集
```

`config` 可以随着媒体库、海报和插件数据增长，需留出空间。`transcode` 也需要可写空间，避免转码时挤满系统分区。媒体文件可以放在容量更大的存储空间中。

本文使用 **LinuxServer 维护的 `lscr.io/linuxserver/emby` 镜像**。根据其[镜像说明][lsio]，`PUID` 和 `PGID` 对应容器内应用运行时使用的用户、用户组，需与宿主机目录权限相匹配。支持 SSH 的系统可用下面的命令查询准备使用的服务账户：

```bash
id <service-user>
```

将 `<service-user>` 替换为实际账户；不要直接沿用别人教程中的 `0` 或 `1000`。该账户应能读写 `config` 和 `transcode`，读取媒体目录，并具有逐层访问父目录的权限。NAS 使用 ACL 时，还需要检查其共享文件夹权限设置。

## 使用 Docker Compose 部署

### 选定镜像，保持参数一致

参考文章使用 LinuxServer 镜像，它由 LinuxServer 团队维护；Emby 自家另有 `emby/embyserver` 镜像。两者的权限变量不同：

| 镜像                       | 权限变量                | 本站示例                    |
| -------------------------- | ----------------------- | --------------------------- |
| `lscr.io/linuxserver/emby` | `PUID`、`PGID`          | 本文独立部署示例            |
| `emby/embyserver`          | `UID`、`GID`、`GIDLIST` | DebNAS 自动观影流程中的示例 |

已有稳定部署时，继续按现有镜像的文档维护。更换镜像时，环境变量、配置目录和权限要一起核对，`image` 一行只是其中一项。这里采用 LinuxServer 的稳定通道 `latest`；正式长期运行可在验证后固定具体版本标签或 digest。

### 保存配置文件

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

这里的 `/transcode` 是自定义的临时目录，**还需要在 Emby 的转码设置中将临时路径设为 `/transcode`**。单独挂载目录不会自动更改应用设置。

本地媒体播放不需要默认开启特权模式，也不要求先添加 GPU。参考文章同时写了 `network_mode: host` 和 `ports`；根据 [Docker host 网络说明][docker-host]，host 模式下端口映射不生效。若因特定发现协议改用 host，应删除 `ports`，并直接使用 Emby 在宿主机上监听的端口。

`8920` 是 Emby 的 HTTPS 端口，但需要配置证书和相关设置。只写 `8920:8920` 不会自动得到 HTTPS；初次部署先验证局域网 HTTP，远程访问时再配置 HTTPS 入口。

### 启动并查看日志

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

如果镜像拉取失败，参考 [Docker 镜像加速与拉取排查](/posts/docker-registry-mirrors/)。不要为了处理一个下载错误，同时更换镜像、网络和整个配置目录，否则很难判断问题来源。

## 初始化与媒体库设置

### 完成首次向导

1. 设置界面语言，创建服务端管理员及密码。
2. 建立一个电影库和一个剧集库，先各放少量文件。
3. 按需要设置元数据语言与地区，完成初始化。
4. 在转码设置中填写前面准备的 `/transcode`。
5. 为日常观看创建普通用户，按需分配媒体库访问权限。

手动连接自己的服务器时，使用服务器上创建的本地账号即可。Emby Connect 是另外的账号连接功能；它不改变服务器本身的网络可达性，也不会自动完成家庭网络穿透。

### 添加的是容器内路径

按照本文配置，Emby 看到的是 `/data/library`，不是宿主机上的 `/path/to/data/library`：

| 媒体库   | 内容类型 | Emby 中填写的目录      |
| -------- | -------- | ---------------------- |
| 本地电影 | 电影     | `/data/library/movies` |
| 本地剧集 | 电视节目 | `/data/library/tv`     |
| 动画电影 | 电影     | 对应的动画电影目录     |
| 动画剧集 | 电视节目 | 对应的动画剧集目录     |

动画应按电影和连续剧区分库类型。开始时不必复制复杂的地区分类；如果后续使用 `tv/国产剧`、`tv/欧美剧` 等中间层，按 [Emby 剧集命名说明][tv-naming]，可在同一个剧集库中分别添加这些分类目录，使每个路径下面直接对应各部剧集。

### 文件命名先做到清楚

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

### 明确谁负责刮削

刮削就是识别影片并获取简介、海报等元数据，可以由 Emby 或上游整理工具负责：

- **只有视频文件**：在 Emby 中选择适合的元数据与图片提供方，设置语言、地区，先验证一部影片的识别结果。
- **MoviePilot / CMS 已经生成 NFO 和海报**：让 Emby 读取现有本地元数据，按需求减少在线刮削和重复下载。读取器、下载器与保存设置按当前版本核对，参考截图里的选项数量会随版本变化。

使用上面的只读挂载时，Emby 可以读媒体旁已有的元数据，但写不回新的 NFO、海报或字幕。要启用“保存到媒体文件夹”一类功能，需同时调整挂载和目录权限。

没有海报也可能是元数据服务无法连接。先看服务端日志、DNS 和目标服务连通性；代理地址应来自自己的环境，不能直接复制参考文中的内网 IP。容器内的 `127.0.0.1` 指向容器自身，添加代理后还要确认本地媒体服务的访问不会被错误转发。

## 接入 MoviePilot、CMS 与插件

### 创建 API 密钥并配置 MoviePilot

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

已有名为 `emby` 的服务时，先确认目标实例，避免同一共享网络出现重复别名。MoviePilot 的目录映射要与实际文件布局对应；这里沿用 `/data/library`，不把下载和保种目录重复加入 Emby。

### 加入 CMS 生成的 STRM

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

先分别建立本地电影、本地剧集、云端电影和云端剧集库，容易看清哪个环节出问题。**STRM 只是把播放地址交给 Emby，走不走 302、视频流量是否绕过 NAS，取决于 CMS 的代理配置。** 如果使用 CMS 的 Emby 302 代理，还要按对应版本的说明配置入口，验证播放器是否能访问跳转后的地址。

CloudDrive2 / rclone 将网盘挂到宿主机后再交给 Emby 读取，是另一种接法，需要另外处理挂载先后顺序、断线恢复和容器可见性；不要把网盘挂载目录与 CMS 的 STRM 输出目录混为一谈。

### 神医助手按需安装

[StrmAssistant（Emby 神医助手）][strmassistant]提供媒体信息提取、字幕扫描、预览图、搜索等增强功能。它不负责下载资源，也不生成 STRM。

先确认 Emby 原生播放正常，再按插件项目说明核对 Emby 版本、插件版本及社区版 / PRO 的适配条件。生成预览图、提取媒体信息可能实际读取远程视频，云端库需要控制任务频率，并观察请求与流量。

<span id="emby-硬件转码"></span>

## 直接播放与硬件转码

### 先看当前播放方式

| 播放方式                  | 服务端主要做什么                     | 需要关注什么                   |
| ------------------------- | ------------------------------------ | ------------------------------ |
| 直接播放（Direct Play）   | 以客户端支持的原始媒体形式提供播放   | 客户端解码、字幕支持和网络带宽 |
| 直接串流（Direct Stream） | 保留视频编码，按需重新封装或转换音频 | 封装、音轨与客户端兼容性       |
| 转码（Transcoding）       | 重新编码视频，可能同时处理音频、字幕 | CPU / GPU 能力、码率、临时目录 |

在 Emby 管理面板的播放会话或客户端播放信息中查看实际模式和原因。视频可以直播放时，不需要为了“用上核显”强行转码。

字幕格式、音轨、客户端能力和播放质量限制都可能触发处理。比如某些客户端无法直接显示 PGS 字幕，需要服务端将字幕烧录进画面，即使启用了硬件加速，仍可能有较高 CPU 占用。

### Linux NAS 上的 Intel / AMD 设备

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

### 在 Emby 内启用并验证

官方将硬件加速转码列入 [Emby Premiere][premiere] 功能。完成适用授权与设备配置后，在转码设置中选择可用的硬件加速方式。HDR 转 SDR 的色调映射还取决于具体 GPU、驱动、系统和视频格式，选了硬件加速之后仍要用实际播放确认。

选择一段测试视频，将客户端质量临时调低以触发转码，查看会话、服务端转码日志和资源占用；结束后恢复日常质量设置。确认视频正常、字幕正确、拖动可用，并核对实际使用的是哪种硬件处理方式。

## 各平台客户端怎么选

先从 [Emby 官方下载页][emby-download]找对应平台的客户端，用它验证服务器和账号，再比较自己喜欢的第三方界面。手机、电视和桌面版面向的操作方式不同，电视端尤其要确认遥控器、字幕与音轨切换是否顺手。

### Android 手机、平板与 Android TV

| 客户端          | 入口与适用设备                                                                                   | 选择时注意                                                                |
| --------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Emby 官方客户端 | [官方下载][emby-download]，分别查看 Android 与 Android TV                                        | 先核对设备系统版本及该客户端的播放解锁要求                                |
| Yamby           | [Google Play](https://play.google.com/store/apps/details?id=com.hush.yamby)，Android 手机 / 平板 | 商店明确为第三方 Emby 客户端，含应用内购买；按功能说明区分基础与 PRO 功能 |
| iPlay           | [项目入口](https://github.com/saltpi/iPlay)中的 Android 下载                                     | 支持 Emby / Jellyfin，按项目当前下载表选择安装包                          |
| AfuseKt         | [移动版发布页](https://github.com/AttemptD/AfuseKt-release)                                      | 项目说明支持 Emby 直连，移动版要求 Android 8 或以上                       |
| AfuseKt TV      | [TV 版发布页](https://github.com/AttemptD/AfuseKtV-release)                                      | 与移动版分开发布，按电视版本说明安装和配置                                |

AfuseKt 的发布仓库明确只提供安装包，不含源码，所以它不算开源客户端。各应用的付费方式、设备限制和 TV 版授权是否通用，要看对应版本说明。

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

仅凭 `mobile-release.apk` 这类名称，无法确定是不是通用包；`universal` 也不是“所有 Android 设备都能装”。更新能否覆盖安装还涉及应用包名、签名、版本与系统限制，与 ARM 位数没有直接关系。相关概念见 [Android ABI 文档][android-abi]。

### iPhone、iPad、Mac 与 Apple TV

苹果平台的选择比较多，表中的平台范围来自当前项目或商店说明，用于初筛；购买前再核对最低系统版本；“iPhone / iPad 应用可在 Apple 芯片 Mac 上运行”与原生 macOS 客户端也应分别看待。

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

选播放器时，“支持 Emby”只是入门条件。实际常用的是字幕样式与偏移、音轨切换、续播与观看记录同步，以及电视上的遥控器体验。HDR、杜比视界和音频输出，还要结合文件格式、设备、电视或功放一起验证。

参考文另收录了 [Forward](https://apps.apple.com/cn/app/id6503940939)。本次未能从所查商店入口确认当前可用页面，这里只保留原入口，没有放进上表的已核实选项。

### Windows、Linux 与桌面端

Windows 上可以先用浏览器或 [Emby 官方桌面客户端][emby-download]。希望换一种界面时，再查看 [iPlay](https://github.com/saltpi/iPlay) 的 Windows 发行入口；它的项目说明明确支持 Emby / Jellyfin。

参考文提到的“终点站”是 [Terminus Media Player](https://github.com/Terminus-Media/jellyfin-media-player)。其 [v221122 发行说明](https://github.com/Terminus-Media/jellyfin-media-player/releases/tag/v221122)明确支持 Emby 和 Jellyfin，仓库名里的 Jellyfin 不影响它接入 Emby。不过核对时标记为 Latest 的版本发布于 **2022 年 11 月 22 日**，适合作为旧版备选，与当前服务端、系统及视频格式的兼容性需自行验证。仓库虽然提到 Linux，该版本说明又注明没有编译 Linux 包。

[Tsukimi](https://github.com/tsukinaha/tsukimi) 的当前项目说明是 **Linux 上的 Jellyfin 客户端**。本次未从当前说明中确认 Windows 或 Emby 支持，因此不沿用参考文章中的 Windows Emby 推荐位置。

iPlay 的参考链接 `ourfor/iPlay` 当前是上游的 fork，本文使用其 README 指向的 `saltpi/iPlay` 入口。客户端下载走当前项目发布页或官方商店，不固定到旧网盘合集中的某一版安装包。

## 连接服务器与验证播放

在客户端添加服务器时，填写当前设备可访问的 Emby 地址、端口及该服务器上的账号。局域网示例是 `http://NAS_IP:8096`；如果界面把地址与端口分成两个输入框，就分别填写。使用 HTTPS 域名时，按自己的反向代理入口填写。

`http://emby:8096` 是 Docker 共享网络内的服务地址，一般不能直接填进手机或电视。若采用 CMS 的 302 代理入口，应按该方案填写相应入口；不要把 CMS 管理端口、Emby 端口和播放代理端口混用。

先在浏览器验证账号和服务器，再用常用客户端做一次完整测试：

1. 播放本地影片，查看实际播放模式。
2. 切换字幕与音轨，观察是否意外触发转码。
3. 拖动进度，暂停后退出，再进入检查续播位置。
4. 换另一台设备，确认观看记录是否按预期同步。
5. 使用 STRM 时，单独验证云端影片的起播、拖动和字幕。
6. 最后切到移动网络或外部网络，重复测试。

能登录、能看到海报，说明的是媒体库接口可用。视频、字幕和重定向地址可能走不同路径，逐项测一遍再算通过。

## 远程访问、备份与更新

### 远程访问

仅自己和家人使用时，可先考虑设备组网；已有可用公网入口时，再配置域名、HTTPS 反向代理和用户权限。具体网络选择见 [NAS 远程访问](/posts/nas-remote-access/)。

本地视频从家中 NAS 发往外网时，家庭上行带宽会限制播放质量；云端 STRM 是否占用家庭带宽，取决于实际取流和转发方式。需要结合 Emby 会话、代理日志和 NAS 流量核对。

### 备份后再更新

重点保存 Compose、`.env` 和持久化的 `config`。媒体原文件、NFO、字幕与 STRM 另行备份；`transcode` 是临时目录，不应作为媒体备份。备份 `.env` 时注意其中可能加入的密钥。

可以停止容器后复制 `config`，减少数据库写入过程中的不一致。保留当前镜像版本或 digest，再执行更新：

```bash
docker compose stop emby
# 此时备份 compose.yaml、.env 与 config 目录
docker compose pull emby
docker compose up -d emby
docker compose logs --tail=100 emby
```

更新后检查登录、媒体库、播放与插件。回退可能需要恢复与旧版本匹配的数据库备份，不能假定旧镜像一定能打开升级后的数据库。迁移 NAS 时，也要保持或同步调整容器内媒体路径与目录权限。

## 常见问题

| 现象                        | 优先排查                                                                        |
| --------------------------- | ------------------------------------------------------------------------------- |
| 容器启动失败                | `.env` 是否填写、挂载源是否存在、端口是否冲突；是否添加了不存在的 GPU 设备      |
| 页面打不开                  | 容器日志、宿主机发布端口、防火墙和 NAS 地址；host 模式下不要按 `ports` 判断端口 |
| 媒体库没有文件              | 使用的是否为容器内路径、目录读取权限、内容类型和文件命名                        |
| 有影片但没有海报            | 元数据来源、语言设置、网络连通性及本地 NFO / 图片命名                           |
| 想保存字幕却失败            | 媒体挂载是否仍为只读、服务账户是否有写入权限                                    |
| MoviePilot 能连接但不刷新   | 实际整理目标、路径映射、刷新设置与服务端日志                                    |
| STRM 能入库但无法播放       | 文件中的地址是否有效、实际请求方能否访问、认证和重定向是否满足要求              |
| 客户端能浏览却提示解锁      | 对照该应用的播放授权、Premiere 与第三方付费功能要求                             |
| 开了硬件加速仍然卡顿        | 会话是否使用了硬件、字幕烧录、视频格式、驱动、温度与可用带宽                    |
| 电视安装 APK 失败或无法操作 | APK 对应的 ABI、Android 版本、签名，以及是否提供遥控器适配的 TV 版本            |
| 外网只能看到海报            | HTTPS 与代理入口、视频实际地址、跳转后的内网地址和家庭上行能力                  |

## 其他媒体库

<span id="emby"></span>
<span id="先选一个媒体库"></span>

Emby、Jellyfin、Plex 可以读取同一份媒体，但数据库和配置目录要分开。

<span id="jellyfin"></span>
<span id="使用官方-docker-镜像"></span>
<span id="首次配置与媒体库"></span>
<span id="intel-核显与设备权限"></span>
<span id="客户端与自动整理"></span>

Jellyfin 的 [Docker 部署](/posts/jellyfin-guide/#使用官方-docker-镜像)、[首次配置](/posts/jellyfin-guide/#首次配置与媒体库)、[Intel 核显权限](/posts/jellyfin-guide/#intel-核显与设备权限)和[客户端设置](/posts/jellyfin-guide/#客户端与自动整理)见独立教程。

<span id="plex"></span>
<span id="使用官方-docker-镜像-1"></span>
<span id="首次配置与媒体库-1"></span>
<span id="plex-pass远程播放与硬件转码"></span>
<span id="客户端与上游工具"></span>

Plex 的 [Docker 部署](/posts/plex-guide/#使用官方-docker-镜像)、[服务器认领](/posts/plex-guide/#首次配置与媒体库)、[远程播放与硬件转码](/posts/plex-guide/#plex-pass远程播放与硬件转码)和[客户端设置](/posts/plex-guide/#客户端与上游工具)见独立教程。

## 参考资料

- 磕巴白菜：[绿联 NAS 部署 Emby，打造家庭影音中心][keba-emby]、[Emby 全平台客户端攻略][keba-client]：本文部署顺序与客户端整理的参考，品牌界面截图可对照原文。
- LinuxServer：[Emby 镜像说明][lsio]：架构、权限变量、挂载与 GPU 配置。
- Emby：[官方下载][emby-download]、[Premiere 功能说明][premiere]、[媒体库设置][library]、[电影命名][movie-naming]、[剧集命名][tv-naming]。
- Emby：[播放方式说明][playback]、[硬件加速概览][hardware]、[STRM 文件][strm]。
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
