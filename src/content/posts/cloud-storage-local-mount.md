---
title: CloudDrive2：网盘挂载、目录共享与缓存
description: 把网盘挂成 Linux NAS、fnOS 或 Windows 上的本地目录或盘符，处理 FUSE、挂载传播与缓存。
author: Ayulog
pubDatetime: "2026-10-10T10:00:00+08:00"
draft: false
category: nas
tags:
  - 网盘
  - WebDAV
  - Docker
---

当 Emby、Jellyfin 或本地播放器需要直接读取文件夹或盘符时，可以用 CloudDrive2 将网盘挂载为 Linux NAS 的本地目录或 Windows 盘符，通过网络按需读取远端文件。

CloudDrive2 原生支持的网盘可直接添加；已在 [AList](/posts/alist-guide/) 中配置的存储，也可通过 WebDAV 接入后再挂载到本地。更多家庭影音工具见 [NAS 服务清单](/posts/nas-software-websites/)。

## 目录与环境准备

### 选择运行环境与安装方式

CloudDrive2 在哪台设备上运行，挂载目录或盘符就生成在哪台设备上：在 NAS 上部署会生成 NAS 本地目录，供 NAS 上的容器或共享服务读取；希望在 Windows 资源管理器中出现本地盘符，则在 Windows 上安装客户端。

由于 Docker 部署依赖 Linux 的 FUSE 设备与宿主机挂载传播（[Docker 文档][docker-propagation]说明 Docker Desktop 不支持挂载传播），不同环境对应的安装方式如下：

| 环境                                            | 安装方式                                    |
| ----------------------------------------------- | ------------------------------------------- |
| Debian / DebNAS，以及允许 FUSE 和共享挂载的 NAS | CloudDrive2 Docker Compose                  |
| 飞牛 fnOS                                       | 按官方帮助安装 CloudDrive2 原生 `fpk` 套件  |
| Windows 10 / 11                                 | 安装 CloudDrive2 核心服务与所需 WinFSP 驱动 |

### 规划配置、挂载与缓存目录

建议将配置目录、挂载目录与缓存目录分开存放，目录结构示意如下：

```text
docker/
└── clouddrive2/
    ├── compose.yaml
    └── config/

cloud-mount/         # 映射给 CloudDrive2 和其他容器的父目录
└── all/             # 实际接收云盘挂载的空目录
cloud-cache/         # 需要自定义磁盘缓存时再配置
```

配置目录需持久化保存，挂载目录与磁盘缓存目录则分别独立存放在本地磁盘中，避免与现有下载或媒体库目录混用。后文的 `/path/to/cloud-mount` 请替换为通过 SSH 或 NAS 文件管理器查到的宿主机绝对路径。

<span id="路线一安装-clouddrive2"></span>

## Docker 部署与客户端安装

### Linux / NAS：Docker Compose 部署

先创建项目目录、`config` 子目录，以及宿主机上的 `/path/to/cloud-mount/all` 空目录。将父目录映射进容器并在 `all` 子目录创建实际挂载，便于其他容器接收后续的挂载事件。具备 SSH 权限时，先检查宿主机 FUSE 设备与目标文件系统的挂载传播属性：

```bash
ls -l /dev/fuse
findmnt -T /path/to/cloud-mount -o TARGET,PROPAGATION
```

确认 `/dev/fuse` 存在，且目标目录所在挂载的 `PROPAGATION` 为 `shared`。若显示为 `private`，需先按 [CloudDrive2 官方 Docker 指南][cd2-docker]及当前 NAS 系统要求调整为共享挂载，并确认重启后依然生效。

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

部署时重点核对以下参数：

- **镜像架构**：x86-64 设备使用 `amd64`，ARM64 设备改用 `arm64`，ARMv7 标签为 `arm32`。
- **挂载传播**：`/CloudNAS:shared` 用于将容器内创建的 FUSE 挂载传播到宿主机。
- **运行权限**：FUSE 挂载需要映射 `/dev/fuse` 并启用 `privileged: true` 与 `pid: host`。仅映射必需的目录；若后续需要用 CloudDrive2 将某个 NAS 本地目录上传或备份到网盘，再单独添加该目录映射。
- **网络模式**：使用 `host` 网络，管理界面直接监听宿主机 `19798` 端口。

在项目目录启动容器：

```bash
docker compose config
docker compose up -d
docker compose ps
docker compose logs --tail=100 clouddrive2
```

