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
  - ddns-go
  - 远程访问
---

家庭宽带重拨后，公网 IP 可能会变，域名记录也要跟着改。ddns-go 定期获取当前地址并更新 DNS，省去每次手动修改；它只管解析，端口转发、证书和反向代理仍要另外配置。

先确认[远程访问的网络条件](/posts/nas-remote-access/)；还需要管理 HTTPS 入口的话，可以直接用 [Lucky](/posts/lucky-guide/) 的 DDNS，同一条记录交给一个工具更新即可。其他软件收在 [NAS 服务清单](/posts/nas-software-websites/)。

## Docker 部署

需要 Linux Docker Engine 和 Compose V2，安装见 [Docker 官方安装文档](https://docs.docker.com/engine/install/)。在独立项目目录保存 `compose.yaml`：

```yaml
services:
  ddns-go:
    image: jeessy/ddns-go:latest
    restart: unless-stopped
    network_mode: host
    volumes:
      - ./data:/root
```

配置保存在项目下的 `data/`。host 网络直接使用宿主机网络，便于读取 Linux 主机的 IPv6；它不经过 `ports:` 映射，所以管理页面的访问范围要靠路由器和设备防火墙限制。启动前确认 `9876` 只允许可信内网或私有组网访问，别漏掉 IPv6。

在项目目录执行：

```bash
docker compose config --quiet
docker compose up -d
docker compose logs --tail=100 ddns-go
```

从内网打开 `http://NAS_IP:9876`，把 `NAS_IP` 换成设备地址。完成账号初始化，保留“禁止从公网访问”的设置。

## 配置 DNS 服务商

选择域名实际使用的 DNS 托管商，按服务商说明创建 API 凭据，只授予需要修改的域名记录权限。DNS 托管商不一定是购买域名的注册商，选错了会找不到记录。

填入凭据和要更新的域名，再选择地址获取方式：

- **A 记录**：填写家庭宽带的公网 IPv4。查 IP 请求不能走代理，否则可能写入代理服务器的地址。
- **AAAA 记录**：填写实际承接外部连接的设备 IPv6。入口在 NAS 就选 NAS 的可达地址，不能随手填路由器 WAN 地址。

`fe80::/10` 是链路本地地址，`fc00::/7` 是唯一本地地址，两者都不能用作互联网直连入口。IPv6 临时地址还可能轮换，要确认 ddns-go 跟踪的是用于提供服务的地址。

保存后查看更新日志，确认实际写入的记录。没有可用公网 IPv4 时，不要把运营商共享出口地址写进 A 记录当作直连入口。

## 记录生效后检查连接

先看域名解析是否指向预期地址，再用手机关闭 Wi-Fi，从移动网络访问真正需要的服务端口。DNS 缓存受 TTL 影响，更新后可能要等旧记录失效；`ping` 通了，也要再从移动网络访问一次 HTTPS。

如果地址正确但连不上，按连接链路检查：公网 IPv4 的端口映射、IPv6 的入站防火墙、应用监听地址和端口，以及外部网络是否支持 IPv6。完整排错放在[远程访问笔记](/posts/nas-remote-access/#常见问题)，这里只确认 DNS 更新这一步。

A / AAAA 记录只保存地址，不保存端口。服务使用非默认 HTTPS 端口时，浏览器地址仍要写成 `https://photos.example.com:18443` 这样的形式。

## 备份与更新

保留 `compose.yaml` 和整个 `data/`。数据目录中有 DNS API 凭据，备份和截图都不要公开。`latest` 会随发布变化，更新前备份配置，再按原项目重建；重拨宽带或重启设备后，也看一遍地址是否已经跟上。

## 参考资料

- [ddns-go 项目与使用说明](https://github.com/jeessy2/ddns-go)
