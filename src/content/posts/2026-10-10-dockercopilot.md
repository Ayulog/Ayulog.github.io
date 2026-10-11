---
title: DockerCopilot：容器更新与配置备份
description: DockerCopilot 的 Compose 安装、登录、手动更新和备份恢复，区分容器配置与业务数据。
author: Ayulog
pubDatetime: "2026-10-10T10:00:00+08:00"
draft: false
setupCategory: nas
setupRole: guide
tags:
  - Debian
  - Docker
  - DockerCopilot
---

DockerCopilot 可以在网页里手动更新容器、清理镜像和备份容器设置。[当前官方 README][copilot-readme]使用 bridge 网络、`12712` 端口与 `0nlylty/dockercopilot:latest`；镜像账户名开头是数字 `0`。

返回 [NAS 常用软件记录](/posts/2026-10-09-nas-software-websites/)；工具怎么选、升级前要备份什么，见 [Docker 管理工具与维护笔记](/posts/2026-10-10-docker-management/)。

## 开始之前

需要 Linux Docker Engine 和 Compose V2。还没装好时，先看 [Docker 官方安装文档](https://docs.docker.com/engine/install/)。每个工具放在独立目录中，下面的命令都在它自己的 Compose 项目目录执行。

文中的 `NAS_IP` 换成设备地址。管理页面只放在可信局域网或私有组网内；挂载 `/var/run/docker.sock` 后，工具就能操作宿主机 Docker，追加 `:ro` 也不会把 Docker API 变成只读。

## 部署与登录

在项目目录中准备 `data/`、`compose.yaml` 和 `.env`：

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

`.env` 中填写自己的口令：

```dotenv
DOCKERCOPILOT_SECRET_KEY='请替换为你自己的长随机口令'
```

`secretKey` 大小写不能改。官方要求不少于 8 位且非纯数字，实际使用独立长随机口令。`.env` 单引号可保留 `$` 字面值，口令内不要再放单引号；文件依然是明文，需要保护访问权限。

NAS 面板不读取 `.env` 时，按面板支持的方式传入变量。直接写入标准 Compose YAML 的字面 `$` 需写成 `$$`，YAML 单引号不能替代 Compose 插值转义，见 [Compose 插值文档][compose-interpolation]。

配置保留官方模板的 `privileged: true`，加上 socket 挂载后权限很高，应当作为管理入口保护。端口冲突可以改左侧，例如 `12713:12712`，无需改成 host 网络。

```bash
docker compose config --quiet
docker compose up -d
docker compose logs --tail=100 dockercopilot
```

访问 `http://NAS_IP:12712`，用 `secretKey` 登录。先确认容器列表与原 Docker 面板一致，选择可中断的测试容器验证，再执行一次设置备份，检查宿主机 `data/backups/` 是否落盘。

## 更新与清理

按[当前更新实现][copilot-update]，DockerCopilot 拉取目标镜像，停止并重命名旧容器，沿用创建参数启动新容器，再按选项决定是否删除旧容器。因此更新会中断服务，界面提示成功也不代表应用已完成健康检查。

更新前记下当前镜像，备份容器设置和业务数据。更新后先检查应用能否正常使用，稳定后再清理。指定的 tag 必须是镜像仓库中实际存在的标签，不能直接拿应用页面的版本号填写。

**保留旧容器不等于保留旧数据。** 新旧容器可能挂载同一数据库目录，不要同时启动它们写同一份数据。由 Compose 管理的服务，变更镜像后也要更新原文件；多服务项目优先通过原 Compose 一起维护。

清理时区分无 tag 镜像和未使用镜像。后者可能包含尚未创建容器的恢复版本，先核对用途再删除；不要顺手清理业务目录或 Docker 卷。

## 配置备份与恢复

[备份实现][copilot-backup]把容器名称及 `Config`、`HostConfig`、`NetworkingConfig` 写入 JSON，描述环境变量、端口、挂载和网络等创建参数。它是批量容器配置备份，**不包含数据库、下载任务文件或媒体内容**。

默认文件位于 `/data/backups/backup-YYYY-MM-DD.json`，同一天再次备份会覆盖同名文件，需要多个时间点时先另存。JSON 可能含环境变量中的凭据，连同 Compose、`.env` 和业务数据一起保护，并复制到独立位置。

[恢复实现][copilot-restore]会遍历整份备份、拉取镜像并创建容器，不会替你复制数据、重建自定义网络或自动启动；某个容器失败后仍可能继续处理其他项目。恢复顺序是：

1. 还原业务目录和卷，核对路径、权限、网络与镜像架构。
2. 处理同名容器和端口冲突，先保留仍需恢复的旧实例。
3. 执行恢复，逐个查看结果；“恢复完成”不代表全部成功。
4. 检查参数后启动容器，验证日志、页面和数据。

先在独立测试环境中练习整份恢复。备份中的 `latest` 是可变标签，重新拉取不保证得到备份当天的镜像。

更新 DockerCopilot 自身，先保存 `compose.yaml`、`.env` 和 `data/`，再从原项目目录执行：

```bash
docker compose pull dockercopilot
docker compose up -d dockercopilot
```

原始部署笔记参考磕巴白菜的 [DockerCopilot](https://hi.keba.host/archives/ugreen-DockerCopilot)，参数按下列上游资料核对。

## 参考资料

- [DockerCopilot README][copilot-readme]
- [容器更新实现][copilot-update]
- [配置备份实现][copilot-backup]
- [恢复实现][copilot-restore]
- [Compose 插值规则][compose-interpolation]

[copilot-readme]: https://github.com/onlyLTY/dockerCopilot/blob/latest/README.md
[copilot-update]: https://github.com/onlyLTY/dockerCopilot/blob/latest/internal/utiles/updatecontainer.go
[copilot-backup]: https://github.com/onlyLTY/dockerCopilot/blob/latest/internal/utiles/backupcontainer.go
[copilot-restore]: https://github.com/onlyLTY/dockerCopilot/blob/latest/internal/utiles/restorecontainer.go
[compose-interpolation]: https://docs.docker.com/reference/compose-file/interpolation/
