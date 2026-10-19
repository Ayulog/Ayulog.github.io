---
title: Mihomo：Docker 部署、订阅与分流设置
description: 在 NAS 上用 Docker Compose 部署 Mihomo 与 MetaCubeXD，导入订阅、配置分流。
author: Ayulog
pubDatetime: "2026-10-09T20:50:00+08:00"
draft: false
category: network
tags:
  - Debian
  - Docker
---

在 NAS 上通过 Docker 部署 Mihomo 内核与 MetaCubeXD 面板，可以让局域网内的电脑、手机和其他容器共用同一套订阅节点与分流规则。本文采用标准的 bridge 网络显式代理方案，客户端按需配置 HTTP 或 SOCKS5 代理端口即可接入。

以下配置基于 Linux Docker Engine 与 Compose V2（安装方法见 [Docker 官方文档](https://docs.docker.com/engine/install/)），配置文件结构参考 windowBR 的 [《在 docker 中使用 mihomo》](https://windowbr.top/2024/11/02/mihomo-docker/)。如果更习惯在网页端直接导入订阅与管理规则，可参考 [v2rayA 部署指南](/posts/v2raya-guide/)；更多容器服务见 [NAS 服务清单](/posts/nas-software-websites/)。

## 组件与端口说明

本方案由两个容器组成：`mihomo` 负责运行代理内核与分流规则，`metacubexd` 提供前端 Web 管理界面。默认使用以下三个端口（若与 NAS 现有服务冲突可按需调整）：

| 入口            | 示例端口 | 作用与认证方式                                             |
| --------------- | -------- | ---------------------------------------------------------- |
| 混合代理端口    | `7890`   | 接收客户端的 HTTP / SOCKS5 代理请求，使用 `authentication` |
| 控制器 API      | `9090`   | 供面板查询状态、切换节点与查看连接，使用 `secret` 密钥     |
| MetaCubeXD 面板 | `8080`   | 浏览器访问的前端静态页面，在页面内发起对 `9090` 的请求     |

文中 `NAS_IP` 代表客户端可访问的 NAS 局域网 IPv4 地址。由于 MetaCubeXD 是运行在浏览器端的前端应用，连接后端控制器时由浏览器直接请求 `http://NAS_IP:9090`。

## 配置文件与目录准备

在存放 Docker 项目的目录下创建 `mihomo` 文件夹及配置子目录：

```bash
mkdir -p mihomo/config
cd mihomo
```

容器启动并拉取订阅与规则数据后，目录结构如下：

```text
mihomo/
  compose.yaml
  config/
    config.yaml
    providers/       # 运行时自动生成的订阅节点缓存
    GeoIP.dat        # GeoIP 数据
    GeoSite.dat      # GeoSite 数据
```

下载 [完整 config.yaml](/examples/mihomo/config.yaml) 并保存为 `config/config.yaml`。文件内容如下，已包含端口监听、认证、DNS、订阅集合（`proxy-providers`）、策略组与分流规则：

```yaml
# 配置来源：按公开文档和示例整理，参考 windowBR《在 docker 中使用 mihomo》：
# https://windowbr.top/2024/11/02/mihomo-docker/
# 公开示例已将订阅名称、订阅链接、节点前缀、代理凭据和控制器密钥替换为占位符。

mixed-port: 7890
allow-lan: true
bind-address: "*"
mode: rule
log-level: info

# 公开示例补充认证占位符；原始配置未包含真实凭据。
authentication:
  - "REPLACE_PROXY_USER:REPLACE_PROXY_PASSWORD"
external-controller: "0.0.0.0:9090"
secret: "REPLACE_WITH_A_LONG_RANDOM_SECRET"
external-controller-cors:
  allow-origins:
    - "http://NAS_IP:8080"
  allow-private-network: true

tun:
  enable: false
  stack: mixed
  dns-hijack:
    - "any:53"
    - "tcp://any:53"
  auto-route: true
  auto-redirect: true
  auto-detect-interface: true

proxy-providers:
  subscription:
    url: "https://subscription.example.com/mihomo.yaml"
    type: http
    interval: 86400
    health-check:
      enable: true
      url: "https://www.gstatic.com/generate_204"
      interval: 300
    override:
      additional-prefix: "REPLACE_NODE_PREFIX"

proxies:
  - name: "直连"
    type: direct
    udp: true

geodata-mode: true
geox-url:
  geoip: "https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geoip.dat"
  geosite: "https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geosite.dat"
  mmdb: "https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/country-lite.mmdb"
  asn: "https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/GeoLite2-ASN.mmdb"

dns:
  enable: true
  ipv6: true
  respect-rules: true
  enhanced-mode: fake-ip
  fake-ip-filter:
    - "*"
    - "+.lan"
    - "+.local"
    - "+.market.xiaomi.com"
  nameserver:
    - "https://120.53.53.53/dns-query"
    - "https://223.5.5.5/dns-query"
  proxy-server-nameserver:
    - "https://120.53.53.53/dns-query"
    - "https://223.5.5.5/dns-query"
  nameserver-policy:
    "geosite:cn,private":
      - "https://120.53.53.53/dns-query"
      - "https://223.5.5.5/dns-query"
    "geosite:geolocation-!cn":
      - "https://dns.cloudflare.com/dns-query"
      - "https://dns.google/dns-query"

proxy-groups:
  - name: 默认
    type: select
    proxies:
      [自动选择, 直连, 香港, 台湾, 日本, 新加坡, 美国, 其它地区, 全部节点]

  - name: Google
    type: select
    proxies:
      [默认, 香港, 台湾, 日本, 新加坡, 美国, 其它地区, 全部节点, 自动选择, 直连]

  - name: Telegram
    type: select
    proxies:
      [默认, 香港, 台湾, 日本, 新加坡, 美国, 其它地区, 全部节点, 自动选择, 直连]

  - name: Twitter
    type: select
    proxies:
      [默认, 香港, 台湾, 日本, 新加坡, 美国, 其它地区, 全部节点, 自动选择, 直连]

  - name: 哔哩哔哩
    type: select
    proxies:
      [默认, 香港, 台湾, 日本, 新加坡, 美国, 其它地区, 全部节点, 自动选择, 直连]

  - name: 巴哈姆特
    type: select
    proxies:
      [默认, 香港, 台湾, 日本, 新加坡, 美国, 其它地区, 全部节点, 自动选择, 直连]

  - name: YouTube
    type: select
    proxies:
      [默认, 香港, 台湾, 日本, 新加坡, 美国, 其它地区, 全部节点, 自动选择, 直连]

  - name: 海外AI
    type: select
    proxies:
      [默认, 香港, 台湾, 日本, 新加坡, 美国, 其它地区, 全部节点, 自动选择, 直连]

  - name: NETFLIX
    type: select
    proxies:
      [默认, 香港, 台湾, 日本, 新加坡, 美国, 其它地区, 全部节点, 自动选择, 直连]

  - name: Spotify
    type: select
    proxies:
      [默认, 香港, 台湾, 日本, 新加坡, 美国, 其它地区, 全部节点, 自动选择, 直连]

  - name: Github
    type: select
    proxies:
      [默认, 香港, 台湾, 日本, 新加坡, 美国, 其它地区, 全部节点, 自动选择, 直连]

  - name: 国内
    type: select
    proxies:
      [直连, 默认, 香港, 台湾, 日本, 新加坡, 美国, 其它地区, 全部节点, 自动选择]

  - name: 其他
    type: select
    proxies:
      [默认, 香港, 台湾, 日本, 新加坡, 美国, 其它地区, 全部节点, 自动选择, 直连]

  # 地区分组会从所有 provider 节点中按名称筛选。
  - name: 香港
    type: select
    include-all: true
    filter: "(?i)港|hk|hongkong|hong kong"

  - name: 台湾
    type: select
    include-all: true
    filter: "(?i)台|tw|taiwan"

  - name: 日本
    type: select
    include-all: true
    filter: "(?i)日|jp|japan"

  - name: 美国
    type: select
    include-all: true
    filter: "(?i)美|us|unitedstates|united states"

  - name: 新加坡
    type: select
    include-all: true
    filter: "(?i)(新|sg|singapore)"

  - name: 其它地区
    type: select
    include-all: true
    filter: "(?i)^(?!.*(?:🇭🇰|🇯🇵|🇺🇸|🇸🇬|🇨🇳|港|hk|hongkong|台|tw|taiwan|日|jp|japan|新|sg|singapore|美|us|unitedstates)).*"

  - name: 全部节点
    type: select
    include-all: true

  - name: 自动选择
    type: url-test
    include-all: true
    tolerance: 10

rules:
  - GEOIP,lan,直连,no-resolve
  - GEOSITE,twitter,Twitter
  - GEOSITE,youtube,YouTube
  - GEOSITE,category-ai-!cn,海外AI
  - GEOSITE,github,Github
  - GEOSITE,google,Google
  - GEOSITE,telegram,Telegram
  - GEOSITE,netflix,NETFLIX
  - GEOSITE,bilibili,哔哩哔哩
  - GEOSITE,bahamut,巴哈姆特
  - GEOSITE,spotify,Spotify
  - GEOSITE,CN,国内
  - GEOSITE,geolocation-!cn,其他
  - GEOIP,CN,国内
  - MATCH,其他
```

### 必填参数说明

启动容器前，先将 `config/config.yaml` 中的占位符替换为实际值：

- `REPLACE_PROXY_USER` 与 `REPLACE_PROXY_PASSWORD`：客户端连接 `7890` 代理端口的用户名与密码。
- `REPLACE_WITH_A_LONG_RANDOM_SECRET`：MetaCubeXD 面板连接 `9090` 控制器 API 的密钥。
- `http://NAS_IP:8080`：浏览器访问面板的完整跨域来源（包含协议、IP 或域名及端口）。
- `https://subscription.example.com/mihomo.yaml`：Mihomo 兼容的订阅链接（支持 YAML `proxies:` 节点集合、URI 列表或 Base64 订阅，详见 [集合文件格式](https://wiki.metacubex.one/config/proxy-providers/content/)）。
- `REPLACE_NODE_PREFIX`：为该订阅下的节点添加统一名称前缀，便于多订阅区分。

`allow-lan: true` 与 `external-controller: "0.0.0.0:9090"` 允许容器接收局域网连接，建议仅在受信任的家庭内网或组网 VPN 中开放，切勿将 `7890` 和 `9090` 端口映射到公网。

### DNS、策略组与分流逻辑

- **DNS 解析**：配置开启了 `respect-rules: true` 与 `nameserver-policy`，按 GeoSite 规则将国内域名交由国内 DoH 解析，非国内域名交由海外 DoH 解析。示例的 `fake-ip-filter` 中保留了通配符 `*`（相当于全局跳过 fake-IP 分配，返回真实解析结果）；若需使用 fake-IP 模式，可删除 `*` 这一行，仅保留局域网域名例外。如需解析内网私有域名，可在 `hosts` 或 `nameserver-policy` 中指向局域网 DNS。
- **Geo 数据与订阅更新**：`geodata-mode: true` 使用 DAT 格式的 GeoIP 与 GeoSite 规则集，首次启动会自动从 `geox-url` 下载数据文件。`subscription` 集合每 24 小时自动更新，每 5 分钟执行一次连通性健康检查。
- **策略组与规则匹配顺序**：各地区分组通过 `include-all: true` 与正则 `filter` 自动归类订阅节点。请求进入后按 `rules` 从上到下匹配：局域网 IP 直连 → 常用海外与流媒体域名进入对应策略组 → `GEOSITE,CN` 与 `GEOIP,CN` 进入“国内”组（默认直连） → 其余流量由 `MATCH,其他` 兜底。
- **运行模式**：配置默认启用 `mode: rule`（按规则分流）且关闭了 `tun.enable`（无需 `NET_ADMIN` 权限或 host 网络）。若在面板中切换为“全局（Global）”或“直连（Direct）”模式，仅改变已发往 `7890` 端口请求的走向。

## Docker 部署与启动

在 `mihomo` 目录下创建 `compose.yaml`（或下载 [Compose 示例](/examples/debnas/mihomo/compose.yaml)）：

```yaml
# Basic explicit-proxy example; prepare ./config/config.yaml before starting.
services:
  mihomo:
    image: docker.io/metacubex/mihomo:latest
    restart: unless-stopped
    ports:
      - 7890:7890
      - 9090:9090
    volumes:
      - ./config:/root/.config/mihomo
  metacubexd:
    image: ghcr.io/metacubex/metacubexd:latest
    restart: unless-stopped
    ports:
      - 8080:80
```

若宿主机 `8080` 已被 qBittorrent 等服务占用，可将面板端口改为 `8081:80`，并同步修改 `config.yaml` 中的 `allow-origins`；若 `9090` 与 Cockpit 等服务冲突，修改宿主端口映射后在面板连接时填写新端口即可。如需使用 SOCKS5 UDP 转发，可在 `mihomo` 的 `ports` 中补充 `7890:7890/udp`。

在项目目录依次执行配置校验并启动服务：

```bash
# 校验 Compose 语法与 Mihomo 配置文件
docker compose config --quiet
docker compose run --rm --no-deps mihomo -t -d /root/.config/mihomo

# 后台启动容器并查看日志
docker compose up -d
docker compose ps
docker compose logs --tail=100 mihomo
```

后续日常维护与更新命令：

```bash
# 修改 config.yaml 后重启内核并查看日志
docker compose restart mihomo
docker compose logs --tail=100 mihomo

# 修改 compose.yaml 端口/挂载，或拉取新镜像后重建容器
docker compose pull
docker compose up -d
```

> [!TIP]
> 若希望在面板中手动切换的策略组节点在容器重启后依然保留，可在 `config.yaml` 中补充 `profile.store-selected: true`。日常备份时只需保存 `compose.yaml` 与 `config/` 目录。

## Web 面板连接与订阅更新

在浏览器打开 `http://NAS_IP:8080` 进入 MetaCubeXD 面板，首次添加后端时填写：

- **后端地址**：`http://NAS_IP:9090`（填写客户端浏览器可访问的 NAS 局域网 IP，不要填 `mihomo` 容器名或 `localhost`）。
- **密钥**：`config.yaml` 中设置的 `secret` 值。

连接成功后，按以下步骤检查节点与策略：

1. 打开面板的 **代理（Proxies）** 与 **提供者（Providers）** 页面，确认 `subscription` 集合已成功拉取节点。
2. 检查“默认”策略组（首选项为“自动选择”，也可手动指定某个地区组或具体节点）及各分流策略组的当前选中项。
3. 打开 **日志（Logs）** 与 **连接（Connections）** 页面，后续发起代理测试时可在此实时查看请求命中的规则与最终出口节点。

## 客户端接入与代理验证

### 1. 命令行与桌面设备验证

在局域网电脑终端中，使用 `curl` 验证 HTTP 与 SOCKS5 代理端口（命令会提示输入代理密码；Windows PowerShell 请将 `curl` 替换为 `curl.exe` 并写为单行）：

```bash
# 验证 HTTP 代理
curl --proxy http://NAS_IP:7890 \
  --proxy-user REPLACE_PROXY_USER \
  --head https://example.com

# 验证 SOCKS5 代理（socks5h 将域名交由 Mihomo 解析并匹配 GEOSITE 规则）
curl --proxy socks5h://NAS_IP:7890 \
  --proxy-user REPLACE_PROXY_USER \
  --head https://example.com
```

电脑或手机接入时，在系统或应用的代理设置中填入 `NAS_IP`、端口 `7890` 以及 `authentication` 账号密码。Linux / macOS 终端程序也可通过环境变量配置：

```bash
export http_proxy='http://PROXY_USER:PROXY_PASSWORD@NAS_IP:7890'
export https_proxy="$http_proxy"
export no_proxy='localhost,127.0.0.1,::1'
```

### 2. 其他 Docker 容器与镜像拉取代理

- **其他应用容器**：在对应容器的代理设置或环境变量中填写 `http://PROXY_USER:PROXY_PASSWORD@NAS_IP:7890`。若应用容器与 `mihomo` 加入了同一个自定义 Docker 网络，也可使用服务名 `mihomo:7890` 访问（容器内的 `127.0.0.1` 指向该容器自身，不能用于连接宿主机上的 Mihomo）。
- **Docker Daemon 拉取镜像**：`docker pull` 由宿主机上的 Docker 守护进程直接发起，不受容器内环境变量影响。如需通过代理拉取镜像，需在 Mihomo 正常运行后，参照 [Docker Daemon 代理文档](https://docs.docker.com/engine/daemon/proxy/) 为 `docker.service` 配置代理。

## 常见问题

### 面板提示 Failed to fetch

1. 检查后端地址是否填写为浏览器可达的 `http://NAS_IP:9090`，且宿主机防火墙已放行 `9090` 端口。
2. 核对面板填写的密钥与 `config.yaml` 中的 `secret` 是否一致。
3. 核对 `config.yaml` 中 `external-controller-cors.allow-origins` 是否包含当前打开面板的完整地址（协议、IP/域名与端口需完全一致）。
4. 若使用 HTTPS 在线面板访问内网 HTTP 接口被浏览器拦截混合内容，直接改用本例部署的内网 `http://NAS_IP:8080` 面板即可。

### 容器已启动但策略组没有节点

1. 在面板或容器日志（`docker compose logs mihomo`）中查看 `subscription` 的下载报错，确认订阅链接有效且 NAS 可正常访问订阅服务器。
2. 确认订阅返回的是节点列表或包含顶层 `proxies:` 的配置（仅含 `proxy-providers` 而无 `proxies` 节点的完整配置文件不能直接作为节点集合导入）。
3. 检查地区组的 `filter` 正则是否过滤掉了非标准命名的节点，可在“全部节点”分组中查看原始节点列表。

### 报 GeoIP、GeoSite 或 MMDB 下载失败

首次启动时 Mihomo 会从 `geox-url` 下载规则数据。若 NAS 无法直接访问 GitHub Release，可手动下载对应的 `geoip.dat`、`geosite.dat`、`country-lite.mmdb` 与 `GeoLite2-ASN.mmdb` 放入挂载的 `config/` 目录，再执行 `docker compose restart mihomo`。

### 修改 config.yaml 后未生效

确认修改的是 Compose 实际挂载路径下的 `config/config.yaml`（使用图形化管理面板时注意核对工作目录），修改后执行 `docker compose restart mihomo` 重启容器，并通过日志确认无 YAML 语法错误。

## 参考资料

- windowBR：[《在 docker 中使用 mihomo》](https://windowbr.top/2024/11/02/mihomo-docker/)（配置模板参考）。
- [Mihomo 仓库](https://github.com/MetaCubeX/mihomo)与 [官方文档（全局配置、入站端口、代理集合、规则与 DNS）](https://wiki.metacubex.one/config/general/)。
- [MetaCubeX/meta-rules-dat](https://github.com/MetaCubeX/meta-rules-dat)：GeoIP 与 GeoSite 规则数据仓库。
- [MetaCubeXD](https://github.com/MetaCubeX/metacubexd)：Web 面板仓库与部署说明。
- [Docker Daemon 代理配置文档](https://docs.docker.com/engine/daemon/proxy/)。
