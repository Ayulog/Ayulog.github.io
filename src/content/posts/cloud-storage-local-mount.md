---
title: CloudDrive2：网盘挂载、目录共享与缓存
description: 把网盘挂成 Linux NAS、fnOS 或 Windows 上的本地目录或盘符，处理 FUSE、挂载传播与缓存。
author: Ayulog
pubDatetime: "2026-10-10T10:00:00+08:00"
draft: false
category: nas
tags:
  - 网盘
  - CloudDrive2
  - WebDAV
  - Docker
---

播放器或媒体软件只认本地路径时，CloudDrive2 把网盘显示成 NAS 目录或 Windows 盘符。文件仍在远端，打开需要网络；目录里能看到文件，本地未必有离线副本。

支持的网盘可以直接添加；已经在 [AList](/posts/alist-guide/) 里配好存储的，把它的 WebDAV 接进来再挂载成本地路径。其他家庭影音工具见 [NAS 服务清单](/posts/nas-software-websites/)。

可写挂载中的删除、移动和覆盖可能直接修改网盘原文件。第一次只挂一个测试目录，确认路径和读写范围后再交给自动整理程序。

## 准备目录和运行环境

### 先确定挂载发生在哪里

在电脑浏览器里打开 NAS 的管理页面，挂载出来的目录仍然属于 **NAS**，不会自动出现在电脑的磁盘列表中。希望 Windows 上出现盘符，就在 Windows 上运行挂载程序，或者使用支持 WebDAV 的本地客户端。

下面的 CloudDrive2 Docker 配置针对支持 FUSE 和挂载传播的 **Linux Docker Engine / NAS 环境**。[Docker 文档][docker-propagation]明确说明 Docker Desktop 不支持挂载传播，这套配置也就不能当作 Windows 盘符方案。

按环境选择安装方式：

| 环境                                            | 本文采用的方式                                 |
| ----------------------------------------------- | ---------------------------------------------- |
| Debian / DebNAS，以及允许 FUSE 和共享挂载的 NAS | CloudDrive2 Docker Compose                     |
| 飞牛 fnOS                                       | 按当前官方帮助安装 CloudDrive2 原生 `fpk` 套件 |
| Windows 10 / 11                                 | 安装 CloudDrive2 核心服务与所需 WinFSP 驱动    |

### 把配置、挂载与缓存分开

下面是目录示意，实际位置按自己的磁盘和共享文件夹调整：

```text
docker/
└── clouddrive2/
    ├── compose.yaml
    └── config/

cloud-mount/         # 映射给 CloudDrive2 和其他容器的父目录
└── all/             # 实际接收云盘挂载的空目录
cloud-cache/         # 需要自定义磁盘缓存时再配置
```

CloudDrive2 配置必须持久化。挂载目录则应独立准备，不要直接覆盖现有下载、照片或媒体库目录，也不要把配置和缓存存进云盘挂载内部。

后面的 `/path/to/cloud-mount` 是**宿主机绝对路径占位符**。请从 NAS 文件管理器或 SSH 查到真实路径后替换；电脑访问 NAS 时使用的 `\\NAS\共享目录`，不能直接填进 Linux 容器的路径配置。

<span id="路线一安装-clouddrive2"></span>

## 安装 CloudDrive2

### Linux / NAS：使用 Docker Compose

先创建项目目录、`config` 子目录，以及宿主机上的 `/path/to/cloud-mount/all` 空目录。下文把父目录映射进容器，在 `all` 子目录创建实际挂载，便于其他容器接收后续的挂载变化。具备 SSH 管理权限时，检查宿主机 FUSE 设备与目录所在文件系统的挂载传播属性：

```bash
ls -l /dev/fuse
findmnt -T /path/to/cloud-mount -o TARGET,PROPAGATION
```

`/dev/fuse` 应存在，目标目录所在挂载应支持 `shared` 传播。如果是 `private`，先按 [CloudDrive2 官方 Docker 指南][cd2-docker]及当前 NAS 的系统要求处理。修改传播设置是否重启后保留，也要一并检查；品牌 NAS 不要直接套用其他发行版的 Docker 服务配置。

在项目目录保存 `compose.yaml`：

