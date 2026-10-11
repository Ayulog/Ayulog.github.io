---
title: Watchtower：在 NAS 上管理 Docker 容器更新
description: 以绿联 NAS 为例部署 Watchtower，配置定时检查、标签筛选、仅监控与通知，说明 PT 下载器的更新策略、Docker API 兼容问题和备份回退。
author: Ayulog
pubDatetime: "2026-10-10T10:00:00+08:00"
draft: true
tags:
  - Watchtower
  - Docker
  - Docker Compose
  - NAS
  - 绿联
  - 教程
---

NAS 上的容器越来越多，逐个检查镜像、拉取更新、重建容器就成了一件重复工作。Watchtower 可以定时检查容器使用的镜像，并在发现变化后按设置更新，也可以先只监控，让自己决定什么时候升级。

这篇以绿联 NAS 为例，参考磕巴白菜的[《新绿联安装 Docker 自动更新神器：Watchtower 全攻略》][keba-guide]，重新整理部署和使用方法。Docker 安装、目录权限与镜像下载的基础设置，可以先看 [NAS Docker 安装及设置](/posts/2026-10-10-nas-docker-setup/)。

**先说明项目现状：截至 2026 年 10 月 10 日，`containrrr/watchtower` 官方仓库显示已于 2025 年 12 月 17 日归档，README 明确说明不再维护，最新发布仍为 `v1.7.1`。** 本文用于理解 Watchtower 和维护已有部署；新装前先确认 Docker API 兼容性。以下示例按官方文档整理，未在绿联 NAS 上实机验证。

## 目录

