---
setupCategory: nas
setupRole: guide
title: Docker 镜像加速源教程
description: 整理 Docker Hub 镜像加速、仓库前缀拉取、Docker 服务代理与离线导入的方法，涵盖 Debian、DebNAS、绿联、极空间、飞牛和 Docker Desktop，并说明配置备份、验证与恢复。
author: Ayulog
pubDatetime: "2026-10-10T08:00:00+08:00"
draft: false
tags:
  - Docker
  - NAS
  - Debian
  - 镜像加速
  - 网络
---

镜像拉取超时，先看镜像来自 Docker Hub、GHCR 还是其他仓库。Docker Hub 加速器、仓库前缀和 Docker 服务代理解决的问题不同，不能互相代替；完全离线的机器还可以用 `docker save` / `docker load`。

命令以 Debian / DebNAS 的 Docker Engine 为主，另列品牌 NAS 和 Docker Desktop 的设置入口。资料核对日期为 **2026 年 10 月 10 日**，未在各品牌 NAS 上逐一实测。公共源是否可用要以实际拉取结果为准。

## 目录

- [先选一种解决办法](#先选一种解决办法)
- [镜像加速源从哪里找](#镜像加速源从哪里找)
- [方法一：配置 Docker Hub 镜像加速](#方法一配置-docker-hub-镜像加速)
- [方法二：给镜像名称加上仓库前缀](#方法二给镜像名称加上仓库前缀)
- [方法三：给 Docker 服务配置代理](#方法三给-docker-服务配置代理)
- [方法四：离线导入镜像](#方法四离线导入镜像)
- [怎样确认配置有效](#怎样确认配置有效)
- [常见问题](#常见问题)
- [撤销修改与恢复](#撤销修改与恢复)
- [参考资料](#参考资料)

## 先选一种解决办法

| 遇到的情况                                    | 优先考虑                      | 改在哪里                                    |
| --------------------------------------------- | ----------------------------- | ------------------------------------------- |
| 多个 Docker Hub 镜像都拉不下来                | 配置镜像加速器                | NAS 的 Docker 设置，或 Docker daemon 配置   |
| 只想下载某个公开镜像                          | 按服务说明添加仓库前缀        | `docker pull` 的镜像名或 Compose 的 `image` |
| Docker Hub、GHCR 等仓库都需要通过已有代理访问 | Docker daemon 代理            | Docker 服务配置，Desktop 则使用应用设置     |
| NAS 无法联网，但另一台机器能下载              | `docker save` / `docker load` | 导出镜像归档，再传给 NAS                    |

先选择一种方法，拉取一个小镜像验证，再扩展到自己的服务。一次同时改 DNS、镜像名、代理和 Docker 配置，后面很难判断是哪一步起作用。

### 镜像名先看仓库域名

```text
alpine:3.22
  = docker.io/library/alpine:3.22

linuxserver/qbittorrent:latest
  = docker.io/linuxserver/qbittorrent:latest

ghcr.io/metacubex/metacubexd:latest
  = GitHub Container Registry 上的镜像
```

Docker 的 `registry-mirrors` 用于 **Docker Hub**，不会把 `ghcr.io`、`quay.io` 或其他仓库的请求一起加速。比如 [Compose 存档](/setup/compose/) 中的 Mihomo 核心来自 Docker Hub，MetaCubeXD 面板来自 GHCR，两者的下载问题要分别看。

另外，`docker pull` 是客户端命令，真正访问仓库的是连接到的 Docker daemon。使用远程 Docker context 时，应配置远端服务，而不是只修改当前电脑。可以先用 `docker context show` 和 `docker info` 确认操作对象。

## 镜像加速源从哪里找

我更倾向于保存维护者的说明入口，再按它当前公布的地址使用。公共加速服务可能有地域限制、仓库白名单、拉取频率限制，也可能清理缓存或停止维护。

| 来源                                                                            | 地址或使用形式                                                                                | 使用前看什么                             |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------- |
| [DaoCloud public-image-mirror](https://github.com/DaoCloud/public-image-mirror) | Docker Hub 加速地址为 `https://docker.m.daocloud.io`；也支持 `m.daocloud.io/源仓库/镜像` 形式 | 支持的源仓库、白名单、限流与缓存说明     |
| [磕巴白菜的镜像加速教程](https://hi.keba.host/archives/Docker)                  | 原文列出自建地址 `https://docker.keba3366.top` 及其他社区源                                   | 原文更新、服务公告与实际网络下的拉取结果 |

这两个入口用于查找配置方法，并不表示任何地址都能在所有网络下长期使用。下面用 DaoCloud 文档中的地址演示；如果它在你的网络或目标仓库上不可用，按服务说明换源，或者使用后面的代理、离线方案。

### Docker 镜像加速源列表

下面收录 11 个可尝试的镜像加速地址，已统一补齐 `https://`，可按需复制到加速器设置中。公共源的可用性会随网络、地区和服务策略变化；本文未逐一完成镜像拉取测试，请先选一个，按[后文方法](#怎样确认配置有效)验证。

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

配置加速器时保留 `https://`；如果改用镜像名前缀拉取，则按对应服务公布的规则填写，不直接把上面的 URL 拼到镜像名前。

### 使用前注意

选择时还要注意几件事：

- **Docker Hub 加速器地址和普通 Registry 地址不能随意混填。** 能打开网页、能列出镜像，不代表支持 `registry-mirrors` 的使用方式。
- **缓存不一定立刻更新。** DaoCloud 文档明确说明可变标签可能先返回旧数据并在后台同步；需要复现时记录明确版本，进一步固定时使用从可信上游核对的 digest。
- **公共源优先用于公开镜像。** 私有镜像和登录凭据按仓库及服务商文档处理，不把自己的 Docker Hub 密码交给不明镜像网站。
- **`/v2/` 返回 401 不一定是坏了。** Registry 的正常流程可能先返回认证挑战；这既不等于账号错误，也不能证明某个镜像已经可以下载。

## 方法一：配置 Docker Hub 镜像加速

### 绿联 NAS（UGOS Pro）

绿联提供了[官方设置教程][ugreen-docker-mirrors]。当前文档适用于 **UGOS Pro 固件 1.18.1.0098 及以上版本**的 **PC 客户端和 Web 浏览器端**；不同版本的界面可能略有差异。

1. 打开 **Docker** 应用，点击左侧 **镜像**，进入右侧页面的 **设置**。
2. 在镜像设置页面的镜像仓库列表中，点击 **加速器配置**。
3. 先保存原有地址列表，再填写要使用的加速器 URL，例如 `https://docker.m.daocloud.io`。界面提供推荐地址时，也可以点击 **“+”** 添加。
4. 点击 **确定** 保存。**系统会重启 Docker 引擎**，请提前安排好正在运行的容器任务，并等待重启完成。
5. 回到 **镜像 → 本地镜像 → 添加镜像 → 从镜像源下载**，按界面提示填写镜像名和版本，例如 `alpine` 与 `3.22`，测试拉取。

成功后在本地镜像列表中确认结果；失败时打开 Docker 的 **日志** 页面查看原因。官方文档注明绿联云移动端暂不提供镜像源配置入口，建议通过 PC 客户端或 Web 端完成以上设置。

这里要使用 **加速器配置**，不要与旁边的 **新建** 镜像源混淆。后者用于添加仓库别名、仓库链接及可能需要的登录信息，两种设置用途不同。

### 极空间与飞牛 NAS

有图形配置入口时，优先从 NAS 的 Docker 应用设置加速地址，便于查看和撤销。先记录系统与 Docker 应用版本，再查找与“镜像加速”“镜像仓库”有关的设置；不同版本的栏目名称和支持范围可能变化。

结合参考文章，可以按下面的顺序操作：

1. **极空间**：区分加速地址与自定义拉取时填写的镜像名。例如 `linuxserver/qbittorrent:latest` 是镜像名，不是加速器 URL；如果界面将名称和版本分开，就分别填写仓库名称与 `latest`。
2. **飞牛**：先查看当前 Docker 应用是否能直接管理加速地址。原参考文章提供了 SSH 修改配置的方法；需要走 SSH 时，按下一节备份并合并配置，不能直接清空原文件。

保存时若提示重启 Docker，先安排好正在运行的任务；重启可能中断容器。完成后查看镜像任务的实际日志，而不只看界面是否显示“保存成功”。

如果界面只有“自定义仓库”“自定义镜像”，先核对该字段接受什么内容：可能是完整镜像引用，也可能是仓库服务器地址，不能仅凭名称认定它会配置全局加速。对应操作可参考文末的品牌教程截图，当前设备界面仍以厂商说明为准。

NAS 厂商可能管理或自动生成 Docker 配置。不要将普通 Debian 的文件路径、服务名直接套到所有 NAS 上；通过面板配置的项目，也避免再用 SSH 写另一份相互覆盖的设置。

### Debian / DebNAS：备份与编辑

下面适用于 **使用 systemd 管理、以 root 权限运行的普通 Docker Engine**。确认 Docker 已安装，再查看服务和版本：

```bash
docker version
docker info
sudo systemctl cat docker
```

普通 Linux 安装默认使用 `/etc/docker/daemon.json`。如果服务启动参数带有 `--config-file`，则要编辑那个实际文件；如果同一配置项已经通过启动参数设置，也不要再在 JSON 中重复定义。

创建配置目录并备份已有文件：

```bash
sudo mkdir -p /etc/docker
if sudo test -f /etc/docker/daemon.json; then
  sudo cp -a /etc/docker/daemon.json "/etc/docker/daemon.json.bak-$(date +%Y%m%d-%H%M%S)" \
    && sudoedit /etc/docker/daemon.json
else
  sudoedit /etc/docker/daemon.json
fi
```

记下生成的备份文件名。**原文件存在时，保留里面的其他字段，只新增或修改 `registry-mirrors`。** 特别是 `data-root`、日志、网络等设置，删除后可能改变 Docker 的运行行为。

如果原来没有配置文件，最小示例是：

```json
{
  "registry-mirrors": ["https://docker.m.daocloud.io"]
}
```

如果已经有其他配置，把这个字段合并进同一个 JSON 对象。不要连续粘贴两组 `{}`，不要重复写两个 `registry-mirrors`，也不要保留注释或末尾多余的逗号。一个确认可用的源通常足够开始排查；写十几个来源不明的地址不会自动叠加带宽。

### 检查并应用

在支持 `--validate` 的 Docker Engine 上，先检查配置：

```bash
sudo dockerd --validate --config-file=/etc/docker/daemon.json
```

这个命令只校验配置，不启动第二个 daemon。校验成功不代表镜像站可用，也不能代替对 systemd 启动参数冲突的检查。旧版如果没有这个选项，先按对应版本文档检查，不要去掉 `--validate` 直接运行上面的命令。

确认已有服务允许短时中断后，再重启并核对：

```bash
sudo systemctl restart docker
sudo systemctl status docker --no-pager
docker info
docker pull docker.io/library/alpine:3.22
```

在 `docker info` 中检查 `Registry Mirrors`。修改 `daemon.json` 不需要额外执行 `systemctl daemon-reload`；只有修改了 systemd unit 或 drop-in 等服务定义时，才需要让 systemd 重新加载定义。

**Rootless Docker 是另一套配置。** 默认配置位于用户的 `~/.config/docker/daemon.json`，若设置了 `XDG_CONFIG_HOME` 则按对应目录处理，服务通常由 `systemctl --user` 管理。不要用 `sudo` 修改系统 Docker 后，期待另一个 Rootless daemon 同时生效。

### Windows / macOS 上的 Docker Desktop

Docker Desktop 使用自己的设置入口：

1. 打开 **Settings → Docker Engine**，复制保存现有 JSON。
2. 在原有对象中合并前面的 `registry-mirrors` 字段。
3. 使用界面中的应用并重启操作，再运行 `docker info` 和测试拉取。

这里不要套用 `sudo systemctl restart docker`。如果 WSL 中使用的是 Docker Desktop 提供的引擎，在某个 WSL 发行版里新建 `/etc/docker/daemon.json`，通常不会配置到 Desktop 的 daemon。先确认实际连接的引擎。

## 方法二：给镜像名称加上仓库前缀

如果只拉取少量镜像，可以按加速服务的规则直接改镜像名，省去修改全局 daemon 设置。

DaoCloud 当前文档推荐在完整镜像引用前增加 `m.daocloud.io/`：

```bash
docker pull m.daocloud.io/docker.io/library/alpine:3.22
```

Docker Hub 的官方镜像要补上 `library/`。同一服务的前缀替换方式则是：

```bash
docker pull docker.m.daocloud.io/library/alpine:3.22
```

这两条是同一服务提供的不同写法，按需选一种。其他服务可能采用不同规则，不能推断所有镜像站都支持这种拼接方式，也不要把 `https://` 写进镜像名称。

### 配合 Compose 使用

例如某个服务原来写的是：

```yaml
services:
  web:
    image: docker.io/library/nginx:stable
```

按服务文档改成：

```yaml
services:
  web:
    image: m.daocloud.io/docker.io/library/nginx:stable
```

这里只展示 `image` 字段的改法，实际编辑时保留原有端口、挂载、环境变量等配置。在项目目录中先拉取指定服务：

```bash
docker compose config --quiet
docker compose pull web
```

拉取成功后，确认版本符合预期，再按原部署流程运行 `docker compose up -d web`；这一步可能重建服务。`stable` 和 `latest` 都是会变化的标签，长期部署应记录验证过的版本或 digest。

如果希望 Compose 继续使用原来的镜像名，也可以给下载结果补一个本地标签：

```bash
docker tag m.daocloud.io/docker.io/library/alpine:3.22 docker.io/library/alpine:3.22
```

`docker tag` 只增加本地名称，不重新下载，也不会让以后的远端更新自动使用加速源。Compose 配了 `pull_policy: always`，或再次执行 `docker compose pull` 时，仍会按 Compose 中的镜像名访问仓库。

对 GHCR 等其他仓库，只有服务明确支持时，才能使用它公布的映射规则。给 `registry-mirrors` 填入 GHCR 的代理地址，不能实现同样的效果。

## 方法三：给 Docker 服务配置代理

已有可用 HTTP 代理时，可以让 Docker daemon 经由代理连接仓库。这与镜像缓存服务是两种方案：

```text
镜像加速：Docker daemon → 镜像加速服务 → Docker Hub
服务代理：Docker daemon → HTTP 代理 → 目标镜像仓库
```

**在终端里 `export https_proxy=...`，不代表已经启动的 Docker 服务会继承它。** 给业务容器添加 `HTTP_PROXY`，或修改客户端 `~/.docker/config.json` 的容器代理配置，也不是给 daemon 配置拉取代理。

### Docker Engine 23.0 及以上

普通 Docker Engine 可以在实际使用的 `daemon.json` 中配置：

```json
{
  "proxies": {
    "http-proxy": "http://PROXY_HOST:7890",
    "https-proxy": "http://PROXY_HOST:7890",
    "no-proxy": "localhost,127.0.0.1,::1"
  }
}
```

把 `PROXY_HOST` 换成 **Docker daemon 所在环境可访问的代理地址**，端口按代理服务实际配置填写。上面也是待合并的字段示例，不覆盖原有 JSON。编辑前备份，再按前面的校验、重启和拉取流程验证。

`https-proxy` 的值使用 `http://`，表示通过 HTTP 代理访问 HTTPS 目标。如果代理需要认证，按其支持方式配置凭据，保留字符需进行 URL 编码，配置文件则要限制读取权限。`no-proxy` 按实际需要增加内网仓库域名；不要把需要经过代理的仓库也填进排除列表。

旧版 Engine 可以按 [Docker 官方代理文档](https://docs.docker.com/engine/daemon/proxy/)使用 systemd drop-in 设置 Docker 服务环境变量。这里不同时叠加两套设置，以免遗漏优先级或恢复时只删了一处。

### Docker Desktop 与 NAS 面板

Docker Desktop **不使用 `daemon.json` 中的代理配置**，应通过 Desktop 的代理设置管理，使用系统代理或手动填写代理地址。NAS 若提供“Docker 代理”入口，也要确认它作用于拉取镜像的服务。

Mihomo 等代理运行在容器里时，daemon 需要通过宿主机可达的发布端口连接，不能直接假设它能解析 `mihomo:7890`。如果代理和 Docker 在不同机器上，`127.0.0.1` 更不能代表那台代理机器。

首次部署还有一个先后顺序问题：代理容器尚未启动时，无法替 Docker 下载自己的镜像。先通过其他方法准备代理镜像并确认代理可用，再设置 daemon 的出口；代理容器不可用时，也要能撤销这项依赖。

## 方法四：离线导入镜像

如果另一台安装了 Docker 的机器能正常拉取，可以在那台机器上导出镜像，再把归档传给 NAS。

先在目标 NAS 检查架构：

```bash
docker info --format '{{.OSType}}/{{.Architecture}}'
```

常见的 `x86_64` 对应 `linux/amd64`，`aarch64` 对应 `linux/arm64`。下面示例面向 **amd64 NAS**，在能够联网的机器上执行：

```bash
docker pull --platform linux/amd64 docker.io/library/alpine:3.22
docker image save -o alpine-3.22-amd64.tar docker.io/library/alpine:3.22
```

将生成的 `alpine-3.22-amd64.tar` 传到 NAS，在文件所在目录导入：

```bash
docker image load -i alpine-3.22-amd64.tar
docker image inspect docker.io/library/alpine:3.22 --format '{{.Os}}/{{.Architecture}}'
docker run --rm --pull=never docker.io/library/alpine:3.22 uname -m
```

ARM NAS 应从拉取阶段就换成对应平台，前提是上游镜像提供该平台版本。改归档文件名、重新打标签或导入操作本身都不会转换 CPU 架构。

这里用的是 **`docker save` / `docker load`**。`docker export` / `docker import` 处理的是容器文件系统，不适合代替完整镜像分发流程。Docker 的 `load` 支持 tar 及文档列出的压缩格式；NAS 网页导入器是否支持某种压缩格式，要另看厂商说明，不能把任意网盘压缩包都当作镜像归档。

Compose 后续使用的镜像名和标签要与导入结果匹配。只想使用已导入的镜像时，按部署工具支持的拉取策略操作，否则它仍可能尝试访问网络。

## 怎样确认配置有效

按三个层次检查，避免把“配置已保存”当成最终结果：

1. **配置层**：`docker info` 中出现预期镜像加速地址，或 Docker 服务的代理配置已经加载。
2. **下载层**：`docker pull` 完成清单和镜像层下载，`docker image inspect` 能看到预期镜像与平台。
3. **使用层**：小镜像可以运行，实际服务按原有 Compose 配置部署成功。

```bash
docker pull docker.io/library/alpine:3.22
docker image inspect docker.io/library/alpine:3.22 --format '{{json .RepoDigests}}'
docker run --rm --pull=never docker.io/library/alpine:3.22 cat /etc/alpine-release
```

如果采用前缀拉取，把上面各处镜像名都换成实际使用的带前缀名称，或者先添加本地标签。不要拉取了一个名称，却用另一个名称测试。

`Image is up to date` 不代表刚重新下载了所有层；本地已有内容时会复用缓存。加速失败后，Docker 也可能继续尝试上游，所以成功拉取本身不能完全证明流量经过某个镜像站。需要确认实际路径时，结合 Docker 日志、自己控制的代理访问记录或镜像服务日志判断，不必为了测试清空现有镜像。

## 常见问题

| 现象                                                        | 优先检查                                                                                                                            |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `unknown flag: --registry-mirror`                           | 这是 `dockerd` 的参数，不是 `docker pull` 的参数；使用 daemon 配置或服务支持的镜像名前缀                                            |
| `i/o timeout`、`TLS handshake timeout`                      | NAS 的 DNS、时间、网络出口、代理可达性与服务状态；浏览器能打开网页不等于 daemon 能下载                                              |
| `/v2/` 返回 401                                             | 先看是否是正常认证挑战；继续用 Docker 客户端测试具体镜像，不仅凭这一个状态码判断                                                    |
| 拉取时报 `unauthorized`、`denied` 或 403                    | 镜像是否公开、路径是否写对、服务是否有限制；需要认证时按官方方式登录对应仓库                                                        |
| `toomanyrequests` 或 429                                    | 上游或加速服务限流；查看该服务公告，等待后再试，不要持续高频重试                                                                    |
| `manifest unknown`                                          | 标签不存在、路径错误、源未收录或缓存未同步；回上游核对镜像名与标签                                                                  |
| `no matching manifest`                                      | 镜像不支持当前平台，或服务没有提供对应平台清单；换正确平台/镜像，不能靠换标签伪装架构                                               |
| `x509` 证书错误                                             | 检查系统时间、证书链与企业代理 CA；不要以关闭 TLS 校验作为常规加速步骤                                                              |
| 配置后 Docker 启动失败                                      | JSON 格式、未知字段、版本不支持、启动参数重复；查看日志并恢复备份                                                                   |
| Docker Hub 正常，GHCR 仍失败                                | `registry-mirrors` 不覆盖 GHCR；使用支持该仓库的前缀服务或 daemon 代理                                                              |
| 网页搜索仍不可用，但可以拉取镜像                            | 搜索、Registry 拉取和镜像层下载可能使用不同接口；加速拉取不保证网页搜索恢复                                                         |
| `docker pull` 正常，但 `docker buildx build` 拉不到基础镜像 | 独立 BuildKit builder 可能需要自己的镜像源与网络配置，按 [BuildKit 配置文档](https://docs.docker.com/build/buildkit/configure/)检查 |

普通 Debian 的 Docker 服务日志可以这样看：

```bash
sudo journalctl -u docker --since "10 minutes ago" --no-pager
```

先记下具体失败的仓库域名、镜像名和错误，再决定换源、改代理还是修配置。不要看到一次超时就清理 Docker 数据目录，或运行来源不明的一键修复脚本。

## 撤销修改与恢复

只想停止使用加速器时，从原配置中移除自己添加的 `registry-mirrors` 字段，注意处理 JSON 逗号，再校验并应用。使用 NAS / Docker Desktop 界面添加的设置，就回到对应界面撤销。

如果需要完整恢复刚才的备份，在普通 Debian 环境中执行以下流程，替换为实际备份文件名：

```bash
if sudo cp -a /etc/docker/daemon.json.bak-YYYYMMDD-HHMMSS /etc/docker/daemon.json \
  && sudo dockerd --validate --config-file=/etc/docker/daemon.json; then
  sudo systemctl restart docker
  sudo systemctl status docker --no-pager
fi
```

整份恢复会覆盖备份后做过的其他配置修改，执行前先对照当前内容。若原来没有这个文件，可以仅移除新增字段，或把本次新建的文件改名留存后恢复默认配置；不要误动原有配置和 `/var/lib/docker` 数据。

代理方案还需要撤销自己添加的 `proxies` 或 systemd drop-in。更改服务定义后执行 `sudo systemctl daemon-reload`，再按维护安排重启。若更改过 Compose 的镜像前缀，也要把相应 `image` 改回，否则仍会访问那个加速服务。

最后重新检查 `docker info`、容器状态与实际访问，确认恢复的是自己原来的运行方式。

## 参考资料

- [绿联官方：Docker 如何配置镜像加速器、镜像源和镜像代理？][ugreen-docker-mirrors]：UGOS Pro 的适用版本、操作入口、加速器设置与镜像下载步骤。
- 磕巴白菜：[Docker 镜像加速源教程](https://hi.keba.host/archives/Docker)、[极空间 DockerHub 镜像无法下载的多种解决方案](https://hi.keba.host/archives/ji-kong-jian-dockerhubjing-xiang-wu-fa-xia-zai-de-duo-zhong-jie-jue-fang-an)、[飞牛 DockerHub 镜像无法下载的多种解决方案](https://hi.keba.host/archives/fei-niu-dockerhubjing-xiang-wu-fa-xia-zai-de-duo-zhong-jie-jue-fang-an)：本文的 NAS 场景与方案整理参考，界面截图请查看原文。
- [Docker Hub 镜像缓存](https://docs.docker.com/docker-hub/image-library/mirror/)：镜像加速的适用范围与 daemon 配置。
- [Docker daemon 配置](https://docs.docker.com/engine/daemon/)、[dockerd 命令参考](https://docs.docker.com/reference/cli/dockerd/)：配置文件位置、启动参数与校验选项。
- [Docker daemon 代理](https://docs.docker.com/engine/daemon/proxy/)、[Docker 客户端代理](https://docs.docker.com/engine/cli/proxy/)、[Docker Desktop 设置](https://docs.docker.com/desktop/settings-and-maintenance/settings/)：服务、容器与 Desktop 代理的区别。
- [docker image pull](https://docs.docker.com/reference/cli/docker/image/pull/)、[docker image save](https://docs.docker.com/reference/cli/docker/image/save/)、[docker image load](https://docs.docker.com/reference/cli/docker/image/load/)：拉取参数、镜像导出与导入。
- [DaoCloud public-image-mirror](https://github.com/DaoCloud/public-image-mirror)：本篇演示使用的加速地址、前缀规则与服务限制。

系统安装与维护见 [DebNAS 安装及折腾记录](/posts/2026-10-09-debnas-installation-notes/)，应用部署文件集中在 [Compose 存档](/setup/compose/)。

[ugreen-docker-mirrors]: https://support.ugnas.com/knowledgecenter/#/detail/eyJpZCI6ODkzLCJ0eXBlIjoidGFnMDAyIiwibGFuZ3VhZ2UiOiJ6aC1DTiIsImNsaWVudFR5cGUiOiJQQyIsImFydGljbGVJbmZvSWQiOjI5NywiYXJ0aWNsZVZlcnNpb24iOiIiLCJwYXRoQ29kZSI6IiJ9
