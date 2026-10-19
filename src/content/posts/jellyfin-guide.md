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

[Jellyfin][jellyfin-home] 的服务端与官方客户端完全免费，用户账号由本地服务器独立管理，硬件加速转码也不需要额外付费订阅。使用官方 Docker 镜像部署时，核心工作在于配好媒体目录读写权限与 Linux 核显设备组权限。

以下配置面向 Linux NAS 上的官方容器镜像（Windows 与 macOS 建议直接使用官方原生安装包）。相关影音工具见 [NAS 服务清单](/posts/nas-software-websites/)。

## 目录和权限

Jellyfin 媒体库直接读取整理完成后的电影与剧集目录，不扫描下载器的临时目录和保种目录。假设宿主机数据根目录 `/path/to/data` 结构如下：

```text
/path/to/data/
├── downloads/
└── library/
    ├── movies/
    └── tv/
```

先在终端查询运行服务的 Linux 账户 UID 和 GID：

```bash
id <service-user>
```

记录输出的 UID 与 GID 数字，后续填入 `.env`。该账户需要对 Jellyfin 的 `config`（配置与数据库）和 `cache`（缓存）目录拥有读写权限，并对媒体库目录及上层父目录拥有读取权限（若 NAS 共享文件夹启用了 ACL，需一并核对）。

容器内统一将媒体库挂载到 `/data/library`（只读 `:ro`），电影库路径填 `/data/library/movies`，剧集库路径填 `/data/library/tv`。若希望让 Jellyfin 把新下载的字幕或元数据直接写回影片目录，再移除 `:ro` 并开放宿主机目录写权限。

影片建议按标准结构命名（详细规则见[影视资源命名](/posts/media-resource-naming/)）：

```text
movies/Movie Name (2024)/Movie Name (2024).mkv
tv/Series Name (2024)/Season 01/Series Name S01E01.mkv
```

## 使用官方 Docker 镜像

1. 在独立项目目录（如 `stacks/jellyfin`）创建 `.env`，填入实际 UID、GID 与数据根目录路径：

   ```dotenv
   PUID=1000
   PGID=1000
   MEDIA_ROOT=/path/to/data
   ```

2. 在同目录创建 `compose.yaml`（依据[官方容器文档][jellyfin-container]整理）：

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

   注意：官方 `jellyfin/jellyfin` 镜像通过 Compose 的 `user: "UID:GID"` 指定运行身份，而非 LinuxServer 镜像的 `PUID` / `PGID` 环境变量。此处将宿主机端口设为 `8097`，避免与同机运行的 Emby（默认 `8096`）冲突。

3. 在项目目录创建持久化文件夹并赋予服务账户读写权限，随后启动容器：

   ```bash
   mkdir -p config cache
   docker compose config -q
   docker compose pull
   docker compose up -d
   docker compose ps
   docker compose logs --tail=100 jellyfin
   ```

浏览器打开 `http://NAS_IP:8097` 即可进入后台。若需启用局域网客户端自动发现，可按官方文档补充映射 `7359:7359/udp`；若需使用 DLNA，则需改用 `network_mode: host` 并移除 `ports`（此时会直接占用宿主机 `8096` 端口）。

## 首次配置与媒体库

参照[官方初始化向导][jellyfin-wizard]完成基础配置：

1. 选择界面显示语言（`Chinese Simplified`），创建本地管理员账号与密码。
2. 添加媒体库：“电影”库目录填 `/data/library/movies`，“电视节目”库目录填 `/data/library/tv`。
3. 将元数据首选下载语言设为 `Chinese`，国家/地区设为 `People's Republic of China`。
4. 按需保持远程连接选项开启（若要从外网访问，还需另外配置反向代理或异地组网）。
5. 完成向导后先扫描少量影片，确认标题识别、海报加载与字幕显示正常，再为家人创建日常观看的普通账号。

若已由 MoviePilot 等上游工具生成了本地 NFO 与海报，可在媒体库设置中优先启用 NFO 读取器，避免重复在线刮削。

## 直接播放与硬件转码

Jellyfin 免费提供完整的硬件加速转码支持（包含 Intel QSV、VA-API、NVIDIA NVENC、AMD AMF 及 Rockchip RKMPP 等），无需购买任何订阅。播放时服务端会根据客户端兼容度自动选择处理模式：

| 播放方式                  | 服务端处理方式                                        | 资源消耗                       |
| ------------------------- | ----------------------------------------------------- | ------------------------------ |
| 直接播放（Direct Play）   | 直接把原始音视频流发给客户端解码                      | 仅占用磁盘读取与网络带宽       |
| 直接串流（Direct Stream） | 保持视频流不变，使用 `jellyfin-ffmpeg` 转换容器或音轨 | 少量 CPU 与磁盘缓存占用        |
| 转码（Transcoding）       | 重新编码视频画面（或将图形/特效字幕压入视频流）       | 需要 GPU 硬解或高负载 CPU 软解 |

当视频能够直接播放时，客户端直接解码原片画质最好，无需人为触发转码。只有遇到客户端不支持的视频编码（如部分浏览器或老设备播放 HEVC / AV1）、外网播放受带宽限制主动调低码率、或客户端无法直接渲染 PGS 图形字幕而需要服务端烧录字幕时，才会进入转码流程。其中字幕烧录与部分音频转换仍会消耗一定 CPU 资源，可在后台“控制台 → 活动”或播放信息面板中查看当前会话的具体转码原因。

## Intel 核显与设备权限

