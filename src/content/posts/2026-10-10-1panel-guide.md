---
title: 1Panel：直接安装与 Docker 部署
description: 记录 1Panel V2 的官方 Linux 安装和社区 Docker 部署，包含管理命令、路径约定、应用商店与备份。
author: Ayulog
pubDatetime: "2026-10-10T10:00:00+08:00"
draft: false
setupCategory: nas
setupRole: guide
tags:
  - NAS
  - Debian
  - Docker
  - 1Panel
---

1Panel 把应用商店、容器、网站、数据库和备份放在一个面板里。它能省去一部分手写配置的工作，安装应用时仍要看清镜像来源、端口和数据目录。

返回 [NAS 常用软件记录](/posts/2026-10-09-nas-software-websites/)；工具怎么选、升级前要备份什么，见 [Docker 管理工具与维护笔记](/posts/2026-10-10-docker-management/)。

## 开始之前

下面两种方法选一种：

- 自建 Debian 等受支持的 Linux 主机：使用官方安装脚本，面板直接运行在宿主机上。
- 已有 Docker 的 NAS：可评估社区镜像 `moelin/1panel`。品牌 NAS 的 Docker 引擎由厂商套件管理，不能据此认定适合运行官方 Linux 安装脚本。

文中的 `NAS_IP` 换成设备地址。管理页面放在可信局域网或私有组网内，两种方式各自使用独立的数据目录和端口。

## 方法一：在 Linux 上直接安装

### 系统要求

[官方在线安装文档][panel-install]支持基于 Debian、RedHat 的主流 Linux 发行版，包括部分国产系统；架构列有 `x86_64`、`aarch64`、`armv7l`、`ppc64le`、`s390x` 和 `riscv64`。建议可用内存大于 1 GB，并能访问互联网。面板支持某个架构，不代表应用商店中的每个镜像都支持它。

以下命令以 Debian 为例，在目标 NAS 的 SSH 终端中用 root 执行；普通管理员先运行 `sudo -i`。安装过程会写入系统服务、安装目录和网络配置，已有 Docker 的主机要保留现有数据及引擎配置。

### 下载并运行安装脚本

先安装下载工具：

```bash
apt update
apt install -y curl ca-certificates
```

使用官方 V2 在线安装脚本，下载成功后再运行：

```bash
curl -fL https://resource.fit2cloud.com/1panel/package/v2/quick_start.sh -o 1panel-quick-start.sh
bash 1panel-quick-start.sh
```

如果下载失败，先处理网络问题，不要继续执行第二行。按脚本提示选择安装目录、端口、安全入口和管理员账号。默认安装目录为 `/opt`，面板数据放在其下的 `1panel/`；使用其他磁盘时填稳定挂载的绝对路径。

没有 Docker 时，按安装器提示决定是否安装；已有 Docker 时先核对检测结果，不要重复安装或覆盖已有 `daemon.json`。品牌 NAS 使用厂商提供的容器套件，跳到下面的 Docker 方法。

安装结束后，终端会打印访问地址，形式为：

```text
http://NAS_IP:实际端口/实际安全入口
```

端口和入口以安装输出为准，不一定是 Docker 示例中的 `10086`。若有防火墙，只允许需要访问面板的局域网或私有组网地址连接该端口。

### 查看状态与修改账号

在宿主机终端执行：

```bash
1pctl status core
1pctl status agent
1pctl version
1pctl user-info
```

忘记访问入口时查看 `user-info`。修改用户名、密码或端口使用交互命令：

```bash
1pctl update username
1pctl update password
1pctl update port
```

需要重启面板时执行 `1pctl restart all`；完整用法见 [1pctl 命令行工具][panel-cli]。`update` 修改面板配置，版本升级在 Web 控制台中点击“检查更新”。升级前备份面板和应用数据。

## 方法二：使用社区 Docker 镜像

需要 Linux Docker Engine 和 Compose V2。自建 Debian 的安装步骤见 [Docker 官方 Debian 文档][docker-debian]；品牌 NAS 使用厂商容器套件提供的 Compose 或项目功能。以下命令都在保存 `compose.yaml` 的项目目录执行。

下面使用 [okxlin/docker-1panel][panel-image] 提供的社区容器镜像 `moelin/1panel`。这不是 1Panel 或 NAS 厂商对各机型兼容性的承诺，容器里的系统监控也不能一概当作宿主机的完整管理。

挂载 `/var/run/docker.sock` 后，面板可以操作宿主机 Docker，具有很高的主机权限；追加 `:ro` 也不会把 Docker API 变成只读。

旧教程的 `koryking/1panel`、`PANEL_PORT`、`PANEL_BASE_DIR` 属于其他部署示例，不要混用。已有 V1 也不能把标签改成 V2 就直接升级，需要另行按迁移流程处理。

### Compose 部署与路径约定

本文固定使用维护者文档列出的 `v2.2.2`（2026-10-10 核对）。在 NAS 创建项目和数据目录，将以下保存为 `compose.yaml`：

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

先修改管理员名、安全入口和实际数据路径。`/volume1/docker/1panel/data` 是示例，其他 NAS 按实际存储路径修改。`ENTRANCE` 只填路径片段，不加前后 `/`。首次启动时 `PASSWORD` 留空会生成随机密码并输出到日志，分享日志时遮盖凭据。

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

需要第三方模板时，可参考 [okxlin/appstore 的 `localApps` 分支][panel-appstore]。按本文 Docker 示例，本地应用目录为：

```text
/volume1/docker/1panel/data/1panel/resource/apps/local/
```

直接安装且使用默认目录时，对应 `/opt/1panel/resource/apps/local/`；其他情况按实际安装目录查找。

核对实际目录并备份已有模板后，下载该分支 ZIP，把 `apps` 内的各应用目录放进 `local/`，最终应是 `local/应用目录/...`，不要多套一层仓库目录。刷新本地应用列表后，逐项检查需要的应用再安装。

模板更新和已安装应用的镜像升级是两步操作。同名模板可能覆盖自己的修改，第三方商店也不会替你解决镜像仓库连接问题。

## 更新、备份与登录排错

直接安装使用面板内的“检查更新”；Docker 方式按下面的方法更新镜像。

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
- [1pctl 命令行工具][panel-cli]
- [okxlin/docker-1panel 社区镜像][panel-image]
- [okxlin/appstore 本地应用模板][panel-appstore]
- [Docker Engine 在 Debian 上的安装说明][docker-debian]

[panel-install]: https://docs.fit2cloud.com/1panel/installation/online-installation
[panel-cli]: https://docs.fit2cloud.com/1panel/installation/cli
[panel-image]: https://github.com/okxlin/docker-1panel
[panel-appstore]: https://github.com/okxlin/appstore/tree/localApps
[docker-debian]: https://docs.docker.com/engine/install/debian/
