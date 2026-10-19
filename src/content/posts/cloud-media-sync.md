---
title: Cloud Media Sync：同步 115 媒体库与 Emby 302 播放
description: Cloud-Media-Sync 把 115 网盘同步成本地 STRM，交给 Emby 扫描并验证 302 播放。
author: Ayulog
pubDatetime: "2026-10-10T12:00:00+08:00"
draft: false
category: library
tags:
  - Docker
---

想要把 115 网盘里的影片接入 Emby 海报墙，同时避免将原片下载到 NAS 本地，可以使用 [Cloud-Media-Sync（CMS）][cms-docs] 读取 115 目录并在本地生成 `.strm` 文件，再由 Emby 扫描入库并通过 302 重定向直连播放。整条链路为 **115 网盘 → CMS → Emby**。

若需要把网盘挂载为本地文件夹供上传或文件管理使用，可配合 [CloudDrive2 挂载](/posts/cloud-storage-local-mount/)（注意不要将网盘挂载目录与 STRM 输出目录混用）。Emby 基础部署见 [Emby 教程](/posts/emby-guide/)，相关工具汇总在 [NAS 服务清单](/posts/nas-software-websites/)。

当前 CMS 官方安装说明要求配置 `DONATE_CODE` 授权码，并限定个人局域网环境使用，部署前请先核对[官方授权说明][cms-install]。

## STRM 同步与 302 播放原理

`.strm` 是仅包含几行播放地址或路径的纯文本文件，体积极小。媒体服务器可以像扫描普通视频一样识别 `.strm` 的文件名并刮削海报，而真正的视频流仍保存在 115 网盘中。

整个流程中各环节的分工如下：

| 环节         | 核心作用                                           | 产出结果                  |
| ------------ | -------------------------------------------------- | ------------------------- |
| 115 网盘     | 存储视频原片及同目录的字幕、NFO                    | 云端媒体目录              |
| CMS 同步     | 遍历网盘目录，为视频生成 `.strm`，下载字幕与元数据 | NAS 本地可供扫描的目录树  |
| Emby         | 扫描 `.strm` 文件，匹配影片信息并生成海报墙        | 媒体库条目与播放进度记录  |
| CMS 302 代理 | 拦截播放请求（默认 `9096` 端口），返回网盘直连地址 | 播放器直接向 115 网盘拉流 |

数据流向分为入库与播放两条路径：

```text
同步入库：115 媒体目录 → CMS → 本地 STRM / 字幕 / 元数据 → Emby 扫描入库
直连播放：客户端连接 9096 代理端口 → CMS 返回 302 重定向 → 播放器直连 115 网盘取流
```

使用这套方案时需留意三个前提：

- **入库与 302 代理独立**：生成 `.strm` 仅完成媒体库入库；要让视频流量绕过 NAS 直连网盘，客户端必须连接 CMS 提供的 Emby 302 代理端口（`9096`），且所播格式无需服务端转码。
- **无需前置挂载**：CMS 直接调用 115 接口生成 `.strm`，同步与播放环节本身不依赖 CloudDrive2 或 rclone 挂载。
- **网盘风控与解码**：直连播放可大幅减轻 NAS 转发负担，但起播速度与画质仍受 115 接口限流、客户端网络及设备解码能力影响。

## 目录规划与前置准备

部署前请准备好 Docker Compose 环境、115 账号、CMS 授权码（`DONATE_CODE`），并在已运行的 Emby 后台（**高级 → API 密钥**）创建一枚专供 CMS 使用的 API Key。

建议将 CMS 自身配置与 `.strm` 输出目录分开存放（以下 `/path/to/...` 均替换为宿主机实际绝对路径）：

```text
/path/to/docker/cms/
├── compose.yaml
├── .env
├── config/
├── logs/
└── cache/

/path/to/strm/       # 存放本地生成的 STRM、字幕与 NFO
```

沿用本站媒体工作流的路径约定，宿主机 `/path/to/strm` 目录需同时挂载给 CMS 和 Emby 容器：

