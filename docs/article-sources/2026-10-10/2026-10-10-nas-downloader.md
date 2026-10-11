---
title: NAS 下载器：用 Aria2 + AriaNg 管理直链、磁力与网盘下载
description: 以绿联 NAS 为例，用 Docker Compose 部署 Aria2 和 AriaNg，配置 RPC 密钥、下载目录与 BT 端口，再通过浏览器扩展和 AList 将下载任务交给 NAS。
author: Ayulog
pubDatetime: "2026-10-10T14:15:00+08:00"
draft: true
tags:
  - NAS
  - Aria2
  - AriaNg
  - Docker
  - 下载器
  - 教程
---

有些文件需要下载很久，电脑却不一定要一直开着。把下载任务交给 NAS 后，电脑和手机只负责添加任务、查看进度，文件直接落在 NAS 的下载目录里，后续共享和整理也方便一些。

这篇记录 **Aria2 + AriaNg** 的部署和使用：Aria2 在后台执行下载，AriaNg 提供浏览器管理界面，再按需要接入浏览器扩展和 AList。

本文参考磕巴白菜的[绿联 Aria2 部署教程][keba-guide]，结合上游文档与源码重新整理。资料核对于 **2026 年 10 月 10 日**，示例适用于已安装 Docker Compose V2 的绿联 NAS、Debian / DebNAS 等 Linux 环境，未在绿联设备上实机验证。相关工具还可以在 [NAS 常用软件及网站记录](/posts/2026-10-09-nas-software-websites/) 中查找。

## 目录

