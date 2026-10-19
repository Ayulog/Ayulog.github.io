---
title: MoviePilot：从部署到订阅、整理与进阶配置
description: 部署 MoviePilot V3，跑通站点、下载器与整理，再接插件、PostgreSQL 和企业微信通知。
author: Ayulog
pubDatetime: "2026-10-10T10:00:00+08:00"
draft: false
category: library
tags:
  - MoviePilot
  - Docker
---

从站点搜索到媒体库入库，搜索、订阅、下载下发、文件整理和媒体库刷新都可以由 [MoviePilot](https://github.com/jxxghp/MoviePilot) 串起来。实际下载和做种仍由下载器负责，播放则交给 [Emby](/posts/emby-guide/)、[Jellyfin](/posts/jellyfin-guide/) 或 [Plex](/posts/plex-guide/)。

MoviePilot V3 的初始化方式、配置入口和插件兼容范围与 V1 / V2 不同。软件入口见 [NAS 服务清单](/posts/nas-software-websites/)。

## 观影流程与职责分工

本地媒体库的自动观影流程通常分为以下几步：

```text
站点与媒体信息 → MoviePilot 搜索、订阅
                        ↓
              qBittorrent / Transmission 下载
                        ↓
              MoviePilot 识别、命名、整理
                        ↓
                Emby / Jellyfin / Plex 入库
                        ↓
                    播放器观看

MoviePilot → 通知渠道 → 下载、入库与运行消息
```

各组件的分工需要提前明确：

- **MoviePilot**：管理搜索、订阅和文件整理。
- **CookieCloud**：同步受支持站点的浏览器 Cookie，供站点登录使用。
- **下载器与媒体库**：qBittorrent / Transmission 负责下载与保种，Emby / Jellyfin / Plex 负责入库刮削与播放。
- **网盘与 STRM 工具**：若同时使用 CMS、115 或 CloudDrive2，同一批文件只交给一个工具改名和移动（例如由 MoviePilot 整理目录，CMS 仅同步成品目录并生成 STRM）。完整配合方式见[《DebNAS 自动观影流程》](/posts/debnas-media-workflow/)。

初次部署建议只连接一个下载器、一个来源目录和一个媒体库目标，先跑通单次下载与入库，再逐步接入插件和通知。

## Docker Compose 部署

以下配置适用于已安装 Docker Compose V2 的 Linux NAS（如 Debian、DebNAS 等）。使用 NAS 图形界面的“项目”或“编排”功能时，将宿主机路径替换为设备上的实际路径即可。

### 规划配置与媒体目录

将应用配置与媒体文件分开存放，并把下载目录与媒体库放在同一个数据根目录下：

```text
应用目录/
└── moviepilot/
    ├── compose.yaml
    ├── .env
    └── config/

数据根目录/
├── downloads/
└── library/
    ├── movies/
    └── tv/
```

目录挂载需满足两个条件：

- **统一容器内路径**：下载器与 MoviePilot 都把同一数据根目录映射为 `/data`。下载器写入 `/data/downloads`，MoviePilot 从相同位置读取并整理到 `/data/library`。
- **同盘硬链接**：使用硬链接整理保种时，来源和目标必须位于同一文件系统，并通过同一个父目录挂载进容器；跨盘分别挂载无法创建硬链接。

### 编写配置文件

1. 创建项目与配置目录：

   ```bash
   mkdir -p moviepilot/config
   cd moviepilot
   ```

2. 创建 `.env` 文件，填入运行服务的 Linux 用户 UID / GID（可通过 `id` 命令查询）以及宿主机数据根目录的实际路径：

   ```dotenv
   PUID=1000
   PGID=1000
   MEDIA_ROOT=/path/to/data
   ```

   确保该用户对配置目录、下载目录和媒体库均有读写权限。

3. 创建 `compose.yaml`：

   ```yaml
   services:
     moviepilot:
       image: jxxghp/moviepilot-v3:latest
       restart: unless-stopped
       stop_grace_period: 120s
       ports:
         - "3000:3000"
       volumes:
         - ./config:/config
         - ${MEDIA_ROOT:?Set MEDIA_ROOT in .env}:/data
       environment:
         NGINX_PORT: "3000"
         PORT: "3001"
         PUID: ${PUID:?Set PUID in .env}
         PGID: ${PGID:?Set PGID in .env}
         TZ: Asia/Shanghai
   ```

配置要点说明：

- **端口映射**：V3 容器内由 Nginx 在 `3000` 端口提供网页，并将 `/api` 请求转发给 `3001` 后端；日常通过网页访问只需映射 `3000`。若宿主机 `3000` 端口被占用，可改为 `"3002:3000"`。
- **持久化目录**：`/config` 保存配置、内置 SQLite 数据库及浏览器缓存（V3 默认将新安装的浏览器缓存放在 `/config/.browser/cloakbrowser`）。若从旧版迁移且原先单独挂载了 `/moviepilot/.cloakbrowser`，可保留原有挂载。
- **进程管理**：V3 内建重启由容器内 supervisor 处理，无需挂载 Docker Socket；`stop_grace_period: 120s` 用于给后台任务和插件预留退出时间。

### 启动与首次初始化

在项目目录执行以下命令检查配置并启动服务：

```bash
docker compose config
docker compose up -d
docker compose ps
docker compose logs --tail=100 moviepilot
```

浏览器访问 `http://NAS_IP:3000`（将 `NAS_IP` 换成 NAS 局域网地址）。V3 全新安装会直接进入初始化页面，按提示创建管理员账号、设置密码并保存生成的 API Key，随后登录管理界面。

### 环境变量与网页设置优先级

MoviePilot 的配置生效顺序为：**容器环境变量 > `app.env` / 网页设置**。维护配置时注意以下几点：

- **变量注入方式**：Compose 同目录的 `.env` 仅用于替换 `compose.yaml` 中的变量，只有写入 `environment` 或显式声明 `env_file` 的参数才会传入容器。
- **避免覆盖冲突**：日常参数优先在网页界面修改，Compose 中仅保留端口、权限和数据库连接等固定项。若已在 `environment` 中写入了 `PROXY_HOST`，在网页修改代理不会覆盖该值，需修改或移除 Compose 中的同名变量并执行 `docker compose up -d` 重建容器。
- **网络代理配置**：MoviePilot 访问 TMDB、站点、GitHub 和安装插件依赖时需要稳定的网络连通性。本文采用桥接网络，容器内的 `127.0.0.1` 指向容器自身；若代理运行在 NAS 的 `7890` 端口，代理地址应填 `http://NAS_IP:7890` 并开启代理的局域网连接允许。代理部署可参考[《Mihomo Docker 部署》](/posts/mihomo-docker/)。

## 站点、下载器与基础整理

### 用户认证与站点接入

1. 按官方[配置说明](https://github.com/jxxghp/MoviePilot-Wiki/blob/main/configuration.md)完成 MoviePilot 用户认证。官方[站点说明](https://github.com/jxxghp/MoviePilot-Wiki/blob/main/site.md)要求通过用户认证后才能维护和使用站点。
2. 添加站点登录信息。可手动填写 Cookie，也可接入 CookieCloud 自动同步：确保浏览器插件与 MoviePilot 填写相同的服务端地址、UUID 和加密密码，先在浏览器上传，再在 MoviePilot 手动同步并执行站点连接测试。

若搜索无结果，依次核对 MoviePilot 认证状态、CookieCloud 同步记录、站点连通性以及当前的识别与过滤条件。

### 连接下载器

在下载器设置中填写 qBittorrent 或 Transmission 的连接地址与账号。地址需从 **MoviePilot 容器视角**填写：

| 部署关系                           | 地址示例                  | 前提                                     |
| ---------------------------------- | ------------------------- | ---------------------------------------- |
| 通过 NAS 映射端口访问 qBittorrent  | `http://NAS_IP:8080`      | 该端口已映射到下载器 WebUI               |
| 通过 NAS 映射端口访问 Transmission | `http://NAS_IP:9091`      | RPC / Web 服务已开启并允许访问           |
| 与 qBittorrent 共用 Docker 网络    | `http://qbittorrent:8080` | 两个容器加入同一自定义网络，服务名可解析 |

不同 Compose 项目默认位于各自独立的网络，未共用网络时直接填写 `http://NAS_IP:实际端口`。

连接测试通过后，核对两端的下载目录路径。若下载器报告路径为 `/downloads/movie`，而 MoviePilot 挂载路径为 `/data/downloads/movie`，会导致下载完成后找不到文件。优先将两端的容器内挂载路径统一为 `/data/downloads`；无法改动旧目录时，再配置路径映射。

### 整理设置与媒体库刷新

配置下载目录、媒体库目标目录及整理方式。需要继续做种时优先选择硬链接或复制：

| 整理方式 | 适用情况                             | 注意事项                                         |
| -------- | ------------------------------------ | ------------------------------------------------ |
| 硬链接   | 本地同一文件系统，兼顾保种与节省空间 | 文件名可不同，但底层数据共享，不要直接修改源文件 |
| 复制     | 跨文件系统，或需要将目标文件独立保存 | 占用双倍空间；写入网盘挂载目录时需确认上传完成   |
| 移动     | 明确不再保留原路径文件               | 会使原路径文件消失，做种任务会丢失数据           |

随后连接 Emby、Jellyfin 或 Plex，确认媒体服务器能读取整理后的目标目录。若媒体服务器与 MoviePilot 的容器内路径不同，需在媒体服务器集成设置中配好路径对应关系，以保证入库刷新通知生效。

配置完成后，用一个测试任务完整验证：下载完成 → MoviePilot 识别整理 → 原任务正常做种 → 媒体库刷新并可正常播放。

## 整理目录、命名与覆盖策略

### 目录分工与自动整理入口

除了下载器的保种目录，还可以在 `/data` 下新建 `incoming` 目录，用于存放其他渠道获取、已完整写入的手动文件：

| 来源                                | 自动整理入口                 | 整理目标         | 建议方式                           |
| ----------------------------------- | ---------------------------- | ---------------- | ---------------------------------- |
| `/data/downloads` 中需要保种的任务  | 下载器监控                   | `/data/library`  | 同一文件系统用硬链接，跨盘用复制   |
| `/data/incoming` 中已完成的手动文件 | 手动整理，验证后再开目录监控 | `/data/library`  | 先复制验证，无需保留原文件时用移动 |
| 准备上传网盘的本地文件              | 选定的本地来源或下载任务     | 已配置的云端目录 | 复制，并核对远端上传结果           |

配置目录项时注意三点：

- **单一监控入口**：同一来源目录只启用一种自动整理方式，避免下载器监控、目录监控和插件同时抢占处理。
- **避开临时目录与网盘挂载**：不要监控正在写入的下载临时目录；网盘挂载目录也不宜开启本地实时监控，以免频繁扫描触发接口限流。
- **避免目录层级重复**：若已在目录路径中指定了 `movies` 或 `tv`，需检查“按类型分类”“按类别分类”开关，避免生成 `movies/电影/电影/...` 的重复子目录。

### 自定义重命名模板

默认命名模板即可满足媒体服务器识别需求。若希望在文件名中保留分辨率、制作组等字段，可参照官方[自定义重命名说明](https://github.com/jxxghp/MoviePilot-Wiki/blob/main/advanced.md)调整。

电影重命名模板示例（保留年份、分段标识、分辨率和制作组，未识别字段自动省略）：

```text
{{title}}{% if year %} ({{year}}){% endif %}/{{title}}{% if year %} ({{year}}){% endif %}{% if part %}-{{part}}{% endif %}{% if videoFormat %} - {{videoFormat}}{% endif %}{% if releaseGroup %} - {{releaseGroup}}{% endif %}{{fileExt}}
```

剧集重命名模板示例（保留季目录、季集号与制作组）：

```text
{{title}}{% if year %} ({{year}}){% endif %}/Season {{season}}/{{title}} - {{season_episode}}{% if part %}-{{part}}{% endif %}{% if releaseGroup %} - {{releaseGroup}}{% endif %}{{fileExt}}
```

修改模板后，可在“重命名测试”或整理预览中分别检查普通电影、分段电影、单集和特别篇的输出效果。注意：

- `releaseGroup` 等变量仅输出已识别到的字段；若片名或制作组识别有误，需先通过识别词修正识别结果。
- 修改重命名模板只对后续整理生效，不会自动重命名媒体库中已有的文件。

### 覆盖策略

| 覆盖方式       | 处理结果                                               |
| -------------- | ------------------------------------------------------ |
| 从不覆盖       | 遇到同名且同扩展名的目标文件时中止本次整理             |
| 按大小覆盖     | 同名文件中，仅当新文件体积更大时才覆盖                 |
| 总是覆盖       | 直接覆盖媒体库中的同名文件                             |
| 仅保留最新版本 | 删除同一电影或剧集的其他版本（即使文件名不同也会清理） |

初期建议设为“从不覆盖”，遇到冲突时在整理历史中人工确认。后续开启洗版订阅时，再结合文件名是否带版本后缀，选择保留多版本或“仅保留最新版本”。

## 二级分类与订阅优先级

### 四类规则的作用

参照磕巴白菜的[规则分享](https://hi.keba.host/archives/MOVIEPILOT-Rules)，多国别分类与官组优先洗版涉及四项独立配置：

| 配置         | 决定内容                     | 示例                                   |
| ------------ | ---------------------------- | -------------------------------------- |
| 二级分类     | 媒体归属的子目录类别         | 动画电影、华语电影、纪录片、国产剧     |
| 自定义规则   | 单个资源是否满足特定条件     | 标题是否含指定制作组、体积是否在范围内 |
| 优先级规则组 | 过滤条件及候选资源的档位顺序 | 指定组 1080p 优先，其次其他 1080p      |
| 下载排序     | 多个合格资源之间的排序依据   | 优先级、站点、做种人数的先后顺序       |

二级分类依据 TMDB 等媒体元数据判断（同一部电影的 1080p 和 4K 属于同一分类）；自定义规则建好后需加入优先级规则组，并将规则组关联到搜索或订阅才会生效。

### 二级分类设置

V3 在 **设定 → 存储 & 目录 → 自动分类策略** 中直接通过界面维护分类（详见官方[进阶文档](https://github.com/jxxghp/MoviePilot-Wiki/blob/main/advanced.md)）。

分类规则按从上到下的顺序匹配，**命中第一条即停止**。因此需要把范围更具体或优先级更高的类型排在前面（例如把“动画电影”排在“华语电影”之前，否则中文动画会先落入华语电影）。建议从精简的分类顺序开始：

| 媒体类型 | 匹配顺序示例（从前到后）                 |
| -------- | ---------------------------------------- |
| 电影     | 动画电影 → 华语电影 → 其他电影           |
| 电视剧   | 动画 → 纪录片 → 综艺 → 国产剧 → 其他剧集 |

在末尾保留兜底类别。新建规则默认处于停用状态，确认分类名称与“存储 & 目录”及规则组中的名称完全一致后，再启用并保存。修改分类策略不会自动迁移已有文件。

### 编写自定义规则与优先级规则组

规则组表达式常用符号如下：

| 符号 | 含义                   | 示例                         |
| ---- | ---------------------- | ---------------------------- |
| `&`  | 同时满足               | `1080P & WEBDL`              |
| `\|` | 至少满足一个           | `1080P \| 4K`                |
| `!`  | 排除该条件             | `!3D`                        |
| `>`  | 左侧优先，逐档向右回退 | `1080P & WEBDL > 4K & WEBDL` |

`>` 表示优先级档位顺序：资源命中最左侧的哪一档就获得对应优先级，未命中任何一档则被过滤（如内置 `WEBDL` 匹配 WEB-DL 和 WEBRip，上例会过滤其他片源）。

以“优先选择指定制作组”为例，配置步骤如下：

1. **新建自定义规则**：

   ```text
   标识符：PreferGroup
   名称：偏好的制作组
   包含：(?<![A-Za-z0-9])(?:GroupA|GroupB)(?![A-Za-z0-9])
   排除：留空
   ```

   将 `GroupA`、`GroupB` 替换为实际偏好的组名（含 `.`、`+` 等正则特殊字符时需转义），标识符使用不带空格的字母组合。

2. **在规则组中引用**：

   ```text
   1080P & WEBDL & PreferGroup > 1080P & WEBDL > 4K & WEBDL
   ```

   该表达式依次偏好指定组 1080p、其他组 1080p、最后回退到 4K；若只允许下载指定组，则在每一档中都加上 `& PreferGroup`。

组合使用多个规则组时注意：

- **叠加过滤与顺序**：同时选用多个规则组时，资源必须通过所有规则组；且后执行的规则组会覆盖前面的优先级档位。若单独建立排除规则组（如 `!3D & !BLU`），应将其排在偏好规则组**之前**，防止单档过滤组排在末尾抹平前面的优先级差异。
- **下载排序配合**：在下载排序设置中将“优先级”排在期望的位置，否则排在前面的站点权重或做种人数会优先决定下载结果。

### 常用规则条件与洗版订阅

制作组名单、AV1 / OPUS 排除项、杜比视界限制应根据自己的站点与播放设备调整。配置内置条件时注意以下细节：

- `FREE`：依据站点接口返回的下载计费因子判断免费，而非匹配标题文字。采用站点 RSS 模式时可能无法获取促销或做种人数信息，下载前仍需留意站点的 H&R 与保种规则。
- `DOLBY` 与 `ATMOS`：`DOLBY` 指杜比视界（Dolby Vision），`ATMOS` 指杜比全景声。
- `size_range`：自定义体积区间单位为 MB；剧集按识别到的集数折算单集体积，未识别集数时按整包计算。
- `CNSUB`：依据资源信息判断中文字幕，原始语言为中文的媒体也可能直接通过。

关于**洗版订阅**（详见官方[订阅说明](https://github.com/jxxghp/MoviePilot-Wiki/blob/main/subscribe.md)）：

- 普通订阅在下载缺失内容后即完成；开启洗版后，系统会保留订阅并在出现更高优先级资源时继续下载，直至达到最高优先级档位。
- 剧集洗版仅支持已完结剧集，日常追更与完结洗版建议分开配置。
- 启用前先选一部电影和一部剧集测试搜索结果的命中档位，并同步核对整理设置中的文件覆盖策略。

## 插件市场与常用插件

### 插件市场配置

打开 **插件 → 插件市场设置**，首先保留官方 V3 插件仓库：

```text
https://github.com/jxxghp/MoviePilot-Plugins
```

添加与维护插件时的注意事项：

- **第三方仓库格式**：多个仓库在 `PLUGIN_MARKET` 中以英文逗号分隔，当前官方市场要求使用 GitHub 仓库的 `main` 分支。V3 支持从 Wiki 同步公开仓库清单，按需勾选即可。
- **版本兼容性**：V2 插件能否在 V3 运行，取决于插件是否调用了已变更的接口以及作者是否发布了 V3 适配版。
- **GitHub API 限流**：插件安装需请求 GitHub 并拉取依赖。若遇 API 限流，可在基础设置中填入个人 `GITHUB_TOKEN` 提升请求额度。

### 常用插件与配置要点

V3 已内建目录监控、站点数据统计等功能，先确认系统自带功能是否满足需求，再按需补充插件：

| 需求                     | 对应功能或插件                    | 配置要点                                                     |
| ------------------------ | --------------------------------- | ------------------------------------------------------------ |
| 纠正季号、标题和特殊命名 | 自定义识别词、共享识别词          | 先用出错的文件名测试；远程共享词表更新后留意季号变化         |
| 补齐海报与 NFO           | 整理刮削设置、媒体库刮削类插件    | 保持单一工具刮削，避免多个工具反复覆盖元数据                 |
| 入库后及时刷新海报墙     | 媒体服务器刷新类插件              | 核对服务器地址、API 密钥和容器路径对应关系                   |
| 根据想看列表添加订阅     | 豆瓣想看、榜单订阅类插件          | 核对账号可见性、过滤规则和订阅范围                           |
| 自动打标签或清理任务     | 下载器助手                        | 先只开标签等只读/非破坏性功能，谨慎核对删种删文件条件        |
| 增加或迁移做种任务       | IYUU 自动辅种、自动转移做种类插件 | 核对下载器版本、数据路径，并额外挂载实际 `.torrent` 备份目录 |

启用自动删种、任务转移等会修改或删除文件的插件时，一次只增加一个自动任务。注意插件界面中“立即运行一次”等单次触发开关（主开关关闭时单次任务仍可能执行），先在少量测试任务上验证日志无误后再放开范围。

## 企业微信通知与回调配置

MoviePilot 支持接入**企业微信自建应用**（通过企业微信后台“微信插件”绑定后，可直接在普通微信中收发消息；与群机器人 Webhook 属于不同机制）。

企业微信集成包含收发两条独立链路：

```text
发送通知（出站）：MoviePilot → 企业微信 API（可经固定出口代理）→ 微信 / 企业微信
接收指令（入站）：微信 / 企业微信 → 企业微信服务器 → 公网 HTTPS 回调 → MoviePilot
```

| 配置项         | 作用                                     | 核心要求                                      |
| -------------- | ---------------------------------------- | --------------------------------------------- |
| 应用可信 IP    | 允许调用企业微信 API 的公网出口白名单    | 填写 API 请求最终发出的公网 IP                |
| 消息推送代理   | 为动态家宽提供固定公网出口               | 代理 HTTPS 正常，且代理出口 IP 已填入可信 IP  |
| 接收消息 URL   | 企业微信向 MoviePilot 推送指令与菜单回调 | 必须可通过公网 HTTPS 访问 MoviePilot 消息接口 |
| frp 等穿透工具 | 无公网 IP 时将外部回调转入内网 NAS       | 仅解决入站回调，不改变出站 API 出口 IP        |

若只需接收下载与入库通知，配好发送链路即可；需要在微信聊天框内发送搜索指令或点击交互菜单时，再配置接收消息回调。

### 创建自建应用并填写凭据

1. 登录[企业微信管理后台](https://work.weixin.qq.com/)，创建自建应用，并将需要接收消息的成员加入应用可见范围。
2. 在 MoviePilot 的 **设定 → 通知** 中新增微信渠道，设置英文标识名称（例如 `wechat_main`），对照下表填入凭据：

| MoviePilot 配置项     | 企业微信后台获取位置    | 用途说明                            |
| --------------------- | ----------------------- | ----------------------------------- |
| 企业 ID（CorpID）     | 我的企业 → 企业信息     | 标识所属企业                        |
| 应用 ID（AgentId）    | 应用管理 → 对应自建应用 | 标识具体自建应用                    |
| 应用密钥（Secret）    | 同一自建应用的 Secret   | 调用企业微信发送消息 API            |
| 默认接收人 / 管理员   | 企业通讯录 → 成员账号   | 填通讯录中的成员 ID，不要填微信昵称 |
| Token、EncodingAESKey | 自建应用 → 接收消息设置 | 用于后续验证和解密企业微信回调消息  |

若希望在普通微信中接收通知，可在企业微信后台打开 **我的企业 → 微信插件**，扫码关注并确认成员已关联。

### 可信 IP 与消息推送代理

企业微信要求将调用 API 的公网出口 IP 加入自建应用的“企业可信 IP”：

- **家庭宽带直连**：直接填写家庭宽带当前的公网出口 IP。若公网 IP 动态变化，可配合支持动态更新可信 IP 的插件维护白名单。
- **使用 VPS 固定出口代理**：家庭宽带处于运营商 NAT 下或频繁变 IP 时，可在具备固定公网 IP 的自有 VPS 上配置 HTTPS 反向代理转发企业微信接口（官方[通知说明](https://github.com/jxxghp/MoviePilot-Wiki/blob/main/notification.md)提供了 Nginx 配置与 [wxchat-Docker](https://github.com/DDS-Derek/wxchat-Docker) 方案）。

在已有 HTTPS 站点的 Nginx `server` 块中加入以下转发片段：

```nginx
location /cgi-bin/gettoken {
    proxy_pass https://qyapi.weixin.qq.com;
    proxy_ssl_server_name on;
    proxy_ssl_name qyapi.weixin.qq.com;
    proxy_set_header Host qyapi.weixin.qq.com;
}

location /cgi-bin/message/send {
    proxy_pass https://qyapi.weixin.qq.com;
    proxy_ssl_server_name on;
    proxy_ssl_name qyapi.weixin.qq.com;
    proxy_set_header Host qyapi.weixin.qq.com;
}

location /cgi-bin/menu/create {
    proxy_pass https://qyapi.weixin.qq.com;
    proxy_ssl_server_name on;
    proxy_ssl_name qyapi.weixin.qq.com;
    proxy_set_header Host qyapi.weixin.qq.com;
}
```

随后在 MoviePilot 的**消息推送代理**中填入代理根地址（如 `https://wxproxy.example.com`），并将 VPS 的公网 IP 填入企业微信“企业可信 IP”。消息代理会经手 Secret 与访问令牌，请仅使用自己控制的服务器。

保存并启用通知渠道后，先点击测试按钮验证单向消息发送正常，再继续配置回调。

### 配置消息回调与内网穿透

1. **生成并保存回调凭据**：在企业微信自建应用的“接收消息 → 设置 API 接收”页面随机生成 `Token` 和 `EncodingAESKey`，先复制到 MoviePilot 通知渠道中保存并启用。
2. **准备公网 HTTPS 入口**：
   - **有公网域名与反向代理**：将外部 HTTPS 请求转发到 NAS 上 MoviePilot 的 `3000` 端口（已包含 `/api` 转发，无需额外暴露 `3001`），保留完整的路径、查询参数与请求体，且不要对该接口附加网页表单登录或验证码拦截。
   - **无公网入口（使用 frp 穿透）**：按照 [frp 官方文档](https://gofrp.org/zh-cn/docs/)在自有 VPS 与 NAS 之间建立隧道，由 VPS 的 HTTPS 反向代理接收企业微信请求并转入 NAS 的 `3000` 端口（Tailscale 等纯私有组网无法供企业微信服务器直接回调）：

     ```text
     企业微信服务器 → VPS HTTPS 域名与反向代理 → frp 隧道 → NAS MoviePilot (3000)
     ```

3. **填写接收消息 URL**：回到企业微信后台填入回调地址并点击保存：

   ```text
   https://mp.example.com/api/v1/message/?token=YOUR_MOVIEPILOT_API_TOKEN&source=wechat_main
   ```

   替换其中的三个参数：
   - `mp.example.com`：公网可达的 MoviePilot HTTPS 域名。
   - `YOUR_MOVIEPILOT_API_TOKEN`：MoviePilot 初始化时生成的 **API Key**（在基础设置中查看，参数名固定为 `token`，非企业微信的回调 Token）。
   - `wechat_main`：MoviePilot 中该通知渠道的实际名称。

回调校验通过后，在微信应用内发送一条测试指令，核对日志接收状态、消息回复及菜单生成。

## 按需切换 PostgreSQL

前面的单容器配置默认使用内置 SQLite，足以应付常规家庭媒体库。若存在高并发访问、数据库锁竞争或独立运维需求，可改用 PostgreSQL（注意：站点搜索慢或刮削超时通常由网络引起，更换数据库不会改善网络连通性；且切换数据库不要与 V2 升级 V3 同时混做）。

### 新安装接入 PostgreSQL

以下配置适用于**全新部署**（固定使用 PostgreSQL 17）。先在项目 `.env` 中新增一行数据库密码：

```dotenv
MP_DB_PASSWORD=your_strong_random_password
```

再将 PostgreSQL 服务与数据库连接变量合并到原有的 `compose.yaml` 中：

```yaml
services:
  moviepilot:
    # 保留原有的 image、ports、volumes 等配置，补充以下段落
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      # 与原有的 NGINX_PORT、PORT、PUID、PGID、TZ 合并到同一个 environment 下
      DB_TYPE: postgresql
      DB_POSTGRESQL_HOST: postgres
      DB_POSTGRESQL_PORT: "5432"
      DB_POSTGRESQL_DATABASE: moviepilot
      DB_POSTGRESQL_USERNAME: moviepilot
      DB_POSTGRESQL_PASSWORD: ${MP_DB_PASSWORD:?Set MP_DB_PASSWORD in .env}

  postgres:
    image: postgres:17
    restart: unless-stopped
    environment:
      POSTGRES_DB: moviepilot
      POSTGRES_USER: moviepilot
      POSTGRES_PASSWORD: ${MP_DB_PASSWORD:?Set MP_DB_PASSWORD in .env}
    volumes:
      - moviepilot_pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U moviepilot -d moviepilot"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s

volumes:
  moviepilot_pgdata:
```

执行 `docker compose config` 检查无误后启动服务。配置说明：

- **内部连接**：同一 Compose 网络中直接通过服务名 `postgres` 和端口 `5432` 访问，无需向宿主机暴露数据库端口。
- **保留 `/config` 挂载**：应用配置、插件与缓存仍存放在 `/config` 目录中。
- **版本与初始化限制**：`POSTGRES_*` 变量仅在数据卷为空、首次初始化建库时生效，后续修改 `.env` 不会自动更改已有数据库的密码；PostgreSQL 18+ 官方镜像调整了数据目录结构，升级数据库大版本前需单独备份迁移。

### 已有 SQLite 数据迁移流程

直接将 `DB_TYPE` 改为 `postgresql` 只会初始化一个空数据库，不会自动导入原有 SQLite（`user.db`）中的数据。已有数据的实例需按以下步骤迁移（可参考磕巴白菜的[《从 SQLite 切换到 PostgreSQL》](https://hi.keba.host/archives/PostgreSQL)及官方 [V3 数据库说明](https://github.com/jxxghp/MoviePilot/blob/v3/docs/postgresql-setup.md)）：

1. **停机备份**：记录当前 MoviePilot 版本，暂停所有订阅、整理与插件任务，停止容器后完整备份 `/config`、`compose.yaml` 和 `.env`。
2. **初始化目标库表结构**：在测试环境中启动相同版本的 MoviePilot 连接空白 PostgreSQL，由程序自动建好匹配当前版本的表结构。
3. **导入数据并核验**：使用 `pgloader` 等工具将 SQLite 数据导入已建好表的 PostgreSQL，核对主外键、序列及 `alembic_version` 迁移记录（不要盲目套用旧版本的固定建表 SQL 或强行修改版本号）。
4. **全面验收**：对照原库检查用户、站点、下载器、订阅规则及历史记录数量，测试一次搜索、下载整理和通知发送，确认无误后再正式切换。

### PostgreSQL 逻辑备份

使用外部 PostgreSQL 时，建议先停止 MoviePilot 以对齐 `/config` 与数据库状态，再用 `pg_dump` 导出逻辑备份：

```bash
docker compose stop moviepilot
backup_dir="backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$backup_dir"
docker compose exec -T postgres pg_dump -U moviepilot -d moviepilot -Fc > "$backup_dir/moviepilot.dump"
# 同步备份 ./config、compose.yaml 和 .env
docker compose start moviepilot
```

注意不要使用 `docker compose down -v` 重启服务，`-v` 参数会直接删除声明的数据库命名卷。

## 更新、备份与日常检查

日常更新前，先停止容器并备份 `compose.yaml`、`.env`、`/config`（含 SQLite 数据库）或 PostgreSQL 导出文件，随后在项目目录拉取新镜像并重建容器：

```bash
docker compose pull
docker compose up -d
docker compose logs --tail=100 moviepilot
```

更新后依次检查站点连通性、下载器状态、单次整理和通知推送。若从 V2 升级到 V3，请先阅读官方[升级说明](https://github.com/jxxghp/MoviePilot-Wiki/blob/main/upgrade.md)：V3 升级后的数据库无法直接降级回 V2 镜像，回退必须使用升级前的完整备份。

## 常见问题

| 现象                               | 优先检查                                                                     |
| ---------------------------------- | ---------------------------------------------------------------------------- |
| 网页打不开或一直初始化             | 端口是否冲突、`/config` 目录权限、容器运行状态与启动日志                     |
| CookieCloud 同步成功，但站点不能用 | MoviePilot 用户认证是否通过、站点 Cookie 是否有效、容器网络连通性            |
| 下载完成后找不到文件               | 下载器报告路径与 MoviePilot 容器内路径是否一致，挂载是否指向同一目录         |
| 硬链接失败                         | 来源与目标是否跨文件系统、是否分开挂载、运行用户权限是否充足                 |
| 网页改了设置却没有生效             | `compose.yaml` 的 `environment` 是否注入了同名变量，修改后是否重建容器       |
| 搜索有资源，订阅却一直不下载       | 规则组是否已关联、适用分类是否匹配、多个规则组叠加是否冲突，查看日志过滤原因 |
| 修改分类后，旧文件仍在原目录       | 分类策略仅对后续整理生效，重新整理已有文件前先预览目标路径                   |
| 换成 PostgreSQL 后像全新安装       | 是否仅修改了连接参数而未迁移原 SQLite 数据，或连接到了空库                   |
| PostgreSQL 已健康，应用仍连不上    | 检查服务名、库名与密码；注意修改 `.env` 不会更新非空数据卷的已有数据库密码   |
| 插件市场加载失败或安装无法运行     | GitHub 网络连通性、`GITHUB_TOKEN` 限流配置，以及插件是否已适配 V3 接口       |
| 微信提示 IP 不可信                 | 核对请求企业微信 API 的实际公网出口 IP 是否已加入应用“企业可信 IP”           |
| 微信收得到通知，保存回调失败       | 公网 HTTPS 入口、路径、MoviePilot `API_TOKEN`、回调 Token 与 EncodingAESKey  |
| 回调通过，但发送指令无回复         | 通知渠道是否启用、`source` 名称是否匹配、成员白名单及出站发送链路            |
| 开了 frp 穿透，通知仍报 IP 错误    | frp 仅转发入站回调，不改变出站 API 出口，需单独配置消息推送代理或更新可信 IP |
| 刷新了媒体库却没有新内容           | 整理任务是否成功、媒体服务器能否读取目标目录、路径映射关系是否正确           |

## 参考资料

- 磕巴白菜：[《新绿联部署新版 MoviePilot-V2，实现全自动化订阅、整理、刮削与搜索下载》](https://hi.keba.host/archives/moviepilot-v2)、[《基于多国别/多类型的二级分类策略与官组优先洗版配置》](https://hi.keba.host/archives/MOVIEPILOT-Rules)、[《MoviePilot 进阶：从 SQLite 切换到 PostgreSQL》](https://hi.keba.host/archives/PostgreSQL)、[《MoviePilot企业微信推送教程》](https://hi.keba.host/archives/wxchat)、[《MoviePilot常用插件配置》](https://hi.keba.host/archives/plugins.v2)。
- [MoviePilot 项目](https://github.com/jxxghp/MoviePilot)、[官方安装说明](https://github.com/jxxghp/MoviePilot-Wiki/blob/main/install.md)、[配置说明](https://github.com/jxxghp/MoviePilot-Wiki/blob/main/configuration.md)与[站点说明](https://github.com/jxxghp/MoviePilot-Wiki/blob/main/site.md)。
- [V3 Docker 启动与数据目录](https://github.com/jxxghp/MoviePilot/blob/v3/docs/docker-startup.md)、[文件整理说明](https://github.com/jxxghp/MoviePilot-Wiki/blob/main/reorganize.md)与[升级说明](https://github.com/jxxghp/MoviePilot-Wiki/blob/main/upgrade.md)。
- [官方进阶说明](https://github.com/jxxghp/MoviePilot-Wiki/blob/main/advanced.md)、[订阅说明](https://github.com/jxxghp/MoviePilot-Wiki/blob/main/subscribe.md)、[V3 规则解析](https://github.com/jxxghp/MoviePilot/blob/v3/app/application/rules.py)与[资源过滤实现](https://github.com/jxxghp/MoviePilot/blob/v3/app/modules/filter/__init__.py)。
- [V3 PostgreSQL 说明](https://github.com/jxxghp/MoviePilot/blob/v3/docs/postgresql-setup.md)、[数据库配置源码](https://github.com/jxxghp/MoviePilot/blob/v3/app/runtime/config.py)、[数据库初始化实现](https://github.com/jxxghp/MoviePilot/blob/v3/app/startup/initializers/database.py)与[PostgreSQL 官方镜像说明](https://github.com/docker-library/docs/blob/master/postgres/README.md)。
- [官方插件说明](https://github.com/jxxghp/MoviePilot-Wiki/blob/main/plugin.md)、[官方插件库](https://github.com/jxxghp/MoviePilot-Plugins)与[V2 插件迁移到 V3](https://github.com/jxxghp/MoviePilot-Plugins/blob/main/docs/V3_Plugin_Adaptation.md)。
- [V3 消息回调实现](https://github.com/jxxghp/MoviePilot/blob/v3/app/api/endpoints/message.py)、[接口鉴权实现](https://github.com/jxxghp/MoviePilot/blob/v3/app/adapters/web/security/access.py)、[官方通知说明](https://github.com/jxxghp/MoviePilot-Wiki/blob/main/notification.md)、[wxchat-Docker](https://github.com/DDS-Derek/wxchat-Docker)与[frp 官方文档](https://gofrp.org/zh-cn/docs/)。
