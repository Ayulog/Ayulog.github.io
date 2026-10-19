---
title: Docker 应用维护：迁移、更新与备份
description: 确认应用由哪份 Compose 维护，备份版本与业务数据，再迁移或更新，最后验证登录、数据和关联服务。
author: Ayulog
pubDatetime: "2026-10-10T10:00:00+08:00"
modDatetime: "2026-10-11T00:00:00+08:00"
draft: false
category: nas
tags:
  - Debian
  - Docker
  - Docker Compose
---

NAS 上的容器跑顺之后，日常维护集中在三件事：升级镜像版本、调整或迁移数据目录、以及在故障时回退恢复。动手修改前先理清应用的部署入口、记录当前镜像 ID 并备好持久化数据，能避免升级失败或移动目录后丢数据。

各类容器面板的对比与部署教程见 [NAS 服务清单：容器管理与定时任务](/posts/nas-software-websites/#容器管理与定时任务)。

## 统一维护入口与权限边界

### 固定单一维护入口

同一台 NAS 上可以同时运行多个面板辅助查看状态，但每个业务容器应当固定由唯一入口维护配置：

- **原生 Compose / Dockge**：统一在项目目录的 `compose.yaml` 中修改端口、挂载和镜像标签。
- **Portainer Stack**：在最初创建该 Stack 的页面内编辑并重新部署。
- **1Panel 应用商店**：通过商店自带的升级与参数设置维护。

更新策略同样只保留一套：计划用 DockerCopilot 或命令行手动升级的服务，应在 Watchtower 中排除；PT 下载器（qBittorrent、Transmission）、数据库与核心媒体库建议固定版本号，核对站点白名单与升级说明后再手动更新。

### Docker Socket 安全边界

容器管理面板普遍通过挂载 `/var/run/docker.sock` 控制宿主机 Docker 引擎。拥有该 Socket 访问权限即具备创建、停止、删除容器及挂载宿主机任意目录的能力（为挂载附加 `:ro` 标志仅作用于文件本身，无法限制 Docker API 写操作）。

因此，所有容器管理面板均应限制在可信局域网或 Tailscale 等私有组网内访问（外网接入方案见 [NAS 远程访问](/posts/nas-remote-access/)），并配置独立强密码。

## 升级与迁移前的盘点与备份

### 盘点现有运行状态与镜像版本

通过 SSH 登录 NAS 终端，查看当前 Docker 环境、运行中的容器以及目标容器的确切镜像信息（将 `YOUR_CONTAINER` 替换为实际容器名）：

```bash
docker version
docker compose version
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'
docker inspect --format '{{.Config.Image}} {{.Image}}' YOUR_CONTAINER
```

由于 `latest`、`lts`、`1` 等浮动标签会随上游发布指向新镜像，执行 `docker inspect` 一并记录镜像标签与本地 Image ID（或仓库 Digest），才能在升级异常时准确回退到原版本。

### 备份配置与业务数据

在执行跨版本升级或迁移目录前，按以下三类核对并保存备份：

| 备份类别 | 涵盖内容                                                       |
| -------- | -------------------------------------------------------------- |
| 部署配置 | `compose.yaml`、`.env` 环境变量文件、自定义网络与目录映射说明  |
| 版本记录 | 当前镜像标签、Image ID / Digest，必要时使用 `docker save` 导出 |
| 业务数据 | 绑定挂载目录（如 `./config`、`./data`）、Docker 命名卷与数据库 |

备份时的关键注意事项：

- **先停业务容器再备数据库**：使用 SQLite 或外部数据库的应用，优先调用应用自带导出功能，或直接停止目标业务容器后再复制数据目录（仅停止 Portainer、Dockge 等管理面板并不会暂停业务容器的数据写入）。
- **留意相对路径与项目名**：Compose 中的 `./data` 以 `compose.yaml` 所在目录为基准；命名卷则默认冠以项目目录名作为前缀。迁移项目目录时需同步移动数据目录，并核对卷名是否变化。

## 标准更新流程与常见故障排查

### 使用 Compose 更新服务

完成备份后，进入对应业务容器的 Compose 项目目录，拉取新镜像并重建容器（将 `SERVICE` 替换为具体服务名）：

```bash
docker compose pull SERVICE
docker compose up -d SERVICE
docker compose logs --tail=100 SERVICE
```

若使用固定版本标签，先在 `compose.yaml` 或 `.env` 中将标签改为目标版本，再执行上述命令。容器启动后检查日志输出，登录 Web 页面验证业务数据与关联服务均正常，最后再清理替下来的旧镜像。

### 常见问题排查

| 故障现象                      | 排查重点                                                                                                    |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 面板网页无法访问              | 检查容器运行状态、初始化日志、HTTP/HTTPS 协议、宿主机映射端口及防火墙（1Panel 需带上安全入口路径）          |
| 面板正常打开但容器列表为空    | 检查 `/var/run/docker.sock` 挂载路径、文件权限、Docker 服务状态以及当前选择的环境（Environment）            |
| 移动 Compose 目录后数据丢失   | 检查 `./config` 等相对路径是否指向了新建的空目录，或目录改名导致 Compose 创建了新的空命名卷                 |
| 在面板修改版本后又被还原      | 检查是否仍在原 Compose 目录执行了旧配置部署，或被其他面板/脚本覆盖                                          |
| 容器非预期地反复重建          | 检查是否同时开启了 Watchtower 自动更新与手动维护，或存在多个自动更新实例                                    |
| 拉取新镜像超时或报错          | 核对镜像名称、标签、CPU 架构及网络连通性，按需配置 [Docker 镜像加速或代理](/posts/docker-registry-mirrors/) |
| 容器状态为 `running` 但不可用 | 查看容器日志中的权限或数据库迁移报错；注意 bridge 网络下容器内 `127.0.0.1` 仅指向容器自身                   |
| 工具配置恢复后缺少历史数据    | 容器配置备份（如 DockerCopilot 导出的 JSON）仅保存创建参数，需配合持久化目录与命名卷备份一并还原            |

## 参考资料

- [Docker 绑定挂载][docker-bind]
- [保护 Docker daemon 访问][docker-access]
- [Compose 更新服务][compose-up]

[docker-bind]: https://docs.docker.com/engine/storage/bind-mounts/
[docker-access]: https://docs.docker.com/engine/security/protect-access/
[compose-up]: https://docs.docker.com/reference/cli/docker/compose/up/
