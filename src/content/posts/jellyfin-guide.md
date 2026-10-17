---
title: Jellyfin：Docker 部署与硬件转码设置
description: 用官方 Docker 镜像部署 Jellyfin，处理目录与核显权限，接入客户端和 MoviePilot。
author: Ayulog
pubDatetime: "2026-10-10T16:00:00+08:00"
draft: false
category: library
tags:
  - Docker
---

Jellyfin 的服务端和官方客户端免费，账号由自己的服务器管理。Docker 部署容易卡在媒体目录权限和核显设备权限上，先把这两处配好。

示例面向 Linux 上的官方镜像。Windows / macOS 按官方建议使用原生安装，Docker Desktop 的路径、挂载和 GPU 行为与 NAS 不同。相关工具见 [NAS 服务清单](/posts/nas-software-websites/)。

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

[Jellyfin 官方说明][jellyfin-home]明确：服务端与官方客户端免费，硬件加速没有额外的订阅解锁。使用第三方播放器时，其收费仍由该应用决定。免费的只是软件本身，路径、播放与转码还要按自己的设备逐项验证。

## 使用官方 Docker 镜像

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

## 首次配置与媒体库

按[官方初始化向导][jellyfin-wizard]完成以下步骤：

1. 选择界面语言，创建本地管理员账号与密码。
2. 添加“电影”库，目录填 `/data/library/movies`；添加“电视节目”库，目录填 `/data/library/tv`。
3. 设置元数据首选语言与地区；有需要时再按库单独调整。
4. 根据自己的网络方案设置远程连接选项。勾选允许远程连接后，公网入口、域名和端口映射仍要另外配置。
5. 扫描少量影片，确认识别、海报、字幕和播放，再添加其余目录与普通观看用户。

如果上游已经生成 NFO 与图片，检查库中的本地元数据读取、图片下载和保存选项，先用一个条目验证是否沿用预期内容。本文媒体目录只读，不能让 Jellyfin 把新字幕或海报写回原目录。

## Intel 核显与设备权限

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

随后执行 `docker compose up -d` 重建容器。这里的 `group_add` 是为了让指定的非 root 用户访问设备；设备组名和 GID 在不同 NAS 上并不相同，要按前面 `ls -ln` 查到的数字填。多显卡环境也可能需要选择其他 `renderD*` 节点。

在 Jellyfin 管理面板的转码设置中，按[官方 Intel 指南][jellyfin-intel]选择 QSV 或适用的 VA-API，设备路径与映射保持一致，并只勾选硬件实际支持的解码格式。可先运行官方镜像内的工具检查驱动：

```bash
docker compose exec jellyfin /usr/lib/jellyfin-ffmpeg/vainfo
```

AMD、NVIDIA、Rockchip 等平台分别按[硬件加速文档][jellyfin-hardware]配置，上面的示例按 Intel 核显写。HDR 色调映射、字幕烧录与特定编码可能只能部分加速；是否真的走了硬件，要看播放日志。

## 客户端与自动整理

先用浏览器验证，再从[Jellyfin 官方客户端目录][jellyfin-clients]选择设备对应的应用，例如桌面的 Jellyfin Media Player、Android / Android TV、iOS 或 Kodi 插件。官方目录会区分官方与第三方客户端，手机、电视和桌面要分别下载对应的包。

客户端手动填写 `http://NAS_IP:8097` 和本地账号。MoviePilot 接入时选择 Jellyfin 类型，在 Jellyfin 后台按用途创建 API 密钥，填写可达地址与密钥，再验证整理后的刷新。使用宿主地址时端口是 `8097`；只有服务处于共同 Docker 网络时，才能使用 `http://jellyfin:8096`。CMS 插件、Emby 神医助手或 Emby 302 代理是否支持 Jellyfin，要看各项目自己的说明。

## 直接播放与硬件转码

### 先看当前播放方式

