---
title: Aria2 与 AriaNg：Docker 部署与下载设置
description: Docker 部署 Aria2 与 AriaNg，接通 RPC 与下载目录，从网页、扩展或 AList 投递任务。
author: Ayulog
pubDatetime: "2026-10-10T14:15:00+08:00"
draft: false
category: nas
tags:
  - Docker
  - 下载器
  - AList
---

Aria2 适合在 NAS 后台常驻运行，统一接管 HTTP(S)、FTP、SFTP、BitTorrent 与 Metalink 下载任务；前端配合内置的 AriaNg 网页界面，通过 RPC 接口随时查看进度、投递链接或接入 [AList](/posts/alist-guide/) 下载网盘文件。

<span id="选择镜像并部署"></span>

## 目录准备与 Docker 部署

部署前先在 NAS 上为 Aria2 创建独立的项目目录（含 `config` 子目录）以及实际存放文件的下载目录。通过 SSH 执行 `id nasuser`（替换为实际写入账户）查询账户的 `UID` 与 `GID`，并在 NAS 权限设置中为该账户授予配置目录和下载目录的读写权限。

本文使用 [superng6/docker-aria2][docker-aria2-repo] 的标准镜像 `superng6/aria2:latest`，该镜像已内置 AriaNg 前端，通过环境变量 `WEBUI=true` 即可开启（若需额外的 Peer 屏蔽功能，可改用 `a2b-latest` 标签）。

在项目目录中创建 `.env` 文件，填入查到的 `UID`、`GID` 以及随机生成的 RPC 密钥（可通过密码管理器或 `openssl rand -hex 32` 生成）：

```dotenv
# 填入实际写入账户的 UID / GID
ARIA2_UID=
ARIA2_GID=
# 填入随机生成的 RPC 密钥
ARIA2_SECRET=
```

在同目录保存 `compose.yaml`，将 `/path/to/downloads` 替换为 NAS 上的真实下载目录路径：

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

创建配置子目录并启动服务：

```bash
mkdir -p config
docker compose config --quiet
docker compose pull
docker compose up -d
docker compose ps
docker compose logs --tail=100 aria2
```

端口映射中，AriaNg 网页入口为 `http://NAS_IP:18080`，RPC 接口为 `http://NAS_IP:16800/jsonrpc`；宿主机端口冲突时可修改冒号左侧的端口号。WebUI 与 RPC 端口仅在局域网或私有组网内访问即可；若需提升 BT 下载的连通性，可在路由器和防火墙上转发 BT 监听端口（`32516/TCP` 与 `32516/UDP`，修改时需同步调整 `BTPORT` 与端口映射）。

### 镜像环境变量与持久化配置

`superng6/aria2` 镜像支持以下常用环境变量：

| 参数        | 含义与调整方式                                             |
| ----------- | ---------------------------------------------------------- |
| `SECRET`    | RPC 通信密钥                                               |
| `CACHE=64M` | 磁盘缓存大小，可根据 NAS 可用内存与磁盘负载调整            |
| `UT=true`   | 容器启动时自动更新 BT Tracker 列表                         |
| `RUT=true`  | 启用内置定时脚本，每天 05:00（按容器时区）自动更新 Tracker |
| `CTU`       | 自定义 Tracker 列表订阅 URL，留空则使用镜像内置源          |
| `FA=falloc` | 文件预分配方式，可选 `none`、`trunc`、`prealloc`、`falloc` |
| `SMD=true`  | 保留磁力链接解析出的 `.torrent` 元数据文件                 |

其中 `SMD=true` 负责保存种子元数据文件，种子文件的重命名策略则由 `/config/setting.conf` 中的 `handle-torrent`（如 `backup-rename`）控制。由于在 AriaNg 网页端直接修改的运行参数在容器重启后会被配置文件覆盖，需要长期生效的设置应直接写入 `compose.yaml` 或 `/config/aria2.conf`。

<span id="连接-ariang-与-aria2"></span>

## WebUI 核心设置与任务投递

<span id="连接-rpc"></span>

### 连接 AriaNg 与 RPC

浏览器打开 `http://NAS_IP:18080`，进入 **AriaNg 设置 → RPC** 填写连接参数：

| 字段     | 填写内容                           |
| -------- | ---------------------------------- |
| 协议     | HTTP                               |
| 主机地址 | NAS 局域网 IP（不含 `http://`）    |
| 端口     | `16800`                            |
| 接口路径 | `jsonrpc`（完整路径为 `/jsonrpc`） |
| RPC 密钥 | `.env` 中 `ARIA2_SECRET` 的原始值  |

