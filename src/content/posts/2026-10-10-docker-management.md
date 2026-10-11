---
title: Docker 管理工具与维护笔记
description: Dockge、Portainer、Watchtower、DockerCopilot 和 1Panel 怎么选，以及迁移、更新、备份时容易遇到的问题。
author: Ayulog
pubDatetime: "2026-10-10T10:00:00+08:00"
draft: false
setupCategory: nas
setupRole: guide
tags:
  - Debian
  - Docker
  - 运维
  - Docker Compose
---

改 Compose、看日志、更新镜像，命令行都能做。想放到网页里操作，再挑一个合适的管理工具就够了。已有 NAS 面板用得顺手，也可以继续用。

各软件的安装步骤已分成单篇，这里只记选择和维护时的共通问题。软件总表在 [NAS 常用软件记录](/posts/2026-10-09-nas-software-websites/)。

## 选哪个工具

| 工具          | 主要用途                         | 适合怎样使用                                            | 需要记住的边界                                        |
| ------------- | -------------------------------- | ------------------------------------------------------- | ----------------------------------------------------- |
| Dockge        | 围绕 `compose.yaml` 管理项目     | 已经按 Compose 整理应用，希望在网页里编辑、部署和看日志 | 主要管理 Compose 项目，不以完整 Docker 资源管理为目标 |
| Portainer CE  | 管理容器、镜像、网络、卷和 Stack | 想集中查看 Docker 资源，或管理多个环境                  | 能看到已有容器，不等于已接管其原始部署文件            |
| Watchtower    | 定时检查镜像，按策略重建容器     | 维护已有部署，或了解标签筛选和更新流程                  | 官方项目已停止维护；需先确认 API 兼容性               |
| DockerCopilot | 手动更新、清理镜像、备份容器设置 | 想通过简单界面做日常容器维护                            | 设置备份不包含业务数据，也不代替原 Compose            |
| 1Panel        | 应用商店与服务器管理             | 更希望通过应用模板和表单部署服务                        | 官方原生安装与社区容器镜像是两种部署方式              |

每个应用留一个主要维护入口：自己的 Compose 项目交给 Dockge 或原命令行，Portainer 创建的 Stack 在原 Stack 里维护，1Panel 商店安装的应用按商店支持的方式管理。其他工具可以辅助查看，但同一项目的版本、端口、挂载不要在几个地方轮流修改。

更新也只保留一套策略。计划用 DockerCopilot 手动更新的服务，就不要同时让 Watchtower 自动重建；PT 下载器、数据库、网盘挂载和媒体库优先按应用要求安排维护时间。特别是 qBittorrent、Transmission，升级前还要核对站点允许的客户端版本。

## 安装笔记

<a id="dockge"></a>

- [Dockge 安装与使用](/posts/2026-10-10-dockge-guide/)

<a id="portainer-ce"></a>

- [Portainer CE 安装与使用](/posts/2026-10-10-portainer-guide/)

<a id="watchtower"></a>

- [Watchtower 安装与使用](/posts/2026-10-10-watchtower-guide/)

<a id="dockercopilot"></a>

- [DockerCopilot 安装与使用](/posts/2026-10-10-dockercopilot/)

<a id="1panel"></a>

- [1Panel 安装与使用](/posts/2026-10-10-1panel-guide/)

## 路径、权限与备份

### 先记录现有部署

使用 SSH 时，在 NAS 的终端检查：

```bash
docker version
docker compose version
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'
```

图形界面用户在 NAS 的 Docker 应用中核对同样的信息。至少记录容器名称、镜像引用、端口、持久化目录、命名卷和原项目位置，再开始换管理入口。

每个管理工具用独立项目目录，保存自己的 `compose.yaml`。安装笔记里的 `/volume1/docker/...` 与 `/opt/stacks` 都是示例路径：品牌 NAS 要用文件管理器确认真实位置，自建 Debian 则按自己的数据盘规划调整。`./data` 按 Compose 项目目录解析，面板导入时还要核对它使用的工作目录。

### Docker socket 是管理权限

这些工具通过 `/var/run/docker.sock` 操作宿主机 Docker。挂载这个 socket 后，程序有能力创建、停止和删除容器，也能通过容器挂载影响宿主机文件。**给 socket 挂载加 `:ro`，并不能把 Docker API 变成只读接口。**

管理页面限定在可信局域网或私有组网内，使用独立口令。远程访问方式见 [NAS 远程访问](/posts/2026-10-09-nas-remote-access/)。不要把 socket 当普通文件新建；连接失败时检查实际路径、Docker 是否运行以及账户权限。

### 升级前备份什么

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

## 排错记录

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

- [Docker 绑定挂载][docker-bind]
- [保护 Docker daemon 访问][docker-access]
- [Compose 更新服务][compose-up]

[docker-bind]: https://docs.docker.com/engine/storage/bind-mounts/
[docker-access]: https://docs.docker.com/engine/security/protect-access/
[compose-up]: https://docs.docker.com/reference/cli/docker/compose/up/
