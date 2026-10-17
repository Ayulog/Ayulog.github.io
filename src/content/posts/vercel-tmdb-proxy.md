---
title: TMDB 代理：Vercel 部署与媒体软件设置
description: 部署 tmdb-proxy 到 Vercel，绑好域名、验证 API 与图片，再接入 MoviePilot、Emby。
author: Ayulog
pubDatetime: "2026-10-10T10:00:00+08:00"
draft: false
category: library
tags:
  - MoviePilot
  - Emby
---

影片命名没有问题，海报和简介却仍然读不出来时，先分别检查 TMDB API 与图片服务。确认是连接问题，应用又支持自定义 TMDB 地址，再考虑部署反向代理。

[imaliang/tmdb-proxy](https://github.com/imaliang/tmdb-proxy) 可以部署到自己的 Vercel 账号，再绑定域名。部署后先验证 API，再验证图片，两项都通过才改 MoviePilot 和 Emby 插件的 TMDB 地址；其他家庭影音工具见 [NAS 服务清单](/posts/nas-software-websites/)。

## 这个代理解决什么问题

TMDB 的两类请求分别负责不同内容：

| 原始服务             | 用途                           |
| -------------------- | ------------------------------ |
| `api.themoviedb.org` | 搜索、电影详情、剧集信息等 API |
| `image.tmdb.org`     | 海报、背景图、人物照片         |

请求流程可以理解为：

```text
MoviePilot / 支持替代地址的媒体插件
                  ↓
       https://tmdb.example.com
                  ↓
        Vercel 上的 tmdb-proxy
          ├─ API → api.themoviedb.org
          └─ 图片 → image.tmdb.org
```

这个项目只转发 TMDB 请求，不负责影片下载、视频播放或媒体文件整理。代理也不会自动获得 TMDB 的访问权限：原来需要 API Key 或访问令牌的请求，经过代理后仍然需要。

### 免费指的是哪一部分

Vercel 的 Hobby 计划面向个人、非商业用途，并有资源额度和使用限制；域名通常需要另外购买或续费。上游 README 提到的流量数字不能当作永久承诺，实际以 [Hobby 文档](https://vercel.com/docs/plans/hobby)和控制台 Usage 为准。

默认的 `*.vercel.app` 地址可以用来检查部署，但它在你的 NAS 所在网络中未必可达。自定义域名便于管理，也需要实际测试连通性，不能保证所有地区、运营商和时间段都稳定。

### 当前项目怎样转发请求

核对的上游版本为 `5e846505`，其实现有三个要点：

- 根路径 `/` 会重定向到项目的 GitHub 页面。
- `/t/p/` 开头的图片请求通过 Vercel rewrite 转发给 `image.tmdb.org`。
- 其他路径交给 `api/tmdb.js`，函数向 `api.themoviedb.org` 发出 GET 请求，并转发传入的 `Authorization` 请求头。

API 函数还带有进程内缓存。因此，打开首页跳到 GitHub 是预期行为，与 API、图片是否正常无关。

## 部署前准备

先准备以下内容：

1. **GitHub 账号**：用于保存自己的项目副本。
2. **Vercel 账号**：可以按平台提示关联 GitHub，选择适合个人用途的计划。
3. **可以管理 DNS 的域名**：这里用 `tmdb.example.com` 演示，实际操作时换成自己的子域名。
4. **支持替代 TMDB 地址的应用**：例如 MoviePilot，或者具备相应功能且版本兼容的 Emby 插件。
5. **用于测试的 TMDB 凭据**：在 TMDB 账号的 API 设置中申请或查看；下文使用 API Read Access Token。

先确认应用提供的是“TMDB API 域名”“图片域名”或类似设置。`HTTP_PROXY`、`HTTPS_PROXY`、SOCKS 代理地址是另一类配置，不能直接填这里的反向代理域名。

## 把项目部署到 Vercel

### 方法一：使用上游部署按钮

打开 [tmdb-proxy 项目](https://github.com/imaliang/tmdb-proxy)，在 README 中点击 **Deploy with Vercel**，或使用上游提供的[部署入口](https://vercel.com/import/project?template=https://github.com/imaliang/tmdb-proxy)。

按照页面提示关联 GitHub、创建自己的仓库和 Vercel 项目，然后部署。仓库可以命名为 `tmdb-proxy`，也可以使用其他便于识别的名称。

这一过程不需要先租 VPS，也不需要在 NAS 上安装 Nginx。

### 方法二：Fork 后导入

想先查看代码，可以按下面的顺序操作：

1. 在 GitHub 上 Fork `imaliang/tmdb-proxy`。
2. 登录 Vercel，选择 **Add New → Project**，导入自己的仓库。
3. 项目根目录保持为仓库根目录，框架预设使用 **Other**（如果页面要求选择）。
4. 不额外填写不存在的构建命令或输出目录；若需要覆盖 Build Command，启用 Override 后留空，跳过构建。点击 **Deploy**。
5. 等待部署完成，在 Deployments 中确认状态为 **Ready**；失败时查看构建日志。

导入的仓库应至少包含以下文件：

```text
tmdb-proxy/
├── api/
│   └── tmdb.js
├── package.json
└── vercel.json
```

**复制整个仓库，而不是只拿 `vercel.json`。** 当前项目的 API 转发依赖函数文件以及 `package.json` 中的依赖；缺少它们，图片与 API 可能出现不同的结果。

当前代码没有要求在 Vercel 环境变量里预设 `TMDB_API_KEY`。凭据由客户端随请求传入，后面的测试命令也是如此；不需要把自己的 Key 写进公开仓库。

## 绑定域名与配置 DNS

在 Vercel 项目中打开 **Settings → Domains**，添加自己的子域名，例如：

```text
tmdb.example.com
```

将它关联到生产环境，再去域名的 DNS 服务商处添加 Vercel 提示的记录。

### 记录类型和值要一一对应

| Vercel 提示的类型 | DNS 中填写的内容        | 注意                                       |
| ----------------- | ----------------------- | ------------------------------------------ |
| `CNAME`           | Vercel 给出的目标主机名 | 通常用于子域名；目标不带 `https://` 和路径 |
| `A`               | Vercel 给出的 IPv4 地址 | 不能把别名域名填进 A 记录的值              |
| `TXT`             | Vercel 给出的验证文本   | 仅在要求验证域名归属时添加                 |

**照自己项目当前显示的记录填写，不照抄教程里的固定 IP 或 CNAME。** Vercel 可能为项目提供特定的记录值。

使用 Cloudflare 管理 DNS 时，初次接入可以先选 **DNS only（灰云）**，让请求直接到 Vercel，减少排查环节。检查同一个子域名上是否存在冲突的 A、AAAA 或 CNAME 记录；只处理这个子域名，不改动其他服务的解析。

保存后回到 Vercel，等待域名配置验证通过和 HTTPS 证书签发。证书仍在等待时，先检查 DNS 和控制台提示；不要用关闭证书校验来掩盖配置错误。

### 使用生产域名

应用里填写绑定好的生产域名，不使用某次提交生成的临时 Preview URL。

在退出 Vercel 登录状态的浏览器中访问测试路径，确认没有 Vercel 登录页、密码页或验证挑战。遇到这些页面时，检查域名关联的环境与 **Deployment Protection**；媒体应用通常不能代替你完成交互登录。

## 分别验证 API 和图片

最好从 **NAS 所在网络**测试。电脑可以访问而容器不能访问时，还需要检查容器自己的 DNS、网络出口或代理配置。

以下命令适用于 Linux / macOS 的终端；Windows 可使用 WSL。将域名与令牌占位符替换为自己的值，测试结果不要连同真实令牌公开。

### 验证 API

TMDB v3 支持查询参数 `api_key`，也支持在请求头中携带 Bearer Token。下面使用后者：

```bash
curl --fail-with-body --show-error --silent \
  --max-time 30 \
  --header 'Authorization: Bearer REPLACE_WITH_TMDB_READ_ACCESS_TOKEN' \
  'https://tmdb.example.com/3/movie/550?language=zh-CN'
```

这里填的是 **API Read Access Token**，不要把它和较短的 API Key 混用。正常结果应是电影详情 JSON，包含 `id`、`title`、`poster_path` 等字段；本例中的 `id` 应为 `550`。

再请求一次配置接口：

```bash
curl --fail-with-body --show-error --silent \
  --max-time 30 \
  --header 'Authorization: Bearer REPLACE_WITH_TMDB_READ_ACCESS_TOKEN' \
  'https://tmdb.example.com/3/configuration'
```

该接口可以查看图片尺寸等配置信息。代理不会自动把响应 JSON 中所有 TMDB 地址改成你的域名，应用是否使用图片代理，还取决于它自己的图片域名设置。

### 验证图片

从电影详情中找出一个非空的 `poster_path`。假设返回值为 `/实际海报文件名.jpg`，图片地址就组合为：

```text
https://tmdb.example.com/t/p/w500/实际海报文件名.jpg
```

`w500` 是 TMDB 常见的海报尺寸，支持的尺寸可从前面的配置接口核对。把真实图片地址放进浏览器，或者下载检查：

```bash
curl --fail --show-error --location \
  --max-time 30 \
  --output tmdb-poster.jpg \
  'https://tmdb.example.com/t/p/w500/REPLACE_WITH_ACTUAL_POSTER_FILENAME.jpg'
```

打开下载的文件，应能看到海报。这里的文件名是占位符，必须换成 API 返回的实际值，再打开确认内容。

API 和图片两项都通过之后，再配置媒体应用。

## 接入 MoviePilot 与 Emby

### MoviePilot

MoviePilot 当前配置说明将 TMDB 设置放在 **设定 → 系统 → 进阶设置**。API 与图片需要分别设置：

| 配置项              | 示例值             |
| ------------------- | ------------------ |
| `TMDB_API_DOMAIN`   | `tmdb.example.com` |
| `TMDB_IMAGE_DOMAIN` | `tmdb.example.com` |

默认 API 域名为 `api.themoviedb.org`，图片域名为 `image.tmdb.org`；恢复配置时分别填回原值。

这两个配置项填写**裸域名**，不带 `https://`，也不带 `/3`、`/t/p` 或末尾斜杠。MoviePilot V3 会在请求时拼接协议和路径，填完整 URL 可能造成重复。

先记录原值，再修改并按页面提示保存、重启或使设置生效。随后搜索一部电影、识别一个测试文件，并检查海报是否正常显示。只看到文字信息时，重点检查图片域名与 `/t/p/` 路由。

MoviePilot 的部署与媒体目录安排可参照本站[《MoviePilot：从部署到订阅、整理与进阶配置》](/posts/moviepilot-guide/)。

### Emby 与 StrmAssistant

StrmAssistant（神医助手）提供 **替代 TMDB 配置**功能，可用来接入代理。这是插件功能，需要核对所用版本的支持情况。

操作前先查看[插件官方说明](https://github.com/sjtuross/StrmAssistant/wiki/替代-TMDB-配置)，并核对当前插件分支支持的 Emby 与 MovieDb 插件版本。旧教程使用的插件文件不一定适合最新 Emby。

安装兼容版本后，在 **替代 TMDB 配置**中填写自己的代理地址。官方页面示例使用包含协议的完整地址，例如 `https://tmdb.example.com`，不要直接照搬 MoviePilot 的裸域名格式；字段名和格式参考所安装版本的说明。TMDB 凭据需要填写时，使用自己的有效凭据。

保存后，选择**一部测试影片**刷新元数据，确认标题、简介和海报都能获取，再决定是否扩大刷新范围。已有手工修改的简介、图片或本地 NFO 时，先保留备份；“替换所有元数据”可能覆盖人工整理结果。

### 应用没有自定义 TMDB 地址怎么办

先查找该应用当前支持的插件或网络代理方案；它能不能换 TMDB 域名，要看应用自己的设置项。

尤其不要把 `api.themoviedb.org` 的 hosts 记录直接指向 Vercel 的 IP：hosts 只改变域名解析，HTTPS 请求中的域名、证书校验以及 Vercel 的站点路由不会因此变成 `tmdb.example.com`。Docker 的 `extra_hosts` 也不能完成这种 URL 替换。

## 常见问题

| 现象                             | 优先检查                                                                   |
| -------------------------------- | -------------------------------------------------------------------------- |
| 打开根地址跳到 GitHub            | 这是上游配置的重定向，继续测试 `/3/movie/550` 和实际图片路径               |
| 域名解析失败、连接超时           | DNS 记录是否正确，以及 NAS、容器能否连接自己的域名                         |
| HTTPS 证书错误                   | Vercel 域名验证与证书状态，设备时间是否正确                                |
| 返回 Vercel 登录页或 HTML        | 是否误用了 Preview 地址，生产域名是否受到部署保护                          |
| API 返回 `401`                   | TMDB 凭据是否有效，Bearer Token 与 API Key 是否混用；确认响应确实来自 TMDB |
| API 返回 `404`                   | `/3` 和后续接口路径是否完整，域名字段是否误带路径                          |
| API 返回 `500`、`502` 或函数错误 | Vercel Functions 日志、依赖安装、上游连接与平台资源限制                    |
| 文字信息正常，海报失败           | 图片域名是否配置，`poster_path` 是否有效，是否保留 `/t/p/尺寸/文件名`      |
| 出现 `429`                       | TMDB 或平台可能限流，降低并发、稍后重试并检查用量                          |
| 电脑正常，NAS 应用失败           | 容器网络、应用实际生效的配置和日志，而不只看电脑浏览器                     |

排错时一次改一个环节。必要时在同一设备上对比原始 TMDB 地址和代理地址：原始接口正常而代理失败，就优先查看 Vercel；两者都失败，则继续区分网络与凭据问题。

## 日常维护与恢复

这个方案省去了自己维护服务器的工作，但仍需关注域名续费、Vercel 用量、部署状态以及上游更新。批量刷新整个媒体库会产生大量图片请求，建议先验证单片，再逐步扩大范围。

当前上游函数主要用于 GET 元数据请求，虽然 CORS 声明包含 POST，实际转发调用仍是 `axios.get`。另外，缓存键只使用请求 URL，未按 `Authorization` 区分账号，因此不要把它直接扩展成处理多账号私有数据或账户写入操作的通用 TMDB 网关。

更新前查看自己的 Fork 与上游差异，更新后重新验证一条 API 请求和一张图片。如果需要停用，先把 MoviePilot 或插件中的 API、图片地址恢复为原值，确认应用已不再使用代理，再处理 Vercel 项目和对应子域名解析。

## 参考资料

- imaliang：[tmdb-proxy 项目与部署说明](https://github.com/imaliang/tmdb-proxy)
- 本文核对版本：[路由配置](https://github.com/imaliang/tmdb-proxy/blob/5e846505bb62c85b9dd2e48fdeae91430a01efea/vercel.json)、[API 转发函数](https://github.com/imaliang/tmdb-proxy/blob/5e846505bb62c85b9dd2e48fdeae91430a01efea/api/tmdb.js)
- Vercel：[Hobby 计划](https://vercel.com/docs/plans/hobby)、[构建设置](https://vercel.com/docs/builds/configure-a-build)、[为项目添加域名](https://vercel.com/docs/domains/working-with-domains/add-a-domain)、[SSL 证书](https://vercel.com/docs/domains/working-with-ssl)、[Deployment Protection](https://vercel.com/docs/deployment-protection)
- TMDB：[应用认证](https://developer.themoviedb.org/docs/authentication-application)、[图片路径](https://developer.themoviedb.org/docs/image-basics)、[API 使用与署名要求](https://developer.themoviedb.org/docs/faq)
- MoviePilot：[配置参考](https://github.com/jxxghp/MoviePilot-Wiki/blob/main/configuration.md)、[V3 API 地址拼接](https://github.com/jxxghp/MoviePilot/blob/v3/app/modules/themoviedb/tmdbv3api/tmdb.py)、[V3 图片地址拼接](https://github.com/jxxghp/MoviePilot/blob/v3/app/runtime/config.py)
- StrmAssistant：[替代 TMDB 配置](https://github.com/sjtuross/StrmAssistant/wiki/替代-TMDB-配置)
