---
title: IPTV：在 NAS 上部署 Allinone 与直播源整理服务
description: 以绿联 NAS 为例，整理 Allinone 的 Docker Compose 部署、鉴权准备、M3U 订阅、allinone_format 频道分组与格式转换，以及播放器接入、更新和常见故障排查。
author: Ayulog
pubDatetime: "2026-10-10T10:00:00+08:00"
modDatetime: "2026-10-11T00:00:00+08:00"
draft: false
setupCategory: nas
tags:
  - IPTV
  - NAS
  - Docker
  - Docker Compose
  - 家庭影音
  - 教程
---

这里记录 **Allinone 生成直播订阅 → allinone_format 整理频道 → 播放器读取列表** 的接法。电视、电脑和平板共用一个入口，频道分组在服务端维护。

想先找现成直播列表、导入播放器和配置节目单，可以看 [IPTVindex：找直播源、接入播放器与节目单](/posts/2026-10-11-iptv-index/)。

Allinone 镜像页面指向的说明短链在核对时已失效，当前完整鉴权参数无法确认。下文保留待填授权参数的模板，具体频道也未验证；拿到维护者当前的有效配置后才能继续部署。

Docker 环境见 [Docker 官方安装文档](https://docs.docker.com/engine/install/)，其他播放器和媒体服务见 [NAS 总篇](/posts/2026-10-09-nas-software-websites/)。

## 目录

- [先分清直播源与播放器](#先分清直播源与播放器)
- [部署前准备](#部署前准备)
- [部署 Allinone](#部署-allinone)
- [导入 M3U 订阅](#导入-m3u-订阅)
- [用 allinone_format 整理频道](#用-allinone_format-整理频道)
- [播放器与节目单](#播放器与节目单)
- [远程访问与反向代理](#远程访问与反向代理)
- [更新与备份](#更新与备份)
- [常见问题](#常见问题)
- [参考资料](#参考资料)

## 先分清直播源与播放器

| 名称                | 作用                             | 使用时要注意                             |
| ------------------- | -------------------------------- | ---------------------------------------- |
| 直播源              | 提供频道实际播放的流地址         | 地址、鉴权、地区和网络条件都会影响播放   |
| M3U / M3U8 播放列表 | 保存频道名称、分组和地址等信息   | 拿到列表不代表其中每个频道都可用         |
| TXT 频道列表        | 部分电视播放器使用的频道列表格式 | 分组语法要与播放器兼容                   |
| EPG / XMLTV         | 提供频道的节目名称和播出时间     | 需要单独的节目单来源，并与频道标识匹配   |
| 播放器              | 读取列表并解码音视频             | 是否支持格式、编码和节目单，取决于客户端 |

这里的 Allinone 是网络直播源的聚合、代理服务，allinone_format 是另一个维护者提供的整理工具。播放器支持原始 M3U、也不需要重新分组时，可以只部署 Allinone。

本文不涉及运营商 IPTV 专网的接入。光猫 IPTV 口、业务 VLAN、IGMP 和组播转发是另一类网络配置，安装这两个容器不会自动打通运营商机顶盒业务。

Allinone 也不会把普通频道变成 4K。最终画质由上游源、实际码率和播放器解码能力决定，整理列表不能修复已经失效的直播流。

## 部署前准备

以 Linux NAS 上的 Docker Compose 为例，先确认：

| 项目             | 本文约定                                                    |
| ---------------- | ----------------------------------------------------------- |
| NAS 地址         | 固定局域网地址，下文用 `NAS_IP` 表示                        |
| Allinone 端口    | `35455`，用于访问原始订阅                                   |
| 整理服务端口     | `35456`，用于配置和访问整理后的订阅                         |
| 项目目录         | 自选目录，保存 `compose.yaml` 与本地 `.env`                 |
| 整理服务数据目录 | 示例为 `/volume1/docker/iptv/format`，替换成 NAS 的真实路径 |
| 授权参数         | 按 Allinone 维护者当前流程取得，不能照抄别人的 Token        |

先确认两个端口未被其他服务占用。Docker 镜像下载有问题时，参考 [Docker 镜像加速与拉取排错](/posts/2026-10-10-docker-registry-mirrors/)，不要把旧文章里的第三方镜像前缀当成长期有效的地址。

核对时，`youshandefeiyang/allinone:latest` 镜像元数据列出了 Linux 的 amd64、arm64 和 arm 平台。部署前仍需核对所选标签与设备架构；镜像提供某个平台，不等于所有使用该架构的 NAS 都已验证兼容。

## 部署 Allinone

### 先取得当前授权参数

参考教程使用 AES 密钥、用户 ID 和专属 Token，并通过 Telegram 机器人生成部署命令。**这些是参考教程记录的流程，本次没有通过机器人申请或验证当前授权方式。**

从 [Allinone 镜像页面][allinone-image]和[作者主页][allinone-author]确认当前维护入口，再取得适用于所选镜像的完整命令。若当前入口无法提供有效说明或授权参数，先停在这一步；只有 `-tv=true` 的旧示例不足以证明服务现在能够启动和播放。

保存生成的命令时，分清：

- `docker run` 的容器名称、网络、端口和重启策略，属于 Docker 配置。
- 镜像名称之后的程序参数，才是传给 Allinone 的 `command`。
- 如果直接取得 Compose 配置，则以其中当前的 `command`、环境变量或挂载要求为准。

个人 Token、密钥和带鉴权信息的完整订阅地址仅保存在本地，分享配置时用占位符替换。

### Compose 模板

下面是**等待填入当前程序参数的模板**，适用于授权信息通过命令行参数传入的情况。如果当前维护者已经改用环境变量或配置文件，按新说明调整，不要硬套这个模板。

```yaml
services:
  allinone:
    image: youshandefeiyang/allinone:latest
    container_name: allinone
    restart: unless-stopped
    ports:
      - "35455:35455"
    command: ${ALLINONE_ARGS:?请先填写当前授权命令中的完整程序参数}
```

在同目录的本地 `.env` 中设置 `ALLINONE_ARGS`，其值为当前命令中**镜像名称之后的全部程序参数**，不含 `docker run`、镜像名或 Docker 自身的选项。NAS 项目页面支持变量输入时，也可以在创建项目时设置这个变量。这里故意不提供猜测的鉴权参数名称；变量缺失或为空时，Compose 会报错并停止。

`.env` 用来分离配置，不是加密存储。不要上传到公开仓库，也不要公开展开后的 Compose 输出。涉及空格、引号或 `$` 的参数，按 [Compose 变量插值说明][compose-interpolation]处理，并检查参数是否被完整保留。

此模板使用 Compose 默认桥接网络与端口映射，不额外开启特权模式。镜像页面的旧示例同时写了 host 网络、`-p` 和特权模式：**host 模式不使用端口映射**，也不应仅因旧模板里出现过就照搬全部权限。若当前程序明确依赖其他网络或权限，应先核实原因并调整；此处没有对省略特权模式后的实机兼容性作保证。

通过绿联 Docker 的项目管理入口导入配置并启动。菜单名称以当前 UGOS Pro 版本为准；通过 SSH 操作时，在项目目录执行：

```bash
docker compose config --quiet
docker compose up -d allinone
docker compose ps
docker compose logs --tail=100 allinone
```

`config --quiet` 用于检查 Compose 配置，不会验证 Token 是否有效。启动后重点查看是否有参数解析失败、授权失败、端口冲突或不断重启。

## 导入 M3U 订阅

参考教程的主订阅地址是：

```text
http://NAS_IP:35455/tv.m3u
```

将 `NAS_IP` 换成 NAS 的局域网地址。先在同一局域网的电脑上访问，再导入播放器的“网络串流”“订阅源”或类似入口。

验证分三步：

1. **服务可达。** 能连接 `35455`，日志没有持续报错。根路径返回文字，只能说明 HTTP 服务有响应。
2. **列表有效。** `tv.m3u` 返回播放列表，通常以 `#EXTM3U` 开头，有频道信息和流地址；不能是登录页、错误 JSON 或一段报错文字。
3. **实际能播。** 在播放器中选几个不同频道测试，确认有画面、声音，切台和持续播放也正常。

如果某个频道失败，取列表中该频道的实际地址单独测试，先排除上游失效，再看播放器和格式整理环节。

原文还列出 `huyayqk.m3u`、`bililive.m3u`、`douyuyqk.m3u`、`yylunbo.m3u` 等平台列表。它们属于原教程提供的入口，本次未验证当前镜像是否仍支持，使用前对照当前文档与实际响应。

## 用 allinone_format 整理频道

[allinone_format][format-project] 用于重新分组、调整频道列表，并为不同播放器提供订阅格式。先把原始 `tv.m3u` 测通，再添加整理服务，排错会容易很多。

### 添加服务

将前面的 `compose.yaml` 扩展为下面的双服务配置，沿用已经填好的本地授权变量。两项服务放在同一个 `services` 下：

```yaml
services:
  allinone:
    image: youshandefeiyang/allinone:latest
    container_name: allinone
    restart: unless-stopped
    ports:
      - "35455:35455"
    command: ${ALLINONE_ARGS:?请先填写当前授权命令中的完整程序参数}

  allinone_format:
    image: yuexuangu/allinone_format:latest
    container_name: allinone_format
    restart: unless-stopped
    ports:
      - "35456:35456"
    volumes:
      - /volume1/docker/iptv/format:/app/config
```

提前创建左侧宿主机目录，并替换为 NAS 实际路径。右侧 `/app/config` 保持为整理服务使用的容器内目录，用于保留配置。

此处同样使用桥接网络。不要同时添加 `network_mode: host`；如果自行改用 host 模式，就删除 `ports`，并检查宿主机端口冲突。

启动并查看日志：

```bash
docker compose config --quiet
docker compose up -d allinone_format
docker compose logs --tail=100 allinone_format
```

### 配置输入源与输出订阅

浏览器打开：

```text
http://NAS_IP:35456
```

在配置页面填写已经测通的原始订阅：

```text
http://NAS_IP:35455/tv.m3u
```

先保留默认分组和其他设置，保存后按页面显示的订阅地址导入播放器。需要 TXT 时再选择 TXT 输出，支持 M3U 时优先用 M3U，便于保留频道标识、分组和台标等信息。

**管理页面、输入源和输出订阅是三个不同地址。** 播放器应填写页面生成的订阅链接，不是 `35456` 的管理首页，也不是在需要整理结果时仍填原始 `35455/tv.m3u`。

填写输入源时还要注意地址从哪里访问：

- 容器中的 `127.0.0.1` 指向容器自身，通常不能用来访问另一个容器。
- 同一 Compose 网络中的服务名可能只对容器可解析，电视、手机通常不能解析 `allinone` 这个名称。
- 用 NAS 的局域网地址作为输入后，仍需检查**输出列表里的实际播放地址**是否可被客户端访问。容器能下载列表，不代表播放器能连接其中的每一条流。

若 NAS 的网络规则阻止容器通过宿主机地址访问已映射端口，可在同一 Compose 网络内尝试服务名连接；同时依据项目设置处理对外播放地址，并再次检查输出列表，不能只以后台“拉取成功”为依据。

最后再调整频道排序、分组和名称。每次只改一类设置，保存后刷新播放器订阅，方便定位问题。

## 播放器与节目单

### 先用电脑验证，再接电视

电脑端可以用 [VLC][vlc] 的“打开网络串流”测试原始订阅和单个频道地址。电脑验证成功后，再把同一订阅导入电视端，便于区分服务问题与客户端问题。

Apple 设备可以查看 [APTV 的 App Store 页面][aptv]，按当前版本支持的导入方式添加订阅。Android TV 则选择明确支持自定义 M3U 或 TXT 的播放器，安装来源和更新渠道以项目维护者为准。

原参考文章列出了若干电视客户端，但客户端名称、获取渠道和维护状态会变化，本文不把旧下载地址作为通用安装步骤。

播放器能列出频道却黑屏时，可以切换解码方式或换一个播放器交叉验证。某个播放器不能解码，不代表 NAS 需要重新部署；所有播放器都无法播放同一地址时，则应先检查源与网络。

### EPG 需要另外配置

M3U 主要解决“有哪些频道、到哪里播放”，节目单解决“这个频道现在播什么”。有频道名称和台标，不代表已经有 EPG。

如果播放器支持 XMLTV，可以添加自己可用的节目单地址，再检查频道的 `tvg-id` 等标识能否与节目单对应。没有 ID 或名称不一致时，可能需要手动映射。

节目时间偏移时，先核对 XMLTV 时间字段中的时区，以及播放器的时区设置。不要为了修正个别频道的节目单，把 NAS 的系统时间整体改错。

## 远程访问与反向代理

先在局域网完成播放验证。外出使用时，可参考 [NAS 远程访问](/posts/2026-10-09-nas-remote-access/)，通过可信的家庭网络连接访问服务；整理服务的管理页面也应限制访问范围。

反向代理需要同时处理**列表地址和列表里的流地址**。能用 HTTPS 下载 `tv.m3u`，但里面仍是家里的 `192.168.x.x` 地址时，外网播放器依然无法播放。

参考教程给出的前缀参数示例是：

```text
https://iptv.example.com/tv.m3u?url=https%3A%2F%2Fiptv.example.com
```

这是原文记录的 `url` 参数用法，当前版本是否继续支持需实测确认；域名是示例，不能直接使用。保存前打开返回的 M3U，检查协议、域名、端口和每条流地址是否正确，再从外部网络验证播放。

反代认证也要与播放器兼容。浏览器能弹出登录页，不代表电视播放器能完成同样的认证流程。

## 更新与备份

直播源规则可能变化，但镜像自动更新也可能改变参数或订阅接口。先采用可回退的手动更新，确认当前版本稳定后再考虑自动化。

备份以下内容：

- `compose.yaml` 与本地授权变量，注意保留访问权限。
- allinone_format 映射到 `/app/config` 的宿主机目录。
- 播放器中的订阅、节目单和频道映射设置。
- 当前镜像的 ID、仓库摘要以及可恢复的旧镜像。

使用 `latest` 时，只记录标签不能锁定版本。可以在更新前通过 NAS 镜像管理页面或 `docker image inspect` 记录摘要；若镜像仓库以后不可用，还需要保留本地旧镜像或提前导出。

在项目目录依次执行：

```bash
docker compose pull allinone allinone_format
docker compose up -d allinone allinone_format
docker compose ps
docker compose logs --tail=100 allinone allinone_format
```

只部署了 Allinone 时，删去命令中的 `allinone_format`。单纯重启已有容器不会应用刚拉取的新镜像，需用 `up -d` 或 NAS 对应的重建操作。

更新后重新检查原始 M3U、整理后的列表和实际播放。确认可用再清理旧镜像；回退时同时考虑配置文件是否已被新版本修改，不能只换回镜像。

## 常见问题

| 现象                                | 优先检查                                                                          |
| ----------------------------------- | --------------------------------------------------------------------------------- |
| Compose 提示 `ALLINONE_ARGS` 未设置 | 在项目变量或同目录 `.env` 中填入当前完整程序参数，确认 NAS 的项目导入方式会读取它 |
| Allinone 启动后不断重启             | 日志中的参数错误、授权错误、镜像架构和端口占用                                    |
| 容器运行但 `35455` 无法访问         | 程序是否监听、端口映射、NAS 地址、防火墙与局域网隔离                              |
| 根路径正常，M3U 报错或为空          | 当前订阅路径、鉴权、上游规则与容器出站网络                                        |
| 整理服务无法读取源                  | 从容器视角检查源地址，避免把另一个服务写成 `127.0.0.1`                            |
| 原始 M3U 能播，整理后不能播         | 对比实际频道 URL 是否被修改、分组规则是否过滤了频道、播放器是否仍缓存旧列表       |
| 电脑能播，电视不能播                | 电视是否与 NAS 互通、列表格式和解码支持、电视中的订阅是否已刷新                   |
| 只有部分频道失效                    | 单独测试频道地址，检查上游状态、时效性鉴权、地区限制和线路                        |
| 有声音但没有画面                    | 视频编码与硬件解码支持，尝试软件解码或换播放器                                    |
| 更新后设置丢失                      | `/app/config` 是否正确持久化，是否误建了新目录，容器是否可写                      |
| 外网能下载列表却无法播放            | 列表中的流地址是否仍为内网 IP、容器名或错误协议，反代认证是否兼容                 |
| 节目单为空或时间错位                | XMLTV 是否可访问、频道标识是否匹配、时区是否正确                                  |

排查时按 **原始直播源 → Allinone 订阅 → 整理服务输出 → 播放器**逐层检查，保留一条已确认可播的频道作为对照。

## 参考资料

- 磕巴白菜：[绿联新系统部署肥羊 Allinone][keba-guide]：本文的部署场景与操作顺序参考；品牌界面截图见原文。
- [Allinone Docker Hub 页面][allinone-image]与[镜像标签][allinone-tags]：镜像名称、公开部署示例与平台信息。
- [Allinone 作者主页][allinone-author]：维护者入口。镜像页面指向的 `https://v1.mk/allinone` 本次返回短链失效，未据其确认现行鉴权细节。
- [FanchangWang/allinone_format][format-project]及其[镜像说明][format-image]：频道整理与格式转换项目、端口和配置目录。
- Docker：[Compose 变量插值][compose-interpolation]、[host 网络说明][docker-host]。
- [VLC 官方网站][vlc]、[APTV App Store 页面][aptv]：播放器入口。

[keba-guide]: https://hi.keba.host/archives/ugreen-iptv
[allinone-image]: https://hub.docker.com/r/youshandefeiyang/allinone
[allinone-tags]: https://hub.docker.com/r/youshandefeiyang/allinone/tags
[allinone-author]: https://github.com/youshandefeiyang
[format-project]: https://github.com/FanchangWang/allinone_format
[format-image]: https://hub.docker.com/r/yuexuangu/allinone_format
[compose-interpolation]: https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/
[docker-host]: https://docs.docker.com/engine/network/drivers/host/
[vlc]: https://www.videolan.org/vlc/
[aptv]: https://apps.apple.com/cn/app/aptv/id1630403500
