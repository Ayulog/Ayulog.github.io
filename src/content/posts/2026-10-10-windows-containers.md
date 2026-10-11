---
title: Windows 容器：WSL、Docker Desktop 与独立 Engine
description: WSLc、Docker Desktop 和 WSL 内独立 Docker Engine 的安装、目录与访问方式。
author: Ayulog
pubDatetime: "2026-10-10T16:00:00+08:00"
draft: false
setupCategory: windows
tags:
  - Windows
  - WSL
  - Docker
---

Windows 上运行 Linux 容器有三条路线，是否需要 Compose 是选择时最直接的区别。以下版本信息沿用 **2026 年 10 月 10 日**核对的文档，未在本机逐一部署。

**Docker Desktop 和 Ubuntu 都不是运行 Linux 容器的必装组合**：

| 路线                             | 需要安装什么                                                  | 适合的用法                                                            |
| -------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------- |
| WSL Containers（WSLc）           | 当前正式版 WSL，内置 `wslc.exe`                               | 直接在 PowerShell 运行单个 Linux 容器，无需 Desktop 或自行安装 Ubuntu |
| Docker Desktop 的 WSL 2 后端     | WSL 与 Docker Desktop                                         | 直接在 PowerShell 使用 `docker`、`docker compose`，Ubuntu 为可选项    |
| WSL 发行版内的独立 Docker Engine | Ubuntu、Debian 等 WSL 2 发行版及 Docker Engine / Compose 插件 | 自己管理 Linux 环境与 Docker 服务，不需要 Desktop                     |

## WSL 3.x 带来了什么

微软在 **2026 年 9 月 29 日发布 WSL 3.0.1**，宣布 [WSL Containers 正式可用][wslc-announcement]。它内置 `wslc.exe`，也提供 `container.exe` 别名，可以直接构建、运行和管理 Linux 容器。

截至本篇核对时，GitHub 最新正式版为 **3.0.1**，另有 **3.0.3 预发行版**。初次使用按正式版操作即可，不必为了体验容器功能切换预发行渠道。

这里的 **3.x 是 WSL 软件包的版本号**。`wsl --version` 查看软件版本，`wsl --list --verbose` 查看普通 Linux 发行版采用 WSL 1 还是 WSL 2；WSLc 官方教程仍说明其使用 WSL 2 Linux 内核。不要执行 `wsl --set-version Ubuntu 3`。

