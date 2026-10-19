---
title: Docker 镜像加速源教程
description: 镜像拉取超时时，按仓库类型选择加速器、镜像名前缀、daemon 代理或离线导入，并验证配置是否生效。
author: Ayulog
pubDatetime: "2026-10-10T08:00:00+08:00"
draft: false
category: nas
tags:
  - Docker
  - Debian
---

在 NAS 上拉取 Docker 镜像超时，首先要看目标镜像托管在哪个仓库：Docker Hub 镜像可以通过配置 `registry-mirrors` 加速器解决；只拉取个别镜像可以临时在镜像名前加加速前缀；如果同时需要拉取 `ghcr.io`、`quay.io` 等多仓库镜像，则为 Docker 守护进程（daemon）配置 HTTP 代理更直接；无外网环境则使用 `docker save` 与 `docker load` 离线导入。

本文以 Debian / DebNAS 的 Docker Engine 为主，同时列出绿联、极空间、飞牛 NAS 及 Docker Desktop 的配置入口。

## 方案选型与常用加速源

### 按场景选择拉取方案

| 遇到的情况                                    | 推荐方案                      | 修改位置                                     |
| --------------------------------------------- | ----------------------------- | -------------------------------------------- |
| 多个 Docker Hub 镜像均拉取超时                | 配置全局镜像加速器            | `/etc/docker/daemon.json` 或 NAS 面板设置    |
| 仅需拉取一两个公开镜像                        | 在镜像名称前添加加速域名      | `docker pull` 命令或 Compose 的 `image` 字段 |
| 需要同时拉取 Docker Hub、GHCR 等多仓库镜像    | 配置 Docker daemon 代理       | Docker 守护进程配置或 Desktop 代理设置       |
| 目标 NAS 无可用网络，但另一台电脑可以正常拉取 | `docker save` / `docker load` | 在联网机器导出 `.tar` 归档，传至 NAS 导入    |

判断仓库类型时看镜像名称前缀：未写域名的 `alpine:3.22`（即 `docker.io/library/alpine:3.22`）和 `linuxserver/qbittorrent:latest` 均来自 **Docker Hub**，可通过 `registry-mirrors` 加速；而 `ghcr.io/metacubex/metacubexd:latest` 位于 GitHub Container Registry（详见 [Compose 存档](/setup/compose/)），需使用支持 GHCR 的前缀代理或 Docker daemon 代理。

### 常用加速源列表与参考入口

公共镜像加速源受带宽、地域与白名单策略影响，建议同时收藏上游说明页以便随时核对状态：

