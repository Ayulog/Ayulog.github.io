---
title: Dockge：用网页管理 Compose 项目
description: 在网页里编辑 compose 文件、部署 Stack；含目录挂载约定、旧项目导入和更新备份。
author: Ayulog
pubDatetime: "2026-10-10T10:00:00+08:00"
draft: false
category: nas
tags:
  - Debian
  - Docker
  - Docker Compose
---

Dockge 专注于用网页管理 `compose.yaml` 文件：它把每个项目保存为宿主机栈目录（默认为 `/opt/stacks`）下的独立文件夹，既能在浏览器里直接编辑 YAML、转换 `docker run` 命令、拉取镜像和查看实时日志，又能随时退回 SSH 终端使用原生 `docker compose` 命令操作，不会把配置文件锁进私有数据库。

同类容器管理工具的对比见 [NAS 服务清单](/posts/nas-software-websites/)，通用的容器迁移与升级规范见 [Docker 应用维护](/posts/docker-management/)。

## Compose 部署与目录规则

确保宿主机已安装 [Docker Engine](https://docs.docker.com/engine/install/) 与 Compose V2。先为 Dockge 创建独立项目目录及全局栈目录（如 `/opt/stacks`），保存以下 `compose.yaml`（可直接[下载配套配置](/examples/debnas/dockge/compose.yaml)）：

```yaml
services:
  dockge:
    image: louislam/dockge:1
    restart: unless-stopped
    ports:
      - "5001:5001"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./data:/app/data
      - /opt/stacks:/opt/stacks
    environment:
      DOCKGE_STACKS_DIR: /opt/stacks
```

在 Dockge 项目目录启动容器：

```bash
docker compose up -d
docker compose logs --tail=100 dockge
```

启动后浏览器访问 `http://NAS_IP:5001`（将 `NAS_IP` 替换为设备局域网地址），按向导创建首个管理员账号。

配置时的核心注意事项：

- **栈目录路径必须三处一致**：Dockge 通过 `/var/run/docker.sock` 调用宿主机 Docker 守护进程部署容器，因此栈目录挂载的**冒号左右两侧必须为同一个宿主机绝对路径**，且与 `DOCKGE_STACKS_DIR` 完全一致。若在品牌 NAS 上将栈目录改到数据盘（如 `/volume1/docker/stacks`），需同步修改以下三处：

```yaml
volumes:
  - /var/run/docker.sock:/var/run/docker.sock
  - ./data:/app/data
  - /volume1/docker/stacks:/volume1/docker/stacks
environment:
  DOCKGE_STACKS_DIR: /volume1/docker/stacks
```

- **端口与访问控制**：若宿主机 `5001` 端口已被占用，可修改左侧映射端口（如 `"5002:5001"`）。由于面板持有 Docker Socket 权限，请仅在可信局域网或私有组网内开放访问。

## 新建与接管已有 Compose 项目

### 新建 Stack

在 Dockge 左上角点击 **+ Compose**，填入项目名称（即在 `/opt/stacks/` 下生成的子目录名），在右侧编辑器编写或粘贴 `compose.yaml` 与 `.env` 变量，核对端口与挂载目录后点击 **Deploy** 即可启动服务并在下方观察实时日志。

### 接管已有的 Compose 项目

要将此前在终端部署的 Compose 项目纳入 Dockge 管理，可按 [Dockge 官方文档][dockge-readme] 的步骤迁移：

1. 在原项目目录执行 `docker compose down` 停止旧服务。
2. 将原项目文件夹整体移入 `/opt/stacks/<项目名>/`，确保主配置文件名为 `compose.yaml`（或 `docker-compose.yml`）。
3. 在 Dockge 网页右上角菜单点击 **Scan Stacks Folder**，扫描识别后重新启动该项目。

迁移旧项目时需重点核对两点：

- **同步移动相对路径数据**：若 `compose.yaml` 中使用了 `./config`、`./data` 等相对路径绑定挂载，必须将对应的持久化数据文件夹随 `compose.yaml` 一起移入 `/opt/stacks/<项目名>/` 下，或将其改为原数据所在的宿主机绝对路径。
- **保持项目目录名一致**：Compose 默认使用文件夹名称作为命名卷与自定义网络的前缀。保持 `<项目名>` 与原文件夹同名，才能让容器继续挂载原有的命名卷。

## 日常更新与数据备份

- **更新业务容器**：在 Dockge 界面点击目标 Stack，如需切换固定版本标签先在编辑器中修改并保存，随后点击 **Update** 即可自动拉取新镜像并重建容器。
- **更新 Dockge 自身**：进入 Dockge 自身的项目目录，通过命令行拉取更新并重建（不会中断它所管理的业务容器）：

```bash
docker compose pull dockge
docker compose up -d dockge
```

- **备份范围**：日常备份需包含 Dockge 自身的 `./data` 目录、`/opt/stacks` 下的全部项目配置与子目录数据，以及业务容器挂载在 `/opt/stacks` 之外的宿主机绝对路径目录和 Docker 命名卷。

## 参考资料

- [Dockge 官方 README][dockge-readme]
- [官方 Compose 配置][dockge-compose]
- [Docker 绑定挂载][docker-bind]

[dockge-readme]: https://github.com/louislam/dockge
[dockge-compose]: https://github.com/louislam/dockge/blob/master/compose.yaml
[docker-bind]: https://docs.docker.com/engine/storage/bind-mounts/
