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

当影片命名规范，但媒体库刮削仍无法获取简介或海报时，通常是 NAS 访问 TMDB 的 API 或图片服务受阻。若所使用的应用支持自定义 TMDB 域名，可将 [imaliang/tmdb-proxy](https://github.com/imaliang/tmdb-proxy) 部署到自己的 Vercel 账号并绑定自定义域名，建立专属的 TMDB 反向代理。

部署完成后，先在 NAS 网络环境下分别验证 API 与图片均可正常返回，再将域名填入 MoviePilot 或 Emby 插件。其他家庭影音工具见 [NAS 服务清单](/posts/nas-software-websites/)。

## 代理工作原理与适用范围

TMDB 的刮削请求分为元数据 API 与图片静态资源两类：

| 原始服务域名         | 作用                              |
| -------------------- | --------------------------------- |
| `api.themoviedb.org` | 搜索影片、获取电影与剧集详情 JSON |
| `image.tmdb.org`     | 下载海报、背景图与演员照片        |

通过 Vercel 部署 `tmdb-proxy` 后的请求链路如下：

```text
MoviePilot / 支持自定义 TMDB 域名的媒体插件
                  ↓
       https://tmdb.example.com
                  ↓
        Vercel 上的 tmdb-proxy
          ├─ /t/p/* → image.tmdb.org
          └─ 其他路径 → api.themoviedb.org
```

该项目的路由与运行机制如下：

- **路径分流**：访问根路径 `/` 会重定向至项目 GitHub 主页；以 `/t/p/` 开头的图片请求通过 `vercel.json` 的 rewrite 规则转发至 `image.tmdb.org`；其余 API 请求交由 `api/tmdb.js` Serverless 函数向 `api.themoviedb.org` 发起 GET 请求，并透传请求头中的 `Authorization` 凭据。
- **凭据透传**：无需在 Vercel 环境变量中预设 TMDB 密钥，客户端原有的 API Key 或 Read Access Token 随请求直接透传。
- **额度与域名**：Vercel 的 [Hobby 计划](https://vercel.com/docs/plans/hobby)可免费用于个人非商业项目（具体函数调用与流量限额以控制台 Usage 为准）。由于默认的 `*.vercel.app` 域名在国内网络通常无法直连，实际使用时需绑定一个自己可管理 DNS 的自定义子域名。

## 部署前准备

开始前请准备以下各项：

1. **GitHub 账号**与 **Vercel 账号**（在 Vercel 中关联 GitHub）。
2. **自定义域名**：本文以 `tmdb.example.com` 为例，操作时替换为自己的子域名。
3. **支持自定义 TMDB 域名的应用**：如 MoviePilot，或安装了 StrmAssistant（神医助手）的 Emby。注意：此处的反向代理域名不能填入 `HTTP_PROXY` / `HTTPS_PROXY` 等通用正向代理设置中。
4. **TMDB API 凭据**：从 TMDB 账号后台获取 API Read Access Token（长令牌）或 API Key，用于后续连通性测试。

## 部署到 Vercel

### 方式一：一键导入部署

打开 [tmdb-proxy 仓库](https://github.com/imaliang/tmdb-proxy)，点击 README 中的 **Deploy with Vercel** 按钮（或直接访问[导入链接](https://vercel.com/import/project?template=https://github.com/imaliang/tmdb-proxy)），按页面提示在自己的 GitHub 账号下创建仓库副本并完成部署。

### 方式二：Fork 仓库后手动导入

1. 在 GitHub 上完整 Fork `imaliang/tmdb-proxy` 仓库（需完整保留仓库中的 `api/tmdb.js`、`package.json` 与 `vercel.json`）。
2. 登录 Vercel，点击 **Add New → Project**，导入刚才 Fork 的仓库。
3. 根目录保持默认，Framework Preset 选择 **Other**；无需填写构建命令（若启用了 Build Command Override 则留空），直接点击 **Deploy**。
4. 等待构建完成，在 Deployments 页面确认状态变为 **Ready**。

## 绑定域名与配置 DNS

1. 在 Vercel 项目的 **Settings → Domains** 中添加子域名（如 `tmdb.example.com`），并将其关联到 **Production** 生产环境。
2. 前往域名的 DNS 服务商控制台，按 Vercel 页面当前给出的提示添加解析记录：

| 记录类型 | 主机记录  | 记录值                        | 配置要点                           |
| -------- | --------- | ----------------------------- | ---------------------------------- |
| `CNAME`  | `tmdb`    | Vercel 控制台提示的目标主机名 | 仅填主机名，不带 `https://` 或路径 |
| `A`      | `tmdb`    | Vercel 控制台提示的 IPv4 地址 | 仅在控制台要求 A 记录时使用        |
| `TXT`    | `_vercel` | Vercel 控制台提示的验证字符串 | 仅在提示需要验证域名所有权时添加   |

配置 DNS 时注意：

- **Cloudflare 代理状态**：若使用 Cloudflare 托管 DNS，初次配置建议先设为 **DNS only（灰云）**，待 Vercel 完成域名验证并自动签发 SSL 证书后再按需调整。
- **使用生产域名**：在无痕浏览窗口中访问绑定的生产域名，确认不会弹出 Vercel 登录页或密码验证（若被拦截，需在 Vercel **Settings → Deployment Protection** 中检查保护策略；切勿使用临时的 Preview URL）。

## 验证 API 与图片连通性

建议直接通过 SSH 登录 **NAS 终端**（或进入目标容器内部）执行以下测试命令，验证 NAS 所在网络的实际连通性。

### 验证 API 接口

将 `tmdb.example.com` 与 `REPLACE_WITH_TMDB_READ_ACCESS_TOKEN`（填入 TMDB 的 API Read Access Token）替换为实际值：

```bash
curl --fail-with-body --show-error --silent \
  --max-time 30 \
  --header 'Authorization: Bearer REPLACE_WITH_TMDB_READ_ACCESS_TOKEN' \
  'https://tmdb.example.com/3/movie/550?language=zh-CN'
```

正常情况下终端会返回电影《搏击俱乐部》（`id: 550`）的中文 JSON 详情，从中可复制出 `poster_path` 字段的值（形如 `/xxxxx.jpg`）。

接着可验证配置接口：

```bash
curl --fail-with-body --show-error --silent \
  --max-time 30 \
  --header 'Authorization: Bearer REPLACE_WITH_TMDB_READ_ACCESS_TOKEN' \
  'https://tmdb.example.com/3/configuration'
```

### 验证海报图片下载

将上一步返回的 `poster_path` 文件名拼接到 `/t/p/w500/` 之后，测试下载海报图片：

```bash
curl --fail --show-error --location \
  --max-time 30 \
  --output tmdb-poster.jpg \
  'https://tmdb.example.com/t/p/w500/REPLACE_WITH_ACTUAL_POSTER_FILENAME.jpg'
```

打开生成的 `tmdb-poster.jpg` 确认图片完整显示。确认 API 与图片两项测试均通过后，再修改媒体软件设置。

## 接入 MoviePilot 与 Emby

### MoviePilot

打开 MoviePilot 的 **设定 → 系统 → 进阶设置**，分别填入 API 与图片域名：

| 配置项              | 默认值               | 填入示例值         |
| ------------------- | -------------------- | ------------------ |
| `TMDB_API_DOMAIN`   | `api.themoviedb.org` | `tmdb.example.com` |
| `TMDB_IMAGE_DOMAIN` | `image.tmdb.org`     | `tmdb.example.com` |

注意：MoviePilot V3 要求这两项仅填写**裸域名**，不要带 `https://` 协议头，也不要加 `/3`、`/t/p` 或末尾斜杠。保存并重启生效后，搜索一部影片并执行识别测试，核对文字详情与海报图片是否正常加载。MoviePilot 的其他配置见[《MoviePilot：从部署到订阅、整理与进阶配置》](/posts/moviepilot-guide/)。

### Emby 与 StrmAssistant

Emby 可通过 StrmAssistant（神医助手）插件的[替代 TMDB 配置](https://github.com/sjtuross/StrmAssistant/wiki/替代-TMDB-配置)功能接入自定义代理：

1. 确认已安装与当前 Emby 服务端及 MovieDb 插件版本兼容的 StrmAssistant。
2. 在插件的**替代 TMDB 配置**页面中，按插件文档格式填入带协议头的完整地址（如 `https://tmdb.example.com`，注意与 MoviePilot 的裸域名格式区分）。
3. 保存后先挑**单部测试影片**执行元数据刷新，确认简介和海报均可正常下载，再扩大使用范围。

### 不支持自定义 TMDB 域名的情况

若某个影音软件本身不提供修改 TMDB 域名的设置项，也无对应插件支持，则需通过容器或系统级网络代理（如 Mihomo）解决连接问题。注意不要将 `api.themoviedb.org` 通过 hosts 或 Docker `extra_hosts` 直接指向 Vercel 的 IP——Vercel 依赖请求中的 Host 域名匹配站点路由与 SSL 证书，强行改 hosts 会导致 HTTPS 证书校验失败或 404 报错。

## 日常维护与恢复

- **适用边界**：`tmdb-proxy` 内部仅使用 `axios.get` 转发只读请求，且进程内缓存以请求 URL 作为键（未区分不同账号的 `Authorization` 头），因此仅适用于单人或家庭媒体库的公共元数据刮削，不宜改造为多用户读写网关。
- **更新与回退**：同步上游更新后，重新执行一次 API 和图片 `curl` 测试；若后续不再需要代理，先将 MoviePilot 与 Emby 插件中的域名改回官方默认值，确认刮削正常后再下线 Vercel 项目与 DNS 解析。

## 常见问题

| 现象                            | 优先检查                                                                         |
| ------------------------------- | -------------------------------------------------------------------------------- |
| 浏览器访问根域名直接跳到 GitHub | 属于正常的根路径重定向规则，请使用 `/3/movie/550` 和 `/t/p/w500/...` 路径测试    |
| 域名无法解析或连接超时          | 检查 DNS 记录是否生效，以及 NAS 与容器内部的 DNS 设置                            |
| 提示 SSL / HTTPS 证书错误       | 在 Vercel Domains 页面确认证书已签发，并检查 NAS 系统时间是否准确                |
| 接口返回 Vercel 登录页 HTML     | 检查是否误填了 Preview 预览域名，或生产环境开启了 Deployment Protection          |
| API 返回 `401 Unauthorized`     | 检查 TMDB 凭据是否有效，区分 Bearer Token（长令牌）与 `api_key` 查询参数         |
| API 返回 `404 Not Found`        | 检查应用配置中是否在域名末尾多填了 `/3` 等路径，导致请求 URL 路径重复            |
| 刮削有文字简介，但海报图片缺失  | 检查是否漏填了图片域名（`TMDB_IMAGE_DOMAIN`），并单独用 `curl` 测试 `/t/p/` 路径 |
| 遇到 `429 Too Many Requests`    | 触发了 TMDB 或 Vercel 速率限制，避免一次性对整库强制刷新全部图片                 |

## 参考资料

- imaliang：[tmdb-proxy 项目与部署说明](https://github.com/imaliang/tmdb-proxy)、[路由配置](https://github.com/imaliang/tmdb-proxy/blob/5e846505bb62c85b9dd2e48fdeae91430a01efea/vercel.json)、[API 转发函数](https://github.com/imaliang/tmdb-proxy/blob/5e846505bb62c85b9dd2e48fdeae91430a01efea/api/tmdb.js)。
- Vercel：[Hobby 计划](https://vercel.com/docs/plans/hobby)、[构建设置](https://vercel.com/docs/builds/configure-a-build)、[为项目添加域名](https://vercel.com/docs/domains/working-with-domains/add-a-domain)、[SSL 证书](https://vercel.com/docs/domains/working-with-ssl)、[Deployment Protection](https://vercel.com/docs/deployment-protection)。
- TMDB：[应用认证](https://developer.themoviedb.org/docs/authentication-application)、[图片路径](https://developer.themoviedb.org/docs/image-basics)、[API 使用与署名要求](https://developer.themoviedb.org/docs/faq)。
- MoviePilot：[配置参考](https://github.com/jxxghp/MoviePilot-Wiki/blob/main/configuration.md)、[V3 API 地址拼接](https://github.com/jxxghp/MoviePilot/blob/v3/app/modules/themoviedb/tmdbv3api/tmdb.py)、[V3 图片地址拼接](https://github.com/jxxghp/MoviePilot/blob/v3/app/runtime/config.py)。
- StrmAssistant：[替代 TMDB 配置](https://github.com/sjtuross/StrmAssistant/wiki/替代-TMDB-配置)。
