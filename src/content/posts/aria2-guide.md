---
title: Aria2 与 AriaNg：Docker 部署与下载设置
description: Docker 部署 Aria2 与 AriaNg，接通 RPC 与下载目录，从网页、扩展或 AList 投递任务。
author: Ayulog
pubDatetime: "2026-10-10T14:15:00+08:00"
draft: false
category: nas
tags:
  - Aria2
  - Docker
  - 下载器
  - AList
---

想让下载留在 NAS 上后台跑，用 Aria2 接收 HTTP(S)、FTP、SFTP、BitTorrent 与 Metalink 任务，AriaNg 通过 RPC 在网页里查看和控制。文件保存在运行 Aria2 的设备，关闭浏览器不会停止任务。

动手前先给 Aria2 建独立项目目录和要映射的下载目录，用 `id nasuser` 查询实际写入账户的 UID / GID，并授予配置与下载目录读写权限。以下配置依据 2026 年 10 月 10 日的项目文档，未在绿联设备上实机部署。

## 选择镜像并部署

这里沿用第三方项目 [superng6/docker-aria2][docker-aria2-repo]。依据下方参考资料中的 Dockerfile 与正式构建流程，使用已包含 AriaNg 的标准 `superng6/aria2:latest`，由 `WEBUI=true` 开启；旧教程中“`latest` 不含 WebUI、要选 `webui-latest`”的说法不适用于该构建。`a2b-latest` 是带额外 Peer 屏蔽功能的变体，这里先使用标准版。

在 Aria2 项目中创建 `config`，再单独创建 `.env`：

```dotenv
# 填入实际 UID / GID
ARIA2_UID=
ARIA2_GID=
# 填入自己生成的随机密钥
ARIA2_SECRET=
```

密钥可以用密码管理器生成，装有 OpenSSL 时也可以运行 `openssl rand -hex 32`。保存 `compose.yaml`：

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

先把 `/path/to/downloads` 替换为 NAS 上实际存在且可写的下载目录，再执行：

```bash
mkdir -p config
docker compose config --quiet
docker compose pull
docker compose up -d
docker compose ps
docker compose logs --tail=100 aria2
```

配置检查仅验证语法，继续确认镜像拉取、启动和目录写入正常。通过绿联 Docker 等 NAS 的 Compose 界面部署时，要确认项目能读取同目录 `.env`，且 `./config` 指向该项目自己的配置目录。

映射左侧是 NAS 端口，右侧是容器端口。AriaNg 网页使用 `http://NAS_IP:18080`，RPC 使用 `http://NAS_IP:16800/jsonrpc`。二者冲突时可改映射左侧；BT 端口保持内外一致，改动时同步修改 `BTPORT` 和 TCP / UDP 映射。

## 连接管理界面

镜像已经包含 AriaNg，部署后打开 `http://NAS_IP:18080`。如果使用现有 Aria2 服务，下面的地址、端口和密钥换成自己的配置即可。

管理端口通过局域网或私有组网访问。BT 入站配置与 RPC 管理入口是两回事，不需要把管理端口映射到公网。

### 连接 RPC

在 **AriaNg 设置 → RPC** 中填写：

| 字段     | 本文示例                           |
| -------- | ---------------------------------- |
| 协议     | HTTP                               |
| 主机地址 | NAS 局域网 IP，不含 `http://`      |
| 端口     | `16800`                            |
| 接口路径 | `jsonrpc`，组成地址后为 `/jsonrpc` |
| RPC 密钥 | `.env` 中 `ARIA2_SECRET` 的原始值  |

密钥不加引号或 `token:` 前缀，前端会处理请求格式。看到已连接状态后，再检查全局速度和任务列表。

**RPC 请求由浏览器发出**。电脑浏览器里的 `127.0.0.1` 指向电脑，Docker 服务名 `aria2` 通常也不能由局域网浏览器解析。更换电脑或浏览器后，可能需要重新保存连接信息。