| 播放方式                  | 服务端主要做什么                     | 需要关注什么                   |
| ------------------------- | ------------------------------------ | ------------------------------ |
| 直接播放（Direct Play）   | 以客户端支持的原始媒体形式提供播放   | 客户端解码、字幕支持和网络带宽 |
| 直接串流（Direct Stream） | 保留视频编码，按需重新封装或转换音频 | 封装、音轨与客户端兼容性       |
| 转码（Transcoding）       | 重新编码视频，可能同时处理音频、字幕 | CPU / GPU 能力、码率、临时目录 |

在对应服务端的播放会话、转码日志或客户端播放信息中查看实际模式和原因。视频可以直播放时，不需要为了“用上核显”强行转码。

字幕格式、音轨、客户端能力和播放质量限制都可能触发处理。比如某些客户端无法直接显示 PGS 字幕，需要服务端将字幕烧录进画面，即使启用了硬件加速，仍可能有较高 CPU 占用。

## 播放检查和远程连接

在手机或电视上填写 `http://NAS_IP:8097` 和本地账号。容器内部仍使用 `8096`；只有处于共同 Docker 网络的应用，才可以连接 `http://jellyfin:8096`。

先播放一部本地影片，切换音轨与字幕，拖动进度，再退出检查续播。需要核实硬件转码时，临时降低客户端质量，查看转码日志和资源占用，随后恢复日常质量。海报只是媒体库接口的结果，视频、字幕和远程地址要另外测试。

外网连接可参考 [NAS 远程访问](/posts/nas-remote-access/)。启用服务器的远程访问选项，并不会自动配置域名、反向代理或家庭网络穿透；本地媒体的外网播放也受家庭上行带宽限制。

## 更新与备份

保存 `compose.yaml`、`.env` 和 `config`；媒体文件另外备份，`cache` 只作缓存。数据库不要与 Emby、Plex 共用。更新前记录当前镜像版本或 digest，停止服务后备份配置：

```bash
docker compose stop jellyfin
# 此时备份 compose.yaml、.env 与 config
docker compose pull jellyfin
docker compose up -d jellyfin
docker compose logs --tail=100 jellyfin
```

更新后检查账号、媒体库、插件和播放。数据库升级后，回退镜像可能还需要恢复对应版本的配置备份。

## 常见问题

| 现象                | 检查位置                                                               |
| ------------------- | ---------------------------------------------------------------------- |
| 页面打不开          | 示例宿主端口是 `8097`，检查容器日志、端口占用、防火墙                  |
| 看不到电影目录      | 填的是容器内路径；服务账户须具有目录读取和父目录访问权限               |
| 配置无法保存        | `config`、`cache` 的写入权限与 Compose `user` 是否一致                 |
| 核显报权限错误      | `/dev/dri` 的实际节点、设备所属数字组、`group_add`，以及重建后是否生效 |
| 开了硬解仍占用 CPU  | 实际转码方式、编码支持、字幕烧录与色调映射是否只能部分加速             |
| MoviePilot 不能刷新 | Jellyfin 类型、API 密钥、网络地址和整理路径映射                        |

## 参考资料

- Jellyfin：[官方容器部署][jellyfin-container]、[初始化向导][jellyfin-wizard]、[项目与授权][jellyfin-home]。
- Jellyfin：[硬件加速概览][jellyfin-hardware]、[Intel 配置][jellyfin-intel]、[客户端下载][jellyfin-clients]。

[jellyfin-home]: https://jellyfin.org/
[jellyfin-container]: https://jellyfin.org/docs/general/installation/container/
[jellyfin-wizard]: https://jellyfin.org/docs/general/post-install/setup-wizard/
[jellyfin-hardware]: https://jellyfin.org/docs/general/post-install/transcoding/hardware-acceleration/
[jellyfin-intel]: https://jellyfin.org/docs/general/post-install/transcoding/hardware-acceleration/intel/
[jellyfin-clients]: https://jellyfin.org/downloads/clients/
