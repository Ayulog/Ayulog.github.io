---
title: AList：Docker 部署、WebDAV 与路径权限
description: Docker 部署 AList，建专用 WebDAV 用户和路径权限，再接入 NAS 或 CloudDrive2。
author: Ayulog
pubDatetime: "2026-10-10T16:00:00+08:00"
draft: false
category: nas
tags:
  - AList
  - 网盘
  - WebDAV
---

当手头有多个网盘，希望在 NAS 上用同一套目录浏览、播放和下载时，可以用 AList 将它们汇总到同一棵虚拟目录树中，通过网页或 WebDAV 统一访问。

支持 WebDAV 的播放器可以直接连接 AList；只认本地路径的软件（如 Emby、Jellyfin），则可先将 AList 的 WebDAV 接入 [CloudDrive2](/posts/cloud-storage-local-mount/) 挂载为本地目录。更多配套工具见 [NAS 服务清单](/posts/nas-software-websites/)。

## 部署 AList

在独立的 `alist` 项目目录创建 `data` 子目录，保存下面的 `compose.yaml`（镜像名和数据路径参照 [AList 官方 Docker 文档][alist-docker]）：

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

AList 仅需默认 bridge 网络映射 `5244` 端口，并将 `/opt/alist/data` 挂载到宿主机持久化配置与数据库。在项目目录执行：

```bash
docker compose config
docker compose up -d
docker compose logs --tail=100 alist
```

从首次启动日志中获取初始管理员信息，打开 `http://NAS_IP:5244` 登录并修改密码。如果错过了初始日志，可在容器内随机重置一个新密码：

```bash
docker exec -it alist ./alist admin random
```

更多密码设置命令与版本差异见 [AList 手动安装说明][alist-start]。

## 添加存储与 WebDAV 权限

### 添加网盘存储

进入管理后台的 **存储 → 添加**：

1. 选择网盘对应驱动，对照[官方文档][alist-docker]准备授权参数。
2. 设置 AList 内的虚拟挂载路径（如 `/drive-a`、`/drive-b`），每个存储使用独立路径。宿主机的 `./data` 仅保存数据库和配置，网盘文件本身仍留在云端。
3. 填写授权信息和必要参数，保存后确认状态为 `work`。
4. 回到 AList 文件列表，进入对应目录验证列目录、读取小文件及所需的文件操作。

### 准备 WebDAV 用户与地址

AList 的 WebDAV 入口地址为：

```text
http://NAS_IP:5244/dav/
```

连接 WebDAV 时使用 AList 内部用户的凭据。建议在后台新建专用用户，按需授予目标目录的访问权限并勾选 **WebDAV 读取**；需要写入时再开启 **WebDAV 管理**及上传、删除等操作权限。

在角色与权限设置中，“基本路径”指定用户登录后的默认起始位置；若需限制用户只能访问特定子目录，应按[用户与权限文档][alist-users]配置角色的路径作用域并开启“检查路径限制”。

客户端拆分填写连接参数时的对应关系如下：

| 字段         | 填写说明                               |
| ------------ | -------------------------------------- |
| 协议         | HTTP（配置反向代理与证书后可选 HTTPS） |
| 主机         | NAS 局域网 IP                          |
| 端口         | `5244`，或自定义的宿主机映射端口       |
| 路径         | `/dav/`                                |
| 用户名、密码 | 新建的 AList 专用用户凭据              |

## 接入 NAS 与本地挂载

<span id="方式-a接入-nas-网络文件夹"></span>

### 方式 A：接入 NAS 网络文件夹

在 NAS 文件管理器中找到 **连接网络文件夹 / 远程挂载 / WebDAV** 等入口，按上表填写参数，连接后即可在文件管理器中直接浏览和读取网盘文件。

部分 NAS 系统的“网络文件夹”仅在自带文件管理器内可见，未生成可供 Docker 容器挂载的宿主机路径。若需让 Emby、Jellyfin 等容器读取网盘内容，可采用下面的 CloudDrive2 挂载方案。

