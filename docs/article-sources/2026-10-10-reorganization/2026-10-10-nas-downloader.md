---
title: 下载器篇：qBittorrent、Transmission、Aria2 与 AriaNg
description: 在 NAS 上部署 qBittorrent、Transmission 与 Aria2，统一规划下载和做种目录，配置 Web 管理、AriaNg、网盘下载与 MoviePilot 联动，并保留 Windows 和 Linux 原生安装方法。
author: Ayulog
pubDatetime: "2026-10-10T14:15:00+08:00"
draft: true
tags:
  - NAS
  - Docker
  - 下载器
  - qBittorrent
  - Transmission
  - Aria2
  - AriaNg
  - PT
  - 教程
---

把下载任务放在 NAS 上，电脑和手机就只负责添加任务、查看进度，文件直接落在数据盘里。需要长期做种的内容保留原始目录，电影和剧集再交给 MoviePilot 整理，最后进入媒体库。

这一篇把 **qBittorrent、Transmission、Aria2 与 AriaNg** 放在一起说明：先选下载器、规划目录，再完成安装、管理和实际下载，最后接入自动整理。以 Docker Compose V2 为主，也保留 qBittorrent 的原生安装和 Transmission 的 Windows 用法，按自己的设备选择一种部署方式即可。

资料核对于 **2026 年 10 月 9—10 日**，依据官方文档、镜像说明和文末实践文章整理；未对所有设备和客户端组合进行实机验证。示例中的地址、目录、账户和密钥都需要替换为自己的配置。

## 目录