**Compose 仍有边界。** 微软的正式发布公告将 `wslc compose` 列为后续计划。本篇核对的 3.0.1 正式版不能直接照搬 `docker compose up -d`，也不能把现有 Compose 存档默认视作 WSLc 可直接部署的项目。需要使用下文的 [Compose 示例](#用-compose-测试网页服务)时，选择 Docker Desktop 或独立 Engine 路线。

## 安装或更新 WSL

先按 [Microsoft 安装说明][microsoft-wsl-install]确认 Windows 和硬件支持。WSL 2 需要 CPU 虚拟化与 Windows 虚拟化平台；如果此前为 VMware 禁用了相关组件或虚拟机管理程序，需要恢复设置并重启。

未安装 WSL 时，在 **管理员 PowerShell** 中仅安装 WSL，不额外安装 Ubuntu：

```powershell
wsl --install --no-distribution
```

按提示重启。已有 WSL 时无需重复安装，在 **PowerShell** 中更新并检查：

```powershell
wsl --update
wsl --version
wslc version
```

官方文档注明 WSLc 最早需要 WSL **2.9.3 或更高版本**；3.0.1 是正式可用版本。这里使用更新后的正式版。如果找不到 `wslc`，先检查软件版本和更新结果，参考[官方发布记录][wsl-releases]，不需要先安装 Docker Desktop 来补这个命令。

## 路线一：直接用 WSLc 测试容器

在 **PowerShell** 中先运行一次性测试：

```powershell
wslc run --rm hello-world
```

成功后再运行网页服务，先确认 `18080` 没有被其他服务占用：

```powershell
wslc run -d --rm -p 18080:80 --name wslc-web docker.io/library/nginx:stable
wslc container ps
```

从 Windows 本机浏览器打开 `http://localhost:18080`，应能看到 Nginx 默认欢迎页。这一小节尚未挂载自定义 HTML，展示的是镜像内自带的页面。

测试完成后停止：

```powershell
wslc container stop wslc-web
```

示例使用了 `--rm`，容器停止后会自动删除，适合验证环境。需要保存应用数据时，按 [WSLc 官方教程][wslc-tutorial]和[存储说明][wslc-architecture]配置 Windows 目录挂载或数据卷，再决定长期运行参数。

WSLc 有自己管理的会话、容器和存储；不要把它当作已安装了一套 Docker Engine。本文的 `daemon.json`、Docker Desktop 设置与 `docker compose` 命令，不能直接作为 WSLc 的配置方法。

## 路线二：Docker Desktop，无需另装 Ubuntu

需要图形管理或直接复用 Compose 文件时，按 [Docker Desktop 系统要求与安装说明][docker-desktop-windows]安装 Desktop，选择 **WSL 2 后端**和 **Linux containers** 模式。

启动后，在 **Settings → General** 中确认 **Use WSL 2 based engine**。新版支持环境可能默认开启且不显示这个选项。等待引擎就绪后，直接在 **PowerShell** 检查：

```powershell
docker version
docker compose version
docker info
```

**以上步骤不要求安装 Ubuntu。** 只有希望在自己的 Ubuntu / Debian 终端中使用 Desktop 引擎时，才安装该发行版，并在 **Settings → Resources → WSL Integration** 启用集成。不要同时在该发行版中另装一套 Engine / CLI；切换已有环境前先备份和核对数据位置。

镜像加速在 Desktop 的 **Settings → Docker Engine** 中配置，代理使用 Desktop 的代理设置。在另一个 WSL 发行版中修改 `/etc/docker/daemon.json` 或重启 `docker.service`，不能代替 Desktop 设置。

## 路线三：WSL 发行版内独立安装 Engine

如果需要完整的 `docker compose`，又不想使用 Desktop，可在 **管理员 PowerShell** 中安装一个受支持的发行版，例如：

```powershell
wsl --install -d Ubuntu
```

按提示重启并打开 Ubuntu，完成 Linux 账户初始化。用 `wsl --list --verbose` 确认它运行在 **VERSION 2**；已有 WSL 1 发行版需先备份，再用 `wsl --set-version Ubuntu 2` 转换，名称以实际列表为准。

在 Ubuntu 内按 [Docker Engine 的 Ubuntu 官方文档][docker-engine-ubuntu]配置软件源并安装 Engine、CLI 和 Compose 插件；Debian 则使用其对应文档，不能混用软件源。检查 [systemd][microsoft-wsl-systemd] 是否启用后，再管理 Docker 服务。独立 Engine 默认通常需要 `sudo docker ...`，后续 Docker 命令按实际账户权限执行。

这条路线不需要 Desktop，也不要同时为该发行版开启 Desktop 集成。Docker 服务、镜像、卷与网络均由自己维护；Docker 服务自动启动不等于 Windows 会自动启动该 WSL 发行版。

## 项目目录与访问方式

使用 Desktop 且直接在 PowerShell 操作时，可在自己选定的 Windows 可写目录下创建项目：

```powershell
New-Item -ItemType Directory -Force .\demo-web\html
Set-Location .\demo-web
```

使用 WSL 发行版终端时，优先将项目放在 Linux 文件系统中：

```bash
mkdir -p ~/docker/demo-web/html
cd ~/docker/demo-web
explorer.exe .
```

`explorer.exe .` 会在 Windows 文件资源管理器中打开当前 Linux 目录。WSL 发行版通过 `/mnt/c/` 使用 Windows 文件也可以，但频繁读写时需注意性能、权限和文件事件行为差异。这项目录建议不表示 WSLc 必须安装 Ubuntu；WSLc 使用自己的存储与挂载机制。

### 用 Compose 测试网页服务

以下示例用于 Docker Desktop 或独立 Engine。在刚才创建的 `demo-web` 项目中，将下面的内容保存为 `html/index.html`：

```html
<!doctype html>
<html lang="zh-CN">
  <meta charset="utf-8" />
  <title>Docker 测试</title>
  <h1>Docker 已运行</h1>
  <p>这个页面来自项目里的 html/index.html。</p>
</html>
```

在 `demo-web` 中保存 `compose.yaml`：

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

端口只绑定本机回环地址，`./html` 按 Compose 文件所在目录解析。先保存网页再启动容器；挂载空目录会遮住 Nginx 自带的欢迎页。

在项目目录中依次执行，前一步报错时先处理，再继续：

```text
docker compose config --quiet
docker compose pull
docker compose up -d
docker compose ps
docker compose logs --tail=50 web
```

浏览器打开 `http://localhost:18080`，应看到“Docker 已运行”。修改 `html/index.html` 并刷新，确认挂载生效。测试结束后在同一目录运行 `docker compose down`，本地网页文件会保留。

### 从本机与局域网访问

WSLc 和 Desktop 的上述网页端口可从 Windows 本机通过 `http://localhost:18080` 访问。独立 WSL Engine 在默认 localhost 转发配置下也可先测试这个地址。局域网其他设备的访问则需结合对应路线的网络模式、端口发布和 Windows 防火墙单独设置，不能仅凭本机能打开就判断已经对外可用。

电脑关机或休眠会中断服务，容器重启策略不能让 Windows 保持在线。Desktop 的“登录时启动”只在用户登录后启动应用；WSLc、独立 Engine 和 Desktop 的生命周期也不同。需要长期运行时，分别核对所选路线的启动与恢复机制，不把它们统一当作常开 NAS。

## 相关笔记

- [Windows 总篇](/posts/2026-10-09-windows-software/)
- [Docker Compose 官方入门](https://docs.docker.com/compose/gettingstarted/)

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
