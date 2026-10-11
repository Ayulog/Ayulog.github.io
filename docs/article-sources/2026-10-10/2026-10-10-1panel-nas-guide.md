---
title: 1Panel：在 NAS 上用应用商店管理 Docker
description: 以绿联 NAS 为例，用 Docker Compose 部署社区版 1Panel 容器，整理 V2 镜像选择、目录映射、首次登录、应用商店、第三方应用与更新备份。
author: Ayulog
pubDatetime: "2026-10-10T10:00:00+08:00"
draft: true
tags:
  - 1Panel
  - NAS
  - 绿联
  - Docker
  - Docker Compose
  - 教程
---

NAS 自带的 Docker 页面能创建容器、查看日志，但装应用时，还是需要自己找镜像、填端口、设置目录。对于已经有人适配好的应用，1Panel 可以把这些步骤放进应用商店，用表单完成安装，再集中查看运行状态。

这篇单独记录 **1Panel 的用途、Docker Compose 部署和日常维护**，以绿联 NAS 为例。Docker 的安装、目录权限和基础网络设置，先看 [NAS Docker 安装及设置](/posts/2026-10-10-nas-docker-setup/)。

内容参考磕巴白菜的[绿联 1Panel 教程][keba-guide]，并于 **2026 年 10 月 10 日**对照 1Panel 官方文档与社区镜像项目重新整理。以下采用 `okxlin/docker-1panel` 项目当前说明中的 V2 方案，未在绿联设备上实机部署；不同 NAS 的支持情况仍需结合机型、系统与 Docker 版本确认。

## 目录