- **[DaoCloud public-image-mirror](https://github.com/DaoCloud/public-image-mirror)**：提供 `https://docker.m.daocloud.io` 加速源，同时支持 `m.daocloud.io/源仓库/镜像` 前缀拉取，仓库文档列有白名单与限流规则。
- **[磕巴白菜的镜像加速教程](https://hi.keba.host/archives/Docker)**：汇总了社区维护的加速源及品牌 NAS 操作截图。

以下整理了 11 个常用的 Docker Hub 镜像加速地址（配置全局加速器时需保留 `https://`）：

```text
https://docker.1ms.run
https://k-docker.asia
https://docker.1panel.live
https://dockerproxy.cn
https://docker.nastool.de
https://docker.agsv.top
https://docker.agsvpt.work
https://docker.m.daocloud.io
https://dockerhub.anzu.vip
https://docker.chenby.cn
https://docker.jijiai.cn
```

使用公共加速源时的注意事项：

- **精选可用地址**：每次先配置 1～2 个确认连通的地址测试即可，无需将十几个地址全部塞入配置。
- **留意缓存同步延迟**：公共源对 `latest` 等浮动标签存在后台缓存同步延迟；对版本敏感的服务建议指定明确版本号或上游 Digest。
- **保护私有凭据**：公共加速源仅用于拉取公开镜像，私有仓库镜像请直接登录官方或自建 Registry 拉取。

## 方法一：配置 Docker Hub 镜像加速器

### Debian / DebNAS（Docker Engine）

先在终端检查 Docker 运行状态与现有 systemd 服务定义：

```bash
docker version
sudo systemctl cat docker
```

备份现有的 `/etc/docker/daemon.json`（若存在）并打开编辑器：

```bash
sudo mkdir -p /etc/docker
if sudo test -f /etc/docker/daemon.json; then
  sudo cp -a /etc/docker/daemon.json "/etc/docker/daemon.json.bak-$(date +%Y%m%d-%H%M%S)" \
    && sudoedit /etc/docker/daemon.json
else
  sudoedit /etc/docker/daemon.json
fi
```

将 `registry-mirrors` 字段写入或合并到 `/etc/docker/daemon.json` 中：

```json
{
  "registry-mirrors": ["https://docker.m.daocloud.io"]
}
```

保存后先校验 JSON 语法，确认无误再重启 Docker 服务并拉取测试镜像：

```bash
sudo dockerd --validate --config-file=/etc/docker/daemon.json
sudo systemctl restart docker
docker info
docker pull docker.io/library/alpine:3.22
```

- **保留已有字段**：若原 `daemon.json` 中已有 `data-root`、`log-opts` 或网络配置，请将 `"registry-mirrors"` 合并进同一个顶层 `{}` 对象内，确保 JSON 逗号与括号闭合正确。
- **Rootless 模式路径**：若使用的是非 root 权限运行的 Rootless Docker，配置文件位于 `~/.config/docker/daemon.json`，需通过 `systemctl --user restart docker` 重启。

### 绿联、极空间与飞牛 NAS

品牌 NAS 优先在系统自带的 Docker 图形界面中设置加速源，避免 SSH 手工改写与系统面板互相覆盖：

1. **绿联 NAS（UGOS Pro）**：参考[绿联官方设置教程][ugreen-docker-mirrors]（适用于 UGOS Pro 1.18.1.0098 及以上版本的 PC 客户端或 Web 端），依次打开 **Docker → 镜像 → 设置 → 加速器配置**，填入 `https://docker.m.daocloud.io` 等加速地址并点击确定。保存时系统会自动重启 Docker 引擎，随后可在 **本地镜像 → 添加镜像 → 从镜像源下载** 中输入 `alpine` 与 `3.22` 验证。注意区分“加速器配置”与旁边的“新建镜像源”（后者用于配置私有或第三方 Registry 登录信息）。
2. **极空间与飞牛 NAS**：在 Docker 应用的“镜像仓库”或“镜像加速”设置中添加上述带 `https://` 的加速器 URL 并重启 Docker 服务。若旧版飞牛系统需通过 SSH 修改 `/etc/docker/daemon.json`，直接参照上文 Debian 步骤先备份再合并字段。

### Windows / macOS（Docker Desktop）

打开 Docker Desktop，依次进入 **Settings → Docker Engine**，在右侧 JSON 编辑框的原有对象内合并 `"registry-mirrors"` 字段，点击 **Apply & restart** 重启引擎后在终端执行 `docker info` 验证。

## 方法二：添加镜像仓库前缀

只需临时拉取单个镜像、不想重启 Docker 服务时，可以直接在镜像名前加上加速服务支持的前缀。以 DaoCloud 为例（注意官方镜像需补齐 `library/`，且前缀不带 `https://`）：

```bash
# 写法一：在完整镜像引用前加 m.daocloud.io/
docker pull m.daocloud.io/docker.io/library/alpine:3.22

# 写法二：使用专用前缀域名替换 docker.io
docker pull docker.m.daocloud.io/library/alpine:3.22
```

在 Docker Compose 中使用时，可以直接修改 `compose.yaml` 的 `image` 字段：

```yaml
services:
  web:
    image: m.daocloud.io/docker.io/library/nginx:stable
```

然后在项目目录校验并拉取更新：

```bash
docker compose config --quiet
docker compose pull web
docker compose up -d web
```

如果不想改动原有 `compose.yaml` 中的镜像名，也可以在带前缀拉取完成后，用 `docker tag` 补充一个原名称标签供本地启动使用：

```bash
docker tag m.daocloud.io/docker.io/library/alpine:3.22 docker.io/library/alpine:3.22
```

## 方法三：为 Docker Daemon 配置 HTTP 代理

当局域网内已有可用的 HTTP 代理（如 Mihomo），且需要拉取 Docker Hub、GHCR、Quay 等多个仓库时，可直接为 Docker 守护进程配置代理（注：在终端执行 `export https_proxy` 仅作用于当前 Shell，不会传递给 systemd 管理的 `dockerd` 服务）。

在 Docker Engine 23.0 及以上版本中，编辑 `/etc/docker/daemon.json` 合并 `proxies` 字段：

```json
{
  "proxies": {
    "http-proxy": "http://PROXY_HOST:7890",
    "https-proxy": "http://PROXY_HOST:7890",
    "no-proxy": "localhost,127.0.0.1,::1"
  }
}
```

保存后同样执行 `sudo dockerd --validate --config-file=/etc/docker/daemon.json` 与 `sudo systemctl restart docker`，并在 `docker info` 中检查代理是否生效。

- **代理地址可达性**：将 `PROXY_HOST:7890` 替换为宿主机可直接访问的代理 IP 与端口（`https-proxy` 同样填写 `http://` 协议头）。若代理本身运行在本机容器中，需先通过离线导入或前缀方式启动代理容器，并填写宿主机映射端口。
- **旧版 Engine 与 Desktop**：旧版 Docker Engine 可参考 [Docker 官方代理文档](https://docs.docker.com/engine/daemon/proxy/) 通过 systemd drop-in 配置环境变量；Docker Desktop 则直接在 **Settings → Resources → Proxies** 界面中开启代理。

## 方法四：跨设备离线导出与导入

当 NAS 网络受限、而另一台电脑可以顺利拉取镜像时，可通过镜像归档包离线传输。

首先在目标 NAS 上确认系统与 CPU 架构（常见 `x86_64` 对应 `linux/amd64`，`aarch64` 对应 `linux/arm64`）：

```bash
docker info --format '{{.OSType}}/{{.Architecture}}'
```

在可联网的电脑上指定目标架构拉取镜像，并使用 `docker image save` 导出为 `.tar` 文件（以 `linux/amd64` 为例）：

```bash
docker pull --platform linux/amd64 docker.io/library/alpine:3.22
docker image save -o alpine-3.22-amd64.tar docker.io/library/alpine:3.22
```

将 `alpine-3.22-amd64.tar` 上传至 NAS，在文件所在目录执行 `docker image load` 导入并验证：

```bash
docker image load -i alpine-3.22-amd64.tar
docker image inspect docker.io/library/alpine:3.22 --format '{{.Os}}/{{.Architecture}}'
docker run --rm --pull=never docker.io/library/alpine:3.22 uname -m
```

导入后的镜像名称与标签会保持原样，在 Compose 中引用相同名称即可直接启动（必要时配合 `--pull=never` 避免重复联网拉取）。

## 验证、回退与常见报错排查

### 验证配置与恢复备份

配置完成后，可通过以下命令完整验证镜像下载、Digest 信息与容器运行：

```bash
docker pull docker.io/library/alpine:3.22
docker image inspect docker.io/library/alpine:3.22 --format '{{json .RepoDigests}}'
docker run --rm --pull=never docker.io/library/alpine:3.22 cat /etc/alpine-release
```

如需查看 Debian 下 Docker 守护进程的近期拉取日志，可执行：

```bash
sudo journalctl -u docker --since "10 minutes ago" --no-pager
```

若修改配置后需要回退到之前的备份文件（将文件名替换为实际备份时间戳）：

```bash
if sudo cp -a /etc/docker/daemon.json.bak-YYYYMMDD-HHMMSS /etc/docker/daemon.json \
  && sudo dockerd --validate --config-file=/etc/docker/daemon.json; then
  sudo systemctl restart docker
  sudo systemctl status docker --no-pager
fi
```

### 常见报错排查

| 报错或现象                                                  | 原因与处理方式                                                                                                           |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `unknown flag: --registry-mirror`                           | `--registry-mirror` 是 `dockerd` 守护进程参数，不能跟在 `docker pull` 后面；请改用 `daemon.json`                         |
| `i/o timeout` / `TLS handshake timeout`                     | 检查 NAS 的 DNS 解析、系统时间、出口网络或代理连通性，或更换其他可用加速源                                               |
| 浏览器访问加速源 `/v2/` 返回 `401`                          | 属于 Registry 正常的认证握手响应，请直接使用 `docker pull` 实测具体镜像拉取                                              |
| `unauthorized` / `denied` / `403`                           | 检查镜像名拼写、是否为私有镜像，或当前加速源是否开启了仓库白名单限制                                                     |
| `toomanyrequests` / `429`                                   | 触发 Docker Hub 或加速源的拉取频率限制，稍候再试或切换加速源/代理                                                        |
| `manifest unknown`                                          | 指定的版本标签不存在，或公共加速源缓存尚未同步该标签，可核对上游标签后重试                                               |
| `no matching manifest for linux/...`                        | 上游镜像未提供当前 CPU 架构（如 arm64）版本，需更换支持该架构的镜像                                                      |
| `x509: certificate signed by unknown authority`             | 校准系统时间、更新 `ca-certificates`，或检查局域网透明代理/网关是否劫持了 TLS 证书                                       |
| 修改配置后 `docker` 服务无法启动                            | 检查 `/etc/docker/daemon.json` 是否存在语法错误、多余逗号或与 systemd 启动参数重复，必要时还原备份                       |
| Docker Hub 拉取正常，但 `ghcr.io` 依然超时                  | `registry-mirrors` 仅作用于 Docker Hub，GHCR 镜像请改用支持前缀转换的加速源或配置 daemon 代理                            |
| `docker pull` 正常，但 `docker buildx build` 拉不到基础镜像 | 独立的 BuildKit 构建容器需按 [BuildKit 配置文档](https://docs.docker.com/build/buildkit/configure/) 单独指定镜像源或网络 |

## 参考资料

- [绿联官方：Docker 如何配置镜像加速器、镜像源和镜像代理？][ugreen-docker-mirrors]：UGOS Pro 的操作入口、加速器设置与镜像下载步骤。
- 磕巴白菜：[Docker 镜像加速源教程](https://hi.keba.host/archives/Docker)、[极空间 DockerHub 镜像无法下载的多种解决方案](https://hi.keba.host/archives/ji-kong-jian-dockerhubjing-xiang-wu-fa-xia-zai-de-duo-zhong-jie-jue-fang-an)、[飞牛 DockerHub 镜像无法下载的多种解决方案](https://hi.keba.host/archives/fei-niu-dockerhubjing-xiang-wu-fa-xia-zai-de-duo-zhong-jie-jue-fang-an)。
- [Docker Hub 镜像缓存](https://docs.docker.com/docker-hub/image-library/mirror/)：镜像加速的适用范围与 daemon 配置。
- [Docker daemon 配置](https://docs.docker.com/engine/daemon/)、[dockerd 命令参考](https://docs.docker.com/reference/cli/dockerd/)：配置文件位置、启动参数与校验选项。
- [Docker daemon 代理](https://docs.docker.com/engine/daemon/proxy/)、[Docker 客户端代理](https://docs.docker.com/engine/cli/proxy/)、[Docker Desktop 设置](https://docs.docker.com/desktop/settings-and-maintenance/settings/)：服务、容器与 Desktop 代理的区别。
- [docker image pull](https://docs.docker.com/reference/cli/docker/image/pull/)、[docker image save](https://docs.docker.com/reference/cli/docker/image/save/)、[docker image load](https://docs.docker.com/reference/cli/docker/image/load/)：拉取参数、镜像导出与导入。
- [DaoCloud public-image-mirror](https://github.com/DaoCloud/public-image-mirror)：加速地址、前缀规则与服务限制。
- 系统安装与维护见 [DebNAS 安装及折腾记录](/posts/debnas-installation-notes/)，应用部署文件集中在 [Compose 存档](/setup/compose/)。

[ugreen-docker-mirrors]: https://support.ugnas.com/knowledgecenter/#/detail/eyJpZCI6ODkzLCJ0eXBlIjoidGFnMDAyIiwibGFuZ3VhZ2UiOiJ6aC1DTiIsImNsaWVudFR5cGUiOiJQQyIsImFydGljbGVJbmZvSWQiOjI5NywiYXJ0aWNsZVZlcnNpb24iOiIiLCJwYXRoQ29kZSI6IiJ9
