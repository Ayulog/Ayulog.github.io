---
title: ddns-go：自动更新域名的 IP 地址
description: 宽带重拨后公网地址会变，用 ddns-go 获取当前地址并更新 A / AAAA 记录。
author: Ayulog
pubDatetime: "2026-10-10T10:00:00+08:00"
draft: false
category: network
tags:
  - Debian
  - Docker
  - DDNS
---

ddns-go 是轻量的动态域名解析工具，可定时检测本机的公网 IPv4 或 IPv6 地址变化，并自动同步到 DNS 服务商的 A / AAAA 记录。如果 NAS 已经配置好了证书与端口转发，只需补充自动更新域名解析，可以直接部署 ddns-go。

若还需要统一管理 ACME 证书与 HTTPS 反向代理，可直接使用 [Lucky](/posts/lucky-guide/) 内置的 DDNS 模块（同一条域名记录交由一个工具维护即可）。公网 IPv4 / IPv6 的判断方法见 [NAS 远程访问](/posts/nas-remote-access/)；更多容器服务见 [NAS 服务清单](/posts/nas-software-websites/)。

## Docker 部署

基于 Linux Docker Engine 与 Compose V2（安装方法见 [Docker 官方文档](https://docs.docker.com/engine/install/)），在应用目录下新建 `ddns-go` 文件夹并保存 `compose.yaml`：

```yaml
services:
  ddns-go:
    image: jeessy/ddns-go:latest
    restart: unless-stopped
    network_mode: host
    volumes:
      - ./data:/root
```

- **网络模式**：使用 `network_mode: host` 让容器直接读取 Linux 宿主机的网卡公网 IPv6 地址。
- **管理端口与安全**：ddns-go 默认监听 `9876` 端口。启动前请确认路由器与宿主机防火墙（含 IPv4 与 IPv6）未向公网开放 `9876` 端口，仅允许局域网或组网 VPN 访问。

在项目目录校验并启动容器：

```bash
docker compose config --quiet
docker compose up -d
docker compose logs --tail=100 ddns-go
```

启动后在局域网浏览器打开 `http://NAS_IP:9876`（`NAS_IP` 为宿主机局域网 IP），首次登录时设置管理员账号与密码，并保持“禁止从公网访问”处于勾选状态。

## 配置 DNS 服务商与地址获取

在网页端选择域名当前所在的 DNS 解析服务商（如 Cloudflare、阿里云、腾讯云 DNSPod），按服务商文档创建仅包含 DNS 记录读写权限的 API 凭据并填入，随后按实际公网条件启用 IPv4 或 IPv6：

- **IPv4（A 记录）**：当家庭宽带具备公网 IPv4 时启用。若通过接口获取公网 IP，需确保获取请求走宽带直连出口（未经过代理容器或透明代理），以免误将代理节点 IP 写入 A 记录。
- **IPv6（AAAA 记录）**：当使用公网 IPv6 直连时启用，建议选择“通过网卡获取”，并指定宿主机实际连接局域网的物理网卡，使 AAAA 记录绑定到本机的 `2000::/3` 全球单播地址（忽略 `fe80::/10` 链路本地地址与 `fc00::/7` 唯一本地地址）。

填写需要更新的完整域名（如 `nas.example.com`），点击保存后查看右上角日志，确认提示已成功写入或更新 DNS 记录。

## 解析验证与日常维护

### 验证外部访问

1. 在终端使用 `nslookup` 或 `dig` 查询域名，确认返回的 A / AAAA 记录与当前公网地址一致（首次修改或重拨后受 DNS TTL 缓存影响，可能需要等待数分钟生效）。
2. 断开手机 Wi-Fi，使用移动数据网络访问实际对外提供的服务地址（若使用非标准 HTTPS 端口，地址中需带上端口号，如 `https://photos.example.com:18443`）。
3. 若域名解析地址正确但外部仍无法连接，可按路由器端口映射（IPv4）、入站防火墙放行规则（IPv6）及后端服务监听状态依次排查，详见 [NAS 远程访问常见问题](/posts/nas-remote-access/#常见问题)。

### 备份与升级

日常备份只需保存 `compose.yaml` 与 `./data` 目录（内含隐藏配置文件 `.ddns_go_config.yaml` 及 DNS API 密钥，切勿公开分享）。升级容器时，在项目目录下执行 `docker compose pull && docker compose up -d` 即可。

## 参考资料

- [ddns-go GitHub 仓库与使用说明](https://github.com/jeessy2/ddns-go)
