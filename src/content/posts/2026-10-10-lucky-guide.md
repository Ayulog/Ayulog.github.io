---
title: Lucky：DDNS、证书与反向代理
description: Lucky 的 Docker 部署，以及公网 IPv4、IPv6 下的 DDNS、HTTPS 证书和 Web 反向代理配置。
author: Ayulog
pubDatetime: "2026-10-10T10:00:00+08:00"
draft: false
setupCategory: nas
setupRole: guide
tags:
  - Debian
  - Docker
  - Lucky
  - DDNS
  - 远程访问
---

Lucky 把 DDNS、证书和反向代理放在一个界面里。有公网入口时，可以用它给照片或媒体服务配一个 HTTPS 地址。没有公网入口时，先看 [NAS 远程访问](/posts/2026-10-09-nas-remote-access/)，DDNS 本身不能打通连接。

下面沿用 Linux Docker Engine 和 Compose V2 的部署方式。还没有 Docker 的话，先看 [Docker 官方安装文档](https://docs.docker.com/engine/install/)。其他工具收在 [NAS 常用软件记录](/posts/2026-10-09-nas-software-websites/)。

## Docker 部署

在自己的应用目录中建一个 Lucky 项目，把下面保存为 `compose.yaml`，也可以[下载同一份配置](/examples/debnas/lucky/compose.yaml)。

```yaml
# Generic Linux host-network example based on the upstream Lucky guide.
services:
  lucky:
    image: gdy666/lucky:v2
    restart: always
    network_mode: host
    volumes:
      - ./config:/app/conf
```

配置保存在项目下的 `config/`。旧教程中的 `/goodluck` 不适用于这里的镜像；迁移前先导出旧配置，按当前路径放好。

本例用 host 网络，直接占用 Linux 宿主机端口，不能靠 Compose 的 `ports:` 限制监听。启动前在路由器和设备防火墙中确认管理端口 `16601` 只允许可信内网或私有组网访问，IPv4 和 IPv6 都要检查。这组网络功能不需要 Docker socket。

在项目目录启动：

```bash
docker compose config --quiet
docker compose up -d
docker compose logs --tail=100 lucky
```

打开 `http://NAS_IP:16601`，将 `NAS_IP` 换成设备的局域网地址。按初始化提示改掉默认账号密码，设置后台安全入口，再配置下面的功能。

## 方案一：公网 IPv4 + DDNS + Lucky 反向代理

以一个照片 Web 服务为例，假设：

- NAS 的固定局域网地址为 `192.168.1.10`，Lucky 也运行在这台 NAS 上。
- 照片应用已经能通过 `http://192.168.1.10:2342` 在内网访问，并已配置登录认证。
- 对外使用自己的域名，本文用 `photos.example.com` 占位。
- 选择 TCP `18443` 作为对外 HTTPS 端口，并确认未被占用、运营商允许入站。

这些地址和端口只是示例，实际填写前换成自己的配置。

```text
外部浏览器 → 家庭公网 IPv4:18443 → 路由器端口映射
           → Lucky HTTPS:18443 → 内网照片服务:2342
```

按下面顺序配置，排错会比较清楚。

1. **固定 NAS 的内网地址。** 在路由器中做 DHCP 地址保留，避免 NAS 重启后端口映射指向旧地址。先确认 Lucky 所在环境能访问照片应用。
2. **配置 DDNS。** 在 Lucky 或 ddns-go 中选择域名的 DNS 托管商，填入具备必要权限的 API 凭据，将 `photos.example.com` 的 A 记录更新为家庭公网 IPv4。DNS 托管商不一定就是购买域名的注册商。
3. **申请证书。** 在 Lucky 的证书模块中，为 `photos.example.com` 配置 ACME 证书。使用 DNS-01 验证时，通过 DNS 记录证明域名控制权，不要求家里开放入站 80 端口；按所选 DNS 服务商配置验证权限，并检查自动续期。
4. **添加 Web 反向代理规则。** 监听 IPv4 TCP `18443`，启用 TLS 并选用上面的证书；前端域名填 `photos.example.com`，后端地址填 `http://192.168.1.10:2342`。
5. **设置端口映射与防火墙。** 在持有公网 IPv4 的路由器上，把外部 TCP `18443` 转发到 `192.168.1.10:18443`，同时允许 NAS 接收该端口的连接。这里开放的是 HTTPS 服务入口，不是 Lucky 管理端口。
6. **从外网验证。** 手机关闭 Wi-Fi，使用移动网络打开 `https://photos.example.com:18443`，检查证书、登录、图片加载和文件上传。

证书对应的是域名，使用 `18443` 这类非默认 HTTPS 端口仍可正常验证证书，但访问时要写出端口。普通浏览器访问 HTTPS 默认使用 `443`，A / AAAA 记录不会替你指定 `18443`。

初次排查可先使用 DNS 服务商的“仅 DNS”解析方式，确认直接连接家庭入口的链路可用。若另外启用 CDN 或代理，需要再核对其端口、协议和使用限制。

后续增加媒体库，可以再配置一个域名和一条反向代理子规则。多个 HTTP(S) 应用可以共用一个入口端口，由反向代理按域名分发；SMB 等协议不能直接套用这种 Web 子规则。

示例中 Lucky 到后端使用 HTTP，仅适合可信内网；如果这段连接跨越不可信网络，也应启用并正确验证后端 HTTPS。某些应用还需要设置外部访问地址、可信代理或 WebSocket 支持，以应用自己的反向代理文档为准。

## 方案二：公网 IPv6 + DDNS + Lucky

只有公网 IPv6 时，也可以让 Lucky 接收 IPv6 请求，再转给只监听内网 IPv4 的 Web 应用：

```text
具备 IPv6 的客户端 → Lucky 所在设备的公网 IPv6:18443
                  → Lucky 反向代理 → 内网 IPv4 照片服务:2342
```

沿用上面的证书和后端配置，主要调整三处：

1. 将域名的 **AAAA 记录**更新为 Lucky 所在设备的可达 IPv6，核实获取到的不是容器内部地址或另一台设备的地址。
2. 在 Lucky Web 规则中启用 IPv6 监听，并选择对应证书。
3. 在路由器 IPv6 防火墙和 NAS 防火墙上，允许发往这台设备 TCP `18443` 的入站连接。

常见的家庭原生 IPv6 网络不需要 IPv4 那样的 NAT 端口映射，但仍然需要精确放行防火墙。不要为了测试把整个 IPv6 防火墙关闭。

这种方式解决的是“外部 IPv6 访问内部 IPv4 服务”，不会让只有 IPv4 的客户端自动获得 IPv6 连接能力。外部网络不支持 IPv6 时，仍需组网或一个能同时连接两侧的中转入口。

如果同一个域名同时配置 A 与 AAAA，要分别验证两条路径。没有可用公网 IPv4，就不要把运营商共享出口地址写入 A 记录当成直连入口。

## 备份与更新

备份 `compose.yaml` 和整个 `config/`，其中包含 DNS 凭据和证书私钥。也可以使用 Lucky 自带的配置导出功能。镜像标签 `v2` 会随上游更新，长期运行时可在验证兼容后固定版本或摘要；更新前先看发布说明，再拉取镜像并按原 Compose 重建。

同一个域名的同类记录只交给一个 DDNS 工具更新。已经在 Lucky 中配置了 DDNS，就不必再让 ddns-go 写同一条 A 或 AAAA 记录。

Lucky 仓库的源码公开到 `1.4.10`，后续版本暂无继续开源计划。当前版本的功能以[官方安装说明](https://lucky666.cn/docs/install)为准；需要尝试 STUN 时，另看[远程访问笔记](/posts/2026-10-09-nas-remote-access/#方案四lucky-stun适合愿意折腾的环境)。

## 参考资料

- [Lucky 安装与升级](https://lucky666.cn/docs/install)
- [动态域名](https://lucky666.cn/docs/modules/ddns)、[Web 服务](https://lucky666.cn/docs/modules/web)、[SSL 证书](https://lucky666.cn/docs/modules/ssl)
- [Lucky GitHub 仓库](https://github.com/gdy666/lucky)
- [Let's Encrypt 验证方式](https://letsencrypt.org/docs/challenge-types/)
