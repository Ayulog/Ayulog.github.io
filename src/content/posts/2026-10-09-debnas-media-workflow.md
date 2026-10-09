---
title: DebNAS 自动观影流程
description: 以通用 Compose 示例串起本地入库、115 云端入库、本地下载后由 MoviePilot V3 整理到网盘三条路线，说明目录映射、CMS、Emby、远程访问与备份验证。
author: Ayulog
pubDatetime: "2026-10-09T18:00:00+08:00"
draft: false
tags:
  - Debian
  - DebNAS
  - NAS
  - Docker
  - Emby
  - 自动观影
---

这篇接着 [DebNAS 安装及折腾记录](/posts/2026-10-09-debnas-installation-notes/) 往下写，把已经搭好的系统、磁盘、Docker 和远程访问环境，串成找片、下载、整理、入库与播放的流程。工具入口仍集中保留在 [NAS 常用软件及网站记录](/posts/2026-10-09-nas-software-websites/) 中。

媒体处理分为三条路线：本地下载后留在 HDD；直接转存或离线到 115；先下载到本地，再由 MoviePilot V3 整理到网盘。后两条路线通过 CMS 生成 STRM，最终和本地文件一起汇入 Emby。

下文以官方镜像、上游默认端口和通用目录示例说明接法。配置目录使用相对路径，共享媒体目录使用 `/path/to/...` 占位符；同一目录在各容器中的映射保持一致。三条路线可按需求选用，先替换路径、填写凭据，再用少量文件验证整理与播放。

## 目录

