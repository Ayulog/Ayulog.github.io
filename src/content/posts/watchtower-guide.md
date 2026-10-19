---
title: Watchtower：检查镜像更新与维护旧部署
description: 用白名单标签和仅监控模式跑 Watchtower，含定时、通知配置与归档版的 Docker API 兼容问题。
author: Ayulog
pubDatetime: "2026-10-10T10:00:00+08:00"
draft: false
category: nas
tags:
  - Debian
  - Docker
---

Watchtower 通过监控容器当前使用的镜像标签（如 `latest`），在远程仓库发布新镜像层时自动发送通知或按原创建参数重建容器。需要注意，[Watchtower 官方仓库][watchtower-repo]目前已归档停止维护（停留在 `v1.7.1`）。若在现有 NAS 上继续使用 Watchtower，建议默认开启“标签白名单”与“仅监控模式”，避免数据库或 PT 下载器在无人值守时被意外重启。

其他容器管理与更新工具见 [NAS 服务清单](/posts/nas-software-websites/)，通用的手动更新与数据备份流程见 [Docker 应用维护](/posts/docker-management/)。

## Compose 部署：标签白名单与仅监控模式

确保宿主机已安装 [Docker Engine](https://docs.docker.com/engine/install/) 与 Compose V2。新建独立的 Watchtower 项目目录，保存以下 `compose.yaml`：

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

在需要纳入监控的**目标业务容器 `compose.yaml`** 中添加启用标签，并执行 `docker compose up -d` 重新部署该业务容器使标签生效：

```yaml
labels:
  com.centurylinklabs.watchtower.enable: "true"
```

随后在 Watchtower 目录启动服务并检查日志：

```bash
docker compose up -d
docker compose logs --tail=100 watchtower
```

核心参数与运行机制说明：

- **白名单与仅监控**：`WATCHTOWER_LABEL_ENABLE: "true"` 限制仅检查带有 `enable: "true"` 标签的容器（PT 下载器等敏感服务可不加标签或显式设为 `"false"`）；`WATCHTOWER_MONITOR_ONLY: "true"` 表示仅检查更新并记录日志/发送通知，不自动重启业务容器。
- **定时表达式**：`WATCHTOWER_SCHEDULE` 使用 6 位 Cron 格式（秒 分 时 日 月 星期），上方 `"0 0 3 * * *"` 代表每天凌晨 03:00 执行。若改用固定秒数间隔轮询（如 `WATCHTOWER_POLL_INTERVAL: "3600"`），需先删掉 `WATCHTOWER_SCHEDULE`。
- **镜像标签跟随逻辑**：Watchtower 仅检查容器当前声明的那个标签是否有新 Digest。若容器固定为 `example/app:1.2.3`，它只会检查 `1.2.3` 是否被重推，不会自动跨版本跳到 `1.2.4`。

## 手动单次检查、消息通知与开启自动更新

### 立即触发一次检查

如需立刻测试监控范围是否配置正确，可先暂停常驻容器，使用 `--run-once` 临时运行一次单次检查，完毕后再恢复常驻实例：

```bash
docker compose stop watchtower
docker compose run --rm watchtower --run-once --monitor-only --label-enable
docker compose up -d watchtower
```

注意单次运行时务必带上 `--monitor-only`，否则 `--run-once` 会直接更新命中的容器。

### 配置 Shoutrrr 消息通知

Watchtower 支持通过 Shoutrrr 发送邮件、Telegram、Bark 或 Webhook 通知（详见 [官方通知文档][watchtower-notifications]）。将通知地址写入项目目录下的 `notification-url.txt`，并在 `compose.yaml` 中通过 Compose `secrets` 挂载传入：

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

### 按需启用自动重建与旧镜像清理

确认白名单范围与备份流程稳妥后，若希望让 Watchtower 自动重建白名单内的无状态容器，可将全局 `WATCHTOWER_MONITOR_ONLY` 改为 `"false"`（若其中个别白名单容器仍只想收通知、不自动重建，可在该业务容器上单独添加标签 `com.centurylinklabs.watchtower.monitor-only: "true"`）。如需在更新成功后自动删除替换下来的旧镜像，可额外添加环境变量 `WATCHTOWER_CLEANUP: "true"`。

## Docker API 版本兼容与排错

参考 [Watchtower 参数文档][watchtower-arguments]，`v1.7.1` 默认使用较早的 Docker API 版本 `1.24` 发起请求。在新版 Docker Engine 上启动时，若日志报错 `client version 1.24 is too old. Minimum supported API version is ...`：

1. 在宿主机执行 `docker version`，查看 Server 端显示的 `API version` 与 `Min API version`。
2. 在 Watchtower 的 `environment` 中添加 `DOCKER_API_VERSION` 变量（例如设为宿主机支持的最低版本 `"1.44"`），重建容器后观察日志是否恢复正常。
3. 若因上游归档导致后续与新版 Docker 引擎出现协议不兼容，建议停用 Watchtower，改用 Dockge、DockerCopilot 或原项目的 `docker compose pull && docker compose up -d` 维护更新。

## 参考资料

- [Watchtower 官方仓库][watchtower-repo]
- [参数说明][watchtower-arguments]
- [通知说明][watchtower-notifications]
- 磕巴白菜：[绿联 NAS 部署 Watchtower 笔记](https://hi.keba.host/archives/ugreen-watchtower)

[watchtower-repo]: https://github.com/containrrr/watchtower
[watchtower-arguments]: https://containrrr.dev/watchtower/arguments/
[watchtower-notifications]: https://containrrr.dev/watchtower/notifications/
