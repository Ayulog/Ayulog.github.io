---
title: Transmission 安装及使用教程
description: 以 Windows 为例安装 Transmission，配置下载、做种与远程访问，说明 TrguiNG 和 Transmission Web Control 的区别、Web 界面替换方法，并补充绿联 NAS 的 Docker 部署要点与常见故障排查。
author: Ayulog
pubDatetime: "2026-10-09T23:10:00+08:00"
draft: true
tags:
  - Windows
  - Transmission
  - PT
  - 下载工具
---

Transmission 是一个开源 BitTorrent 客户端，可以下载种子文件、处理磁力链接，也适合放在电脑或 NAS 上长期做种。它的桌面界面比较简洁；需要在浏览器里管理，或者同时连接几台下载设备时，还可以启用 Web 界面、搭配 TrguiNG。

这篇以 **Windows 10 / 11 上的 Transmission 为主**，按安装、添加任务、远程管理、更换界面的顺序整理。资料核对于 **2026 年 10 月 9 日**：官网下载页提供的版本为 **4.1.3**，实际安装时以官网下载页和所在 PT 站点允许的客户端版本为准。以下是依据官方文档与项目说明整理的操作流程，不是每种客户端组合的实机测试记录。

## 目录

- [先分清下载器与管理界面](#先分清下载器与管理界面)
- [第一步：安装 Transmission](#第一步安装-transmission)
- [第二步：设置目录与添加任务](#第二步设置目录与添加任务)
- [第三步：配置限速与做种](#第三步配置限速与做种)
- [第四步：开启 Web 与局域网访问](#第四步开启-web-与局域网访问)
- [第五步：选择 TrguiNG 或 Web Control](#第五步选择-trguing-或-web-control)
- [补充：绿联 NAS 与 Docker 部署](#补充绿联-nas-与-docker-部署)
- [进阶：修改 settings.json](#进阶修改-settingsjson)
- [自启动、备份与迁移](#自启动备份与迁移)
- [常见问题](#常见问题)
- [参考资料](#参考资料)

## 先分清下载器与管理界面

| 程序或界面               | 负责什么                                     | 适合的用法                           |
| ------------------------ | -------------------------------------------- | ------------------------------------ |
| Transmission Qt          | Windows 桌面客户端，本地模式下负责下载和做种 | 先在本机装好并跑通一个任务           |
| Transmission daemon      | 后台下载进程                                 | 希望不依赖桌面登录，持续运行下载任务 |
| 内置 Web 界面            | 通过浏览器控制正在运行的 Transmission        | 从手机或另一台电脑管理任务           |
| TrguiNG                  | 第三方管理界面，有桌面版和 Web 版            | 需要更丰富的列表、筛选和多服务器管理 |
| Transmission Web Control | 另一套第三方 Web 界面                        | 维护已有部署，或按需尝试旧界面       |

**先安装并运行 Transmission，再选择管理界面。** 单独安装 TrguiNG，不会凭空多出一个下载服务；关闭管理网页通常也不会停止下载，因为真正工作的仍是后端。

Qt 桌面客户端在本地模式下就能提供 Web 访问，不必为了使用浏览器管理再启动一个 daemon。两者同时运行时可能是两套独立配置，任务列表也不一定相同，还可能争用 `9091` 端口。

## 第一步：安装 Transmission

### 下载安装包

打开 [Transmission 官方下载页](https://transmissionbt.com/download)，在 Windows 区域选择适合系统架构的安装包。

核对时，常规 Windows 安装包要求 Windows 10 或更新版本，并提供 `x64` 和 `x86` 的 `.msi` 文件。大多数 Intel / AMD 的 64 位电脑选 `x64`；可以在 **设置 → 系统 → 系统信息** 中确认系统类型。官网另外列出的 Qt 5 包用于兼容较旧的 Windows，不需要在普通 Windows 10 / 11 安装中优先选它。

如果用于 PT，下载前先确认站点的客户端白名单。官网最新版与站点认可版本可能不同，不要因为版本号更新就直接替换正在稳定做种的客户端。

### 完成安装并启动桌面程序

运行 `.msi`，按安装向导完成安装。本文采用 **Qt client + Web interface**：Qt 是桌面客户端，Web interface 提供后面要使用的原版网页资源。4.1.3 安装器把 Web interface 列为可选组件，安装时需要确认已选中；若之前漏装，可以重新运行安装器修改组件。

普通桌面使用先不选 Daemon。4.1.3 的 Daemon 组件会安装并启动 Windows 服务，只有明确需要后台服务时再使用这种方式。

安装后从开始菜单打开 Transmission，使用本地会话。Windows 防火墙询问网络访问权限时，按实际网络环境选择；家庭局域网一般使用专用网络配置，不需要为管理界面随意放开所有网络。

第一次使用先确认三件事：程序能打开、下载目录可写、能添加一个任务。Web 界面替换和自动化工具都可以在这个基础上继续配置。

## 第二步：设置目录与添加任务

### 先确定保存目录

在 **编辑 → 偏好设置（Edit → Preferences）** 中查看下载设置，选择空间充足、长期稳定的保存位置。下面的路径只是示例：

```text
D:\Downloads\Transmission
D:\Downloads\Transmission-Incomplete
```

第一项用于完成后的文件，第二项可以用作未完成目录。是否分开按自己的整理习惯决定；若放在不同磁盘，完成时可能需要跨盘复制，耗时与空间占用都会增加。

远程管理时，保存路径始终属于**运行 Transmission 后端的机器**。在笔记本浏览器里控制 NAS，填入笔记本的 `D:\Downloads` 并不能让 NAS 把文件存到笔记本。

### 添加种子或磁力链接

1. 在客户端选择打开 `.torrent` 文件，或使用打开链接功能粘贴磁力链接。
2. 检查保存目录、文件选择和是否立即开始下载。
3. 添加后查看进度、连接的用户数，以及 Tracker 状态。
4. 下载完成后保留任务运行，就会进入做种状态；是否有上传取决于其他用户是否需要你的数据。

初次验证可以使用自己有权分享的文件，或公开发行的 Linux 安装镜像种子。PT 任务使用站点提供的种子文件，含 Passkey 的 Tracker 地址不要公开，也不要随意替换为网上收集的公共 Tracker。

### 给已有文件校验做种

已有完整文件时，可以重新添加对应种子，并让 Transmission 校验后继续做种：

1. 添加时取消立即开始，选好已有文件对应的保存位置。
2. 确认目录层级。种子内如果包含 `Example.Release` 文件夹，通常应选择它的上一级目录，并检查界面显示的最终路径。
3. 对任务执行 **校验本地数据 / Verify Local Data**。
4. 等待校验完成，确认进度达到 `100%` 后再开始任务。

只凭文件名相同不能保证内容一致。校验不足 `100%` 时，先检查版本、目录和文件完整性；直接开始会补下缺失或不匹配的部分，可能产生新的下载量。

## 第三步：配置限速与做种

### 上传、下载和队列

先保留默认连接数，根据实际带宽、硬盘负载和任务量调整。家用网络可以给上传留一点余量，避免长时间占满上行，影响网页、语音或其他设备。

带宽套餐常用 `Mbps`，客户端限速常用 `kB/s` 或 `KiB/s`，填写前先看界面单位。例如 `100 Mbps` 理论约为 `12.5 MB/s`，不能把 `100` 直接当成同等下载速度填入。

下载队列控制同时活跃的任务数量。任务显示排队时，先看队列限制；增加任务数不一定增加总速度，也可能让机械硬盘一直忙于随机读写。

### 小乌龟与定时限速

界面中的“小乌龟”用于切换备用速度限制，适合白天限制带宽、夜间恢复正常速度。定时计划会按设定时间切换备用限速状态；手动点击后，后续计划切换仍可能再次改变状态。

配置中的时间按**运行 Transmission 后端的系统本地时间**计算。若后端运行在服务器或容器里，先核对它的时区，不能直接把浏览器所在电脑的时间套进去，也不需要一律减去八小时。

### PT 任务的停止条件

检查全局和单个任务的分享率、空闲做种停止条件。想长期保种时，不能一边要求持续做种，一边保留很低的自动停止门槛。

PT 站点可能要求最短做种时长、分享率，或有 H&R 规则。客户端显示“已完成下载”不等于完成站点要求，Freeleech 也不一定免除做种义务。自动删种前，应以站点统计和规则为准。

## 第四步：开启 Web 与局域网访问

### 先在本机打开

在 Transmission Qt 中进入 **编辑 → 偏好设置 → 远程（Remote）**：

1. 勾选 **允许远程访问（Allow remote access）**。
2. 管理端口先保留 `9091`。
3. 开启身份验证，设置自己的用户名和独立密码。
4. 保留 IP 白名单，并允许 `127.0.0.1`。

然后在这台电脑的浏览器打开：

```text
http://127.0.0.1:9091/transmission/web/
```

能够登录并看到同一批任务，说明 Web 管理已经连上当前实例。直接访问 `http://127.0.0.1:9091/` 也可以进入默认管理入口。此时下载与 Web 都由 Qt 本地实例承载，真正退出 Qt 后就会一起停止；仅关闭窗口是否退出，要看托盘设置。

### 再允许局域网设备连接

假设运行 Transmission 的电脑地址为 `TRANSMISSION_IP`，管理它的另一台电脑是 `CLIENT_IP`：

1. 在允许访问的 IP 列表中增加 `192.168.1.30`，同时保留 `127.0.0.1`。
2. 确认 Windows 防火墙允许专用网络内的相应访问，必要时只给可信来源开放 TCP `9091`。
3. 在另一台电脑打开 `http://TRANSMISSION_IP:9091/transmission/web/`，输入刚设置的账号密码。

也可以按需要允许 `192.168.1.*` 这样的实际局域网网段，但范围越小越容易管理。白名单填写的是**来访设备的地址**；修改监听地址时，填写的才是后端自身的地址。

从另一台设备访问时，不能继续填 `127.0.0.1`，它代表那台设备自己。若主机地址经常变化，可以在路由器里为下载电脑设置 DHCP 地址保留。

### 两类端口不要混淆

| 端口               | 默认值                        | 用途                           |
| ------------------ | ----------------------------- | ------------------------------ |
| Web / RPC 管理端口 | TCP `9091`                    | 登录界面、读取和修改任务       |
| Peer 传输端口      | `51413`，按配置使用 TCP / UDP | 与其他 BitTorrent 用户交换数据 |

想改善外部用户连接，应检查 Peer 端口、防火墙、路由器映射和公网条件。**把 `9091` 映射到公网不会提高上传速度。**

需要从外网管理时，优先通过可信 VPN 或 SSH 隧道访问。普通 HTTP 管理连接本身不提供传输加密；仅设置密码也不等于启用了 HTTPS。

## 第五步：选择 TrguiNG 或 Web Control

内置界面能满足需求的话，这一步可以跳过。更换界面之前先确认原版 Web 能正常使用，后续出现问题时更容易判断是连接配置还是前端兼容性。

### TrguiNG：先选清楚上游与汉化分支

这两个地址属于不同仓库：

- [openscopeproject/TrguiNG](https://github.com/openscopeproject/TrguiNG)：上游项目，提供桌面版和 Web 版。
- [jayzcoder/TrguiNG](https://github.com/jayzcoder/TrguiNG)：基于上游的汉化与自用功能分支，发布节奏独立。

核对时，上游 Releases 标记的最新版本为 `v1.5.1`，汉化分支为 `trguing-web-v1.3.0-zh-240607a`。不能把它们当作完全同步的同一版本；选择时同时看功能、发布日期和与当前 Transmission 的兼容情况。

#### 方式一：安装 TrguiNG 桌面版

在[上游 Releases](https://github.com/openscopeproject/TrguiNG/releases) 中下载适合 Windows 架构的桌面安装包。安装后增加服务器，按界面填写后端地址、端口、RPC 路径和认证信息：

| 项目         | 本机示例                          |
| ------------ | --------------------------------- |
| 主机         | `127.0.0.1`                       |
| 协议         | `http`                            |
| 端口         | `9091`                            |
| RPC 路径     | `/transmission/rpc`               |
| 用户名与密码 | Transmission 远程设置中配置的凭据 |

若版本使用完整 URL 输入框，对应地址是 `http://127.0.0.1:9091/transmission/rpc`。这里连接的是 RPC 接口，不是浏览器页面的 `/transmission/web/`。

连接成功后检查任务列表和保存路径。TrguiNG 显示的是后端任务，文件仍由后端保存；关闭 TrguiNG 后，只要 Transmission 还在运行，任务通常会继续。

#### 方式二：把 TrguiNG 设为 Transmission 的 Web 界面

从选定仓库的 Releases 下载 Web 压缩包。例如上游核对时提供 `trguing-web-v1.5.1.zip`。不要把 GitHub 自动生成的 `Source code (zip)` 当成可直接部署的网页包。

1. 解压到独立目录，例如 `D:\Apps\TrguiNG-Web`。
2. 确认这个目录下直接存在 `index.html`，不是多套了一层压缩包目录。
3. 完全退出当前 Transmission Qt 实例。
4. 用下面的 PowerShell 示例，让这次启动的 Transmission 使用该目录；程序安装路径按实际修改。

```powershell
$env:TRANSMISSION_WEB_HOME = 'D:\Apps\TrguiNG-Web'
& 'C:\Program Files\Transmission\transmission-qt.exe'
```

这段命令只为当前 PowerShell 会话及其新启动的进程设置变量。重新打开 `http://127.0.0.1:9091/transmission/web/`，必要时强制刷新，确认界面已变为 TrguiNG，且能看到原来的任务。

确认可用后，可以在 Windows 的 **系统属性 → 高级 → 环境变量** 中，为运行桌面客户端的用户新增：

```text
变量名：TRANSMISSION_WEB_HOME
变量值：D:\Apps\TrguiNG-Web
```

重新启动程序；若启动它的会话仍保留旧环境，注销并重新登录后再试。回退时删除自己添加的变量，重启 Transmission，即可重新使用默认 Web 资源。

服务方式运行的 daemon 使用服务进程的账户和环境，当前登录用户的环境变量未必对它生效。应检查服务账户、资源目录读取权限及实际启动环境，修改后重启服务；不要一边配置桌面用户的变量，一边期待另一个账户运行的服务自动切换。

### Transmission Web Control：适合了解旧部署

[ronggang/transmission-web-control](https://github.com/ronggang/transmission-web-control) 提供多语言和较丰富的 Web 管理功能，但仓库已于 **2025 年 6 月 1 日归档**，README 也明确说明停止维护。新装环境可以先使用内置界面或考察 TrguiNG，再决定是否需要它。

它的 [Windows 安装说明](https://github.com/ronggang/transmission-web-control/wiki/Windows-Installation-CN) 可以帮助理解旧版资源目录的替换方式。实际使用时，应先备份原 Web 资源，按所下载版本的说明放置完整网页文件，并确认 `index.html` 所在层级。也可以利用 `TRANSMISSION_WEB_HOME` 指向独立的网页目录，减少直接覆盖安装目录的操作。

旧 Wiki 中的路径和截图不能保证与当前 MSI 完全一致。升级 Transmission 或换界面后，应实际验证登录、添加任务、文件选择、暂停和删除等操作；界面能打开，不代表所有 RPC 操作都兼容。

## 补充：绿联 NAS 与 Docker 部署

如果打算把 Transmission 放到绿联 NAS 上长期保种，可以参考磕巴白菜的[《绿联新系统部署transmission，PT保种党的最佳拍档》](https://hi.keba.host/archives/transmission)。原文介绍了 Docker / Compose 部署、配置与下载目录持久化，以及替换 TrguiNG 汉化 Web 界面的方法。下面补充其中与前文 Windows 用法不同的地方。

### 先配置后端与持久化目录

原文使用的是 **LinuxServer 维护的 Transmission 镜像**。在 NAS 的 Docker 应用或 Compose 项目中部署时，以 [LinuxServer 当前文档](https://docs.linuxserver.io/images/docker-transmission/)为准，先确定目录映射：

| 容器内路径   | 用途                       | NAS 上的准备                                   |
| ------------ | -------------------------- | ---------------------------------------------- |
| `/config`    | 保存配置及任务状态等数据   | 映射到固定的配置目录，重建容器时继续使用       |
| `/downloads` | 保存下载文件               | 映射到空间充足的数据目录，并给运行账户读写权限 |
| `/watch`     | 自动加载放入其中的种子文件 | 按需映射；不用自动监视功能时可省略             |

这些是容器看到的路径。假如 NAS 的下载目录映射为 `/downloads`，在 Transmission 中就应填写 `/downloads` 或其子目录；换成其他容器路径时，下载设置也要相应调整。配置目录与下载数据都应持久化，不能只保留容器本身。

`PUID`、`PGID` 按实际运行用户、用户组及目录权限填写；管理账号和独立密码通过镜像的 `USER`、`PASS` 环境变量设置。不要直接沿用原文的 `root/root` 凭据，也不必默认把 UID / GID 都设为 `0`。

采用 bridge 网络时，按需发布 Web 管理端口 `9091/TCP` 和 Peer 端口 `51413/TCP`、`51413/UDP`，再从局域网打开 `http://NAS_IP:9091/transmission/web/`；`NAS_IP` 替换为设备实际地址。原文同时列出了 host 网络和 `ports`，但 [host 网络下端口映射不生效](https://docs.docker.com/engine/network/drivers/host/)，部署时应按选定的网络模式配置。

原文提到的 `4.0.5`、`4.0.6` 属于当时的版本背景，示例中的 `latest` 也不会固定在这些版本。用于 PT 时，先核对站点白名单，再选择可用的镜像标签并确认容器实际运行的 Transmission 版本。

### 在容器中换成 TrguiNG 汉化界面

先确认容器自带 Web 界面能够登录并管理任务，再从前文提到的 [jayzcoder/TrguiNG Releases](https://github.com/jayzcoder/TrguiNG/releases) 下载编译好的 Web 压缩包。

1. 在 NAS 上映射到 `/config` 的目录中创建 `webui/trguing-zh`，解压完整网页文件。
2. 确认从容器内看，入口文件直接位于 `/config/webui/trguing-zh/index.html`，并且运行账户有读取权限。
3. 将下面的变量合并到 Transmission 服务已有的 `environment` 中，保留原来的账户、时区等配置。
4. 在 NAS 的 Compose 管理界面重新部署项目，使新环境变量生效，再刷新管理页面。

```yaml
environment:
  TRANSMISSION_WEB_HOME: /config/webui/trguing-zh
```

这里的变量值是**容器内路径**，不是 NAS 宿主机目录，也不是 Windows 的 `D:\Apps\TrguiNG-Web`。仅重启旧容器不会应用新加的环境变量；需要通过 Compose 更新或重建容器。回退时移除自己添加的变量并重新部署，即可恢复镜像默认 Web 界面。

后续手动修改容器的 `settings.json` 时，同样先停止容器并备份配置；文件位于映射的 `/config` 目录中。LinuxServer 镜像的认证与白名单应按镜像文档通过 `USER`、`PASS`、`WHITELIST`、`HOST_WHITELIST` 等环境变量管理，不要直接套用下文 Windows 的 RPC 配置片段，或把账号密码手动写入 `settings.json`。

## 进阶：修改 settings.json

### 先找到当前实例真正使用的配置

普通当前用户环境下，Windows 默认配置目录通常为：

```text
Transmission Qt：%LOCALAPPDATA%\transmission
Transmission daemon：%LOCALAPPDATA%\transmission-daemon
```

可以把对应路径粘贴到资源管理器地址栏。若使用了自定义配置目录、不同运行账户或 Windows 服务，应以该实例的启动参数和日志为准，不能直接修改当前用户目录后就认为服务已经生效。

修改前**正常退出对应客户端或停止服务，备份配置目录，再编辑 `settings.json`**。程序运行时改文件，可能在退出时被旧值覆盖。JSON 不允许注释和多余的末尾逗号；示例中的字段应合并进已有配置，不要用一小段示例覆盖整个文件。

### Transmission 4 的常用字段

Transmission 4.1 开始兼容下划线形式的新命名，例如 `rpc_enabled`；**4.x 默认保存格式仍使用连字符**，例如 `rpc-enabled`。官方新文档展示的字段可能与本地文件不同，应看清版本和保存格式，不要在同一个文件里为同一设置同时保留两种写法。

下面采用 Transmission 4 默认的连字符形式，列出局域网远程访问相关字段。用户名、密码和 IP 都是示例，必须按自己的环境替换：

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

`0.0.0.0` 表示在所有 IPv4 接口上监听，访问范围仍要靠白名单、防火墙和认证限制；如果只在本机使用，可以绑定 `127.0.0.1`。`rpc-bind-address` 控制管理接口，与 Peer 传输地址是不同设置。

密码可以在停机时填写明文，Transmission 启动后会保存为带盐的校验形式，所以文件中不再显示原密码是正常现象。首次填写的明文密码不要以 `{` 开头；这个保存机制也不能代替 HTTPS 的传输保护。

IP 白名单和 Host 白名单是两回事。使用 IP 地址访问时，先处理客户端 IP 白名单；使用自己的域名或反向代理时，还可能需要在 `rpc-host-whitelist` 中加入实际域名。不要遇到一次拒绝访问就把所有校验永久关闭。

其他常用项可以先通过界面调整：

| 字段                                       | 作用                             |
| ------------------------------------------ | -------------------------------- |
| `download-dir`                             | 默认下载保存目录                 |
| `incomplete-dir`、`incomplete-dir-enabled` | 未完成目录及其开关               |
| `download-queue-size`                      | 启用下载队列时允许的活跃下载数量 |
| `speed-limit-up`、`speed-limit-up-enabled` | 正常模式上传限速及其开关         |
| `ratio-limit-enabled`                      | 是否按全局分享率条件停止做种     |
| `idle-seeding-limit-enabled`               | 是否在长时间没有上传后停止做种   |
| `peer-port`、`peer-port-random-on-start`   | Peer 端口与启动时随机端口开关    |

Windows 路径写进 JSON 时，可以使用 `D:/Downloads/Transmission`，或正确转义为 `D:\\Downloads\\Transmission`。直接写一个反斜杠可能构成非法转义。

旧版中文参数表适合查找概念，但默认值、字段和建议应再对照相应版本的官方文档。比如缓存大小不应机械设为内存的四分之一，定时限速也不是固定按 GMT 换算；先观察磁盘、内存和实际时区，再考虑调整。

## 自启动、备份与迁移

桌面客户端可以设置登录后启动，例如按 `Win + R` 输入 `shell:startup`，在启动文件夹中放入 Transmission 的快捷方式。它需要用户登录后才会启动。

如果希望无人登录也能下载，可以使用安装器提供的 Daemon 组件。4.1.3 MSI 安装的服务名称为 `Transmission`，显示名称为 `Transmission Daemon`，默认以 `LocalService` 账户自动运行。可以通过 `services.msc` 查看服务状态；若再使用 Qt 管理它，应连接远程会话，避免另起一个本地下载后端。

默认服务账户的配置通常位于 `%WINDIR%\ServiceProfiles\LocalService\AppData\Local\transmission-daemon`，但自定义账户和配置目录会改变这一位置。先核实实际服务身份与参数，再停止服务、备份并编辑配置；下载目录也需要授予实际服务账户合适的读写权限。

计划迁移或升级前，正常停止 Transmission，备份整个配置目录和重要下载数据。任务相关的 `.torrent`、恢复状态及设置应一并保留；仅复制 `settings.json` 不能保证原任务完整恢复。

迁移到另一台机器后，先核对路径和文件权限，再校验已有数据。Windows 盘符、Linux 路径与 Docker 容器路径并不通用；校验完成前，先不要让全部任务自动开始下载。

删除任务时也要看清选项：**从列表移除任务**与**同时删除本地数据**是不同操作。目录里存在硬链接或多个任务共享文件时，更要先确认影响范围。

## 常见问题

| 现象                                   | 优先检查                                                                   |
| -------------------------------------- | -------------------------------------------------------------------------- |
| 本机也打不开 `9091`                    | Transmission 是否运行、是否启用远程访问、端口是否改变或被另一实例占用      |
| 提示找不到 Web 资源                    | 安装时是否选了 Web interface，自定义 Web 目录是否存在且可读                |
| 本机能打开，手机打不开                 | 是否填了后端局域网 IP、客户端 IP 白名单、防火墙、访客 Wi-Fi 隔离和监听地址 |
| 出现 `401`                             | 账号密码是否正确，管理工具是否保存了旧凭据                                 |
| 出现 `403` / `Unauthorized IP Address` | 来访地址是否在 RPC IP 白名单中，反向代理是否改变了来源地址                 |
| 提示 `Invalid Hostname`                | 域名与 Host 白名单是否匹配                                                 |
| 直接打开 RPC 地址出现 `409`            | RPC 使用会话 ID 握手；浏览器日常管理应打开 Web 地址，兼容客户端会处理握手  |
| 更换 Web 后白屏或仍是旧界面            | `index.html` 层级、运行进程是否继承变量、静态资源权限和浏览器缓存          |
| 修改配置后恢复原状                     | 是否在运行时编辑，是否改错账户或改到另一个实例的目录                       |
| 添加后没有速度                         | 队列、暂停状态、限速、Tracker 错误、在线做种者和实际可用数据               |
| 能下载却很少上传                       | 是否有人需要数据、是否已自动停止做种，以及 Peer 端口可达性                 |
| 无法写入文件                           | 后端账户权限、目录存在性、剩余空间，服务账户能否访问网络共享               |

浏览器界面出现问题时，可以先恢复内置 Web，确认后端任务还在，再定位第三方界面的兼容性。任务全部消失则先检查是否连到了另一套 Transmission 实例，不要急着重新添加所有种子。

## 参考资料

- [Transmission 官方下载页](https://transmissionbt.com/download)。
- [Transmission 4.1.3：Web Interface](https://github.com/transmission/transmission/blob/4.1.3/docs/Web-Interface.md)。
- [Transmission 4.1.3：Configuration Files](https://github.com/transmission/transmission/blob/4.1.3/docs/Configuration-Files.md)。
- [Transmission 4.1.3：Windows 安装组件](https://github.com/transmission/transmission/blob/4.1.3/dist/msi/Transmission.wxs)与 [Daemon 服务定义](https://github.com/transmission/transmission/blob/4.1.3/dist/msi/components/Daemon.wxs)。
- [Transmission 4.1.3：环境变量](https://github.com/transmission/transmission/blob/4.1.3/docs/Environment-Variables.md)与[定时限速实现](https://github.com/transmission/transmission/blob/4.1.3/libtransmission/session-alt-speeds.cc)。
- [Transmission 4.1.3：Editing Configuration Files](https://github.com/transmission/transmission/blob/4.1.3/docs/Editing-Configuration-Files.md)，包含新旧配置命名的说明。
- [Transmission 4.0.6：连字符配置字段参考](https://github.com/transmission/transmission/blob/4.0.6/docs/Editing-Configuration-Files.md)。
- [TrguiNG 上游项目](https://github.com/openscopeproject/TrguiNG)与[汉化分支](https://github.com/jayzcoder/TrguiNG)。
- [Transmission Web Control](https://github.com/ronggang/transmission-web-control)及其 [Windows 安装说明](https://github.com/ronggang/transmission-web-control/wiki/Windows-Installation-CN)。
- 磕巴白菜：[《绿联新系统部署transmission，PT保种党的最佳拍档》](https://hi.keba.host/archives/transmission)，作为绿联 NAS 部署与 TrguiNG 汉化界面配置的补充参考。
- [LinuxServer：Transmission 镜像文档](https://docs.linuxserver.io/images/docker-transmission/)与 [Docker：host 网络说明](https://docs.docker.com/engine/network/drivers/host/)。
- [暮城：Transmission 配置文件参数中文详细解释](https://cloud.tencent.com/developer/article/1966381)，发表于 2022 年，作为旧版参数的中文阅读参考。
- [Transmission 论坛相关讨论](https://forum.transmissionbt.com/viewtopic.php?t=18976)：保留补充阅读入口，本次未能核实正文，未据此推导操作步骤。
