---
title: CookieCloud：同步浏览器 Cookie，配合 MoviePilot 管理站点
description: 介绍 CookieCloud 的同步原理、Docker Compose 部署与浏览器扩展配置，说明如何接入 MoviePilot，以及地址、加密模式、Cookie 失效和站点同步的常见问题。
author: Ayulog
pubDatetime: "2026-10-09T23:10:00+08:00"
draft: false
setupCategory: nas
tags:
  - CookieCloud
  - MoviePilot
  - NAS
  - Docker
  - PT
---

[CookieCloud](https://github.com/easychen/CookieCloud) 从浏览器读取指定站点的 Cookie，加密后上传到服务端。[MoviePilot](/posts/2026-10-10-moviepilot-guide/) 再拉取这些数据，更新受支持站点的登录信息。

下面分别配置上传端、服务端和 MoviePilot。扩展版本与商店更新可能不同，加密选项要与 MoviePilot V3 的支持情况一致。相关软件放在 [NAS 总篇](/posts/2026-10-09-nas-software-websites/)，PT 下载与做种工具见 [PT 总篇](/posts/2026-10-09-pt-software/)。

## 目录

- [CookieCloud 解决什么问题](#cookiecloud-解决什么问题)
- [先弄清楚同步方向](#先弄清楚同步方向)
- [用 Docker Compose 部署服务端](#用-docker-compose-部署服务端)
- [配置浏览器扩展](#配置浏览器扩展)
- [接入 MoviePilot](#接入-moviepilot)
- [日常更新与备份](#日常更新与备份)
- [常见问题](#常见问题)
- [参考资料](#参考资料)

## CookieCloud 解决什么问题

Cookie 是网站保存在浏览器里的数据，其中一部分用来识别登录会话。浏览器每次访问网站时携带它们，网站就能判断当前用户是否已经登录。

CookieCloud 可以同步 **Cookie**，也支持同步网站的 **Local Storage**。后者是另一种浏览器本地存储，有些网站会把状态或令牌放在那里。两者不是同一种数据，接收工具也不一定都会使用。

它比较适合两类情况：

- 把日常浏览器里的站点 Cookie 提供给 MoviePilot 等明确支持 CookieCloud 的工具。
- 在明确指定的浏览器之间，按一个上传端、其他下载端的方式同步所需网站的数据。

CookieCloud 不负责注册站点、输入账号密码或完成验证码，也不会让已经失效的登录会话重新有效。网站改用 API Key、额外令牌或其他认证方式时，仍要按目标工具和站点的要求配置。

对于媒体服务，它位于**站点登录信息维护**这一环。资源搜索、订阅、下发下载和文件整理仍由 MoviePilot 与下载器完成；115、CMS、Emby 的连接与授权也有各自的配置，不能用一组 CookieCloud 凭据代替。

## 先弄清楚同步方向

与 MoviePilot 配合时，可以把整个过程分成两段：

```text
日常浏览器：登录站点，取得有效 Cookie
    ↓ CookieCloud 扩展筛选域名、加密、上传
CookieCloud 服务端：保存同步数据
    ↓ MoviePilot 按配置拉取并解密
MoviePilot：识别受支持站点，添加或更新站点信息
    ↓
站点连通性测试 → 搜索、订阅与下载联动
```

浏览器扩展负责上传，MoviePilot 负责拉取，**两边的同步周期分别设置**。扩展显示上传成功，只能说明上传这一步完成；还要让 MoviePilot 执行同步，再检查站点是否真正可用。

建议先固定一个日常使用的浏览器配置文件作为上传源。相同 UUID 对应同一份服务端数据，多台浏览器同时向它上传，可能互相覆盖，旧登录状态也可能盖掉新状态。浏览器完全退出、电脑休眠或扩展未运行时，不会继续产生新的上传。

正常使用客户端加密、接收端解密的流程时，服务端保存的是密文。上游 API 也提供传入密码、由服务端解密的方式，因此不要把“支持端对端加密”理解成任意调用方式都不会让服务端接触密码。

## 用 Docker Compose 部署服务端

CookieCloud 可以使用已有服务，也可以自己部署。官方测试服务不承诺稳定性；如果 NAS 已经运行 Docker，可以把服务端一起放在自己的设备上。

下面采用 **独立 CookieCloud 容器**，便于理解浏览器和 MoviePilot 分别连接哪里。示例适用于 Debian、DebNAS 等 Linux Docker 环境，使用 Docker Compose V2。

### 创建目录和 Compose 文件

在计划保存应用配置的位置执行：

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

这里的 `8088` 是服务端口，`./data` 保存服务端同步数据。挂载路径采用上游 Docker 示例的 `/data/api/data`，不能随意换成 `/config`。

端口映射默认发布到宿主机的网络接口。本文先在可信局域网内使用，不需要在路由器上做公网端口转发；远程访问可以走私有组网，或另外配置 HTTPS 反向代理与访问限制。

启动并查看状态：

```bash
docker compose config
docker compose up -d
docker compose ps
docker compose logs --tail=100 cookiecloud
```

浏览器访问 `http://NAS_IP:8088`，将 `NAS_IP` 换成 NAS 的实际局域网地址。上游服务根路径会返回类似 `Hello World!` 的文本；它是一个同步 API 服务，没有账号注册或站点管理后台。

如果宿主机的 `8088` 已被占用，例如被其他管理面板使用，可以改成 `"8089:8088"`。这时浏览器连接 `http://NAS_IP:8089`，容器内部端口仍是 `8088`。

### 浏览器与容器看到的地址可能不同

| 使用位置与条件                         | 可填写的服务端地址           |
| -------------------------------------- | ---------------------------- |
| 浏览器能访问 NAS 映射端口              | `http://NAS_IP:8088`         |
| MoviePilot 容器能访问 NAS 映射端口     | `http://NAS_IP:8088`         |
| 两个容器共用可解析服务名的 Docker 网络 | `http://cookiecloud:8088`    |
| 已配置域名、证书与 HTTPS 反向代理      | `https://cookie.example.com` |

这几种地址可以指向同一个服务。两边的地址不必长得完全一样，但最终必须访问**同一份 CookieCloud 数据**。

单独执行两份 Compose，默认并不会让它们共享网络。没有配置共同网络时，不要直接把服务名 `cookiecloud` 填进另一组容器；先使用可达的 NAS 地址更容易排错。

同样，容器里的 `127.0.0.1` 指向该容器自身；电脑上的 `127.0.0.1` 指向电脑自身。除非服务确实运行在那里，否则不能用它代替 NAS 地址。

### 需要子路径时再设置 API_ROOT

如果准备通过 `https://nas.example.com/cookie` 访问，可在服务配置中增加：

```yaml
environment:
  API_ROOT: /cookie
```

`environment` 与 `ports`、`volumes` 同级。重新应用 Compose 后，扩展与 MoviePilot 都要使用包含 `/cookie` 的服务地址；反向代理也要与服务端的路径设置一致。

**填写的是服务根地址，不要手动拼上 `/update`、`/get` 或 UUID。** 客户端会自行组合上传和下载接口。没有子路径需求时，保持前面的基础配置即可。

## 配置浏览器扩展

从项目 README 提供的 [Chrome 商店](https://chrome.google.com/webstore/detail/cookiecloud/ffjiejobkoibkjlhjnlgmcnnigeelbdl)、[Edge 商店](https://microsoftedge.microsoft.com/addons/detail/cookiecloud/bffenpfpjikaeocaihdonmgnjjdpjkeo) 安装，也可以按 [Releases](https://github.com/easychen/CookieCloud/releases) 的说明手动安装。扩展要装在平时登录目标站点的那个浏览器配置文件里。

### 先填好这几项

| 扩展配置               | 本文建议                                               |
| ---------------------- | ------------------------------------------------------ |
| 工作模式               | **上传到服务器**                                       |
| 服务器地址             | 前面实际可访问的 CookieCloud 根地址                    |
| User KEY / UUID        | 使用扩展生成的值，保存下来供 MoviePilot 使用           |
| 端对端加密密码         | 生成独立的随机密码，与 UUID 一起妥善保存               |
| 同步域名关键词         | 只填写需要交给 MoviePilot 的站点域名，一行一个         |
| 同步时间间隔           | 先保持扩展默认值，当前源码默认是 10 分钟               |
| 是否同步 Local Storage | 本文的 Cookie 接入场景先关闭，其他集成确有需要时再开启 |

UUID 是这份同步数据的标识，加密密码用于解密数据。它们都不是 PT 站点账号密码，也不是 MoviePilot 管理员账号密码。

域名关键词示例：

```text
tracker.example.org
pt.example.net
```

以上是占位域名，使用时替换成实际站点域名，不带 `https://`、端口或页面路径。这里按域名中是否包含关键词筛选，不是严格的域名白名单匹配，因此不要只填 `pt` 这种过于宽泛的词。

当前扩展在关键词留空时，会同步除黑名单匹配项以外的 Cookie；配置关键词后，黑名单不参与这一轮筛选。只为 MoviePilot 同步时，明确填写需要的域名，避免把邮箱、购物或其他无关网站的登录信息一并带过去。

### 加密模式先确认兼容性

当前扩展提供 `CryptoJS（动态 IV）` 和 `AES-128-CBC（固定 IV）` 两种模式。本文核对的 MoviePilot V3 [解密实现](https://github.com/jxxghp/MoviePilot/blob/v3/app/foundation/crypto.py)要求旧版 CryptoJS 的数据格式，因此应选择默认的 **CryptoJS（动态 IV，legacy）**。固定 IV 模式不适用于这份实现。

服务端可以收到密文，不代表接收工具一定能解密该格式。升级扩展、切换算法后出现解密失败时，除了核对 UUID 和密码，也要核对 MoviePilot 对该加密模式的支持。

### 完成第一次上传

1. 在安装扩展的浏览器中打开目标站点，确认当前已经登录。
2. 填好服务地址、UUID、加密密码和域名关键词，选择“上传到服务器”。
3. 保存配置，再执行一次“手动同步”，确认扩展报告成功。
4. 保留这组 UUID 和加密密码，接下来填入 MoviePilot。

用于日常登录的浏览器不要选“覆盖到浏览器”。该模式用于从服务端下载数据并写回浏览器，可能影响本机现有登录状态。与 MoviePilot 配合时，上传模式已经足够。

## 接入 MoviePilot

### 将两端配置对应起来

按当前 V3 [配置说明](https://github.com/jxxghp/MoviePilot-Wiki/blob/main/configuration.md)，进入 **设定 → 系统 → 站点设置**，找到 CookieCloud 配置。旧版界面的入口可能不同，可以搜索 CookieCloud 定位。

本文已经独立部署 CookieCloud，因此使用外部服务端地址，不开启 MoviePilot 的本地 CookieCloud 服务。主要配置对应如下：

| 配置变量                   | 用途与填写方式                                          |
| -------------------------- | ------------------------------------------------------- |
| `COOKIECLOUD_HOST`         | 服务器地址：填写 MoviePilot 能访问的 CookieCloud 根地址 |
| `COOKIECLOUD_KEY`          | 用户 KEY：填写扩展中的 User KEY / UUID                  |
| `COOKIECLOUD_PASSWORD`     | 密码：填写扩展中的端对端加密密码                        |
| `COOKIECLOUD_INTERVAL`     | 同步间隔：MoviePilot 拉取周期，单位为分钟               |
| `COOKIECLOUD_BLACKLIST`    | 域名黑名单：不希望自动新增的域名，多个用英文逗号分隔    |
| `COOKIECLOUD_ENABLE_LOCAL` | 本地服务开关：本文独立服务方案保持 `false`              |

变量名便于对照官方文档，不要求同时在页面和 Compose 中重复填写。采用环境变量配置时，也应沿用现有部署方式，避免多个来源的配置互相覆盖。

官方配置表中 MoviePilot 的同步间隔默认是 **1440 分钟，也就是一天**；它与扩展默认的 10 分钟不是同一个参数。初次接入或刚重新登录站点时，直接手动同步即可，不必把两个周期都改得很短。

当前 MoviePilot 同步流程中的黑名单主要用于阻止新增站点，不应把它当作已有站点停止更新的开关。它也不会阻止浏览器上传相关 Cookie；控制上传范围，仍然要在浏览器扩展里设置域名关键词。

### 先手动跑通，再等待定时同步

保存配置后，按官方站点说明进入 **设定 → 服务**，运行 **同步 CookieCloud 站点**。如果当前界面调整过位置，以服务或任务列表里的同名功能为准。

检查同步日志及站点列表，确认目标站点被识别和处理。对于受支持且通过相应检查的站点，MoviePilot 会尝试自动添加，并可能生成 RSS、下载站点图标。对于已有站点，当前实现会根据连通性决定是否更新 Cookie；站点访问正常时可能跳过更新，并不是每次同步都强制覆盖。

如果浏览器已经登录，扩展上传也成功，但 MoviePilot 没有新增站点，先看它是否已有该站点、是否识别该域名、是否被黑名单排除，以及日志有没有说明跳过原因。仅有域名 Cookie，不等于 MoviePilot 已经支持该站点。

### 检查的是站点能否使用

同步完成后，还要在 MoviePilot 中测试站点连通性，尝试一次该站点支持的搜索，并检查日志中的认证结果。

部分站点依赖 API Key、Authorization 或专用接口，需要在站点编辑页面补充对应配置。MoviePilot 的站点支持与用户认证要求，也应单独按当前官方文档完成。

遇到 Cloudflare 等访问验证时，Cookie 可能与浏览器的 User-Agent、网络出口 IP 或其他会话条件相关。按官方建议，让 MoviePilot 使用与获取 Cookie 时相匹配的 User-Agent，并检查浏览器和 MoviePilot 实际使用的网络出口；这些条件匹配也不能保证所有验证都会通过。

CookieCloud 负责搬运已有登录数据，不会代替浏览器完成人机验证。站点不可用时，应先回浏览器确认能正常登录，再判断是同步问题、网络问题，还是站点适配问题。

站点这一环跑通后，再继续配置下载器、订阅和媒体目录。后续的整理与入库关系，可以接着看 [DebNAS 媒体服务与自动化观影流程](/posts/2026-10-09-debnas-media-workflow/)。

## 日常更新与备份

平时保持上传端扩展正常运行即可。如果某个站点登录失效，按下面的顺序更新，比只在 MoviePilot 里反复点击同步更有效：

1. 在上传端浏览器重新登录站点，完成必要验证。
2. 在 CookieCloud 扩展里执行一次手动同步。
3. 在 MoviePilot 里运行一次 CookieCloud 站点同步。
4. 重新测试站点连通性和搜索。

扩展里的 Cookie 过期时间、保持活跃等设置，也不能改变网站服务端对登录会话的判定。延长浏览器侧保存时间，不代表网站会永久接受这份 Cookie。

备份时保留服务端的 `data` 目录，并单独保存扩展使用的 UUID、加密密码及必要配置。只有服务端密文、没有正确密码，不能完成正常解密；只有密码、没有可用同步数据，也不会凭空恢复网站登录。

Cookie、UUID 和密码不要放进公开仓库、截图或排错日志。服务端根路径能打开，也不表示它有完整的账号鉴权机制；自建服务仍应限制访问范围，跨公网使用时配置 HTTPS。

修改 UUID 或加密密码后，需要让上传端与 MoviePilot 一起更新，再重新上传。若怀疑 Cookie 已泄露，还应在对应网站撤销会话或退出其他设备；仅更换 CookieCloud 密码不能撤销网站已经签发的会话。

## 常见问题

| 现象                                  | 优先检查                                                                                         |
| ------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 扩展无法连接服务端                    | 地址和映射端口是否正确，电脑是否能访问 NAS，防火墙和 HTTPS 证书是否正常                          |
| 打开根地址只看到一行文本              | 这是正常的 API 响应，不是缺少网页管理后台                                                        |
| 扩展上传成功，MoviePilot 连接失败     | 从 MoviePilot 容器的网络环境核对地址；不要误填 `127.0.0.1` 或未共享网络的服务名                  |
| 接口返回 404                          | 是否第一次上传尚未成功，UUID 是否一致，`API_ROOT` 与反向代理路径是否匹配                         |
| MoviePilot 提示解密失败               | UUID、密码是否与上传端一致，是否误切换固定 IV 加密模式，旧数据是否已重新上传                     |
| 同步成功但没有新增站点                | 是否已存在、是否被过滤、是否支持该域名，以及同步日志给出的原因                                   |
| 浏览器能登录，MoviePilot 仍提示未登录 | Cookie 是否刚更新，站点是否还需 API Key / Authorization，以及 User-Agent、出口 IP 和访问验证条件 |
| 修改同步间隔后没有马上更新            | 浏览器上传与 MoviePilot 拉取是两套周期；分别手动执行一次确认                                     |
| 一段时间后又失效                      | 上传端是否关闭或休眠、是否有多个上传端互相覆盖、网站是否已撤销登录会话                           |

CookieCloud 报错时依次检查浏览器登录、扩展上传、服务端响应和 MoviePilot 解密；同步结束后仍要测试站点实际访问。

## 参考资料

- [CookieCloud 项目与中文说明](https://github.com/easychen/CookieCloud/blob/main/README_cn.md)：项目用途、扩展入口、Docker 部署与 API。
- [CookieCloud 扩展配置界面源码](https://github.com/easychen/CookieCloud/blob/217612dd675d194db8036bc22e632173dc7ace34/ext/entrypoints/popup/App.tsx)：本次核对的工作模式、加密选项与默认设置。
- [CookieCloud 同步实现](https://github.com/easychen/CookieCloud/blob/217612dd675d194db8036bc22e632173dc7ace34/ext/utils/functions.ts)：域名关键词、黑名单与上传下载行为。
- [MoviePilot 项目](https://github.com/jxxghp/MoviePilot)：当前版本与官方文档入口。
- [MoviePilot 配置说明](https://github.com/jxxghp/MoviePilot-Wiki/blob/main/configuration.md)：CookieCloud 配置字段与默认值。
- [MoviePilot 站点说明](https://github.com/jxxghp/MoviePilot-Wiki/blob/main/site.md)：同步服务、站点配置、User-Agent 与认证说明。
- [MoviePilot V3 CookieCloud 接入实现](https://github.com/jxxghp/MoviePilot/blob/v3/app/adapters/external/cookiecloud.py)与[解密实现](https://github.com/jxxghp/MoviePilot/blob/v3/app/foundation/crypto.py)：拉取方式与加密格式兼容性。
- [MoviePilot V3 站点同步流程](https://github.com/jxxghp/MoviePilot/blob/v3/app/chain/site.py)：已有站点更新、新增站点与黑名单的处理顺序。
