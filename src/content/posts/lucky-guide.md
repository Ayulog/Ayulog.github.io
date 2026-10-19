---
title: Lucky：DDNS、证书与反向代理
description: 有公网 IPv4 或 IPv6 时，用 Lucky 做 DDNS、申请证书并反向代理内网 Web 服务。
author: Ayulog
pubDatetime: "2026-10-10T10:00:00+08:00"
draft: false
category: network
tags:
  - Debian
  - Docker
  - Lucky
---

Lucky 将动态域名（DDNS）、ACME 自动证书与 Web 反向代理整合在同一个单文件服务中。当家庭宽带具备公网 IPv4 或公网 IPv6 时，可以用它为内网的相册、影音或文件服务统一配置 HTTPS 域名入口。

部署前若尚未确认宽带是否具备公网入口，可先参考 [NAS 远程访问：网络条件与方案选择](/posts/nas-remote-access/)；更多容器服务见 [NAS 服务清单](/posts/nas-software-websites/)。

## Docker 部署

以下配置基于 Linux Docker Engine 与 Compose V2（安装方法见 [Docker 官方文档](https://docs.docker.com/engine/install/)）。在应用目录中新建 `lucky` 文件夹，保存 `compose.yaml`（或下载 [Compose 示例](/examples/debnas/lucky/compose.yaml)）：

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

- **数据目录**：`gdy666/lucky:v2` 镜像的容器内配置路径为 `/app/conf`，映射后所有设置与申请到的证书均保存在项目下的 `./config` 目录中。
- **网络与端口安全**：使用 `network_mode: host` 便于 Lucky 直接读取宿主机的公网 IPv6 地址并监听转发端口。启动前请确认路由器与 NAS 防火墙（含 IPv4 与 IPv6）未向公网放行默认管理端口 `16601`，管理后台仅限内网或组网 VPN 访问。

在项目目录校验并启动容器：

```bash
docker compose config --quiet
docker compose up -d
docker compose logs --tail=100 lucky
```

启动后在局域网浏览器访问 `http://NAS_IP:16601`（`NAS_IP` 替换为 NAS 局域网 IP），首次登录后立即修改默认管理员账号与密码，并按需设置后台安全入口（URL 路径前缀）。

## 方案一：公网 IPv4 + DDNS + Lucky 反向代理

以对外发布内网相册服务为例，假设环境参数如下（实际操作时请替换为自己的域名与端口）：

- **NAS 局域网地址**：`NAS_IP`（已在路由器 DHCP 中绑定静态租约），Lucky 与相册服务均运行在该主机上。
- **内网后端地址**：`http://NAS_IP:2342`（已开启登录认证）。
- **外部访问域名与端口**：`photos.example.com`，对外 HTTPS 端口选用 TCP `18443`。

按以下顺序在 Lucky 后台与路由器中完成配置：

1. **配置 DDNS 动态域名**：在 Lucky 的 **动态域名** 模块中添加任务，选择域名所在的 DNS 托管服务商（如 Cloudflare、阿里云、腾讯云 DNSPod），填入对应权限的 API 凭据，将 `photos.example.com` 的 **A 记录** 绑定到家庭宽带的公网 IPv4。
2. **申请 ACME 证书**：在 **SSL 证书** 模块中添加证书，申请方式选择 `ACME`，验证方式选 **DNS-01**（复用上一步的 DNS 服务商 API 凭据）。DNS-01 通过添加 TXT 记录完成域名所有权验证，无需在家庭宽带开放 80 端口，到期前会自动续签。
3. **添加 Web 反向代理规则**：在 **Web 服务** 模块中添加主规则，监听类型勾选 `IPv4`，监听端口填 `18443` 并开启 **TLS**（自动匹配上面申请的证书）。接着在主规则下添加一条**子规则**：
   - **前端地址（域名）**：`photos.example.com`
   - **后端地址**：`http://NAS_IP:2342`
4. **配置路由器端口映射**：在拨号主路由的端口转发（Port Forwarding）设置中，将外部 WAN 口的 TCP `18443` 映射到 `NAS_IP:18443`，并确认 NAS 本机防火墙允许该端口入站。
5. **外网验证**：断开手机 Wi-Fi，使用移动数据网络访问 `https://photos.example.com:18443`，验证 HTTPS 证书有效、页面正常加载且可登录上传。

> [!TIP]
> 后续新增影视库（如 Jellyfin）或其他 Web 服务时，无需再开新端口：只需为新子域名（如 `media.example.com`）添加 DDNS 记录、申请包含该域名的证书（或申请 `*.example.com` 通配符证书），然后在同一个 `18443` Web 主规则下新增一条反向代理子规则即可。部分应用需在其自身后台配置可信反向代理（Trusted Proxies）或开启 WebSocket 支持（Lucky 子规则默认已开启 WebSocket 透传）。

## 方案二：公网 IPv6 + DDNS + Lucky

当家庭宽带没有公网 IPv4、但具备可用的公网 IPv6 时，可以让 Lucky 监听公网 IPv6 端口，再将请求反向代理给仅监听内网 IPv4 的后端容器。

沿用上一节的 ACME 证书与后端地址，仅需调整以下三处：

1. **更新 AAAA 记录**：在 Lucky 的 **动态域名** 模块中启用 IPv6，将 `photos.example.com` 的 **AAAA 记录** 更新为 Lucky 所在宿主机的公网 IPv6 地址（`2000::/3` 范围的全球单播地址）。
2. **启用 IPv6 监听**：在 **Web 服务** 主规则中勾选 `IPv6` 监听，端口仍设为 `18443` 并开启 TLS。
3. **放行 IPv6 入站防火墙**：在路由器 IPv6 防火墙（通信规则）及 NAS 本机防火墙中，精确放行发往该 NAS、目标端口为 TCP `18443` 的入站连接。

通过公网 IPv6 直连时，外部访问设备同样需要具备 IPv6 网络（国内三大运营商的 4G/5G 移动数据网络通常默认支持 IPv6）。若家庭宽带无公网 IPv4，切勿为该域名同时添加指向运营商内网地址的 A 记录，以免双栈客户端优先尝试不通的 IPv4 路径。

## 备份、更新与版本说明

- **配置备份**：日常备份只需保留 `compose.yaml` 与整个 `config/` 目录（也可在 Lucky 网页端的 **设置 → 备份与恢复** 中导出压缩包）。目录内包含 DNS API 密钥与证书私钥，请妥善保存在私有存储中。
- **避免重复配置 DDNS**：同一个域名的同一类记录（A 或 AAAA）只需交由一个工具维护；已在 Lucky 中配置了 DDNS，就无需再用 `ddns-go` 更新同一记录。
- **版本与开源说明**：Lucky 的 GitHub 仓库源码公开至 `1.4.10`，后续 `v2` 版本以预编译镜像和二进制形式发布，具体功能变更以 [官方安装与更新文档](https://lucky666.cn/docs/install) 为准。若需在 NAT1 环境下尝试 STUN 内网穿透，可参考 [NAS 远程访问中的 Lucky STUN 说明](/posts/nas-remote-access/#方案四lucky-stun适合愿意折腾的环境)。

## 参考资料

- [Lucky 官方文档：安装与升级](https://lucky666.cn/docs/install)
- [Lucky 模块说明：动态域名（DDNS）](https://lucky666.cn/docs/modules/ddns)、[Web 服务（反向代理）](https://lucky666.cn/docs/modules/web)、[SSL 证书](https://lucky666.cn/docs/modules/ssl)
- [Lucky GitHub 仓库](https://github.com/gdy666/lucky)
- [Let's Encrypt：验证方式（Challenge Types）](https://letsencrypt.org/docs/challenge-types/)