<span id="方式-balist-接入-clouddrive2再挂载到本地"></span>

### 方式 B：接入 CloudDrive2 挂载为本地目录

1. 在 CloudDrive2 的“添加云存储”中选择 **WebDAV**。
2. 填写 `http://NAS_IP:5244/dav/` 及 AList 专用用户的账号密码。这里的 `NAS_IP` 需填写 CloudDrive2 所在环境可访问的局域网 IP（如 `192.168.x.x`）。
3. 保存后进入新添加的存储，确认能正常浏览目录和打开小文件。
4. 按 [CloudDrive2 挂载步骤](/posts/cloud-storage-local-mount/#添加网盘并挂载到本地)，将该 WebDAV 存储或其子目录挂载到本地。若已挂载 CloudDrive2 的聚合根目录，新接入的 WebDAV 存储会直接出现在该根目录下，无需重复新建挂载点。

接入时只需单向将 AList 的 `/dav/` 挂入 CloudDrive2，避免将 CloudDrive2 挂载出来的本地目录再反向添加回 AList。若遇到“目录能列出但文件无法读取”，可结合[官方 WebDAV 说明][alist-webdav]检查该存储的下载策略（重定向或本机代理）以及客户端对重定向的支持情况；改用代理模式时，文件传输流量会经过 AList 所在设备。

### 映射给媒体容器

通过 CloudDrive2 Docker 将网盘挂载到宿主机后，Emby、Jellyfin 等媒体容器需映射宿主机上的挂载父目录，并开启 `rslave` 挂载传播：

```yaml
volumes:
  - type: bind
    source: /path/to/cloud-mount
    target: /cloud
    read_only: true
    bind:
      propagation: rslave
```

将 `source` 替换为 NAS 上的实际挂载父目录。当 CloudDrive2 在父目录的 `all` 子目录创建挂载时，媒体容器内可从 `/cloud/all` 读取文件。修改 Compose 后需重新创建媒体容器使映射生效；由于 Docker 对递归子挂载的只读限制受内核条件影响，若需严格只读，建议同时在 AList 用户权限或 CloudDrive2 挂载点上限制写入。

## 常见问题与维护

### 读写、缓存与媒体扫描

挂载接通后，建议先读取小文件，再测试视频起播、拖动进度和外挂字幕。媒体库开启大范围扫描、缩略图生成或媒体信息分析时会集中发起网盘请求，初次入库可先用单个测试目录观察请求量与起播速度。

通过 WebDAV 写入文件时，经由 CloudDrive2 写入的数据会先进入本地缓存并由后台上传，可在任务列表中查看上传进度，并在网盘端核对文件完整性。目录内容更新有延迟时，可在存储设置中检查缓存过期时间或手动刷新目录。

### 更新与备份

日常维护只需备份 `compose.yaml` 和映射到 `/opt/alist/data` 的 `data` 目录（内含账号、存储配置与网盘授权凭据）。更新前记录当前镜像版本或 digest，停止服务并备份数据后执行：

```bash
docker compose pull alist
docker compose up -d alist
docker compose logs --tail=100 alist
```

更新后检查管理后台登录、存储状态、专用用户权限及 WebDAV 实际读取；若下游连接了 CloudDrive2 和媒体服务，一并确认挂载目录读取正常。

### 故障排查

| 现象                           | 检查位置                                         |
| ------------------------------ | ------------------------------------------------ |
| `5244` 端口打不开              | 容器日志、端口占用、NAS 局域网地址与防火墙       |
| WebDAV 返回 `401` / `403`      | AList 用户密码、WebDAV 权限、角色路径作用域      |
| 用户能看到未授权的其他目录     | 角色路径作用域与“检查路径限制”开关               |
| 能列目录但文件无法读取         | 网盘授权、下载策略（重定向/代理）与客户端网络    |
| NAS 文件管理器可见，容器看不到 | 网络文件夹是否生成宿主机路径、目录映射与挂载传播 |
| 刚上传的文件未显示             | 后台上传任务状态、AList 目录缓存刷新与网盘端同步 |

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