```yaml
services:
  clouddrive2:
    image: cloudnas/clouddrive2:amd64
    container_name: clouddrive2
    restart: unless-stopped
    environment:
      TZ: Asia/Singapore
      CLOUDDRIVE_HOME: /Config
    volumes:
      - ./config:/Config
      - /path/to/cloud-mount:/CloudNAS:shared
    devices:
      - /dev/fuse:/dev/fuse
    privileged: true
    pid: host
    network_mode: host
```

这份示例沿用官方部署方式，需要按设备检查以下几项：

- **镜像架构**：示例的 `amd64` 对应 x86-64；ARM64 改用 `arm64`，官方的 ARMv7 标签为 `arm32`。不要按电脑架构替 NAS 选镜像。
- **挂载传播**：`/CloudNAS:shared` 让容器内创建的挂载能够传播到宿主机，不能随手删去 `shared`。
- **运行权限**：FUSE 需要设备与相应挂载权限。官方示例使用特权容器和宿主机 PID 命名空间，权限较高，应使用已核实的官方镜像，只映射需要的目录。
- **网络**：这里使用 `host`，管理界面直接监听宿主机 `19798` 端口，不再同时写 `ports`。端口已被占用时先处理冲突。

如果只是把网盘挂出来，不需要把 NAS 的整个存储空间映射进去。需要让 CloudDrive2 读取某个本地目录进行上传或备份时，再单独添加该目录映射。

在 Compose 所在目录执行，或在 NAS 的 Compose 项目界面部署：

```bash
docker compose config
docker compose up -d
docker compose ps
docker compose logs --tail=100 clouddrive2
```

然后用浏览器访问 `http://NAS_IP:19798`，将 `NAS_IP` 替换为设备的局域网地址。网页能打开只说明管理服务可用，接下来还要验证实际挂载。

### 飞牛 fnOS：按官方说明安装原生套件

当前 [CloudDrive2 帮助页][cd2-help]专门说明，fnOS 的 Docker FUSE 挂载可能遇到命名空间限制，并建议使用官方提供的原生 `fpk` 套件。

1. 打开 [CloudDrive2 下载页][cd2-download]，找到 fnOS 核心服务安装包。
2. 按 NAS 架构选择 `x86_64` 或 `aarch64`，通过 fnOS 的手动安装入口安装。
3. 按套件提示完成目录访问授权，启动服务。
4. 打开 `http://NAS_IP:19798`，继续添加网盘与挂载点。

原生套件中的挂载目标使用 **NAS 本机的空目录**。后文 `/CloudNAS` 是 Docker 示例的容器路径，不能原样照搬到原生套件里。

### Windows：安装核心服务

从 [CloudDrive2 下载页][cd2-download]的**核心服务安装包**区域，选择 Windows `x64` 或 `Arm64` 版本，按向导安装，并完成 WinFSP 驱动安装及所需重启。

安装后打开 `http://localhost:19798`。如果没有响应，在 Windows 服务管理器中检查 `CloudDrive2 Service` 是否运行。这里只在本机使用时，不需要配置路由器端口转发。

官网同时提供带播放器的 CloudDrive2 应用，两者运行方式和挂载可见范围不同。本文选择核心服务，便于后台运行；需要供 SMB 或以服务方式运行的软件访问时，也应按官方说明使用核心服务创建的挂载。

## 添加网盘并挂载到本地

### 登录并添加云存储

1. 第一次使用，注册 CloudDrive 账号并完成邮箱验证；已有账号直接登录。
2. 打开 **云存储 → 添加云存储**，选择实际使用的网盘及当前可用驱动。
3. 按界面要求扫码或授权，完成后进入“我的文件”确认能够列出目录。
4. 先打开一个小文件，确认授权、网络和下载能力都正常，再继续挂载。

CloudDrive 账号与网盘账号是两回事。网盘要求的会员、接口权限和下载限制，也不会因为安装了挂载软件而自动解除。可连接网盘数、挂载点数及高级功能额度，看官网会员说明和账号界面里的数字。

