---
title: AList：Docker 部署、WebDAV 与路径权限
description: 部署 AList 聚合网盘，建立专用 WebDAV 用户，检查角色与目录权限，并通过 NAS 网络文件夹或 CloudDrive2 接入本地。
author: Ayulog
pubDatetime: "2026-10-10T16:00:00+08:00"
draft: false
setupCategory: nas
tags:
  - AList
  - NAS
  - 网盘
  - WebDAV
  - Docker
---

AList 把多个存储放到同一棵目录树里，提供网页浏览和 WebDAV 访问。它不会把网盘容量合成一块本地硬盘，添加存储也不会自动建立 NAS 文件系统挂载点。

播放器支持 WebDAV 时，可以直接连接 AList；只认本地路径的软件，再经 [CloudDrive2](/posts/2026-10-10-cloud-storage-local-mount/) 挂载。其他软件见 [NAS 常用软件记录](/posts/2026-10-09-nas-software-websites/)。

## 目录

- [部署 AList](#部署-alist)
- [添加存储并验证](#添加存储并验证)
- [准备 WebDAV 用户与地址](#准备-webdav-用户与地址)
- [方式 A：接入 NAS 网络文件夹](#方式-a接入-nas-网络文件夹)
- [方式 B：AList 接入 CloudDrive2，再挂载到本地](#方式-balist-接入-clouddrive2再挂载到本地)
- [给媒体容器提供本地路径](#给媒体容器提供本地路径)
- [上传、缓存与扫描](#上传缓存与扫描)
- [更新与备份](#更新与备份)
- [常见问题](#常见问题)
- [参考资料](#参考资料)

## 部署 AList

AList 是支持多种存储的文件列表程序，可以统一浏览目录并提供 WebDAV。它的“添加存储”只是把网盘加入 AList 的目录树，不会直接给 NAS 创建一个 Linux 挂载点。

在独立的 `alist` 项目目录创建 `data` 子目录，再保存下面的 `compose.yaml`。镜像名和数据路径依据 [AList 官方 Docker 文档][alist-docker]：

```yaml
services:
  alist:
    image: xhofe/alist:latest
    container_name: alist
    restart: unless-stopped
    ports:
      - "5244:5244"
    environment:
      TZ: Asia/Singapore
    volumes:
      - ./data:/opt/alist/data
```

这里使用默认 bridge 网络配合端口映射，不添加 `network_mode: host`，也不需要特权模式或 `/dev/fuse`。

在该项目目录执行：

```bash
docker compose config
docker compose up -d
docker compose logs --tail=100 alist
```

从首次启动日志取得管理员信息，然后打开 `http://NAS_IP:5244` 登录并修改密码。没有保留初始密码时，可在自己的容器内生成一个新的随机管理员密码：

```bash
docker exec -it alist ./alist admin random
```

该命令会**重设**管理员密码，输出请自行保管，不要贴进公开日志或截图。相关命令与版本差异见 [AList 手动安装说明][alist-start]。

## 添加存储并验证

进入管理后台的 **存储 → 添加**：

1. 选择网盘对应驱动，先阅读该驱动的官方说明。
2. 设置 AList 内的挂载路径，例如 `/drive-a`、`/drive-b`，每个存储使用不同路径。
3. 按所选驱动填写授权信息和必要参数，保存后确认状态正常。
4. 回到 AList 文件页面，进入对应目录，验证列目录和读取小文件。

这里的 `/drive-a` 是 **AList 虚拟路径**，不是宿主机目录，也不等于 Docker 数据目录 `./data`。`./data` 保存的是程序配置等数据，不会因为添加网盘就存入全部网盘文件。

不同驱动支持的上传、删除、复制和重命名能力可能不同。添加成功后仍需逐项验证，不能默认所有网盘具有一样的读写功能。

## 准备 WebDAV 用户与地址

AList 的 WebDAV 入口为：

```text
http://NAS_IP:5244/dav/
```

账号密码使用 **AList 用户**的凭据，不是网盘账号或 CloudDrive 账号。建议新建专用用户，先只授予需要目录的读取权限，并启用该版本要求的 **WebDAV 读取**权限；需要写入时再开放 **WebDAV 管理**及对应上传、删除等操作权限。

新版 AList 还涉及角色的路径作用域和“检查路径限制”。**基本路径只是默认进入的位置，不能单独当作访问隔离**；如果只想开放一个目录，应按当前[用户与权限文档][alist-users]设置作用域，并验证不能访问其他目录。

若客户端把连接参数拆开填写，对应关系如下：

| 字段         | 示例                                      |
| ------------ | ----------------------------------------- |
| 协议         | HTTP；已配置证书和 HTTPS 入口时选择 HTTPS |
| 主机         | NAS 的局域网 IP                           |
| 端口         | `5244`，或自己修改后的宿主机映射端口      |
| 路径         | `/dav/`                                   |
| 用户名、密码 | 专用 AList 用户的凭据                     |

首次在可信局域网内验证即可。需要外部访问时再配置受保护的连接方式，不直接把带账号凭据的 HTTP 服务暴露到公网。

## 方式 A：接入 NAS 网络文件夹

在 NAS 文件管理器中寻找 **连接网络文件夹 / 远程挂载 / WebDAV** 等入口，按上表填写参数，连接后验证目录和文件读取。绿联参考教程展示的就是这类接法，其他系统的名称和能力可能不同。

这个入口可能只供文件管理器使用。希望 Emby、Jellyfin 或其他 Docker 容器访问时，应先确认系统是否提供实际可用的宿主机路径；如果没有，继续采用下面的 CloudDrive2 挂载方式。

## 方式 B：AList 接入 CloudDrive2，再挂载到本地

1. 在 CloudDrive2 的“添加云存储”中选择 **WebDAV**。
2. 填写 `http://NAS_IP:5244/dav/`，以及刚创建的 AList 用户名、密码。
3. 保存后进入新添加的存储，确认能够看到 AList 中的网盘目录并打开文件。
4. 按 [CloudDrive2 的挂载步骤](/posts/2026-10-10-cloud-storage-local-mount/#添加网盘并挂载到本地)，将这个 WebDAV 存储或其子目录挂载到本地。

如果已经挂载了 CloudDrive2 的聚合根目录，新加入的 WebDAV 存储可以从该根目录下访问，不必再占用一个挂载点。先确认实际层级，再给其他软件填写路径。

本文用 `NAS_IP` 连接 AList，地址必须能从**运行 CloudDrive2 的机器或容器**访问。普通 bridge 容器里的 `localhost` 是容器自己；不要把电脑浏览器中可用的 `localhost` 原样复制进去。

AList 的 WebDAV 下载策略可能使用重定向或代理。遇到“目录能列出，文件读不了”，结合[官方 WebDAV 说明][alist-webdav]检查该存储的策略、客户端重定向支持及目标地址可达性；改用代理后，文件流量会经过 AList 所在设备。

接通后的链路是：

```text
多个网盘 → AList → /dav/ → CloudDrive2 → 本地目录或盘符
```

只把确实需要的存储接入一次，避免又把 CloudDrive2 的同一份目录反向加入 AList，形成循环引用。

## 给媒体容器提供本地路径

NAS 文件管理器中的“网络文件夹”可能只有文件管理器能访问。供 Emby、Jellyfin 或其他容器使用前，先确认 NAS 是否提供实际的宿主机路径；没有的话，可使用 CloudDrive2 挂载 WebDAV。

使用 CloudDrive2 Docker 方式时，先按其教程核实 FUSE 和宿主机挂载传播。媒体容器映射挂载父目录，例如：

```yaml
volumes:
  - type: bind
    source: /path/to/cloud-mount
    target: /cloud
    read_only: true
    bind:
      propagation: rslave
```

这里是合并到已有媒体服务的片段，`source` 要换成 NAS 上的实际挂载父目录。CloudDrive2 在父目录的 `all` 子目录创建挂载时，容器从 `/cloud/all` 读取；`rslave` 接收宿主机传入的挂载事件，源挂载也须支持传播。

修改映射后重新创建媒体容器，再从容器里检查目录和小文件。Docker 对递归子挂载的只读支持受内核条件影响，需要在 AList 用户权限或 CloudDrive2 挂载点上同时限制写入。

## 上传、缓存与扫描

AList 列出文件名，不等于文件内容能够下载。先验证一个小文件，再测试视频起播、拖动和字幕；媒体库的大范围扫描、缩略图生成和媒体信息分析可能增加网盘请求。

通过 WebDAV 写入时，上传、删除、重命名是否可用取决于驱动和用户权限。先用专门测试目录验证。经 CloudDrive2 写入的文件还可能在本地等待上传，要查看任务状态，并从网盘官方客户端核对文件大小和内容。

目录缓存更新较慢时，可检查缓存策略和刷新结果；不要把频繁刷新当作通用提速办法。采用 WebDAV 代理下载时，文件流量会经过 AList 所在设备，带宽和并发也要一起考虑。

## 更新与备份

备份 `compose.yaml` 和映射到 `/opt/alist/data` 的 `data` 目录，里面可能含账号和网盘授权。配置备份不能代替网盘文件备份。

更新前记录镜像版本或 digest，停止服务后复制数据，再在项目目录执行：

```bash
docker compose pull alist
docker compose up -d alist
docker compose logs --tail=100 alist
```

随后检查登录、存储状态、专用用户权限和 WebDAV 实际读取。若 CloudDrive2 依赖它，继续验证挂载恢复；媒体程序启动时不能只看空目录是否存在。

## 常见问题

| 现象                           | 检查位置                                         |
| ------------------------------ | ------------------------------------------------ |
| `5244` 打不开                  | 容器日志、端口冲突、NAS 地址和防火墙             |
| WebDAV 返回 `401` / `403`      | AList 用户密码、WebDAV 权限、角色路径作用域      |
| 用户能看到不该开放的目录       | 基本路径不是访问隔离，检查路径限制和角色作用域   |
| 能列目录、文件读不了           | 网盘授权、下载能力、重定向或代理策略和客户端网络 |
| NAS 文件管理器可见，容器看不到 | 网络文件夹是否有实际宿主路径、目录映射与挂载传播 |
| 刚上传的文件看不到             | 任务是否结束、目录缓存和网盘端是否同步           |

## 参考资料

- 磕巴白菜：[绿联新系统部署 Alist 容器，将 N 多网盘聚合挂载到本地][keba-alist]。
- AList：[Docker 安装][alist-docker]、[手动安装与密码命令][alist-start]、[WebDAV][alist-webdav]、[用户与权限][alist-users]。
- Docker：[绑定挂载、只读子挂载与传播][docker-propagation]。

[keba-alist]: https://hi.keba.host/archives/alist
[alist-docker]: https://alistgo.com/zh/guide/install/docker.html
[alist-start]: https://alistgo.com/zh/guide/install/manual.html
[alist-webdav]: https://alistgo.com/zh/guide/webdav.html
[alist-users]: https://alistgo.com/zh/guide/advanced/user.html
[docker-propagation]: https://docs.docker.com/engine/storage/bind-mounts/
