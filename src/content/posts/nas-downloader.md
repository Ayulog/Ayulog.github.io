---
title: 下载目录与做种常识
description: 下载目录、挂载权限与端口的共用设置，做种、硬链接整理和衔接 MoviePilot 的顺序。
author: Ayulog
pubDatetime: "2026-10-10T14:15:00+08:00"
draft: false
category: pt
tags:
  - 下载器
  - Docker
---

下载器连得上，文件路径仍可能出错。下载、辅种和媒体整理接在一起时，问题大多出在容器挂载、目录层级和文件权限上。

安装与软件设置分别见 [qBittorrent](/posts/qbittorrent-guide/)、[Transmission](/posts/transmission-guide/)和 [Aria2 与 AriaNg](/posts/aria2-guide/)。

## 先选下载器，再规划目录

### 它们分别负责什么

| 工具         | 主要用途                                      | 对应位置                             |
| ------------ | --------------------------------------------- | ------------------------------------ |
| qBittorrent  | BT、磁力下载与做种，分类、RSS 和任务管理      | 本地媒体下载与 MoviePilot 联动       |
| Transmission | BT、磁力下载与做种，桌面或后台运行            | 长期保种，也可连接 MoviePilot        |
| Aria2        | HTTP(S)、FTP、SFTP、BitTorrent、Metalink 下载 | 直链、软件包、公开磁力与网盘文件下载 |
| AriaNg       | 通过 RPC 控制 Aria2 的网页界面                | 查看、添加和管理 Aria2 任务          |

qBittorrent 与 Transmission 可以先选一个；Aria2 按需补充直链和网盘下载。AriaNg、Transmission 的内置 Web、TrguiNG 都是管理界面，真正执行任务的仍是下载后端。关闭网页通常不会停止 NAS 上的下载。

用于 PT 时，**先核对站点客户端白名单和做种规则**，再决定版本。Compose 中的 `latest` 是示例用的可变标签，站点接受哪个版本由站点规则决定。稳定运行后记录实际版本或镜像 digest，避免未经核对自动升级。qBittorrent 和 Transmission 不支持 ed2k；安装更多管理界面也不会补上这一协议。

### 共用的目录与权限准备

每个下载器使用自己的项目目录和配置目录，例如 `stacks/qbittorrent/`、`stacks/transmission/`、`stacks/aria2/`。各软件教程中的 `compose.yaml` **分别保存在对应项目中**，它们的 `./config` 不是同一个目录。

qBittorrent、Transmission 与 MoviePilot 采用同一数据根目录，便于后续整理：

```text
/path/to/data/
├── downloads/
│   ├── qbittorrent/
│   ├── transmission/
│   └── incomplete/
└── library/
    ├── movies/
    └── tv/
```

把自己选定的 NAS 数据根目录映射为容器内的 `/data`，在应用中填写 `/data/downloads/...`。`/path/to/data` 只是占位符，应先在 NAS 上创建实际目录。Aria2 示例独立使用 `/downloads`，与媒体下载目录按用途分开即可。

通过 SSH 查询负责写入的 NAS 账户：

```bash
id nasuser
```

将 `nasuser` 换成实际账户，记录 UID 与 GID，并在 NAS 权限管理中给它配置目录和数据目录的读写权限。不要直接照抄 `0/0`，也不需要把整个共享目录开放为 `777`。

qBittorrent 和 Transmission 的项目各自创建 `.env`，填入同一组实际值：

```dotenv
# 填写实际服务账户的 UID / GID
PUID=
PGID=
# 替换为 NAS 上已经存在的数据根目录
MEDIA_ROOT=/path/to/data
```

各篇容器示例的时区统一为 `Asia/Singapore`。定时限速和更新任务按后端时区执行，与浏览器所在设备的显示时间无关。

### 管理端口与下载端口分开

| 服务           | 局域网管理入口                         | 与 BT 用户交换数据的端口 |
| -------------- | -------------------------------------- | ------------------------ |
| qBittorrent    | `http://NAS_IP:8080`                   | `6881/TCP`、`6881/UDP`   |
| Transmission   | `http://NAS_IP:9091/transmission/web/` | `51413/TCP`、`51413/UDP` |
| AriaNg / Aria2 | 网页 `18080`；RPC `16800`              | `32516/TCP`、`32516/UDP` |

