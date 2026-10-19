---
title: IPTV：在 NAS 上部署 Allinone 与直播源整理服务
description: Allinone 生成 M3U 订阅，allinone_format 分组转格式，再由播放器读取；含鉴权与排错。
author: Ayulog
pubDatetime: "2026-10-10T10:00:00+08:00"
modDatetime: "2026-10-11T00:00:00+08:00"
draft: false
category: library
tags:
  - IPTV
  - Docker
  - Docker Compose
---

想让家里的电视、电脑和平板共用同一份直播列表，并把频道分组与排序放在 NAS 服务端统一维护，可以采用 **Allinone 生成原始 M3U 订阅 → allinone_format 分组与格式转换 → 播放器订阅观看** 的方案。

若只需寻找现成的公开直播源导入播放器并配置节目单，无需部署容器服务，可直接参考 [IPTVindex：找直播源、接入播放器与节目单](/posts/iptv-index/)。Docker 基础环境准备见 [Docker 官方安装文档](https://docs.docker.com/engine/install/)，其他影音工具汇总在 [NAS 服务清单](/posts/nas-software-websites/)。

## 直播源、列表格式与播放器分工

| 概念 / 组件         | 核心作用                         | 使用要点                                   |
| ------------------- | -------------------------------- | ------------------------------------------ |
| 直播流地址          | 提供单个频道的实时音视频流       | 连通性受上游源状态、鉴权时效与网络环境影响 |
| M3U / M3U8 播放列表 | 记录频道名称、分组、台标与流地址 | 标准订阅格式，主流播放器均支持             |
| TXT 频道列表        | 按“分组,#genre#”组织的纯文本列表 | 常用于部分国产安卓电视直播壳应用           |
| EPG / XMLTV 节目单  | 提供各频道的节目预告与播出时间表 | 需单独配置节目单地址，并通过频道 ID 关联   |
| 播放器客户端        | 拉取订阅列表并解码播放音视频流   | 决定支持的列表格式、视频编码与 EPG 展示    |

本方案中，**Allinone** 负责聚合与代理网络直播流并输出标准 M3U 列表；**allinone_format**（由社区开发者维护）负责读取原始 M3U、提供网页界面调整频道分组，并按需同时输出 M3U 和 TXT 订阅链接。若使用的播放器原生支持 M3U 且无需自定义分组，只部署 Allinone 即可。

注意：此处的 Allinone 针对的是互联网直播聚合源；若要接入家庭宽带运营商的专网组播 IPTV，则需单独配置光猫 IPTV 口、VLAN 划分、udpxy 与组播转发。

## 部署前准备

以 Linux NAS 上的 Docker Compose 环境为例，部署前先确认以下规划：

| 项目             | 配置约定                                                  |
| ---------------- | --------------------------------------------------------- |
| NAS 局域网地址   | 固定局域网 IP，下文以 `NAS_IP` 表示                       |
| Allinone 端口    | `35455`（提供原始 M3U 订阅）                              |
| 整理服务端口     | `35456`（allinone_format 网页管理与整理后订阅输出）       |
| 项目目录         | 自选文件夹，存放 `compose.yaml` 与 `.env`                 |
| 整理服务数据目录 | 示例为 `/volume1/docker/iptv/format`，替换为 NAS 真实路径 |
| 授权启动参数     | 按 Allinone 维护者提供的专属参数填写                      |

`youshandefeiyang/allinone:latest` 镜像支持 Linux `amd64`、`arm64` 与 `arm` 架构。部署前确认宿主机 `35455` 和 `35456` 端口未被占用；若拉取 Docker 镜像受阻，可参考 [Docker 镜像加速与拉取排错](/posts/docker-registry-mirrors/)。

## 部署 Allinone

### 获取授权启动参数

Allinone 需要传入专属鉴权参数（如 `-aesKey`、`-userid`、`-token` 等命令参数）才能正常拉取上游数据：

1. 前往 [Allinone 镜像页面][allinone-image]或[作者主页][allinone-author]，通过维护者提供的 Telegram 机器人获取专属启动命令。
2. 从生成的 `docker run` 命令中，提取**镜像名称 `youshandefeiyang/allinone` 之后的全部程序参数**（例如 `-tv=true -aesKey=... -userid=... -token=...`），后续填入 `.env` 的 `ALLINONE_ARGS` 变量中。

个人 Token 与密钥仅保存在本机 `.env` 中，切勿上传至公开代码仓库或未打码的截图中。

### 编写 Compose 配置并启动

1. 在项目目录创建 `.env`，填入上一步提取的完整程序参数：

   ```dotenv
   ALLINONE_ARGS=-tv=true -aesKey=YOUR_AES_KEY -userid=YOUR_USER_ID -token=YOUR_TOKEN
   ```

   若参数中包含特殊字符（如 `$`），请按 [Compose 变量插值说明][compose-interpolation]转义（如写成 `$$`）。

2. 在同目录创建 `compose.yaml`：

   ```yaml
   services:
     allinone:
       image: youshandefeiyang/allinone:latest
       container_name: allinone
       restart: unless-stopped
       ports:
         - "35455:35455"
       command: ${ALLINONE_ARGS:?请先在 .env 中填写 ALLINONE_ARGS 授权参数}
   ```

   此配置使用默认的 bridge 桥接网络并映射 `35455` 端口，无需开启 `privileged: true` 特权模式或混用 `network_mode: host`。

3. 在项目目录检查配置并启动服务（绿联 UGOS Pro 等 NAS 系统也可直接在 Docker“项目”界面导入上述配置）：

   ```bash
   docker compose config --quiet
   docker compose up -d allinone
   docker compose ps
   docker compose logs --tail=100 allinone
   ```

   查看日志，确认鉴权通过、服务正常监听 `35455` 端口且无重启报错。

## 验证并导入 M3U 订阅

Allinone 启动后，主电视直播订阅地址为：

```text
http://NAS_IP:35455/tv.m3u
```

除综合电视列表 `tv.m3u` 外，Allinone 还提供分平台直播与轮播列表入口，可按需选用：

- 虎牙一起看：`http://NAS_IP:35455/huyayqk.m3u`
- B 站直播：`http://NAS_IP:35455/bililive.m3u`
- 斗鱼一起看：`http://NAS_IP:35455/douyuyqk.m3u`
- YY 轮播：`http://NAS_IP:35455/yylunbo.m3u`

建议按以下三步完成初次验证：

1. **检查服务响应**：在局域网电脑浏览器访问 `http://NAS_IP:35455/tv.m3u`，确认能下载或打开以 `#EXTM3U` 开头的播放列表文本。
2. **电脑试播**：使用电脑端播放器（如 VLC）打开该 M3U 列表，随机点播几个频道，测试画面、声音与切台速度。
3. **单频道排障**：若个别频道无法播放，可从 M3U 文件中复制该频道对应的具体流地址单独测试，区分是上游源失效还是播放器解码问题。

## 用 allinone_format 整理频道

确认原始 `tv.m3u` 可正常播放后，若需要自定义频道分组、剔除不需要的分类或为电视端生成 `.txt` 格式列表，可接入 [allinone_format][format-project]。

### 扩展双服务 Compose 配置

提前在 NAS 上创建用于持久化整理配置的文件夹（如 `/volume1/docker/iptv/format`），将 `compose.yaml` 扩展为双服务配置：

```yaml
services:
  allinone:
    image: youshandefeiyang/allinone:latest
    container_name: allinone
    restart: unless-stopped
    ports:
      - "35455:35455"
    command: ${ALLINONE_ARGS:?请先在 .env 中填写 ALLINONE_ARGS 授权参数}

  allinone_format:
    image: yuexuangu/allinone_format:latest
    container_name: allinone_format
    restart: unless-stopped
    ports:
      - "35456:35456"
    volumes:
      - /volume1/docker/iptv/format:/app/config
```

执行以下命令启动 `allinone_format`：

```bash
docker compose config --quiet
docker compose up -d allinone_format
docker compose logs --tail=100 allinone_format
```

### 配置输入源与获取新订阅链接

打开浏览器访问 `http://NAS_IP:35456` 进入整理服务后台。配置时注意区分三个地址：

| 地址角色             | 地址示例                          | 填写位置                           |
| -------------------- | --------------------------------- | ---------------------------------- |
| 整理后台管理页       | `http://NAS_IP:35456`             | 浏览器打开，用于调整分组与格式配置 |
| 原始 M3U 输入源      | `http://NAS_IP:35455/tv.m3u`      | 填入 `allinone_format` 的源配置框  |
| 整理后的输出订阅链接 | 页面生成的 M3U / TXT 专属订阅 URL | 复制后填入电视、手机或电脑播放器   |

填写输入源与调整分组时的注意事项：

- **填写局域网 IP**：在 `allinone_format` 中填写 Allinone 源地址时，使用 `http://NAS_IP:35455/tv.m3u`（不要填 `127.0.0.1`，因为容器内的 `127.0.0.1` 指向自身；也避免直接填 Docker 内部容器名 `allinone`，以免生成的列表流地址无法被电视客户端解析）。
- **优先选用 M3U 格式**：若播放器支持 M3U，优先复制整理后的 M3U 链接，以便完整保留台标（`tvg-logo`）、频道 ID（`tvg-id`）与分组信息；仅在电视直播壳只认 TXT 格式时才选用 TXT 订阅链接。
- **逐步调整规则**：先用默认分组导入播放器确认可播，再回到 `35456` 后台调整分组顺序、重命名或屏蔽频道，每次保存后在播放器刷新订阅即可。

## 播放器接入与节目单（EPG）

### 电脑、手机与电视客户端

- **电脑端**：推荐使用 [VLC][vlc]，通过“媒体 → 打开网络串流”粘贴订阅链接即可验证播放。
- **Apple 全平台（iPhone / iPad / Apple TV / Mac）**：可使用 [APTV][aptv] 等支持 M3U 与 EPG 的客户端，添加局域网订阅地址。
- **Android TV / 电视盒子**：选用支持自定义 M3U 或 TXT 订阅源的直播应用（如 TiviMate、Kodi IPTV Simple Client 或酷9等）。若遇到有声音无画面，可在播放器设置中将硬件解码切换为软件解码测试。

### 配置 XMLTV 节目单

M3U 列表负责提供频道流地址，而显示“当前正在播出什么节目”需要额外在播放器的 EPG 入口配置 XMLTV 节目单地址：

1. 在播放器的 EPG / 节目单设置中填入可用的 XMLTV 地址。
2. 播放器会通过 M3U 中的 `tvg-id` 或频道名称与 XMLTV 中的频道条目进行匹配；若个别频道未显示节目预告，可在客户端内手动绑定映射。
3. 若所有频道的节目时间整体快慢了若干小时，检查播放器内的 EPG 时区偏移设置即可，无需改动 NAS 系统时间。

## 远程访问与反向代理

日常在家庭局域网内观看最为稳定。若外出时需要访问家中的 IPTV 服务，优先推荐使用 Tailscale 或 WireGuard 等异地组网方式直连内网 IP（详见 [NAS 远程访问](/posts/nas-remote-access/)）。

若通过自有域名与 HTTPS 反向代理对外提供订阅，需确保 **M3U 列表内部每一条频道的流地址也同步替换为公网 HTTPS 域名**（若列表内仍为 `http://192.168.x.x:35455/...`，外网播放器下载列表后依然无法拉流）。Allinone 支持通过查询参数 `?url=` 指定列表内流地址的前缀（需对参数值进行 URL 编码）：

```text
https://iptv.example.com/tv.m3u?url=https%3A%2F%2Fiptv.example.com
```

配置反向代理后，先在浏览器下载该链接生成的 M3U 文件，用文本编辑器确认内部每条流地址的前缀均已替换为 `https://iptv.example.com`，且反向代理未附加网页表单认证（多数电视播放器不支持弹窗登录认证）。

## 更新与备份

日常备份建议保留：

- 项目目录下的 `compose.yaml` 与 `.env`（含 `ALLINONE_ARGS` 鉴权参数）。
- `allinone_format` 挂载的宿主机配置目录（如 `/volume1/docker/iptv/format`）。
- 更新前正常工作的旧镜像摘要（可通过 `docker image inspect` 查看，以便上游更新变更接口时随时回退）。

手动更新两个容器的命令如下：

```bash
docker compose pull allinone allinone_format
docker compose up -d allinone allinone_format
docker compose ps
docker compose logs --tail=100 allinone allinone_format
```

## 常见问题

| 现象                                 | 优先检查                                                                          |
| ------------------------------------ | --------------------------------------------------------------------------------- |
| Compose 提示 `ALLINONE_ARGS` 未设置  | 检查同目录 `.env` 是否已填入镜像名后的启动参数，或 NAS 面板是否已加载该变量       |
| Allinone 启动后不断重启              | 查看容器日志，核对参数格式、Token 鉴权是否有效及 `35455` 端口是否冲突             |
| 根路径有响应，但 `tv.m3u` 为空或报错 | 检查鉴权参数是否过期、容器出站网络与 DNS 是否能正常访问上游服务                   |
| `allinone_format` 拉取源列表失败     | 确认输入源填的是 `http://NAS_IP:35455/tv.m3u`，而非 `127.0.0.1`                   |
| 原始 M3U 能播，经过整理后不能播      | 用文本编辑器对比整理前后的频道流地址是否被改写为不可达的容器名或错误端口          |
| 电脑 VLC 能播，电视端无法播放        | 检查电视与 NAS 是否在同一网段、列表格式（M3U / TXT）是否匹配，尝试切换软硬解      |
| 外网能下载 M3U 列表，但点播全部失败  | 检查列表内的流地址是否仍为局域网 `192.168.x.x`，需使用 `?url=` 参数替换外网前缀   |
| 节目单（EPG）为空或时间错位          | 检查 XMLTV 链接是否可达、`tvg-id` 频道名称是否匹配，以及播放器的 EPG 时区偏移设置 |

## 参考资料

- 磕巴白菜：[绿联新系统部署肥羊 Allinone][keba-guide]。
- [Allinone Docker Hub 页面][allinone-image]、[镜像标签][allinone-tags]与[作者主页][allinone-author]。
- [FanchangWang/allinone_format][format-project]及其[镜像说明][format-image]。
- Docker：[Compose 变量插值][compose-interpolation]、[host 网络说明][docker-host]。
- [VLC 官方网站][vlc]、[APTV App Store 页面][aptv]。

[keba-guide]: https://hi.keba.host/archives/ugreen-iptv
[allinone-image]: https://hub.docker.com/r/youshandefeiyang/allinone
[allinone-tags]: https://hub.docker.com/r/youshandefeiyang/allinone/tags
[allinone-author]: https://github.com/youshandefeiyang
[format-project]: https://github.com/FanchangWang/allinone_format
[format-image]: https://hub.docker.com/r/yuexuangu/allinone_format
[compose-interpolation]: https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/
[docker-host]: https://docs.docker.com/engine/network/drivers/host/
[vlc]: https://www.videolan.org/vlc/
[aptv]: https://apps.apple.com/cn/app/aptv/id1630403500