由于 AriaNg 运行在当前浏览器中，RPC 请求由浏览器直接发往 NAS，因此主机地址需填写浏览器可访问的 NAS 局域网 IP；更换电脑或浏览器后需重新填入这套连接信息。若通过 HTTPS 域名访问 AriaNg，则 RPC 接口也需配置对应的 HTTPS / WSS 反向代理，以避免被浏览器的混合内容策略拦截。

状态显示“已连接”后，进入 **Aria2 设置 → 基本设置**，确认默认下载目录为容器内路径 `/downloads`（或 `/downloads/software` 等子目录），并先测试下载一个小文件验证写入正常。

<span id="直链种子与磁力下载"></span>

### 直链、种子与磁力下载

在 AriaNg 新建任务时，可直接粘贴真实的文件直链（一行一个链接）、`magnet:` 磁力链接，或上传 `.torrent` 种子文件。

- **直链任务**：需填入最终文件下载地址。需要登录态或防盗链校验的直链往往绑定 Cookie、Referer、User-Agent 或短期签名，建议配合下方的浏览器扩展直接把携带请求头的下载任务发往 Aria2。
- **BT 与磁力任务**：磁力链接会先通过 DHT 与 Tracker 获取种子元数据。若长时间停留在元数据获取阶段，可检查 UDP 端口连通性、DHT 状态以及资源本身是否有在线做种节点。

<span id="浏览器扩展发送下载"></span>

### 浏览器扩展接管下载

在电脑浏览器安装 [Aria2 Explorer][explorer-repo]（从项目 README 提供的 Chrome / Edge 官方商店链接安装），可将浏览器触发的下载任务直接连同所需请求头发送给 NAS 上的 Aria2：

1. 在扩展设置中添加 RPC 地址 `http://NAS_IP:16800/jsonrpc` 并填入 RPC 密钥。
2. 先通过右键菜单手动投递一个小文件，确认 NAS 下载目录正常落盘。
3. 按需开启自动接管，并设置触发接管的域名、文件大小或扩展名过滤规则。

<span id="通过-alist-下载网盘文件"></span>

### 配合 AList 下载网盘文件

当 [AList](/posts/alist-guide/) 已挂载网盘并能正常浏览文件时，可将网盘文件直接推送给 Aria2 下载到 NAS 本地（参照 [AList 前端设置文档][alist-settings]）：

1. 点击 AList 文件列表右下角的设置图标，填入 Aria2 RPC 地址 `http://NAS_IP:16800/jsonrpc` 与密钥。
2. 勾选需要下载的文件或文件夹，在下载菜单中选择 **发送到 Aria2**。
3. 在 AriaNg 中查看下载进度，完成后到 NAS 下载目录核对文件。

该方式用于将网盘已有文件拉取到 NAS 本地。若需使用 AList 后台的[离线下载][alist-offline]功能（先由 Aria2 下载外部链接，再由 AList 自动上传至目标网盘），则还需让 AList 与 Aria2 容器挂载并共享同一个临时下载目录。

<span id="aria2-镜像参数与持久化"></span>

## 常见问题与维护

### 备份、更新与迁移

更新或迁移前，先记录当前镜像版本，停止容器后备份 `compose.yaml`、`.env` 以及 `./config` 目录：

```bash
docker compose stop aria2
# 完成备份后拉取新镜像并重建
docker compose pull
docker compose up -d
```

迁移下载目录时，保持容器内挂载路径 `/downloads` 一致，并保留未完成任务旁同名的 `.aria2` 控制文件，以便重启后正常读取断点续传进度。

### 故障排查

| 现象                      | 检查位置                                                         |
| ------------------------- | ---------------------------------------------------------------- |
| AriaNg 网页打不开         | 容器运行状态、宿主机防火墙及 `18080:8080` 端口映射               |
| 页面能打开但提示未连接    | NAS 局域网 IP、`16800:6800` 端口映射、`/jsonrpc` 路径与密钥      |
| HTTPS 页面下 RPC 连接失败 | RPC 是否配置了 HTTPS / WSS 代理，排查浏览器混合内容拦截          |
| 更换浏览器后看不到任务    | 浏览器本地 RPC 配置是否已填入并连接到同一个 Aria2 后端           |
| 无法写入或找不到下载文件  | `/downloads` 映射路径、`PUID` / `PGID` 读写权限与磁盘空间        |
| 磁力链接卡在获取元数据    | 资源是否有活跃节点、UDP 端口转发、DHT 与 Tracker 状态            |
| 网盘或直链任务返回 `403`  | 下载链接是否过期、是否缺失 Cookie / Referer 或受出口 IP 限制     |
| 文件预分配失败            | 宿主机文件系统是否支持当前 `FA` 预分配模式（可改用 `none` 测试） |
| 容器重启后自定义设置失效  | 参数是否写进了 `compose.yaml` 或 `/config/aria2.conf`            |

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
