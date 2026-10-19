---
title: v2rayA：Docker 部署与应用代理设置
description: 用 Docker 部署 v2rayA，导入订阅、选好分流端口，再让局域网应用连上代理并验证请求。
author: Ayulog
pubDatetime: "2026-10-10T10:00:00+08:00"
draft: false
category: network
tags:
  - Debian
  - Docker
---

v2rayA 内置了图形化的 Web 管理界面，导入节点订阅后即可在网页端完成测速、选节点与分流设置，无需单独部署前端面板。本文基于 `v2.5.10` 版本与 Docker bridge 网络模式，介绍在 NAS 上部署显式代理并供局域网应用接入的步骤。

若更倾向于通过 YAML 配置文件管理规则组，可参考 [Mihomo 部署指南](/posts/mihomo-docker/)；更多 NAS 容器方案见 [NAS 服务清单](/posts/nas-software-websites/)。

## 默认端口与作用

v2rayA 默认提供 1 个 Web 管理端口和 3 个不同策略的代理端口：

| 端口    | 协议与用途         | 分流行为                                         |
| ------- | ------------------ | ------------------------------------------------ |
| `2017`  | Web 管理后台       | 浏览器登录管理界面，导入订阅、选择节点与修改设置 |
| `20170` | SOCKS5 代理        | 将进入该端口的请求全部交由所选 `proxy` 节点处理  |
| `20171` | HTTP 代理          | 将进入该端口的请求全部交由所选 `proxy` 节点处理  |
| `20172` | 规则分流 HTTP 代理 | 按“流量分流”中设置的规则决定直连或走代理         |

客户端需要按规则自动分流时连接 `20172` 端口；希望所有代理请求固定走节点时连接 `20171`（HTTP）或 `20170`（SOCKS5）。

## Docker 部署

