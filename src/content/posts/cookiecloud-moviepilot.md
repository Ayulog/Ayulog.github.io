---
title: CookieCloud：同步浏览器 Cookie，配合 MoviePilot 管理站点
description: 自建 CookieCloud，配置浏览器扩展与 MoviePilot 同步站点 Cookie，并排查同步失败。
author: Ayulog
pubDatetime: "2026-10-09T23:10:00+08:00"
draft: false
category: nas
tags:
  - MoviePilot
  - Docker
---

在日常浏览器中登录 PT 站点后，[MoviePilot](/posts/moviepilot-guide/) 需要使用同一份登录态才能执行搜索、订阅和种子抓取。[CookieCloud](https://github.com/easychen/CookieCloud) 通过浏览器扩展读取指定站点的 Cookie，在本地端对端加密后上传至服务端，再由 MoviePilot 定时拉取并解密更新。

整个同步链路分为两段：浏览器扩展按设定周期（默认 10 分钟）筛选域名、加密并上传 Cookie；MoviePilot 按自身周期（默认 1440 分钟，即一天）从服务端拉取密文并在本地解密。建议固定使用日常登录站点的那一个浏览器配置文件作为唯一上传源，避免多个浏览器共用同一 UUID 互相覆盖登录状态。相关家庭影音与 PT 工具见 [NAS 服务清单](/posts/nas-software-websites/) 与 [PT 工具清单](/posts/pt-software/)。

## Docker 部署服务端

官方公共测试服不保证长期可用性，若 NAS 已运行 Docker，建议在本地自建独立的 CookieCloud 服务端。

### 创建目录与 Compose 配置

在计划保存容器配置的位置创建目录：

```bash
mkdir -p cookiecloud/data
cd cookiecloud
```

创建 `compose.yaml`：

```yaml
services:
  cookiecloud:
    image: easychen/cookiecloud:latest
    restart: unless-stopped
    ports:
      - "8088:8088"
    volumes:
      - ./data:/data/api/data
```

这里将容器端口 `8088` 映射到宿主机（若宿主机 `8088` 已被占用，可改为 `"8089:8088"`），并将同步数据持久化到 `./data`（对应容器内的 `/data/api/data`）。启动容器并查看状态：

```bash
docker compose config
docker compose up -d
docker compose ps
docker compose logs --tail=100 cookiecloud
```

在浏览器访问 `http://NAS_IP:8088`（将 `NAS_IP` 替换为 NAS 局域网 IP），页面返回 `Hello World!` 即表示同步 API 服务已就绪。

### 确认服务端访问地址

浏览器扩展与 MoviePilot 需要连接到同一个 CookieCloud 实例，不同网络环境下的地址写法如下：

| 使用位置与网络条件                   | 填写的服务端根地址           |
| ------------------------------------ | ---------------------------- |
| 电脑浏览器访问 NAS 映射端口          | `http://NAS_IP:8088`         |
| MoviePilot 容器访问 NAS 映射端口     | `http://NAS_IP:8088`         |
| 两个容器加入同一个自定义 Docker 网络 | `http://cookiecloud:8088`    |
| 配置了域名、证书与 HTTPS 反向代理    | `https://cookie.example.com` |

若 CookieCloud 与 MoviePilot 分属不同 Compose 项目且未配置共享网络，两边统一填写 NAS 局域网地址 `http://NAS_IP:8088` 最为稳妥。

若计划将服务挂载在反向代理的子路径下（例如 `https://nas.example.com/cookie`），可在 `compose.yaml` 中增加环境变量：

```yaml
environment:
  API_ROOT: /cookie
```

配置中只需填写服务根地址，后续的 `/update`、`/get` 及 UUID 路径由客户端自动拼接。

## 配置浏览器扩展

在日常登录 PT 站点的浏览器配置文件中，通过 [Chrome 商店](https://chrome.google.com/webstore/detail/cookiecloud/ffjiejobkoibkjlhjnlgmcnnigeelbdl)、[Edge 商店](https://microsoftedge.microsoft.com/addons/detail/cookiecloud/bffenpfpjikaeocaihdonmgnjjdpjkeo) 或 [GitHub Releases](https://github.com/easychen/CookieCloud/releases) 安装 CookieCloud 扩展。

### 填写同步与筛选参数

| 扩展配置项             | 推荐设置                                       |
| ---------------------- | ---------------------------------------------- |
| 工作模式               | **上传到服务器**                               |
| 服务器地址             | 前面确认可用的 CookieCloud 根地址              |
| User KEY / UUID        | 使用扩展自动生成的值，保存后供 MoviePilot 填写 |
| 端对端加密密码         | 生成独立的随机密码，与 UUID 一并保存           |
| 加密算法 / 模式        | 保持默认的 **CryptoJS（动态 IV，legacy）**     |
| 同步域名关键词         | 填写需要交给 MoviePilot 的站点域名，一行一个   |
| 同步时间间隔           | 保持默认（10 分钟）                            |
| 是否同步 Local Storage | 仅同步站点 Cookie 时保持关闭                   |

配置时重点注意以下两项：

1. **域名关键词筛选**：扩展按域名子串匹配，留空时会上传除黑名单外的所有网站 Cookie。为避免将邮箱、网银等无关网站的登录态一并上传，请按行填入具体的站点完整域名（不含 `https://` 与路径），例如：
   ```text
   tracker.example.org
   pt.example.net
   ```
2. **加密模式兼容性**：扩展支持 `CryptoJS（动态 IV）` 和 `AES-128-CBC（固定 IV）` 两种模式。MoviePilot V3 的[解密实现](https://github.com/jxxghp/MoviePilot/blob/v3/app/foundation/crypto.py)采用旧版 CryptoJS 格式，因此需保持默认的 **CryptoJS（动态 IV，legacy）**。

### 执行首次上传

1. 在该浏览器中打开目标 PT 站点，确认处于已登录状态。
2. 在扩展中填好服务器地址、UUID、加密密码与域名关键词，工作模式选择“上传到服务器”（切勿选择用于从服务端反向写回的“覆盖到浏览器”）。
3. 点击保存并执行一次“手动同步”，确认提示上传成功。

## 接入 MoviePilot

### 填写站点同步配置

参照 MoviePilot V3 [配置说明](https://github.com/jxxghp/MoviePilot-Wiki/blob/main/configuration.md)，进入 **设定 → 系统 → 站点设置**，填写外部 CookieCloud 服务参数：

| 配置变量                   | 用途与填写方式                                         |
| -------------------------- | ------------------------------------------------------ |
| `COOKIECLOUD_HOST`         | 服务器地址：MoviePilot 容器可访问的 CookieCloud 根地址 |
| `COOKIECLOUD_KEY`          | 用户 KEY：浏览器扩展中的 User KEY / UUID               |
| `COOKIECLOUD_PASSWORD`     | 端对端加密密码：浏览器扩展中设置的加密密码             |
| `COOKIECLOUD_INTERVAL`     | 同步周期：默认 `1440` 分钟（一天）                     |
| `COOKIECLOUD_BLACKLIST`    | 域名黑名单：不希望自动新增站点的域名，用英文逗号分隔   |
| `COOKIECLOUD_ENABLE_LOCAL` | 内置本地服务开关：使用独立容器时保持 `false`           |

MoviePilot 侧的域名黑名单仅用于阻止自动新增指定站点，已有站点的更新及浏览器侧的上传范围仍由扩展中的“同步域名关键词”控制。

### 手动触发同步与连通性验证

保存设置后，进入 **设定 → 服务**，手动运行一次 **同步 CookieCloud 站点**，并在日志和站点管理列表中查看识别结果：

- **新增与更新规则**：对于受支持的新站点，MoviePilot 会自动添加并生成 RSS 与站点图标；对于已存在的站点，系统会根据当前连通性按需更新 Cookie。
- **补充专用凭据**：部分站点除 Cookie 外还要求配置 API Key、Passkey 或 Authorization，需进入对应站点的编辑页面补充完整。
- **应对 Cloudflare 与风控校验**：若站点启用了 Cloudflare 或绑定了浏览器指纹与出口 IP，需按[官方站点说明](https://github.com/jxxghp/MoviePilot-Wiki/blob/main/site.md)将 MoviePilot 的 User-Agent 设置为与上传端浏览器一致，并确保两者使用相同的网络出口。

完成站点连通性测试与一次搜索验证后，即可继续配置订阅与下载器整理，完整链路见 [DebNAS 媒体服务与自动化观影流程](/posts/debnas-media-workflow/)。

## 常见问题与维护

### 登录态更新与数据备份

日常使用只需保持上传端浏览器及扩展正常运行。当某个站点登录过期或失效时，按以下顺序刷新即可立即恢复：

1. 在上传端浏览器中重新登录该站点并完成验证。
2. 点击 CookieCloud 扩展中的“手动同步”上传最新 Cookie。
3. 在 MoviePilot 的“设定 → 服务”中手动运行“同步 CookieCloud 站点”，并测试站点连通性。

备份时保留 CookieCloud 服务端的 `./data` 目录，并在密码管理器中记录扩展的 UUID、加密密码及域名关键词列表。自建服务端建议限制在局域网或私有组网内访问；若需跨公网连接，应通过反向代理配置 HTTPS。当更换 UUID 或加密密码时，需在扩展与 MoviePilot 中同步修改并重新上传一次数据。

### 故障排查

| 现象                                  | 优先检查                                                                                      |
| ------------------------------------- | --------------------------------------------------------------------------------------------- |
| 扩展无法连接服务端                    | 服务地址与映射端口是否正确、电脑能否访问 NAS、防火墙及 HTTPS 证书状态                         |
| 浏览器打开根地址只显示 `Hello World!` | 正常现象，CookieCloud 服务端为纯 API 接口，无网页管理后台                                     |
| 扩展上传成功，但 MoviePilot 连接失败  | 检查 MoviePilot 容器能否访问所填地址；未共享 Docker 网络时改填 `http://NAS_IP:8088`           |
| 接口返回 `404`                        | 扩展是否已完成首次手动上传、两端 UUID 是否一致、`API_ROOT` 与反向代理路径是否匹配             |
| MoviePilot 日志提示解密失败           | 两端 UUID 与加密密码是否一致、扩展是否误选了固定 IV 加密模式                                  |
| 同步成功但未新增站点                  | 站点是否已存在、是否在 MoviePilot 支持列表内、是否被黑名单过滤，查看同步日志提示              |
| 浏览器已登录，MoviePilot 仍提示未登录 | 是否依次手动触发了扩展上传与 MoviePilot 同步；站点是否还需 API Key，以及 User-Agent 与出口 IP |
| 一段时间后站点频繁掉线                | 上传端电脑是否长期休眠、是否有多个浏览器使用同一 UUID 互相覆盖、站点本身是否回收了会话        |

## 参考资料

- [CookieCloud 项目与中文说明](https://github.com/easychen/CookieCloud/blob/main/README_cn.md)：项目用途、扩展入口、Docker 部署与 API。
- [CookieCloud 扩展配置界面源码](https://github.com/easychen/CookieCloud/blob/217612dd675d194db8036bc22e632173dc7ace34/ext/entrypoints/popup/App.tsx)：扩展工作模式、加密选项与默认设置。
- [CookieCloud 同步实现](https://github.com/easychen/CookieCloud/blob/217612dd675d194db8036bc22e632173dc7ace34/ext/utils/functions.ts)：域名关键词、黑名单与上传下载行为。
- [MoviePilot 项目](https://github.com/jxxghp/MoviePilot)、[配置说明](https://github.com/jxxghp/MoviePilot-Wiki/blob/main/configuration.md)与[站点说明](https://github.com/jxxghp/MoviePilot-Wiki/blob/main/site.md)。
- [MoviePilot V3 CookieCloud 接入实现](https://github.com/jxxghp/MoviePilot/blob/v3/app/adapters/external/cookiecloud.py)、[解密实现](https://github.com/jxxghp/MoviePilot/blob/v3/app/foundation/crypto.py)与[站点同步流程](https://github.com/jxxghp/MoviePilot/blob/v3/app/chain/site.py)。