在官方镜像中使用非 root 用户（`user: UID:GID`）开启 Intel 核显硬解时，除了挂载 `/dev/dri` 设备节点，还必须将该用户加入宿主机渲染设备所属的用户组：

1. **查询宿主机渲染设备的数字组 ID（GID）**：

   ```bash
   ls -l /dev/dri
   ls -ln /dev/dri/renderD128
   ```

   在 `ls -ln` 的输出中查看第 4 列数字（即设备所属组的数字 GID，不同 Linux 发行版可能为 `105`、`107` 或 `993` 等）。

2. **在 `.env` 中填入设备组 GID**：

   ```dotenv
   RENDER_GID=107
   ```

3. **在 `compose.yaml` 的 `services.jellyfin` 下补充 `group_add` 与 `devices`**：

   ```yaml
   group_add:
     - "${RENDER_GID:?Set the render device group ID in .env}"
   devices:
     - /dev/dri/renderD128:/dev/dri/renderD128
   ```

4. **重建容器并检验驱动**：执行 `docker compose up -d` 重建容器后，调用镜像内置的 `jellyfin-ffmpeg` 工具核对驱动状态：

   ```bash
   docker compose exec jellyfin /usr/lib/jellyfin-ffmpeg/vainfo
   ```

5. **后台启用硬解**：在 Jellyfin 管理后台打开 **控制台 → 播放 → 转码**，按[官方 Intel 指南][jellyfin-intel]将硬件加速设为 `Intel QuickSync (QSV)` 或 `Video Acceleration API (VA-API)`，确认设备路径为 `/dev/dri/renderD128`，勾选当前核显支持的解码格式（如 H.264、HEVC、HEVC 10bit、VP9、AV1 等）与硬件编码选项后保存。其他显卡平台可参照[硬件加速文档][jellyfin-hardware]配置。

验证时可播放一部影片并在客户端手动降低画质档位，观察后台转码日志与 CPU / GPU 占用，确认硬解生效后再调回原画质。

## 客户端与自动整理

从 [Jellyfin 官方客户端目录][jellyfin-clients]下载对应设备的应用（如桌面端 Jellyfin Media Player、Android 移动版、Android TV 电视版、iOS Swiftfin / 官方端，或第三方支持 Jellyfin 的 Infuse、VidHub、SenPlayer、iPlay 等）。

- **客户端连接与播放验证**：在手机或电视客户端填入 `http://NAS_IP:8097` 和本地账号。依次测试本地影片起播、多音轨与内外挂字幕切换、进度条拖动以及退出后跨设备续播。若需外网访问，可通过异地组网或 HTTPS 反向代理接入，详见 [NAS 远程访问](/posts/nas-remote-access/)。
- **接入 MoviePilot 自动刷新**：在 Jellyfin 后台 **控制台 → 高级 → API 密钥** 中新建一枚密钥；在 MoviePilot 的媒体服务器设置中选择 Jellyfin，填入密钥与可达地址（走宿主机端口填 `http://NAS_IP:8097`；若两个容器加入了同一个自定义 Docker 网络，则填容器内部端口 `http://jellyfin:8096`），并配好容器路径映射。

## 更新与备份

日常维护只需备份 `compose.yaml`、`.env` 和 `config` 目录（`cache` 为临时缓存无需备份；注意不要与 Emby、Plex 共用配置目录）。更新前先停机备份配置，再拉取新镜像：

```bash
docker compose stop jellyfin
# 此时备份 compose.yaml、.env 与 config 目录
docker compose pull jellyfin
docker compose up -d jellyfin
docker compose logs --tail=100 jellyfin
```

升级后检查媒体库访问与硬解状态；由于新版本可能升级 SQLite 数据库结构，回退旧镜像时需同步恢复升级前的 `config` 备份。

## 常见问题

| 现象                | 排查方向                                                                     |
| ------------------- | ---------------------------------------------------------------------------- |
| 网页无法访问        | 本例宿主机端口映射为 `8097`，检查容器运行日志、端口冲突与防火墙设置          |
| 媒体库看不到电影    | 媒体库路径应填容器内 `/data/library/...`，检查服务账户对目录的读取权限       |
| 设置无法保存或报错  | 检查宿主机 `config`、`cache` 目录的归属与写权限是否匹配 Compose `user`       |
| 开启硬解后报错中断  | 核对 `/dev/dri/renderD128` 节点、数字组 `RENDER_GID` 及网卡/核显支持的编码项 |
| 开了硬解 CPU 仍偏高 | 查看播放日志，检查是否因 PGS 字幕烧录、音频重编码或色调映射占用了 CPU        |
| MoviePilot 不刷新   | 检查API 密钥、连接端口（宿主机 `8097` 或同网络 `8096`）及路径映射关系        |

## 参考资料

- Jellyfin：[官方容器部署][jellyfin-container]、[初始化向导][jellyfin-wizard]、[项目与授权][jellyfin-home]。
- Jellyfin：[硬件加速概览][jellyfin-hardware]、[Intel 配置][jellyfin-intel]、[客户端下载][jellyfin-clients]。

[jellyfin-home]: https://jellyfin.org/
[jellyfin-container]: https://jellyfin.org/docs/general/installation/container/
[jellyfin-wizard]: https://jellyfin.org/docs/general/post-install/setup-wizard/
[jellyfin-hardware]: https://jellyfin.org/docs/general/post-install/transcoding/hardware-acceleration/
[jellyfin-intel]: https://jellyfin.org/docs/general/post-install/transcoding/hardware-acceleration/intel/
[jellyfin-clients]: https://jellyfin.org/downloads/clients/