如果使用 HTTPS 域名打开 AriaNg，RPC 也应提供浏览器允许的安全连接，例如正确配置的 HTTPS / WSS 代理；HTTPS 页面直接调用 HTTP RPC 可能被混合内容策略拦截。

在 **Aria2 设置 → 基本设置** 中，把下载目录设为 `/downloads`，或任务需要的 `/downloads/software` 等子目录。这是容器路径，不填 NAS 原始路径或电脑盘符。先下载一个有权访问的小文件，确认能在 NAS 找到，再增加大任务。

## 添加任务

### 直链、种子与磁力下载

新建任务时粘贴真实 HTTP / HTTPS 文件地址，批量提交按界面要求一行一个链接。分享页面和最终下载地址不同；得到 HTML 或立即失败时先核对链接类型。需登录的文件可能要求 Cookie、Referer 或其他请求头，也可能绑定来源 IP、User-Agent 或短期签名；电脑能下载，NAS 用同一地址未必成功。

磁力链接可以直接粘贴 `magnet:`，种子则打开 `.torrent`，检查文件选择和保存位置。磁力通常先获取元数据，长时间无进展时核对在线节点、DHT / UDP 与 Tracker 状态。Tracker 帮助发现节点，不保存资源本体，增加列表不能救活无人做种的资源。

有可用公网入站条件时，可把路由器的 `32516/TCP` 和 `32516/UDP` 转发到 NAS，并放行防火墙；处于运营商 NAT 后时要另行判断入站条件。只验证直链下载时，不必先完成 BT 端口转发。

### 浏览器扩展发送下载

[Aria2 Explorer][explorer-repo] 可把浏览器下载交给 Aria2，并提供内置 AriaNg。安装入口使用项目 README 中的 Chrome / Edge 官方商店链接。

1. 添加 RPC 服务 `http://NAS_IP:16800/jsonrpc`，填入同一密钥。
2. 先手工发送或右键提交一个小文件，核对 NAS 中的结果。
3. 有需要再开启自动接管，并配置域名、文件类型等过滤条件。

扩展可能需要把下载请求的 Cookie 交给 Aria2。只连接自己信任的服务，包含凭据的配置不要公开分享。

### 通过 AList 下载网盘文件

AList 已能正常浏览和下载文件时，可提供可用地址并把任务交给 Aria2。按 [AList 前端设置文档][alist-settings]：

1. 在文件列表右下角设置中填写 Aria2 RPC 链接 `http://NAS_IP:16800/jsonrpc` 和密钥。
2. 开启复选框，选择文件或文件夹，在下载菜单中选择 **发送到 Aria2**。
3. 回 AriaNg 查看任务，完成后在 NAS 核对文件。

这会把网盘已有文件下载到 Aria2 所在设备。“发送成功”只表示提交成功；实际下载还受地址过期、认证头、出口 IP 和网盘限流影响，先测试单个文件。

AList 后台的[离线下载][alist-offline]是另一条流程：提交外部链接，先下载到临时目录，再转移到选定存储。它需要 AList 读取下载结果，并正确共享临时目录和权限，光填 RPC 不够。这里只配置文件列表的“发送到 Aria2”，网盘挂载与管理继续参考 [AList 设置](/posts/alist-guide/)。

## Aria2 镜像参数与持久化

以下变量属于 `superng6/aria2` 镜像，不是所有镜像的通用字段：

| 参数        | 含义与调整方式                                                     |
| ----------- | ------------------------------------------------------------------ |
| `SECRET`    | RPC 密钥                                                           |
| `CACHE=64M` | 磁盘缓存，结合可用内存与负载调整                                   |
| `UT=true`   | 启动时更新 Tracker 列表                                            |
| `RUT=true`  | 镜像的定时脚本在每天 05:00 更新 Tracker，按容器时区计算            |
| `CTU`       | 可选自定义 Tracker 列表 URL，未填时使用镜像脚本中的来源            |
| `FA=falloc` | 文件预分配方式，还支持 `none`、`trunc`、`prealloc`，按文件系统选择 |
| `SMD=true`  | 保存磁力取得的种子元数据                                           |