- [沿用安装记录的基础环境](#沿用安装记录的基础环境)
- [先看整体分工](#先看整体分工)
- [路线一：本地硬盘](#路线一本地硬盘)
- [路线二：115 网盘与 STRM](#路线二115-网盘与-strm)
- [路线三：本地下载后整理到网盘](#路线三本地下载后整理到网盘)
- [目录与容器路径规划](#目录与容器路径规划)
- [Compose 管理与容器互联](#compose-管理与容器互联)
- [媒体服务 Compose](#媒体服务-compose)
- [MoviePilot V3 与 CMS 如何配合](#moviepilot-v3-与-cms-如何配合)
- [Emby 与神医助手](#emby-与神医助手)
- [播放器怎么选](#播放器怎么选)
- [CloudDrive2 与其他网盘](#clouddrive2-与其他网盘)
- [外网访问方案](#外网访问方案)
- [更新、备份与重启验收](#更新备份与重启验收)
- [按什么顺序接入与验证](#按什么顺序接入与验证)
- [按流程排查问题](#按流程排查问题)
- [项目入口与参考教程](#项目入口与参考教程)

## 沿用安装记录的基础环境

先按 [DebNAS 安装及折腾记录](/posts/2026-10-09-debnas-installation-notes/) 准备 Debian、Docker、数据盘和访问方式。这里不限定 CPU 型号、磁盘容量或盘符，只约定应用之间需要的条件：

- **应用配置**：每个服务使用独立的 Compose 目录，配置与数据库持久化，避免容器重建后丢失。
- **本地媒体**：下载目录与整理后的媒体库放在同一个数据根目录内，便于统一挂载与硬链接整理。
- **容器互联**：示例使用共享的 `media` bridge 网络，以服务名互相访问。
- **云盘挂载**：路线三可选择 CloudDrive2 挂载或 MoviePilot 原生存储接口，按所选方式配置。
- **远程访问**：按需要选用 Tailscale、ZeroTier 或域名入口，先验证局域网内的完整流程。

安装篇负责系统与维护基础，这篇说明媒体应用之间如何交接。

## 先看整体分工

| 环节           | 工具或来源                                            | 在流程里的作用                                        |
| -------------- | ----------------------------------------------------- | ----------------------------------------------------- |
| 媒体来源       | PT、公开 BT / 磁链、ed2k、115 分享                    | 提供待下载或待转存的资源                              |
| 本地下载       | qBittorrent、Transmission                             | 下载 BT 资源，保留原始目录用于做种                    |
| 网盘接收       | 115 转存、115 离线任务                                | 把文件放入自己的 115 网盘                             |
| 订阅整理       | MoviePilot V3                                         | 搜索、订阅、下载联动，将本地文件整理到 HDD 或网盘     |
| 云端整理与同步 | CMS                                                   | 路线二可整理云端文件；路线三同步已整理目录，生成 STRM |
| 媒体库         | Emby                                                  | 识别媒体、展示海报、管理用户与播放记录                |
| 媒体库增强     | Emby 神医助手                                         | 媒体信息、字幕扫描等增强功能                          |
| 播放终端       | Yamby、Infuse、SenPlayer、FloePlayer、小幻影视、iPlay | 根据设备和连接方式选择客户端                          |
| 网盘挂载       | CloudDrive2                                           | 为需要文件路径的应用提供云盘挂载                      |
| 外网访问       | Tailscale、Lucky；ZeroTier、ddns-go 作为其他方案      | 按网络条件选择私有组网或公网入口                      |

**qBittorrent 和 Transmission 都是 BitTorrent 下载器，不支持 ed2k 下载。** ed2k 应交给支持它的客户端，或尝试提交到支持该类型的网盘离线服务；最终是否接收、能否完成，以服务端结果为准。

115 分享链接的转存，是网盘内的文件操作，也不等于在 NAS 上启动了一次 BT 下载。尤其是 PT 任务，115 离线不能替代本地下载器的做种与上传统计。

## 路线一：本地硬盘

本地路线让文件保存在数据盘，同时保留下载任务。本文将同一宿主机数据目录映射为下载器和 MoviePilot 的 `/data`，示例下载目录是 `/data/downloads`，整理目标是 `/data/library`。

![本地观影流程：PT 或公开 BT 资源经订阅命中或手动添加，交给 qBittorrent 或 Transmission 下载到本地数据盘，再由 MoviePilot V3 整理，最终进入 Emby 供播放器播放。](/images/posts/debnas-local-flow.svg)

### 从订阅到下载

在 MoviePilot V3 中配置可用的站点、搜索与订阅规则，再连接一个下载器。订阅命中符合条件的资源后，下发给 qBittorrent 或 Transmission。

公网磁链也可以手动加到下载器。手动任务能否被 MoviePilot 接管，取决于下载器配置、分类、目录和所用整理方式；必要时单独执行目录整理。不能把“下载器里有文件”当作“订阅流程已经完整接管”。

### 下载完成后整理

MoviePilot 识别完成的媒体，把它们按电影、剧集等规则放入媒体库目录，并按配置生成元数据、通知 Emby 刷新。

对于需要保留做种的文件，可以优先考虑**硬链接整理**：下载目录保留原名和结构，媒体库里使用适合识别的名称。两条路径指向同一份文件数据，不会因为多一个硬链接就复制整部影片。

硬链接要求源与目标处于同一文件系统，并且容器内的挂载方式允许建立链接。跨硬盘、跨文件系统、独立挂载边界或云盘挂载，都不能直接套用这个结论。硬链接也不是备份，对文件内容的原地修改会影响两边；删除其中一个文件名，则不等于同时删除另一个名字。

### 入库与播放

让 Emby 扫描整理后的电影、剧集目录。下载临时目录和做种原始目录不需要再添加成媒体库，否则容易出现同一部影片的重复条目。

下方 Emby 示例挂载了本地媒体库与 STRM 目录。本地电影、剧集从容器内 `/data/library` 添加；不要把 `/data/downloads` 的临时文件和做种文件重复加入媒体库。

本地路线的基本结果应是：**下载器能继续做种，MoviePilot 整理成功，Emby 正确识别，播放器可以播放与续播**。跑通这些后，再加更细的订阅规则和插件。

## 路线二：115 网盘与 STRM

这条路线把视频直接转存或离线到 115，NAS 上保留 CMS、Emby 的配置与数据库，以及本地 STRM、字幕和媒体库资料。示例中，CMS 与 Emby 通过 `STRM_ROOT` 共享同一个宿主机目录，分别映射为 `/media` 与 `/strm`。播放视频时，仍然需要访问网盘或对应的取流服务。

![115 观影流程：分享转存或离线任务完成后，由 CMS 整理云端媒体并生成本地 STRM，再由 Emby 入库，播放器播放时取得云端视频。](/images/posts/debnas-cloud-flow.svg)

### 先让文件进入网盘

常见入口分为两类：

- **分享转存**：把 115 分享中的文件转存到自己的目录。
- **离线任务**：向 115 提交磁链等支持的任务。ed2k 是否可用，需要结合当前服务能力、账户条件和任务结果确认。

CMSHelp 的 [转存下载说明](https://github.com/guyue2005/CMSHelp/wiki/3.%E8%BD%AC%E5%AD%98%E4%B8%8B%E8%BD%BD) 列出了 115 分享、磁力和 ed2k 入口。按对应版本配置目标目录 CID 后，可以从这里提交任务，再查看保存或下载结果；提交成功不等于媒体已经可用。

先核对文件是否已经完整出现在网盘中。分享失效、任务失败或文件仍在处理中，都还没有进入后面的整理阶段。

[115-Desktop](https://github.com/Shimily-3/115-Desktop) 是基于 115 开放平台 API 的第三方桌面客户端，可以作为电脑端管理文件和任务的辅助入口。它不是 DebNAS 后台流程的必装组件；其中“生成 ed2k 链接”的功能，也不能当作“所有 ed2k 均可离线下载”的保证。

### CMS 整理与生成 STRM

给 CMS 配置要处理的网盘目录 CID、分类规则、STRM 服务地址和本地输出目录。按文档先完成基础全量同步，再配置自动整理；待整理目录和冗余目录放在同步媒体库范围之外，避免来回扫描或重复移动。

文件本来已经整理好的，可以直接规划同步范围；需要自动整理的，则先用少量文件核对识别结果。首次全量同步完成后，再验证所需变更能否触发增量同步。

CMS 文档说明，115 增量同步依赖生活事件，**文件重命名不会产生相应生活事件，不能指望增量同步自动更新这类变化**。手动调整云端名称后，要按当前版本的同步方式重新核对结果。若配置了 Emby 刷新通知，CMS 输出目录与 Emby 读取目录的容器内路径不同，还需要设置对应的路径替换。

CMS 的云端整理与 STRM 同步是不同环节：**云端目录已经正确，不代表本地 STRM 已更新；STRM 已生成，也不代表 Emby 已完成刷新。**

另有直接基于分享生成 STRM 的 [115 分享同步](https://docs.cmscc.cc/docs/share-sync) 模式，和本文“先转存到自己的目录”不同。其分享直连播放涉及向“我的接收”保存文件，分享密码变化也可能让直连失效，需要单独按文档配置。

### STRM 里保存的是什么

STRM 是一个文本文件，保存媒体地址或文件路径。Emby 按影片或剧集的命名规则识别它，播放时再访问里面指向的内容。

下面只展示形式，域名为示例，不能直接播放：

```text
文件名：示例电影 (2024).strm
内容：https://media.example.com/path/to/video
```

实际文件交给 CMS 生成和维护。云盘直链可能存在有效期、请求头或访问条件，简单复制一个临时下载地址长期保存，容易过期失效。

Emby 能看到海报，只说明媒体条目已入库。还要检查 STRM 指向的地址是否可达、服务能否取得有效视频，以及字幕和拖动进度是否正常。

**STRM 不等于 302 直连，也不自动保证流量绕过 NAS。** 如果使用重定向方案，播放器必须能访问跳转后的地址，并满足其认证与请求条件；如果由 Emby 或其他服务转发，流量仍会经过相应服务。实际走哪条路径，要结合客户端播放信息、Emby 会话和服务日志核对。

## 路线三：本地下载后整理到网盘

这条路线先用本地下载器取得文件，再由 **MoviePilot V3 完成识别、命名和整理到网盘**，最后交给 CMS 生成 STRM。它适合资源从 PT 或公网 BT 下载、但希望通过云端媒体库播放的情况。

![本地下载后上传观影流程：qBittorrent 或 Transmission 把媒体下载到 HDD，MoviePilot V3 按规则整理并复制到网盘，确认云端上传完成后由 CMS 同步生成 STRM，最后进入 Emby 供播放器播放。](/images/posts/debnas-upload-flow.svg)

### MoviePilot 把本地文件整理到云端

选择 CloudDrive2 接法时，先在宿主机挂好云盘，再映射给 MoviePilot，作为它能够访问的目标目录。下载源是本地完整文件，整理目标改为网盘中的电影或剧集目录。

MoviePilot V3 也有 [原生网盘存储适配器](https://github.com/jxxghp/MoviePilot/tree/v3/app/modules/filemanager/storages)，包括 115；按所用版本完成授权与目录配置后，可以直接通过存储接口上传，不必经过 CloudDrive2。下面以 CloudDrive2 接法举例，原生接口的授权和目标目录需单独配置，不与挂载路径混用。

MoviePilot 示例把本地数据根目录映射为 `/data`，把 `CLOUD_MEDIA_ROOT` 指定的云盘目录映射为 `/cloud`。本地来源填写 `/data/downloads` 下的下载目录，网盘目标填写 `/cloud` 下的分类目录；先确认这里确实是可写的云盘挂载，而不是挂载丢失后留下的空目录。

需要保种时，采用适合该存储方式的**复制整理**，保留下载器原来的文件名、目录和任务。MoviePilot 对目标文件执行识别、命名和分类，CloudDrive2 承担挂载写入后的上传。

本地 ext4 与云盘挂载之间不能使用硬链接完成上传；软链接也只引用本地路径，不会把视频变成网盘中的独立文件。移动整理会改变本地源文件的位置，不适合仍需使用原文件做种的任务。

### 上传完成后，CMS 只同步结果

按下面的顺序交接：

1. 下载器确认本地文件完整，MoviePilot 执行到云盘目标的整理。
2. 检查整理记录和 CloudDrive2 上传任务，等待云端写入完成。复制返回或挂载目录中出现文件，都不足以证明远端已经完整保存；采用原生存储接口时，则核对 MoviePilot 的上传结果与远端文件。
3. 在 115 中核对最终目录、名称、大小和可读取状态。首次验证时抽样重新下载并校验，避免只读到本机缓存。
4. 让 CMS 同步 MoviePilot 整理后的云端目录，生成或更新 STRM；在 Emby 中刷新，并测试实际播放、拖动和字幕。

**这条路线的媒体命名和分类由 MoviePilot 负责，CMS 负责同步与生成 STRM。** 不再对同一批文件开启 CMS 自动整理，避免重复移动或改名。路线二的待整理目录也应与这条路线的成品目录分开。

如果希望全部自动衔接，还需要验证当前版本能否在云端文件真正可用后触发 CMS 同步、再通知 Emby；先用一部影片跑通，再扩展自动化规则。

### 本地保种与云端入库分别管理

上传成功不会自动释放 HDD 空间：保种期间仍保留本地原文件，云端另有一份媒体。需要清理本地副本时，先确认云端内容与播放可用，再按下载任务和站点要求处理，不能只凭 MoviePilot 显示整理完成就删源文件。

Emby 读取这条路线生成的 STRM 即可，下载器的原始做种目录仍不加入媒体库。如果同一部影片也按路线一建立了本地媒体条目，再按自己的展示规则处理版本或重复条目。

## 目录与容器路径规划

### 配置与媒体分别保存

每个服务放在独立目录中，例如 `stacks/moviepilot/`、`stacks/emby/`。Compose 中的 `./config` 指向该栈自己的配置目录；不同栈的相对目录不是同一位置。下载和媒体目录需要跨栈共享，因此使用 `MEDIA_ROOT` 等宿主机绝对路径变量。

以下都是**需要替换的示例路径**，不是 DebNAS 强制的目录布局：

```text
/path/to/data/         # MEDIA_ROOT：本地数据盘目录
  downloads/          # 下载原文件与保种
  library/            # 整理后的本地媒体库
/path/to/cloud/        # CLOUD_MEDIA_ROOT：已建立的云盘挂载
/path/to/strm/         # STRM_ROOT：CMS 生成的 STRM、字幕和资料
```

下载器与 MoviePilot 都把同一 `MEDIA_ROOT` 挂载为 `/data`。qBittorrent / Transmission 中将下载目录设为 `/data/downloads`，MoviePilot 使用同样的来源路径，整理到 `/data/library`。这个共享布局是本文为联动采用的示例，不是各镜像的强制默认值。

### 云盘目录与 STRM 目录分别对应

各栈的 `.env` 是独立文件，相同变量需要填写相同宿主目录。对应关系为：

| 宿主变量                       | 容器内目录                  |
| ------------------------------ | --------------------------- |
| `MEDIA_ROOT`                   | 下载器、MoviePilot：`/data` |
| `MEDIA_ROOT` 的 library 子目录 | Emby：`/data/library`       |
| `CLOUD_MEDIA_ROOT`             | MoviePilot：`/cloud`        |
| `STRM_ROOT`                    | CMS：`/media`               |
| 同一 `STRM_ROOT`               | Emby：`/strm`               |

CMS 向 Emby 发送刷新通知时，路径替换对应为 `/media → /strm`；若当前版本使用 `source#target` 格式，可填写 `/media#/strm` 并用一个条目验证。MoviePilot 的 `/cloud` 保存网盘媒体，与本地 STRM 目录用途不同。

只走本地路线时，可以删除 MoviePilot 的云盘挂载；只走云端路线时，可以删除 Emby 的本地媒体库挂载。同步移除不再使用的必填路径变量后，再检查 Compose。

### 硬链接与目录权限

硬链接要求下载源与本地整理目标位于同一文件系统，并且容器内不被独立挂载边界隔开。统一 `/data` 挂载有助于满足路径条件，但不能跨磁盘或跨云盘建立硬链接。出现 `EXDEV` 时，先核对来源、目标、文件系统和操作类型。

Emby 示例只读挂载本地媒体和 STRM；需要写回字幕、NFO 时，再调整对应挂载与账户权限。UID、GID 按各服务账户和目录权限填写，不能直接照搬别人的数值。

### 开机先确认挂载

目录存在不等于磁盘或云盘已经挂载。先核对挂载来源和实际读写，再开始下载、上传、整理、扫描与备份，避免把系统盘上的空目录当成正常媒体库。

## Compose 管理与容器互联

可以用 Dockge 管理每套 Compose，或在对应目录使用 Docker Compose 命令。下文为媒体服务添加共享的 `media` 网络，便于不同栈通过服务名访问。

共享网络需先建立，以下命令在准备部署的 NAS 上按需执行：

```bash
docker network inspect media
# 不存在时再创建
docker network create media
```

示例服务之间使用容器内端口：

```text
MoviePilot → qBittorrent   http://qbittorrent:8080
MoviePilot → Transmission  http://transmission:9091
CMS → Emby                http://emby:8096
```

手机和电脑则使用 NAS 的局域网地址、组网地址或域名，加上宿主机发布端口，例如 `http://NAS_IP:8096`。这些占位地址需要替换；容器服务名通常不能被局域网客户端直接解析。

STRM 或 302 最终地址应能被实际发起请求的 Emby 或播放器访问。容器内 `localhost` 指向容器自身，不能用来代替另一个容器或宿主机服务。

## 媒体服务 Compose

下面给出五套独立示例，端口优先采用上游默认值；宿主目录、跨栈网络与共享媒体布局按本文的联动需求统一。它们是供新部署参考的模板，替换变量后再使用，不要直接覆盖正在运行的配置。

[下载全部 10 套 Compose 示例与说明](/examples/debnas-compose.zip)。Dockge、Portainer、MT Photos、Lucky、Mihomo / MetaCubeXD 放在 [安装篇的配套 Compose](/posts/2026-10-09-debnas-installation-notes/#配套-compose管理照片与网络)。

### 先填写环境变量

每个带 `env.example` 的目录，先复制为同目录的 `.env`，填写运行账户、目录与凭据。`${VAR:?…}` 表示必填变量；公开模板中的密码、令牌与授权码留空。不同栈的 `MEDIA_ROOT`、`STRM_ROOT` 分别填写相同宿主路径，CloudDrive2 挂载则填写到 `CLOUD_MEDIA_ROOT`。

```bash
# 仅在尚无 .env 的栈目录中复制
cp -n env.example .env
# 编辑并填写 .env，再检查配置
docker compose config --quiet
```

`/path/to/...` 是待替换路径，不能原样当作已有磁盘或云盘挂载。UID / GID 根据服务账户和目录权限填写；`.env` 保留在本机，不随文章发布。

### MoviePilot V3

采用官方安装说明中的基础单容器方案：WebUI 默认 **3000**，后端默认 **3001**，使用 SQLite 与内存缓存；首次访问页面完成初始化。配置挂载到 `/config`，不预设外部数据库、站点认证、代理或自动更新参数。

[Compose](/examples/debnas/moviepilot/compose.yaml) · [env.example](/examples/debnas/moviepilot/env.example) · [官方安装说明](https://github.com/jxxghp/MoviePilot-Wiki/blob/main/install.md)

```yaml
# General example based on the upstream MoviePilot V3 beginner setup.
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

环境变量模板：

```dotenv
# Copy to .env beside compose.yaml, then fill values for your own environment.
# UID/GID must match the intended service account and directory permissions.
PUID=
PGID=
# Use the same MEDIA_ROOT in MoviePilot, downloaders, and Emby.
MEDIA_ROOT=/path/to/data
# An existing cloud mount for the optional local-to-cloud workflow.
CLOUD_MEDIA_ROOT=/path/to/cloud
```

`/data/downloads` 作为本地来源，`/data/library` 作为本地整理目标；路线三采用挂载方式时，云盘目标使用 `/cloud`。只使用本地存储或原生网盘接口时，可删除 `/cloud` 挂载及对应变量。浏览器数据位置按当前 V3 的 [启动与数据说明](https://github.com/jxxghp/MoviePilot/blob/v3/docs/docker-startup.md) 核对，不沿用旧版的单独缓存目录。

### qBittorrent

采用 LinuxServer 镜像的默认端口：WebUI **8080**，BT **6881 TCP / UDP**。为了与 MoviePilot 使用同一路径，本文将本地数据映射到 `/data`，在 WebUI 中把下载目录设为 `/data/downloads`。

[Compose](/examples/debnas/qbittorrent/compose.yaml) · [env.example](/examples/debnas/qbittorrent/env.example) · [镜像说明](https://docs.linuxserver.io/images/docker-qbittorrent/)

```yaml
# Upstream ports; /data is this tutorial's shared media path.
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

环境变量模板：

```dotenv
# Copy to .env beside compose.yaml, then fill values for your own environment.
# UID/GID must match the intended service account and directory permissions.
PUID=
PGID=
# Use the same MEDIA_ROOT in MoviePilot, downloaders, and Emby.
MEDIA_ROOT=/path/to/data
```

首次登录方式以当前镜像的初始化日志和官方说明为准，登录后修改管理密码。MoviePilot 连接 `http://qbittorrent:8080`，填写下载器账号，并使用相同的下载目录。

### Transmission

采用默认 RPC 端口 **9091** 与 BT 端口 **51413 TCP / UDP**，使用镜像自带 WebUI。用户名和密码由 `.env` 提供；下载目录同样设为 `/data/downloads`。

[Compose](/examples/debnas/transmission/compose.yaml) · [env.example](/examples/debnas/transmission/env.example) · [镜像说明](https://docs.linuxserver.io/images/docker-transmission/)

```yaml
# Upstream ports and Web UI; /data is this tutorial's shared media path.
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

环境变量模板：

```dotenv
# Copy to .env beside compose.yaml, then fill values for your own environment.
# UID/GID must match the intended service account and directory permissions.
PUID=
PGID=
TR_USER=
TR_PASSWORD=
# Use the same MEDIA_ROOT in MoviePilot, downloaders, and Emby.
MEDIA_ROOT=/path/to/data
```

`/watch` 用于自动加载种子文件，按需使用。qBittorrent 与 Transmission 是两种可选下载器，选择其一即可开始验证流程。

### CMS

采用官方示例端口：管理页面 **9527**，Emby 302 入口 **9096**。本地 STRM 输出在 `/media`，由 `STRM_ROOT` 指定对应宿主目录。

[Compose](/examples/debnas/cloud-media-sync/compose.yaml) · [env.example](/examples/debnas/cloud-media-sync/env.example) · [官方安装说明](https://docs.cmscc.cc/install)

```yaml
# Upstream CMS example, with credentials supplied through .env.
services:
  cloud-media-sync:
    # Retained from the upstream CMS installation example.
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

环境变量模板：

```dotenv
# Copy to .env beside compose.yaml, then fill values for your own environment.
# UID/GID must match the intended service account and directory permissions.
PUID=
PGID=
CMS_ADMIN_USERNAME=
CMS_ADMIN_PASSWORD=
CMS_API_TOKEN=
EMBY_API_KEY=
CMS_DONATE_CODE=
# Use the same STRM_ROOT in CMS and Emby.
STRM_ROOT=/path/to/strm
```

`CMS_ADMIN_PASSWORD`、`CMS_API_TOKEN`、`EMBY_API_KEY` 和 `CMS_DONATE_CODE` 在本机填写；授权条件按当前版本的安装说明核对。`EMBY_HOST_PORT` 使用共享网络内的 `http://emby:8096`，刷新路径对应 `/media → /strm`。

CMS 官方模板包含 `privileged: true`，这里按该上游示例保留。它赋予容器较多宿主权限，部署时结合当前官方要求与所用功能确认；其他服务不因此需要同样设置。

### Emby

采用默认 HTTP **8096** 与 HTTPS **8920** 端口，媒体目录分别为本地 `/data/library` 与云端条目 `/strm`。示例以普通容器权限运行，不绑定某台机器的显卡或附加组。

[Compose](/examples/debnas/emby/compose.yaml) · [env.example](/examples/debnas/emby/env.example) · [官方镜像](https://hub.docker.com/r/emby/embyserver)

```yaml
# Basic Emby example with local media and STRM libraries.
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

环境变量模板：

```dotenv
# Copy to .env beside compose.yaml, then fill values for your own environment.
# Match the media directories' permissions; no GPU-specific group is assumed.
EMBY_UID=
EMBY_GID=
EMBY_GIDLIST=
# Use the same MEDIA_ROOT in MoviePilot, downloaders, and Emby.
MEDIA_ROOT=/path/to/data
# Use the same STRM_ROOT in CMS and Emby.
STRM_ROOT=/path/to/strm
```

完成 WebUI 初始化后，分别添加本地库和 STRM 库。HTTPS 默认端口为 **8920**，示例已映射该端口，但仍需在 Emby 中配置证书；仅开放端口不会自动启用 HTTPS。硬件转码涉及设备映射、驱动与权限，按所用硬件另行配置。

## MoviePilot V3 与 CMS 如何配合

### MoviePilot 负责订阅与本地来源的整理

MoviePilot V3 负责站点配置、搜索订阅、下载器对接，以及本地下载文件的识别和整理。路线一的目标是 HDD 媒体库，路线三的目标是网盘；按照目标存储分别选择整理方式，别让同一个下载分类被两套自动整理规则重复接管。先确认一个下载器可用，再逐项增加订阅条件。

当前应从 [MoviePilot 项目](https://github.com/jxxghp/MoviePilot) 与官方 Wiki 核对 V3 部署说明，镜像入口为 [jxxghp/moviepilot-v3](https://hub.docker.com/r/jxxghp/moviepilot-v3)。收藏里的 `jxxghp/moviepilot` 与旧教程中的 V2 配置，应当作为旧版资料分别查看，不能只修改文章中的版本名称就继续照搬。

[CookieCloud](https://github.com/easychen/CookieCloud) 可用于给支持它的工具同步加密的浏览器 Cookie。是否需要它，取决于站点和集成方式；它不能代替所有站点认证，也不是连接 115、CMS 和 Emby 的通用登录组件。

### CMS 按来源决定是否整理

CMS 在两条云端路线中承担不同工作：

- **路线二，115 转存或离线**：需要时由 CMS 整理云端文件，再同步生成 STRM。
- **路线三，本地下载后上传**：由 MoviePilot 完成整理，CMS 同步成品目录并生成 STRM。

同一批云端文件只交给一个工具维护命名与分类。不要同时让 MoviePilot 和 CMS 对它们执行自动移动、改名或删除，以免互相触发、覆盖结果。

这里尤其需要区分教程版本：[CMSHelp 的自动整理说明](https://github.com/guyue2005/CMSHelp/wiki/6.%E8%87%AA%E5%8A%A8%E6%95%B4%E7%90%86) 中，旧版曾通过 MoviePilot 2.0 配合整理，文档注明从 CMS 0.3.4 开始，新版自动整理已去除对 MP 的依赖。

因此，路线二可以由新版 CMS 自行整理；路线三则明确由 MoviePilot 整理后交给 CMS 同步。这两种职责安排与旧教程中的 CMS 调用 MP 识别接口不是同一件事。若增加其他云盘插件或联动，再单独核对它支持的版本和目录规则。

订阅也有自己的边界：MoviePilot 只能处理所配置且受支持的站点、规则和集成。任意公网链接、115 分享、ed2k 任务，并不会因为安装了这些应用就自动进入同一条订阅流程。

## Emby 与神医助手

Emby 负责把本地文件和 STRM 统一呈现为媒体库。建议先分别建立本地电影、本地剧集、云端电影和云端剧集库，便于核对路径与排错；使用稳定后再决定展示方式。

整理工具已经生成 NFO、海报时，核对 Emby 的元数据读取与写入设置，明确由哪个工具维护这些文件，避免多个程序反复覆盖。

[Emby 神医助手（StrmAssistant）](https://github.com/sjtuross/StrmAssistant) 是增强插件，涉及媒体信息提取、外挂字幕扫描、预览缩略图、中文搜索等功能。它负责改善媒体库使用体验，不负责下载资源，也不能代替 CMS 生成 STRM。

先让 Emby 原生播放通畅，再按对应 Emby 版本、插件版本以及社区版 / PRO 的说明安装。媒体信息提取或预览图生成可能读取远程视频，云盘库应关注扫描频率与实际请求量。

播放时还要区分：

- **直接播放**：客户端能够处理相应封装、编码等条件，不需要服务端重新编码。
- **直接串流**：保留原视频流，可能更换封装，或转换音轨、字幕。
- **转码**：视频因设备兼容性、带宽或烧录字幕等条件需要重新编码，会占用更多服务端资源。

直接播放描述的是媒体处理方式，不能单独用来判断网络流量是否经过 NAS。先在 Emby 会话中看清播放方式，再决定是否需要硬件转码配置。

## 播放器怎么选

播放器按实际设备选择，先确认能连接自己的 Emby，再测试本地文件与 STRM。候选包括 Yamby、Infuse、SenPlayer、FloePlayer、小幻影视和 iPlay。

- **[Yamby](https://play.google.com/store/apps/details?id=com.hush.yamby)**：Android 手机、平板上的第三方 Emby 客户端，支持添加和切换服务器。商店说明列有 STRM 直接播放功能，仍需核对实际设置和地址可达性。
- **[Infuse](https://firecore.com/infuse)**：Apple 平台播放器，可连接 Emby、Jellyfin 和 Plex，并同步观看记录。播放功能和订阅要求以官方说明为准。
- **[SenPlayer](https://apps.apple.com/cn/app/id6443975850)**：支持 iPhone、iPad、Mac 和 Apple TV，应用说明列有 Emby、Jellyfin 和 Plex 连接能力。
- **[FloePlayer](https://t.me/FloePlayer)**：链接为 Floe 播放器官方频道。频道提供桌面版本与更新说明，包含 Emby 支持；STRM 功能要核对具体版本与媒体库设置。
- **小幻影视、iPlay**：先保留在候选清单中，下载时核对具体产品与发布者，再确认是否支持 Emby、STRM 和所用设备，避免把同名应用的功能混在一起。

在支持 Emby 的播放器中添加服务器，填写当前网络可访问的服务地址与自己的 Emby 账号；若使用 CMS 的 Emby 302 代理入口，按 CMS 对应版本的配置连接并测试。

不只测试“能打开”，还要试一次完整使用流程：选择字幕、切换音轨、拖动进度、暂停后续播，以及播放进度能否回到 Emby。局域网正常后，再用移动网络测试同一部影片，能更快区分播放器和外网配置的问题。

## CloudDrive2 与其他网盘

[CloudDrive2](https://www.clouddrive2.com/) 把支持的网盘挂载给本机应用使用，是路线三让 MoviePilot 写入网盘的一种接法。按官方文档选择宿主机服务或容器部署，单独规划配置、挂载点和缓存空间。

路线二由 CMS 直接访问 115 时，不要求再经过 CloudDrive2。路线三采用挂载写入时，CloudDrive2 位于上传环节；上传完成后的 CMS 同步与播放取流，仍按 CMS 的存储和播放配置处理。

其他网盘先确认当前 CMS 版本是否支持，以及登录、增量同步、地址续期等能力是否满足需求。没有对应支持时，再考虑 CloudDrive2 挂载后交给 Emby 读取，或使用该存储支持的其他方案，不能默认所有网盘都能照搬 115 配置。

### 恢复挂载后，再恢复依赖它的操作

CloudDrive2 重启后，宿主机能够重新读取云盘，并不保证已经运行的容器能看到新挂载。Docker 默认的 `rprivate` 挂载传播方式不会自动传播后续挂载变化。

先等待目标挂载就绪，检查来源与实际读取结果，再视情况重建或重启直接依赖它的容器。等待和读取检查都应有超时；超时后停止后续上传、整理与扫描，保留日志供排查。如果用 systemd 自动等待，服务启动超时也应覆盖检查时长。

具体见安装篇的 [CloudDrive2 挂载踩坑](/posts/2026-10-09-debnas-installation-notes/#clouddrive2-挂载踩坑)。缓存不是云盘根目录，写入缓存也不等于上传成功，路线三仍需要核对远端结果。

收藏的 [sublaim/clouddrive2](https://github.com/sublaim/clouddrive2) 是第三方安装脚本仓库，使用时与产品官方说明区分，先核对系统和挂载要求。

## 外网访问方案

### 按网络条件选择入口

Tailscale、ZeroTier 适合让授权设备加入同一私有网络；播放器接入后，使用 NAS 的组网地址与发布端口访问。访问 NAS 自身通常不需要额外设置出口节点或子网路由，具体按网络需求配置。

Lucky 可用于管理反向代理、域名与证书；配置示例放在安装篇。单独启动容器不会自动建立公网观影入口，仍要在应用内填写域名、证书和转发目标。几种工具的分工如下：

| 工具      | 主要用途                                     | 配置时要确认                                          |
| --------- | -------------------------------------------- | ----------------------------------------------------- |
| Lucky     | 反向代理、端口转发、域名与证书等服务入口管理 | 入口确实可达，反向代理目标和证书配置正确              |
| ddns-go   | 把变化的公网 IPv4 / IPv6 更新到 DNS          | 有可用的公网地址及防火墙规则；更新 DNS 不等于打通网络 |
| Tailscale | 让授权设备加入私有网络                       | 能否直连，不能直连时的中继路径与速度                  |
| ZeroTier  | 让授权设备组成虚拟网络                       | 成员授权、路由和实际连接质量                          |

有可达的公网地址时，可以用域名与 HTTPS 入口访问 Emby。Lucky 自带相关 DDNS 功能，选用它后不必让 ddns-go 再更新同一条记录。

没有可入站的公网 IPv4 时，单独安装 ddns-go 无法穿透运营商 NAT。有公网 IPv6 也需要客户端网络支持 IPv6，并正确放行必要流量。选择私有组网或公网入口后，都要实测连接质量与播放效果。

对外只开放实际需要的观影入口；下载器、MoviePilot、CMS 和系统管理页面可以继续通过局域网或私有组网访问。观影账户与管理员账户分开使用。

对于 STRM，外网测试要覆盖整条取流路径：播放器可能访问 Emby，也可能继续访问 CMS、重定向地址或网盘。只让 Emby 首页能打开，无法证明云端视频可以播放。若播放地址中仍有客户端无法访问的内网 IP 或容器主机名，就需要按实际播放方式调整入口。

可按需要用防火墙区分公网、局域网和私有组网。Docker 发布端口还涉及容器转发规则，不能只凭宿主机某个 zone 没开端口，就认定容器服务没有暴露。按安装篇的 [防火墙记录](/posts/2026-10-09-debnas-installation-notes/#防火墙要覆盖宿主机与容器)，分别核对 IPv4、IPv6 和不同网络的访问范围。

## 更新、备份与重启验收

按自己的变更频率和可接受的数据损失安排备份时间与保留份数，本文不预设定时任务。备份至少要覆盖各栈 Compose、私有 `.env`、应用配置、数据库以及需要恢复的任务状态。

MoviePilot 的配置和浏览器数据、下载器任务状态、CMS 配置、Emby 数据库与播放记录应逐项确认。媒体原文件、照片、STRM、字幕和 NFO 是否另行备份，需要单独规划；配置备份不会自动包含它们。

数据库采用自身备份工具或干净停止后的数据备份，避免直接复制仍在写入的文件。备份与更新任务应互斥；将归档复制到另一台设备或云端后，还要做隔离恢复，验证数据与应用能正常启动。

更新前记录可用镜像和插件版本，保留可恢复数据。重启后依次确认数据盘、数据库、云盘挂载和依赖容器，最后测试扫描、整理与播放。本文示例未添加自动更新标签，是否自动更新由自己的维护策略决定。

## 按什么顺序接入与验证

安装或调整配置后，按下面的顺序检查交接是否成立：

1. **确认基础存储**：核对数据目录的挂载来源、文件系统、可用空间和权限，再检查 Compose、应用配置、数据库是否位于预期位置。
2. **确认容器互联**：核对服务是否都已加入共享的 `media` 网络，用容器内端口检查服务之间的连接；客户端另测宿主机发布端口。
3. **跑通路线一**：下载一部测试影片，检查本地整理、保种、Emby 识别、字幕与播放，确认实际采用硬链接还是其他方式。
4. **跑通路线二**：115 转存或离线完成后，测试 CMS 整理、STRM 同步与 Emby 播放，并核对增量更新。
5. **跑通路线三**：确认 CloudDrive2 挂载真实可写，或所选原生存储已授权，让 MoviePilot 复制上传本地文件到网盘，等远端完成后让 CMS 同步，检查本地保种与云端播放都正常。
6. **验证插件与播放器**：逐项启用神医助手所需功能，用本地文件和 STRM 分别测试字幕、音轨、拖动与播放进度。
7. **验证 Tailscale 与重启恢复**：从移动网络测试取流，再验证主机或 CloudDrive2 重启后的挂载、容器访问和媒体恢复。
8. **核对备份与版本记录**：检查归档、云端上传结果和服务恢复状态，记录最终目录、端口、镜像与插件版本；隔离恢复演练继续单独完成。

每次只增加一个环节，成功后再继续。这样出现问题时，能知道是下载、整理、入库还是播放环节发生了变化。

## 按流程排查问题

- **订阅没有任务**：检查站点连接、认证、订阅规则和匹配记录，先确认有没有找到符合条件的资源。
- **任务完成但没有整理**：检查下载分类、目录、MoviePilot 可见路径和整理日志，区分自动下发与手动添加的任务。
- **硬链接失败或变成复制**：检查文件系统、挂载边界和权限，并在整理结果里确认实际使用的方式。
- **115 有文件但没有 STRM**：检查 CMS 扫描范围、全量 / 增量同步状态、整理结果和输出权限。
- **STRM 已生成但 Emby 没有条目**：核对 Emby 的容器映射、库类型、文件命名和刷新记录。
- **有海报但无法播放**：检查实际媒体地址、登录状态、地址有效期、请求条件与网络可达性。
- **局域网可播、外网不可播**：检查后续取流地址是否仍指向内网，或是否发生重定向、证书和组网问题。
- **能够播放但卡顿**：区分云盘取流、家庭上行、中继速度和转码负载，再针对瓶颈调整。
- **同一部影片反复出现或被改名**：检查是否扫描了下载目录，以及多个整理工具是否同时管理同一批文件。
- **本地整理到网盘后，CMS 仍看不到文件**：先确认所用上传方式已把文件完整写入正确的 115 目录，再检查 CMS 同步范围与触发时机；挂载写入还要看 CloudDrive2 的后台任务。
- **CloudDrive2 重启后宿主机可读、MoviePilot 不可读**：核对 FUSE 与容器 bind mount 是否已恢复，按既有挂载恢复流程处理依赖容器。
- **开机后媒体目录变空或备份失败**：先核对示例变量是否已替换、目录是否挂载到了正确的数据盘，不要立即把空目录扫描结果当作真实删除。
- **LAN、SSH 和全部 Web 服务一起失联**：先排查主机、网络、供电与存储，再结合系统日志定位；不能仅凭现象归咎于某个播放器或媒体服务。

## 项目入口与参考教程

正文提到的工具以各自项目文档为准。这里集中保留部署入口和补充资料，旧教程用于理解思路，具体参数按当前版本重新核对。

### 基础环境与核心服务

- [DebNAS 安装及折腾记录](/posts/2026-10-09-debnas-installation-notes/)：系统、存储、网络与维护的配套说明。
- [DebNAS 文档](https://kekylin.github.io/debnas-docs/)：kekylin 的 Debian HomeNAS 方案。
- [MoviePilot 官方安装说明](https://wiki.movie-pilot.org/install)、[文件整理说明](https://wiki.movie-pilot.org/reorganize) 与 [MoviePilot V3 镜像](https://hub.docker.com/r/jxxghp/moviepilot-v3)；原收藏的 [jxxghp/moviepilot 镜像](https://hub.docker.com/r/jxxghp/moviepilot) 保留作旧版入口。
- [CMS 文档仓库](https://github.com/imaliang/cms-docs) 与 [CMSHelp](https://github.com/guyue2005/CMSHelp)：核对整理、同步和 STRM 相关设置，注意各页面对应的版本。
- CMS：[安装与基础配置](https://docs.cmscc.cc/install)、[全量同步](https://docs.cmscc.cc/docs/full-sync)、[自动整理](https://docs.cmscc.cc/docs/auto-organize) 与 [核心配置中的 Emby 路径替换](https://github.com/guyue2005/CMSHelp/wiki/7.-%E6%A0%B8%E5%BF%83%E9%85%8D%E7%BD%AE)。
- [Emby STRM 文档](https://emby.media/support/articles/Strm-Files.html) 与 [播放方式说明](https://emby.media/support/articles/DirectPlay-Stream-Transcoding.html)。
- [FrozenGEE/compose](https://github.com/FrozenGEE/compose)：容器配置模板与参数参考，使用前调整路径、权限和网络方式。
- [Windows-MoviePilot 发布页](https://github.com/developer-wlj/Windows-MoviePilot/releases)：第三方 Windows 工具，保留作其他设备的参考，不属于 DebNAS 部署必需项。

### 下载器与管理界面

- [qBittorrent 官网](https://www.qbittorrent.org/) 与 [Transmission 下载页](https://transmissionbt.com/download)。
- [TrguiNG 上游](https://github.com/openscopeproject/TrguiNG) 与 [jayzcoder 汉化增强分支](https://github.com/jayzcoder/TrguiNG)：Transmission 远程管理界面，本身不替代下载服务。
- [Transmission Web Control](https://github.com/ronggang/transmission-web-control) 及其 [Windows 安装说明](https://github.com/ronggang/transmission-web-control/wiki/Windows-Installation-CN)：项目已归档，保留为旧方案资料。
- 暮城：[《Transmission 配置文件参数中文详细解释》](https://cloud.tencent.com/developer/article/1966381)，腾讯云开发者社区，2022 年文章，参数与默认值需对照当前版本。
- [Transmission bug 排查讨论](https://forum.transmissionbt.com/viewtopic.php?t=18976)：主题来自收藏记录，作为遇到问题时的参考入口。

### 网络与组合方案

- [Lucky 项目](https://github.com/gdy666/lucky) 与 [官方网站](https://lucky666.cn/)、[ddns-go](https://github.com/jeessy2/ddns-go)、[Tailscale 连接类型说明](https://tailscale.com/kb/1257/connection-types)、[ZeroTier 文档](https://docs.zerotier.com/what/)。
- NodeSeek：[《EMBY 搭建教程基于docker-compose，CMS + emby + 115+MOVIEPILOT v2+Qbittorrent》](https://www.nodeseek.com/post-616021-1)。标题与自动化观影主题来自收藏记录，页面存在访问验证，未据此确认具体配置；其中 MoviePilot V2 与旧版 CMS 的联动不能直接套到本文的 V3 方案。
- [劲折腾的磕巴白菜](https://hi.keba.host/)：NAS、Emby、MoviePilot 与 Compose 相关实践文章，后续具体部署时再按主题对照。

系统安装和维护可回到安装篇查看，媒体链路按三条路线分别验证。将应用内目录与本文映射对应后，再逐步加入订阅、增量同步与外网播放。