部署环境需预先安装 Linux Docker Engine 与 Compose V2（见 [Docker 官方安装文档](https://docs.docker.com/engine/install/)）。在 NAS 的应用目录下创建配置目录与 `compose.yaml`：

```bash
mkdir -p v2raya/config
cd v2raya
```

`compose.yaml` 内容如下：

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

启动前需注意：

- 将四处 `NAS_LAN_IP` 替换为 **NAS 自身的局域网 IPv4 地址**（如 `192.168.1.10`），使管理页与无密码代理端口仅绑定在局域网接口上。
- `./config` 用于持久化保存管理员账号、订阅列表与分流规则；在图形化管理器中部署时可改为 NAS 上的真实绝对路径。
- 示例使用官方 GHCR 镜像 `ghcr.io/v2raya/v2raya:v2.5.10`（也可使用官方 Docker Hub 镜像 `mzz2017/v2raya:v2.5.10`）。

校验配置并启动容器：

```bash
docker compose config --quiet && docker compose pull && docker compose up -d
docker compose ps
docker compose logs --tail=100 v2raya
```

若宿主机默认端口冲突，修改映射中间的宿主机端口即可（例如将 `NAS_LAN_IP:2017:2017` 改为 `NAS_LAN_IP:12017:2017`）。

## 面板初始化与订阅分流配置

在浏览器访问 `http://NAS_IP:2017`（`NAS_IP` 为刚才绑定的局域网 IP），按以下步骤完成初始化：

1. **创建管理员账号**：首次访问时设置管理后台的用户名与密码。
2. **导入订阅**：点击 **导入**，填入节点链接或 v2rayA 支持的订阅地址（如标准节点 URI 列表或 Base64 订阅）。
3. **选择节点并启动服务**：切换到订阅标签页，勾选需要的节点加入 `proxy` 组，点击左上角 **就绪** 按钮启动核心服务。
4. **开启局域网连接（端口分享）**：打开右上角 **设置**，将 **允许局域网的连接（Port Sharing）** 设为开启并保存。未开启时代理端口仅监听容器内部 `127.0.0.1`，外部设备与容器无法连入。
5. **配置 `20172` 分流规则**：在 **设置 → 流量分流** 中选择规则端口的分流方式（如 `RoutingA` 或大陆白名单模式），保存并应用。**透明代理 / 系统代理** 保持关闭。

> [!IMPORTANT]
> 管理后台的登录密码仅保护 `2017` 网页，默认的 `20170`–`20172` 代理端口本身未开启认证。请仅在可信局域网内开放这些端口，切勿在路由器上将其转发到公网；若需配置代理账号密码，可按 [官方入站文档](https://github.com/v2rayA/v2rayA/blob/v2.5.10/gui/src/docs/zh/inbounds.md) 添加带认证的自定义入站端口。

## 客户端接入与代理验证

### 1. 应用与容器代理配置

根据分流需求，在客户端或应用的代理设置中填入对应地址：

- **按规则分流（HTTP）**：`http://NAS_IP:20172`
- **全局走代理组（HTTP）**：`http://NAS_IP:20171`
- **SOCKS5 代理**：`NAS_IP:20170`

对于支持标准代理环境变量的其他 Docker 容器（如 MoviePilot 等工具），可在其 `compose.yaml` 中添加环境变量：

```yaml
environment:
  HTTP_PROXY: "http://NAS_IP:20172"
  HTTPS_PROXY: "http://NAS_IP:20172"
  NO_PROXY: "localhost,127.0.0.1,::1,192.168.0.0/16,10.0.0.0/8"
```

注意：其他容器内的 `127.0.0.1` 指向该容器自身，因此代理地址应填写宿主机局域网 IP `NAS_IP`（或将两个容器加入同一自定义 Docker 网络后使用 `v2raya:20172`）。为 MoviePilot 设置代理仅作用于其自身的刮削与站点请求，下载器若需走代理需在下载器内单独设置。

### 2. 连通性验证

在局域网电脑终端执行以下命令，分别测试规则 HTTP 端口与 SOCKS5 端口（Windows PowerShell 请使用 `curl.exe`）：

```bash
curl --proxy http://NAS_IP:20172 --head https://example.com
curl --proxy socks5h://NAS_IP:20170 --head https://example.com
```

命令返回目标站点的 HTTP 响应头，且在 v2rayA 日志中能看到对应的连接记录，即表示代理链路正常工作。

## 镜像拉取代理与常见问题

### Docker 镜像拉取代理

NAS 系统（如绿联、群晖等）若在 Docker 管理器设置中提供“镜像拉取代理 / HTTP 代理”选项，可在 v2rayA 启动并验证可用后，填入 `http://NAS_IP:20171` 或 `http://NAS_IP:20172`。原生 Linux Docker Engine 的守护进程代理配置可参考 [Docker Daemon 代理文档](https://docs.docker.com/engine/daemon/proxy/)。

### 常见故障与日常维护

- **Web 管理页无法打开**：检查 `docker compose ps` 状态、容器日志，以及 `compose.yaml` 中绑定的 `NAS_LAN_IP` 是否与当前 NAS 局域网 IP 一致。
- **管理页正常，但客户端连不上代理端口**：确认已在 v2rayA **设置** 中开启“允许局域网的连接”，并检查 NAS 防火墙是否放行了 `20170`–`20172` 端口。
- **代理端口可连接，但网页打不开**：确认左上角服务状态已处于运行中（蓝色“正在运行”）、`proxy` 组内已选中有效节点，并排查节点连通性与容器 DNS。

日常备份时保存 `compose.yaml` 与 `config/` 目录（为避免数据库文件写入冲突，可先执行 `docker compose stop v2raya`，复制完成后再 `docker compose start v2raya`）。

## 参考资料

- Keba：[《mzz2017/v2raya》](https://hi.keba.host/archives/v2raya)：NAS 部署、端口分享与应用代理配置参考。
- [v2rayA Docker 部署说明](https://github.com/v2rayA/v2rayA/blob/v2.5.10/README.md#install)与 [v2.5.10 发布记录](https://github.com/v2rayA/v2rayA/releases/tag/v2.5.10)。
- v2rayA 官方文档：[快速开始](https://github.com/v2rayA/v2rayA/blob/v2.5.10/gui/src/docs/zh/quick-start.md)、[入站与端口说明](https://github.com/v2rayA/v2rayA/blob/v2.5.10/gui/src/docs/zh/inbounds.md)、[流量分流说明](https://github.com/v2rayA/v2rayA/blob/v2.5.10/gui/src/docs/zh/routing.md)。