- [先分清 Aria2 和 AriaNg](#先分清-aria2-和-ariang)
- [部署前准备](#部署前准备)
- [用 Docker Compose 部署](#用-docker-compose-部署)
- [连接 AriaNg 与 Aria2](#连接-ariang-与-aria2)
- [添加下载任务](#添加下载任务)
- [通过浏览器扩展发送下载](#通过浏览器扩展发送下载)
- [通过 AList 下载网盘文件](#通过-alist-下载网盘文件)
- [常用参数与日常维护](#常用参数与日常维护)
- [常见问题](#常见问题)
- [参考资料](#参考资料)

## 先分清 Aria2 和 AriaNg

[Aria2][aria2-manual] 是下载程序，支持 HTTP(S)、FTP、SFTP、BitTorrent 和 Metalink。磁力链接属于 BitTorrent 的使用方式；它不直接提供各家网盘的账号登录和文件浏览功能。

[AriaNg][ariang-repo] 是网页前端，通过 Aria2 的 RPC 接口管理任务。打开网页只是加载了界面，RPC 连接成功之后，才能看到 NAS 上的下载状态。

```text
电脑 / 手机浏览器
    ├─ 打开 AriaNg 网页：查看与操作任务
    └─ 连接 Aria2 RPC：提交下载、暂停、调整设置
                       ↓
                 NAS 上的 Aria2
                       ↓
              写入挂载到 /downloads 的目录
```

AriaNg 页面关闭后，NAS 上已经开始的任务仍会继续。文件存到 NAS，而不是打开网页的那台电脑。

### 适合放在哪个位置

| 需求                       | 选择与注意点                                                               |
| -------------------------- | -------------------------------------------------------------------------- |
| 下载软件包、镜像、公开直链 | Aria2 可以接收链接，在 NAS 后台下载                                        |
| 公网 BT、磁力链接          | 支持，但速度仍取决于资源热度、可连接节点和网络条件                         |
| 下载网盘中的文件           | 需要有效下载地址及必要认证，可由 AList 等工具协助取得并发送                |
| PT 长期做种与自动化管理    | 先核对站点客户端白名单，通常围绕站点允许的 qBittorrent / Transmission 配置 |

Aria2 不会解除网盘限速、会员限制或链接有效期，也不负责媒体识别和入库。下载后的整理与播放，可以继续参考 [DebNAS 媒体服务与自动化观影流程](/posts/2026-10-09-debnas-media-workflow/)。

## 部署前准备

### 选择镜像

本文使用第三方项目 [superng6/docker-aria2][docker-aria2-repo] 提供的镜像。

**当前 `superng6/aria2:latest` 标准镜像已经包含 AriaNg**，通过 `WEBUI=true` 开启。参考文章里的“`latest` 不含 WebUI、需要选 `webui-latest`”与当前构建配置不一致；上游 README 的部分示例也仍保留旧标签。本文以当前 Dockerfile 和正式构建流程为依据，使用 `latest`。

`a2b-latest` 是带额外 Peer 屏蔽功能的变体，需要额外网络权限等配置；本文先部署标准版。`latest` 是可变标签，稳定运行后可以记录实际镜像 digest，便于日后回退。

### 准备目录与账号

需要持久化两类数据：

| NAS 上的目录              | 容器内路径   | 用途                         |
| ------------------------- | ------------ | ---------------------------- |
| Compose 项目下的 `config` | `/config`    | 配置、会话、脚本设置和日志等 |
| 自己选择的下载目录        | `/downloads` | 正在下载及下载完成的文件     |

在 NAS 上选定应用存放位置，再创建项目目录：

```bash
mkdir -p aria2/config
cd aria2
```

下载目录可以通过 NAS 文件管理器创建。示例中的 `/path/to/downloads` 必须替换成它在 NAS 上的真实绝对路径，不能直接照抄。

通过 SSH 查询准备用于下载的 NAS 账户 ID：

```bash
id nasuser
```

将 `nasuser` 换成实际账号，记录输出中的 `uid` 和 `gid`。该账户需要能够读写配置目录与下载目录；在 NAS 权限管理中给相应目录授权。不要把教程里的 `0/0` 当作所有设备都应使用的值，也不需要给整个共享目录开放 `777` 权限。

## 用 Docker Compose 部署

在项目目录中创建 `.env`：

```dotenv
# 用上一步查到的实际 UID / GID 替换下面两个示例值
ARIA2_UID=1000
ARIA2_GID=1000
# 替换为自己生成的随机密钥，不要直接使用这一行的示例文本
ARIA2_SECRET=replace_with_a_long_random_secret
```

可以用密码管理器生成随机密钥；安装了 OpenSSL 的环境也可以执行 `openssl rand -hex 32`。这个密钥用于控制下载器，保留在自己的部署配置中。

然后创建 `compose.yaml`：

```yaml
services:
  aria2:
    image: superng6/aria2:latest
    environment:
      PUID: "${ARIA2_UID:?请在 .env 中设置实际 UID}"
      PGID: "${ARIA2_GID:?请在 .env 中设置实际 GID}"
      TZ: Asia/Singapore
      SECRET: "${ARIA2_SECRET:?请在 .env 中设置 RPC 密钥}"
      CACHE: 64M
      PORT: "6800"
      WEBUI: "true"
      WEBUI_PORT: "8080"
      BTPORT: "32516"
      UT: "true"
      RUT: "true"
      FA: falloc
      SMD: "true"
    ports:
      - "18080:8080"
      - "16800:6800"
      - "32516:32516/tcp"
      - "32516:32516/udp"
    volumes:
      - ./config:/config
      - /path/to/downloads:/downloads
    restart: unless-stopped
```

这里使用 bridge 网络，端口映射左右分别是 **NAS 端口:容器端口**：

| 用途        | 从局域网访问                  | 容器内监听        |
| ----------- | ----------------------------- | ----------------- |
| AriaNg 网页 | `http://NAS_IP:18080`         | TCP `8080`        |
| Aria2 RPC   | `http://NAS_IP:16800/jsonrpc` | TCP `6800`        |
| BT / DHT    | 按网络条件使用 `32516`        | TCP / UDP `32516` |

`NAS_IP` 换成 NAS 的实际局域网地址。网页端口和 RPC 端口冲突时，可以只改映射左侧；环境变量控制的是右侧的容器内监听端口。BT 示例保持内外端口一致，调整时同步修改 `BTPORT` 和两条映射。

若使用绿联 Docker 的 Compose 项目界面，将项目目录、环境变量和目录映射一并配置好，确认它能够读取同目录的 `.env`。相对路径 `./config` 需要对应到该项目的配置目录，不要把不同应用的配置都映射到同一位置。

在 Compose 文件所在目录运行：

```bash
docker compose config --quiet
docker compose pull
docker compose up -d
docker compose ps
docker compose logs --tail=100 aria2
```

语法检查通过不代表镜像一定能拉取，也不证明下载目录可写。继续确认容器正常运行、日志没有权限或端口冲突错误，再打开网页测试。

本文先在局域网使用。路由器上的 BT 入站映射与管理入口是两回事；需要远程管理时，可以通过 VPN 或私有组网访问 NAS，不必将 `18080` 和 `16800` 直接映射到公网。

## 连接 AriaNg 与 Aria2

在浏览器打开：

```text
http://NAS_IP:18080
```

进入 **AriaNg 设置 → RPC**，按当前版本的界面填写连接信息：

| 字段     | 本文示例                            |
| -------- | ----------------------------------- |
| RPC 协议 | HTTP                                |
| 主机地址 | NAS 的局域网 IP，不带 `http://`     |
| 端口     | `16800`                             |
| 接口路径 | `jsonrpc`，组成 URL 后是 `/jsonrpc` |
| RPC 密钥 | `.env` 中 `ARIA2_SECRET` 的值       |

密钥字段填写原始密钥，不加引号，也不加 `token:` 前缀；前端会处理 RPC 请求格式。设置完成后检查连接状态是否为已连接，并确认能读取全局速度和任务列表。

**这条 RPC 请求由浏览器发起。** 电脑浏览器里的 `127.0.0.1` 指向电脑自己，不能代替 NAS 地址；Docker 服务名 `aria2` 也通常不能被局域网浏览器解析。换一台电脑或换浏览器后，可能需要重新配置连接。

若以后通过 HTTPS 域名访问 AriaNg，RPC 也要使用浏览器允许的安全连接，例如正确配置的 HTTPS / WSS 反向代理；HTTPS 网页直接连接 HTTP RPC 可能被混合内容策略拦截。

### 设置下载目录

在 **Aria2 设置 → 基本设置** 中检查下载目录，本文填写：

```text
/downloads
```

这是容器看到的路径。由于 Compose 将 NAS 下载目录映射到了这里，不要在 AriaNg 中填写 NAS 的原始路径或电脑上的盘符。

创建任务时也可以指定 `/downloads/software` 等子目录。先下载一个有权访问的小文件，确认任务完成，并在 NAS 文件管理器中找到它，再添加大体积任务。

## 添加下载任务

### HTTP / HTTPS 直链

在 AriaNg 中新建下载，粘贴真实文件地址；批量添加时可以按界面要求一行一个链接。网页地址、分享页面和最终文件地址不一定相同，拿到 HTML 文件或报错时先检查链接类型。

需要登录才能访问的文件，可能还需要 Cookie、Referer 或其他请求头。有些下载地址还绑定获取时的 IP、短期签名或 User-Agent，电脑上能下载不代表交给 NAS 后仍然有效。

### 种子与磁力链接

可以在新建任务时粘贴 `magnet:` 链接，或通过界面打开 `.torrent` 文件。多文件种子按需要选择文件，并核对保存目录。

磁力任务通常需要先从其他节点取得元数据，之后才知道文件名与目录。长时间停在获取元数据阶段，应检查资源是否仍有可用节点、DHT / UDP 是否可用，以及 Tracker 的连接状态。

Tracker 帮助发现节点，不负责保存资源本体。增加 Tracker 不会让无人做种的资源自动出现；下载慢也不一定是缓存或线程设置的问题。

在有可用公网入站条件时，可以将路由器的 TCP / UDP `32516` 转发到 NAS 的相同端口，并放行 NAS 防火墙。Docker 的端口映射不会自动完成路由器转发；处于运营商 NAT 后时，还需要判断自己的入站条件。无需为了测试直链下载先完成 BT 入站配置。

## 通过浏览器扩展发送下载

[Aria2 Explorer][explorer-repo] 可以把浏览器下载任务发送给 Aria2，并提供内置的 AriaNg 管理界面。安装入口使用项目 README 中的 Chrome / Edge 官方商店链接。

1. 在扩展中添加 Aria2 RPC 服务，地址填写 `http://NAS_IP:16800/jsonrpc`。
2. 填入同一组 RPC 密钥，测试连接。
3. 先用手动发送或右键菜单提交一个小文件，确认保存到 NAS。
4. 有需要再开启自动接管，并设置域名、文件类型等过滤条件。

扩展可能需要把下载请求相关的 Cookie 交给你的 Aria2 服务。只连接自己信任的下载器，并按需要开启任务接管；不要为了接管一次下载，把包含凭据的配置公开分享。

## 通过 AList 下载网盘文件

Aria2 不直接登录网盘。已经部署 AList 并能正常浏览文件时，可以由 AList 提供可用下载地址，再将任务发送到 NAS 上的 Aria2。

### 使用“发送到 Aria2”

按 [AList 当前文档][alist-settings]，文件列表前端提供发送到 Aria2 的入口：

1. 在文件列表页面右下角的设置中，填写 **Aria2 RPC 链接**与 **Aria2 RPC 密钥**。
2. 链接使用 `http://NAS_IP:16800/jsonrpc`，密钥与 Compose 中保持一致。
3. 开启复选框，选择文件或文件夹，在下载菜单中选择 **发送到 Aria2**。
4. 回到 AriaNg 检查任务和保存位置，最后在 NAS 文件管理器中核对文件。

这个操作的目标是把网盘里已有的文件下载到 Aria2 所在设备。界面显示“发送成功”只代表提交成功，下载是否完成还要看 Aria2 的任务状态。

### 与“离线下载”分开理解

AList 后台的 Aria2 配置还可以用于另一套[离线下载流程][alist-offline]：提交外部链接，先下载到临时目录，再转移到选定的存储。它涉及 AList 读取下载结果，以及双方可见的临时目录和权限，不能只填 RPC 地址就认为配置完毕。

本文只演示文件列表中的“发送到 Aria2”。若以后要让 AList 离线下载并上传到目标网盘，再按对应版本文档配置共享临时目录和后续转移流程。

网盘地址过期、缺少请求头、获取链接与下载的出口 IP 不一致，或网盘侧限流，都可能造成发送成功但下载失败。先确认 AList 中单个文件能正常下载，再检查 Aria2 的错误信息，不要直接批量提交整个盘的文件。

## 常用参数与日常维护

### 镜像参数

下面这些是 `superng6/aria2` 镜像的环境变量，不是所有 Aria2 镜像都通用的字段：

| 参数        | 含义与调整建议                                                         |
| ----------- | ---------------------------------------------------------------------- |
| `SECRET`    | RPC 密钥，对应 `.env` 的 `ARIA2_SECRET`                                |
| `CACHE`     | 磁盘缓存，本文先用 `64M`；按内存与实际负载调整                         |
| `UT=true`   | 启动时更新 Tracker 列表                                                |
| `RUT=true`  | 当前脚本在每天 **05:00** 更新 Tracker，时间取决于容器 `TZ`             |
| `CTU`       | 可选的自定义 Tracker 列表 URL；未配置时使用镜像脚本中的来源            |
| `FA=falloc` | 文件预分配方式；还支持 `none`、`trunc`、`prealloc`，按文件系统能力选择 |
| `SMD=true`  | 保存磁力链接取得的种子元数据                                           |

`SMD` 本身不等于“自动重命名种子”。该镜像的种子后续处理还受 `/config/setting.conf` 中 `handle-torrent` 等脚本设置影响，例如 `backup-rename`；应结合当前镜像的配置说明核对。

AriaNg 通过 RPC 修改的选项不一定都会持久保存，镜像的启动环境变量也可能在重建时重新应用。需要长期保留的设置，应核对它由 Compose、`/config/aria2.conf` 还是辅助脚本负责，并在重启后检查一次实际值。

### 更新与备份

更新前记录当前镜像版本或 digest，备份 `compose.yaml`、私有 `.env` 与整个 `config` 目录。复制配置和会话文件前，先停止容器，使文件状态一致：

```bash
docker compose stop aria2
```

完成备份后再拉取并重建：

```bash
docker compose pull
docker compose up -d
```

只做备份、不更新时，用 `docker compose start aria2` 恢复运行。下载目录需要另外规划备份；保存配置并不会自动备份文件本体。

恢复时保留原来的容器内路径 `/downloads`，同时恢复配置与所需数据。未完成下载旁边的 `.aria2` 控制文件可能关系到续传，不要把它们当作普通垃圾批量删除。升级后复查 RPC 连接、任务列表和一个实际下载。

## 常见问题

| 现象                        | 优先检查                                                        |
| --------------------------- | --------------------------------------------------------------- |
| AriaNg 网页打不开           | 容器状态、`18080:8080` 映射、NAS 防火墙与端口冲突               |
| 网页正常，但显示未连接      | RPC 地址是否是 NAS、端口是否为 `16800`、路径和密钥是否正确      |
| HTTPS 页面连不上 RPC        | 是否被混合内容策略拦截，代理是否正确转发 HTTPS / WSS            |
| 提示目录不存在或无权限      | NAS 目录是否存在，挂载是否正确，PUID / PGID 与 ACL 是否允许写入 |
| 下载成功却找不到文件        | AriaNg 使用的容器路径是否位于 `/downloads` 映射范围内           |
| 磁力一直获取元数据          | 资源是否还有节点，DHT / UDP、Tracker 和网络是否可用             |
| 网盘返回 403 或下载很快失败 | 地址过期、认证头、来源 IP 限制、网盘限流与服务端错误信息        |
| 文件预分配失败              | 磁盘剩余空间、配额及文件系统是否支持所选 `FA` 模式              |
| 重启后设置变化              | Compose 环境变量、持久化配置和启动脚本分别控制了哪些选项        |

排查时按“容器运行 → 网页访问 → RPC 连接 → 目录写入 → 单个下载任务”的顺序验证。直链下载通过后，再继续测试磁力、浏览器扩展和网盘发送，每一步都检查最终文件。

## 参考资料

- 磕巴白菜：[新绿联部署 Aria2 + AriaNg][keba-guide]：本文部署场景与使用流程的参考，绿联界面截图可查看原文。
- [Aria2 官方手册][aria2-manual]：协议、RPC、下载目录、预分配和 BitTorrent 选项。
- [AriaNg 项目][ariang-repo]：网页前端、功能与使用说明。
- [superng6/docker-aria2][docker-aria2-repo]：第三方镜像与参数说明；标签和内置组件另核对 [Dockerfile][aria2-dockerfile] 与[正式镜像构建流程][aria2-build]。
- [镜像初始化脚本][aria2-init]、[Tracker 定时任务][aria2-cron]与[辅助脚本配置][aria2-settings]：环境变量、更新时间及种子处理的依据。
- [Aria2 Explorer][explorer-repo]：扩展功能、安装入口与配置说明。
- AList：[其他设置][alist-settings]与[离线下载][alist-offline]：前端发送任务和后台离线流程的区别。

[keba-guide]: https://hi.keba.host/archives/ugreen-aria2
[aria2-manual]: https://aria2.github.io/manual/en/html/aria2c.html
[ariang-repo]: https://github.com/mayswind/AriaNg
[docker-aria2-repo]: https://github.com/superng6/docker-aria2
[aria2-dockerfile]: https://github.com/superng6/docker-aria2/blob/master/Dockerfile
[aria2-build]: https://github.com/superng6/docker-aria2/blob/master/.github/workflows/Build%20Image.yml
[aria2-init]: https://github.com/superng6/docker-aria2/blob/master/root/etc/cont-init.d/30-config
[aria2-cron]: https://github.com/superng6/docker-aria2/blob/master/root/aria2/conf/rpc-tracker1
[aria2-settings]: https://github.com/superng6/docker-aria2/blob/master/root/aria2/conf/setting.conf
[explorer-repo]: https://github.com/alexhua/Aria2-Explorer
[alist-settings]: https://alistgo.com/zh/config/other.html
[alist-offline]: https://alistgo.com/zh/guide/advanced/offline-download.html
