---
title: DebNAS 安装：系统初始化、磁盘共享与验收
description: 从安装 Debian 与 DebNAS 开始，接好数据盘、共享和容器，再用重启、备份恢复与故障取证验收。
author: Ayulog
pubDatetime: "2026-10-09T19:00:00+08:00"
modDatetime: "2026-10-11T00:00:00+08:00"
draft: false
category: nas
tags:
  - Debian
  - DebNAS
  - Docker
---

用 Debian 搭建家用 NAS 时，按“底层系统与 SSH → 数据盘挂载与局域网共享 → Docker 容器部署 → 备份与重启验证”的顺序推进，能避免后期因路径混乱或挂载失效推倒重来。DebNAS 脚本在此基础上提供了现成的系统初始化、Cockpit 管理与容器环境配置。

完整的软件选型见 [NAS 服务清单](/posts/nas-software-websites/)，下载器设置见 [PT 工具清单](/posts/pt-software/)。文中 `/path/to/...` 为宿主机路径占位符，`./config` 等相对路径均以各自 Compose 文件所在目录为基准。

## 系统安装与 DebNAS 初始化

### 安装 Debian 12 / 13

DebNAS 当前支持 **Debian 12（`bookworm`）与 Debian 13（`trixie`）的 amd64 环境**。安装流程可参考 [DebNAS 的 Debian 最小化安装教程](https://kekylin.github.io/debnas-docs/guide/debian-minimal-installation/) 和 [Debian 13 amd64 安装指南](https://www.debian.org/releases/trixie/amd64/)：

1. 从 Debian 官方下载安装镜像并校验，使用 Rufus 或 Etcher 制作启动盘（注意区分 DVD 完整镜像与需要联网取包的 netinst 镜像）。
2. 安装前确认系统盘容量与型号，建议先断开已有数据的硬盘，待系统装好后再接回。
3. 设置主机名与日常账户（下文以 `nasuser` 为例）。分区时仅格式化系统盘，已有数据盘后续直接按原文件系统挂载。
4. 组件选择阶段勾选 `SSH server` 和 `standard system utilities`，无头 NAS 无需安装桌面环境。
5. 安装完成后拔出启动盘重启，在本地控制台确认获取到的局域网 IP。

### 验证 SSH 远程登录

在 NAS 本地终端检查系统版本、架构、网卡地址与 SSH 服务状态：

```bash
cat /etc/os-release
dpkg --print-architecture
ip -br addr
ip route
systemctl status ssh --no-pager
```

确认网络正常后，从局域网电脑连接 NAS：

```bash
ssh nasuser@NAS_IP
```

建议在路由器中为 NAS 绑定 DHCP 静态地址保留，固定局域网访问入口。日常操作使用普通账户，需要管理权限时通过 `sudo` 或 `su -` 提权。

### 运行 DebNAS 初始化脚本

切换至 root 账户并确保已安装 `wget` 与证书组件，随后运行 [DebNAS 快速开始](https://kekylin.github.io/debnas-docs/guide/getting-started/) 提供的安装入口（GitHub 或 Gitee 二选一）：

```bash
su -
apt update && apt install -y wget ca-certificates

# GitHub 入口
bash <(wget -qO- https://raw.githubusercontent.com/kekylin/debnas/main/install.sh) -s github@main

# Gitee 入口（备选）
bash <(wget -qO- https://gitee.com/kekylin/debnas/raw/main/install.sh) -s gitee@main
```

运行前可查阅 [安装脚本源码](https://github.com/kekylin/debnas/blob/main/install.sh) 了解具体改动。进入交互菜单后按需执行系统初始化与组件安装，使用时注意以下事项：

- **网络切换与 IP 变化**：初始化过程若将网络管理切换为 NetworkManager，网卡 IP 可能发生改变。一旦 SSH 断开，请到路由器后台或本地控制台查看新地址。
- **管理入口**：安装 Cockpit 与 Portainer 后，默认访问地址分别为 `https://NAS_IP:9090` 和 `https://NAS_IP:9443`。后续如需再次调出菜单，直接重新运行上述命令即可。

## 磁盘挂载、目录规划与共享

### 按 UUID 挂载数据盘

先查看磁盘分区、文件系统类型与 UUID，确认数据盘状态（以 `/path/to/data` 作为挂载点示例）：

```bash
lsblk -o NAME,SIZE,FSTYPE,UUID,MOUNTPOINTS,MODEL
findmnt --mountpoint /path/to/data
df -hT /path/to/data
```

在 `/etc/fstab` 中使用 UUID 固定挂载关系，替换实际的 UUID、挂载路径与文件系统类型：

```text
UUID=REPLACE_WITH_DATA_UUID /path/to/data ext4 defaults 0 2
```

保存后依次执行 `systemctl daemon-reload` 和 `mount -a`，再用 `findmnt` 确认挂载成功。务必在数据盘完成持久化挂载后再启动 Docker 容器，防止硬盘未挂载时容器将数据写入系统盘的同名空目录。

### 通用目录规划

为便于后续维护与备份，建议将 Compose 项目配置与大容量媒体、照片、备份数据分开存放：

| 路径形式             | 用途说明                                         |
| -------------------- | ------------------------------------------------ |
| `/opt/stacks/<app>/` | Dockge 默认管理的 Compose 项目目录               |
| `./config`、`./data` | 各 Compose 项目内部的配置与数据库目录            |
| `/path/to/data`      | 下载与本地媒体根目录，媒体容器统一映射为 `/data` |
| `/path/to/photos`    | 照片图库目录                                     |
| `/path/to/cloud`     | CloudDrive2 等工具的本地云盘挂载点               |
| `/path/to/strm`      | CMS 生成的本地 STRM 目录                         |
| `/path/to/backups`   | 独立存放的归档备份目录                           |

业务目录按实际运行账户的 UID/GID 授权；由 root 定时执行的系统维护脚本应归属 root 且禁止普通账户修改。

### 配置 Samba 与 Tailscale 共享

局域网文件共享通过 Samba 提供，外网访问可搭配 Tailscale 等私有组网工具（以共享名 `media` 为例）：

```text
局域网访问：   \\NAS_LAN_IP\media
私有组网访问： \\NAS_TAILSCALE_IP\media
```

修改 `/etc/samba/smb.conf` 后，运行 `testparm -s` 校验配置语法，再从客户端测试新建、读取、重命名和删除文件，确保 Linux 目录权限与 Samba 账户权限一致。

### Docker 网络与日志轮转

跨项目互通的容器（如媒体工作流组件）建议加入同一个自定义 bridge 网络，在容器间通过“服务名 + 容器内部端口”（如 `http://emby:8096`）通信；局域网设备访问时则使用 `NAS_IP` 加宿主机映射端口。

为防止容器日志无限增长占满系统盘，可在 `/etc/docker/daemon.json` 中合并日志轮转配置（保留文件中已有的镜像源或网络参数）：

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

参考 [Docker 日志文档](https://docs.docker.com/engine/logging/drivers/json-file/)，修改后需重启 Docker 服务，且新规则仅对新建容器生效，已有容器需重建后才会应用。

## 配套 Compose：管理、照片与网络

以下五份 Compose 配置用于验证容器面板、照片库与网络入口。媒体工作流的另外五份配置（MoviePilot V3、qBittorrent、Transmission、CMS、Emby）见 [媒体服务 Compose](/posts/debnas-media-workflow/#媒体服务-compose)，也可直接[下载全部 10 份 Compose 示例](/examples/debnas-compose.zip)。

每个项目保存在独立目录中，修改路径与凭据后启动。同时部署多个服务时需留意宿主机端口冲突：

- MetaCubeXD 默认的 `8080` 与 qBittorrent WebUI 冲突，可将 MetaCubeXD 改为 `8081:80`。
- Mihomo 控制器默认的 `9090` 与 Cockpit 冲突，可修改控制器映射端口并同步更新 `allow-origins`。

### Dockge

详细说明见 [Dockge 部署与管理](/posts/dockge-guide/)。配置文件可[点击下载](/examples/debnas/dockge/compose.yaml)，参考 [Dockge 官方 Compose](https://github.com/louislam/dockge/blob/master/compose.yaml)：

```yaml
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

启动后访问 `http://NAS_IP:5001` 创建管理员账户。注意 `/opt/stacks:/opt/stacks` 挂载左右两侧必须为相同的宿主机绝对路径，且与 `DOCKGE_STACKS_DIR` 保持一致。

### Portainer

详细说明见 [Portainer CE 部署与管理](/posts/portainer-guide/)。配置文件可[点击下载](/examples/debnas/portainer/compose.yaml)，参考 [Portainer CE 官方安装文档](https://docs.portainer.io/start/install-ce/server/docker/linux)：

```yaml
services:
  portainer:
    image: portainer/portainer-ce:lts
    restart: always
    ports:
      - 9443:9443
      # 如需使用 Edge Agents，再取消注释 8000:8000
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
volumes:
  portainer_data:
```

启动后访问 `https://NAS_IP:9443` 完成初始化。Portainer 的自身数据保存在命名卷 `portainer_data` 中，备份和迁移时需一并包含该卷，并保持 Compose 项目名不变。

### MT Photos

详细说明见 [MT Photos 图库设置](/posts/mt-photos-guide/)。配置文件可[点击下载](/examples/debnas/mtphotos/compose.yaml)，参考 [MT Photos 官方安装说明](https://mtmt.tech/docs/start/install/)（amd64 架构）：

```yaml
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

替换 `/path/to/photos` 后启动，访问 `http://NAS_IP:8063`。数据库与默认缩略图保存在 `./config`，手机端上传原件保存在 `./upload`；如需将缩略图缓存单独放到 SSD，可按官方文档额外映射 `/config/cache`。

### Lucky

详细说明见 [Lucky 的 DDNS 与反向代理](/posts/lucky-guide/)。配置文件可[点击下载](/examples/debnas/lucky/compose.yaml)，参考 [Lucky 官方安装说明](https://lucky666.cn/docs/install)：

```yaml
services:
  lucky:
    image: gdy666/lucky:v2
    restart: always
    network_mode: host
    volumes:
      - ./config:/app/conf
```

Linux 下推荐使用 `host` 网络模式，无需编写 `ports` 映射，添加的转发或反向代理规则会直接监听宿主机端口。启动后访问 `http://NAS_IP:16601` 配置 DDNS、证书与反向代理。

### Mihomo 与 MetaCubeXD

详细说明见 [Mihomo 配置](/posts/mihomo-docker/)。配置文件可下载 [Compose 示例](/examples/debnas/mihomo/compose.yaml) 与 [应用配置模板](/examples/debnas/mihomo/config.example.yaml)：

```yaml
services:
  mihomo:
    image: docker.io/metacubex/mihomo:latest
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

在项目目录中新建 `config/config.yaml`，写入基础启动配置并替换代理账号、密码、`secret` 及局域网 `NAS_IP`：

```yaml
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

启动后在浏览器打开面板 `http://NAS_IP:8080`，控制器地址填写浏览器可达的 `http://NAS_IP:9090` 并输入 `secret`。如需配置 TUN 模式或透明代理，再参考 [Mihomo 官方文档](https://wiki.metacubex.one/) 补充相应网络与设备权限。

## 进阶维护、备份与故障排查

### CloudDrive2 挂载与容器恢复

使用 CloudDrive2 挂载云盘（如 `/path/to/cloud`）供容器读写时，需要注意两点：

1. **挂载恢复与容器可见性**：Docker 绑定挂载默认采用 `rprivate` 传播模式（详见 [Docker bind mounts](https://docs.docker.com/engine/storage/bind-mounts/)）。当宿主机上的 FUSE 挂载中断并重连后，已运行的容器往往无法直接读取新挂载点。可在挂载服务恢复并确认目录可读后自动重启依赖容器，或按需配置共享挂载传播（如 `rshared`）。检查挂载就绪的脚本需设置超时时间，超时则终止后续任务，避免媒体库扫描把空目录误判为文件删除。
2. **后台上传确认**：文件写入挂载目录后会先落入本地缓存，再由后台异步上传至网盘。判断文件是否已安全上云，需结合 CloudDrive2 上传任务列表与网盘远端文件大小确认。

### 防火墙、系统更新与持久日志

- **防火墙规则**：参考 [Docker 防火墙文档](https://docs.docker.com/engine/network/packet-filtering-firewalls/)，Docker 发布端口时会直接操作转发链，可能绕过宿主机 firewalld 的常规区域限制。配置安全策略时需同时检查宿主机监听与容器映射端口（含 IPv4 与 IPv6），并在局域网、私有组网和外网分别实测可达性。
- **脚本与更新**：若使用 OliveTin 等网页工具触发维护动作，应通过限定参数的固定脚本执行。内核或系统更新后按需安排重启窗口。
- **持久化日志与脚本检查**：确认 systemd-journald 已开启持久化存储，以便重启后通过 `journalctl --list-boots` 查看历史日志。部署从网页复制的 Shell 脚本或 systemd unit 前，可先用以下命令排查 BOM 头、CRLF 换行或语法错误：

```bash
head -n 3 /path/to/scripts/example.sh
file /path/to/scripts/example.sh
bash -n /path/to/scripts/example.sh
systemd-analyze verify /etc/systemd/system/example.service
```

### 两级备份与恢复验证

日常备份可分为本地归档与异地上传两级，备份任务应与容器自动更新任务错开并互斥：

1. **第一级（本地独立存储）**：盘点各项目的 Compose、`.env`、应用配置、数据库、Docker 命名卷及系统服务文件。含数据库的应用先调用自带导出工具或短暂停止容器，再打包归档并生成 SHA256 校验文件，确认无误后恢复服务并按保留策略清理旧归档。若使用 systemd 定时备份，可在 unit 中声明挂载依赖：

```ini
[Unit]
RequiresMountsFor=/path/to/backups
After=local-fs.target
```

2. **第二级（上传至云端）**：将已生成的本地归档包加密后上传至云盘，无需再次暂停业务容器。上传完成后核对远端文件大小，并定期抽样下载到隔离目录做恢复演练，验证数据库与权限均能正常还原。

### 整机失联排查与硬件 Watchdog

当设备运行数日后出现 LAN、SSH 与 Web 页面同时失联时，可按以下方向定位并配置恢复手段：

| 故障现象                        | 排查重点                                    |
| ------------------------------- | ------------------------------------------- |
| 本地控制台可用，网络无法访问    | 检查网卡状态、IP 地址、路由表、监听与防火墙 |
| 仅个别网页失效，SSH 仍可登录    | 检查对应容器状态、反向代理配置与服务日志    |
| 日志在某时刻中断，随后自启      | 检查电源供电、主板硬件记录与前次内核日志    |
| 日志留有 panic、OOM 或 I/O 报错 | 保存报错前后的完整日志上下文，定位故障组件  |

系统重启后，可通过以下命令提取上一次启动周期的内核与系统日志：

```bash
journalctl --list-boots
journalctl -b -1 -k --no-pager
journalctl -b -1 -n 300 --no-pager
last -x
systemctl --failed --no-pager
```

若主板芯片组与驱动支持硬件看门狗，可参考 [systemd-system.conf(5)](https://manpages.debian.org/trixie/systemd/systemd-system.conf.5.en.html) 配置 `RuntimeWatchdogSec`，在系统彻底死机且停止喂狗时触发硬件复位。对于仅网络中断而内核仍在运行的场景，则可编写带超时保护的定时巡检脚本，在异常时自动抓取网卡、路由、Docker 状态落盘留证。

全部配置就绪后，执行一次完整重启，逐项核验 SSH 登录、UUID 磁盘挂载、Samba 读写、容器服务互联以及日志跨重启留存，确认整套系统可稳定自愈。

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