`NAS_IP` 替换为实际局域网地址。Docker 发布端口不等于路由器完成了转发；改善 BT 入站连接时，核对的是 Peer 端口、NAS 防火墙、路由器和公网条件。把管理端口映射到公网不会提高上传速度。远程管理可以通过 VPN 或私有组网访问；普通 HTTP 连接即使有密码也没有传输加密。

各篇 Docker 示例使用 bridge 网络。若改成 host 网络，`ports` 不再生效，配置也要相应改写。

## 做种、辅种和硬链接

- 做种：下载器保留任务，向其他用户上传已有数据。
- 辅种：为其他匹配种子复用已有数据，通过校验后继续做种。
- 硬链接：给同一份文件数据增加目录入口，用于整理文件，本身不添加种子任务。

文件名相同不代表内容相同，辅种或迁移后应由下载器校验。PT 的最短做种时间、分享率与 H&R 按站点规则判断，下载完成只是开始。

给已有文件加种时先暂停添加，核对保存目录层级，再校验到 100%。不要用跳过校验解决路径错误；校验不足就启动，可能产生新的下载量。

## 与 MoviePilot 联动

qBittorrent 或 Transmission 先完成一次真实下载，再接入 [MoviePilot](/posts/moviepilot-guide/)。下载器负责取得文件并保留做种任务，MoviePilot 负责识别、命名和整理，两边看到的路径必须对应同一份数据。

这几个下载器都把相同 NAS 数据根目录挂载为 `/data`。MoviePilot 也挂载同一根目录，并按实际选用的下载器设置来源：

| 下载器       | 下载来源示例                   | 本地整理目标示例                             |
| ------------ | ------------------------------ | -------------------------------------------- |
| qBittorrent  | `/data/downloads/qbittorrent`  | `/data/library/movies` 或 `/data/library/tv` |
| Transmission | `/data/downloads/transmission` | `/data/library/movies` 或 `/data/library/tv` |

