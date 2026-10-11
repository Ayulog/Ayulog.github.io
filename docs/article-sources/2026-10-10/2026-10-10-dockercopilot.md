---
title: DockerCopilot：容器更新、镜像清理与配置备份
description: 以绿联 NAS 为例，用 Docker Compose 部署 DockerCopilot，整理容器更新、指定镜像版本、清理旧镜像和备份恢复的操作，并说明配置备份与业务数据备份的区别。
author: Ayulog
pubDatetime: "2026-10-10T12:00:00+08:00"
draft: true
tags:
  - DockerCopilot
  - Docker
  - Docker Compose
  - NAS
  - 教程
---

NAS 上的容器装好以后，还要处理更新、旧镜像清理和配置备份。服务不多时，逐个在 Docker 面板里操作也能完成；数量增加以后，一个集中处理这些事情的小工具会方便不少。

[DockerCopilot][project] 就是这样的容器管理工具。它提供 Web 界面，可以启动、停止、重启和更新容器，也能清理镜像、备份与恢复容器设置。这篇以绿联 NAS 为例，把部署和日常维护单独整理一下，其他使用 Linux Docker Engine 的 NAS 也可以按自己的目录与权限配置参考。

本文参考磕巴白菜的[《新绿联部署 DockerCopilot，从此让你的容器实现一键更新、清理、备份》][keba]，部署参数与功能边界对照当前官方 README 和源码整理，资料核对于 **2026 年 10 月 10 日**。示例未在绿联 NAS 上实机部署，界面以实际安装版本为准。

## 目录

