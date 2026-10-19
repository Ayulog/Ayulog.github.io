---
title: Windows 容器：WSL、Docker Desktop 与独立 Engine
description: 在 Windows 跑 Linux 容器的三条路线：WSLc、Docker Desktop、独立 Engine。
author: Ayulog
pubDatetime: "2026-10-10T16:00:00+08:00"
draft: false
category: windows
tags:
  - Docker
---

在 Windows 上运行 Linux 容器，目前主要有三种方式：WSL 内置的原生容器工具（WSLc）、Docker Desktop（WSL 2 后端），以及在 Ubuntu / Debian 等 WSL 2 发行版中自行安装的 Docker Engine。是否需要图形化管理界面与 `docker compose` 多容器编排，是选择方案的主要依据：

| 方案                             | 所需安装的组件                                          | 适用场景                                                                   |
| -------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------- |
| WSL Containers（WSLc）           | 正式版 WSL（`>= 3.0.1`，内置 `wslc.exe`）               | 在 PowerShell 中快速拉起单个 Linux 容器，无需安装 Desktop 或 Linux 发行版  |
| Docker Desktop（WSL 2 后端）     | WSL + Docker Desktop                                    | 在 PowerShell 或终端中直接使用完整 `docker` 与 `docker compose` 及图形界面 |
| WSL 发行版内的独立 Docker Engine | WSL 2 发行版（如 Ubuntu）+ Docker Engine / Compose 插件 | 纯命令行维护完整的 Linux Docker 环境与 `compose.yaml`，无需安装 Desktop    |

## WSL 3.x 与 WSLc 的适用边界

微软在 **WSL 3.0.1** 正式版中推出了 [WSL Containers（WSLc）][wslc-announcement]，内置了 `wslc.exe`（及别名 `container.exe`）命令行工具，基于 WSL 2 Linux 内核直接构建、运行和管理 OCI 容器。

使用时需注意两点：

