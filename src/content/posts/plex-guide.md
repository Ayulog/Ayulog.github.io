---
title: Plex：Docker 部署、媒体库与远程播放
description: 用官方 Docker 镜像部署 Plex，认领服务器、建媒体库，配置硬件转码与外网播放。
author: Ayulog
pubDatetime: "2026-10-10T16:00:00+08:00"
draft: false
category: library
tags:
  - Docker
---

Plex 通过官方云端账号认领（Claim）本地媒体服务器，再由手机、电视和电脑客户端登录同一账号自动发现并连接。本文使用 Linux NAS 上的 [Plex 官方 Docker 镜像][plex-docker]部署，涵盖服务器认领、媒体库挂载、Plex Pass 硬件转码与远程播放设置。其他整理与播放器工具见 [NAS 服务清单](/posts/nas-software-websites/)。

## 目录和权限

Plex 媒体库直接扫描整理完成后的电影与剧集目录，与下载器的做种原始目录分开存放。假设宿主机数据根目录 `/path/to/data` 结构如下：

```text
/path/to/data/
├── downloads/
└── library/
    ├── movies/
    └── tv/
```

先在终端查询运行容器的 Linux 服务账户 UID 与 GID：

```bash
id <service-user>
```

记录输出的数字，后续填入 `.env`。该账户需要对 Plex 的专用 `config`（数据库与元数据）和 `transcode`（临时转码）目录拥有读写权限，并对媒体目录及上层父目录拥有读取权限。注意：Plex 官方镜像要求 `config` 所在文件系统支持文件锁（不可放在网盘挂载或普通网络共享上），且启动时会自动修改 `config` 目录归属，因此必须为其分配独立的空目录。

容器内统一将媒体库只读挂载为 `/data/library`，电影库填 `/data/library/movies`，剧集库填 `/data/library/tv`；文件命名遵循标准片名、年份与 `S01E01` 季集格式（详见[影视资源命名](/posts/media-resource-naming/)）：

```text
movies/Movie Name (2024)/Movie Name (2024).mkv
tv/Series Name (2024)/Season 01/Series Name S01E01.mkv
```

## 使用官方 Docker 镜像

1. 在独立项目目录创建 `.env`，填入服务账户的 UID、GID 与媒体根目录，并登录 [Plex Claim 页面][plex-claim]获取临时认领令牌填入 `PLEX_CLAIM`（令牌有效期较短，准备启动前再获取）：

   ```dotenv
   PUID=1000
   PGID=1000
   MEDIA_ROOT=/path/to/data
   PLEX_CLAIM=claim-xxxxxxxxxxxxxxxxxxxx
   ```

2. 在同目录创建 `compose.yaml`：

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

   官方镜像推荐使用 `network_mode: host`，直接复用宿主机网络以支持局域网自动发现，无需额外编写 `ports`（部署前请确认宿主机 `32400` 端口未被占用；若环境仅支持 bridge 网络，需按官方仓库说明显式映射端口并配置 `ADVERTISE_IP`）。

3. 创建持久化文件夹并启动容器：

   ```bash
   mkdir -p config transcode
   docker compose config -q
   docker compose pull
   docker compose up -d
   docker compose ps
   docker compose logs --tail=100 plex
   ```

在同一局域网浏览器中打开 `http://NAS_IP:32400/web`，登录刚才获取 Claim 令牌的 Plex 账号。认领成功后即可将 `.env` 中的 `PLEX_CLAIM` 清空（服务器完成绑定后重启会自动忽略该变量）。

## 首次配置与媒体库

参照 [Plex 安装与初始化说明][plex-install]完成向导：

1. 确认网页显示的是刚才部署的 Plex Media Server，设置服务器名称。
2. 添加媒体库：“电影”库指向 `/data/library/movies`，“电视节目”库指向 `/data/library/tv`，并将库语言设为中文。
3. 先用少量影片测试扫描效果；Plex 使用自带的元数据代理（Plex Movie / Plex Series），识别偏差时可对单个条目执行“修正匹配（Fix Match）”。
4. 打开 **Settings → Transcoder**（点击显示高级选项），将 **Transcoder temporary directory** 设为 `/transcode` 并保存。

若跨网段部署或首次打开网页时提示找不到服务器，可在电脑上通过 SSH 本地端口转发进入初始化页面（将 `NAS_USER` 与 `NAS_IP` 替换为实际值）：

```bash
ssh -N -L 8888:127.0.0.1:32400 NAS_USER@NAS_IP
```

保持终端运行，在电脑浏览器访问 `http://127.0.0.1:8888/web` 即可按本机访问完成认领。

## 直接播放与硬件转码

Plex 会根据客户端设备的编码支持情况与带宽限制，在三种传输方式间自动切换：

