---
title: MoviePilot：从部署到订阅、整理与进阶配置
description: 以 MoviePilot V3 为基础，整理 Docker Compose 部署、目录与命名、二级分类和订阅优先级、PostgreSQL 数据库，以及常用插件和企业微信通知的配置思路。
author: Ayulog
pubDatetime: "2026-10-10T10:00:00+08:00"
draft: false
setupCategory: nas
tags:
  - MoviePilot
  - NAS
  - Docker
  - 自动观影
  - PostgreSQL
  - 企业微信
---

[MoviePilot](https://github.com/jxxghp/MoviePilot) 负责搜索、订阅、下发下载、整理文件和刷新媒体库。下载和做种仍由下载器负责，播放交给 [Emby](/posts/2026-10-10-emby-guide/)、[Jellyfin](/posts/2026-10-10-jellyfin-guide/) 或 [Plex](/posts/2026-10-10-plex-guide/)。

这里记录 V3 的 Docker 部署、目录与订阅规则，再补插件、PostgreSQL 和企业微信配置。参考资料中的 V1 / V2 参数不能直接混用。软件入口与各篇关系见 [NAS 总篇](/posts/2026-10-09-nas-software-websites/)。

## 目录

- [MoviePilot 在观影流程里负责什么](#moviepilot-在观影流程里负责什么)
- [先用 Docker Compose 部署](#先用-docker-compose-部署)
- [跑通站点、下载器与整理](#跑通站点下载器与整理)
- [整理目录、命名与覆盖策略](#整理目录命名与覆盖策略)
- [二级分类与订阅优先级](#二级分类与订阅优先级)
- [常用插件怎样选](#常用插件怎样选)
- [企业微信先分清两条连接](#企业微信先分清两条连接)
- [配置企业微信消息推送](#配置企业微信消息推送)
- [配置消息回调与无公网访问](#配置消息回调与无公网访问)
- [按需切换 PostgreSQL](#按需切换-postgresql)
- [更新、备份与日常检查](#更新备份与日常检查)
- [常见问题](#常见问题)
- [参考资料](#参考资料)

## MoviePilot 在观影流程里负责什么

可以先把本地媒体库流程分成下面几步：

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

MoviePilot 管理搜索、订阅和整理；下载与做种交给下载器，播放交给媒体服务器和播放器。CookieCloud 则负责提供受支持站点的 Cookie，不负责下载，也不能替代 MoviePilot 的用户认证。

已经有 CMS、115 或 CloudDrive2 时，先确定同一批文件由谁负责整理。比如让 MoviePilot 维护媒体名称和目录，CMS 只同步成品目录、生成 STRM，避免两边同时移动和改名。整体分工可参照本站的[《DebNAS 自动观影流程》](/posts/2026-10-09-debnas-media-workflow/)。

刚开始只选一个下载器、一个来源目录、一个媒体库目标，把一个任务完整跑通。插件和微信都可以在这个基础上继续加。

## 先用 Docker Compose 部署

下面适用于已经安装 Docker Compose V2 的 Linux NAS，例如 Debian、DebNAS 等环境。NAS 图形界面的“项目”或“编排”功能也可以使用同一份配置，但宿主机目录要换成设备上的实际路径。

### 规划配置与媒体目录

应用配置和媒体文件分开保存；下载目录与媒体库放在同一个数据根目录下面：

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

**下载器与 MoviePilot 都把同一数据根目录映射成 `/data`。** 下载器保存到 `/data/downloads`，MoviePilot 从相同位置读取，再整理到 `/data/library`。两边虽然都是 Docker 容器，但不会自动共享文件，必须分别添加这个挂载。

计划使用硬链接时，来源和目标还需要处于同一文件系统，并通过同一个父目录挂载进入容器。把两块盘分别放进一个表面相同的目录，并不能让它们跨文件系统建立硬链接。

### 创建配置文件

在计划存放应用配置的位置执行：

```bash
mkdir -p moviepilot/config
cd moviepilot
```

创建 `.env`：

```dotenv
PUID=1000
PGID=1000
MEDIA_ROOT=/path/to/data
```

`1000` 只是示例。用 `id` 查看计划运行服务的 Linux 用户 UID / GID，并确保它能读写配置目录、下载目录和媒体库。将 `/path/to/data` 换成前面准备好的宿主机数据根目录，不能原样使用占位路径。

创建 `compose.yaml`：

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

这是单容器基础方案，使用内置 SQLite 和缓存。当前 V3 的 Nginx 在 `3000` 提供网页，并将 `/api` 等请求转发给容器内的 `3001` 后端；本文通过网页入口访问，因此只发布 `3000`。需要单独直连后端时，再按实际用途添加端口映射。

`/config` 保存配置、数据库等数据。当前 V3 启动实现将新安装的浏览器缓存默认放在 `/config/.browser/cloakbrowser`，因此本例一起持久化。官方安装页也提供单独挂载 `/moviepilot/.cloakbrowser` 的写法；已有部署应保留原挂载，迁移时核对自己的版本和数据位置。

V3 内建重启由容器内 supervisor 处理，这份基础配置无需挂载 Docker Socket。`120s` 用于给后台任务和插件留出退出时间。

### 启动与首次初始化

```bash
docker compose config
docker compose up -d
docker compose ps
docker compose logs --tail=100 moviepilot
```

浏览器访问 `http://NAS_IP:3000`，把 `NAS_IP` 换成 NAS 的局域网地址。若宿主机 `3000` 已被占用，可以将端口映射改成 `"3002:3000"`，随后访问 `http://NAS_IP:3002`。

**V3 全新安装通过初始化页面创建管理员、设置密码并生成 API Key。** 按页面提示保存后再登录；不要套用旧教程中的默认账号密码。管理入口先在局域网中使用，远程访问和微信回调放到后面的步骤处理。

镜像拉取成功只代表容器镜像已下载。MoviePilot 运行后访问媒体信息、站点、GitHub 和插件依赖仍有各自的网络需求，Docker 镜像加速不会自动解决这些连接。

### 配置写在哪里，先保持一致

MoviePilot 的配置优先级是 **容器环境变量 > `app.env` / 网页设置**。前面 Compose 项目旁的 `.env` 只供 Compose 替换变量，写在里面的任意配置不会自动传进容器；需要在 `environment` 中引用，或显式使用 `env_file` 才会注入。

常用设置优先在网页中维护，Compose 保留启动、端口、权限和数据库连接等确实需要固定的配置。如果已经通过 `environment` 设置 `PROXY_HOST`，再到网页修改代理地址也不能覆盖它；应修改或移除 Compose 中的同名变量，再用 `docker compose up -d` 重建容器使其生效。

按需配置代理，并从容器内检查媒体信息、站点和 GitHub 的连通性。例如代理实际监听 NAS 的 `7890` 端口时，地址可以是 `http://NAS_IP:7890`，同时确认代理允许局域网访问。本文采用桥接网络，容器内的 `127.0.0.1` 只指向自身；旧教程的 `host` 网络写法不能与这里的地址和端口映射混用。代理部署可参照本站的[《Mihomo Docker 部署》](/posts/2026-10-09-mihomo-docker/)。

## 跑通站点、下载器与整理

### 用户认证与站点登录分开配置

按当前官方[配置说明](https://github.com/jxxghp/MoviePilot-Wiki/blob/main/configuration.md)完成 MoviePilot 用户认证，再添加自己能够访问的受支持站点。官方[站点说明](https://github.com/jxxghp/MoviePilot-Wiki/blob/main/site.md)明确要求通过用户认证后才能维护和使用站点。

站点登录信息可以手动配置，也可以让 CookieCloud 从浏览器同步。接入 CookieCloud 时，两端使用同一份服务端数据、UUID 与加密密码；先在浏览器完成上传，再让 MoviePilot 手动同步，最后测试站点连接。

“MoviePilot 已认证”“CookieCloud 同步成功”“站点登录有效”是三件事。搜索无结果时，先确认站点可达、登录有效，以及媒体识别和筛选条件是否正常。

### 连接一个下载器

在下载器连接设置中填写 qBittorrent 或 Transmission 的实际地址与账号。地址从 **MoviePilot 容器的视角**判断：

| 部署关系                           | 地址示例                  | 前提                                 |
| ---------------------------------- | ------------------------- | ------------------------------------ |
| 通过 NAS 映射端口访问 qBittorrent  | `http://NAS_IP:8080`      | 该端口确实映射到下载器 WebUI         |
| 通过 NAS 映射端口访问 Transmission | `http://NAS_IP:9091`      | RPC / Web 服务已开启并允许访问       |
| 与 qBittorrent 共用 Docker 网络    | `http://qbittorrent:8080` | 两个容器加入同一个网络，服务名可解析 |

端口以下载器自己的配置为准。分开运行两份 Compose，默认会各自创建网络；本文的 MoviePilot 示例没有自动加入下载器网络。容器里的 `127.0.0.1` 也不会指向 NAS 上的其他容器。

连接测试通过后，再确认下载目录。若下载器报告 `/downloads/movie`，MoviePilot 只看到 `/data/downloads/movie`，就会出现下载完成却找不到文件的情况。优先统一两端的挂载路径；必须保留旧目录时，再按当前版本配置路径映射。

### 配置整理与媒体库刷新

设置下载目录、媒体库目录及整理方式。需要继续做种时，优先评估硬链接或复制；直接移动源文件可能让原下载任务丢失数据。

| 整理方式 | 适用情况                                     | 需要留意                                         |
| -------- | -------------------------------------------- | ------------------------------------------------ |
| 硬链接   | 本地同一文件系统，希望保种且避免重复占用空间 | 名称可不同，文件内容仍共享，不能随意改写媒体本体 |
| 复制     | 跨文件系统，或希望目标独立保存               | 需要额外空间，网盘写入还要确认上传完成           |
| 移动     | 明确不需要保留原路径的文件                   | 先确认下载任务和其他程序不再依赖源文件           |

再连接 Emby、Jellyfin 或 Plex，并确认媒体服务器能够读取整理目标。它看到的路径可以与 MoviePilot 不同，但涉及刷新通知时，要按集成要求配置对应关系。

选择一个有权使用的小文件或测试任务，检查：下载器完成任务、MoviePilot 正确识别并整理、需要保种时原任务仍能做种、媒体库刷新且能够播放。对文件是否入库、消息是否发送分别验收。

## 整理目录、命名与覆盖策略

### 下载器任务与手动文件分开处理

参考 V2 部署教程的目录思路，可以在已有 `/data` 下再加一个 `incoming`，用来放其他渠道取得、已经完整写入的媒体文件：

| 来源                                | 自动整理入口                 | 整理到哪里       | 建议方式                           |
| ----------------------------------- | ---------------------------- | ---------------- | ---------------------------------- |
| `/data/downloads` 中需要保种的任务  | 下载器监控                   | `/data/library`  | 同一文件系统用硬链接，否则复制     |
| `/data/incoming` 中已完成的手动文件 | 手动整理，跑通后再开目录监控 | `/data/library`  | 先复制验证；不再需要原路径时可移动 |
| 准备上传网盘的本地文件              | 选定的本地来源或下载任务     | 已配置的云端目录 | 复制，并核对远端上传结果           |

对同一来源选定一种自动整理入口，避免下载器监控、目录监控和插件同时处理。不要把仍在下载的临时目录当作成品目录；网盘挂载也不适合直接套用本地实时目录监控，频繁扫描可能触发服务端限流。

逐个检查目录项的媒体类型、类别和匹配顺序，再测试电影、剧集是否进入预期目标。已经在目录项中指定 `movies` 或 `tv` 时，也要核对“按类型分类”“按类别分类”是否继续追加子目录，避免得到 `movies/电影/电影/...` 之类的重复层级。

### 默认命名跑通后再保留更多信息

没有特殊需要时先保留默认模板。希望保留分辨率、制作组等信息，再按官方[自定义重命名说明](https://github.com/jxxghp/MoviePilot-Wiki/blob/main/advanced.md)调整；不要把“识别词”“下载过滤规则”和“重命名模板”混成一套配置。

例如下面的电影模板保留年份、分段标识、分辨率和制作组，未识别到的字段不输出：

```text
{{title}}{% if year %} ({{year}}){% endif %}/{{title}}{% if year %} ({{year}}){% endif %}{% if part %}-{{part}}{% endif %}{% if videoFormat %} - {{videoFormat}}{% endif %}{% if releaseGroup %} - {{releaseGroup}}{% endif %}{{fileExt}}
```

剧集则先保留季目录与季集号，再按需要加制作组：

```text
{{title}}{% if year %} ({{year}}){% endif %}/Season {{season}}/{{title}} - {{season_episode}}{% if part %}-{{part}}{% endif %}{% if releaseGroup %} - {{releaseGroup}}{% endif %}{{fileExt}}
```

在重命名测试或整理预览中分别检查普通电影、分段电影、单集和特别篇。`releaseGroup` 只负责输出已识别的制作组；名称没识别对时，应先修正识别结果，增加模板字段不能自动纠正它。改模板也不会主动重命名全部已有媒体。

### 覆盖方式决定如何处理已有版本

| 覆盖方式       | 处理结果                                             |
| -------------- | ---------------------------------------------------- |
| 从不覆盖       | 遇到同名且扩展名相同的目标文件时中断该项整理         |
| 按大小覆盖     | 同名文件中，新文件更大才覆盖；大小不等于画质         |
| 总是覆盖       | 覆盖媒体库里的同名文件                               |
| 仅保留最新版本 | 删除同一电影或剧集的其他版本，文件名不同也可能被删除 |

刚开始可以选“从不覆盖”，把冲突留在整理历史里人工确认。后面配置洗版订阅时，再一起核对覆盖策略、命名是否区分版本，以及是否确实只想保留一版。“找到更高优先级资源”和“删除旧媒体文件”分别由下载选择与整理设置控制。

## 二级分类与订阅优先级

### 先分清四类配置

磕巴白菜的[规则分享](https://hi.keba.host/archives/MOVIEPILOT-Rules)把多国别、多类型分类与官组优先洗版放在一起配置。实际使用时，可以先拆开理解：

| 配置         | 决定什么                             | 例子                                   |
| ------------ | ------------------------------------ | -------------------------------------- |
| 二级分类     | 媒体属于哪一类                       | 动画电影、华语电影、纪录片、国产剧     |
| 自定义规则   | 一个资源是否满足某项条件             | 标题是否含指定制作组、体积是否在范围内 |
| 优先级规则组 | 哪些资源可通过，以及通过后优先选哪档 | 指定组 1080p 优先，再退到其他 1080p    |
| 下载排序     | 多个候选之间按哪些字段排序           | 优先级、站点、做种人数的先后顺序       |

分类主要依据媒体元数据；同一部电影的 1080p 和 4K 资源通常仍属于同一个媒体类别。自定义规则建好后还要被规则组引用，规则组也要应用到实际搜索或订阅中。

### V3 在界面维护二级分类

当前 V3 入口是 **设定 → 存储 & 目录 → 自动分类策略**。旧教程通过插件修改 `category.yaml` 的步骤，不能直接作为 V3 操作步骤；已有配置升级时先核对系统迁移后的结果。具体入口与兼容说明见官方[进阶文档](https://github.com/jxxghp/MoviePilot-Wiki/blob/main/advanced.md)。

分类规则按顺序匹配，**首条命中就停止**。例如希望动画电影单独成类，应把“动画电影”放在“华语电影”之前；否则一部中文动画电影可能先进入华语电影。纪录片、综艺等类型与国别也会重叠，先决定自己更重视类型还是地区。

可以从少量分类开始：

| 媒体类型 | 从前到后的示例顺序                       |
| -------- | ---------------------------------------- |
| 电影     | 动画电影 → 华语电影 → 其他电影           |
| 电视剧   | 动画 → 纪录片 → 综艺 → 国产剧 → 其他剧集 |

最后保留兜底类别，并用几部熟悉的媒体测试结果。新建规则默认停用，先检查、测试，再启用并保存。类别名称要与目录设置、规则组中的类别一致；修改分类策略不会自动搬动已有文件，重新整理前先看目标路径预览。

### 从一条可读的优先级开始

内置规则和自定义规则都可用于表达式。常用符号含义如下：

| 符号 | 含义                   | 示例                         |
| ---- | ---------------------- | ---------------------------- |
| `&`  | 同时满足               | `1080P & WEBDL`              |
| `\|` | 至少满足一个           | `1080P \| 4K`                |
| `!`  | 不满足该条件           | `!3D`                        |
| `>`  | 左侧优先，逐档向右回退 | `1080P & WEBDL > 4K & WEBDL` |

`>` 不是大小比较。资源命中最左侧哪一档，就得到那一档的优先级；一档也没命中会被过滤。因此上例明确偏向 1080p WEB 资源，再回退到 4K。内置 `WEBDL` 同时匹配 WEB-DL 和 WEBRip，其他片源不会自动放行。

假设想优先选择自己认可的制作组，可以新建一个自定义规则：

```text
标识符：PreferGroup
名称：偏好的制作组
包含：(?<![A-Za-z0-9])(?:GroupA|GroupB)(?![A-Za-z0-9])
排除：留空
```

`GroupA`、`GroupB` 是占位符，换成实际组名；组名含 `.`、`+` 等正则特殊字符时需要转义。规则标识符使用不带空格的简单名称，避免导入旧规则后表达式无法识别。包含、排除默认会检查资源标题、副标题和标签，并忽略大小写，所以还要拿真实搜索结果确认有没有误匹配。

然后在适用的规则组中使用：

```text
1080P & WEBDL & PreferGroup > 1080P & WEBDL > 4K & WEBDL
```

它依次偏好指定组的 1080p、其他组的 1080p，最后才是 4K。这里的组名是偏好，其他组仍可回退；想严格限定组名，就必须让每一档都包含 `PreferGroup`。

需要排除 3D、原盘等内容时，可另设适用范围一致的前置过滤组，例如 `!3D & !BLU`。在实际场景中同时选用它和偏好规则组，并把这个只有一档的过滤组排在偏好组之前；仅取名“前置过滤”不会自动改变顺序。后续规则组会重新赋予优先级，把单档过滤组放在最后可能抹平前面的偏好。

**多个适用且已选择的规则组会叠加过滤**，不是任意一个通过即可；电影与剧集、不同类别应设置清楚适用范围，避免互相冲突。下载排序也要把“优先级”放到符合预期的位置，否则排在前面的站点或做种人数仍会先决定顺序。

### 官组偏好、免费和洗版分别确认

参考文章的“官组优先”建立在作者选择的站点、组名和播放设备上。制作组名单、AV1 / OPUS 排除项、杜比视界限制都应按自己的情况调整；标题匹配到某个关键词，也不能证明音视频参数与播放器一定兼容。

几个容易混淆的条件：

- `FREE` 根据站点返回的下载计费因子判断免费，不是检查标题里有没有“FREE”。免费状态可能变化，下载前仍要看站点实际规则；免费也不代表免除 H&R 或保种要求。
- `DOLBY` 指杜比视界，`ATMOS` 才是杜比全景声。只按标题里的 DV / Profile 字样过滤，不能代替实际媒体参数与设备播放测试。
- 自定义体积区间 `size_range` 的单位是 MB。剧集会按识别到的集数折算单集大小；识别不到集数时可能按整个种子计算，不能把合集体积直接当作每集大小。
- `CNSUB` 依赖资源信息判断，中文原始语言媒体也可能直接通过；命中它不等于已逐个文件核验字幕。需要中字时，下载前查看资源详情，入库后测试字幕轨。

普通订阅先满足缺失内容；洗版用于继续寻找符合升级条件的版本。按官方[订阅说明](https://github.com/jxxghp/MoviePilot-Wiki/blob/main/subscribe.md)，洗版下载后会继续保留订阅，找到更高优先级时再下载，达到最高优先级后完成；剧集洗版只支持完结状态，适合把追更与完结收藏分开设置。仅把规则组命名为“洗版”不会开启洗版订阅。

启用前核对已有版本、当前优先级、目标优先级与停止条件，再决定整理时保留多版本还是替换旧版。优先级越高只代表越符合这套偏好，不必然代表码率更高或画质更好。采用站点 RSS 模式时，也不要依赖它完成促销检测或做种人数判定，先核对订阅模式能提供哪些信息。

建议先选一部电影和一部剧，检查搜索结果的命中档位与被过滤原因，再应用到订阅。记录为什么选中这一条、为什么排除另一条，比一次导入整套 JSON 更方便后续维护。

## 常用插件怎样选

### 先配置官方插件市场

打开 **插件 → 插件市场设置**，先保留官方仓库：

```text
https://github.com/jxxghp/MoviePilot-Plugins
```

第三方仓库按需添加，并核对作者、维护状态、插件支持版本和配置说明。当前官方市场要求 GitHub 仓库的 `main` 分支；通过 `PLUGIN_MARKET` 配置多个仓库时，用英文逗号分隔。V3 也提供从 Wiki 同步公开仓库清单的入口，但入门时不必一次导入所有仓库。

插件安装会访问 GitHub，并可能下载额外依赖。遇到 GitHub API 限流，可在基础设置配置自己的 `GITHUB_TOKEN`；它用于提高访问额度，不会自动解决 DNS 或网络超时。Token 按所需功能配置权限，保存在应用设置中，不要复制到公开配置或截图里。

参考教程里的插件数量、仓库合集和某个按钮位置可能已经变化。**V2 插件能否在 V3 使用，要看插件是否涉及已变更的接口，以及作者是否提供了 V3 版本。** 官方兼容说明允许部分旧插件继续运行，但不能据此把所有 V2 插件当作已适配。

### 按功能补齐，而不是全部安装

| 需求                     | 可以查看的功能或插件               | 配置时先确认                                       |
| ------------------------ | ---------------------------------- | -------------------------------------------------- |
| 纠正季号、标题和特殊命名 | 自定义识别词、共享识别词           | 先拿出错的文件名测试，避免不适用的规则影响其他资源 |
| 补齐海报与 NFO           | 整理中的刮削设置、媒体库刮削类插件 | 优先使用已有整理流程，避免多个工具反复覆盖元数据   |
| 入库后及时看到内容       | 媒体服务器刷新类插件               | 核对服务器地址、令牌和媒体路径对应关系             |
| 根据想看列表添加订阅     | 豆瓣想看、榜单订阅类插件           | 核对账号可访问性、过滤规则和订阅范围               |
| 管理下载任务             | 下载器助手                         | 先启用标签等简单功能，逐项核对删种、删文件条件     |
| 增加或迁移做种任务       | IYUU 自动辅种、自动转移做种类插件  | 核对下载器版本、文件路径、任务校验和种子备份目录   |

目录监控、站点数据等能力在较新版本中已有内建功能。添加插件前先检查系统本身是否能完成需求，避免同一目录被两套监控反复整理。

共享识别词是可变的规则来源。先读规则说明，用几个已有文件名验证识别结果，再决定是否定期同步；远程词表更新后，如果原本正确的季号突然变化，也要把新增规则列入排查范围。

下载器助手、自动转移做种等插件可能修改任务，部分配置还会删除文件。启用前读当前版本的规则说明，尤其是“立即运行一次”的触发方式；不能仅凭主开关关闭就假定单次任务不会执行。先限制到少量测试任务，确认行为后再扩大范围。

自动转移做种如果需要读取 `.torrent` 备份目录，应额外挂载下载器实际使用的种子目录。不同镜像和安装方式的目录并不相同，参考截图中的 NAS 路径不能原样照搬。

### 一次只增加一个自动任务

安装插件后，先保存配置、查看日志，再观察它是否按预期执行。多个插件同时修改同一批下载任务时，要明确谁负责标签、谁负责整理、谁负责删除。

配置中心、刷新、识别词这类功能和自动删种的影响不同。把基础整理跑稳后再增加辅种、任务转移或删除规则，更容易判断问题来自哪里。

## 企业微信先分清两条连接

这里使用的是**企业微信自建应用**。通过管理后台的“微信插件”关联后，可以在普通微信中接收应用消息；它与企业微信群机器人 Webhook 是不同的接入方式，不能混用凭据。

企业微信涉及两个方向：

```text
发送通知：
MoviePilot → 企业微信 API（可经固定出口代理）→ 微信 / 企业微信

接收指令：
微信 / 企业微信 → 企业微信服务器 → 公网 HTTPS 回调 → MoviePilot
```

| 项目           | 解决的问题                           | 对应检查                                   |
| -------------- | ------------------------------------ | ------------------------------------------ |
| 应用可信 IP    | 哪个出口可以调用企业微信 API         | 填 API 请求最终发出的公网 IP               |
| 消息推送代理   | 让 API 请求通过可用的固定出口发送    | 代理可达、HTTPS 正常、可信 IP 与出口一致   |
| 接收消息 URL   | 企业微信把消息和校验请求送到哪里     | 回调地址能从公网访问 MoviePilot 的消息接口 |
| frp 等穿透工具 | 没有直达公网入口时，让回调能进入内网 | 转发目标、域名、证书与反向代理正确         |

**能收到通知，不代表回调已经可用。** 反过来，回调校验通过，也不能证明发送消息时的出口符合可信 IP 要求。

只需要接收通知时，先配置发送链路。需要从聊天窗口发送指令、搜索或操作菜单时，再继续配置消息回调。

## 配置企业微信消息推送

### 创建自建应用并对应字段

登录[企业微信管理后台](https://work.weixin.qq.com/)，按当前平台要求准备企业、成员和自建应用，将需要接收消息的成员加入应用可见范围。后台权限、认证要求和可用能力以自己的账号实际界面为准。

在 MoviePilot 的 **设定 → 通知** 中新增微信渠道，选择与自建应用对应的模式，并设置一个容易识别的配置名称，例如 `wechat_main`。

| 需要的内容            | 从哪里取得              | 用在哪里                               |
| --------------------- | ----------------------- | -------------------------------------- |
| 企业 ID（CorpID）     | 我的企业 → 企业信息     | MoviePilot 的企业 ID                   |
| AgentId               | 应用管理 → 对应自建应用 | MoviePilot 的应用 ID                   |
| 应用 Secret           | 同一自建应用的 Secret   | MoviePilot 的应用密钥                  |
| 接收成员 ID           | 企业通讯录中的成员信息  | 默认接收人、个人通知 ID 或管理员白名单 |
| Token、EncodingAESKey | 自建应用的接收消息设置  | 后面配置回调时使用                     |

接收成员 ID 是企业通讯录中的标识，不要直接把微信昵称填进去。按当前通知设置选择消息类型和发送范围；需要按用户区分时，在 MoviePilot 对应用户的个人信息中填写通知渠道 ID。

这些凭据各有用途：应用 Secret 用于调用企业微信 API；回调 Token 和 EncodingAESKey 用于验证、解密回调；MoviePilot 的 API Key 用于它自己的接口认证。它们不能互相替代。

### 可信 IP 与发送代理

按企业微信后台要求设置应用可信 IP。直连时，填写 MoviePilot 请求企业微信 API 的实际公网出口；走消息代理时，填写代理向企业微信发请求的公网出口。

家庭宽带的出口可能变化，也可能经过运营商 NAT。需要固定出口时，可以在有固定公网 IP 的 VPS 上部署自己控制的消息代理。MoviePilot 官方[通知说明](https://github.com/jxxghp/MoviePilot-Wiki/blob/main/notification.md)给出了 Nginx 转发方案，并链接了 [wxchat-Docker](https://github.com/DDS-Derek/wxchat-Docker)。

若已有配置好证书的 HTTPS Nginx 站点，可参考官方列出的接口转发规则：

```nginx
# Place these locations inside the existing HTTPS server block.
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

这只是接口转发片段，仍需已有域名、HTTPS 证书、站点监听与适合自己网络的访问限制。在 MoviePilot 的**消息推送代理**中填写代理根地址，例如 `https://wxproxy.example.com`，并将代理真实出口 IP 加入企业微信可信 IP。

消息代理会经手企业 ID、Secret 或访问令牌，优先使用自己控制的服务。参考教程中的公共 HTTP 代理、固定 IP 示例和“已满”服务不作为本文配置值。

插件教程还提到“企微配置IPpw版”等自动更新可信 IP 的方案。这是随家庭出口变化更新后台白名单的另一条路线，依赖插件兼容性、企业微信后台登录状态及平台限制。它不等同于固定代理出口，也不会提供消息回调入口；初次部署先选定一种发送方式。

### 先验证一条通知

保存并启用通知渠道，在 MoviePilot 中执行通知测试。确认目标成员能收到消息后，再测试一条实际的订阅或入库通知，核对消息类型、发送范围和成员 ID。

希望从普通微信接收时，在企业微信后台 **我的企业 → 微信插件** 查看二维码，按后台提示完成关注和成员关联。能关注不等于自动拥有应用可见权限，还要检查接收人的成员状态与应用范围。

## 配置消息回调与无公网访问

### 填写回调凭据和 URL

在企业微信自建应用的“接收消息”页面生成 Token 和 EncodingAESKey，先复制到 MoviePilot 对应通知渠道，保存并启用，再回到企业微信填写 URL：

```text
https://mp.example.com/api/v1/message/?token=YOUR_MOVIEPILOT_API_TOKEN&source=wechat_main
```

使用时替换三个部分：

- `mp.example.com`：能从公网访问的 HTTPS 域名，最终转发到 MoviePilot 的网页 / API 入口。
- `YOUR_MOVIEPILOT_API_TOKEN`：自己实例初始化时生成、可在基础设置核对的 API Key。当前 V3 配置与回调实现仍使用 `API_TOKEN` 名称，不是企业微信生成的 Token，也不要填旧教程的 `moviepilot` 示例值。
- `wechat_main`：MoviePilot 中这条通知配置的实际名称。建议使用英文、数字或下划线；多个同类渠道时尤其要确保对应正确。

URL 中的参数值需要正确进行 URL 编码，示例里的占位符不能原样提交。回调地址包含敏感凭据，分享日志或截图时遮住查询参数。

企业微信保存 URL 时会发起校验。此时 MoviePilot 必须已经运行，通知渠道必须启用，Token、EncodingAESKey、应用与 `source` 都要对应。回调路径前如果还有网页登录、验证码或交互式认证，企业微信无法像人一样完成登录，需要单独规划该接口的访问规则。

校验成功后，从对应应用发送一条受支持的简单指令，检查接收日志和回复，再验证菜单。需要限制可操作人员时，配置管理员白名单。

### 有可达公网入口

已经有公网域名和反向代理时，让 HTTPS 入口转发到 NAS 上 MoviePilot 实际映射的网页端口，例如 `NAS_IP:3000`。前面基础方案的 `3000` 已包含 `/api` 转发，无需为回调再单独向公网开放 `3001`。

反向代理应保留消息路径、查询参数和请求体，并正确传递 Host、来源地址及协议头。通过公网入口验证可达性，不能只在家里连接同一 Wi-Fi 测试；家庭网络的回环访问结果不代表企业微信服务器能访问。

### 没有可达公网入口

可以让 NAS 主动连接自己控制的 VPS，再通过 frp 等方式把回调转进内网：

```text
企业微信服务器
    ↓ HTTPS
VPS 域名与反向代理
    ↓ VPS 上的隧道入口
frp 隧道
    ↓
NAS 上的 MoviePilot 网页端口
```

按当前 [frp 官方文档](https://gofrp.org/zh-cn/docs/)配置服务端、客户端与鉴权，在 VPS 用 HTTPS 域名承接请求，再转到隧道入口。本文不沿用参考文章中的旧版下载命令与 INI 模板；版本和配置格式应与实际安装的 frp 一致。

这条隧道解决的是**企业微信向内访问 MoviePilot**。MoviePilot 对外调用企业微信 API 的出口不会因此自动改变；需要固定出口时，仍然要配置上一节的消息代理。

只有 Tailscale 等私有组网，也不能直接把私网地址填给企业微信。企业微信服务器没有加入自己的私有网络；没有公网可达回调时，可以先使用单向消息推送。

## 按需切换 PostgreSQL

### 先判断是否需要独立数据库

前面的单容器方案默认使用 SQLite，适合先把观影流程跑通。只有出现明确的并发访问、数据库锁竞争或独立运维需求时，再考虑 PostgreSQL；搜索慢、站点超时、刮削失败也可能是网络或上游服务问题，换数据库不会一并解决。

磕巴白菜的[《MoviePilot 进阶：从 SQLite 切换到 PostgreSQL》](https://hi.keba.host/archives/PostgreSQL)提供了旧版部署与 `pgloader` 迁移思路。当前 V3 仍支持 PostgreSQL，但 **切换数据库与 V2 升级 V3 是两件事**；不要在同一次操作中混做，再用修改数据库版本号的办法跳过检查。

### 新安装接入同一 Compose 内的 PostgreSQL

下面适用于**全新数据库**，示例固定 PostgreSQL 的大版本为 17。将两个服务的内容合并到前面的 `services` 中：保留原 `moviepilot` 的镜像、目录、端口和环境变量，补入 `depends_on` 及 `DB_*`；`volumes` 声明位于文件顶层。不要创建两个同名的 `environment` 段。

先在 Compose 项目的 `.env` 增加 `MP_DB_PASSWORD`，填写自己生成的长随机密码。它与 MoviePilot 管理员密码、API Key 不同；可使用不含 Compose 插值字符的长随机字母数字串。

```yaml
services:
  moviepilot:
    # 合并进已有 moviepilot 服务，保留原配置
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      # 与原 NGINX_PORT、PORT、PUID、PGID、TZ 合并
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

同一 Compose 网络中，MoviePilot 用服务名 `postgres` 连接 `5432`，无需发布数据库端口。`127.0.0.1` 在 MoviePilot 容器内不代表 PostgreSQL 容器；若数据库部署在其他主机，再改成真实可达地址，并配置数据库访问权限。

执行 `docker compose config` 检查合并结果，再启动并查看两个服务的日志。配置展开结果会包含密码，只在本机检查。数据库健康只说明服务开始接受连接，仍需核对 MoviePilot 的鉴权、建表和启动日志。`POSTGRES_*` 初始化变量只在空数据目录首次建库时生效，已有数据库的密码不会因为修改 `.env` 就自动更新。

使用外部数据库后，仍保留 `/config`：应用配置、插件等数据并没有全部移进 PostgreSQL。这里也不额外引入 Redis，缓存与数据库是两项独立选择。PostgreSQL 18 及之后的官方镜像更改了默认数据目录布局，不能只替换大版本标签并沿用这里的挂载；跨大版本升级应另外安排备份与迁移。

### 已有 SQLite 数据先做迁移计划

**只改 `DB_TYPE` 不会自动把旧用户、订阅和历史记录搬进新库。** V3 启动会初始化、升级所选数据库的表结构；这不等于跨数据库迁移。若原实例已有数据，不要把上面的新安装步骤直接当作迁移教程。

1. 记录正在运行的 MoviePilot 版本，暂停订阅、整理及可能写数据的插件任务，停止 MoviePilot 后完整备份 `/config`、Compose 和环境配置。保留原 SQLite 文件及其一致的备份状态。
2. 在独立的测试实例和目标库中演练，由匹配版本的 MoviePilot 建立 PostgreSQL 表结构，再按验证过的方案导入数据。参考文中的 `pgloader` 可以作为工具线索，但迁移方案必须匹配当前版本的表结构，核对主外键、数据类型、序列和迁移记录，不能默认旧文章中的建表 SQL 仍适用。
3. 对照迁移前后用户、站点、下载器、订阅、系统设置、下载与整理历史，核对关键表记录数及实际界面；再测试登录、一次下载整理和通知。
4. 正式切换时重新取得停止写入后的备份，确认新库检查通过，再启动应用。回退使用原版本和切换前备份；切换后新产生的数据需另行处理，不能当作会自动写回 SQLite。

不要直接执行旧教程里固定的 `UPDATE alembic_version ...`，也不要将 SQLite 的 `user.db` 放进 PostgreSQL 数据目录期待自动导入。没有核实对应版本的迁移路径时，继续使用现有 SQLite，或明确选择在新库重新配置。V3 的[数据库说明](https://github.com/jxxghp/MoviePilot/blob/v3/docs/postgresql-setup.md)可用于了解架构与连接；其中迁移命令、表名和历史版本号仍需与正在运行的版本核对。

### 数据库备份单独保留

在 Linux NAS 的项目目录中，可使用 PostgreSQL 自带的 `pg_dump` 生成逻辑备份。为了便于将数据库与 `/config` 对齐，先停止 MoviePilot，再保存两者：

```bash
docker compose stop moviepilot
backup_dir="backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$backup_dir"
docker compose exec -T postgres pg_dump -U moviepilot -d moviepilot -Fc > "$backup_dir/moviepilot.dump"
# 同时备份 ./config、compose.yaml 和 .env，并记录应用与数据库版本
docker compose start moviepilot
```

每次备份保存到独立的日期目录，避免覆盖仅存的一份；检查命令退出状态、文件大小，并在隔离数据库试恢复。仅复制运行中的 PostgreSQL 数据目录不等于完成一致备份；`docker compose down -v` 会删除这里声明的数据库卷，也不能作为日常重启命令。

## 更新、备份与日常检查

更新前记录当前 MoviePilot 镜像版本、插件版本与挂载目录，备份 Compose、`.env` 和持久化数据。基础方案使用 SQLite，备份配置目录时先停止应用，避免只复制到一半数据库状态；选择了外部 PostgreSQL 时，还需要数据库自身的备份。

准备好备份后，在项目目录执行：

```bash
docker compose pull
docker compose up -d
docker compose logs --tail=100 moviepilot
```

`latest` 会随上游更新。希望固定版本时，使用项目实际发布的版本标签，不要自行猜标签名称。每次更新后检查站点、下载器、一次整理和一条通知，再确认关键插件能正常加载。

从 V2 升级 V3 前先阅读官方[升级说明](https://github.com/jxxghp/MoviePilot-Wiki/blob/main/upgrade.md)。官方支持保留原配置与数据库升级，但 V3 迁移过的数据库不能直接换回 V2 镜像使用；回退应配合升级前的数据备份。

## 常见问题

| 现象                               | 优先检查                                                                       |
| ---------------------------------- | ------------------------------------------------------------------------------ |
| 网页打不开或一直初始化             | 端口是否占用、配置目录权限、容器状态与启动日志                                 |
| CookieCloud 同步成功，但站点不能用 | MoviePilot 用户认证、站点登录状态、支持情况与实际网络连接                      |
| 下载完成后找不到文件               | 下载器报告路径与 MoviePilot 可见路径是否对应，挂载是否一致                     |
| 硬链接失败                         | 是否跨文件系统、是否分开挂载、来源与目标权限是否正确                           |
| 网页改了设置却没有生效             | Compose 是否注入了同名环境变量，修改后是否重建容器                             |
| 搜索有资源，订阅却一直不下载       | 规则组是否已应用、适用类别是否匹配、多个过滤条件是否冲突，以及日志中的排除原因 |
| 修改分类后，旧文件仍在原目录       | 保存分类策略不会自动迁移已有文件，重新整理前先检查目标路径                     |
| 换成 PostgreSQL 后像全新安装       | 是否只改连接而未迁移数据，是否连到了空库或错误数据库                           |
| PostgreSQL 已健康，应用仍连不上    | 服务名、数据库名、账号密码及访问权限；已有数据库密码不会随初始化变量自动更改   |
| 插件市场加载失败                   | GitHub 连通性、API 限流、Token、仓库分支与插件支持版本                         |
| 插件安装成功但无法运行             | 依赖是否安装完整、V3 接口是否兼容、保存配置后的插件日志                        |
| 微信提示 IP 不可信                 | 调用企业微信 API 的真实出口，是否与可信 IP 一致                                |
| 微信收得到通知，保存回调失败       | 公网入口、HTTPS、路径、查询参数、API_TOKEN、回调 Token 与 EncodingAESKey       |
| 回调通过，但指令没有回复           | 通知渠道是否启用、`source` 是否匹配、成员与管理员白名单、回复发送链路          |
| 管理员能收到，其他用户收不到       | 应用可见范围、个人通知 ID、消息发送范围，是否只发给管理员                      |
| 开了 frp，通知仍报 IP 错误         | frp 回调隧道不改变 API 出口，单独检查消息推送代理                              |
| 刷新了媒体库却没有内容             | 整理是否成功、媒体服务器能否读取目标目录、路径映射是否正确                     |

微信故障分别检查发送和回调链路；其他问题沿站点、下载器、文件整理和媒体库逐段定位。

## 参考资料

- 磕巴白菜：[《新绿联部署新版 MoviePilot-V2，实现全自动化订阅、整理、刮削与搜索下载》](https://hi.keba.host/archives/moviepilot-v2)。部署、目录与命名配置的实践参考，本文按当前 V3 调整初始化、挂载和配置入口。
- 磕巴白菜：[《【MoviePilot分享】基于多国别/多类型的二级分类策略与官组优先洗版配置》](https://hi.keba.host/archives/MOVIEPILOT-Rules)。分类顺序、组名偏好与洗版思路的参考，具体名单和设备限制按需设置。
- 磕巴白菜：[《MoviePilot 进阶：从 SQLite 切换到 PostgreSQL》](https://hi.keba.host/archives/PostgreSQL)。数据库部署与迁移的背景参考，文中的旧版迁移 SQL 不作为 V3 通用命令。
- 磕巴白菜：[《MoviePilot企业微信推送教程适用V1/V2版本 公网&无公网》](https://hi.keba.host/archives/wxchat)。本文微信配置的实践参考；公共代理地址和旧版 frp 配置未照搬。
- 磕巴白菜：[《MoviePilot常用插件配置》](https://hi.keba.host/archives/plugins.v2)。本文插件选择与使用场景的参考，具体选项以插件当前版本为准。
- [MoviePilot 项目](https://github.com/jxxghp/MoviePilot)、[官方安装说明](https://github.com/jxxghp/MoviePilot-Wiki/blob/main/install.md)、[配置说明](https://github.com/jxxghp/MoviePilot-Wiki/blob/main/configuration.md)与[站点说明](https://github.com/jxxghp/MoviePilot-Wiki/blob/main/site.md)。
- [V3 Docker 启动与数据目录](https://github.com/jxxghp/MoviePilot/blob/v3/docs/docker-startup.md)、[文件整理说明](https://github.com/jxxghp/MoviePilot-Wiki/blob/main/reorganize.md)与[升级说明](https://github.com/jxxghp/MoviePilot-Wiki/blob/main/upgrade.md)。
- [官方进阶说明](https://github.com/jxxghp/MoviePilot-Wiki/blob/main/advanced.md)、[订阅说明](https://github.com/jxxghp/MoviePilot-Wiki/blob/main/subscribe.md)、[V3 规则解析](https://github.com/jxxghp/MoviePilot/blob/v3/app/application/rules.py)与[资源过滤实现](https://github.com/jxxghp/MoviePilot/blob/v3/app/modules/filter/__init__.py)：核对分类入口、规则表达式与洗版行为。
- [V3 PostgreSQL 说明](https://github.com/jxxghp/MoviePilot/blob/v3/docs/postgresql-setup.md)、[数据库配置源码](https://github.com/jxxghp/MoviePilot/blob/v3/app/runtime/config.py)、[数据库初始化实现](https://github.com/jxxghp/MoviePilot/blob/v3/app/startup/initializers/database.py)与[PostgreSQL 官方镜像说明](https://github.com/docker-library/docs/blob/master/postgres/README.md)。
- [官方插件说明](https://github.com/jxxghp/MoviePilot-Wiki/blob/main/plugin.md)、[官方插件库](https://github.com/jxxghp/MoviePilot-Plugins)与[V2 插件迁移到 V3](https://github.com/jxxghp/MoviePilot-Plugins/blob/main/docs/V3_Plugin_Adaptation.md)。
- [V3 消息回调实现](https://github.com/jxxghp/MoviePilot/blob/v3/app/api/endpoints/message.py)与[接口鉴权实现](https://github.com/jxxghp/MoviePilot/blob/v3/app/adapters/web/security/access.py)：核对 API_TOKEN、source 与通知渠道匹配。
- [官方通知说明](https://github.com/jxxghp/MoviePilot-Wiki/blob/main/notification.md)、[wxchat-Docker](https://github.com/DDS-Derek/wxchat-Docker)与[frp 官方文档](https://gofrp.org/zh-cn/docs/)。