- **版本号区分**：`3.0.1` 是 WSL 组件包自身的版本号（通过 `wsl --version` 查看）；而具体的 Linux 发行版架构代数仍为 **WSL 2**（通过 `wsl --list --verbose` 查看显示为 `VERSION 2`）。
- **Compose 支持范围**：当前 WSL 3.0.1 的 `wslc` 仅面向单容器操作，`wslc compose` 被微软列为后续路线图计划。如果需要使用 `docker compose up -d` 运行多容器项目（如下文的 [Compose 示例](#用-compose-测试网页服务)），请选择 **方案二（Docker Desktop）** 或 **方案三（独立 Docker Engine）**。

## 前置准备：安装或更新 WSL

先按 [微软 WSL 安装文档][microsoft-wsl-install] 确认 BIOS 中已开启 CPU 虚拟化，且 Windows 已启用虚拟化平台支持。

- **全新安装 WSL（不附带默认 Ubuntu 发行版）**：以管理员身份打开 PowerShell 执行：

```powershell
wsl --install --no-distribution
```

- **已安装 WSL 时升级至最新版**：在 PowerShell 中执行更新并核对版本：

```powershell
wsl --update
wsl --version
wslc version
```

确认 WSL 版本已升至 `3.0.1` 或更高版本（WSLc 最低要求 `2.9.3+`），`wslc version` 即可正常输出版本信息（详细更新日志见 [WSL GitHub Releases][wsl-releases]）。

## 方案一：使用 WSLc 直接运行单容器

无需安装 Docker Desktop 或任何 Linux 发行版，直接在 **PowerShell** 中运行一次性容器验证环境：

```powershell
wslc run --rm hello-world
```

接着测试运行带端口映射的 Nginx 容器（启动前确认本机 `18080` 端口未被占用）：

```powershell
wslc run -d --rm -p 18080:80 --name wslc-web docker.io/library/nginx:stable
wslc container ps
```

在 Windows 浏览器访问 `http://localhost:18080`，即可看到 Nginx 默认欢迎页。测试完毕后停止容器（因带有 `--rm` 参数，停止后容器会自动清理）：

```powershell
wslc container stop wslc-web
```

若需挂载宿主机目录或创建持久化数据卷，可参照 [WSLc 官方教程][wslc-tutorial] 与 [存储架构说明][wslc-architecture] 配置参数。WSLc 使用独立的容器会话与存储空间，与下面两种方案的 Docker Engine 互不共用镜像和容器列表。

## 方案二：使用 Docker Desktop（WSL 2 后端）

需要图形化管理面板或在 Windows PowerShell 下直接运行 `docker compose` 时，可按 [Docker Desktop 安装文档][docker-desktop-windows] 安装客户端，安装时勾选 **Use WSL 2 instead of Hyper-V**。

1. 启动 Docker Desktop，在 **Settings → General** 中确认已启用 **Use the WSL 2 based engine**。
2. 打开 **PowerShell**，验证 Docker 与 Compose 版本：

```powershell
docker version
docker compose version
docker info
```

- **按需启用 WSL 发行版集成**：如果只在 PowerShell 中操作 Docker，无需额外安装 Ubuntu。若希望在自己的 Ubuntu / Debian 终端内调用同一个 Desktop 引擎，可在安装发行版后打开 **Settings → Resources → WSL Integration** 勾选对应发行版（此时该发行版内无需再重复安装 Docker Engine）。
- **配置镜像加速与代理**：镜像源（Registry Mirrors）在 **Settings → Docker Engine** 的 JSON 配置中修改，网络代理在 **Settings → Resources → Proxies** 中设置。

## 方案三：在 WSL 发行版内安装独立 Docker Engine

如果需要使用完整的 `docker compose`，但不想安装 Docker Desktop，可以在 WSL 2 发行版内部直接安装原生的 Linux Docker Engine：

1. 在管理员 PowerShell 中安装 Ubuntu（或 Debian）：

```powershell
wsl --install -d Ubuntu
```

2. 完成 Linux 账户初始化后，在 PowerShell 中运行 `wsl --list --verbose` 确认其 `VERSION` 为 `2`（若为 `1`，先执行 `wsl --set-version Ubuntu 2` 转换）。
3. 进入 Ubuntu 终端，确认已启用 [systemd 支持][microsoft-wsl-systemd]，然后参照 [Docker Engine Ubuntu 官方安装指南][docker-engine-ubuntu] 配置官方 APT 源，安装 `docker-ce`、`docker-ce-cli`、`containerd.io` 与 `docker-compose-plugin`。
4. 配置镜像加速或守护进程参数时，直接编辑发行版内的 `/etc/docker/daemon.json`，随后执行 `sudo systemctl restart docker` 生效。

## 使用 Docker Compose 部署与验证

以下流程适用于 **方案二（Docker Desktop）** 与 **方案三（独立 Docker Engine）**。

### 1. 选择项目存放目录

- **Docker Desktop（PowerShell 操作）**：可在 Windows 本地磁盘工作目录下创建项目：

```powershell
New-Item -ItemType Directory -Force .\demo-web\html
Set-Location .\demo-web
```

- **WSL 独立 Engine（或通过 WSL 终端操作）**：建议将项目存放在 Linux 原生文件系统（如 `~/docker/`）下，以获得更好的磁盘 I/O 性能与完整的文件权限支持：

```bash
mkdir -p ~/docker/demo-web/html
cd ~/docker/demo-web
explorer.exe .
```

（执行 `explorer.exe .` 可直接在 Windows 资源管理器中打开当前 Linux 目录。）

<span id="用-compose-测试网页服务"></span>

### 2. 用 Compose 测试网页服务

在 `demo-web` 目录下创建 `html/index.html`：

```html
<!doctype html>
<html lang="zh-CN">
  <meta charset="utf-8" />
  <title>Docker 测试</title>
  <h1>Docker 已运行</h1>
  <p>这个页面来自项目里的 html/index.html。</p>
</html>
```

在 `demo-web` 根目录下创建 `compose.yaml`（更多编排语法见 [Docker Compose 官方入门](https://docs.docker.com/compose/gettingstarted/)）：

```yaml
services:
  web:
    image: docker.io/library/nginx:stable
    ports:
      - "127.0.0.1:18080:80"
    volumes:
      - ./html:/usr/share/nginx/html:ro
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```

在 `compose.yaml` 所在目录依次执行校验与启动命令：

```bash
docker compose config --quiet
docker compose pull
docker compose up -d
docker compose ps
docker compose logs --tail=50 web
```

在 Windows 浏览器访问 `http://localhost:18080`，确认页面显示“Docker 已运行”；修改 `html/index.html` 后刷新浏览器，即可验证目录挂载实时生效。测试结束后执行 `docker compose down` 停止并移除容器。

### 3. 本机访问、局域网访问与后台生命周期

- **访问范围**：上方示例将端口绑定在 `127.0.0.1:18080`，仅限 Windows 本机通过 `localhost` 访问。如需让局域网其他设备访问，需将端口映射改为 `18080:80`、放行 Windows 防火墙，并根据 WSL 网络模式（NAT 或 Mirrored 镜像网络，详见 [WSL 网络说明][microsoft-wsl-networking]）核对局域网可达性。
- **后台生命周期**：容器的 `restart: unless-stopped` 策略仅在对应的容器引擎运行期间生效。Windows 关机、休眠，或关闭全部 WSL 终端触发 WSL 实例自动回收时，容器也会随之停止；需要随系统登录自启时，可结合 Docker Desktop 的登录自启选项或 [Windows 自启动方法](/posts/windows-app-startup/)配置。

[microsoft-wsl-install]: https://learn.microsoft.com/windows/wsl/install
[microsoft-wsl-commands]: https://learn.microsoft.com/windows/wsl/basic-commands
[microsoft-wsl-filesystems]: https://learn.microsoft.com/windows/wsl/filesystems
[microsoft-wsl-networking]: https://learn.microsoft.com/windows/wsl/networking
[microsoft-wsl-systemd]: https://learn.microsoft.com/windows/wsl/systemd
[docker-desktop-windows]: https://docs.docker.com/desktop/setup/install/windows-install/
[docker-desktop-wsl]: https://docs.docker.com/desktop/features/wsl/
[docker-wsl-best-practices]: https://docs.docker.com/desktop/features/wsl/best-practices/
[docker-desktop-settings]: https://docs.docker.com/desktop/settings-and-maintenance/settings/
[docker-engine-ubuntu]: https://docs.docker.com/engine/install/ubuntu/
[wslc-announcement]: https://blogs.windows.com/windowsdeveloper/2026/09/29/wsl-containers-now-generally-available/
[wslc-tutorial]: https://learn.microsoft.com/en-us/windows/wsl/tutorials/wsl-containers
[wslc-architecture]: https://devblogs.microsoft.com/commandline/wslc-architecture-deep-dive/
[wsl-releases]: https://github.com/microsoft/WSL/releases