`SMD` 保存磁力取得的种子元数据，与自动重命名是两回事；后者由 `/config/setting.conf` 的 `handle-torrent` 等设置控制，例如 `backup-rename`。通过 AriaNg RPC 修改的选项不一定永久保存；需要长期保留的设置，核对由 Compose、`/config/aria2.conf` 还是辅助脚本负责，并在重启后查看实际值。

## 备份与恢复

更新前记录镜像版本或 digest，停止容器，再备份 `compose.yaml`、私有 `.env` 和整个 `config`。下载目录另行备份。

```bash
docker compose stop aria2
# 备份完成后更新
docker compose pull
docker compose up -d
```

仅备份不更新时，用 `docker compose start aria2` 恢复。迁移时保留容器路径 `/downloads`，不要删除未完成文件旁的 `.aria2` 控制文件，它可能关系到续传。重启后核对 RPC、任务列表与一次实际下载。

## 常见问题

### 连接问题

| 现象               | 检查位置                                                       |
| ------------------ | -------------------------------------------------------------- |
| 网页打不开         | Web 端口、容器状态、防火墙和 18080:8080 映射                   |
| 页面正常但未连接   | NAS 地址、16800 到 6800 的映射、防火墙、jsonrpc 路径和原始密钥 |
| HTTPS 页面连接失败 | RPC 是否提供 HTTPS / WSS，是否被混合内容策略拦截               |
| 换浏览器后任务不见 | 当前 RPC 配置是否仍连接同一后端                                |

### 下载与容器问题

| 现象                         | 检查位置                                          |
| ---------------------------- | ------------------------------------------------- |
| 容器退出或反复重启           | 镜像、配置目录权限、启动日志和端口冲突            |
| 无法写入 / 找不到文件        | /downloads 映射、UID / GID、ACL、空间和配额       |
| 磁力卡在获取元数据           | 在线节点、DHT / UDP 与 Tracker 状态               |
| 网盘任务 403                 | 地址过期、认证头、来源 IP 和网盘限制              |
| AList 显示发送成功但下载失败 | Aria2 任务错误、地址时效、认证头和来源 IP         |
| 预分配失败                   | 文件系统是否支持 FA 模式、空间和配额              |
| 重启后选项变化               | Compose 环境变量、aria2.conf 与启动脚本控制的项目 |

## 参考资料

- [Aria2 官方手册][aria2-manual]。
- [AriaNg 项目][ariang-repo]与 [Aria2 Explorer][explorer-repo]。
- [superng6/docker-aria2][docker-aria2-repo]、[Dockerfile][aria2-dockerfile]与[镜像构建流程][aria2-build]。
- [初始化脚本][aria2-init]、[Tracker 定时任务][aria2-cron]与[辅助脚本设置][aria2-settings]。
- AList：[其他设置][alist-settings]与[离线下载][alist-offline]。
- 磕巴白菜：[新绿联部署 Aria2 + AriaNg][keba-guide]。

[keba-guide]: https://hi.keba.host/archives/ugreen-aria2
[aria2-manual]: https://aria2.github.io/manual/en/html/aria2c.html
[docker-aria2-repo]: https://github.com/superng6/docker-aria2
[aria2-dockerfile]: https://github.com/superng6/docker-aria2/blob/master/Dockerfile
[aria2-build]: https://github.com/superng6/docker-aria2/blob/master/.github/workflows/Build%20Image.yml
[aria2-init]: https://github.com/superng6/docker-aria2/blob/master/root/etc/cont-init.d/30-config
[aria2-cron]: https://github.com/superng6/docker-aria2/blob/master/root/aria2/conf/rpc-tracker1
[aria2-settings]: https://github.com/superng6/docker-aria2/blob/master/root/aria2/conf/setting.conf
[ariang-repo]: https://github.com/mayswind/AriaNg
[explorer-repo]: https://github.com/alexhua/Aria2-Explorer
[alist-settings]: https://alistgo.com/zh/config/other.html
[alist-offline]: https://alistgo.com/zh/guide/advanced/offline-download.html
