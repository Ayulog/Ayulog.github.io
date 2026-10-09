---
title: DebNAS 安装及折腾记录
description: 以 Debian 与 DebNAS 为基础，整理系统安装、通用目录规划、Docker Compose 示例、云盘挂载、备份恢复与故障排查方法。
author: Ayulog
pubDatetime: "2026-10-09T19:00:00+08:00"
draft: false
tags:
  - Debian
  - DebNAS
  - NAS
  - Docker
  - 运维
---

前面在 [NAS 常用软件及网站记录](/posts/2026-10-09-nas-software-websites/) 里收集了不少工具，这篇把系统这一层补上：从安装 Debian、运行 DebNAS 开始，再逐步加入磁盘共享、容器、云盘挂载与备份。

选 Debian 做 NAS，可以按用途安排存储、应用和维护方式。[DebNAS](https://kekylin.github.io/debnas-docs/) 将不少基础操作整理成了交互脚本，适合作为搭建环境的入口。

本文采用**通用示例**：服务端口优先沿用官方安装示例，应用数据使用相对目录、Docker 命名卷或 `/path/to/...` 占位路径。它们不表示某台机器已经部署的状态，也不是 DebNAS 统一规定的目录结构。安装入口和配套服务文档按 **2026 年 10 月 9 日**核对，具体支持范围仍以各项目当前文档为准。

## 目录

- [准备基础环境](#准备基础环境)
- [先安装 Debian](#先安装-debian)
- [运行 DebNAS 初始化环境](#运行-debnas-初始化环境)
- [磁盘、目录与共享](#磁盘目录与共享)
- [Docker 与应用管理](#docker-与应用管理)
- [配套 Compose：管理、照片与网络](#配套-compose管理照片与网络)
- [CloudDrive2 挂载踩坑](#clouddrive2-挂载踩坑)
- [把日常维护做成固定流程](#把日常维护做成固定流程)
- [两级备份与恢复](#两级备份与恢复)
- [运行几天后整机失联](#运行几天后整机失联)
- [硬件 watchdog 与故障取证](#硬件-watchdog-与故障取证)
- [脚本部署时踩过的坑](#脚本部署时踩过的坑)
- [装完后的验收与后续记录](#装完后的验收与后续记录)
- [参考资料](#参考资料)

## 准备基础环境

先按用途分清几类数据，硬件型号和容量由实际需求决定：

| 内容             | 规划重点                             |
| ---------------- | ------------------------------------ |
| 系统与软件       | 安装介质、系统盘、远程登录和更新方式 |
| 应用配置与数据库 | 持久化目录、权限和一致性备份         |
| 下载、媒体与照片 | 容量、共享、容器路径和原件备份       |
| 云盘挂载         | 本地缓存、挂载恢复以及上传完成的确认 |
| 备份             | 独立存放位置、版本保留和恢复演练     |

先让 SSH、磁盘和共享稳定，再逐个加入容器、远程访问和自动化维护。不要把所有组件一次装完后才开始核对数据去了哪里。

## 先安装 Debian

### 准备系统与安装介质

DebNAS 文档当前支持 **Debian 12 / 13 的 amd64 环境**；其它发行版或架构应先核对支持范围。

基础系统参考 [DebNAS 的 Debian 最小化安装教程](https://kekylin.github.io/debnas-docs/guide/debian-minimal-installation/) 和 [Debian 13 amd64 安装指南](https://www.debian.org/releases/trixie/amd64/)。从 Debian 官方获取安装镜像并核对校验信息，使用 Rufus 或 Etcher 制作启动盘。

安装前区分系统盘和数据盘。“使用整个磁盘”会重新分区，应核对容量与型号；有数据的硬盘可以先断开，装好后再接回。不要把教程截图中的设备编号当成自己的目标盘。

### 安装过程中记住几件事

1. 设置主机名与账户，公开示例用 `nasuser` 表示日常使用的普通账户。
2. 分区时选实际系统盘；已有数据分区后续按原文件系统挂载，不需要重新格式化。
3. 无桌面 NAS 可以选择 SSH server 和 standard system utilities，桌面环境按用途决定。
4. 完成安装后移除安装介质，重启，并在本地控制台确认网络地址。

DebNAS 的 DVD 安装教程与 netinst 镜像的联网取包条件不同，不必逐项照搬。软件源中的系统代号也必须与安装版本对应，例如 Debian 13 为 `trixie`，Debian 12 为 `bookworm`。

### 先把远程登录跑通

在 NAS 上检查系统与网络：

```bash
cat /etc/os-release
dpkg --print-architecture
ip -br addr
ip route
systemctl status ssh --no-pager
```

确认系统与架构符合要求，能够看到实际 LAN 地址和默认路由。从电脑连接：

```bash
ssh nasuser@NAS_IP
```

`NAS_IP` 与账户名均需替换。需要管理员权限时按系统配置使用 `sudo` 或 `su -`。在路由器里为 NAS 设置 DHCP 地址保留，有助于稳定管理入口；网络调整时保留本地控制台入口。

## 运行 DebNAS 初始化环境

以 [DebNAS 快速开始](https://kekylin.github.io/debnas-docs/guide/getting-started/) 为准。以下是 NAS 的 Bash 命令示例。

切换到 root，缺少下载工具时再安装：

```bash
su -
command -v wget
apt update
apt install wget ca-certificates
```

文档中的 GitHub 入口为：

```bash
bash <(wget -qO- https://raw.githubusercontent.com/kekylin/debnas/main/install.sh) -s github@main
```

需要 Gitee 入口时，选择下面这一条：

```bash
bash <(wget -qO- https://gitee.com/kekylin/debnas/raw/main/install.sh) -s gitee@main
```

两条入口选择一个即可。它们会下载并运行项目代码，运行前可阅读 [安装脚本源码](https://github.com/kekylin/debnas/blob/main/install.sh)，了解将修改的内容；`main` 是持续更新的分支。

进入菜单后按需要完成初始化。一键配置可能调整网络管理方式；**切换到 NetworkManager 后，IP 可能变化**。SSH 断开时先到路由器或本地控制台确认地址。

后续重新进入菜单仍以文档入口为准，不应假定存在永久的 `debnas` 命令，也不必为打开菜单重做整套初始化。旧教程里的软件源、扩展和镜像加速地址需要按当前系统重新核对。

若安装对应组件，常见管理入口为：

```text
Cockpit：  https://NAS_IP:9090
Portainer：https://NAS_IP:9443
```

实际访问方式以部署配置为准。每完成一阶段，检查服务并重启验证网络、磁盘和应用能否恢复。

## 磁盘、目录与共享

### 先固定挂载，再安装应用

用下面的命令确认设备、文件系统和挂载关系，`/path/to/data` 代表自行选择的数据盘挂载点：

```bash
lsblk -o NAME,SIZE,FSTYPE,UUID,MOUNTPOINTS,MODEL
findmnt --mountpoint /path/to/data
df -hT /path/to/data
```

持久化挂载优先使用文件系统 UUID。以下只是 `/etc/fstab` 的**格式示例**，UUID、路径、文件系统与参数均需根据实际分区填写：

```text
UUID=REPLACE_WITH_DATA_UUID /path/to/data ext4 defaults 0 2
```

是否允许缺盘继续启动，要结合服务依赖决定。应用启动前应核对挂载来源，避免在硬盘未挂载时把数据写进系统盘上的同名空目录。修改挂载配置后，在可接管的控制台环境执行 `systemctl daemon-reload`、`mount -a`，再用 `findmnt` 检查。

### 通用目录示例

| 路径形式             | 用途                                         |
| -------------------- | -------------------------------------------- |
| `/opt/stacks/<app>/` | Dockge 官方示例中的 Compose 项目目录         |
| `./config`、`./data` | 各 Compose 项目自己的配置与持久化数据        |
| `/path/to/data`      | 下载和本地媒体，媒体篇统一映射为容器 `/data` |
| `/path/to/photos`    | 已有照片目录                                 |
| `/path/to/cloud`     | CloudDrive2 等工具准备好的云盘挂载           |
| `/path/to/strm`      | CMS 生成的 STRM                              |
| `/path/to/backups`   | 独立选择的备份目的地                         |

**所有 `/path/to/...` 都是占位符，部署前必须替换。** `./config` 等相对路径通常以主 Compose 文件所在目录为基准；不要把同一个相对目录误认为不同项目自动共享的数据目录。

Compose 所在位置与 Docker Engine 的 `data-root` 是两件事。应用换镜像时能否保留数据，取决于具体绑定挂载和命名卷，不能只看项目目录。

用户与共享目录按实际 UID/GID 授权；需要 root 执行的维护脚本由 root 管理，普通账户不应能替换脚本及其父目录。

### Samba 与 Tailscale

Samba 提供文件共享；需要从外部设备访问时，可选择 Tailscale 或其它组网工具。Exit Node、子网路由和远程 SSH 都是独立功能，按用途启用。

共享名称使用中性的 `media` 举例：

```text
局域网：   \\NAS_LAN_IP\media
私有组网： \\NAS_TAILSCALE_IP\media
```

按实际接口和访问范围设置 Samba，保存后用 `testparm -s` 检查，再从客户端测试新建、读取、重命名与删除。Linux 权限、Samba 账户和挂载权限都应匹配。

## Docker 与应用管理

### Compose 统一管理，数据位置单独核对

可以使用 Dockge 管理 Compose，或使用 Portainer 管理 Docker 环境；应用的最终配置应保存在可备份的文件中，避免面板操作与文件内容脱节。

跨项目互通时，媒体篇示例使用外部 `media` bridge 网络。数据库等内部依赖仍可留在各项目的默认网络中。同一用户自定义网络内使用服务名和**容器监听端口**访问，例如 `http://emby:8096`；电脑访问时使用 `NAS_IP` 与宿主机发布端口。

媒体应用的完整示例见 [媒体服务 Compose](/posts/2026-10-09-debnas-media-workflow/#媒体服务-compose)。这里只统一约定示例路径，不固定 Docker IP，也不要求全部安装。

### 应用逐个加入

| 应用                       | 用途                 | 配置重点                           |
| -------------------------- | -------------------- | ---------------------------------- |
| MoviePilot V3              | 订阅、下载联动与整理 | 下载路径、数据库与应用配置         |
| qBittorrent / Transmission | 下载与保留任务       | 下载路径一致、权限和任务状态       |
| Emby / CMS                 | 媒体库与 STRM        | 路径映射和播放地址可达性           |
| MT Photos                  | 照片管理             | 原件、上传目录、数据库和缓存       |
| Lucky                      | 网络入口             | 管理端口、证书、反向代理与访问规则 |
| Mihomo / MetaCubeXD        | 显式代理与管理面板   | 代理端口、控制器、认证和规则       |

跨盘整理时，应区分复制、移动和硬链接。出现 `EXDEV` 时先检查源与目标是否跨文件系统，不要把网上的单条修复命令当成通用方案。

### 更新和日志也要管理

升级前记录镜像版本、备份数据，并查看迁移说明。数据库升级后，回退镜像不一定能回退数据；自动更新范围与维护时间应按自己的恢复能力决定，示例不预设自动更新标签。

Docker 日志轮转可在 `/etc/docker/daemon.json` 中配置。下面是容量示例，应合并到已有 JSON，保留原有网络等设置：

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

按 [Docker 日志文档](https://docs.docker.com/engine/logging/drivers/json-file/)，调整后需重启 Docker；默认值用于新建容器，已有容器需要按原 Compose 重新创建并核对。

## 配套 Compose：管理、照片与网络

以下五份示例参考官方安装文档，保留应用标准容器目录和常用端口，宿主机数据位置改为通用形式。它们适合作为新建配置的起点；迁移已有实例时，应先把旧数据放到选定的持久化位置，不能直接用空目录覆盖旧实例的挂载关系。

[下载全部 10 份 Compose 示例](/examples/debnas-compose.zip)。MoviePilot V3、qBittorrent、Transmission、CMS 和 Emby 放在 [媒体服务 Compose](/posts/2026-10-09-debnas-media-workflow/#媒体服务-compose)。Mihomo 另附基础应用配置模板。

**默认端口并不保证各软件同时安装时互不冲突。** 例如 MetaCubeXD 的 `8080` 与 qBittorrent WebUI 默认端口重复，Mihomo 控制器的 `9090` 与 Cockpit 重复。需要同时部署时，可以把 MetaCubeXD 的宿主机映射改成 `8081:80`，或调整 Mihomo 控制器的宿主机端口，并同步修改访问地址与 CORS 来源。qBittorrent 是需要单独处理的例外：修改其 WebUI 端口时，按镜像文档同时修改 `WEBUI_PORT` 与映射两侧；BT 端口也要与 `TORRENTING_PORT` 保持一致。

每个项目放在独立目录。补齐占位路径和应用配置后，可在项目目录执行 `docker compose config --quiet` 检查，再启动并查看日志。配置语法通过不代表路径权限、网络和业务功能都已验证。

### Dockge

采用 [Dockge 官方 Compose](https://github.com/louislam/dockge/blob/master/compose.yaml) 的 `5001` 端口、`./data` 和 `/opt/stacks`。后者是上游示例目录，**绑定挂载左右两侧必须为同一个绝对路径**，并与 `DOCKGE_STACKS_DIR` 一致。

[下载 Dockge Compose](/examples/debnas/dockge/compose.yaml)

```yaml
# Generic example based on the upstream Dockge Compose file.
services:
  dockge:
    image: louislam/dockge:1
    restart: unless-stopped
    ports:
      - 5001:5001
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./data:/app/data
      - /opt/stacks:/opt/stacks
    environment:
      DOCKGE_STACKS_DIR: /opt/stacks
```

访问 `http://NAS_IP:5001`，完成账户初始化。Dockge 和下面的 Portainer 挂载 Docker socket，用于管理 Docker；给该挂载加 `:ro` 不等于把 Docker API 变成只读。

### Portainer

采用 [Portainer CE 官方安装文档](https://docs.portainer.io/start/install-ce/server/docker/linux) 的 `lts` 镜像和 HTTPS `9443` 端口，使用命名卷保存 `/data`。Edge Agents 需要的 `8000` 可按用途加入；基础示例不启用旧版 HTTP `9000`。

[下载 Portainer Compose](/examples/debnas/portainer/compose.yaml)

```yaml
# Generic example based on the upstream Portainer CE installation guide.
services:
  portainer:
    image: portainer/portainer-ce:lts
    restart: always
    ports:
      - 9443:9443
      # Add 8000:8000 only when using Edge Agents.
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
volumes:
  portainer_data:
```

访问 `https://NAS_IP:9443`，按对应版本的首次设置流程初始化。备份时别漏掉命名卷里的数据库；Compose 项目名变化也可能创建新的卷，迁移前要核对实际卷名。

### MT Photos

参考 [MT Photos 官方安装说明](https://mtmt.tech/docs/start/install/)，保留 `8063`、`/config` 和 `/upload`；已有照片用 `/path/to/photos:/photos` 举例。`/photos` 是自选图库目录，并非系统必需目录。

[下载 MT Photos Compose](/examples/debnas/mtphotos/compose.yaml)

```yaml
# Generic example based on the upstream MT Photos installation guide.
services:
  mtphotos:
    image: mtphotos/mt-photos:latest
    restart: unless-stopped
    ports:
      - 8063:8063
    volumes:
      - ./config:/config
      - ./upload:/upload
      - /path/to/photos:/photos
    environment:
      TZ: Asia/Shanghai
```

访问 `http://NAS_IP:8063`。配置数据库与缩略图默认落在 `./config`，上传原件位于 `./upload`。需要将缓存单独放到其它磁盘时，再按官方文档映射 `/config/cache`。本例面向 amd64；其它架构按官方说明选择相应镜像，不附带 AI 服务或自动更新策略。

### Lucky

参考 [Lucky 官方安装说明](https://lucky666.cn/docs/install)，Linux 使用推荐的 host 网络，配置保存到 `./config:/app/conf`。初始管理入口通常为 `http://NAS_IP:16601`，代理监听、证书和 DDNS 规则需在自己的实例中设置。

[下载 Lucky Compose](/examples/debnas/lucky/compose.yaml)

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

host 模式直接使用宿主机网络，不再写 `ports`；后续规则中启用的监听也会直接占用宿主机端口。本例只保留基础网络功能，需要通过 Lucky 管理 Docker 时再核对 Docker socket 挂载要求。

### Mihomo 与 MetaCubeXD

Mihomo 示例采用普通 bridge 网络下的显式代理，MetaCubeXD 使用官方独立面板镜像。对应入口为代理 `7890`、控制器 `9090`、面板 `8080`。这是用于说明连接关系的端口组合；Mihomo 监听端口由应用配置决定，并不存在必须沿用的端口值。

[下载 Mihomo 与 MetaCubeXD Compose](/examples/debnas/mihomo/compose.yaml) · [下载应用配置模板](/examples/debnas/mihomo/config.example.yaml)

```yaml
# Basic explicit-proxy example; prepare ./config/config.yaml before starting.
services:
  mihomo:
    image: ghcr.io/metacubex/mihomo:latest
    restart: unless-stopped
    ports:
      - 7890:7890
      - 9090:9090
    volumes:
      - ./config:/root/.config/mihomo
  metacubexd:
    image: ghcr.io/metacubex/metacubexd:latest
    restart: unless-stopped
    ports:
      - 8080:80
```

在该项目目录新建 `config` 文件夹，将模板保存为 `config/config.yaml`：

```yaml
# Copy to ./config/config.yaml and replace every REPLACE_* value.
# This direct-only example contains no subscription, provider, or proxy node.
mixed-port: 7890
allow-lan: true
bind-address: "*"
authentication:
  - "REPLACE_PROXY_USER:REPLACE_PROXY_PASSWORD"
mode: rule
log-level: info
external-controller: 0.0.0.0:9090
secret: "REPLACE_WITH_A_LONG_RANDOM_SECRET"
external-controller-cors:
  allow-origins:
    - "http://NAS_IP:8080"
  allow-private-network: true
rules:
  - MATCH,DIRECT
```

**启动前替换代理用户名、代理密码和控制器 secret，并把 `NAS_IP` 改为浏览器实际使用的地址。** 此模板仅含 `DIRECT` 规则，用于验证代理与面板连接；没有订阅、节点或个人规则，实际用途需要自己补充。

打开 `http://NAS_IP:8080`，填入控制器 `http://NAS_IP:9090` 和自己设置的 secret。连接由浏览器发起，因此应填浏览器能访问的地址，不能填仅 Docker 内部可解析的 `mihomo`。如果改了面板端口，也要修改 `allow-origins` 中的完整来源地址。

这些入口面向受控网络；根据实际使用范围限制访问。基础显式代理不需要共享宿主机 PID/IPC、`cap_add: ALL` 或 TUN 设备。需要透明代理/TUN 时，另按 [Mihomo 文档](https://wiki.metacubex.one/)配置路由、设备和最小所需权限。

## CloudDrive2 挂载踩坑

CloudDrive2 可以采用官方支持的服务或容器方式部署。配置、临时缓存和云盘挂载分开规划，示例挂载点统一记为 `/path/to/cloud`，不包含具体账号或网盘目录名。

### 宿主机恢复挂载，容器未必同步恢复

Docker bind mount 默认使用 `rprivate` 传播。宿主机的 FUSE 挂载重建后，已有容器不一定自动看到新的挂载；表现取决于绑定的是挂载点还是父目录，以及挂载传播设置。原理见 [Docker bind mounts](https://docs.docker.com/engine/storage/bind-mounts/)。

可以先等待目标挂载就绪，再重启依赖它的容器；也可以按需要配置并验证挂载传播。就绪检查应核对来源并实际读取目录，不能只检查路径存在。失效 FUSE 的读取可能阻塞，检查命令也要有超时。

若等待步骤放在 systemd 的 `ExecStartPost`，服务启动超时应覆盖该步骤。超时后记录失败，不继续刷新媒体库，避免把空目录当成媒体已经消失。

### 复制结束，仍要确认云端结果

文件复制到云盘挂载目录后，写入可能先进入本地缓存，再由后台上传。确认完成应结合上传任务状态、远端文件大小，以及独立重新下载后的校验结果。

只在挂载目录看到文件，或从同一份缓存立即读回，不能充分证明云端已保存完整数据。

## 把日常维护做成固定流程

### 脚本与操作入口

如需 OliveTin 等网页操作入口，让它调用范围明确的包装脚本。限制动作与参数，不要把网页输入直接拼进任意 Shell 命令；脚本与权限设计另按实际用途维护。

可以把维护事项分为系统更新、容器更新、挂载检查、备份和日志检查。定时任务的时间、互斥和失败处理由实际业务决定，公开示例不预设某台机器的运行计划。

### 防火墙要覆盖宿主机与容器

分别检查宿主机监听和 Docker 发布端口，并从局域网、私有组网与外部网络测试实际可达范围。需要同时考虑 IPv4 和 IPv6。

[Docker 防火墙文档](https://docs.docker.com/engine/network/packet-filtering-firewalls/)说明，Docker 与 firewalld 集成时有相应 zone 和转发策略。不能仅凭宿主机某个 zone 没有开放端口，就判断容器端口没有暴露。规则要与当前 iptables / nftables 后端配合；修改远程入口时保留可用控制台。

### 系统更新、温度与日志

自动安全更新和自动重启是不同设置。根据可用性要求安排维护窗口，更新内核后确认是否需要重启。

温度检查按实际传感器的 `type` 确认来源，不硬编码某台机器的 `thermal_zone` 编号。限频、功耗和风扇策略依赖硬件与驱动，不给所有 NAS 套用统一阈值。

要在重启后排查故障，应确认 journald 已启用持久日志，并设置适合磁盘容量的保留上限。用 `journalctl --list-boots` 验证能否读取前一次启动记录。

## 两级备份与恢复

### 第一级：应用数据到独立存储

先盘点 Compose、`.env`、数据库、命名卷、系统服务与共享配置。容器镜像可以重新下载，应用状态不一定可以；不能因为没有手工绑定目录，就漏掉命名卷中的数据。

需要一致性的数据库，可使用数据库本身的备份工具，或在维护窗口内干净停止相关服务后复制数据。只有实际使用了相应文件系统能力，才能把备份称为原子快照。

备份流程至少包括：

1. 检查目标挂载、可用空间和需要保护的数据。
2. 取得一致的数据副本，恢复暂停的服务并确认健康状态。
3. 生成归档及校验文件，检查本次备份成功。
4. 按自己制定的保留策略清理旧版本。

对于 systemd 管理的备份服务，可以让它依赖实际备份挂载点。下面是需替换路径的 unit 片段：

```ini
[Unit]
RequiresMountsFor=/path/to/backups
After=local-fs.target
```

脚本仍需检查挂载来源，避免备份写进错误磁盘。备份和更新任务应明确互斥，不能只靠安排在不同时间就假定不会重叠。

### 第二级：完成的备份到云端

上传已经完成的本地归档，通常不需要为上传再次暂停应用：

```text
本地归档和校验通过
→ 上传到云端
→ 确认远端文件完整
→ 独立下载并校验
→ 验证当前备份可用后再清理旧版本
```

配置归档可能包含凭据，可以在上传前加密并单独保管恢复密钥。媒体与照片原件是否纳入备份，应明确说明，不能用“配置已备份”代替原件保护。

定期在隔离位置恢复应用，核对权限、数据库与关键数据。SHA256 有助于发现文件变化，但不能单独证明数据库和业务都能正常恢复。

## 运行几天后整机失联

遇到 LAN、SSH 与网页一起无法访问时，先区分网络、服务、系统和供电故障。下面是排查思路，并不表示这些现象已经在当前设备上出现。

| 观察                         | 下一步                             |
| ---------------------------- | ---------------------------------- |
| 本地控制台可用，网络访问失败 | 检查地址、链路、路由、监听和防火墙 |
| 单个网页失败，SSH 可用       | 检查对应服务、容器、反向代理与日志 |
| 日志突然停止，随后重新启动   | 核对供电、重启原因、硬件和内核记录 |
| 有 panic、OOM 或 I/O 报错    | 保存完整上下文，再定位相关组件     |

`last -x` 的 `crash`、磁盘的非正常关机计数，都不能单独说明根因。没有日志也可能是来不及落盘；`pstore` 为空不等于没有内核问题。网卡型号或单条 ASPM 提示同样不能直接作为定因。

下一轮排查一次改变一个变量，同时记录系统、内核与相关服务版本，保留对照条件。

## 硬件 watchdog 与故障取证

### 用硬件 watchdog 增加恢复机会

硬件 watchdog 需要设备、驱动和固件支持。先查看本机是否存在相应设备，再参考 [systemd-system.conf(5)](https://manpages.debian.org/trixie/systemd/systemd-system.conf.5.en.html) 的 `RuntimeWatchdogSec` 说明设置超时，并检查实际生效值。

watchdog 的作用是：在超时期间没有收到喂狗信号时，硬件尝试复位。网络单独失效但 systemd 仍正常运行时，可能继续喂狗；供电中断或部分硬件故障也不一定能靠它恢复。因此不把固定时间自动重启当成所有失联场景的保证。

### 留心跳，异常时抓现场

可以定期记录时间、运行时长、负载与关键服务状态，异常时保存网卡、路由、监听、Docker 和近期系统日志。采集命令需要总超时预算，并优先把关键内容落盘；FUSE 或磁盘异常时，读取目录本身也可能卡住。

网关不响应 ping 可能只是 ICMP 策略，网关可达也不能证明业务正常。结合外部监控与本地记录判断，避免只检查单一信号。

重启后先查看上一次启动：

```bash
journalctl --list-boots
journalctl -b -1 -k --no-pager
journalctl -b -1 -n 300 --no-pager
last -x
systemctl --failed --no-pager
```

记录缺失时也要检查采集器自身、磁盘可写性和日志持久化。只有实际验证过恢复行为，才把 watchdog 计入恢复方案。

## 脚本部署时踩过的坑

从网页复制脚本可能引入开头空行、BOM 或 CRLF，导致 shebang 失效。`Exec format error` / `systemd 203/EXEC` 也可能来自解释器路径和权限问题，不能只看第一行。

部署已有脚本前，按实际文件替换路径并检查：

```bash
head -n 3 /path/to/scripts/example.sh
file /path/to/scripts/example.sh
bash -n /path/to/scripts/example.sh
systemd-analyze verify /etc/systemd/system/example.service
```

只修正异常的开头、编码或换行，保留脚本内部文本。`bash -n` 只检查语法；保存 unit 后还要重新加载 systemd、手动运行、检查退出状态与日志，再启用定时器。

## 装完后的验收与后续记录

每完成一阶段，确认重启后仍能恢复：

- SSH 和管理入口可达，网络地址符合预期。
- 数据盘来自正确 UUID，共享读写正常。
- 容器实际挂载、应用权限与配置一致。
- 云盘挂载恢复后，依赖它的应用能读到真实内容。
- 默认端口冲突已处理，各网络的访问范围符合预期。
- 备份能上传、校验，并在隔离位置完成恢复。
- 日志可以跨重启读取，监控和故障取证本身正常。

安装示例只提供起点。后续每次变更记录修改内容与验证结果，遇到问题时就能知道上一次稳定状态是什么、应该从哪里恢复。

## 参考资料

- [DebNAS 文档](https://kekylin.github.io/debnas-docs/)、[Debian 最小化安装](https://kekylin.github.io/debnas-docs/guide/debian-minimal-installation/)和[快速开始](https://kekylin.github.io/debnas-docs/guide/getting-started/)：系统支持范围与安装入口。
- [DebNAS 源码](https://github.com/kekylin/debnas)、[Debian 13 amd64 安装指南](https://www.debian.org/releases/trixie/amd64/)：安装过程与系统配置。
- [Dockge 官方 Compose](https://github.com/louislam/dockge/blob/master/compose.yaml)：默认端口、栈目录和路径要求。
- [Portainer CE 安装](https://docs.portainer.io/start/install-ce/server/docker/linux)：HTTPS、Edge Agents 和命名卷。
- [MT Photos 安装](https://mtmt.tech/docs/start/install/)：端口、配置目录、上传目录与图库。
- [Lucky 安装](https://lucky666.cn/docs/install)：v2 镜像、Linux host 网络和 `/app/conf`。
- [MetaCubeXD](https://github.com/MetaCubeX/metacubexd)、[Mihomo 全局配置](https://wiki.metacubex.one/config/general/)与[代理端口](https://wiki.metacubex.one/config/inbound/port/)：面板、控制器与认证。
- [Docker bind mounts](https://docs.docker.com/engine/storage/bind-mounts/)、[防火墙](https://docs.docker.com/engine/network/packet-filtering-firewalls/)和[日志轮转](https://docs.docker.com/engine/logging/drivers/json-file/)：挂载传播、发布端口和日志管理。
- [systemd-system.conf(5)](https://manpages.debian.org/trixie/systemd/systemd-system.conf.5.en.html)：硬件 watchdog 参数。
