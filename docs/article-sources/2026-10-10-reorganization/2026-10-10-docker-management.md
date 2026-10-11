---
title: Docker 管理篇：Dockge、Portainer CE、Watchtower、DockerCopilot 与 1Panel
description: 从 Compose 项目、容器面板到应用商店，整合五种 Docker 管理工具的部署、更新与备份方法，说明各自职责、维护入口和排错顺序。
author: Ayulog
pubDatetime: "2026-10-10T10:00:00+08:00"
draft: true
tags:
  - Docker
  - NAS
  - 运维
  - Docker Compose
  - Dockge
  - Portainer
  - Watchtower
  - DockerCopilot
  - 1Panel
---

NAS 上的 Docker 应用装起来以后，日常工作通常是改 Compose、看日志、更新镜像、清理旧版本和备份数据。Dockge、Portainer CE、Watchtower、DockerCopilot、1Panel 都能参与其中，但各自解决的问题不同，**不需要把五个工具全部装上**。

这篇把它们放在一起，从选择维护入口开始，再整理部署与日常操作。已经用 NAS 自带 Docker 面板管理得很顺手，可以继续沿用；想换入口时，先挑一个能解决当前问题的工具。Docker 引擎安装和目录规划见 [NAS Docker 安装及设置](/posts/2026-10-10-nas-docker-setup/)。

资料于 **2026 年 10 月 10 日**对照项目文档与源码整理，保留原来绿联 NAS 和 DebNAS 笔记中的可操作内容。下列是面向 Linux Docker Engine 的配置示例，未在各品牌 NAS 上逐一实机验证；路径、架构和系统权限要按实际设备确认。

## 目录