| 挂载目录  | 宿主机真实路径  | CMS 容器内路径 | Emby 容器内路径 |
| --------- | --------------- | -------------- | --------------- |
| STRM 输出 | `/path/to/strm` | `/media`       | `/strm`         |

例如 CMS 在容器内生成的 `/media/movies/示例电影.strm`，在 Emby 容器内对应的路径即为 `/strm/movies/示例电影.strm`。确保运行服务的 UID / GID 对 CMS 配置与 `/path/to/strm` 拥有读写权限，Emby 容器对该目录至少拥有读取权限。

## Docker Compose 部署

### 编写 Compose 与环境变量

1. 在 `/path/to/docker/cms` 目录保存 `compose.yaml`（亦可直接下载本站示例 [compose.yaml](/examples/debnas/cloud-media-sync/compose.yaml) 与 [env.example](/examples/debnas/cloud-media-sync/env.example)，与[媒体服务 Compose](/posts/debnas-media-workflow/#媒体服务-compose) 共用 `media` 网络）：

   ```yaml
   services:
     cloud-media-sync:
       privileged: true
       container_name: cloud-media-sync
       image: imaliang/cloud-media-sync:latest
       restart: always
       volumes:
         - ./config:/config
         - ./logs:/logs
         - ./cache:/var/cache/nginx/emby
         - ${STRM_ROOT:?Set STRM_ROOT in .env}:/media
       ports:
         - "9527:9527"
         - "9096:9096"
       environment:
         PUID: ${PUID:?Set PUID in .env}
         PGID: ${PGID:?Set PGID in .env}
         UMASK: "022"
         TZ: Asia/Shanghai
         RUN_ENV: online
         ADMIN_USERNAME: ${CMS_ADMIN_USERNAME:?Set CMS_ADMIN_USERNAME in .env}
         ADMIN_PASSWORD: ${CMS_ADMIN_PASSWORD:?Set CMS_ADMIN_PASSWORD in .env}
         CMS_API_TOKEN: ${CMS_API_TOKEN:?Set CMS_API_TOKEN in .env}
         EMBY_HOST_PORT: http://emby:8096
         EMBY_API_KEY: ${EMBY_API_KEY:?Set EMBY_API_KEY in .env}
         DONATE_CODE: ${CMS_DONATE_CODE:?Set CMS_DONATE_CODE in .env}
       networks:
         - media

   networks:
     media:
       external: true
   ```

2. 在同目录创建 `.env` 并填入实际参数：

   ```dotenv
   PUID=1000
   PGID=1000
   CMS_ADMIN_USERNAME=admin
   CMS_ADMIN_PASSWORD=your_strong_password
   CMS_API_TOKEN=your_random_api_token
   EMBY_API_KEY=your_emby_api_key
   CMS_DONATE_CODE=your_donate_code
   STRM_ROOT=/path/to/strm
   ```

环境变量说明：

- `CMS_ADMIN_USERNAME` / `CMS_ADMIN_PASSWORD`：CMS 网页后台的登录账号与密码。
- `CMS_API_TOKEN`：自定义的随机字符串，用于 CMS 接口调用与通知鉴权。
- `EMBY_API_KEY`：在 Emby 后台生成的 API 密钥。
- `CMS_DONATE_CODE`：CMS 授权码（注入容器内的 `DONATE_CODE` 变量）。

### 连通 Emby 容器网络

配置中的 `EMBY_HOST_PORT: http://emby:8096` 通过 Docker 内部服务名连接 Emby，需确保 CMS 与 Emby 处于同一个外部网络 `media` 中。若尚未创建该网络，先执行：

```bash
docker network inspect media || docker network create media
```

如果现有 Emby 采用 `network_mode: host`、NAS 原生套件安装，或未加入 `media` 网络，请将 `EMBY_HOST_PORT` 改为 NAS 局域网 IP 地址（如 `http://NAS_IP:8096`，切勿在桥接容器中填写 `127.0.0.1`）。

### 启动服务与端口说明

在 CMS 项目目录执行以下命令检查配置并启动容器：

```bash
docker compose config --quiet
docker compose pull
docker compose up -d
docker compose ps
docker compose logs --tail=100 cloud-media-sync
```

确认日志中授权校验通过且无报错后，可通过以下三个局域网端口访问对应服务：

| 访问地址             | 用途说明                                         |
| -------------------- | ------------------------------------------------ |
| `http://NAS_IP:9527` | CMS 管理后台，以及 `.strm` 文件内记录的直连入口  |
| `http://NAS_IP:8096` | Emby 原始管理与访问入口                          |
| `http://NAS_IP:9096` | CMS 提供的 Emby 302 代理入口（供客户端播放连接） |

## 登录 115 并配置 STRM

### 扫码登录 115 账号

1. 浏览器访问 `http://NAS_IP:9527` 登录 CMS 后台，打开 **核心配置 → 115 账号**。
2. 选择一个与日常手机/电脑客户端不冲突的登录设备类型，使用 CMS 内置的二维码扫码登录，确认页面正常显示账号容量信息后保存。
3. 在 115 客户端或网页端确认已开启**生活事件 / 最近操作记录**（CMS 的后续增量同步依赖读取生活事件记录）。

### 配置 STRM 直连域名

打开 **核心配置 → STRM 配置**，将“STRM 直连域名”填写为局域网内 Emby 容器与播放客户端均可访问的 CMS 地址（包含协议、IP 与 `9527` 端口）：

```text
http://NAS_IP:9527
```

配置注意事项：

- 请填写稳定的 NAS 局域网 IP（如 `http://192.168.1.10:9527`），避免填写仅容器内部可解析的 `http://cloud-media-sync:9527`，否则电视或手机客户端可能无法解析。
- 若后续更改了直连域名或 `pick_code_name` 等 URL 格式选项，需按当前版本的覆盖规则重新生成 `.strm` 文件以更新内部链接。

## 全量同步配置与验证

初次同步建议先在 115 网盘中准备一个仅含一两部电影或剧集的测试文件夹，跑通后再同步完整媒体库。

### 配置全量同步任务

进入全量同步设置页面，对照下表填写各项参数：

| 配置项           | 填写方法与说明                                                                      |
| ---------------- | ----------------------------------------------------------------------------------- |
| 云端目录（CID）  | 选择 115 网盘中已整理好的媒体目录 CID（可通过界面目录树选择或从 115 网页 URL 获取） |
| 本地输出目录     | 填写 CMS 容器内路径（如 `/media/movies` 或 `/media/tv`）                            |
| 视频后缀         | 勾选需要生成 `.strm` 的视频扩展名（如 `mkv`、`mp4`、`iso`、`ts`）                   |
| 字幕与元数据后缀 | 勾选需下载到本地的附件扩展名（如 `srt`、`ass`、`nfo`、`jpg`、`png`）                |
| 覆盖策略         | 首次测试用独立目录，后续根据是否需要刷新已有 `.strm` 选择覆盖方式                   |

保存后启动全量同步并观察日志。若有多个云端分类目录，建议等待当前目录同步完毕后再逐个执行下一个。

### 检查本地生成的 STRM 文件

同步完成后，在 NAS 文件管理器中打开 `/path/to/strm`，检查生成的目录结构：

```text
/path/to/strm/
├── movies/
│   └── 示例电影 (2024)/
│       ├── 示例电影 (2024).strm
│       └── 示例电影 (2024).chs.srt
└── tv/
    └── 示例剧集 (2024)/
        └── Season 01/
            └── 示例剧集 - S01E01.strm
```

用文本编辑器打开任意一个 `.strm` 文件，确认其内容为以 `http://NAS_IP:9527/...` 开头的完整链接，且同目录的外挂字幕已正常下载。

## 接入 Emby 与验证 302 直连

### 挂载 STRM 目录并配置入库刷新

1. **为 Emby 挂载 STRM 目录**：在 Emby 的 `compose.yaml` 的 `volumes` 下补充宿主机 STRM 目录映射，并执行 `docker compose up -d` 重建 Emby 容器：

   ```yaml
   volumes:
     # 保留原有的 config、transcode 与本地媒体库映射，新增以下一行
     - /path/to/strm:/strm:ro
   ```

2. **在 Emby 中添加媒体库**：进入 Emby 后台，新建电影库（路径选 `/strm/movies`）与电视节目库（路径选 `/strm/tv`）。
3. **配置 CMS 入库刷新路径替换**：由于 CMS 容器内路径为 `/media`，而 Emby 容器内路径为 `/strm`，需在 CMS 后台的 **Emby 入库刷新**中参照 [CMSHelp 核心配置说明][cms-core]填写路径替换规则：

   ```text
   /media#/strm
   ```

   `#` 左侧为 CMS 容器内路径，右侧为 Emby 容器内对应路径（若两边容器挂载路径完全相同则留空）。保存并启用刷新后，先在 Emby 手动扫描一次媒体库，确认海报与简介正常生成。

### 通过 9096 端口验证 302 播放

在客户端（如 Infuse、VidHub、Yamby、AfuseKt 或 Emby 客户端）添加服务器时，填入 CMS 的 **302 代理入口** `http://NAS_IP:9096`，并使用 **Emby 账号密码**登录。

选择一部客户端支持原画直放（Direct Play）的云端影片，按以下步骤验证：

1. 点击播放，测试起播速度、进度条大幅拖动以及暂停后恢复播放。
2. 切换外挂字幕与音轨，确认显示与发声正常。
3. 查看 Emby 后台活动会话、CMS 运行日志与 NAS 网卡实时流量：确认请求已被 302 重定向至 115 网盘，播放期间视频流不再占用 NAS 带宽。

### 海报缓存与神医助手插件

- **Nginx 海报缓存（`IMAGE_CACHE_POLICY`）**：可在 CMS 的 `environment` 中按需添加该变量控制海报图片缓存策略：`0` 为不同尺寸共用首张缓存图（最省空间，大屏可能略糊）；`1` 为按不同尺寸分别缓存；`2` 为忽略缩放参数直接缓存原图；`3` 为关闭 Nginx 图片缓存。
- **[StrmAssistant（神医助手）][strmassistant]**：可在 Emby 中按需安装，用于补充 `.strm` 媒体的编码信息提取与外挂字幕扫描。注意开启媒体探测或章节缩略图会读取远端网盘文件，云端库建议控制触发频率。

## 增量同步与自动整理

### 增量同步机制与限制

完成首次全量同步后，后续日常新增文件由 CMS 增量同步自动处理。可在网盘测试目录中放入一个新视频，确认 115 生活事件生成记录后，观察 CMS 增量日志是否自动生成 `.strm` 并通知 Emby 刷新。

使用增量同步时注意两点：

- **重命名限制**：在 115 网盘内直接重命名文件不会触发 CMS 依赖的生活事件记录，因此修改网盘文件名后需手动触发局部同步或重建。
- **删除联动**：网盘文件删除、本地 `.strm` 清理与 Emby 媒体库删除可分开控制；在开启“Emby 删除同步清理网盘源文件”类功能前，务必先在测试目录核实行为，防止误删云端原片。

### 与 MoviePilot 分工或启用 CMS 自动整理

根据资源来源选择整理方式，确保同一目录只由一个工具负责改名和移动：

- **路线一：由 MoviePilot 整理上传，CMS 仅做同步**
  若已使用 MoviePilot 完成订阅、重命名并通过 CloudDrive2 上传至 115 成品目录（详见[DebNAS 自动观影流程](/posts/debnas-media-workflow/#moviepilot-v3-与-cms-如何配合)），CMS 只需开启对该成品目录的全量与增量同步，无需再启用 CMS 的自动整理。
- **路线二：使用 CMS 自动整理网盘转存/离线文件**
  对于直接在 115 内转存或离线下载的散乱文件，可按 [CMS 官方自动整理文档][cms-organize]与 [CMSHelp 自动整理说明][cms-organize-help]（0.3.4+ 版本已内置独立整理，无需依赖 MoviePilot）规划云端目录结构：

  ```text
  115 网盘/
  ├── 待整理/          # 存放转存/离线文件（位于同步媒体库范围之外）
  ├── 已存在/          # 存放判定为重复的资源
  ├── 冗余/            # 存放整理后剩余的无关文件
  └── 媒体库/          # 已完成全量同步的根目录
      ├── 电影/
      └── 剧集/
  ```

  配置步骤：先配好 TMDB 密钥并完成目标“媒体库”的全量同步 → 填入待整理、已存在和冗余目录的 CID → 设置二级分类策略（目标 CID 指向媒体库下的各分类子目录）→ 先用一两部影片测试识别、重命名与移动效果。

## 更新、备份与日常维护

日常维护需备份 `compose.yaml`、`.env`、CMS 的 `config` 目录以及本地字幕与元数据。更新镜像前记录当前镜像摘要，在项目目录执行：

```bash
docker compose pull
docker compose up -d
docker compose logs --tail=100 cloud-media-sync
```

升级后检查授权状态、115 会话有效性与 302 播放。分享日志或 `.strm` 内容排查问题时，注意遮盖其中的 Token、Cookie 及带签名的网盘直连地址。

## 常见问题

| 现象                            | 优先检查                                                                                               |
| ------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Compose 提示变量缺失            | `.env` 是否与 `compose.yaml` 同目录，必填项是否留空                                                    |
| 启动卡在授权校验或提示版本过期  | 检查网络与 DNS、系统时间；若报 `this license key is expired`，按[官方 FAQ][cms-faq] 拉取新镜像更新版本 |
| `9527` 能打开，`9096` 无法访问  | 检查 `9096` 端口映射，确认 `EMBY_HOST_PORT` 对 CMS 容器可达（同属 `media` 网络或填局域网 IP）          |
| 网盘有视频但本地未生成 STRM     | 检查 115 登录状态、云端 CID、视频扩展名勾选，以及宿主机 STRM 目录写权限                                |
| STRM 已生成，但 Emby 媒体库为空 | 确认 Emby 挂载了同一宿主机目录，且入库刷新配置了 `/media#/strm`                                        |
| 海报墙正常，点击播放失败        | 检查 `.strm` 内的直连域名是否可达、115 登录是否失效、客户端是否支持该视频编码                          |
| 修改直连域名后仍请求旧地址      | 修改域名后需开启覆盖重新生成一次 `.strm` 文件                                                          |
| 新增网盘文件后增量同步未触发    | 确认父目录已完成过全量同步，且 115 账号已开启“生活事件”记录                                            |
| 播放时视频流量仍全部经过 NAS    | 确认客户端连接的是 `9096` 代理端口而非 `8096`，并检查是否因字幕或编码不兼容触发了转码                  |

## 参考资料

- [磕巴白菜：绿联新系统部署 CMS][keba-cms]。
- [CMS 官方文档与安装说明][cms-install]、[官方镜像说明][cms-image]、[全量同步][cms-full]、[自动整理][cms-organize]、[常见问题][cms-faq]。
- [CMSHelp 核心配置][cms-core]与[自动整理说明][cms-organize-help]。
- [StrmAssistant 项目][strmassistant]。

[keba-cms]: https://hi.keba.host/archives/ugreen-cloud-media-sync
[cms-docs]: https://docs.cmscc.cc/
[cms-install]: https://docs.cmscc.cc/install
[cms-image]: https://hub.docker.com/r/imaliang/cloud-media-sync
[cms-full]: https://docs.cmscc.cc/docs/full-sync
[cms-organize]: https://docs.cmscc.cc/docs/auto-organize
[cms-faq]: https://docs.cmscc.cc/faq
[cms-core]: https://github.com/guyue2005/CMSHelp/wiki/7.-%E6%A0%B8%E5%BF%83%E9%85%8D%E7%BD%AE
[cms-organize-help]: https://github.com/guyue2005/CMSHelp/wiki/6.%E8%87%AA%E5%8A%A8%E6%95%B4%E7%90%86
[strmassistant]: https://github.com/sjtuross/StrmAssistant
