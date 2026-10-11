---
title: 1Panel：社区 Docker 镜像部署笔记
description: 用 moelin/1panel 部署 1Panel V2，记录路径约定、安全入口、应用商店和更新备份。
author: Ayulog
pubDatetime: "2026-10-10T10:00:00+08:00"
draft: true
setupCategory: debian
setupRole: guide
tags:
  - Debian
  - Docker
  - 1Panel
---

1Panel 把应用商店、容器、网站、数据库和备份放在一个面板里。它能省去一部分手写配置的工作，安装应用时仍要看清镜像来源、端口和数据目录。

返回 [Debian 常用软件记录](/posts/2026-10-09-nas-software-websites/)；工具怎么选、升级前要备份什么，见 [Docker 管理工具与维护笔记](/posts/2026-10-10-docker-management/)。

## 开始之前

需要 Linux Docker Engine 和 Compose V2。还没装好时，先看 [Docker 安装与设置](/posts/2026-10-10-nas-docker-setup/)。每个工具放在独立目录中，下面的命令都在它自己的 Compose 项目目录执行。

文中的 `NAS_IP` 换成设备地址。管理页面只放在可信局域网或私有组网内；挂载 `/var/run/docker.sock` 后，工具就能操作宿主机 Docker，追加 `:ro` 也不会把 Docker API 变成只读。

## 这里使用社区容器镜像

[官方在线安装][panel-install]面向受支持的 Linux 发行版，自建 Debian 可以优先评估；品牌 NAS 已有厂商维护的 Docker 时，不要直接套用普通 Linux 安装脚本替换引擎。

下面使用 [okxlin/docker-1panel][panel-image] 提供的社区容器镜像 `moelin/1panel`。这不是 1Panel 或 NAS 厂商对各机型兼容性的承诺，容器里的系统监控也不能一概当作宿主机的完整管理。

旧教程的 `koryking/1panel`、`PANEL_PORT`、`PANEL_BASE_DIR` 属于其他部署示例，不要混用。已有 V1 也不能把标签改成 V2 就直接升级，需要另行按迁移流程处理。

## Compose 部署与路径约定

本文固定使用维护者当前文档列出的 `v2.2.2`。在 NAS 创建项目和数据目录，将以下保存为 `compose.yaml`：

```yaml
services:
  1panel:
    image: moelin/1panel:v2.2.2
    container_name: 1panel-v2
    restart: unless-stopped
    network_mode: host
    environment:
      TZ: Asia/Shanghai
      BASE_DIR: /volume1/docker/1panel/data
      PORT: "10086"
      USERNAME: paneladmin
      PASSWORD: ""
      ENTRANCE: nas-panel-entry
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /volume1/docker/1panel/data:/volume1/docker/1panel/data
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```

先修改管理员名、安全入口和实际数据路径。`ENTRANCE` 只填路径片段，不加前后 `/`。首次启动时 `PASSWORD` 留空会生成随机密码并输出到日志，分享日志时遮盖凭据。

`BASE_DIR` 与挂载左右两侧保持同一个宿主机真实路径。面板通过宿主机 Docker 创建应用，绑定挂载源路径由宿主机解释；随意把它映射成容器内另一条 `/data`，容易让应用读到空目录。

示例用 Linux host 网络，不再配置 `ports:`。确认 `10086` 未被占用；需要修改时更改 `PORT`，浏览器也使用实际端口。

```bash
docker compose config --quiet
docker compose up -d
docker compose logs --tail=100 1panel
```

初始化完成后访问 `http://NAS_IP:10086/nas-panel-entry`，使用配置的用户名与日志生成的密码。检查容器列表和数据路径，再安装一个测试应用，确认实际挂载与访问正常。

需要查看版本或入口时，在 NAS 终端执行：

```bash
docker exec -it 1panel-v2 1pctl version
docker exec -it 1panel-v2 1pctl user-info
```

## 应用商店与第三方模板

先用内置商店完成一次部署：查看应用来源和版本，填写端口、账号及数据位置，确认数据库等依赖，再检查部署日志和应用页面。面板端口 `10086` 与应用自身端口分开，不能混用。

应用数据可能位于面板目录，也可能在其他绑定目录或命名卷中，以实际模板和容器挂载为准。原有容器能被看见，并不意味着它们已经变成商店应用。

需要第三方模板时，可参考 [okxlin/appstore 的 `localApps` 分支][panel-appstore]。按本文路径，本地应用目录为：

```text
/volume1/docker/1panel/data/1panel/resource/apps/local/
```

核对实际目录并备份已有模板后，下载该分支 ZIP，把 `apps` 内的各应用目录放进 `local/`，最终应是 `local/应用目录/...`，不要多套一层仓库目录。刷新本地应用列表后，逐项检查需要的应用再安装。

模板更新和已安装应用的镜像升级是两步操作。同名模板可能覆盖自己的修改，第三方商店也不会替你解决镜像仓库连接问题。

## 更新、备份与登录排错

社区镜像维护者建议拉取新镜像并重建，避免在容器内直接升级面板二进制。先阅读目标版本说明，备份 Compose、`data/1panel/` 与各应用实际数据，再修改为确认兼容的版本标签：

```bash
docker compose pull 1panel
docker compose up -d 1panel
docker compose logs --tail=100 1panel
```

固定标签下仅执行 `pull` 不会跳到另一个版本；`1pctl update` 用于修改用户名、密码、端口等配置，不是版本升级命令。

页面打不开，先核对 IP、端口、安全入口和协议，再看初始化日志及防火墙。已有数据后，修改 Compose 中的 `USERNAME`、`PASSWORD`、`ENTRANCE` 不代表自动覆盖已有账号设置，优先在面板内修改或按维护者恢复说明操作。`RESET=true` 会强制重新配置，不要作为日常参数一直保留。

备份面板目录时，还要覆盖商店应用的数据库、卷和外部文件。只停止 1Panel 容器不等于应用停止写入，文件级备份应按具体数据库要求安排。
原始部署笔记参考磕巴白菜的 [1Panel](https://hi.keba.host/archives/ugreen-1panel)，参数按下列上游资料核对。

## 参考资料

- [1Panel 官方原生安装][panel-install]
- [okxlin/docker-1panel 社区镜像][panel-image]
- [okxlin/appstore 本地应用模板][panel-appstore]

[panel-install]: https://docs.fit2cloud.com/1panel/installation/online-installation
[panel-image]: https://github.com/okxlin/docker-1panel
[panel-appstore]: https://github.com/okxlin/appstore/tree/localApps
