---
title: Watchtower：检查镜像更新与维护旧部署
description: Watchtower 的标签筛选、仅监控、定时与通知配置，附归档版本的 Docker API 兼容问题。
author: Ayulog
pubDatetime: "2026-10-10T10:00:00+08:00"
draft: false
category: nas
tags:
  - Debian
  - Docker
  - Watchtower
---

**截至 2026 年 10 月 10 日，Watchtower 官方仓库已归档，README 明确说明不再维护，最新发布仍为 `v1.7.1`。** 这篇留给仍在用旧部署的人。新装前先确认它能否连接当前的 Docker API。

Watchtower 检查的是容器正在使用的镜像引用。使用 `example/app:1.2.3`，不会自动改成 `1.2.4`；使用 `latest`，则跟踪该标签变化。它按容器现有配置重建，不会替你改原 Compose，也不会完成应用的大版本迁移。

返回 [NAS 服务清单](/posts/nas-software-websites/)；工具怎么选、升级前要备份什么，见 [Docker 管理工具与维护笔记](/posts/docker-management/)。

## 开始之前

需要 Linux Docker Engine 和 Compose V2。还没装好时，先看 [Docker 官方安装文档](https://docs.docker.com/engine/install/)。每个工具放在独立目录中，下面的命令都在它自己的 Compose 项目目录执行。

文中的 `NAS_IP` 换成设备地址。管理页面只放在可信局域网或私有组网内；挂载 `/var/run/docker.sock` 后，工具就能操作宿主机 Docker，追加 `:ro` 也不会把 Docker API 变成只读。

## 先用标签白名单和仅监控

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

## 立即检查、通知与自动更新

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

## API 兼容问题

[官方参数文档][watchtower-arguments]记录默认 API 版本为 `1.24`。若出现 `client version ... is too old`，同时检查 `docker version` 的服务端支持范围。

`DOCKER_API_VERSION` 可以指定请求版本，但不会升级 Watchtower 内置客户端，不能把某个数字当作所有 NAS 通用的修复。归档版本无法稳定工作时，通过应用自己的 Compose 手动更新即可，不必为了旧工具改变 Docker 的安全设置。
原始部署笔记参考磕巴白菜的 [Watchtower](https://hi.keba.host/archives/ugreen-watchtower)，参数按下列上游资料核对。

## 参考资料

- [Watchtower 官方仓库][watchtower-repo]
- [参数说明][watchtower-arguments]
- [通知说明][watchtower-notifications]

[watchtower-repo]: https://github.com/containrrr/watchtower
[watchtower-arguments]: https://containrrr.dev/watchtower/arguments/
[watchtower-notifications]: https://containrrr.dev/watchtower/notifications/