- [先选工具，再分清职责](#先选工具再分清职责)
- [共通前置：路径、权限与备份](#共通前置路径权限与备份)
- [Dockge](#dockge)
- [Portainer CE](#portainer-ce)
- [Watchtower](#watchtower)
- [DockerCopilot](#dockercopilot)
- [1Panel](#1panel)
- [避免重复管理，按顺序排错](#避免重复管理按顺序排错)
- [参考资料](#参考资料)

## 先选工具，再分清职责

| 工具          | 主要用途                         | 适合怎样使用                                            | 需要记住的边界                                        |
| ------------- | -------------------------------- | ------------------------------------------------------- | ----------------------------------------------------- |
| Dockge        | 围绕 `compose.yaml` 管理项目     | 已经按 Compose 整理应用，希望在网页里编辑、部署和看日志 | 主要管理 Compose 项目，不以完整 Docker 资源管理为目标 |
| Portainer CE  | 管理容器、镜像、网络、卷和 Stack | 想集中查看 Docker 资源，或管理多个环境                  | 能看到已有容器，不等于已接管其原始部署文件            |
| Watchtower    | 定时检查镜像，按策略重建容器     | 维护已有部署，或了解标签筛选和更新流程                  | 官方项目已停止维护；需先确认 API 兼容性               |
| DockerCopilot | 手动更新、清理镜像、备份容器设置 | 想通过简单界面做日常容器维护                            | 设置备份不包含业务数据，也不代替原 Compose            |
| 1Panel        | 应用商店与服务器管理             | 更希望通过应用模板和表单部署服务                        | 官方原生安装与社区容器镜像是两种部署方式              |

我会先给每个应用确定一个主要维护入口：自己的 Compose 项目交给 Dockge 或原命令行，Portainer 创建的 Stack 在原 Stack 里维护，1Panel 商店安装的应用按商店支持的方式管理。其他工具可以辅助查看，但同一项目的版本、端口、挂载不要在几个地方轮流修改。

更新也只保留一套策略。计划用 DockerCopilot 手动更新的服务，就不要同时让 Watchtower 自动重建；PT 下载器、数据库、网盘挂载和媒体库优先按应用要求安排维护时间。特别是 qBittorrent、Transmission，升级前还要核对站点允许的客户端版本。

## 共通前置：路径、权限与备份

### 先记录现有部署

使用 SSH 时，在 NAS 的终端检查：

```bash
docker version
docker compose version
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'
```

图形界面用户在 NAS 的 Docker 应用中核对同样的信息。至少记录容器名称、镜像引用、端口、持久化目录、命名卷和原项目位置，再开始换管理入口。

每个管理工具用独立项目目录，保存自己的 `compose.yaml`。本文的 `/volume1/docker/...` 与 `/opt/stacks` 都是示例路径：品牌 NAS 要用文件管理器确认真实位置，自建 Debian 则按自己的数据盘规划调整。`./data` 按 Compose 项目目录解析，面板导入时还要核对它使用的工作目录。

### Docker socket 是管理权限

这些工具通过 `/var/run/docker.sock` 操作宿主机 Docker。挂载这个 socket 后，程序有能力创建、停止和删除容器，也能通过容器挂载影响宿主机文件。**给 socket 挂载加 `:ro`，并不能把 Docker API 变成只读接口。**

管理页面限定在可信局域网或私有组网内，使用独立口令。远程访问方式见 [NAS 远程访问](/posts/2026-10-09-nas-remote-access/)。不要把 socket 当普通文件新建；连接失败时检查实际路径、Docker 是否运行以及账户权限。

### 更新之前，要有三份材料

| 材料     | 要保存什么                                            |
| -------- | ----------------------------------------------------- |
| 部署配置 | Compose、`.env`、网络和目录说明；含凭据的文件单独保护 |
| 版本信息 | 当前镜像标签、镜像 ID，必要时保存 digest 或导出旧镜像 |
| 业务数据 | 应用配置、数据库、任务状态、绑定目录与命名卷          |

可以先记录运行镜像，将 `YOUR_CONTAINER` 换成实际容器名：

```bash
docker inspect --format '{{.Config.Image}} {{.Image}}' YOUR_CONTAINER
```

`latest`、`lts`、`1` 等标签会随发布变化，固定版本标签也可能被重新推送；镜像 ID 与仓库 digest 不是同一个值。需要精确恢复时，应保留准确镜像信息和相应数据备份，不能只记住一个标签。

数据库优先用应用支持的导出方式，或在停止写入后备份。**管理面板停止，不代表它管理的业务容器停止。** 新版本迁移了数据后，仅换回旧镜像也未必能恢复；旧容器和旧镜像都不能替代升级前的数据备份。

## Dockge

Dockge 把 `compose.yaml` 作为管理中心，适合“一项应用一个项目目录”的组织方式。文件仍保存在磁盘上，必要时可以回到原目录使用 Compose 命令维护。[官方 README][dockge-readme]说明了项目扫描和既有 Stack 的导入方法。

### 部署与首次打开

准备管理器目录和项目目录，在管理器目录创建 `compose.yaml`。以下与[配套下载](/examples/debnas/dockge/compose.yaml)采用相同的基础参数：

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

按自己的设备创建目录后，在项目目录启动：

```bash
docker compose config --quiet
docker compose up -d
docker compose logs --tail=100 dockge
```

访问 `http://NAS_IP:5001`，完成账号初始化。端口冲突时可以改左侧宿主机端口，例如 `5002:5001`，浏览器同步改用 `5002`。

这里最重要的是 **Stack 目录挂载左右两侧必须是同一个绝对路径，并与 `DOCKGE_STACKS_DIR` 一致**。例如想改成 `/volume1/docker/stacks`，三处一起调整：

```yaml
volumes:
  - /volume1/docker/stacks:/volume1/docker/stacks
environment:
  DOCKGE_STACKS_DIR: /volume1/docker/stacks
```

这是合并片段，原来的 socket 和 `/app/data` 挂载仍需保留。Dockge 最终让宿主机 Docker 创建应用，路径不一致容易让配置落到错误位置。

### 新建项目与接管旧项目

新应用可以在 Dockge 中新建 Stack，填写名称和完整 Compose，检查环境变量、端口及持久化目录后部署。启动后查看日志，再打开应用页面验证数据和功能。

官方对既有项目的导入流程是：停止原 Stack，把 Compose 放到 `/opt/stacks/项目名/compose.yaml`，再在 Dockge 菜单中执行 **Scan Stacks Folder**。迁移前还要处理两件事：

1. `./data` 等相对路径会随着 Compose 文件位置变化。一起迁移对应数据，或改用确认过的绝对路径，不能只移动 YAML。
2. Compose 项目名变化可能改变自动生成的卷名和网络名。先核对原来的项目名、实际卷名及网络，避免连到新建的空卷。

原服务的目录和挂载复杂时，先保留现有维护方式，在测试应用上熟悉导入。扫描到项目后，也要核对实际数据和容器，不能只凭列表里出现名称就认为迁移完成。

### 更新与备份

更新应用时，先阅读应用升级说明；需要切换固定版本时，在对应 Compose 中改镜像标签，再用 Dockge 执行更新、部署并检查日志。管理器自身则从它原来的项目目录维护：

```bash
docker compose pull dockge
docker compose up -d dockge
```

备份 Dockge 的 `data/`、Stack 目录中的 Compose 与环境文件，以及各个应用实际使用的数据。Stack 文件夹不一定包含所有数据，使用外部绝对路径或命名卷的服务要单独覆盖。

## Portainer CE

Portainer CE 更适合集中查看容器、镜像、网络、卷和 Stack。本文连接本机 Linux Docker Engine，沿用[官方安装文档][portainer-install]的 `lts` 镜像和 HTTPS `9443` 端口。

### 部署与持久化

在独立项目中保存以下配置，也可以[下载 Portainer Compose](/examples/debnas/portainer/compose.yaml)：

```yaml
services:
  portainer:
    image: portainer/portainer-ce:lts
    restart: always
    ports:
      - "9443:9443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data

volumes:
  portainer_data:
```

`8000` 用于 Edge Agents 的相关通信，本机基础管理不需要开放；旧版 HTTP `9000` 也没有放进示例。`/data` 用来保存 Portainer 自己的数据库，不能省略持久化。

```bash
docker compose config --quiet
docker compose up -d
docker compose logs --tail=100 portainer
```

访问 `https://NAS_IP:9443`。默认使用自签名证书，浏览器可能提示证书不受信任；先核对地址确实是自己的 NAS，再按需要配置可信证书。不要因为提示就把地址改成 HTTP。

### 首次初始化与日常管理

当前官方文档说明，新版本的全新实例需要 **setup token** 完成初始设置。按页面提示，从容器日志中找到 `setup_token=`，填入初始化表单，创建管理员账号；已初始化实例不受这一流程影响。具体适用版本和说明见 [setup token 文档][portainer-token]。

进入后先确认连接的是预期的本地环境，再查看容器列表、日志、挂载、网络和卷。新应用可以通过 Stack 部署，但原来由 NAS 或其他 Compose 项目创建的应用，仍应保留原文件与维护入口。

看到一个容器，不代表它已经成为 Portainer 维护的 Stack。尤其是多服务应用，不要为了“接管”而把每个容器拆开重新创建；数据库、网络和环境变量应按原项目一起核对。

### 更新与备份

按照[官方升级说明][portainer-upgrade]，先备份 Portainer 配置，再更新服务器容器。使用本文 Compose 部署时，在原项目目录执行：

```bash
docker compose pull portainer
docker compose up -d portainer
docker compose logs --tail=100 portainer
```

保留原 `portainer_data` 卷，项目名也不要无意改变；否则 Compose 可能创建另一只卷，让页面看起来像全新安装。已有 Agent 的环境，还要按官方要求让 Agent 与 Server 版本匹配。

Portainer 自己的配置备份与应用数据备份分别保存。它的数据库可能随版本升级，回退时也要核对对应版本与升级前备份，不能只拉回旧镜像。

## Watchtower

**截至 2026 年 10 月 10 日，Watchtower 官方仓库已归档，README 明确说明不再维护，最新发布仍为 `v1.7.1`。** 这里保留已有部署的维护方法；新装先确认与当前 Docker API 的兼容性。

Watchtower 检查的是容器正在使用的镜像引用。使用 `example/app:1.2.3`，不会自动改成 `1.2.4`；使用 `latest`，则跟踪该标签变化。它按容器现有配置重建，不会替你改原 Compose，也不会完成应用的大版本迁移。

### 先用标签白名单和仅监控

在独立项目中创建：

```yaml
services:
  watchtower:
    image: containrrr/watchtower:1.7.1
    container_name: watchtower
    restart: unless-stopped
    environment:
      TZ: Asia/Shanghai
      WATCHTOWER_LABEL_ENABLE: "true"
      WATCHTOWER_MONITOR_ONLY: "true"
      WATCHTOWER_SCHEDULE: "0 0 3 * * *"
      WATCHTOWER_TIMEOUT: "30s"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```

这表示每天北京时间 **03:00** 检查明确启用的容器，发现更新后记录结果，暂不重建业务容器。普通定时模式没有 Web 页面，无需映射端口或使用 host 网络。

Watchtower 的 cron 是六段，依次为“秒、分、时、日、月、星期”。若改为每小时轮询，应删除 `WATCHTOWER_SCHEDULE`，再设 `WATCHTOWER_POLL_INTERVAL: "3600"`；定时和间隔不能同时配置。未显式设置时，默认轮询间隔是 24 小时。

在要检查的**目标应用原 Compose**中合并：

```yaml
labels:
  com.centurylinklabs.watchtower.enable: "true"
```

重新部署目标服务，标签才会应用到容器；只保存文件或执行 `docker restart` 不会更新创建参数。PT 下载器可以明确写成 `"false"`。本文开启白名单，没有启用标签的容器不会被选中。

然后启动 Watchtower，检查日志中是否有 API、权限或定时错误：

```bash
docker compose config --quiet
docker compose up -d
docker compose logs --tail=100 watchtower
```

### 立即检查、通知与自动更新

要立即执行一次，在 Watchtower 项目目录运行：

```bash
docker compose stop watchtower
docker compose run --rm watchtower --run-once --monitor-only --label-enable
docker compose up -d watchtower
```

先停常驻实例，避免同时处理同一批容器。`--run-once` 本身会尝试更新，上面明确保留 `--monitor-only` 才不会重建业务容器。**仅监控仍可能拉取新镜像**，占用流量与磁盘；以后手动执行原项目的 `up -d` 时，也要注意本地标签可能已指向新镜像。

通知可按[官方通知文档][watchtower-notifications]配置 Shoutrrr。将实际通知 URL 放到项目目录的 `notification-url.txt`，在现有 Compose 中合并：

```yaml
services:
  watchtower:
    environment:
      WATCHTOWER_NOTIFICATION_URL: /run/secrets/notification_url
    secrets:
      - notification_url

secrets:
  notification_url:
    file: ./notification-url.txt
```

保留原有 `environment` 项，只添加新变量，不要重复写两个同名键。通知 URL 可能包含令牌或密码；Compose secrets 在这里通过文件传入内容，并不自动加密宿主机源文件。

确认目标范围、兼容性和恢复流程后，才把 `WATCHTOWER_MONITOR_ONLY` 改成 `"false"` 并重建 Watchtower。需要继续只监控的单个服务，可同时设置启用标签和 `com.centurylinklabs.watchtower.monitor-only: "true"`。

第一次更新后，检查应用页面、日志和数据。`WATCHTOWER_CLEANUP: "true"` 会清理更新前的旧镜像，本文初始配置不启用；故障时先停止 Watchtower，再按应用流程恢复旧镜像和匹配的数据备份。

### API 兼容问题

[官方参数文档][watchtower-arguments]记录默认 API 版本为 `1.24`。若出现 `client version ... is too old`，同时检查 `docker version` 的服务端支持范围。

`DOCKER_API_VERSION` 可以指定请求版本，但不会升级 Watchtower 内置客户端，不能把某个数字当作所有 NAS 通用的修复。归档版本无法稳定工作时，通过应用自己的 Compose 手动更新即可，不必为了旧工具改变 Docker 的安全设置。

## DockerCopilot

DockerCopilot 适合手动执行容器更新、启停、镜像清理和容器设置备份。[当前官方 README][copilot-readme]使用 bridge 网络、`12712` 端口与 `0nlylty/dockercopilot:latest`；镜像账户名开头是数字 `0`。

### 部署与登录

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

### 更新与清理

按[当前更新实现][copilot-update]，DockerCopilot 拉取目标镜像，停止并重命名旧容器，沿用创建参数启动新容器，再按选项决定是否删除旧容器。因此更新会中断服务，界面提示成功也不代表应用已完成健康检查。

操作时按这个顺序：核对当前和目标标签，备份设置与业务数据，保留旧版本信息，执行更新，检查实际功能，稳定后再清理。指定的 tag 必须是仓库实际存在的标签，不能直接拿应用页面的版本号猜测。

**保留旧容器不等于保留旧数据。** 新旧容器可能挂载同一数据库目录，不要同时启动它们写同一份数据。由 Compose 管理的服务，变更镜像后也要更新原文件；多服务项目优先通过原 Compose 一起维护。

清理时区分无 tag 镜像和未使用镜像。后者可能包含尚未创建容器的恢复版本，先核对用途再删除；不要顺手清理业务目录或 Docker 卷。

### 配置备份与恢复的边界

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

## 1Panel

1Panel 把应用商店、容器、网站、数据库和备份放在一个面板里。想按模板装服务时比较方便，但应用商店仍需要你确认镜像来源、端口、目录与依赖，不能省略持久化规划。

### 原生安装和社区容器要分开

[官方在线安装][panel-install]面向受支持的 Linux 发行版，自建 Debian 可以优先评估；品牌 NAS 已有厂商维护的 Docker 时，不要直接套用普通 Linux 安装脚本替换引擎。

下面使用 [okxlin/docker-1panel][panel-image] 提供的社区容器镜像 `moelin/1panel`。这不是 1Panel 或 NAS 厂商对各机型兼容性的承诺，容器里的系统监控也不能一概当作宿主机的完整管理。

旧教程的 `koryking/1panel`、`PANEL_PORT`、`PANEL_BASE_DIR` 属于其他部署示例，不要混用。已有 V1 也不能把标签改成 V2 就直接升级，需要另行按迁移流程处理。

### Compose 部署与路径约定

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

### 应用商店与第三方模板

先用内置商店完成一次部署：查看应用来源和版本，填写端口、账号及数据位置，确认数据库等依赖，再检查部署日志和应用页面。面板端口 `10086` 与应用自身端口分开，不能混用。

应用数据可能位于面板目录，也可能在其他绑定目录或命名卷中，以实际模板和容器挂载为准。原有容器能被看见，并不意味着它们已经变成商店应用。

需要第三方模板时，可参考 [okxlin/appstore 的 `localApps` 分支][panel-appstore]。按本文路径，本地应用目录为：

```text
/volume1/docker/1panel/data/1panel/resource/apps/local/
```

核对实际目录并备份已有模板后，下载该分支 ZIP，把 `apps` 内的各应用目录放进 `local/`，最终应是 `local/应用目录/...`，不要多套一层仓库目录。刷新本地应用列表后，逐项检查需要的应用再安装。

模板更新和已安装应用的镜像升级是两步操作。同名模板可能覆盖自己的修改，第三方商店也不会替你解决镜像仓库连接问题。

### 更新、备份与登录排错

社区镜像维护者建议拉取新镜像并重建，避免在容器内直接升级面板二进制。先阅读目标版本说明，备份 Compose、`data/1panel/` 与各应用实际数据，再修改为确认兼容的版本标签：

```bash
docker compose pull 1panel
docker compose up -d 1panel
docker compose logs --tail=100 1panel
```

固定标签下仅执行 `pull` 不会跳到另一个版本；`1pctl update` 用于修改用户名、密码、端口等配置，不是版本升级命令。

页面打不开，先核对 IP、端口、安全入口和协议，再看初始化日志及防火墙。已有数据后，修改 Compose 中的 `USERNAME`、`PASSWORD`、`ENTRANCE` 不代表自动覆盖已有账号设置，优先在面板内修改或按维护者恢复说明操作。`RESET=true` 会强制重新配置，不要作为日常参数一直保留。

备份面板目录时，还要覆盖商店应用的数据库、卷和外部文件。只停止 1Panel 容器不等于应用停止写入，文件级备份应按具体数据库要求安排。

## 避免重复管理，按顺序排错

两个面板能看到同一个 Docker 引擎，并不一定冲突；真正容易出问题的是它们同时修改同一项目，或多个工具同时安排更新。

| 现象                         | 先检查什么                                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 面板页面打不开               | 容器状态、初始化日志、HTTP / HTTPS、宿主机端口和防火墙；1Panel 还要带安全入口                                |
| 页面正常但容器为空           | socket 挂载、权限、Docker 是否运行、连接的是否为目标引擎                                                     |
| 移动 Compose 后数据像丢了    | 相对路径是否改变、项目名是否变化、是否连到新卷；先查实际挂载，不要重新初始化                                 |
| 面板改了版本，后来又变回去   | 原 Compose 是否仍声明旧标签，其他管理器是否重新部署                                                          |
| 同一容器反复重建             | Watchtower 与手动维护是否重叠，是否有多个自动更新实例                                                        |
| 新镜像拉不下来               | 仓库、标签、CPU 平台、认证和 Docker 引擎网络；参考[镜像加速设置](/posts/2026-10-10-docker-registry-mirrors/) |
| 容器运行但应用异常           | 数据权限、迁移日志、网络依赖与业务健康状态，不能只看 `running`                                               |
| 管理工具备份恢复后没有原数据 | 备份是否只保存了创建参数，真实业务目录、卷和数据库是否另行还原                                               |

容器内的 `127.0.0.1` 在普通 bridge 网络下指向容器自己，不能直接当成 NAS 上的代理；应用的 HTTP 代理与 Docker 引擎拉镜像的代理也分别配置。

无论最终选择哪个面板，都保留可在 SSH 中执行的原 Compose。需要手动更新时，完成备份与版本核对后，在**业务项目目录**执行：

```bash
docker compose pull SERVICE
docker compose up -d SERVICE
docker compose logs --tail=100 SERVICE
```

把 `SERVICE` 换成实际服务名，固定版本则先修改到目标标签。每次只处理自己能验证和恢复的范围，确认登录、数据和关联服务正常以后，再清理旧镜像。

## 参考资料

- [Dockge 官方 README][dockge-readme]与 [Compose 配置][dockge-compose]：功能边界、Stack 扫描、路径与更新方式。
- [Portainer CE 安装][portainer-install]、[初始化 token][portainer-token]与 [Docker 环境升级][portainer-upgrade]：HTTPS、命名卷、首次登录及版本要求。
- [Watchtower 官方仓库][watchtower-repo]、[参数说明][watchtower-arguments]与[通知说明][watchtower-notifications]：停止维护状态、筛选、定时与仅监控。
- [DockerCopilot README][copilot-readme]、[更新][copilot-update]、[备份][copilot-backup]与[恢复源码][copilot-restore]：部署参数和操作边界。
- [1Panel 官方安装][panel-install]、[社区镜像说明][panel-image]与[第三方应用模板][panel-appstore]：原生与容器安装的区别、V2 参数与更新方式。
- Docker：[绑定挂载][docker-bind]、[保护 daemon 访问][docker-access]、[Compose 插值][compose-interpolation]与[更新服务][compose-up]。
- 磕巴白菜：[1Panel](https://hi.keba.host/archives/ugreen-1panel)、[Watchtower](https://hi.keba.host/archives/ugreen-watchtower)、[DockerCopilot](https://hi.keba.host/archives/ugreen-DockerCopilot)：绿联部署场景与原始整理参考，参数以本文列出的上游说明为准。

[dockge-readme]: https://github.com/louislam/dockge
[dockge-compose]: https://github.com/louislam/dockge/blob/master/compose.yaml
[portainer-install]: https://docs.portainer.io/start/install-ce/server/docker/linux
[portainer-token]: https://docs.portainer.io/faqs/installing/setup-token
[portainer-upgrade]: https://docs.portainer.io/start/upgrade/docker
[watchtower-repo]: https://github.com/containrrr/watchtower
[watchtower-arguments]: https://containrrr.dev/watchtower/arguments/
[watchtower-notifications]: https://containrrr.dev/watchtower/notifications/
[copilot-readme]: https://github.com/onlyLTY/dockerCopilot/blob/latest/README.md
[copilot-update]: https://github.com/onlyLTY/dockerCopilot/blob/latest/internal/utiles/updatecontainer.go
[copilot-backup]: https://github.com/onlyLTY/dockerCopilot/blob/latest/internal/utiles/backupcontainer.go
[copilot-restore]: https://github.com/onlyLTY/dockerCopilot/blob/latest/internal/utiles/restorecontainer.go
[panel-install]: https://docs.fit2cloud.com/1panel/installation/online-installation
[panel-image]: https://github.com/okxlin/docker-1panel
[panel-appstore]: https://github.com/okxlin/appstore/tree/localApps
[docker-bind]: https://docs.docker.com/engine/storage/bind-mounts/
[docker-access]: https://docs.docker.com/engine/security/protect-access/
[compose-interpolation]: https://docs.docker.com/reference/compose-file/interpolation/
[compose-up]: https://docs.docker.com/reference/cli/docker/compose/up/