启动后通过浏览器访问 `http://NAS_IP:19798`（将 `NAS_IP` 替换为 NAS 的局域网地址）。

### 飞牛 fnOS：安装原生套件

[CloudDrive2 帮助页][cd2-help]说明 fnOS 的 Docker 环境对 FUSE 挂载存在命名空间限制，建议使用官方原生 `fpk` 套件：

1. 打开 [CloudDrive2 下载页][cd2-download]，下载对应架构（`x86_64` 或 `aarch64`）的 fnOS 核心服务安装包。
2. 通过 fnOS 手动安装入口完成安装，按提示授予目录访问权限并启动服务。
3. 打开 `http://NAS_IP:19798`，使用 NAS 本机已创建并授权的空目录作为挂载目标。

### Windows：安装核心服务

从 [CloudDrive2 下载页][cd2-download]的**核心服务安装包**区域下载 Windows `x64` 或 `Arm64` 版本，按向导安装核心服务与 WinFSP 驱动并完成重启。核心服务支持后台运行，创建的挂载可供 SMB 共享或其他系统服务访问。

安装后打开 `http://localhost:19798`；若页面无响应，可在 Windows 服务管理器（`services.msc`）中检查 `CloudDrive2 Service` 是否正在运行。

<span id="添加网盘并挂载到本地"></span>

## WebUI 核心设置

### 登录并添加云存储

1. 首次使用先注册并登录 CloudDrive 账号（账号可连接网盘数与挂载点数见官网说明）。
2. 打开 **云存储 → 添加云存储**，选择目标网盘驱动并按界面提示完成扫码或授权。例如添加 115 网盘时，按当前官方要求选择开放接口 **`115open`**。
3. 进入“我的文件”确认能正常列出网盘目录，并打开一个小文件验证读取正常。

<span id="先选适合自己的路线"></span>

### 接入 AList 的 WebDAV（可选）

若部分网盘已在 [AList](/posts/alist-guide/) 中配置妥当，可在 CloudDrive2 的“添加云存储”中选择 **WebDAV** 接入：

```text
地址：http://NAS_IP:5244/dav/
用户名：专用 AList 用户
密码：该 AList 用户的密码
```

地址需填写 CloudDrive2 所在环境可访问的局域网 IP。保存后先测试读取小文件；若能列目录但无法读取文件，可检查 AList 存储的下载策略（重定向或代理）及客户端网络可达性。注意保持单向接入，避免将 CloudDrive2 挂载目录再反向添加回同一个 AList。

### 新建挂载点与本地验证

在 **挂载点 → 添加挂载点** 中配置：

| 项目                      | 填写说明                                    |
| ------------------------- | ------------------------------------------- |
| 挂载名称                  | 自定义名称，如“聚合网盘”                    |
| 源目录                    | 选择单个网盘子目录，或填 `/` 挂载聚合根目录 |
| Docker 挂载目标           | 容器内路径 `/CloudNAS/all`                  |
| Linux / fnOS 原生挂载目标 | 本机已创建并授权的空目录                    |
| Windows 挂载目标          | 未占用的盘符，如 `X:`                       |
| 只读                      | 首次验证或仅供媒体库读取时建议勾选          |
| 启动时自动挂载            | 需要开机自动恢复挂载时勾选                  |

在 Docker 部署下，CloudDrive2 将聚合根目录 `/` 挂载到容器内的 `/CloudNAS/all`，再通过 `shared` 挂载传播同步到宿主机的 `/path/to/cloud-mount/all`（若已挂载聚合根目录 `/`，新接入的存储会直接出现在该根目录下，无需重复新建挂载点）。

挂载完成后，在 Linux / NAS 宿主机上验证挂载状态与目录内容：

```bash
findmnt -T /path/to/cloud-mount/all
ls -la /path/to/cloud-mount/all
```

确认 `findmnt` 输出为 CloudDrive2 创建的 FUSE 挂载（Windows 直接在资源管理器中打开对应盘符），随后测试读取小文件以及视频播放、拖动进度是否顺畅。

### 映射给 Emby / Jellyfin 等媒体容器

当挂载目录已在 Linux / NAS 宿主机上就绪后，可在 Emby、Jellyfin 等媒体服务的 `compose.yaml` 中添加挂载父目录映射：

```yaml
volumes:
  - type: bind
    source: /path/to/cloud-mount
    target: /cloud
    read_only: true
    bind:
      propagation: rslave
```