- [先选下载器，再规划目录](#先选下载器再规划目录)
- [qBittorrent](#qbittorrent)
- [Transmission](#transmission)
- [Aria2 与 AriaNg](#aria2-与-ariang)
- [与 MoviePilot 联动](#与-moviepilot-联动)
- [更新、备份与迁移](#更新备份与迁移)
- [常见问题](#常见问题)
- [参考资料](#参考资料)

## 先选下载器，再规划目录

### 它们分别负责什么

| 工具         | 主要用途                                      | 本文中的位置                         |
| ------------ | --------------------------------------------- | ------------------------------------ |
| qBittorrent  | BT、磁力下载与做种，分类、RSS 和任务管理      | 本地媒体下载与 MoviePilot 联动       |
| Transmission | BT、磁力下载与做种，桌面或后台运行            | 长期保种，也可连接 MoviePilot        |
| Aria2        | HTTP(S)、FTP、SFTP、BitTorrent、Metalink 下载 | 直链、软件包、公开磁力与网盘文件下载 |
| AriaNg       | 通过 RPC 控制 Aria2 的网页界面                | 查看、添加和管理 Aria2 任务          |

qBittorrent 与 Transmission 可以先选一个；Aria2 按需补充直链和网盘下载。AriaNg、Transmission 的内置 Web、TrguiNG 都是管理界面，真正执行任务的仍是下载后端。关闭网页通常不会停止 NAS 上的下载。

用于 PT 时，**先核对站点客户端白名单和做种规则**，再决定版本。Compose 中的 `latest` 是示例用的可变标签，不代表每个站点都接受它。稳定运行后记录实际版本或镜像 digest，避免未经核对自动升级。qBittorrent 和 Transmission 不支持 ed2k；安装更多管理界面也不会补上这一协议。

### 共用的目录与权限准备

每个下载器使用自己的项目目录和配置目录，例如 `stacks/qbittorrent/`、`stacks/transmission/`、`stacks/aria2/`。下文各份 `compose.yaml` **分别保存在对应项目中**，它们的 `./config` 不是同一个目录。

qBittorrent、Transmission 与 MoviePilot 采用同一数据根目录，便于后续整理：

```text
/path/to/data/
├── downloads/
│   ├── qbittorrent/
│   ├── transmission/
│   └── incomplete/
└── library/
    ├── movies/
    └── tv/
```

把自己选定的 NAS 数据根目录映射为容器内的 `/data`，在应用中填写 `/data/downloads/...`。`/path/to/data` 只是占位符，应先在 NAS 上创建实际目录。Aria2 示例独立使用 `/downloads`，与媒体下载目录按用途分开即可。

通过 SSH 查询负责写入的 NAS 账户：

```bash
id nasuser
```

将 `nasuser` 换成实际账户，记录 UID 与 GID，并在 NAS 权限管理中给它配置目录和数据目录的读写权限。不要直接照抄 `0/0`，也不需要把整个共享目录开放为 `777`。

qBittorrent 和 Transmission 的项目各自创建 `.env`，填入同一组实际值：

```dotenv
# 填写实际服务账户的 UID / GID
PUID=
PGID=
# 替换为 NAS 上已经存在的数据根目录
MEDIA_ROOT=/path/to/data
```

本文容器时区统一为 `Asia/Singapore`。定时限速和更新任务看的是后端时区，不能只看浏览器所在设备的时间。

### 管理端口与下载端口分开

| 服务           | 局域网管理入口                         | 与 BT 用户交换数据的端口 |
| -------------- | -------------------------------------- | ------------------------ |
| qBittorrent    | `http://NAS_IP:8080`                   | `6881/TCP`、`6881/UDP`   |
| Transmission   | `http://NAS_IP:9091/transmission/web/` | `51413/TCP`、`51413/UDP` |
| AriaNg / Aria2 | 网页 `18080`；RPC `16800`              | `32516/TCP`、`32516/UDP` |

`NAS_IP` 替换为实际局域网地址。Docker 发布端口不等于路由器完成了转发；改善 BT 入站连接时，核对的是 Peer 端口、NAS 防火墙、路由器和公网条件。把管理端口映射到公网不会提高上传速度。远程管理可以通过 VPN 或私有组网访问；普通 HTTP 连接即使有密码也没有传输加密。

下文均使用 bridge 网络。若改成 host 网络，`ports` 不再生效，不能把两种配置直接混用。

## qBittorrent

qBittorrent 的任务分类和 Web UI 适合接入自动整理。以下以 5.x 的界面概念为例，实际选版仍以站点规则和镜像说明为准。

### 在 NAS 上使用 Docker Compose

在 qBittorrent 项目中创建 `config` 目录，按前文填好 `.env`，再保存 `compose.yaml`：

```yaml
services:
  qbittorrent:
    image: lscr.io/linuxserver/qbittorrent:latest
    environment:
      PUID: "${PUID:?请在 .env 中填写实际 UID}"
      PGID: "${PGID:?请在 .env 中填写实际 GID}"
      TZ: Asia/Singapore
      WEBUI_PORT: "8080"
      TORRENTING_PORT: "6881"
    volumes:
      - ./config:/config
      - ${MEDIA_ROOT:?请在 .env 中填写数据根目录}:/data
    ports:
      - "8080:8080"
      - "6881:6881/tcp"
      - "6881:6881/udp"
    restart: unless-stopped
```

在该项目目录执行：

```bash
mkdir -p config
docker compose config --quiet
docker compose pull
docker compose up -d
docker compose logs --tail=100 qbittorrent
```

首次登录用户名通常是 `admin`，初始临时密码从当前容器的启动日志取得。打开 `http://NAS_IP:8080`，登录后进入 **工具 → 选项 → Web UI**，立即设置独立密码。保留身份验证、CSRF 防护和主机头校验；使用反向代理时，按当前镜像与客户端文档核对域名和代理设置。

网页端口冲突时，按 [LinuxServer 镜像说明][qbt-image]同步修改 `WEBUI_PORT` 和对应映射；BT 端口改动则同步修改 `TORRENTING_PORT`、TCP / UDP 映射和路由器转发。

### 保存路径、分类与做种

在下载选项中设置：

| 设置                      | 本文示例                                 |
| ------------------------- | ---------------------------------------- |
| 默认保存路径              | `/data/downloads/qbittorrent`            |
| 未完成任务目录            | `/data/downloads/incomplete/qbittorrent` |
| MoviePilot 的本地媒体目标 | `/data/library` 下的电影或剧集目录       |

先添加一个有权下载的 Linux 发行版种子，确认文件出现在 NAS 的对应目录，完成后能校验并保持做种。分类需要自动化接管时，按 MoviePilot 中约定的分类和保存目录设置；手工任务不一定会被自动整理。

需要长期做种时，保留下载目录的文件名和层级。确实需要移动文件，先暂停任务，使用 **设置位置** 指向新目录，再执行 **强制重新校验**，核对完整性后恢复；不要直接删除 `.fastresume` 文件来处理路径错误。

公网 BT 可根据网络环境使用 DHT、PeX 和本地发现；PT 按站点要求配置，不要向私有种子随意追加公共 Tracker，也不要公开含 Passkey 的地址。协议加密不等于匿名。

### 限速、队列与 RSS

先用默认设置跑通任务，再根据带宽、硬盘负载和连接情况调整。上传上限可从实测可用上行的约 70%—80% 试起，为其他设备留出余量；这只是起点，不能保证适合所有线路。注意客户端的 `kB/s`、`KiB/s` 与套餐的 `Mbps` 单位不同。

可从以下范围试起：全局连接数 300—800、每任务 50—100、全局上传槽 20—50、每任务上传槽 4—8、活跃下载 3—5 个。低功耗 NAS 或机械盘先取较低值；网页卡顿、丢包或磁盘持续繁忙时，优先降低上传、并发和连接数。增加连接数不能让无人做种的资源获得数据。

需要分时限速时配置备用速度和计划表。RSS 自动下载先建立分类、目录、大小和关键词过滤规则，再启用自动添加。桌面版搜索功能可能需要 Python 与搜索插件，只使用可信来源的插件。

### 不用 Docker 时的安装方法

Windows 和 macOS 从 [qBittorrent 官方下载页][qbt-download]选择适合系统和架构的安装包。保存路径使用本机目录；桌面程序启用 Web UI 后，其他设备才能远程管理。

Debian / Ubuntu 可安装无桌面界面的 `qbittorrent-nox`：

```bash
sudo apt update
sudo apt install qbittorrent-nox
sudo adduser --system --group --home /var/lib/qbittorrent qbittorrent
sudo install -d -o qbittorrent -g qbittorrent /srv/downloads/{incomplete,complete}
sudo -u qbittorrent qbittorrent-nox --profile=/var/lib/qbittorrent
```

仓库实际安装的版本以包管理器结果为准。前台首次运行时查看 Web UI 初始化信息，完成初步设置后正常停止这一实例，再配置服务，避免两套进程争用端口和配置。

创建 `/etc/systemd/system/qbittorrent-nox.service`：

```ini
[Unit]
Description=qBittorrent-nox
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=qbittorrent
Group=qbittorrent
ExecStart=/usr/bin/qbittorrent-nox --profile=/var/lib/qbittorrent
Restart=on-failure
PrivateTmp=true
ProtectSystem=full
ProtectHome=true
ReadWritePaths=/var/lib/qbittorrent /srv/downloads

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now qbittorrent-nox
sudo systemctl status qbittorrent-nox
```

此安装方式的下载路径是 `/srv/downloads/complete` 和 `/srv/downloads/incomplete`，不是 Docker 示例的 `/data`。如果改变实际下载根目录，应同步核对账户权限和服务的 `ReadWritePaths`。

## Transmission

Transmission 可以在桌面运行，也可以作为后台服务长期保种。Qt 本地会话、daemon 和 Docker 容器可能各有自己的配置与任务；先确定唯一要管理的后端，再选择 Web 或 TrguiNG 界面。

### 在 NAS 上使用 Docker Compose

使用 [LinuxServer 镜像][tr-image]。在 Transmission 项目的 `.env` 中保留前文的 `PUID`、`PGID`、`MEDIA_ROOT`，另外填写自己的管理凭据：

```dotenv
TR_USER=
TR_PASSWORD=
```

创建 `compose.yaml`：

```yaml
services:
  transmission:
    image: lscr.io/linuxserver/transmission:latest
    environment:
      PUID: "${PUID:?请在 .env 中填写实际 UID}"
      PGID: "${PGID:?请在 .env 中填写实际 GID}"
      TZ: Asia/Singapore
      USER: "${TR_USER:?请在 .env 中填写管理用户名}"
      PASS: "${TR_PASSWORD:?请在 .env 中填写独立密码}"
    volumes:
      - ./config:/config
      - ./watch:/watch
      - ${MEDIA_ROOT:?请在 .env 中填写数据根目录}:/data
    ports:
      - "9091:9091"
      - "51413:51413/tcp"
      - "51413:51413/udp"
    restart: unless-stopped
```

```bash
mkdir -p config watch
docker compose config --quiet
docker compose pull
docker compose up -d
docker compose logs --tail=100 transmission
```

从局域网打开 `http://NAS_IP:9091/transmission/web/`，使用刚设置的凭据登录。`/watch` 用于自动加载种子，不使用时可省略该挂载。设置默认下载目录为 `/data/downloads/transmission`，如需分离未完成文件，可用 `/data/downloads/incomplete/transmission`。

这里为联动而采用 `/data`。镜像文档中的 `/downloads` 是另一种常用映射，不能照搬其默认路径而忘记本例只挂载了 `/data`。配置与任务状态保存在 `/config`，下载文件保存在数据根目录，两者都应持久化。

LinuxServer 镜像的认证和白名单通过 `USER`、`PASS`、`WHITELIST`、`HOST_WHITELIST` 等环境变量管理；按自己的访问来源与所用版本文档配置，不要直接沿用 `root/root`，也不要把后文 Windows 的认证片段覆盖进容器配置。

### 添加任务与校验已有文件

打开 `.torrent` 或粘贴磁力链接，核对文件选择、保存位置和是否立即开始。下载完成后保持任务运行即可进入做种，实际上传仍取决于是否有其他用户需要数据。

已有文件需要继续做种时：

1. 添加对应种子，取消立即开始。
2. 选择已有文件的保存位置，核对种子内的目录层级。例如种子包含 `Example.Release` 文件夹，通常选择它的上一级，并确认最终路径。
3. 执行 **校验本地数据 / Verify Local Data**。
4. 等待达到 `100%` 后再开始；不足时先核对版本、目录和文件完整性，直接开始会补下载缺失或不匹配的部分。

限速与队列先按实际负载调整。“小乌龟”是备用速度开关，定时计划按后端的本地时间计算，后续计划切换还可能覆盖手动切换的状态。无需一律按 GMT 减去八小时。

长期保种时检查全局和单任务的分享率、空闲做种停止条件。**下载完成不等于满足 PT 的最短做种时长、分享率或 H&R 规则**，Freeleech 也不一定免除做种义务，自动删种前以站点规则和统计为准。

### 选择 TrguiNG 或内置 Web

先确认内置 Web 能登录、添加和暂停任务，再考虑换界面：

- [openscopeproject/TrguiNG][trguing] 是上游项目，提供桌面版与 Web 版。
- [jayzcoder/TrguiNG][trguing-zh] 是汉化与自用功能分支，发布节奏独立，不能当作与上游完全同步的版本。
- [Transmission Web Control][tr-web-control] 已于 2025 年 6 月 1 日归档并停止维护，作为旧部署资料保留。

TrguiNG 桌面版增加服务器时使用后端地址、管理端口 `9091`、RPC 路径 `/transmission/rpc` 和认证信息。完整 RPC 地址例如 `http://NAS_IP:9091/transmission/rpc`，不是浏览器页面的 `/transmission/web/`。关闭 TrguiNG 后，只要后端仍在运行，任务便由后端继续处理。

将 TrguiNG Web 版放入 Docker 容器时：

1. 从选定项目的 Releases 下载编译好的 Web 压缩包，不能使用自动生成的 `Source code (zip)` 代替。
2. 解压到项目配置目录的 `webui/trguing-zh`，确认容器内直接存在 `/config/webui/trguing-zh/index.html`。
3. 在 Transmission 服务已有的 `environment` 中追加下面一项，保留其余环境变量。
4. 执行 `docker compose up -d` 更新容器，刷新页面并验证添加、文件选择、暂停和移除任务等操作。

```yaml
TRANSMISSION_WEB_HOME: /config/webui/trguing-zh
```

仅重启旧容器不会应用新加的环境变量。回退时移除自己添加的变量并重新部署，恢复默认 Web；白屏时先检查入口层级、读取权限与浏览器缓存。截至 2026 年 10 月 9 日，上游 Web 发布版本为 `v1.5.1`，汉化分支为 `trguing-web-v1.3.0-zh-240607a`，下载时应重新查看对应发布页与兼容性。

### Windows 安装与局域网管理

从 [Transmission 官方下载页][tr-download]选择适合架构的 MSI。截至 2026 年 10 月 9 日，官网提供的版本为 4.1.3，普通安装包要求 Windows 10 或更新版本；常见 Intel / AMD 64 位电脑选择 x64，实际以系统信息及下载页为准。用于 PT 时先看白名单。

普通桌面安装选择 **Qt client + Web interface**。4.1.3 的 Web interface 是可选组件，漏装时重新运行安装器修改。先不选 Daemon：它会安装并启动另一套 Windows 后台服务。

启动 Qt 的本地会话，在 **编辑 → 偏好设置** 中设置完成和未完成目录，例如 `D:\Downloads\Transmission` 与 `D:\Downloads\Transmission-Incomplete`。如果放在不同磁盘，完成任务时可能需要跨盘复制。

在 **偏好设置 → 远程** 中开启远程访问，保留管理端口 `9091`，启用认证并设置独立凭据，IP 白名单保留 `127.0.0.1`。先在本机打开 `http://127.0.0.1:9091/transmission/web/`，确认看到同一批任务。

再允许其他局域网设备时，将**来访设备的 IP**加入白名单，在 Windows 防火墙中只允许可信来源访问管理端口，从另一台设备打开 `http://后端局域网IP:9091/transmission/web/`。远端浏览器里的 `127.0.0.1` 指向浏览器所在设备，不是下载电脑。Qt 本地模式自身就能提供 Web，不需要同时启动 daemon；真正退出 Qt 后，该实例的下载和 Web 都会停止。

Windows 切换到 TrguiNG Web，可以把编译好的网页解压到 `D:\Apps\TrguiNG-Web`，确认根目录有 `index.html`，完全退出 Qt 后执行：

```powershell
$env:TRANSMISSION_WEB_HOME = 'D:\Apps\TrguiNG-Web'
& 'C:\Program Files\Transmission\transmission-qt.exe'
```

程序路径按实际安装位置修改。此设置仅对当前会话和新启动进程生效；验证可用后，可在 Windows 用户环境变量中保存 `TRANSMISSION_WEB_HOME`，重启程序，必要时注销后登录。删除变量并重启即可恢复默认界面。服务账户不一定继承桌面用户的环境变量，需分别核对。

### 修改 settings.json 与 Windows 自启动

修改配置前正常退出对应客户端或停止服务，备份整个配置目录，再编辑 `settings.json`。运行中修改可能被旧值覆盖；JSON 不允许注释或多余的末尾逗号，也不要用一小段示例覆盖整个文件。

| 实例                             | 默认配置位置或查找方式                                                    |
| -------------------------------- | ------------------------------------------------------------------------- |
| Windows Qt 当前用户              | `%LOCALAPPDATA%\transmission`                                             |
| Windows daemon 当前用户          | `%LOCALAPPDATA%\transmission-daemon`                                      |
| 4.1.3 MSI 默认 LocalService 服务 | `%WINDIR%\ServiceProfiles\LocalService\AppData\Local\transmission-daemon` |
| 本文 Docker                      | 项目映射到 `/config` 的目录                                               |

自定义账户、启动参数与配置目录会改变这些位置，以实际进程和日志为准。Transmission 4.1 开始兼容 `rpc_enabled` 等下划线命名，4.x 默认保存仍为 `rpc-enabled` 等连字符形式，不要为同一项混写两套字段。

下面是 **Windows / 原生实例**的远程设置示例，替换账号、密码和客户端地址后合并到已有配置：

```json
{
  "rpc-enabled": true,
  "rpc-bind-address": "0.0.0.0",
  "rpc-port": 9091,
  "rpc-url": "/transmission/",
  "rpc-authentication-required": true,
  "rpc-username": "transmission-user",
  "rpc-password": "REPLACE_WITH_A_UNIQUE_PASSWORD",
  "rpc-whitelist-enabled": true,
  "rpc-whitelist": "127.0.0.1,192.168.1.30",
  "rpc-host-whitelist-enabled": true
}
```

`0.0.0.0` 表示监听所有 IPv4 接口，访问仍受白名单、防火墙和认证限制；仅本机使用可绑定 `127.0.0.1`。IP 白名单与 Host 白名单不同，经域名或反向代理访问时，还需核对 `rpc-host-whitelist` 中的实际域名。不要一次连接失败就永久关闭所有校验。

停机填写的密码启动后会保存为带盐校验形式，首次明文密码不要以 `{` 开头。Windows 路径在 JSON 中可写为 `D:/Downloads/Transmission` 或正确转义的 `D:\\Downloads\\Transmission`。

常用字段包括 `download-dir`、`incomplete-dir`、`incomplete-dir-enabled`、`download-queue-size`、`speed-limit-up`、`speed-limit-up-enabled`、`ratio-limit-enabled`、`idle-seeding-limit-enabled`、`peer-port` 与 `peer-port-random-on-start`。优先在界面调整，再按对应版本官方文档核对保存结果，不机械照抄旧版缓存和限速建议。

桌面版登录后自启动，可通过 `Win + R` 打开 `shell:startup`，放入 Transmission 快捷方式。希望无人登录也运行，则使用 Daemon 组件：4.1.3 MSI 的服务名为 `Transmission`，显示名为 `Transmission Daemon`，默认以 `LocalService` 自动运行，可在 `services.msc` 查看。下载目录需授予实际服务账户权限；用 Qt 管理服务时连接远程会话，避免另起一个本地后端。

## Aria2 与 AriaNg

Aria2 负责后台下载，AriaNg 通过 RPC 管理任务。网页可以放在浏览器里，文件仍保存到 NAS。Aria2 不直接提供各家网盘的账号登录与文件浏览，也不会解除会员限制、限速或下载地址有效期。

### 选择镜像并部署

本文沿用第三方项目 [superng6/docker-aria2][docker-aria2-repo]。依据下方参考资料中的 Dockerfile 与正式构建流程，使用已包含 AriaNg 的标准 `superng6/aria2:latest`，由 `WEBUI=true` 开启；旧教程中“`latest` 不含 WebUI、要选 `webui-latest`”的说法不适用于该构建。`a2b-latest` 是带额外 Peer 屏蔽功能的变体，本文先使用标准版。

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

### 连接 AriaNg 与 Aria2

打开 `http://NAS_IP:18080`，在 **AriaNg 设置 → RPC** 中填写：

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

### 直链、种子与磁力下载

新建任务时粘贴真实 HTTP / HTTPS 文件地址，批量提交按界面要求一行一个链接。分享页面和最终下载地址不同；得到 HTML 或立即失败时先核对链接类型。需登录的文件可能要求 Cookie、Referer 或其他请求头，也可能绑定来源 IP、User-Agent 或短期签名，电脑能下载不代表 NAS 一定能使用同一地址。

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

AList 后台的[离线下载][alist-offline]是另一条流程：提交外部链接，先下载到临时目录，再转移到选定存储。它需要 AList 读取下载结果，并正确共享临时目录和权限，不能只填写 RPC 就认为配置完成。本文这里只配置文件列表的“发送到 Aria2”。网盘挂载与管理继续参考[网盘篇](/posts/2026-10-10-cloud-storage-local-mount/)。

### Aria2 镜像参数与持久化

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

`SMD` 不等于自动重命名种子，后续处理还受 `/config/setting.conf` 的 `handle-torrent` 等设置控制，例如 `backup-rename`。通过 AriaNg RPC 修改的选项不一定永久保存；需要长期保留的设置，核对由 Compose、`/config/aria2.conf` 还是辅助脚本负责，并在重启后查看实际值。

## 与 MoviePilot 联动

qBittorrent 或 Transmission 先完成一次真实下载，再接入 [MoviePilot](/posts/2026-10-10-moviepilot-guide/)。下载器负责取得文件并保留做种任务，MoviePilot 负责识别、命名和整理，两边看到的路径必须对应同一份数据。

本文下载器都将相同 NAS 数据根目录挂载为 `/data`。MoviePilot 也挂载同一根目录，并按实际选用的下载器设置来源：

| 下载器       | 下载来源示例                   | 本地整理目标示例                             |
| ------------ | ------------------------------ | -------------------------------------------- |
| qBittorrent  | `/data/downloads/qbittorrent`  | `/data/library/movies` 或 `/data/library/tv` |
| Transmission | `/data/downloads/transmission` | `/data/library/movies` 或 `/data/library/tv` |

管理连接可使用 MoviePilot 所在容器能够访问的 `http://NAS_IP:8080` 或 `http://NAS_IP:9091`，填写下载器认证信息。如果已按[媒体流程文章](/posts/2026-10-09-debnas-media-workflow/#目录与容器路径规划)将服务加入同一用户定义的 Docker 网络，也可使用服务名和容器端口，例如 `http://qbittorrent:8080`；不同 Compose 项目的默认网络不会因为服务名相同就自动互通。

想继续做种时，先考虑**硬链接整理**：下载目录保留原名和结构，媒体库使用整理后的名称。源和目标必须位于同一文件系统，容器挂载也不能把它们隔成不兼容的边界；统一 `/data` 只是便于满足路径条件，不能跨硬盘或云盘硬链接。硬链接不是备份，对文件内容的原地修改会影响两边。

第一次联动按以下顺序核对：

1. MoviePilot 连接测试成功，能读取目标下载器的任务。
2. 下载分类、来源目录与整理规则匹配，先下发一个有权处理的小任务。
3. 下载完成后检查整理日志、目标文件和实际整理方式。
4. 下载器仍能校验并继续做种，媒体库能够识别和播放，再开启更多订阅。

手工添加到下载器的任务，不一定符合 MoviePilot 的分类与接管规则。不要把“任务完成”直接理解为“自动整理已完成”，也不要让多个工具同时移动或改名同一批文件。上传到云盘时采用适合该存储方式的复制流程，保留需做种的本地源文件；不能用硬链接完成跨云盘上传。

## 更新、备份与迁移

每个项目分别维护版本和备份，私有 `.env` 不进入公开文章或代码仓库。更新前记录当前镜像标签与 digest，正常停止服务后备份配置，保证任务状态一致：

```bash
# 在需要维护的那个 Compose 项目目录执行
docker compose stop
```

备份 `compose.yaml`、私有 `.env` 和整个 `config`。Transmission 的 `.torrent`、恢复状态和设置需一起保留，单独复制 `settings.json` 不足以恢复全部任务；qBittorrent 同样保留完整配置或 profile。下载文件另行规划备份，配置备份不会自动包含它们。

更新时拉取并重建：

```bash
docker compose pull
docker compose up -d
```

仅做备份则用 `docker compose start` 恢复。升级后检查管理登录、任务列表、路径、实际版本和一次下载或校验；不要只看容器显示“运行中”。

迁移时保持容器路径，核对 NAS 目录、权限及原文件。Windows 盘符、Linux 路径与容器路径不能混用。先校验少量任务，再恢复全部任务；Aria2 未完成文件旁的 `.aria2` 控制文件可能关系到续传，不要当作垃圾批量删除。

从列表移除任务与同时删除本地数据是不同操作。长期保种、有硬链接或多个任务共享文件时，先核对影响和站点要求，再选择删除方式。

## 常见问题

| 现象                                                | 优先检查                                                       |
| --------------------------------------------------- | -------------------------------------------------------------- |
| 管理网页打不开                                      | 容器或服务状态、端口占用、Docker 映射、防火墙与局域网隔离      |
| qBittorrent 初始密码不对                            | 当前实例的启动日志，是否连接了另一套实例，是否已修改密码       |
| Transmission 返回 `401`                             | 账号密码，以及管理工具保存的旧凭据                             |
| Transmission 返回 `403` / `Unauthorized IP Address` | 来访 IP 白名单，反向代理改变后的来源地址                       |
| Transmission 提示 `Invalid Hostname`                | 访问域名与 Host 白名单                                         |
| 直接访问 Transmission RPC 返回 `409`                | RPC 的会话 ID 握手；日常管理打开 Web 地址，兼容客户端处理握手  |
| Transmission 换 Web 后白屏或仍为旧界面              | `index.html` 层级、变量是否应用、读取权限与浏览器缓存          |
| AriaNg 网页正常但未连接                             | NAS 地址、`16800` RPC 端口、`jsonrpc` 路径和密钥               |
| HTTPS 的 AriaNg 连不上 HTTP RPC                     | 浏览器混合内容限制及 HTTPS / WSS 代理配置                      |
| 无权限、目录不存在或找不到已下载文件                | 实际挂载、容器内路径、UID / GID、ACL、空间和配额               |
| 磁力一直获取元数据                                  | 可用节点、DHT / UDP、Tracker 与网络情况                        |
| BT 没速度或上传很少                                 | 可用做种者、对端需求、队列、限速、自动停止条件与 Peer 入站条件 |
| 文件预分配失败                                      | 剩余空间、配额和文件系统是否支持所选模式                       |
| Aria2 网盘任务出现 `403` 或立即失败                 | 地址过期、认证头、来源 IP、网盘限流及任务错误信息              |
| 重启后配置恢复原状                                  | 是否在运行时编辑、是否改错实例，以及环境变量或脚本是否覆盖     |
| MoviePilot 看得到任务却不整理                       | 分类、来源路径、共享挂载、权限与整理日志                       |
| 硬链接失败或变成复制                                | 源和目标文件系统、容器挂载边界、权限和实际整理方式             |

按“后端运行 → 管理连接 → 目录写入 → 单个任务 → 自动整理”的顺序排查。任务突然全部消失时，先检查是否连接了另一实例，不要急着重加全部种子；更换界面出问题时先恢复内置界面，确认后端任务仍在。

## 参考资料

### qBittorrent 与目录联动

- [qBittorrent 官方下载页][qbt-download]与 [LinuxServer 镜像说明][qbt-image]。
- [MoviePilot 文件整理说明][mp-reorganize]与[官方安装说明][mp-install]。
- [DebNAS 媒体服务与自动化观影流程](/posts/2026-10-09-debnas-media-workflow/)：本文共享目录和保种整理方式沿用的站内说明。
- [Docker：host 网络说明][docker-host]。

### Transmission

- [官方安装包][tr-download]、[4.1.3 Web Interface][tr-web]、[Configuration Files][tr-config]。
- [4.1.3 Windows 安装组件][tr-msi]、[Daemon 服务定义][tr-service]、[环境变量][tr-env]与[定时限速实现][tr-alt-speed]。
- [4.1.3 Editing Configuration Files][tr-edit]与[4.0.6 连字符字段参考][tr-old-config]。
- [TrguiNG 上游][trguing]与[汉化分支][trguing-zh]：版本、发布页和前端兼容情况分别核对。
- [Transmission Web Control][tr-web-control]及其 [Windows 安装说明][tr-web-control-windows]：已归档的旧方案资料。
- 磕巴白菜：[绿联新系统部署 Transmission][keba-transmission]，提供 NAS 部署与汉化界面的实践参考；容器参数以 [LinuxServer 文档][tr-image]为准。
- 暮城：[Transmission 配置文件参数中文详细解释][tr-legacy-cn]，2022 年的旧版中文参考，默认值与字段需对照当前官方文档。

### Aria2、AriaNg 与 AList

- 磕巴白菜：[新绿联部署 Aria2 + AriaNg][keba-guide]：部署场景与流程参考，绿联界面截图见原文。
- [Aria2 官方手册][aria2-manual]与 [AriaNg 项目][ariang-repo]。
- [superng6/docker-aria2][docker-aria2-repo]，以及核对内置组件的 [Dockerfile][aria2-dockerfile]、[正式镜像构建流程][aria2-build]。
- [镜像初始化脚本][aria2-init]、[Tracker 定时任务][aria2-cron]与[辅助脚本配置][aria2-settings]。
- [Aria2 Explorer][explorer-repo]：扩展与官方商店安装入口。
- AList：[其他设置][alist-settings]与[离线下载][alist-offline]。

[qbt-download]: https://www.qbittorrent.org/download
[qbt-image]: https://docs.linuxserver.io/images/docker-qbittorrent/
[mp-reorganize]: https://wiki.movie-pilot.org/reorganize
[mp-install]: https://wiki.movie-pilot.org/install
[docker-host]: https://docs.docker.com/engine/network/drivers/host/
[tr-download]: https://transmissionbt.com/download
[tr-image]: https://docs.linuxserver.io/images/docker-transmission/
[tr-web]: https://github.com/transmission/transmission/blob/4.1.3/docs/Web-Interface.md
[tr-config]: https://github.com/transmission/transmission/blob/4.1.3/docs/Configuration-Files.md
[tr-msi]: https://github.com/transmission/transmission/blob/4.1.3/dist/msi/Transmission.wxs
[tr-service]: https://github.com/transmission/transmission/blob/4.1.3/dist/msi/components/Daemon.wxs
[tr-env]: https://github.com/transmission/transmission/blob/4.1.3/docs/Environment-Variables.md
[tr-alt-speed]: https://github.com/transmission/transmission/blob/4.1.3/libtransmission/session-alt-speeds.cc
[tr-edit]: https://github.com/transmission/transmission/blob/4.1.3/docs/Editing-Configuration-Files.md
[tr-old-config]: https://github.com/transmission/transmission/blob/4.0.6/docs/Editing-Configuration-Files.md
[trguing]: https://github.com/openscopeproject/TrguiNG
[trguing-zh]: https://github.com/jayzcoder/TrguiNG
[tr-web-control]: https://github.com/ronggang/transmission-web-control
[tr-web-control-windows]: https://github.com/ronggang/transmission-web-control/wiki/Windows-Installation-CN
[keba-transmission]: https://hi.keba.host/archives/transmission
[tr-legacy-cn]: https://cloud.tencent.com/developer/article/1966381
[keba-guide]: https://hi.keba.host/archives/ugreen-aria2
[aria2-manual]: https://aria2.github.io/manual/en/html/aria2c.html
[ariang-repo]: https://github.com/mayswind/AriaNg
[docker-aria2-repo]: https://github.com/superng6/docker-aria2
[aria2-dockerfile]: https://github.com/superng6/docker-aria2/blob/master/Dockerfile
[aria2-build]: https://github.com/superng6/docker-aria2/blob/master/.github/workflows/Build%20Image.yml
[aria2-init]: https://github.com/superng6/docker-aria2/blob/master/root/etc/cont-init.d/30-config
[aria2-cron]: https://github.com/superng6/docker-aria2/blob/master/root/aria2/conf/rpc-tracker1
[aria2-settings]: https://github.com/superng6/docker-aria2/blob/master/root/aria2/conf/setting.conf
[explorer-repo]: https://github.com/alexhua/Aria2-Explorer
[alist-settings]: https://alistgo.com/zh/config/other.html
[alist-offline]: https://alistgo.com/zh/guide/advanced/offline-download.html