以 115 为例，当前官方帮助要求使用 **`115open`**；旧教程里的私有 `115` 接口已经下线。其他网盘同样看当前驱动说明，旧截图中的 Cookie 或 Token 获取方法不要照搬。

### 新建挂载点

在 **挂载点 → 添加挂载点** 中设置：

| 项目                      | 怎么填写                                      |
| ------------------------- | --------------------------------------------- |
| 挂载名称                  | 自己能认出的名称，例如“聚合网盘”              |
| 源目录                    | 选一个网盘或子目录；填 `/` 表示聚合后的根目录 |
| Docker 挂载目标           | 本文示例填写容器内的 `/CloudNAS/all`          |
| Linux / fnOS 原生挂载目标 | 已创建、已授权的本机空目录                    |
| Windows 挂载目标          | 一个尚未占用的盘符，例如 `X:`                 |
| 只读                      | 首次验证建议勾选，需要上传时再调整            |
| 启动时自动挂载            | 需要开机恢复时勾选，并完成后面的重启验收      |

本文使用一个挂载点承接聚合根目录。源目录选 `/` 时，各网盘按 CloudDrive2 中的名称出现在下一级；如果只选某个网盘目录，挂载后显示的就是该目录内容，层级会不同。

Docker 示例中的对应关系是：

```text
CloudDrive2 的聚合根目录 /
        ↓ 挂载
容器内 /CloudNAS/all
        ↓ shared 传播
NAS 本机 /path/to/cloud-mount/all
```

### 验证本地确实能读到

Linux / NAS 可以在宿主机检查：

```bash
findmnt -T /path/to/cloud-mount/all
ls -la /path/to/cloud-mount/all
```

确认 `findmnt` 显示的是 CloudDrive2 创建的 FUSE 挂载，而不只是下层的本地文件系统。然后打开一个网盘子目录，读取小文件；Windows 则从资源管理器进入选定盘符检查。

再测试一次视频播放与拖动进度。**能列出文件名、能读取内容、能持续播放是三项不同的验证**，三项都过再扩大范围。

<span id="先选适合自己的路线"></span>

## 接入 AList 的 WebDAV

AList 的部署、专用用户与路径权限见 [AList 教程](/posts/alist-guide/)。配置好之后，在 CloudDrive2 的“添加云存储”中选择 WebDAV，填写：

```text
地址：http://NAS_IP:5244/dav/
用户名：专用 AList 用户
密码：该 AList 用户的密码
```

地址必须能从运行 CloudDrive2 的机器访问。普通 bridge 容器中的 `localhost` 是容器自身，不能照搬电脑浏览器里的本机地址。

保存后先打开一个小文件，再给这个 WebDAV 存储创建挂载点。已有聚合根目录挂载时，新存储会出现在根目录下，先检查层级，不必重复创建挂载点。

<span id="路线二alist-聚合后通过-webdav-接入"></span>
<span id="部署-alist"></span>
<span id="添加存储并验证"></span>
<span id="准备-webdav-用户与地址"></span>
<span id="方式-a接入-nas-网络文件夹"></span>
<span id="方式-balist-接入-clouddrive2再挂载到本地"></span>