`source` 填写宿主机上的挂载父目录，通过 `rslave` 接收宿主机后续传入的 FUSE 挂载事件；媒体容器内部从 `/cloud/all` 进入网盘目录。修改 Compose 后需重新创建媒体容器（`docker compose up -d`）使映射生效。由于 Docker 对递归子挂载的只读限制受内核条件影响，若需整条链路严格只读，建议同时在 CloudDrive2 挂载点或 AList 用户权限中开启只读限制。

媒体服务的入库配置可继续参考 [Emby](/posts/emby-guide/)、[Jellyfin](/posts/jellyfin-guide/)，或采用本地 STRM 方案 [Cloud Media Sync](/posts/cloud-media-sync/) 及 [DebNAS 自动观影流程](/posts/debnas-media-workflow/)。

## 常见问题与维护

### 缓存与上传机制

CloudDrive2 的目录缓存负责保存文件名与大小等元数据以减少 API 请求，文件缓存则保存实际读取或待上传的数据。日常使用保持默认缓存参数即可；若需自定义磁盘缓存目录，需选择空间充足的本地路径（Docker 部署需先将该目录映射进容器）。

向可写挂载目录复制或修改文件时，数据会先写入本地缓存，再由后台任务异步上传至网盘。文件复制窗口关闭后，可在 CloudDrive2 任务列表中确认上传进度；存在待上传任务时避免直接清理缓存或停止容器。由于可写挂载中的删除、移动和覆盖会直接作用于网盘文件，首次接入自动整理程序前，建议先用独立测试目录验证。

### 媒体库扫描与重启维护

媒体软件的全库扫描、媒体信息分析、缩略图和章节图生成会密集读取文件内容，容易触发网盘接口限流。入库时建议从小目录开始测试，按需关闭高频扫描与预览图生成任务。此外，本地下载目录与云盘 FUSE 挂载分属不同文件系统，整理入库需采用复制或上传流程，无法直接跨文件系统创建硬链接。

日常重启、更新或卸载挂载时注意以下顺序：

1. **重启与恢复验证**：重启容器或宿主机前确认无待上传任务；重启后先确认 CloudDrive2 已恢复挂载，再启动依赖该路径的自动写入程序，避免在未挂载状态下将文件直接写入本地空目录。
2. **更新与备份**：更新前记录当前镜像版本，停止服务并备份 `compose.yaml`、CloudDrive2 的 `config` 目录（内含账号与网盘授权，需妥善保管），再拉取新镜像重建容器。
3. **安全卸载**：迁移或停用时，先停止读写该目录的应用，再从 CloudDrive2 网页端卸载挂载点；确认 FUSE 挂载已解除后，再清理本地空目录，以免误删云端文件。

### 故障排查

| 现象                                  | 优先检查                                                                               |
| ------------------------------------- | -------------------------------------------------------------------------------------- |
| `19798` 或 `5244` 端口打不开          | 服务状态、容器日志、端口占用、局域网 IP 与防火墙                                       |
| CloudDrive2 网页正常，但挂载失败      | `/dev/fuse` 映射、容器权限、挂载目标是否为空、宿主机 `shared` 传播；fnOS 改用原生套件  |
| 容器内有文件，宿主机目录为空          | 挂载点是否填在 `/CloudNAS/all`、宿主机目录映射是否对应、`shared` 传播是否生效          |
| 宿主机有文件，Emby 容器内为空         | 媒体容器是否映射父目录并配置 `rslave`、修改 Compose 后是否已重新创建容器               |
| WebDAV 返回 `401` / `403`             | AList 专用用户密码、WebDAV 权限与角色路径作用域                                        |
| WebDAV 能列目录但无法读取文件         | 网盘授权状态、AList 下载策略（重定向/代理）及客户端所在环境的网络可达性                |
| 刚上传的文件未显示                    | 后台上传任务是否完成、目录缓存刷新状态，并在网盘官方客户端核对                         |
| 视频能起播但拖动卡顿                  | 网络带宽、网盘接口限速、缓存设置，以及是否同时在进行媒体分析任务                       |
| `mount point is not empty`            | 挂载前是否有程序提前向本地目录写入了文件；先移出保留这些本地文件，清空目录后再重新挂载 |
| `Transport endpoint is not connected` | FUSE 挂载异常断开；先停止依赖程序，在管理界面卸载并恢复挂载，切勿直接递归删除挂载目录  |

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