| 播放方式                  | Plex 服务端动作                      | 触发场景与负载                   |
| ------------------------- | ------------------------------------ | -------------------------------- |
| 直接播放（Direct Play）   | 原样传输媒体文件                     | 客户端完全兼容容器、音视频与字幕 |
| 直接串流（Direct Stream） | 视频流直接复制，仅重封装容器或转音轨 | 视频编码支持，但封装或音轨不兼容 |
| 转码（Transcoding）       | 将视频重编码为客户端支持的格式与码率 | 视频编码不支持、限速或烧录字幕   |

当视频可以直接播放时，NAS 仅承担文件读取和网络发送，无需开启转码。若客户端限制了远程流媒体画质、不支持 HEVC / AV1 等编码，或者开启了客户端无法原生渲染的 PGS 图形字幕、ASS 特效字幕，Plex 就会启动转码或将字幕烧录进视频画面。可在 Plex Web 的 **Dashboard（仪表盘）** 中展开当前播放会话，直接查看视频、音频和字幕各自处于 Direct Play、Direct Stream 还是 Transcode 状态。

## Plex Pass、远程播放与硬件转码

根据官方[免费与付费规则][plex-paid]及 [Plex Pass 说明][plex-pass]，局域网内播放个人媒体免费，但远程播放与硬件加速转码受订阅等级控制：

- **Remote Watch Pass**：仅解锁单个账号自身的远程流媒体播放权限，不包含服务端硬件转码。
- **Plex Pass**：服务器所有者订阅 Plex Pass 后，不仅可开启服务端 GPU 硬件加速转码，还能让授权访问该服务器的其他家庭或好友账号直接获得远程播放能力。

在具备 Plex Pass 的前提下，为 Linux NAS 上的 Intel 核显开启硬件转码只需两步：

1. **挂载核显设备**：确认宿主机存在 `/dev/dri` 后，在 `compose.yaml` 的 `services.plex` 下添加：

   ```yaml
   devices:
     - /dev/dri:/dev/dri
   ```

2. **后台开启并核验 `(hw)` 标识**：执行 `docker compose up -d` 重建容器后，在服务器 **Settings → Transcoder** 中勾选 **Use hardware acceleration when available** 与 **Use hardware-accelerated video encoding**（其他 GPU 平台与驱动要求参见 [Plex 硬件加速文档][plex-hardware]）。随后播放一部视频并手动调低客户端画质触发转码，在后台 **Dashboard** 的播放会话详情中看到视频编码旁标有 `(hw)`，即代表 GPU 硬解/硬编已正常介入。

## 客户端与上游工具

从 [Plex 官方下载页][plex-download]获取桌面端、移动端或 Apple TV / Android TV 客户端，也可在 Apple 平台使用 Infuse、VidHub、SenPlayer 等第三方播放器登录 Plex 账号连接。建议先在局域网验证原画直放与字幕切换，再切换到移动网络测试外网连接速度。

若使用 MoviePilot 自动整理入库，可在 MoviePilot 的媒体服务器设置中添加 Plex，按提示填入服务器地址与 Plex Token，测试读取媒体库列表并启用整理后自动刷新。注意 Plex 使用独立的认证体系与媒体库接口，不支持直接套用 Emby 的 API Key、神医助手插件或 CMS 的 Emby 302 代理入口。

## 更新与备份

日常备份保留 `compose.yaml`、`.env` 和 `config` 目录（`transcode` 为临时目录无需备份）。更新前记录当前镜像版本，先停机备份 `config` 再拉取新镜像：

```bash
docker compose stop plex
# 此时备份 compose.yaml、.env 与 config 目录
docker compose pull plex
docker compose up -d plex
docker compose logs --tail=100 plex
```

本文固定使用 `latest` 标签（官方镜像另有启动时动态拉取安装包的 `public` / `beta` 标签）。若升级后需回退旧版本镜像，应同步恢复升级前的 `config` 数据库备份。

## 常见问题

| 现象                   | 排查方向                                                               |
| ---------------------- | ---------------------------------------------------------------------- |
| 网页无法打开           | 本文采用 host 网络，检查宿主机 `32400` 端口是否被占用及防火墙策略      |
| 找不到或无法认领服务器 | 检查 `PLEX_CLAIM` 是否过期、容器出站网络是否可达，或用 SSH 隧道认领    |
| 媒体库扫描为空         | 核对容器内 `/data/library` 路径及 `PLEX_UID` / `PLEX_GID` 目录读取权限 |
| 转码设置无硬件加速选项 | 确认服务器所有者账号具备有效 Plex Pass，且 `/dev/dri` 已正确挂载       |
| 局域网能播、外网不能播 | 检查后台 Remote Access 端口转发状态、账号远程播放权限与家庭上行带宽    |
| 转码报错或中途断流     | 检查 `/transcode` 目录是否有写权限且剩余磁盘空间充足                   |

外网端口转发与异地组网配置可参考 [NAS 远程访问](/posts/nas-remote-access/)。

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