AList 的[部署](/posts/alist-guide/#部署-alist)、[添加存储](/posts/alist-guide/#添加存储并验证)、[WebDAV 权限](/posts/alist-guide/#准备-webdav-用户与地址)和[NAS 网络文件夹接入](/posts/alist-guide/#方式-a接入-nas-网络文件夹)见独立教程；[连接 CloudDrive2](/posts/alist-guide/#方式-balist-接入-clouddrive2再挂载到本地)也有完整步骤。

WebDAV 能列目录却无法读取文件时，检查 AList 的下载重定向或代理策略、客户端是否支持跳转，以及最终地址是否可达。不要把这份 CloudDrive2 目录反向加入同一个 AList 存储，形成循环。

## 让其他容器读取挂载目录

这一节适用于挂载已在 **Linux / NAS 宿主机**可见的情况。其他容器只知道自己的目录映射，不能因为 NAS 文件管理器能打开，就默认媒体容器也能看到。

在现有 Emby、Jellyfin 等服务的 `volumes` 下增加映射。下面是需要合并的片段，不是完整的媒体服务 Compose：

```yaml
volumes:
  - type: bind
    source: /path/to/cloud-mount
    target: /cloud
    read_only: true
    bind:
      propagation: rslave
```

`source` 使用 NAS 上的挂载父目录；按本文示例，媒体软件内从 `/cloud/all` 进入聚合网盘，再选择实际媒体子目录。映射父目录可以接收 `all` 下后来产生的 FUSE 挂载，`rslave` 用于把这些挂载事件从宿主机传入容器，宿主机源挂载也须支持相应传播。

修改 Compose 后需要重新创建对应服务，单纯重启旧容器不会应用新的目录映射。然后在容器内再次列目录、读取小文件，最后才添加媒体库。

`read_only: true` 用于限制普通写入，但 Docker 对递归子挂载的只读支持还受内核版本等条件影响。希望整条链路只读时，还要在 **CloudDrive2 挂载点或 AList 用户权限**中限制写入。

先让媒体服务读取测试目录，确认扫描和播放正常后再扩大范围。把挂载目录接到媒体服务时，可以接着看 [Emby](/posts/emby-guide/) 或 [Jellyfin](/posts/jellyfin-guide/)；如果希望改用本地 STRM 与播放地址解析，则看 [Cloud Media Sync](/posts/cloud-media-sync/)。完整流程仍可参考 [DebNAS 自动观影流程](/posts/debnas-media-workflow/)。

## 缓存、上传与媒体库扫描

### 目录缓存和文件缓存是两回事

目录缓存保存文件名、大小等信息，用于减少列目录请求；文件缓存则可能保存实际读取或等待上传的数据，会占用本地空间。

先保留当前版本默认值，只有遇到具体问题时再调整。目录缓存时间较长，外部客户端做的改动可能需要等待或手动刷新；刷新太频繁，则会增加网盘 API 请求。**缓存到期与整盘扫描不是一回事**，旧教程里把缓存时间解释成扫描间隔的说法不必照搬，也不要把缓存设为 `0` 当作通用加速方法。

需要调整磁盘缓存目录时，选 NAS 本地、空间足够的位置。Docker 部署要先把它映射到容器，再在程序里填写容器内路径；宿主机目录没有映射进去，程序就无法使用。

### 本地写完，不等于云端上传完成

部分写入会先落到本地缓存，再由后台上传。复制窗口结束后，还要检查 CloudDrive2 或 AList 的任务状态，并从网盘官方客户端确认文件大小、内容与可打开性。

有待上传任务时，不要直接清理缓存、删除容器数据或关闭机器。第一次启用写入，用一个专门的测试文件夹验证上传、重命名和删除，再交给自动整理程序。

跨网盘复制也不保证“秒传”。是否支持取决于驱动、目标端能力、哈希匹配等条件，未命中时可能需要实际下载再上传，消耗带宽与时间。

### 媒体库从小目录开始扫描

媒体软件的全库扫描、媒体信息分析、缩略图和章节图生成，可能读取大量目录与文件内容，触发网盘限流。先添加一个小目录，按需关闭不必要的高频扫描和图片生成，再观察请求量、缓存占用与播放效果。

不要把网盘挂载当成本地机械硬盘去跑下载临时文件、数据库或高频随机写入任务。本地下载目录和云盘挂载也不满足同一文件系统条件，不能用硬链接实现“零空间上传”。

STRM 是另一种接入方式：媒体库读取本地的小型链接文件，播放时再访问远端资源。它不会生成与 CloudDrive2 一样的文件系统挂载，按媒体工作流的需求选择即可。

## 重启、更新与备份

配置完成后，至少做一次按顺序的恢复验证：

1. 确认没有未完成上传，停止依赖挂载路径的写入与整理任务。
2. 重启 CloudDrive2；使用 AList 路线时，也验证 AList 重启后能恢复授权与目录。
3. 确认挂载点自动恢复，宿主机和读取它的容器都能重新读取文件。
4. 在方便维护时重启 NAS 或电脑，再重复以上检查。

`restart: unless-stopped` 负责符合条件时恢复容器进程，不保证网盘授权有效，也不保证媒体应用启动时挂载已经就绪。挂载尚未建立时，本地空目录仍可能存在，自动整理程序提前写进去，会把文件落在本地磁盘上。

更新 Docker 部署前，记录当前镜像版本，停止相关服务后备份 CloudDrive2 的 `config`、AList 的 `data` 和 Compose 文件；再在各自项目目录拉取镜像、重新创建服务。`latest` 与架构标签会随上游变化，长期使用可以在核实可用标签后固定到已验证版本。

配置备份可能含网盘授权和账号信息，应放在受保护的位置。备份配置能帮助恢复部署，**不能替代网盘文件本身的备份**；挂载目录只是访问入口，不能把复制目录名当作内容备份完成。

卸载或迁移时，先停用读取和写入它的程序，再从 CloudDrive2 界面卸载挂载点。确认挂载已经解除后，才处理本地空目录，避免把“清理挂载目录”变成删除云端文件。

## 常见问题

| 现象                                  | 优先检查                                                                               |
| ------------------------------------- | -------------------------------------------------------------------------------------- |
| `19798` 或 `5244` 打不开              | 服务状态、日志、端口冲突、设备地址和本机防火墙；先在局域网验证                         |
| CloudDrive2 网页正常，挂载失败        | `/dev/fuse`、权限、挂载目标是否为空、宿主机与容器挂载传播；fnOS 按官方指引使用原生套件 |
| 容器里有文件，宿主机没有              | 是否填写容器内 `/CloudNAS/all`，是否映射到正确宿主机目录，`shared` 是否生效            |
| NAS 上有文件，Emby 容器里是空的       | 容器路径、`rslave`、源挂载传播及启动顺序；修改后是否重新创建服务                       |
| WebDAV 返回 `401` / `403`             | AList 用户密码、WebDAV 权限、角色路径限制，确认没有误填网盘账号                        |
| WebDAV 能列目录但不能读取文件         | 网盘授权、下载能力、重定向或代理策略，以及实际运行客户端那台机器的网络                 |
| 刚上传的文件看不到                    | 后台上传是否完成、目录缓存是否刷新，再用网盘官方客户端交叉检查                         |
| 文件能播放但拖动很慢                  | 带宽、网盘限速、客户端及驱动的范围读取能力、缓存和媒体分析任务                         |
| `mount point is not empty`            | 是否有程序在挂载前写入本地目录；先停止写入并保留这些文件，再整理出空挂载点             |
| `Transport endpoint is not connected` | FUSE 挂载异常；先停止依赖程序，检查服务日志并卸载、恢复挂载，不要直接递归删除目录      |

遇到问题时按 **网盘自身 → 聚合服务 → WebDAV → 本地挂载 → 使用它的应用**逐层验证。上一层读取正常，再检查下一层，比同时更换驱动、缓存和网络设置更容易找到原因。

## 参考资料

- 磕巴白菜：[绿联新系统安装 CloudDrive2，将多种网盘聚合挂载到本地][keba-cd2]。
- 磕巴白菜：[绿联新系统部署 Alist 容器，将 N 多网盘聚合挂载到本地][keba-alist]。
- CloudDrive2：[下载与安装包][cd2-download]、[帮助与安装][cd2-help]、[Docker 部署指南][cd2-docker]。
- AList：[Docker 安装][alist-docker]、[手动安装与密码命令][alist-start]、[WebDAV][alist-webdav]、[用户与权限][alist-users]。
- Docker：[绑定挂载、只读子挂载与挂载传播][docker-propagation]。

[keba-cd2]: https://hi.keba.host/archives/clouddrive2
[keba-alist]: https://hi.keba.host/archives/alist
[cd2-download]: https://www.clouddrive2.com/download.html
[cd2-help]: https://www.clouddrive2.com/help.html
[cd2-docker]: https://www.clouddrive2.com/docker.html
[alist-docker]: https://alistgo.com/zh/guide/install/docker.html
[alist-start]: https://alistgo.com/zh/guide/install/manual.html
[alist-webdav]: https://alistgo.com/zh/guide/webdav.html
[alist-users]: https://alistgo.com/zh/guide/advanced/user.html
[docker-propagation]: https://docs.docker.com/engine/storage/bind-mounts/