- [DockerCopilot 能做什么](#dockercopilot-能做什么)
- [部署前准备](#部署前准备)
- [用 Docker Compose 部署](#用-docker-compose-部署)
- [首次登录与基本检查](#首次登录与基本检查)
- [更新容器与指定版本](#更新容器与指定版本)
- [清理旧镜像](#清理旧镜像)
- [备份与恢复容器配置](#备份与恢复容器配置)
- [更新 DockerCopilot 自身](#更新-dockercopilot-自身)
- [常见问题](#常见问题)
- [参考资料](#参考资料)

## DockerCopilot 能做什么

官方当前列出的功能包括：

| 功能                          | 适合用来做什么                       |
| ----------------------------- | ------------------------------------ |
| 启动、停止、重启、重命名容器  | 集中处理日常容器操作                 |
| 一键更新、指定镜像和 tag 更新 | 重建目标容器，切换到需要的镜像版本   |
| 查看更新进度                  | 了解镜像拉取与容器重建的执行情况     |
| 删除无 tag 镜像、未使用镜像   | 清理更新后留下的旧镜像               |
| 备份与恢复容器设置            | 保存创建参数，后续按参数重新创建容器 |

这里最容易混淆的是最后一项：**备份容器设置，不等于备份整个应用的数据。** 下载器的任务状态、媒体库数据库、应用配置目录，以及挂载进去的业务文件，仍然需要另外备份。

程序会[检查当前镜像标签是否有更新][check-update-source]，提示用于发现镜像变化；“一键更新”仍需要主动执行。发现镜像更新，不代表会自动升级，也不能判断新版本与现有配置、数据是否兼容，更新之前仍要看应用的发布说明。

## 部署前准备

先在 NAS 的应用中心安装并打开 Docker，确认已有容器可以正常运行，再准备以下内容：

- **固定的访问地址。** 给 NAS 设置合适的 DHCP 地址保留或静态地址，方便以后访问管理页面。
- **一个持久化目录。** 用于存放 DockerCopilot 的数据和容器配置备份，部署前确认目录存在且可写。
- **可用的端口。** 本文使用 `12712`，如果已被占用，可以修改宿主机一侧的映射端口。
- **Docker socket 的挂载能力。** 示例使用 `/var/run/docker.sock` 连接本机 Docker 引擎，普通共享文件夹不能代替这个 socket。

原参考文使用 `UGREEN` 镜像标签、host 网络和一个固定的 HTTP 代理地址。[当前官方示例][readme]使用 `latest`、bridge 网络与端口映射，本文按这个配置整理，不默认加入代理。

DockerCopilot 需要通过 Docker socket 操作其他容器，官方模板还启用了 `privileged: true`。这会给管理容器较高的权限，应把它当作 NAS 管理入口：设置独立口令，在可信局域网或私有组网中访问，避免直接把管理端口转发到公网。

## 用 Docker Compose 部署

### 准备目录

如果通过 SSH 使用 Compose，在准备存放应用配置的位置执行：

```bash
mkdir -p dockercopilot/data
cd dockercopilot
```

最终目录可以是：

```text
dockercopilot/
├── compose.yaml
├── .env
└── data/
```

使用绿联的 Docker 项目或 Compose 界面时，先用文件管理器创建对应目录，并记下系统显示的**真实路径**。项目入口及是否支持读取 `.env` 以当前系统为准；如果面板不能选择 Docker socket，可以通过它支持的 Compose 导入方式或 SSH 部署。

### 写入配置

创建 `compose.yaml`：

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

在同一目录创建 `.env`，写入自己的登录口令：

```dotenv
DOCKERCOPILOT_SECRET_KEY='请替换为你自己的长随机口令'
```

引号内是占位说明，部署前必须替换。官方要求 `secretKey` **不少于 8 位且非纯数字**，实际使用建议采用更长的独立随机口令。变量名 `secretKey` 的大小写需要保持一致。

`.env` 的单引号可以保留口令里的 `$` 等字符字面值；示例口令内不要再使用单引号。`.env` 只是方便把口令与主体配置分开，它依然是明文文件，需要限制访问。Compose 插值规则可查阅[官方说明][compose-env]。

如果 NAS 面板只允许粘贴 YAML、不读取项目目录的 `.env`，把 `secretKey` 的值直接改成用单引号包裹的实际口令。按标准 Compose 规则，直接写在 YAML 值中的字面 `$` 需要写成 `$$`，单引号不能代替这一步转义；`.env` 单引号内则仍写单个 `$`。具体见 [Compose 插值说明][compose-interpolation]，使用厂商面板时也要核对其处理规则。不要把含真实口令的配置公开分享。

几个关键参数分别对应：

| 参数                           | 说明                                                     |
| ------------------------------ | -------------------------------------------------------- |
| `0nlylty/dockercopilot:latest` | 上游当前推荐的镜像；账户名开头是数字 `0`                 |
| `12712:12712`                  | 左边是 NAS 端口，右边是容器服务端口                      |
| `./data:/data`                 | 把本地数据目录挂载到容器的 `/data`，用于持久化备份等数据 |
| `/var/run/docker.sock`         | 连接本机 Docker 引擎，管理容器和镜像                     |
| `DOCKER_HOST`                  | 指向上面挂载的 Unix socket                               |
| `privileged: true`             | 沿用官方当前部署模板的权限设置                           |
| `restart: unless-stopped`      | 异常退出或引擎重启后按策略启动，手动停止后保持停止       |

命令行在上述项目目录执行时，`./data` 对应项目里的 `data` 文件夹。NAS 面板如何解析相对路径取决于它的项目实现；不确定时，把 `./data` 换成文件管理器确认过的真实绝对路径，只替换冒号左侧，容器内仍为 `/data`。

如果 `12712` 已被占用，例如改为 `"12713:12712"`，后面访问时也要改用 NAS 的 `12713`。bridge 模式已经配置了端口映射，不需要再改成 host 网络。

### 启动服务

在 `compose.yaml` 所在目录执行：

```bash
docker compose config --quiet
docker compose pull
docker compose up -d
docker compose ps
docker compose logs --tail=100 dockercopilot
```

`config --quiet` 用于检查配置与变量解析，不把展开后的口令直接打印出来。使用 NAS 面板时，创建并启动项目后，同样检查容器状态与日志。

如果报目录不存在、挂载失败或 socket 无法访问，先核对路径和权限。不要把 `/var/run/docker.sock` 当普通文件新建，也不要通过给所有文件设置可写权限来掩盖问题。

## 首次登录与基本检查

浏览器打开：

```text
http://NAS_IP:12712
```

把 `NAS_IP` 换成 NAS 的实际局域网地址，使用前面设置的 `secretKey` 登录。修改过宿主机端口时，以修改后的端口为准。

进入页面后，先做三个检查：

1. **容器列表是否正确。** 能否看到这台 NAS 上已有的容器、名称和使用的镜像。
2. **状态是否一致。** 对照 NAS 原有 Docker 面板，确认运行状态一致；需要测试启停时，选择可以中断的测试容器。
3. **配置备份是否落盘。** 执行一次配置备份，确认宿主机的 `data/backups/` 中出现 JSON 文件，再把文件复制到另一个位置留存。

页面能打开但容器列表为空，通常要继续检查 Docker socket、`DOCKER_HOST` 和日志。页面访问与 Docker 引擎连接是两个不同环节。

## 更新容器与指定版本

### 更新实际上做了什么

根据当前[更新实现][update-source]，主要流程是：

```text
拉取目标镜像
    ↓
停止旧容器，并给旧容器名称追加时间戳
    ↓
沿用原有创建参数，新建并启动容器
    ↓
根据删除旧容器的选项，决定是否保留旧容器
```

因此，更新会造成目标服务短暂中断。新容器通常继续使用原有挂载目录，应用启动时也可能升级数据库或修改配置文件。

### 建议的更新顺序

1. **确认要更新的容器。** 核对应用、镜像来源、当前 tag 和目标 tag，先读升级说明，特别留意跨大版本迁移。
2. **备份配置和业务数据。** 导出容器设置，另外备份持久化目录、Docker 卷及数据库；数据库按应用要求导出或停服务备份。
3. **确认能找回旧版本。** 记录旧镜像的准确版本或摘要，保留恢复所需镜像与数据。首次使用时先选择一个容易恢复的服务测试。
4. **执行更新。** 在界面中选择目标容器，检查镜像与 tag，需要保留旧容器时确认相应选项，再开始更新并查看进度。
5. **检查新服务。** 查看日志、健康状态与实际页面，确认原数据、网络访问和关联服务都正常。
6. **稳定后再清理。** 经过观察，确认不再需要旧容器和旧镜像时，再执行删除。

当前程序在 Docker 接受启动请求后即可报告更新成功，并不会替你等待应用完成健康检查；出错也不能假定会自动回滚。遇到异常，先检查旧容器、新容器和挂载数据的状态，再决定恢复步骤。

**保留旧容器不等于保留旧数据。** 新旧容器如果挂载同一个数据库目录，启动新版本后数据可能已经迁移。不要让两个实例同时写同一份业务数据；需要回退时，应按应用说明配套恢复旧版本和相应数据备份。

### 指定镜像与 tag

DockerCopilot 支持指定镜像和 tag 更新。这里填写的是**镜像仓库实际存在的标签**，不一定等于应用页面显示的版本号。例如应用版本是 `1.2.3`，发布者的镜像标签可能带前缀或构建后缀，需要到该镜像的发布页核对。

`latest` 也是一个标签，会随维护者发布而变化；固定版本标签通常更方便控制升级节奏。PT 下载器还要对照所用站点当前的客户端规则，不应直接照搬旧教程里的 qBittorrent、Transmission 版本号。

如果容器原本由 Compose 管理，修改镜像版本后也要更新原来的 `compose.yaml`。否则以后再次执行 `docker compose up -d`，声明的镜像和配置可能覆盖这次在面板里的调整。多服务项目涉及数据库、网络和启动依赖时，优先按原 Compose 项目和应用升级说明统一操作。

## 清理旧镜像

更新后，本地可能留下没有 tag 的镜像或暂时没有容器使用的镜像。DockerCopilot 提供相应清理入口，但最好在确认新版本正常以后再处理。

- **无 tag 镜像**：常见于同一个标签指向了新镜像之后；没有标签不代表一定没有容器引用。
- **未使用镜像**：当前没有容器引用的镜像；其中也可能包括你特意保留、尚未创建容器的恢复版本。

先看名称、标签和使用状态，再确认清理对象。需要留作恢复的镜像应另外记录并妥善保存，不能仅凭“现在没在用”就认定没有价值。

镜像清理与删除应用数据目录是两件事。不要为了释放空间，顺手删除 Docker 卷、下载目录或仍有恢复价值的备份。

## 备份与恢复容器配置

### 备份保存了什么

当前[备份实现][backup-source]遍历[包含已停止容器的列表][container-list-source]，把容器名称，以及 Docker 的 `Config`、`HostConfig` 和 `NetworkingConfig` 写入同一份 JSON 文件。它们描述镜像、环境变量、启动参数、端口、挂载和网络等创建信息。这是批量配置备份，不能假定只会保存页面上选中的某一个容器。

默认备份目录为容器内的 `/data/backups`。按本文挂载方式，对应宿主机的 `data/backups/`；当前文件名格式为 `backup-YYYY-MM-DD.json`，**同一天再次备份会覆盖同名文件**。需要保留多个时间点时，先复制或另存已有文件。

这些 JSON 中可能包含环境变量里的口令或令牌，保存和传输时应按应用配置文件保护，不适合直接上传到公开仓库。

建议把以下几部分一起纳入备份：

| 内容                           | 建议保存方式                                       |
| ------------------------------ | -------------------------------------------------- |
| DockerCopilot 的容器配置备份   | 复制 `data/backups/` 中需要的 JSON 文件            |
| 各应用的 Compose 文件与 `.env` | 单独保存，并保护其中的凭据                         |
| 绑定挂载目录和 Docker 卷       | 使用文件备份、卷备份或合适的存储快照               |
| 数据库                         | 按该数据库或应用的要求导出，必要时停服务保证一致性 |
| 恢复所需的版本信息             | 记录镜像、准确 tag 或摘要，以及必要的网络配置      |

备份文件也应复制到另一台设备或独立存储。只放在 NAS 同一块磁盘里，无法应对该磁盘损坏。

### 恢复前后需要做什么

DockerCopilot 的恢复功能会遍历整份备份，根据参数拉取镜像并**重新创建容器**，不能把它当作只恢复某一个选中容器的操作。当前[恢复实现][restore-source]不会帮你复制业务数据、重建原有自定义网络，也不包含自动启动步骤。

恢复可以按下面顺序进行：

1. 准备好原来的持久化目录或卷，把业务数据备份还原到正确位置，并核对权限。
2. 准备所需 Docker 网络，确认路径、端口和目标镜像适用于当前机器。
3. 检查是否已有同名容器；先处理冲突，保留仍需恢复的旧实例与数据。
4. 在恢复界面选择或提供对应备份文件，执行恢复，逐个检查容器的结果与错误提示。当前实现遇到某个容器创建失败会继续处理其他容器，因此“恢复完成”不代表全部成功。
5. 检查新建容器的参数，确认无误后启动，验证日志、页面与数据。

从另一台 NAS 恢复时，原来的目录路径、网络名称和 CPU 架构可能不同，备份参数不能不经检查直接复用。如果备份记录的是 `latest` 等可变标签，重新拉取也不保证拿到备份当天的镜像。

建议先在独立的测试 Docker 环境中，用可丢弃的容器完成备份与恢复，熟悉整份备份的处理范围以后，再把它用于重要服务。若应用本来就有完整 Compose 文件，也可以用原项目重建容器，再恢复业务数据。

## 更新 DockerCopilot 自身

更新管理工具本身时，从 NAS 的项目入口或原 Compose 目录执行更方便。先保存 `compose.yaml`、`.env` 与 `data/`，再运行：

```bash
docker compose pull dockercopilot
docker compose up -d dockercopilot
docker compose logs --tail=100 dockercopilot
```

更新完成后重新登录，确认容器列表和备份记录正常。这样也便于在管理页面暂时不可用时，从原部署入口检查问题。

## 常见问题

| 现象                 | 优先检查                                                                                                    |
| -------------------- | ----------------------------------------------------------------------------------------------------------- |
| 镜像拉取失败         | 镜像名称是否为 `0nlylty/dockercopilot`，标签与 CPU 平台是否匹配，Docker 引擎能否访问仓库                    |
| 页面打不开           | 容器是否运行、日志是否报错、访问端口是否对应映射左侧，以及 NAS 防火墙规则                                   |
| 口令不生效           | `secretKey` 的大小写、`.env` 是否被读取、字符是否被插值；更改环境变量后需重建容器，单纯重启不会更新创建参数 |
| 页面正常但看不到容器 | Docker socket 是否正确挂载，`DOCKER_HOST` 是否指向它，当前连接的是否为预期引擎                              |
| 更新失败或新应用异常 | 拉取与重建分别执行到哪一步，目标版本的迁移要求、挂载权限和业务日志                                          |
| 备份文件没有保存下来 | `/data` 是否挂载到可写持久化目录，`data/backups/` 是否有文件                                                |
| 恢复后找不到原数据   | 业务数据是否另行恢复，宿主机目录、卷和权限是否对应备份参数                                                  |

原参考文里的 `HTTP_PROXY=http://127.0.0.1:20171` 对应它自己的网络环境。在本文 bridge 模式下，容器里的 `127.0.0.1` 是 DockerCopilot 容器自身，不能直接用来指代 NAS 上的代理。

此外，**容器的 HTTP 代理设置与 Docker 引擎拉取镜像的代理设置是分开的**。如果错误发生在镜像下载阶段，先排查 Docker 引擎的仓库访问，配置方法参考 [Docker daemon 代理文档][daemon-proxy]或 NAS 厂商说明；不要把旧教程中的代理地址原样填入。

## 参考资料

- [磕巴白菜：新绿联部署 DockerCopilot，从此让你的容器实现一键更新、清理、备份][keba]：绿联场景、操作流程与界面截图参考。
- [DockerCopilot 项目与当前 README][readme]：功能列表、镜像、端口与部署参数。
- [DockerCopilot 更新实现][update-source]：重建容器、保留旧容器与更新成功的判断方式。
- [DockerCopilot 备份实现][backup-source]、[恢复实现][restore-source]与 [Dockerfile][dockerfile]：备份内容、默认目录与恢复边界。
- [Docker Compose 环境变量插值][compose-env]、[Docker daemon 代理配置][daemon-proxy]：Compose 变量和镜像下载代理的说明。

[project]: https://github.com/onlyLTY/dockerCopilot
[readme]: https://github.com/onlyLTY/dockerCopilot/blob/latest/README.md
[keba]: https://hi.keba.host/archives/ugreen-DockerCopilot
[update-source]: https://github.com/onlyLTY/dockerCopilot/blob/latest/internal/utiles/updatecontainer.go
[backup-source]: https://github.com/onlyLTY/dockerCopilot/blob/latest/internal/utiles/backupcontainer.go
[restore-source]: https://github.com/onlyLTY/dockerCopilot/blob/latest/internal/utiles/restorecontainer.go
[dockerfile]: https://github.com/onlyLTY/dockerCopilot/blob/latest/docker/Dockerfile
[container-list-source]: https://github.com/onlyLTY/dockerCopilot/blob/latest/internal/utiles/getcontainerlist.go
[check-update-source]: https://github.com/onlyLTY/dockerCopilot/blob/latest/internal/module/checkupdate.go
[compose-env]: https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/
[compose-interpolation]: https://docs.docker.com/reference/compose-file/interpolation/
[daemon-proxy]: https://docs.docker.com/engine/daemon/proxy/