- [Watchtower 怎样更新容器](#watchtower-怎样更新容器)
- [先决定哪些容器可以自动更新](#先决定哪些容器可以自动更新)
- [部署前准备](#部署前准备)
- [用 Compose 部署 Watchtower](#用-compose-部署-watchtower)
- [给目标容器添加标签](#给目标容器添加标签)
- [立即检查与开启自动更新](#立即检查与开启自动更新)
- [定时与常用参数](#定时与常用参数)
- [配置更新通知](#配置更新通知)
- [备份与回退](#备份与回退)
- [常见问题](#常见问题)
- [参考资料](#参考资料)

## Watchtower 怎样更新容器

[Watchtower][watchtower-repo] 本身也是一个容器。它通过 Docker socket 访问 NAS 上的 Docker 引擎，检查选中的容器所用镜像是否发生变化。

在允许自动更新时，大致过程是：

1. 检查容器当前使用的镜像引用。
2. 对照镜像仓库，发现变化后拉取新镜像。
3. 停止旧容器，按原容器配置重建并启动。
4. 按设置记录日志、发送通知，或清理旧镜像。

更新期间服务会有中断。Watchtower 不会替你阅读应用的升级说明，也不会自动完成跨大版本迁移或恢复备份。

### 它跟踪的是当前镜像标签

容器使用 `example/app:latest` 时，Watchtower 检查的是这个仓库的 `latest` 是否变化。`latest` 是镜像维护者定义的标签，并不保证最稳定，也不一定代表最高版本号。

容器使用 `example/app:1.2.3` 时，它不会自动改成 `1.2.4`。不过，版本号标签也可能被维护者重新推送；需要精确固定镜像内容时，应记录并使用相应的 digest。

Watchtower 按 Docker 中的容器配置工作，不会替你修改原来的 `compose.yaml`。以后仍需保留 Compose 文件，管理环境变量、目录、端口和版本策略。

## 先决定哪些容器可以自动更新

家庭 NAS 上可以先按服务用途划分：

| 容器类型                               | 建议策略                           |
| -------------------------------------- | ---------------------------------- |
| 可随时重建、数据简单的小工具           | 验证备份和恢复后，再按需自动更新   |
| qBittorrent、Transmission 等 PT 下载器 | 核对站点支持的客户端版本，手动更新 |
| 数据库、网盘挂载、媒体库与重要业务     | 先阅读升级说明，安排维护时间       |
| 厂商系统组件、其他面板管理的核心服务   | 通过原管理入口维护                 |

尤其是 PT 下载器，能启动新版本并不等于站点允许使用。升级前要检查各站的客户端白名单，并备份配置、任务与恢复信息。

本文采用 **标签白名单 + 仅监控** 作为起点：只有明确添加标签的容器才参与检查，首次部署不自动重建业务容器。之后可以逐个开放自动更新。

## 部署前准备

确认 NAS 已安装 Docker，现有容器可以正常运行。使用 SSH 的读者，在 **NAS 的终端**检查：

```bash
docker version
docker compose version
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'
```

记下需要管理的容器名称、镜像标签和数据目录。图形界面用户可以在 NAS 的 Docker 应用中查看这些信息，Compose 入口以当前系统版本为准。

### Docker API 兼容性

Watchtower 1.7.1 的[参数文档][watchtower-arguments]记录默认 Docker API 版本为 `1.24`，而新 Docker Engine 可能不再接受这么旧的客户端。若日志出现 `client version ... is too old`，要同时查看 `docker version` 中服务端支持的 API 范围。

`DOCKER_API_VERSION` 可以指定请求使用的 API 版本，但**改一个数字并不会升级 Watchtower 内置的 Docker 客户端**。是否可用仍要在当前环境验证，不能把某个数值当成所有 NAS 通用的修复方案。不要为了旧更新工具降低 NAS 的 Docker 安全设置；无法确认兼容性时，直接通过原 Compose 项目手动更新更容易控制。

### 项目目录与权限

在 NAS 上准备一个保存 Compose 文件的目录，例如：

```text
/volume1/docker/watchtower/
└── compose.yaml
```

这个路径只是示例，请按 NAS 文件管理器显示的实际存储路径调整。基础部署不需要额外的数据库或 `/config` 目录，但要保存部署文件；添加通知后，还要保存相应配置。

Watchtower 需要访问 `/var/run/docker.sock`。**持有这个 socket 就有能力控制宿主机 Docker，甚至间接影响宿主机文件。** 把挂载标成 `:ro` 也不能把 Docker API 变成只读接口；仅监控模式同样需要谨慎授予权限。

## 用 Compose 部署 Watchtower

在绿联 Docker 的 Compose 项目入口新建项目，或在上面的目录中创建 `compose.yaml`：

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

这份配置的含义是：每天北京时间凌晨 **03:00**，只检查带有启用标签的容器，发现更新后记录结果，暂不更新容器。未设置通知时，结果从日志查看。

这里固定 `1.7.1` 是为了明确示例对应的版本，不代表该旧版本仍获得维护。示例也没有启用旧镜像清理，方便初期排错与保留回退材料。

Watchtower 的普通定时模式没有需要访问的 Web 管理页面，因此无需映射端口，也无需 `network_mode: host` 或 `privileged: true`。

通过界面保存并部署；SSH 用户在 `compose.yaml` 所在目录执行：

```bash
docker compose config --quiet
docker compose up -d
docker compose ps
docker compose logs --tail=100 watchtower
```

先确认日志没有 API、权限和定时表达式错误，再核对时区与首次检查时间。`Using no notifications` 只是说明没有配置通知，不代表部署失败。

如果还没有给任何容器添加启用标签，扫描不到目标是正常现象。设置了定时任务后，容器启动也不等于已经立即检查了一轮。

## 给目标容器添加标签

在**目标应用自己的 Compose 文件**中，找到对应服务，把下面的 `labels` 合并进去。这里只展示配置位置，`example/app:latest` 是占位符，不是可直接部署的镜像：

```yaml
services:
  example-app:
    image: example/app:latest
    labels:
      com.centurylinklabs.watchtower.enable: "true"
```

保留该应用原有的环境变量、挂载、端口和其他标签，再通过原项目重新部署。标签属于容器配置，**只保存 YAML 或执行 `docker restart` 不会把新标签应用到已有容器**；Compose 会按变化重建服务，需安排好中断时间。

例如，目标项目里的服务名为 `example-app`，可以在那个项目目录执行：

```bash
docker compose up -d example-app
```

要核对实际生效的标签，在 NAS 上执行下面的命令，并将 `YOUR_CONTAINER` 替换为 `docker ps` 显示的容器名：

```bash
docker inspect --format '{{json .Config.Labels}}' YOUR_CONTAINER
```

### 明确排除 PT 下载器

采用本文的白名单设置时，没有启用标签的 qBittorrent 和 Transmission 已经不会参与检查。为了让配置意图更清楚，也可以在各自原有服务下加上：

```yaml
labels:
  com.centurylinklabs.watchtower.enable: "false"
```

不要为了添加标签，整段替换下载器的 Compose，更不要顺带修改已经稳定使用的镜像、下载路径或账号。

### 单个容器只监控

以后关闭全局仅监控、开启自动更新时，仍可让某个已选中的容器只接受检查：

```yaml
labels:
  com.centurylinklabs.watchtower.enable: "true"
  com.centurylinklabs.watchtower.monitor-only: "true"
```

保持本文配置时，全局 `WATCHTOWER_MONITOR_ONLY: "true"` 已覆盖所有选中的容器。本文不启用 `--label-take-precedence`，避免个别标签覆盖全局仅监控设置。

## 立即检查与开启自动更新

### 不等到凌晨，先检查一次

回到 **Watchtower 项目目录**，执行：

```bash
docker compose stop watchtower
docker compose run --rm watchtower --run-once --monitor-only --label-enable
docker compose up -d watchtower
```

先停止常驻实例，避免两个实例同时处理同一批容器。临时实例沿用服务中的 socket 挂载和环境变量，立即执行一次仅监控检查并退出；最后一条恢复定时运行。即使临时检查失败，也要查看错误并按需恢复常驻实例。

**`--run-once` 本身是“一次更新尝试”，不是只读检查。** 上面的命令明确带有 `--monitor-only`，才不会更新目标容器。

仅监控仍可能在发现镜像摘要变化后拉取镜像，消耗流量和磁盘空间。它表示“不重建业务容器”，不是“完全不下载”。此外，本地标签可能因拉取而指向新镜像；以后手动执行业务项目的 `docker compose up -d` 时，也要意识到可能因此触发更新。

### 确认后再开启自动更新

先确认选择范围、备份和兼容性都符合预期，将 Watchtower 配置改为：

```yaml
WATCHTOWER_MONITOR_ONLY: "false"
```

保持 `WATCHTOWER_LABEL_ENABLE: "true"`，然后在 Watchtower 项目目录执行 `docker compose up -d watchtower` 应用修改。此后到达计划时间时，选中的容器就可能被更新并重建；带有单容器 `monitor-only: "true"` 标签的服务继续只监控。

第一次自动更新后，除了看 Watchtower 日志，还要打开应用，检查登录、数据、挂载路径和实际功能。容器显示 `running` 不代表升级后的应用完全正常。

## 定时与常用参数

Watchtower 的 cron 使用 **六个字段**，从左到右是：

```text
秒 分 时 日 月 星期
0  0  3  *  *  *
```

因此，每天凌晨 3 点应写成 `0 0 3 * * *`。参考文章中的五段 `0 3 * * *` 不适用于这里。

| 用途               | 环境变量或参数                       | 说明                               |
| ------------------ | ------------------------------------ | ---------------------------------- |
| 每天 03:00 检查    | `WATCHTOWER_SCHEDULE: "0 0 3 * * *"` | 配合 `TZ: Asia/Shanghai`           |
| 每小时检查         | `WATCHTOWER_POLL_INTERVAL: "3600"`   | 使用时删除 `WATCHTOWER_SCHEDULE`   |
| 只管理已启用的容器 | `WATCHTOWER_LABEL_ENABLE: "true"`    | 目标容器须有 `enable: "true"` 标签 |
| 只监控             | `WATCHTOWER_MONITOR_ONLY: "true"`    | 不更新容器，仍可能拉取镜像         |
| 更新后删除旧镜像   | `WATCHTOWER_CLEANUP: "true"`         | 确认恢复方案后再启用               |
| 停止等待时间       | `WATCHTOWER_TIMEOUT: "30s"`          | 超时后可能强制停止，按应用需要调整 |
| 立即执行一轮后退出 | `--run-once`                         | 未启用仅监控时会尝试更新           |

`--schedule` 与 `--interval` 互斥，不要一起设置。**1.7.1 的默认轮询间隔是 `86400` 秒，也就是 24 小时**；每 5 分钟检查需要显式设置 `300` 秒。

未开启标签白名单、也未指定名称等筛选条件时，默认范围是所有正在运行、未显式禁用的容器。不要为了解决“扫描不到容器”就直接删除白名单设置。

如果改用命令行位置参数限定目标，填写的是实际容器名称，例如 `--monitor-only app-one app-two`，不能只凭 Compose 服务名猜测。名称筛选和标签筛选同时存在时，目标要同时满足条件。

`--no-pull` 只观察本地镜像变化，不能用于检查远端新版本；`--no-restart` 是更新后不重新启动容器，也不是仅监控。`--include-stopped`、`--revive-stopped` 会改变对已停止容器的处理方式，普通 NAS 部署无需默认开启。

## 配置更新通知

Watchtower 支持通过 [Shoutrrr][watchtower-notifications] 接入邮件、Gotify、Telegram 等通知服务。先按对应服务文档生成通知 URL，保存在 Watchtower 项目目录的 `notification-url.txt` 中；文件里只写实际 URL，不加 YAML 键名或引号。

在原 Compose 文件中合并下面的字段，保留前面的定时、监控和 socket 设置：

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

这是**合并片段**，不能覆盖成完整部署文件；同一服务已有 `environment` 时，把新变量加进去，不要写两个重复的 `environment` 键。

重新部署后检查启动通知，再用仅监控命令核对日志与发送结果。通知失败时分别检查 URL 格式、凭据、网络和通知服务本身；没有发现新镜像时，也不要期待出现“更新成功”消息。

通知 URL 常包含 Token 或密码，不应提交到公开仓库、截图或分享日志中。Compose secrets 在这里通过文件向容器提供内容，并不自动加密宿主机上的源文件，需要保护文件权限及备份。

## 备份与回退

自动更新前至少保存三类材料：

1. **部署配置**：业务项目的 Compose、环境变量和明确的镜像版本。
2. **旧镜像信息**：当前运行的镜像 ID、对应 digest，必要时额外保留旧镜像。
3. **应用数据**：配置目录、命名卷、数据库和下载器任务信息。

镜像信息可以先这样查看，将 `YOUR_CONTAINER` 换成实际容器名：

```bash
docker inspect --format '{{.Config.Image}} {{.Image}}' YOUR_CONTAINER
```

镜像 ID 与仓库 digest 不是同一个值。需要长期保留旧镜像时，可根据输出的镜像 ID 添加本地备份标签，再使用 `docker image save` 导出；不能只记一个会移动的 `latest` 标签。

数据库备份应采用应用支持的导出方式，或在停止写入后进行一致性备份。数据已经由新版本迁移时，仅切回旧镜像可能无法启动，甚至导致进一步损坏。

升级出现问题后：

1. 在 Watchtower 项目中执行 `docker compose stop watchtower`，暂停后续自动更新。
2. 保存报错日志，核对新旧版本的兼容与迁移说明。
3. 按应用恢复流程，使用保留的旧镜像以及与之匹配的数据备份。
4. 通过原业务项目重建服务，验证功能后再决定是否恢复自动更新。

`--cleanup` 会删除更新前的旧镜像，因此本文初始配置不启用它。不要把镜像清理当作备份，也不要在排错时顺手执行带 `--volumes` 的全局清理。

## 常见问题

| 现象                              | 优先检查                                                                                                  |
| --------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 启动时报 cron 参数错误            | 是否使用六个字段，是否同时设置了轮询间隔                                                                  |
| 日志提示客户端 API 太旧           | 服务端支持的 API 范围，以及归档版本的兼容限制                                                             |
| 提示没有 Docker socket 或权限不足 | NAS 上的实际 socket 路径、挂载与执行账户权限                                                              |
| 扫描结果为 0                      | 目标是否运行、是否带启用标签、加标签后是否已重建                                                          |
| 找到新镜像但容器没更新            | 是否启用了全局或单容器仅监控                                                                              |
| 应用已有新版本但没检测到更新      | 是否仍使用旧版本标签；Watchtower 不会自动切换版本标签                                                     |
| 镜像下载超时或限流                | Docker 引擎网络、镜像仓库地址与认证；必要时查看[镜像加速教程](/posts/2026-10-10-docker-registry-mirrors/) |
| 旧配置好像丢失                    | 原数据是否真正持久化，是否改错挂载路径，应用是否发生数据迁移                                              |
| 想立即运行却反复退出重启          | 是否把 `--run-once` 放进了带常驻重启策略的服务                                                            |

不要根据旧教程随意给镜像加公共代理前缀。Watchtower 跟踪的是容器实际使用的镜像引用；变更仓库地址后，需要同时确认来源可信、标签存在且同步及时。

如果这个归档版本不能稳定管理当前 NAS，仍可在**业务应用自己的 Compose 项目目录**手动更新：先完成备份和版本核对，再执行 `docker compose pull SERVICE` 与 `docker compose up -d SERVICE`，将 `SERVICE` 替换为实际服务名。固定版本标签时，需要先在配置中改成已经确认兼容的目标版本。

## 参考资料

- 磕巴白菜：[新绿联安装 Docker 自动更新神器：Watchtower 全攻略（含常用参数详解）][keba-guide]：NAS 部署场景与 PT 下载器更新策略的参考，界面截图可查看原文。
- [Watchtower 官方仓库][watchtower-repo]与[版本发布记录][watchtower-release]：项目维护状态及 1.7.1 版本信息。
- [Watchtower 参数文档][watchtower-arguments]：定时、轮询间隔、标签、仅监控、单次运行与清理行为。
- [Watchtower 容器筛选说明][watchtower-selection]：容器名称与标签的组合规则。
- [Watchtower 通知文档][watchtower-notifications]：Shoutrrr 通知与文件形式的凭据配置。
- [Docker Engine API 版本矩阵][docker-api]：客户端与服务端 API 支持范围。
- [Docker Compose 更新镜像][compose-pull]与[创建、重建服务][compose-up]：手动维护业务项目的命令说明。

[keba-guide]: https://hi.keba.host/archives/ugreen-watchtower
[watchtower-repo]: https://github.com/containrrr/watchtower
[watchtower-release]: https://github.com/containrrr/watchtower/releases/tag/v1.7.1
[watchtower-arguments]: https://containrrr.dev/watchtower/arguments/
[watchtower-selection]: https://containrrr.dev/watchtower/container-selection/
[watchtower-notifications]: https://containrrr.dev/watchtower/notifications/
[docker-api]: https://docs.docker.com/reference/api/engine/
[compose-pull]: https://docs.docker.com/reference/cli/docker/compose/pull/
[compose-up]: https://docs.docker.com/reference/cli/docker/compose/up/
