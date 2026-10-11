---
title: Transmission 安装与设置
description: 在 Docker 或 Windows 上安装 Transmission，配置下载与做种、Web 和 TrguiNG、RPC 白名单、settings.json 与备份迁移。
author: Ayulog
pubDatetime: "2026-10-10T14:15:00+08:00"
draft: false
setupCategory: pt
tags:
  - Transmission
  - PT
  - Docker
  - Windows
  - 下载器
---

Transmission 可以使用桌面 Qt、本机 daemon 或 NAS 上的 Docker 后端。它们各有自己的配置和任务；先确定要管理哪个实例，再选择内置 Web 或 TrguiNG。

## 目录和权限

单独建立项目目录，例如 `stacks/transmission/`，将下文的 `compose.yaml` 与 `.env` 放在里面。`./config` 保存这个下载器的配置，下载文件另放在 NAS 数据盘。

本文把 NAS 数据根目录映射到容器的 `/data`，供下载器和 MoviePilot 共用：

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

`/path/to/data` 是待替换路径，先在 NAS 上创建实际目录。通过 `id nasuser` 查询负责写入的账户，把 `nasuser` 换成自己的账户名，并给它配置和数据目录的读写权限。不要直接使用 `0/0` 或给整个共享目录开放 `777`。

在项目的 `.env` 中填写：

```dotenv
# 实际服务账户的 UID / GID
PUID=
PGID=
# NAS 上已经存在的数据根目录
MEDIA_ROOT=/path/to/data
```

需要长期做种时，先核对站点允许的客户端版本。下文 `latest` 是可变标签，使用稳定后记录实际版本或镜像 digest。管理入口通过局域网或私有组网访问；BT 入站端口与管理端口分开配置。

## 在 NAS 上使用 Docker Compose

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

## 添加任务与校验已有文件

打开 `.torrent` 或粘贴磁力链接，核对文件选择、保存位置和是否立即开始。下载完成后保持任务运行即可进入做种，实际上传仍取决于是否有其他用户需要数据。

已有文件需要继续做种时：

1. 添加对应种子，取消立即开始。
2. 选择已有文件的保存位置，核对种子内的目录层级。例如种子包含 `Example.Release` 文件夹，通常选择它的上一级，并确认最终路径。
3. 执行 **校验本地数据 / Verify Local Data**。
4. 等待达到 `100%` 后再开始；不足时先核对版本、目录和文件完整性，直接开始会补下载缺失或不匹配的部分。

限速与队列先按实际负载调整。“小乌龟”是备用速度开关，定时计划按后端的本地时间计算，后续计划切换还可能覆盖手动切换的状态。无需一律按 GMT 减去八小时。

长期保种时检查全局和单任务的分享率、空闲做种停止条件。**下载完成不等于满足 PT 的最短做种时长、分享率或 H&R 规则**，Freeleech 也不一定免除做种义务，自动删种前以站点规则和统计为准。

## 选择 TrguiNG 或内置 Web

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

## Windows 安装与局域网管理

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

## 修改 settings.json 与 Windows 自启动

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

## 备份和迁移

正常退出客户端或停止服务，备份整个配置目录和重要下载文件。`.torrent`、恢复状态与设置要一起保留，单独复制 `settings.json` 不能恢复全部任务。Docker 更新前同样停止容器，备份私有 `.env`、Compose 和 `config`，再拉取并重建。

迁移后核对保存路径、账户权限，先校验少量任务再批量恢复。任务突然消失时，先检查是否连接了另一实例。移除任务和同时删除本地数据是不同操作，有跨站任务或硬链接时先确认影响。

## 常见问题

| 现象                          | 检查位置                                                  |
| ----------------------------- | --------------------------------------------------------- |
| 本机打不开 9091               | 程序是否运行、远程访问开关、端口冲突与监听地址            |
| 找不到 Web 资源               | 是否安装 Web interface，自定义目录是否有可读的 index.html |
| 本机能打开，手机不能          | 后端局域网 IP、客户端白名单、防火墙和访客 Wi-Fi 隔离      |
| 401                           | 账号密码，管理工具是否保存旧凭据                          |
| 403 / Unauthorized IP Address | 来源 IP 白名单，代理是否改变来源地址                      |
| Invalid Hostname              | 域名与 Host 白名单                                        |
| RPC 地址返回 409              | RPC 会话 ID 握手；日常打开 Web 地址，兼容客户端会处理握手 |
| 换界面后白屏                  | 网页层级、环境变量、读取权限与浏览器缓存                  |
| 修改设置后恢复原状            | 是否运行中修改，是否改错实例，以及环境变量是否覆盖        |
| 没速度或上传很少              | 队列、限速、Tracker、在线用户、停止条件和 Peer 入站端口   |
| 无法写文件                    | 后端账户、目录权限、空间、配额和网络共享访问权限          |

## 参考资料

- [官方安装包][tr-download]、[4.1.3 Web Interface][tr-web]、[Configuration Files][tr-config]。
- [4.1.3 Windows 安装组件][tr-msi]、[Daemon 服务定义][tr-service]、[环境变量][tr-env]与[定时限速实现][tr-alt-speed]。
- [4.1.3 Editing Configuration Files][tr-edit]与[4.0.6 连字符字段参考][tr-old-config]。
- [TrguiNG 上游][trguing]与[汉化分支][trguing-zh]：版本、发布页和前端兼容情况分别核对。
- [Transmission Web Control][tr-web-control]及其 [Windows 安装说明][tr-web-control-windows]：已归档的旧方案资料。
- 磕巴白菜：[绿联新系统部署 Transmission][keba-transmission]，提供 NAS 部署与汉化界面的实践参考；容器参数以 [LinuxServer 文档][tr-image]为准。
- 暮城：[Transmission 配置文件参数中文详细解释][tr-legacy-cn]，2022 年的旧版中文参考，默认值与字段需对照当前官方文档。

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
