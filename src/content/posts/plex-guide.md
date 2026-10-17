---
title: Plex：Docker 部署、媒体库与远程播放
description: 用官方 Docker 镜像部署 Plex，认领服务器、建媒体库，配置硬件转码与外网播放。
author: Ayulog
pubDatetime: "2026-10-10T16:00:00+08:00"
draft: false
category: library
tags:
  - Plex
  - NAS
  - Docker
  - 家庭影音
---

Plex 用账号认领自己的媒体服务器，再让手机、电视和电脑连接。部署用 Linux NAS 上的官方 Docker 镜像，第一次先处理服务器认领和媒体目录权限。

认领和媒体库在局域网内完成；硬件转码与外网播放涉及 Plex Pass，可以之后再处理。其他播放器、整理和网盘工具见 [NAS 服务清单](/posts/nas-software-websites/)。

## 目录和权限

媒体库使用整理后的电影、剧集目录，不重复扫描下载临时文件和做种原始目录。下面的 `/path/to/data` 是 NAS 路径占位符：

```text
/path/to/data/
├── downloads/
└── library/
    ├── movies/
    └── tv/
```

确认服务账户的 UID 和 GID：

```bash
id <service-user>
```

把结果中的数字填入后文 `.env`。服务账户要能读取媒体文件、逐层访问父目录，读写本服务的配置和缓存目录；NAS 的共享文件夹使用 ACL 时也要核对相应权限。

媒体统一映射为容器内的 `/data/library`，电影库填 `/data/library/movies`，剧集库填 `/data/library/tv`。示例只读挂载，允许读媒体旁已有的字幕和元数据；需要保存新字幕或资料到媒体旁时，再取消 `:ro` 并授予写权限。

文件可以先按下面的基本方式命名，更细的字段见[影视资源命名](/posts/media-resource-naming/)：

```text
movies/Movie Name (2024)/Movie Name (2024).mkv
tv/Series Name (2024)/Season 01/Series Name S01E01.mkv
```

Plex 用账号认领服务器，镜像采用 [Plex 官方 Docker 镜像][plex-docker]，以 host 网络运行；认领与媒体库初始化都在同一局域网内完成。

## 使用官方 Docker 镜像

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

host 模式直接使用 NAS 网络，不需要 `ports`。如果 NAS 上已有原生 Plex 或另一个 Plex 容器，应先检查 `32400` 等端口占用。仅支持 bridge 网络的环境，按官方仓库的 bridge 示例配置端口与 `ADVERTISE_IP`；只删掉 `network_mode: host` 不会补上端口和客户端发现配置。

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

## 首次配置与媒体库

按[Plex 安装与初始化说明][plex-install]完成以下步骤：

1. 确认看到的是自己的 Plex Media Server，设置服务器名称。
2. 添加电影库与电视节目库，选择语言，分别使用 `/data/library/movies` 和 `/data/library/tv`。
3. 完成一次小范围扫描；识别错误时先核对片名、年份、季集编号，再手动匹配单个条目。
4. 在服务器的转码设置中显示高级选项，确认临时目录为 `/transcode`，并为其保留可用空间。
5. 使用同一账号的客户端播放本地影片，再按需要配置家庭成员访问与远程连接。

Plex 的媒体代理和本地元数据读取规则与 Emby / Jellyfin 不同，文件旁有 NFO 时也要先检查一个样本的标题、海报、季集与字幕，再扩大扫描范围。`/transcode` 只存临时文件，不应选电影库、数据库目录或含其他资料的目录。

若初始化时无法找到或认领服务器，官方文档提供 SSH 隧道方式：在自己的电脑连接 NAS，将本地端口转到 NAS 的 Plex 端口，然后访问本机地址完成设置。下面的 `NAS_USER` 和 `NAS_IP` 均需替换为实际值：

```bash
ssh -N -L 8888:127.0.0.1:32400 NAS_USER@NAS_IP
```

保持隧道运行，在浏览器打开 `http://127.0.0.1:8888/web`。这是初始化访问手段，不是公网转发配置，也不需要为了认领而把未完成设置的服务暴露到外网。

## Plex Pass、远程播放与硬件转码

按当前[免费与付费说明][plex-paid]，同一局域网内播放自己的个人视频与远程播放采用不同规则。**Remote Watch Pass 只提供对应账号的远程播放权限，不包含硬件转码等 Plex Pass 高级功能。** [Plex Pass 说明][plex-pass]列明：账号自身可远程播放；服务器所有者有 Plex Pass 时，其授权访问该服务器的其他用户也可获得相应远程播放能力。具体客户端与账号要求以官方说明为准。

本文 Docker 场景中，硬件转码需要服务器所有者具有 Plex Pass。以受支持的 Intel 核显为例，宿主机确认 `/dev/dri` 可用后，在 `services.plex` 下增加：

```yaml
devices:
  - /dev/dri:/dev/dri
```

