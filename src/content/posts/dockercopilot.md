---
title: DockerCopilot：容器更新与配置备份
description: 用一个网页界面手动更新容器、备份创建参数；含安装、登录与恢复步骤。
author: Ayulog
pubDatetime: "2026-10-10T10:00:00+08:00"
draft: false
category: nas
tags:
  - Debian
  - Docker
---

在绿联、极空间、飞牛或自建 Debian NAS 上，如果不想配置全自动更新，而是希望在网页里直观看到哪些容器有新版本、手动勾选更新、顺手清理旧镜像并导出容器创建参数备份，可以使用 DockerCopilot。以下按照 [DockerCopilot 官方 README][copilot-readme] 采用 bridge 网络与默认 `12712` 端口部署。

同类容器面板与更新工具的对比见 [NAS 服务清单](/posts/nas-software-websites/)，通用的容器升级与数据备份流程见 [Docker 应用维护](/posts/docker-management/)。

## Compose 部署与登录配置

确保宿主机已安装 [Docker Engine](https://docs.docker.com/engine/install/) 与 Compose V2。新建独立的项目目录，在其中创建 `compose.yaml`：

```yaml
services:
  dockercopilot:
    image: 0nlylty/dockercopilot:latest
    container_name: dockercopilot
    restart: unless-stopped
    privileged: true
    network_mode: bridge
    ports:
      - "12712:12712"
    environment:
      TZ: Asia/Shanghai
      DOCKER_HOST: unix:///var/run/docker.sock
      secretKey: ${DOCKERCOPILOT_SECRET_KEY:?请先在 .env 中设置登录口令}
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./data:/data
```

在同目录下创建 `.env` 文件，设置独立的后台登录口令：

```dotenv
DOCKERCOPILOT_SECRET_KEY='请替换为你自己的长随机口令'
```

在项目目录启动服务并查看日志：

```bash
docker compose up -d
docker compose logs --tail=100 dockercopilot
```

启动后浏览器访问 `http://NAS_IP:12712`（将 `NAS_IP` 替换为设备局域网地址），输入 `secretKey` 即可登录。

配置时的注意事项：

- **镜像名与环境变量名**：镜像命名空间开头为数字 `0`（`0nlylty/dockercopilot:latest`）；环境变量名 `secretKey` 区分大小写，口令要求不少于 8 位且不能为纯数字。若在不支持 `.env` 的 NAS 面板中直接将口令写进 `compose.yaml`，且口令中包含 `$` 符号，需按 [Compose 插值文档][compose-interpolation] 写成 `$$` 转义。
- **权限与访问范围**：配置沿用了上游要求的 `privileged: true` 并挂载了 `/var/run/docker.sock`，拥有宿主机完整容器管理权限，请仅在可信局域网或私有组网内开放该端口。

## 手动更新容器与清理镜像

### 更新容器机制与要点

参考 [DockerCopilot 容器更新实现][copilot-update]，在网页中勾选容器并点击更新时，程序会依次拉取目标标签的新镜像、停止并重命名旧容器、读取旧容器的创建参数启动新容器，最后根据勾选项决定是否移除旧容器。使用时的关键细节如下：

- **确认标签与日志**：更新时填写的 Tag 必须是镜像仓库中实际存在的标签。界面提示更新完成后，建议打开目标应用网页并查看容器日志，确认数据库迁移与业务功能正常。
- **避免新旧容器共写同一目录**：若更新时选择保留旧容器作为回退备份，切勿将旧容器与新容器同时启动，以免两个实例同时写入同一个持久化数据库目录造成数据损坏。
- **同步原 Compose 文件**：对于原本通过 `compose.yaml` 部署的容器，若在 DockerCopilot 中修改了固定版本标签，记得同步更新原目录的 `compose.yaml`，防止下次执行 `docker compose up -d` 时又退回旧标签。

### 清理冗余镜像

在镜像页面清理空间时，注意区分“无标签镜像（dangling images）”与“未使用镜像（unused images）”：无标签镜像通常是更新替换下来的旧镜像层，确认新容器运行稳定后即可清理；而“未使用镜像”会包含所有当前没有关联运行容器的镜像，清理前先确认其中没有刻意保留的回退镜像。

## 容器参数备份与恢复流程

### 导出与还原容器创建参数

参考 [配置备份实现][copilot-backup]，点击面板中的备份功能会在宿主机 `./data/backups/` 下生成 `backup-YYYY-MM-DD.json`（同一天内多次执行会覆盖当天同名文件）。该 JSON 文件记录了当前各容器的 `Config`、`HostConfig` 与 `NetworkingConfig`（即环境变量、端口映射、目录挂载路径与网络名称等创建参数），**不包含挂载目录内的业务文件、数据库或 Docker 命名卷内容**。

当需要利用该 JSON 执行批量恢复（参见 [恢复实现][copilot-restore]）时，按以下顺序操作：

1. **先还原底层数据与网络**：将各应用的持久化数据目录、数据库备份还原到原宿主机路径，核对目录读写权限，并提前创建好原有的自定义 Docker 网络。
2. **清理冲突容器**：排查宿主机上是否存在同名容器或占用相同端口的实例。
3. **执行配置恢复并启动**：在 DockerCopilot 中导入备份 JSON，程序会依次拉取镜像并创建容器（创建后默认处于停止状态），核对挂载参数无误后逐一启动容器并检查日志。

### 更新 DockerCopilot 自身

需要更新 DockerCopilot 面板本身时，先备份项目目录下的 `compose.yaml`、`.env` 与 `data/`，然后在项目目录执行：

```bash
docker compose pull dockercopilot
docker compose up -d dockercopilot
```

## 参考资料

- [DockerCopilot README][copilot-readme]
- [容器更新实现][copilot-update]
- [配置备份实现][copilot-backup]
- [恢复实现][copilot-restore]
- [Compose 插值规则][compose-interpolation]
- 磕巴白菜：[绿联 NAS 部署 DockerCopilot 笔记](https://hi.keba.host/archives/ugreen-DockerCopilot)

[copilot-readme]: https://github.com/onlyLTY/dockerCopilot/blob/latest/README.md
[copilot-update]: https://github.com/onlyLTY/dockerCopilot/blob/latest/internal/utiles/updatecontainer.go
[copilot-backup]: https://github.com/onlyLTY/dockerCopilot/blob/latest/internal/utiles/backupcontainer.go
[copilot-restore]: https://github.com/onlyLTY/dockerCopilot/blob/latest/internal/utiles/restorecontainer.go
[compose-interpolation]: https://docs.docker.com/reference/compose-file/interpolation/
