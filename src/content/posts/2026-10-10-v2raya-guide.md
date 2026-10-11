---
title: v2rayA：Docker 部署与应用代理设置
description: v2rayA 的 Docker Compose 部署、订阅导入、规则代理端口、应用接入和排错记录。
author: Ayulog
pubDatetime: "2026-10-10T10:00:00+08:00"
draft: false
setupCategory: nas
setupRole: guide
tags:
  - Debian
  - Docker
  - v2rayA
  - 网络
---

v2rayA 自带网页管理界面，导入订阅后就能选节点、调分流，不需要另外装控制面板。这篇使用 `v2.5.10`；偏好直接改 YAML 的话，可以看 [Mihomo](/posts/2026-10-09-mihomo-docker/)。两者的配置格式不同。

需要先有 Linux Docker Engine 和 Compose V2，安装步骤见 [Docker 官方安装文档](https://docs.docker.com/engine/install/)。这里用 bridge 网络，应用主动连接代理端口，透明代理保持关闭；不需要 `privileged: true`、host 网络或宿主机内核模块挂载。

返回 [NAS 常用软件记录](/posts/2026-10-09-nas-software-websites/)。

## 先认清四个端口

下面是 v2rayA 的默认端口，调整过设置时以实际值为准：

| 端口    | 用途             | 请求如何处理                       |
| ------- | ---------------- | ---------------------------------- |
| `2017`  | 网页管理界面     | 创建账号、导入订阅、选择节点和设置 |
| `20170` | SOCKS5 代理      | 全部交给 `proxy` 出站组            |
| `20171` | HTTP 代理        | 全部交给 `proxy` 出站组            |
| `20172` | 按规则 HTTP 代理 | 按所选分流模式决定直连、代理等结果 |

希望 HTTP 请求按规则分流时，用 `20172`；希望请求都交给选定代理组时，用 `20171`。`2017` 只管理服务，不能填进应用的 HTTP 代理地址。这里的“全部”仅指**已送到该代理端口的请求**。

## 准备目录与 Compose

在 NAS 的应用目录下执行：

```bash
mkdir -p v2raya/config
cd v2raya
```

创建 `compose.yaml`：

```yaml
services:
  v2raya:
    image: ghcr.io/v2raya/v2raya:v2.5.10
    restart: unless-stopped
    ports:
      - "NAS_LAN_IP:2017:2017"
      - "NAS_LAN_IP:20170:20170"
      - "NAS_LAN_IP:20171:20171"
      - "NAS_LAN_IP:20172:20172"
    volumes:
      - ./config:/etc/v2raya
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```

将四处 `NAS_LAN_IP` 替换为 **NAS 自身的局域网 IPv4 地址**，例如 `192.168.1.10`；它是端口绑定地址，不能填客户端地址或容器地址。示例将端口绑定到这个地址，后续 NAS 地址变化时也要同步修改。`./config` 持久化账号、订阅与设置，图形化 Compose 管理器中需确认项目目录，或改成 NAS 上真实的绝对路径。

此处固定 `v2.5.10` 便于复现，镜像来自项目官方 GHCR；原文使用的 Docker Hub 仓库 `mzz2017/v2raya` 也是项目提供的镜像来源。先确保 NAS 能拉取所选仓库的镜像，再启动代理。

检查并启动；前一步成功才继续：

```bash
docker compose config --quiet && docker compose pull && docker compose up -d
docker compose ps
docker compose logs --tail=100 v2raya
```

端口已占用时，修改映射中间的宿主端口，例如将 `NAS_LAN_IP:2017:2017` 改为 `NAS_LAN_IP:12017:2017`，然后用 `12017` 打开网页。若在 v2rayA 内改了实际监听端口，则还要同步最右侧的容器端口。

## 首次设置与端口分享

浏览器打开 `http://NAS_IP:2017`，按新版界面完成以下操作；这里的 `NAS_IP` 就是刚才绑定的局域网地址：

1. 首次访问时创建管理账号与密码。
2. 在 **代理 → 导入** 中选择订阅地址或节点链接，导入服务商提供的兼容格式；完整 Clash / Mihomo YAML 不应直接当作 v2rayA 配置导入。
3. 将需要使用的节点加入 `proxy` 组，检查节点选择，再到仪表板启动服务。测速结果只能作参考，后面仍要测试实际请求。
4. 在 **设置 → 代理** 中启用 **允许局域网的连接**，旧教程通常称为“端口分享”，保存并应用。未开启时代理入站只监听容器回环地址，即使发布端口，其他设备也无法正常连接。
5. 需要使用 `20172` 时，在 **设置 → 流量分流** 中选择规则端口的分流模式，保存并应用，再核对具体规则。该设置不会让 `20171` 自动变成规则代理。
6. 保持透明代理关闭。本例没有配置宿主机的路由、设备与防火墙，不适合直接套用透明代理步骤。

默认的 HTTP / SOCKS 代理端口没有密码，**网页管理密码不等于代理认证**。以上端口只提供给可信局域网设备，不要在路由器上转发到公网；如果需要代理认证，应按官方入站说明添加带认证的自定义入站，并关闭不用的无密码端口，再同步 Compose 映射。

## 让应用连接并验证

应用支持 HTTP 代理时，可以按目标选择下面的地址：

```text
按规则分流：http://NAS_IP:20172
全部交给代理组：http://NAS_IP:20171
SOCKS5：NAS_IP:20170
```

应用如果将协议、地址和端口分成三个字段，就分别填写。支持标准代理环境变量的容器可以在它自己的服务定义中加入：

```yaml
environment:
  HTTP_PROXY: "http://NAS_IP:20172"
  HTTPS_PROXY: "http://NAS_IP:20172"
  NO_PROXY: "localhost,127.0.0.1,::1"
```

将 `NAS_IP` 替换为应用容器可访问的 NAS 地址；有些应用只认小写变量，有些需要在自己的设置页配置。`HTTPS_PROXY` 中使用 `http://` 是 HTTP 代理的连接方式，访问 HTTPS 目标时仍通过 CONNECT 建立隧道。需要绕过代理访问的内网主机，可按应用支持的语法补到 `NO_PROXY`。

应用容器的 `127.0.0.1` 指它自己。若希望用 `v2raya:20172` 这样的服务名访问，应用与 v2rayA 必须加入同一个用户自定义 Docker 网络；不同 Compose 项目不会自动共享网络。

在局域网电脑上分别验证规则 HTTP 端口与 SOCKS5 端口：

```bash
curl --proxy http://NAS_IP:20172 --head https://example.com
curl --proxy socks5h://NAS_IP:20170 --head https://example.com
```

Windows PowerShell 将 `curl` 换成 `curl.exe`。检查目标网站的最终响应，并结合 v2rayA 的日志核对连接；HTTP CONNECT 的成功响应不能单独证明目标请求成功。规则端口可能按规则直连，SOCKS5 端口则交给 `proxy` 组；本例只发布 TCP 端口，不把这些测试当作 UDP 已可用的证明。

给 MoviePilot 等应用设置代理，只影响该应用实际交给代理的请求。下载器是否使用代理还要看下载器自身的设置，不能仅凭部署了 v2rayA 就判断 PT、BT 或所有下载流量的出口。

## Docker 拉取镜像、排错与备份

绿联等 NAS 如果在 Docker 设置中提供“HTTP 代理”，可以按系统版本填写 `http://NAS_IP:20171` 或规则端口 `20172`；这是 **Docker 拉取镜像的代理**，与给业务容器设置 `HTTP_PROXY` 分开配置。Linux Docker Engine 的具体设置仍以 [Docker daemon 代理文档](https://docs.docker.com/engine/daemon/proxy/)为准。代理容器必须先能正常启动，避免用尚未启动的 v2rayA 下载自身镜像。

- **网页打不开**：检查容器日志、`2017` 的宿主映射，以及绑定的地址是否确实属于 NAS。
- **网页正常，应用连不上代理**：先看是否开启“允许局域网的连接”，再核对端口映射、NAS 防火墙和应用填写的地址。
- **能连接端口，但请求失败**：确认服务已启动、`proxy` 组已有可用节点，再查看订阅、DNS、分流和连接错误；必要时对比 `20171` 与 `20172`。
- **订阅导入失败**：检查订阅格式、链接有效期和 NAS 到订阅服务器的连通性，不要仅靠换代理端口排查。

备份时保留 `compose.yaml` 和整个 `config/`，其中包含账号及订阅信息，应保存在私有位置。需要复制运行中的配置数据库时，先在当前项目目录执行 `docker compose stop v2raya`，完成备份后执行 `docker compose start v2raya`。升级前查看发布说明、备份配置，再修改镜像版本并执行 `docker compose pull && docker compose up -d`，随后复查网页、订阅和实际代理请求。

## 参考资料

- Keba：[《mzz2017/v2raya》](https://hi.keba.host/archives/v2raya)：v2rayA 的 NAS 部署、端口分享与应用代理参考，核对日期为 2026 年 10 月 10 日。
- [v2rayA Docker 部署说明](https://github.com/v2rayA/v2rayA/blob/v2.5.10/README.md#install)与[v2.5.10 发布记录](https://github.com/v2rayA/v2rayA/releases/tag/v2.5.10)：官方镜像、bridge 部署与版本变化。
- v2rayA v2.5.10 的[快速开始](https://github.com/v2rayA/v2rayA/blob/v2.5.10/gui/src/docs/zh/quick-start.md)、[入站说明](https://github.com/v2rayA/v2rayA/blob/v2.5.10/gui/src/docs/zh/inbounds.md)与[分流说明](https://github.com/v2rayA/v2rayA/blob/v2.5.10/gui/src/docs/zh/routing.md)：订阅与节点、默认端口、局域网访问、认证和规则代理。