重建容器后，在服务器 **Settings → Transcoder** 中启用 **Use hardware acceleration when available**，按需要启用硬件编码。详细硬件、驱动、编码格式和平台限制见[Plex 硬件加速文档][plex-hardware]；上面的映射按 Intel 核显写，换成 NVIDIA 需要另按文档配置。

主动降低一次客户端播放质量以触发转码，在服务器的播放活动详情中确认视频格式旁出现 `(hw)`，同时观察画面、字幕、拖动和日志。“正在转码”本身说明不了 GPU 是否参与；音频转换、字幕处理或部分解码仍在 CPU 上跑。

## 客户端与上游工具

从[Plex 官方下载页][plex-download]选择桌面、移动或电视客户端，登录有权访问自己服务器的账号。先验证家庭局域网内播放，再按自己的账号权限、网络入口与带宽测试外网。客户端连上 Plex 账号，说明的是账号服务可达；NAS 的视频流是否通、够不够快，要单独测。

需要 MoviePilot 刷新 Plex 时，在其媒体服务器配置中选择 Plex，按当前界面要求设置服务器地址与凭据，验证媒体库列表后再测试整理刷新。Plex 使用自己的认证与媒体库接口，Emby 的 API 密钥、插件和 CMS 的 Emby 302 入口不能照搬到 Plex。若自动化链路主要围绕 Emby / Jellyfin 的 STRM 展开，先核对生成器与播放器对 Plex 的支持，再决定是否迁移。

## 直接播放与硬件转码

### 先看当前播放方式

| 播放方式                  | 服务端主要做什么                     | 需要关注什么                   |
| ------------------------- | ------------------------------------ | ------------------------------ |
| 直接播放（Direct Play）   | 以客户端支持的原始媒体形式提供播放   | 客户端解码、字幕支持和网络带宽 |
| 直接串流（Direct Stream） | 保留视频编码，按需重新封装或转换音频 | 封装、音轨与客户端兼容性       |
| 转码（Transcoding）       | 重新编码视频，可能同时处理音频、字幕 | CPU / GPU 能力、码率、临时目录 |

在对应服务端的播放会话、转码日志或客户端播放信息中查看实际模式和原因。视频可以直播放时，不需要为了“用上核显”强行转码。

字幕格式、音轨、客户端能力和播放质量限制都可能触发处理。比如某些客户端无法直接显示 PGS 字幕，需要服务端将字幕烧录进画面，即使启用了硬件加速，仍可能有较高 CPU 占用。

## 更新与备份

每套 Plex 使用独立的 `config`。官方镜像要求数据库所在文件系统支持文件锁，不把网盘挂载目录当作数据库目录，也不与其他媒体服务共用配置。

保存 `compose.yaml`、`.env` 和 `config`，媒体另外备份；`transcode` 是临时目录。先记录当前镜像版本或 digest，停止服务后复制配置：

```bash
docker compose stop plex
# 此时备份 compose.yaml、.env 与 config
docker compose pull plex
docker compose up -d plex
docker compose logs --tail=100 plex
```

本文使用 `latest`；官方镜像的 `public`、`beta` 标签会在启动时下载安装服务端，行为不同。数据库升级后，回退旧镜像可能还需要恢复配套的配置备份。

## 常见问题

| 现象                   | 检查位置                                                              |
| ---------------------- | --------------------------------------------------------------------- |
| 访问不到网页           | 本文采用 host 网络，检查 NAS 的 `32400` 端口占用与防火墙              |
| 找不到或无法认领服务器 | 登录账号、Claim 令牌、服务端出站网络与日志；必要时使用初始化 SSH 隧道 |
| 媒体目录为空           | `/data/library` 映射、`PLEX_UID` / `PLEX_GID` 与目录权限              |
| 没有硬件转码选项       | 服务器所有者的 Plex Pass、驱动、设备映射与硬件支持                    |
| 本地能播、外网不能播   | 远程访问状态、账号的远程播放权限、视频路径和家庭上行带宽              |
| 转码失败或临时空间不足 | `/transcode` 是否可写且空间足够，目录不要位于媒体库内                 |

远程网络配置可参考 [NAS 远程访问](/posts/nas-remote-access/)。

## 参考资料

- Plex：[官方 Docker 仓库][plex-docker]、[安装与初始化][plex-install]。
- Plex：[转码目录与设置][plex-transcoder]、[硬件加速][plex-hardware]。
- Plex：[免费与付费功能][plex-paid]、[Plex Pass][plex-pass]、[客户端下载][plex-download]。

[plex-docker]: https://github.com/plexinc/pms-docker
[plex-claim]: https://www.plex.tv/claim/
[plex-install]: https://support.plex.tv/articles/200288586-installation/
[plex-transcoder]: https://support.plex.tv/articles/200250347-transcoder/
[plex-hardware]: https://support.plex.tv/articles/115002178853-using-hardware-accelerated-streaming/
[plex-paid]: https://support.plex.tv/articles/202526943-plex-free-vs-paid/
[plex-pass]: https://support.plex.tv/articles/201751006-plex-pass-feature-overview/
[plex-download]: https://www.plex.tv/media-server-downloads/?cat=plex+apps