- [1Panel 能做什么](#1panel-能做什么)
- [先分清两种安装方式](#先分清两种安装方式)
- [部署前准备](#部署前准备)
- [用 Docker Compose 部署](#用-docker-compose-部署)
- [首次登录与检查](#首次登录与检查)
- [从应用商店安装服务](#从应用商店安装服务)
- [添加第三方应用](#添加第三方应用)
- [更新与备份](#更新与备份)
- [常见问题](#常见问题)
- [参考资料](#参考资料)

## 1Panel 能做什么

[1Panel][1panel-home] 是面向 Linux 的服务器管理面板，提供应用商店、容器管理、网站与数据库管理、文件管理、备份等功能。

放在 NAS 场景里，比较常用的是：

- 从应用商店选择服务，填写端口、账号、数据目录等参数后部署。
- 查看 Docker 容器、镜像、网络、日志和资源使用情况。
- 管理通过面板部署的应用，按应用支持情况进行更新和备份。
- 需要建站时，再配置网站、反向代理、数据库与证书。

应用商店里的“一键安装”，是把部署模板和参数表单准备好。镜像能否下载、端口是否冲突、数据目录有没有权限，仍然要逐项确认。

已经熟悉 Compose、NAS 原生 Docker 管理也够用时，可以继续用原来的方式。1Panel 是额外的管理入口，并不是 Docker 运行应用的前提。

## 先分清两种安装方式

| 方式           | 运行在哪里                                                           | 本文如何使用                                       |
| -------------- | -------------------------------------------------------------------- | -------------------------------------------------- |
| 官方原生安装   | 将 1Panel 安装到 Linux 主机，由主机运行面板服务                      | 适合自行维护的 Debian 等受支持系统，按官方文档安装 |
| 社区容器化部署 | 1Panel 运行在 Docker 容器中，通过挂载的 Docker socket 管理宿主机容器 | 本文的 NAS 示例采用此方式                          |

官方[在线安装文档][official-install]列出的范围是基于 Debian / RedHat 的主流 Linux 发行版。品牌 NAS 基于 Linux，并不代表它的系统服务、存储目录和 Docker 配置与普通发行版完全相同。

绿联 NAS 已有厂商维护的 Docker 时，不要直接照搬普通 Linux 主机的安装脚本来替换引擎。社区容器方案可以复用现有 Docker，但**它不是绿联或 1Panel 官方对 NAS 兼容性的承诺**；容器中的主机监控、系统设置等功能，也不能一概当作对 NAS 宿主机的完整管理。

本文使用的镜像是社区项目提供的 `moelin/1panel`。参考文章中的 `koryking/1panel`、`PANEL_PORT`、`PANEL_BASE_DIR` 等属于另一套示例，不能与本文的 `PORT`、`BASE_DIR` 混用。

已有 V1 的读者先保留原部署。**V1 不能通过把镜像标签改成 V2 来直接升级**；原生安装和容器安装的迁移方式也有区别，需按当前维护者说明另行安排。

## 部署前准备

先完成 NAS 自带 Docker 的安装，确认现有服务运行正常，并记录以下信息：

| 项目          | 示例或检查方式                                                  |
| ------------- | --------------------------------------------------------------- |
| NAS 地址      | 在路由器中设置 DHCP 地址保留，使用固定的局域网地址              |
| 面板端口      | 本文统一用 `10086`，先确认未被占用                              |
| 项目目录      | 保存 `compose.yaml`，方便以后更新和重建                         |
| 数据目录      | 选择已挂载、空间充足的存储空间，核对真实绝对路径                |
| Docker socket | 本文使用 `/var/run/docker.sock`，需确认当前设备实际存在且可访问 |
| CPU 架构      | 拉取前检查所选标签是否提供对应平台的镜像                        |

本文固定使用维护者文档列出的 **`moelin/1panel:v2.2.2`**。核对时 Docker Hub 的该标签包含 `linux/amd64`、`linux/arm64` 等平台，但镜像支持某个 CPU 架构，不等于所有使用该架构的 NAS 都兼容。

通过 SSH 管理 Docker 的读者，可以先检查：

```bash
docker version
docker compose version
docker ps
```

这些命令在 **NAS 的 SSH 终端**执行，按设备要求使用有权限的账户。主要使用图形界面的读者，也可以在 NAS 的 Docker 应用中检查服务状态、已有容器和 Compose 项目功能。

### 准备项目与数据目录

例如在绿联存储空间 1 中创建：

```text
/volume1/docker/1panel/
├── compose.yaml
└── data/
```

`/volume1/docker/1panel/data` 只是本文示例。请在 NAS 文件管理器中查看文件夹的真实路径；其他存储空间、飞牛或自建系统可能采用不同路径。

后面的配置会在 `data` 下保存 `1panel` 目录。路径优先使用简单的英文、数字和连字符，避免空格或中文路径与社区镜像的路径校验不兼容。

## 用 Docker Compose 部署

在 NAS 的 Docker 应用中，新建一个 Compose 项目，将下面的内容保存为 `compose.yaml`。如果通过 SSH 部署，则在前面准备的项目目录中创建文件。

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

部署前修改 `BASE_DIR` 和对应的目录挂载，设置自己的管理员名及安全入口。`ENTRANCE` 只填写路径片段，不加前后的 `/`。

当前维护者说明中，**首次启动时 `PASSWORD` 留空会生成随机密码，并输出到容器日志**，因此示例没有提供通用默认密码。保存首次启动日志中的登录信息，成功登录后可在面板中修改密码；日志中可能包含凭据，排错分享前要遮盖。

### 为什么数据目录要两边一致

这两处使用同一个宿主机真实路径：

```yaml
environment:
  BASE_DIR: /volume1/docker/1panel/data
volumes:
  - /volume1/docker/1panel/data:/volume1/docker/1panel/data
```

1Panel 通过 `docker.sock` 请求 **NAS 上的 Docker 引擎**创建应用容器。应用的绑定挂载源路径，由宿主机解释，而不是由 1Panel 容器解释。

如果把宿主机的 `/volume1/docker/1panel/data` 随意映射成容器里的 `/data`，再让面板用 `/data/...` 创建应用，宿主机可能找不到同一个目录，最终表现为空目录、配置丢失或服务启动失败。

因此，跟随该项目的约定：`BASE_DIR` 填宿主机真实路径，绑定挂载的左右两边保持一致。以后确实需要通过面板访问媒体目录时，再单独添加对应目录的映射和权限；不必一开始就挂载整个存储空间。

### 为什么没有 ports

示例使用 Linux 的 **host 网络**，面板直接监听 NAS 的 `10086` 端口，因此不再配置 `ports:`。如果这个端口已经占用，应在首次部署前修改 `PORT`，并在浏览器地址中使用同一个值。

挂载 Docker socket 会赋予面板很高的宿主机管理权限，能够影响已有容器。面板先限定在可信局域网或 VPN 内访问；需要远程管理时，可结合 [NAS 远程访问](/posts/2026-10-09-nas-remote-access/)选择方式。

### 启动项目

图形界面中保存并部署项目，等待镜像拉取和初始化完成。支持 Compose 命令的环境，也可在 `compose.yaml` 所在目录执行：

```bash
docker compose config --quiet
docker compose up -d
docker compose ps
docker compose logs --tail=100 1panel
```

第一条检查配置能否解析，后面依次启动、检查状态、查看日志。容器显示运行中后，还要确认日志中的初始化已完成。

如果卡在拉取镜像，先处理 Docker 引擎的网络问题，参考 [Docker 镜像加速源教程](/posts/2026-10-10-docker-registry-mirrors/)。修改面板网页里的入口或密码，不会解决镜像下载失败。

## 首次登录与检查

按本文未改动的端口和入口，浏览器访问：

```text
http://NAS_IP:10086/nas-panel-entry
```

将 `NAS_IP` 替换为 NAS 的局域网地址。如果前面修改了 `PORT` 或 `ENTRANCE`，这里也要同步使用实际值。安全入口是 URL 的一部分，只输入 IP 和端口可能无法打开登录页。

用户名使用配置中的值，密码使用首次启动日志生成的随机密码。进入面板后，依次确认：

1. 能正常登录，账号和密码已保存到自己的密码管理器。
2. 容器列表能看到预期的 Docker 环境与原有服务。
3. 数据目录位于预期存储空间，日志没有持续报错。
4. 安装一个测试应用后，可以访问服务，挂载路径也符合预期。

看到已有容器，不代表它们已变成“从 1Panel 应用商店安装的应用”。原有 Compose 项目仍保留原文件和维护入口，同一个项目不要同时在多个面板里修改、重建。

如果需要查看面板版本或登录入口，可以在 **NAS 的 SSH 终端**执行：

```bash
docker exec -it 1panel-v2 1pctl version
docker exec -it 1panel-v2 1pctl user-info
```

也可以打开 NAS Docker 界面里的 `1panel-v2` 容器终端，再执行 `1pctl version`、`1pctl user-info`。这些命令属于容器中的面板，宿主机不需要额外安装一套 1Panel。

## 从应用商店安装服务

先用内置应用商店完成一次部署，再考虑扩展第三方应用：

1. 打开应用商店，查看应用说明、来源和可选版本。
2. 选择所需版本，填写名称、端口、账号和持久化参数。
3. 检查是否需要数据库、Redis 等依赖，以及依赖会使用哪些资源。
4. 部署后查看应用状态、容器日志和实际绑定挂载。
5. 通过 NAS 地址与该应用端口访问，完成应用自身的初始化。

**面板端口与应用端口是两回事。** `10086` 用来打开 1Panel，装好的服务有自己的访问方式；同一台 NAS 的多个服务也不能重复占用相同的宿主机端口。

安装前重点看持久化设置。应用自身的数据库、配置、上传文件，可能位于面板数据目录下，也可能通过 Compose 指向其他目录或命名卷。以实际应用模板和容器挂载为准，不能只凭“在商店里安装”就认为所有数据都在同一个文件夹。

如果应用需要修改 Compose，先看清楚镜像、挂载和端口，再按当前应用支持的方式编辑。已有服务与自己的路径规划冲突时，先调整配置，不要为了适配模板移动整套媒体库。

## 添加第三方应用

内置商店没有需要的应用时，可以查看 [okxlin/appstore 的 `localApps` 分支][community-appstore]。该分支当前说明按 **1Panel V2 应用规范**组织目录，导入后通过本地应用入口使用。

第三方商店提供的是应用配置与安装模板，镜像仍由对应镜像维护者提供。添加商店不会自动安装里面的所有应用，也不能解决镜像仓库连接问题。

按本文示例路径，本地应用目录为：

```text
/volume1/docker/1panel/data/1panel/resource/apps/local/
```

可以按维护者文档使用 Git 导入，也可以手动操作：

1. 确认面板已完成初始化，并核对实际本地应用目录。
2. 从仓库下载 **`localApps` 分支**的 ZIP，解压后找到 `apps` 目录。
3. 若已有本地应用，先备份；将 `apps` 里面的各个应用目录复制到上面的 `local/` 下。
4. 目录层级应为 `local/应用目录/...`，不要额外套上 `appstore-localApps/apps/`。
5. 回到面板刷新本地应用列表，再查看目标应用的说明和配置。

不要把仓库的 `main` 分支说明、旧版教程的代理域名与 V2 文件混在一起使用。下载失败时，先检查 GitHub 连通性；手动下载 ZIP 也能完成导入。

导入同名目录可能覆盖自己的模板修改，之后更新第三方商店时也要先核对差异。商店模板更新与已安装应用的镜像升级是两步操作，分别检查。

## 更新与备份

### 更新面板容器

社区镜像维护者建议通过 **更新镜像并重建容器**升级，避免在容器里的面板直接更新二进制，导致运行状态与镜像版本不一致。

常规更新顺序是：

1. 阅读目标版本说明，确认属于可兼容升级的版本范围。
2. 记录当前镜像标签，备份 Compose 文件、面板数据和受影响的应用数据。
3. 将 `compose.yaml` 中的镜像标签改成核实过的新版本。
4. 在 NAS 的项目管理中拉取新镜像并重新部署，或在项目目录执行下面的命令。
5. 验证登录、应用列表和已有服务，再保留一段时间的旧备份。

```bash
docker compose pull 1panel
docker compose up -d 1panel
docker compose logs --tail=100 1panel
```

固定版本标签后，仅执行 `pull` 不会自动跳到另一个版本。`1pctl update` 则是修改用户名、密码、端口等配置的命令，**不是面板版本升级命令**。

### 备份要覆盖哪些内容

| 内容           | 本文示例或检查位置                                        |
| -------------- | --------------------------------------------------------- |
| 部署配置       | `compose.yaml`、使用过的镜像标签及自己的参数记录          |
| 面板数据       | `/volume1/docker/1panel/data/1panel/`，包含数据库、配置等 |
| 应用持久化数据 | 查看每个应用实际挂载的目录、命名卷与数据库                |
| 外部文件       | 媒体、上传文件等位于面板数据目录以外的内容                |

在线复制正在写入的数据库不一定能得到一致备份。应用有官方导出或备份功能时，优先使用；做文件级备份时，安排停止相应写入服务或使用合适的快照方式，并验证恢复流程。

只停止 1Panel 管理容器，通常不会停止它通过宿主机 Docker 创建的其他应用容器，因此不能把“面板已停止”当成“所有数据库都已停止写入”。

备份放到独立位置，并保留升级前的版本。遇到数据库结构变化时，直接换回旧镜像未必能恢复，需要匹配升级前的数据备份。删除面板容器、删除应用和清理应用数据，也应分别确认范围。

## 常见问题

### 容器运行了，网页却打不开

先核对 **NAS 地址、`PORT`、`ENTRANCE` 和 HTTP / HTTPS 协议**，再检查日志是否完成初始化。示例使用 host 网络，检查端口占用及 NAS 防火墙，不要通过增加 `ports:` 来补救。

参考文章中的 YAML 使用 `10088`，后文访问地址却写成 `10086`。本文统一为 `10086`，实际使用时始终以自己的配置和日志为准。

### 改了 Compose 里的账号、密码或入口，却没有生效

当前社区镜像的账号、密码和入口配置主要用于首次初始化。已经生成数据后，单纯修改 `USERNAME`、`PASSWORD`、`ENTRANCE` 再重建，不等于自动覆盖已有面板配置。`PORT` 则会由当前入口脚本在启动时同步，修改后重建容器，并用新端口访问。

优先在面板设置中修改；无法登录时，先查看容器内 `1pctl help` 和维护者的账号恢复说明。维护者提供的 `RESET=true` 会重新配置账号、密码、端口和入口，不要把它当作日常运行参数一直保留。

### 应用能创建，但配置目录是空的

检查 `BASE_DIR`、面板容器的目录映射和应用容器实际挂载的源路径。宿主机必须能在那个路径下找到同一份文件。

参考文章中的 `./volumes:/var/lib/docker/volumes` 并不表示已经挂载了宿主机所有真实 Docker 卷。本文 V2 示例不依赖这项旧配置；使用命名卷的应用，按实际 Docker 卷位置单独确认备份。

### NAS 自带面板和 1Panel 都能看到容器，该在哪里改

为每个应用保留一个主要维护入口。NAS 原来创建的项目继续由原项目文件管理；通过 1Panel 商店部署的应用，优先在 1Panel 中按其支持的方式维护。

另一个界面可以查看状态，但重复创建、修改或删除同一组容器，容易让项目记录与实际状态不一致。

### 能否用在飞牛、极空间或 Windows

其他 Linux NAS 需要分别确认 Docker socket、host 网络、真实路径、权限和系统兼容性，不能只替换一个目录就假定可用。

本文没有覆盖 Docker Desktop、WSL 或 Windows 的面板部署。自建 Debian 主机可以优先评估官方原生安装；各品牌 NAS 继续以当前系统和社区项目的适配情况为准。

## 参考资料

- 磕巴白菜：[新绿联部署 1Panel——用逛应用商店的方式部署 Docker][keba-guide]。本文参考其部署思路，重新整理配置与说明。
- [1Panel 官网][1panel-home]
- [1Panel 官方在线安装文档][official-install]
- [1Panel 官方命令行工具说明][official-cli]
- [okxlin/docker-1panel：社区容器镜像与部署说明][community-image]
- [Docker Hub：moelin/1panel 标签列表][image-tags]
- [okxlin/appstore：localApps 分支与导入说明][community-appstore]
- [Docker：绑定挂载的宿主机路径规则][docker-bind]
- [Docker：保护 Docker daemon 访问][docker-access]

[keba-guide]: https://hi.keba.host/archives/ugreen-1panel
[1panel-home]: https://1panel.cn/
[official-install]: https://docs.fit2cloud.com/1panel/installation/online-installation
[official-cli]: https://docs.fit2cloud.com/1panel/installation/cli
[community-image]: https://github.com/okxlin/docker-1panel
[image-tags]: https://hub.docker.com/r/moelin/1panel/tags
[community-appstore]: https://github.com/okxlin/appstore/tree/localApps
[docker-bind]: https://docs.docker.com/engine/storage/bind-mounts/
[docker-access]: https://docs.docker.com/engine/security/protect-access/