管理连接可使用 MoviePilot 所在容器能够访问的 `http://NAS_IP:8080` 或 `http://NAS_IP:9091`，填写下载器认证信息。如果已按[媒体流程文章](/posts/debnas-media-workflow/#目录与容器路径规划)将服务加入同一用户定义的 Docker 网络，也可使用服务名和容器端口，例如 `http://qbittorrent:8080`；不同 Compose 项目的默认网络不会因为服务名相同就自动互通。

想继续做种时，先考虑**硬链接整理**：下载目录保留原名和结构，媒体库使用整理后的名称。源和目标必须位于同一文件系统，容器挂载也不能把它们隔成不兼容的边界；统一 `/data` 只是便于满足路径条件，跨硬盘或云盘做不了硬链接。硬链接不是备份，对文件内容的原地修改会影响两边。

第一次联动按以下顺序核对：

1. MoviePilot 连接测试成功，能读取目标下载器的任务。
2. 下载分类、来源目录与整理规则匹配，先下发一个有权处理的小任务。
3. 下载完成后检查整理日志、目标文件和实际整理方式。
4. 下载器仍能校验并继续做种，媒体库能够识别和播放，再开启更多订阅。

手工添加到下载器的任务，不一定符合 MoviePilot 的分类与接管规则，整理是否成功要看日志和实际文件。多个工具不要同时移动或改名同一批文件。上传到云盘时采用适合该存储方式的复制流程，保留需做种的本地源文件；跨云盘上传无法用硬链接完成。

## 更新、备份与迁移

每个项目分别维护版本和备份，私有 `.env` 不进入公开文章或代码仓库。更新前记录当前镜像标签与 digest，正常停止服务后备份配置，保证任务状态一致：

```bash
# 在需要维护的那个 Compose 项目目录执行
docker compose stop
```

备份 `compose.yaml`、私有 `.env` 和整个 `config`。Transmission 的 `.torrent`、恢复状态和设置需一起保留，单独复制 `settings.json` 不足以恢复全部任务；qBittorrent 同样保留完整配置或 profile。下载文件另行规划备份，配置备份不会自动包含它们。

更新时拉取并重建：

```bash
docker compose pull
docker compose up -d
```

仅做备份则用 `docker compose start` 恢复。升级后检查管理登录、任务列表、路径、实际版本和一次下载或校验，容器状态显示“运行中”还不够。

迁移时保持容器路径，核对 NAS 目录、权限及原文件；Windows 盘符、Linux 路径与容器路径写法不同，不要互相套用。先校验少量任务，再恢复全部任务；Aria2 未完成文件旁的 `.aria2` 控制文件可能关系到续传，不要当作垃圾批量删除。

从列表移除任务与同时删除本地数据是不同操作。长期保种、有硬链接或多个任务共享文件时，先核对影响和站点要求，再选择删除方式。

<span id="常见问题"></span>

## 路径与做种问题

| 现象                          | 检查位置                                                 |
| ----------------------------- | -------------------------------------------------------- |
| 文件在 NAS 上，但下载器找不到 | 容器是否挂载，任务用的是不是容器内路径，目录层级是否一致 |
| API 连接成功，却不能整理      | 整理工具的挂载、来源路径与文件权限                       |
| 转种后开始重新下载            | 目标目录是否对应同一份数据，路径转换与校验结果           |
| 硬链接失败或变成复制          | 源和目标是否同一文件系统，容器是否用独立挂载隔开         |
| 删种后空间没有释放            | 媒体库或其他目录是否仍保留硬链接                         |
| 上传很少                      | 是否有下载需求、Tracker 状态、停止条件、Peer 入站条件    |
| 任务突然全部消失              | 是否连到了另一实例，是否使用了新的空配置目录             |

## qBittorrent

安装和软件设置已单列为 [qBittorrent 安装与设置](/posts/qbittorrent-guide/)。

<span id="在-nas-上使用-docker-compose"></span>
<span id="保存路径分类与做种"></span>
<span id="限速队列与-rss"></span>
<span id="不用-docker-时的安装方法"></span>

- [Docker Compose](/posts/qbittorrent-guide/#在-nas-上使用-docker-compose)
- [保存路径、分类与做种](/posts/qbittorrent-guide/#保存路径分类与做种)
- [限速、队列与 RSS](/posts/qbittorrent-guide/#限速队列与-rss)
- [Windows、macOS 与 Debian 原生安装](/posts/qbittorrent-guide/#不用-docker-时的安装方法)

## Transmission

安装和软件设置已单列为 [Transmission 安装与设置](/posts/transmission-guide/)。

<span id="在-nas-上使用-docker-compose-1"></span>
<span id="添加任务与校验已有文件"></span>
<span id="选择-trguing-或内置-web"></span>
<span id="windows-安装与局域网管理"></span>
<span id="修改-settingsjson-与-windows-自启动"></span>

- [Docker Compose](/posts/transmission-guide/#在-nas-上使用-docker-compose)
- [已有文件校验](/posts/transmission-guide/#添加任务与校验已有文件)
- [TrguiNG 与内置 Web](/posts/transmission-guide/#选择-trguing-或内置-web)
- [Windows 安装](/posts/transmission-guide/#windows-安装与局域网管理)
- [settings.json 与自启动](/posts/transmission-guide/#修改-settingsjson-与-windows-自启动)

## Aria2 与 AriaNg

部署、网页连接与任务发送见 [Aria2 与 AriaNg](/posts/aria2-guide/)。

<span id="选择镜像并部署"></span>
<span id="连接-ariang-与-aria2"></span>
<span id="直链种子与磁力下载"></span>
<span id="浏览器扩展发送下载"></span>
<span id="通过-alist-下载网盘文件"></span>
<span id="aria2-镜像参数与持久化"></span>

- [Aria2 镜像与 Compose](/posts/aria2-guide/#选择镜像并部署)
- [RPC 地址和密钥](/posts/aria2-guide/#连接-rpc)
- [直链、种子与磁力](/posts/aria2-guide/#直链种子与磁力下载)
- [浏览器扩展](/posts/aria2-guide/#浏览器扩展发送下载)
- [AList 发送任务](/posts/aria2-guide/#通过-alist-下载网盘文件)
- [Aria2 参数与持久化](/posts/aria2-guide/#aria2-镜像参数与持久化)

## 参考资料

- [LinuxServer qBittorrent 镜像说明][qbt-image]与 [Transmission 镜像说明][tr-image]。
- [MoviePilot 文件整理][mp-reorganize]。
- [Docker host 网络][docker-host]。
- [Aria2 官方手册][aria2-manual]。

[qbt-image]: https://docs.linuxserver.io/images/docker-qbittorrent/
[mp-reorganize]: https://wiki.movie-pilot.org/reorganize
[docker-host]: https://docs.docker.com/engine/network/drivers/host/
[tr-image]: https://docs.linuxserver.io/images/docker-transmission/
[aria2-manual]: https://aria2.github.io/manual/en/html/aria2c.html
