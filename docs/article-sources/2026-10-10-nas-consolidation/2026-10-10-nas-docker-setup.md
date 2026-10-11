---
setupCategory: debian
setupRole: guide
title: NAS Docker 安装及设置
description: NAS 与 Debian 的 Docker 安装准备、目录权限、端口映射及 Compose 部署检查。
author: Ayulog
pubDatetime: "2026-10-10T08:30:00+08:00"
draft: true
tags:
  - NAS
  - Windows
  - WSL
  - Docker
  - Docker Compose
  - 教程
---

Docker 装好后，先确定数据目录、权限和端口，再部署应用。下面记录品牌 NAS 与 Debian / DebNAS 的准备方式，并用一个网页容器检查挂载和访问是否正常。

资料核对日期为 **2026 年 10 月 10 日**，未在各品牌设备上逐一部署。厂商菜单会随系统版本变化，安装入口以设备当前说明为准。

## 目录

- [安装前确认](#安装前确认)
- [安装并打开 Docker](#安装并打开-docker)
- [Windows：使用 WSL 运行 Linux 容器](#windows使用-wsl-运行-linux-容器)
- [固定 NAS 的访问地址](#固定-nas-的访问地址)
- [准备目录与文件权限](#准备目录与文件权限)
- [完成 Docker 基础设置](#完成-docker-基础设置)
- [选对网络模式和端口](#选对网络模式和端口)
- [部署第一个容器](#部署第一个容器)
- [验证是否真正部署成功](#验证是否真正部署成功)
- [更新、备份与删除](#更新备份与删除)
- [常见问题](#常见问题)
- [参考资料](#参考资料)

## 安装前确认

先确认下面几项，后面遇到问题时就有排查依据：

| 项目       | 需要确认的内容                                                  |
| ---------- | --------------------------------------------------------------- |
| 机型与系统 | 当前型号、系统版本是否支持 Docker，应用中心是否提供安装入口     |
| CPU 架构   | NAS 是 x86-64 还是 ARM，准备安装的镜像是否提供对应平台版本      |
| 存储空间   | 应用安装位置、镜像存储和持久化数据所在的存储空间正常，容量充足  |
| 内存       | 为 NAS 系统和已有应用留出余量，先部署一个服务观察资源占用       |
| 网络       | NAS 能正常联网，网关、DNS 和系统时间正确                        |
| 管理方式   | 使用具备应用管理权限的账户，优先从 PC 客户端或 Web 管理界面操作 |

绿联当前的 [Docker 使用指南][ugreen-docker-guide]还注明：**RAM 不超过 4 GB 的 ARM 设备不建议安装 Docker**。这是该厂商文档的适用建议，不代表所有 ARM NAS 都使用同一个限制。

品牌 NAS 通常使用系统提供的 Docker 应用；NAS 本机不需要安装 Windows / macOS 的 Docker Desktop。电脑端的 NAS 管理客户端，也不等同于 Docker Desktop。

## 安装并打开 Docker

### 绿联 UGOS Pro

按[绿联官方指南][ugreen-docker-guide]操作：

1. 打开 **应用中心**，找到 **Docker**。
2. 点击 **安装**，按系统向导完成安装设置。
3. 安装完成后，点击 **Docker** 图标进入应用。
4. 确认能够查看镜像、容器及日志页面，再继续下面的配置。

上述官方指南面向 **UGOS Pro 1.19.1.0126 及以上版本**的 PC 客户端和 Web 浏览器端。旧版菜单可能不同，不要为了套用截图而随意改动底层 Docker 服务。

### 极空间

先确认当前机型与系统提供 Docker 功能，再从设备的应用入口找到 Docker，按界面提示安装或启用。如果已经提供 Docker 图标，直接打开检查，无需重复安装。

不同型号和版本的入口、Compose 支持情况可能不同。找不到功能时，先核对当前机型的官方说明；仅凭教程中出现了 Docker 截图，不能判断自己的设备也支持同样功能。

磕巴白菜的[极空间部署准备文章][keba-zspace]可用于对照其示例界面。本文后面的镜像、路径、端口和权限检查同样适用，不依赖某个固定菜单名称。

### 飞牛 fnOS

从 fnOS 的 **应用中心**查找 Docker，按当前安装向导完成安装；已有 Docker 时，直接打开应用并确认服务状态。若向导要求选择存储空间，选择已经创建、可正常使用且空间足够的位置。

安装后先检查镜像和容器管理功能，再查看当前版本是否提供 Compose 或项目管理入口。不同版本的入口名称可能变化，可结合[飞牛部署准备文章][keba-fnos]对照操作。

### 自建 Debian / DebNAS

自行维护的 Debian 主机，按 [Docker Engine 的 Debian 安装文档](https://docs.docker.com/engine/install/debian/)安装 Engine 和 Compose 插件；已有运行环境时先核对现状，避免重复安装。系统与存储准备可结合 [DebNAS 安装及折腾记录](/posts/2026-10-09-debnas-installation-notes/)阅读。

品牌 NAS 的 Docker 可能由厂商维护。不要直接在这些系统上套用普通 Debian 的卸载冲突包、安装 Engine 或修改 systemd 服务流程，以免影响面板管理和升级。

如果当前系统允许通过 SSH 管理 Docker，可以检查：

```bash
docker version
docker info
docker compose version
```

`docker version` 应能显示客户端和服务端信息。提示权限不足或无法连接时，先检查账户权限、连接的引擎和服务状态。图形界面能用而 SSH 中找不到 `docker compose`，也不一定表示 Docker 应用未安装；厂商面板可能采用自己的项目管理方式。

## Windows：使用 WSL 运行 Linux 容器

<span id="wsl-3x-带来了什么"></span>
<span id="安装或更新-wsl"></span>
<span id="路线一直接用-wslc-测试容器"></span>
<span id="路线二docker-desktop无需另装-ubuntu"></span>
<span id="路线三wsl-发行版内独立安装-engine"></span>
<span id="项目目录与访问方式"></span>

Windows 的 WSLc、Docker Desktop 和独立 Engine 放在 [Windows 容器笔记](/posts/2026-10-10-windows-containers/)里。需要复用下文 Compose 示例时，选择 Docker Desktop 或独立 Engine。

## 固定 NAS 的访问地址

容器的访问入口通常是 `http://NAS_IP:端口`。无论使用 bridge 端口映射还是 host 网络，NAS 地址变化都可能使原来的书签失效。

建议在路由器中给 NAS 设置 **DHCP 地址保留**：

1. 找到 NAS 正在使用的网卡及其 MAC 地址。
2. 在路由器的 DHCP 设置中，为它保留一个局域网地址。
3. 确认没有地址冲突，按路由器说明让租约生效。
4. 用保留的地址重新打开 NAS 管理页面，并记录下来。

如果改为在 NAS 上手动填写静态地址，需要同时设置正确的子网掩码、网关和 DNS，并与路由器的 DHCP 地址池协调。远程修改网络前，保留可在本地找回设备的方式。

这里只需要稳定 **NAS 的地址**。普通入门部署不需要为每个 bridge 容器设置固定 IP，也不需要为访问局域网网页配置公网端口转发。

## 准备目录与文件权限

### 一个应用一个目录

先从 NAS 的文件管理中创建项目目录；Windows 用户按前面的路线选择 Windows 目录或 WSL 发行版内的 `~/docker/`。下面只是组织方式，不代表任何品牌的固定系统路径：

```text
docker/
├── demo-web/
│   ├── compose.yaml
│   └── html/
│       └── index.html
└── app-a/
    ├── compose.yaml
    ├── config/
    └── data/

media/
├── downloads/
└── library/
```

`demo-web` 用于后面的测试服务；`app-a` 只是其他应用的目录示意。媒体下载和资料库可以独立规划，避免与每个应用的配置文件混在一起。具体媒体路径约定见 [DebNAS 自动观影流程](/posts/2026-10-09-debnas-media-workflow/)。

创建完文件夹后，确认它在 NAS 上的**真实路径**。文件管理中的显示名称、SMB 网络路径和 Linux 文件系统路径可能不同；不要把电脑上的 `\\NAS\共享目录` 直接填进容器的 Linux 挂载配置。

### 区分三个存储位置

| 位置                   | 保存什么                         | 需要注意什么                                       |
| ---------------------- | -------------------------------- | -------------------------------------------------- |
| Compose 项目目录       | `compose.yaml`、相关配置文件     | 便于复现部署，但不一定包含应用的全部数据           |
| 应用持久化目录或命名卷 | 数据库、账号配置、下载内容等     | 更新与备份时重点核对                               |
| Docker 自己的存储目录  | 镜像层、容器可写层、卷等引擎数据 | 通常由系统管理，不等于自己创建的 `docker` 共享目录 |

绑定挂载把 NAS 文件夹映射到容器路径；命名卷由 Docker 管理。两者都能用于持久化，但备份方法不同。**只保存在容器可写层中的文件，会随容器删除而丢失。**

容器中的 `/config`、`/data` 并不是统一标准。具体应该挂载哪里，必须看所用镜像的说明。

### 权限按应用需要设置

先授予应用需要使用的账户或用户组相应目录权限：读取媒体的服务可以只读，下载器和数据库通常需要写入指定目录。

有些镜像支持 `PUID`、`PGID`，例如 LinuxServer 的许多镜像。它们用于指定应用运行身份，但**不是所有 Docker 镜像都支持的通用参数**。如果镜像要求这些值，可在允许 SSH 的设备上用 `id` 查看当前账户，或用 `id 账户名` 查询目标账户，再按该镜像文档填写。

NAS 的共享目录还可能有 ACL、应用授权等规则。即使 UID/GID 正确，也要检查实际读写权限。遇到 `Permission denied`，先查路径、容器身份和目录授权，不把整个共享目录统一改成 `777`。下面的官方 Nginx 示例不需要添加 `PUID`、`PGID`。

## 完成 Docker 基础设置

### 先验证镜像下载

从 Docker 应用中拉取一个小镜像，例如 `alpine:3.22`，确认镜像仓库访问正常。支持命令行时也可以执行：

```bash
docker pull docker.io/library/alpine:3.22
```

如果下载超时，再按当前系统提供的入口配置镜像加速器。绿联当前入口是 **Docker → 镜像 → 设置 → 镜像仓库 → 加速器配置**；保存后会重启 Docker 引擎，已有服务需要安排维护时间。

镜像加速配置、可尝试的地址、代理和离线导入，集中在 [Docker 镜像加速源教程](/posts/2026-10-10-docker-registry-mirrors/)。这里记住两个区别：`registry-mirrors` 用于 Docker Hub，不会自动解决 GHCR 的访问问题；NAS 上的镜像搜索能用，也不代表实际拉取一定成功。

### 自动重启与日志

长期运行的服务可以按应用需要设置自动重启。Compose 中常用 `restart: unless-stopped`：服务在符合重启策略条件时恢复运行，但**手动停止的容器不会因为 Docker 重启就自动恢复**；它也不会仅因为健康检查变成 `unhealthy` 就重启容器。

日志要有容量限制。本文示例为单个服务设置 `json-file` 日志轮转，避免为了第一个应用就修改全局 `daemon.json`。如果以后调整引擎的默认日志配置，要注意默认值只作用于新建容器，已有容器需要按原配置重建。

日志轮转只管理 Docker 收集的标准输出和标准错误；应用自己写进挂载目录的日志，需要按应用设置清理。

## 选对网络模式和端口

| 模式       | 适合的情况                                     | 访问与配置方式                                         |
| ---------- | ---------------------------------------------- | ------------------------------------------------------ |
| bridge     | 普通网页服务、下载器等常见应用                 | 发布需要的端口，通过 `NAS_IP:宿主机端口` 访问          |
| host       | 应用文档明确要求，或确实需要直接使用宿主机网络 | 服务直接占用 NAS 端口，不再配置 `ports`                |
| macvlan 等 | 需要独立局域网地址等特定场景                   | 先规划网段、路由与通信限制，不作为第一个容器的默认选择 |

Compose 未指定特殊网络模式时，通常会创建项目自己的 bridge 网络。下面的映射表示 **NAS 的 18080 端口 → 容器的 80 端口**：

```yaml
ports:
  - "18080:80"
```

如果 NAS 的 `18080` 已被占用，可以改左边，例如 `"18081:80"`；右边应与容器内应用实际监听的端口一致。不要只为解决冲突而随意修改容器端口。

不写宿主 IP 时，发布端口默认绑定宿主机所有接口。下面的测试服务用于受控局域网；实际能从哪些网络访问，还取决于 NAS、防火墙、路由器和 IPv6 配置，不能把“局域网测试地址”理解为只允许局域网访问。

访问时也要区分位置：访问 NAS 用 `NAS_IP:18080`，Windows 本机的 Desktop 示例用 `localhost:18080`；同一 Compose 网络中的其他容器可以用 `web:80`。本例 bridge 模式下，容器里的 `127.0.0.1` 指向它自己。在原生 Linux NAS 上，host 模式共享 NAS 的网络命名空间；本文 Windows 示例使用 bridge 和端口映射。

## 部署第一个容器

用一个简单的网页服务验证整个流程。它只展示自己准备的 HTML 文件，不需要账号、数据库、特权模式或 Docker socket。

本节使用 Docker Engine / Desktop，适用于 NAS 和相应的 Windows 路线。WSLc 的独立测试见 [Windows 容器笔记](/posts/2026-10-10-windows-containers/#路线一直接用-wslc-测试容器)，不直接执行这里的 `docker compose` 命令。

下面的图形界面和 Compose 是**两种可选方法**，选一种即可。用同一端口同时部署两份，会发生端口冲突。

### 先准备测试页面

在前面创建的 `demo-web/html/` 中保存 `index.html`：

```html
<!doctype html>
<html lang="zh-CN">
  <meta charset="utf-8" />
  <title>NAS Docker 测试</title>
  <h1>NAS Docker 已运行</h1>
  <p>这个页面来自 NAS 上的 html/index.html。</p>
</html>
```

先创建文件，再部署容器。挂载 `html` 目录后，它会遮住镜像自带的网页目录；如果本地目录为空，不能期待仍然看到 Nginx 的默认欢迎页。

### 方法一：Compose 部署

在 `demo-web/` 中保存 `compose.yaml`：

```yaml
services:
  web:
    image: docker.io/library/nginx:stable
    restart: unless-stopped
    ports:
      - "18080:80"
    volumes:
      - ./html:/usr/share/nginx/html:ro
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```

这里的 `./html` 按主 Compose 文件所在目录解析，`:ro` 表示容器只读挂载这个目录。`stable` 是会变化的镜像标签，适合演示；长期部署时记录验证过的版本或 digest。

如果 NAS 提供 Compose / 项目管理入口，创建项目并按界面导入这个文件，确认项目工作目录确实对应 `demo-web`。如果面板对相对路径有自己的处理规则，把 `./html` 改成文件管理中确认的真实绝对路径，再查看部署结果。

NAS 允许通过 SSH 管理并已安装 Compose 插件时，在 **`demo-web` 目录内**依次执行；使用 WSL 发行版中的独立 Engine 或 Desktop 集成时，在该发行版的 Linux 终端执行同样的命令，按实际权限添加 `sudo`：

```bash
docker compose config --quiet \
  && docker compose pull \
  && docker compose up -d
docker compose ps
docker compose logs --tail=50 web
```

直接使用 **Windows PowerShell + Docker Desktop** 时，在项目目录内使用以下写法，不复制 Bash 的反斜杠续行：

```powershell
docker compose config --quiet
if ($LASTEXITCODE -eq 0) { docker compose pull }
if ($LASTEXITCODE -eq 0) { docker compose up -d }
docker compose ps
docker compose logs --tail=50 web
```

前一步报错时先处理，再继续下一步。`config --quiet` 通过只说明配置能够解析，不代表文件路径、权限、镜像下载和网页访问都已经正常。

Compose 文件应保留为部署依据。后续修改端口、挂载或镜像时，优先同步到文件并重新应用，避免面板中的设置与存档内容不一致。

### 方法二：图形界面部署

不使用 Compose 时，从 NAS 的 Docker 应用拉取 `docker.io/library/nginx:stable`。如果界面把镜像名与版本分开，名称填 `nginx` 或界面支持的完整仓库路径，版本填 `stable`。

基于下载的镜像创建容器，按下面的对应关系填写：

| 设置                      | 本例填写内容                                   |
| ------------------------- | ---------------------------------------------- |
| 容器名称                  | 自己容易辨认的名称，例如 `demo-web`            |
| 网络模式                  | bridge                                         |
| NAS 端口 / 容器端口       | `18080` / `80`，协议为 TCP                     |
| NAS 文件夹                | 实际的 `demo-web/html` 目录                    |
| 容器路径                  | `/usr/share/nginx/html`                        |
| 挂载权限                  | 只读                                           |
| 环境变量                  | 本例不需要额外添加                             |
| 特权、设备、Docker socket | 本例不需要                                     |
| 自动重启                  | 按面板支持的策略配置，具体行为以该选项说明为准 |

确认后创建并启动容器，查看日志。图形界面若没有日志容量或精确重启策略选项，不必强行套用其他品牌的菜单；需要完整保留这些设置时，可以采用 Compose 方式。

## 验证是否真正部署成功

在 NAS 上部署时，从同一局域网的电脑或手机打开 `http://NAS_IP:18080`，把 `NAS_IP` 换成前面固定的地址；在 Windows Docker Desktop 上部署时，先用 Windows 本机浏览器打开 `http://localhost:18080`，独立 WSL Engine 按前面的转发配置测试。如果改了左侧端口，访问地址也要相应修改。

按顺序检查：

1. **镜像已下载**：镜像列表中有对应仓库和标签，没有持续下载失败。
2. **容器在运行**：不是反复退出、重启；日志没有明显的路径或端口错误。
3. **网页可访问**：能看到“NAS Docker 已运行”，而不是其他应用或 NAS 管理页面。
4. **挂载对应正确**：修改项目中 `html/index.html` 的一句文字，保存并刷新浏览器，页面随之更新。
5. **重启后仍正常**：重启这个测试容器，再次访问，页面内容仍然存在。

这些检查通过后，再选择真正要长期使用的应用。容器显示“运行中”只是进程没有退出，不能替代网页、数据库或读写功能的验证。

## 更新、备份与删除

### 更新前先留好配置和数据

备份至少应覆盖：

- Compose 文件、配套配置和必要的环境变量文件。
- 应用实际使用的绑定挂载目录或命名卷。
- 当前镜像版本、端口、目录和特殊参数记录。

对数据库等正在写入的数据，使用应用支持的备份方式，或按文档停服务后备份。把正在变化的目录直接复制一份，不一定能得到可恢复的一致性备份。

确认变更说明和备份后，Compose 项目通常可在 Linux 终端依次执行：

```bash
docker compose pull && docker compose up -d
docker compose ps
docker compose logs --tail=50
```

Windows PowerShell 可以沿用前面依据 `$LASTEXITCODE` 判断成功后再继续的写法，不必使用 `&&`，以兼容 Windows PowerShell 5.1。

拉取成功才继续应用更新，然后重新验证服务。镜像更新不等于数据库一定兼容，换回旧镜像也不保证能回退已经升级的数据。

### 停止与删除的区别

只想暂时不用时，停止容器即可。删除容器前先检查挂载关系：绑定挂载目录一般仍留在 NAS 上，命名卷通常也需要单独管理；厂商界面的“同时删除数据”等选项则要逐项看清。

`docker compose down` 默认移除项目容器和网络；额外加 `-v` 会删除该命令管理的卷。入门操作不需要加这个参数，也不要为了解决启动失败就清理整个 Docker 存储目录。

实际应用的示例文件见 [Compose 存档](/setup/compose/)，软件入口见 [Debian 常用软件记录](/posts/2026-10-09-nas-software-websites/)。每个项目的目录、端口和权限都要对照自身文档，不能只替换示例中的镜像名称。

## 常见问题

| 现象                                    | 优先检查                                                                                              |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 找不到 Docker 应用                      | 当前机型、系统版本、账户权限及厂商支持范围                                                            |
| 找不到 `wslc`                           | 检查 WSL 软件版本和更新结果，查阅微软正式版发布记录；不需要为这个命令额外安装 Ubuntu                  |
| Ubuntu 中找不到 `docker` 或无法连接引擎 | 先区分路线：Desktop 集成检查 Desktop 是否运行及集成开关；独立 Engine 检查服务与权限，不要混用两套引擎 |
| WSL 2 无法启动                          | WSL 更新、CPU 虚拟化、Windows 虚拟机平台及此前是否禁用了虚拟机管理程序                                |
| Windows 本机能访问，其他设备不能        | Windows 局域网地址、端口发布、Windows 防火墙和实际网络模式；不要使用 WSL 内部动态地址作为固定入口     |
| 镜像下载超时                            | NAS 网络、DNS、时间、仓库地址和镜像加速配置                                                           |
| `no matching manifest`                  | 镜像是否支持 NAS 的 CPU 架构；改文件名或标签不会转换架构                                              |
| `address already in use`                | NAS 端口已被占用，修改端口映射左侧并同步访问地址                                                      |
| 容器运行但网页打不开                    | NAS 地址、访问端口、容器内监听、日志及防火墙；检查是否误用了 host 模式                                |
| 测试网页显示 403                        | `html/index.html` 是否存在，文件能否被读取，是否挂载了空目录或错误目录                                |
| `Permission denied`                     | NAS 目录授权、ACL、容器实际用户及镜像支持的权限参数                                                   |
| 重建容器后配置丢失                      | 应用真正的数据目录是否已持久化，是否误删了卷或挂载到新空目录                                          |
| 容器反复重启                            | 先看日志中的首个错误；重启策略不能修复无效配置或缺失文件                                              |
| Compose 运行正常，面板修改后又变回去    | 重新应用了旧的 Compose 文件，需要统一配置来源                                                         |

## 参考资料

- 磕巴白菜：[绿联 Docker 容器部署前准备工作][keba-ugreen]、[极空间 Docker 容器部署前准备工作][keba-zspace]、[飞牛 Docker 容器部署前准备工作][keba-fnos]：固定 NAS 地址与部署方式的参考，品牌界面截图见原文。
- 绿联官方：[Docker 使用指南][ugreen-docker-guide]：安装入口、适用条件及首次部署步骤。
- [Docker Engine 安装：Debian](https://docs.docker.com/engine/install/debian/)：自建 Debian 的安装要求。
- Microsoft：[安装 WSL][microsoft-wsl-install]、[WSL 基本命令][microsoft-wsl-commands]、[文件系统][microsoft-wsl-filesystems]、[网络访问][microsoft-wsl-networking]、[systemd][microsoft-wsl-systemd]：WSL 安装、版本检查、项目位置与独立服务管理。
- Microsoft：[WSL Containers 正式发布公告][wslc-announcement]、[官方入门教程][wslc-tutorial]、[架构与存储][wslc-architecture]、[WSL 发布记录][wsl-releases]：WSL 3.x 的内置容器功能、命令及 Compose 支持进度。
- Docker：[Windows 安装要求][docker-desktop-windows]、[WSL 2 后端与发行版集成][docker-desktop-wsl]、[WSL 最佳实践][docker-wsl-best-practices]、[Desktop 设置][docker-desktop-settings]、[Ubuntu Engine 安装][docker-engine-ubuntu]：Windows 两种部署路线的设置与边界。
- [Docker bind mounts](https://docs.docker.com/engine/storage/bind-mounts/)、[Volumes](https://docs.docker.com/engine/storage/volumes/)：目录映射、数据持久化与卷管理。
- [Compose 网络](https://docs.docker.com/compose/how-tos/networking/)、[Compose 服务配置](https://docs.docker.com/reference/compose-file/services/)：网络、端口、挂载及日志配置。
- [自动重启策略](https://docs.docker.com/engine/containers/start-containers-automatically/)、[JSON File 日志驱动](https://docs.docker.com/engine/logging/drivers/json-file/)：重启行为和日志轮转。
- [LinuxServer：理解 PUID 与 PGID](https://docs.linuxserver.io/general/understanding-puid-and-pgid/)：支持这些变量的镜像如何设置文件访问身份。
- [Nginx 官方镜像说明](https://github.com/docker-library/docs/tree/master/nginx#how-to-use-this-image)：测试示例的端口与只读网页目录挂载。

[ugreen-docker-guide]: https://support.ugnas.com/knowledgecenter/detail/article/zh-CN/938
[keba-ugreen]: https://hi.keba.host/archives/dockerrong-qi-bu-shu-qian-zhun-bei-gong-zuo
[keba-zspace]: https://hi.keba.host/archives/wei-ming-ming-wen-zhang
[keba-fnos]: https://hi.keba.host/archives/%E9%A3%9E%E7%89%9BDocker
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
