---
title: 在 Docker 中使用代理：Mihomo 与 v2rayA
description: 用 Docker Compose 部署 Mihomo、MetaCubeXD 或 v2rayA，整理完整配置、订阅与节点选择、代理端口、规则分流及应用接入方法。
author: Ayulog
pubDatetime: "2026-10-09T20:50:00+08:00"
draft: true
tags:
  - NAS
  - Debian
  - Docker
  - Mihomo
  - v2rayA
  - 网络
---

在 NAS 上运行代理服务，可以让支持 HTTP 或 SOCKS 代理的应用，共用一套节点和规则。这篇整理两种方案：**Mihomo + MetaCubeXD** 用配置文件定义订阅与分流，**v2rayA** 通过网页管理节点和代理设置。按自己的习惯选择一种即可；应用还需要主动连接代理端口，安装容器本身不会自动改变整个局域网的网络出口。

这篇复用你提供的完整配置，部署思路参考 windowBR 的 [《在 docker 中使用 mihomo》](https://windowbr.top/2024/11/02/mihomo-docker/)，并结合当前 Mihomo 与 MetaCubeXD 文档整理。本文使用 **Linux Docker Engine、Docker Compose V2、普通 bridge 网络和显式代理**，适合 Debian、DebNAS 等环境。Docker Desktop 的宿主网络、路由与设备支持存在差异，TUN 需要另行核对。

配置中的订阅地址、账号、密钥和 NAS 地址已经替换为占位符；不要把占位符原样启动。系统安装可以先看 [DebNAS 安装及折腾记录](/posts/2026-10-09-debnas-installation-notes/)。前半篇从 Mihomo 开始，需要网页导入订阅的读者也可以直接跳到 [v2rayA 方案](#另一种方案v2raya)。

## 目录

- [先分清三个入口](#先分清三个入口)
- [第一步：准备目录与完整配置](#第一步准备目录与完整配置)
- [第二步：编写 Compose](#第二步编写-compose)
- [第三步：检查配置并启动](#第三步检查配置并启动)
- [第四步：连接 MetaCubeXD](#第四步连接-metacubexd)
- [第五步：验证客户端代理](#第五步验证客户端代理)
- [第六步：确认订阅与分流](#第六步确认订阅与分流)
- [让其他应用使用代理](#让其他应用使用代理)
- [规则、全局和 TUN 的区别](#规则全局和-tun-的区别)
- [另一种方案：v2rayA](#另一种方案v2raya)
- [修改、更新与备份](#修改更新与备份)
- [常见问题](#常见问题)
- [参考资料](#参考资料)

## 先分清三个入口

本文选择下面这组端口。它们是本例约定，Mihomo 的监听端口由配置文件决定；遇到冲突时可以调整。

| 入口            | 示例端口 | 用途                                 |
| --------------- | -------- | ------------------------------------ |
| 混合代理        | `7890`   | 应用通过 HTTP 或 SOCKS5 发送请求     |
| 控制器 API      | `9090`   | 面板查询状态、切换节点和修改运行设置 |
| MetaCubeXD 网页 | `8080`   | 浏览器打开管理界面                   |

两条连接关系可以分开看：

```text
应用 → NAS_IP:7890 → Mihomo → 规则匹配 → 直连或代理节点
浏览器 → NAS_IP:8080 加载面板 → 浏览器连接 NAS_IP:9090 控制内核
```

`NAS_IP` 指客户端能够访问的 NAS 地址，使用时替换。手机访问面板时，控制器连接也是手机浏览器发起的，不能填仅 Docker 内部可解析的容器名。

本文为代理入口和控制器分别设置凭据：`authentication` 供代理客户端使用，`secret` 供面板连接 API 使用。两者用途不同。

## 第一步：准备目录与完整配置

在准备存放应用的目录中执行：

```bash
mkdir -p mihomo/config
cd mihomo
```

最终文件结构如下；订阅缓存和 Geo 数据会保存在挂载的 `config` 目录中：

```text
mihomo/
  compose.yaml
  config/
    config.yaml
    providers/       # 订阅缓存，运行时生成
    GeoIP.dat        # GeoIP 数据
    GeoSite.dat      # GeoSite 数据
```

下载 [完整 config.yaml](/examples/mihomo/config.yaml)，保存为 `config/config.yaml`。下面就是同一份完整文件，已经包含监听、认证、DNS、订阅、策略组和规则，**不需要再拼接后面的片段**。

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

### 启动前需要填写什么

- `REPLACE_PROXY_USER`、`REPLACE_PROXY_PASSWORD`：应用连接代理时使用的账号和密码。
- `REPLACE_WITH_A_LONG_RANDOM_SECRET`：独立的控制器密钥，供 MetaCubeXD 使用。
- `http://NAS_IP:8080`：浏览器访问面板的完整来源，包括协议、地址和端口；使用域名访问时填写对应域名。
- `https://subscription.example.com/mihomo.yaml`：自己的 Mihomo 兼容节点订阅地址，不能保留示例 URL。

配置中的公共 DNS 和连通性测试地址也是示例选择，可按自己的网络条件调整。订阅 URL 中的令牌和填写后的密码仅保留在自己的设备上。

`allow-lan: true` 和 `bind-address: "*"` 会扩大代理监听范围；`external-controller: 0.0.0.0:9090` 会监听所有容器接口。示例补充了 `authentication` 和 `secret` 占位符，部署时应只在可信内网或私有组网中开放，并用防火墙限制 7890、9090 的来源，绝不要把控制 API 直接暴露到公网。

### 这份配置怎样工作

这份复用配置使用 `fake-ip`、`respect-rules: true` 和 `nameserver-policy`，会依据 GeoSite 分类选择解析器。`fake-ip-filter` 中保留了 `*`，按 Mihomo 常见语义会匹配所有域名，实际效果接近全局绕过 fake-IP；如果需要真正为普通域名分配 fake IP，应删除 `*`，只保留局域网和确有需要的例外。配置没有把 DNS 端口发布到宿主机，不能直接当作局域网 DNS 服务。

公共解析器通常不知道 NAS 内部的私有域名。如果需要解析自己的 `.lan` 等域名，按实际网络补充 `hosts` 或 `nameserver-policy`，指向能够解析它们的局域网 DNS；直连规则本身不会创建 DNS 记录。

订阅每天更新，provider 在使用期间每五分钟进行健康检查；地区分组通过 `include-all` 动态筛选订阅节点，“自动选择”根据延迟记录选择。配置还包含 Google、Telegram、Twitter、哔哩哔哩、巴哈姆特、YouTube、海外 AI、Netflix、Spotify 和 GitHub 等策略组，其余外部请求交给“其他”。订阅下载失败时，依赖 `include-all` 的地区组可能没有可用节点。

这套分流依赖 GeoIP、GeoSite、MMDB 和 ASN 数据。`geodata-mode: true` 使用 DAT 模式，但配置仍保留来源示例中的 `mmdb`、`asn` 下载地址；首次加载和自动更新需要访问 `geox-url`。如果下载失败，按当前 Mihomo 版本和日志补齐对应数据文件，再重新校验；不要只凭文件名猜测版本是否兼容。

`tun.enable: false` 表示当前配置不会启用透明代理；其余 TUN 字段是来源配置中保留的待用参数。普通 bridge Compose 不需要 `NET_ADMIN`、`/dev/net/tun` 或 host 网络。若以后改为 `true`，必须另行补充设备、能力、路由、DNS 和防火墙配置。

## 第二步：编写 Compose

创建 `compose.yaml`，或下载 [Compose 示例](/examples/debnas/mihomo/compose.yaml)：

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

`docker.io/metacubex/mihomo:latest` 是 Mihomo 的 Docker Hub 镜像；`ghcr.io/metacubex/metacubexd:latest` 是独立面板镜像。这个面板镜像不包含 Mihomo 内核，需要连接前面的控制器。

`./config` 映射到 Mihomo 的工作目录 `/root/.config/mihomo`，其中的 `config.yaml` 是主配置文件。目录挂载也能保存订阅缓存等数据。使用相对路径时，确认 Compose 管理面板中的项目目录与这里的文件结构一致。

端口映射左侧是宿主机端口，右侧是容器监听端口。例如面板与 qBittorrent 的 `8080` 冲突时，可以把面板改为 `8081:80`，同时将 `allow-origins` 改为 `http://NAS_IP:8081`。控制器 `9090` 也可能与 Cockpit 冲突，调整宿主映射后要同步修改面板中的后端地址。

本文的普通代理不需要 host 网络、宿主 PID / IPC、Docker socket 或 TUN 设备映射。容器发布的端口应限制在预期的局域网或私有组网访问范围，尤其不要把管理 API 当作公开网页入口。

## 第三步：检查配置并启动

先确认 `config/config.yaml` 已经存在并填写完成，再在 `compose.yaml` 所在目录执行：

```bash
# 检查 Compose 文件结构与变量
docker compose config --quiet

# 检查 Mihomo 配置；首次运行可能需要拉取镜像
docker compose run --rm --no-deps mihomo -t -d /root/.config/mihomo

# 启动服务
docker compose up -d

# 查看运行状态与日志
docker compose ps
docker compose logs --tail=100 mihomo
```

两项检查验证的内容不同：`docker compose config` 处理容器配置；`mihomo -t` 解析应用配置。都通过以后，还需要实际连接测试，才能确认认证、网络与节点可用。

`docker compose run` 的这次校验不会按服务定义发布代理端口，但可能访问或缓存外部资源。完整配置引用了订阅、GeoIP 与 GeoSite，先填写有效订阅并确认 Geo 数据可获取；配置解析通过，也不能代替对订阅节点的实际连接验证。

## 第四步：连接 MetaCubeXD

浏览器打开 `http://NAS_IP:8080`。如果改过面板宿主端口，就使用修改后的端口。

在面板添加后端时填写：

- **后端地址**：`http://NAS_IP:9090`。
- **密钥**：`config.yaml` 中自己设置的 `secret`。

面板能加载，只说明网页容器正常。连接后端成功、能够查看连接和日志，才说明浏览器可以访问 Mihomo 控制器。

`http://mihomo:9090` 只可能在对应 Docker 网络内解析；`localhost` 指当前访问者自身；`0.0.0.0` 用于监听。这些地址都不能代替远程浏览器眼中的 NAS 地址。

如果使用 HTTPS 在线面板连接 HTTP 内网 API，浏览器可能因混合内容或私有网络访问策略阻止请求。`allow-private-network` 不能绕过全部浏览器限制。可以先用本例的局域网面板验证，或者为面板与控制器统一配置可访问、受信任的 HTTPS 入口。

## 第五步：验证客户端代理

从一台能够访问 NAS 的电脑测试 HTTP 代理。以下示例只在命令中填写用户名，curl 会提示输入对应代理密码：

```bash
curl --proxy http://NAS_IP:7890 \
  --proxy-user REPLACE_PROXY_USER \
  --head https://example.com
```

Windows PowerShell 中使用 `curl.exe`，并写成单行，避免与别名或 Bash 换行方式混淆。

测试 SOCKS5 时可以使用：

```bash
curl --proxy socks5h://NAS_IP:7890 \
  --proxy-user REPLACE_PROXY_USER \
  --head https://example.com
```

`socks5h` 会把目标主机名交给代理处理，有助于保留域名供规则匹配。普通 `socks5` 通常在客户端解析域名，两者在 DNS 和分流结果上可能不同。

同时查看 MetaCubeXD 的连接记录或 Mihomo 日志，核对目标、命中的规则和最终节点。当前完整配置会按域名与 Geo 数据分流，不能预先把所有测试都当作直连；看到网页返回成功，只能说明这条测试链路可用。访问 HTTPS 时，代理先返回的 `200 Connection established` 也不等于目标网站已经返回最终响应。

本例只发布 TCP 代理端口，覆盖这里的 HTTP 与 SOCKS TCP 测试。需要 SOCKS UDP 时，还要核对客户端、节点协议及相应 UDP 端口映射，不能因端口名叫 mixed 就认为所有 UDP 流量已可用。

## 第六步：确认订阅与分流

完整配置已经包含 `proxy-providers`、`proxy-groups` 和 `rules`。填写订阅 URL、启动服务后，在 MetaCubeXD 中确认订阅加载，再检查“节点选择”及各服务策略组的实际选择。

### 订阅是否已经加载

`subscription` 是本文给 provider 取的名称，策略组通过 `use: [subscription]` 引用它。`path` 是缓存文件的位置；`proxy: DIRECT` 表示 NAS 直接获取订阅，需先能访问订阅服务器。

YAML 节点集合使用顶层 `proxies:`。官方也支持兼容的 URI 节点列表及其 base64 形式，具体以 [文件内容格式](https://wiki.metacubex.one/config/proxy-providers/content/) 为准，不能假定任意服务商的所有订阅都能直接解析。

完整 Clash / Mihomo 配置如果包含兼容的顶层 `proxies:`，provider 可以读取这些节点，但不会同时导入其中的策略组、DNS 和规则。只有 `proxy-providers` 而没有实际 `proxies` 的完整配置，也不能当作这种节点文件使用。

如果使用自己的完整配置替换本例，需保留相应监听、认证、控制器与 CORS 设置，并核对策略组、provider 和规则之间的名称引用。不要在同一个 YAML 中重复定义顶层字段。

### 怎样选节点

首次使用时，“节点选择”默认进入“自动选择”，也可以手动选订阅中的节点。“自动选择”利用延迟测试结果选取节点；健康检查是否成功，只能说明测试目标的连通性，不保证所有网站都可用。

各服务组默认跟随“节点选择”，也能单独改成自动选择或直连。“其他流量”负责没有命中前面规则的请求。曾经保存过策略组选择时，`profile.store-selected` 可能恢复旧选择，因此每次调整配置后仍要核对面板中的结果。

### 规则怎样匹配

规则按顺序处理，先匹配者生效：

1. `GEOIP,lan` 先将局域网地址直连。
2. Twitter、YouTube、海外 AI、GitHub、Google、Telegram、Netflix、哔哩哔哩、巴哈姆特和 Spotify 依次进入对应策略组。
3. `GEOSITE,CN` 与 `GEOIP,CN` 进入“国内”组。
4. `GEOSITE,geolocation-!cn` 和最后的 `MATCH,其他` 处理剩余请求。

Geo 分类由数据项目维护，不能把分类命中当作每个网站都适用的固定结论。自定义规则应放在需要覆盖的宽泛规则之前，`MATCH` 保持在最后。

如需临时排查，可以在面板中切换某个组为 `DIRECT`，再比较连接记录；测试后恢复预期节点。更改兜底策略只影响**已经送入 Mihomo 的请求**，不会自动接管未配置代理的应用。

## 让其他应用使用代理

电脑、手机或应用本身的代理设置中，填写 NAS 地址、`7890` 和代理凭据。Windows 系统代理不会被所有应用遵守，遇到未走代理的软件，先检查它自己的代理支持。

支持标准环境变量的命令行工具，可以按需要设置：

```bash
export http_proxy='http://PROXY_USER:PROXY_PASSWORD@NAS_IP:7890'
export https_proxy="$http_proxy"
export no_proxy='localhost,127.0.0.1,::1'
```

替换地址与账号；用户名或密码中若包含 URL 保留字符，需要先做百分号编码。`https_proxy` 中的 `http://` 表示与 HTTP 代理通信，不代表最终 HTTPS 网站使用明文传输。不同程序对变量名称、认证和 `no_proxy` 的支持不同，要看它实际发出的请求。

### 其他容器的代理

其他应用容器也需要自己支持并配置代理。可以连接 NAS 可达地址上的 `7890`；或者让应用容器与 Mihomo 加入同一个用户自定义 Docker 网络，再使用服务名 `mihomo:7890`。后者需要先建立共享网络并让两个服务都加入，不能仅把地址写成服务名。

应用容器里的 `127.0.0.1` 指该容器自身。将代理地址写成 `127.0.0.1:7890`，并不会自动连接宿主机或 Mihomo 容器。

### Docker 拉取镜像的代理

应用容器代理与 Docker daemon 拉取镜像是两条独立链路。给 Mihomo 或其他容器设置环境变量，不会自动让 `docker pull` 使用它；daemon 代理需要按 [Docker 官方文档](https://docs.docker.com/engine/daemon/proxy/)单独配置。

首次安装时还没有运行中的 Mihomo，所以应先保证镜像能够下载。不要把尚未启动的代理作为拉取自身镜像的唯一网络出口。

## 规则、全局和 TUN 的区别

- **规则模式**：按 `rules` 顺序决定送往直连、代理节点或策略组。
- **全局模式**：已进入 Mihomo 的代理请求使用全局策略选择，不等于整个系统的所有流量都会进入 Mihomo。
- **直连模式**：已进入 Mihomo 的请求直接连接目标。
- **TUN**：通过虚拟网络设备和路由把更多流量导入内核，属于流量接入方式。

本篇先完成显式代理。TUN 需要另外配置设备、能力、路由、DNS 和防火墙，还要明确影响的是容器、宿主机还是作为网关转发的流量。普通 bridge 容器中切换 `tun.enable`，不能自动变成宿主机或全局域网的透明代理。

## 另一种方案：v2rayA

这一部分参考 Keba 的 [《mzz2017/v2raya》](https://hi.keba.host/archives/v2raya)，并按 v2rayA `v2.5.10` 的官方说明整理。v2rayA 自带网页管理界面，可以导入订阅、管理节点和设置分流，不需要再配 MetaCubeXD。它与前面的 Mihomo 是两套独立方案，不能直接把 Mihomo 的 `config.yaml` 放进 v2rayA 配置目录使用。

这里同样使用 **bridge 网络与显式代理**：应用主动连接代理端口，透明代理保持关闭。该用法不需要原参考文章中的 `privileged: true` 或 `network_mode: host`，也不需要挂载宿主机的内核模块。

### 先认清四个端口

下面是 v2rayA 的默认端口，调整过设置时以实际值为准：

| 端口    | 用途             | 请求如何处理                       |
| ------- | ---------------- | ---------------------------------- |
| `2017`  | 网页管理界面     | 创建账号、导入订阅、选择节点和设置 |
| `20170` | SOCKS5 代理      | 全部交给 `proxy` 出站组            |
| `20171` | HTTP 代理        | 全部交给 `proxy` 出站组            |
| `20172` | 按规则 HTTP 代理 | 按所选分流模式决定直连、代理等结果 |

希望 HTTP 请求按规则分流时，用 `20172`；希望请求都交给选定代理组时，用 `20171`。`2017` 只管理服务，不能填进应用的 HTTP 代理地址。这里的“全部”仅指**已送到该代理端口的请求**。

### 准备目录与 Compose

在 NAS 的应用目录下执行：

```bash
mkdir -p v2raya/config
cd v2raya
```

创建 `compose.yaml`：

```yaml
services:
  v2raya:
    image: ghcr.io/v2raya/v2raya:v2.5.10
    restart: unless-stopped
    ports:
      - "NAS_LAN_IP:2017:2017"
      - "NAS_LAN_IP:20170:20170"
      - "NAS_LAN_IP:20171:20171"
      - "NAS_LAN_IP:20172:20172"
    volumes:
      - ./config:/etc/v2raya
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```

将四处 `NAS_LAN_IP` 替换为 **NAS 自身的局域网 IPv4 地址**，例如 `NAS_IP`；它是端口绑定地址，不能填客户端地址或容器地址。示例将端口绑定到这个地址，后续 NAS 地址变化时也要同步修改。`./config` 持久化账号、订阅与设置，图形化 Compose 管理器中需确认项目目录，或改成 NAS 上真实的绝对路径。

此处固定 `v2.5.10` 便于复现，镜像来自项目官方 GHCR；原文使用的 Docker Hub 仓库 `mzz2017/v2raya` 也是项目提供的镜像来源。先确保 NAS 能拉取所选仓库的镜像，再启动代理。

检查并启动；前一步成功才继续：

```bash
docker compose config --quiet && docker compose pull && docker compose up -d
docker compose ps
docker compose logs --tail=100 v2raya
```

端口已占用时，修改映射中间的宿主端口，例如将 `NAS_LAN_IP:2017:2017` 改为 `NAS_LAN_IP:12017:2017`，然后用 `12017` 打开网页。若在 v2rayA 内改了实际监听端口，则还要同步最右侧的容器端口。

### 首次设置与端口分享

浏览器打开 `http://NAS_IP:2017`，按新版界面完成以下操作；这里的 `NAS_IP` 就是刚才绑定的局域网地址：

1. 首次访问时创建管理账号与密码。
2. 在 **代理 → 导入** 中选择订阅地址或节点链接，导入服务商提供的兼容格式；完整 Clash / Mihomo YAML 不应直接当作 v2rayA 配置导入。
3. 将需要使用的节点加入 `proxy` 组，检查节点选择，再到仪表板启动服务。测速结果只能作参考，后面仍要测试实际请求。
4. 在 **设置 → 代理** 中启用 **允许局域网的连接**，旧教程通常称为“端口分享”，保存并应用。未开启时代理入站只监听容器回环地址，即使发布端口，其他设备也无法正常连接。
5. 需要使用 `20172` 时，在 **设置 → 流量分流** 中选择规则端口的分流模式，保存并应用，再核对具体规则。该设置不会让 `20171` 自动变成规则代理。
6. 保持透明代理关闭。本例没有配置宿主机的路由、设备与防火墙，不适合直接套用透明代理步骤。

默认的 HTTP / SOCKS 代理端口没有密码，**网页管理密码不等于代理认证**。以上端口只提供给可信局域网设备，不要在路由器上转发到公网；如果需要代理认证，应按官方入站说明添加带认证的自定义入站，并关闭不用的无密码端口，再同步 Compose 映射。

### 让应用连接并验证

应用支持 HTTP 代理时，可以按目标选择下面的地址：

```text
按规则分流：http://NAS_IP:20172
全部交给代理组：http://NAS_IP:20171
SOCKS5：NAS_IP:20170
```

应用如果将协议、地址和端口分成三个字段，就分别填写。支持标准代理环境变量的容器可以在它自己的服务定义中加入：

```yaml
environment:
  HTTP_PROXY: "http://NAS_IP:20172"
  HTTPS_PROXY: "http://NAS_IP:20172"
  NO_PROXY: "localhost,127.0.0.1,::1"
```

将 `NAS_IP` 替换为应用容器可访问的 NAS 地址；有些应用只认小写变量，有些需要在自己的设置页配置。`HTTPS_PROXY` 中使用 `http://` 是 HTTP 代理的连接方式，访问 HTTPS 目标时仍通过 CONNECT 建立隧道。需要绕过代理访问的内网主机，可按应用支持的语法补到 `NO_PROXY`。

应用容器的 `127.0.0.1` 指它自己。若希望用 `v2raya:20172` 这样的服务名访问，应用与 v2rayA 必须加入同一个用户自定义 Docker 网络；不同 Compose 项目不会自动共享网络。

在局域网电脑上分别验证规则 HTTP 端口与 SOCKS5 端口：

```bash
curl --proxy http://NAS_IP:20172 --head https://example.com
curl --proxy socks5h://NAS_IP:20170 --head https://example.com
```

Windows PowerShell 将 `curl` 换成 `curl.exe`。检查目标网站的最终响应，并结合 v2rayA 的日志核对连接；HTTP CONNECT 的成功响应不能单独证明目标请求成功。规则端口可能按规则直连，SOCKS5 端口则交给 `proxy` 组；本例只发布 TCP 端口，不把这些测试当作 UDP 已可用的证明。

给 MoviePilot 等应用设置代理，只影响该应用实际交给代理的请求。下载器是否使用代理还要看下载器自身的设置，不能仅凭部署了 v2rayA 就判断 PT、BT 或所有下载流量的出口。

### Docker 拉取镜像、排错与备份

绿联等 NAS 如果在 Docker 设置中提供“HTTP 代理”，可以按系统版本填写 `http://NAS_IP:20171` 或规则端口 `20172`；这是 **Docker 拉取镜像的代理**，与给业务容器设置 `HTTP_PROXY` 分开配置。Linux Docker Engine 的具体设置仍以 [Docker daemon 代理文档](https://docs.docker.com/engine/daemon/proxy/)为准。代理容器必须先能正常启动，避免用尚未启动的 v2rayA 下载自身镜像。

- **网页打不开**：检查容器日志、`2017` 的宿主映射，以及绑定的地址是否确实属于 NAS。
- **网页正常，应用连不上代理**：先看是否开启“允许局域网的连接”，再核对端口映射、NAS 防火墙和应用填写的地址。
- **能连接端口，但请求失败**：确认服务已启动、`proxy` 组已有可用节点，再查看订阅、DNS、分流和连接错误；必要时对比 `20171` 与 `20172`。
- **订阅导入失败**：检查订阅格式、链接有效期和 NAS 到订阅服务器的连通性，不要仅靠换代理端口排查。

备份时保留 `compose.yaml` 和整个 `config/`，其中包含账号及订阅信息，应保存在私有位置。需要复制运行中的配置数据库时，先在当前项目目录执行 `docker compose stop v2raya`，完成备份后执行 `docker compose start v2raya`。升级前查看发布说明、备份配置，再修改镜像版本并执行 `docker compose pull && docker compose up -d`，随后复查网页、订阅和实际代理请求。

本节依据参考文章与上游文档核对，未在真实 NAS 上部署或使用订阅进行连通性实测。

## 修改、更新与备份

以下回到前面的 Mihomo + MetaCubeXD 方案；v2rayA 的配置保存与升级见上一节。

编辑配置后先运行前面的检查，再重启内核：

```bash
docker compose restart mihomo
docker compose logs --tail=100 mihomo
```

修改了 Compose 中的端口或挂载时，需要重新应用容器定义：

```bash
docker compose up -d
```

镜像更新可使用：

```bash
docker compose pull
docker compose up -d
```

这些镜像是预构建镜像，日常更新不需要 `docker compose build`。`latest` 会随上游变化；需要稳定复现时，记录已经验证的版本或镜像 digest，再按升级说明更新。

面板中的某些操作只影响运行状态，长期配置应保存到 `config.yaml`。这份来源配置没有启用 `profile.store-selected`，面板中手动选择是否跨重启保存，要按当前 Mihomo 版本和工作目录行为验证；需要固定选择时可按官方文档补充该字段。

备份 `compose.yaml` 与 `config/`，其中可能包含订阅令牌、控制器密钥和代理凭据，保留在私有备份中。更新后分别测试面板、订阅获取和实际代理请求。

## 常见问题

以下问题针对 Mihomo 与 MetaCubeXD；v2rayA 可先按上一节的排错顺序检查。

### 面板提示 Failed to fetch

依次检查：浏览器能否访问控制器地址；`9090` 是否发布到正确宿主端口；控制器是否监听容器可达的地址；`secret` 是否一致；`allow-origins` 是否包含当前面板的完整来源。

如果控制器端口直接可达，但浏览器仍拒绝请求，再看开发者工具里的 CORS、混合内容或私有网络错误。普通 bridge 模式可以工作，不必把切换 host 网络当成唯一修复方法。

### 配置能启动，但没有节点

确认填写的是实际订阅 URL、格式能被 Mihomo 解析，并查看 provider 下载日志。检查策略组的 `use` 是否准确引用 provider 名称；如果面板里仍选中 `DIRECT`，即使订阅已更新也不会自动切换成某个节点。

### 规则报 MMDB 或 geosite 下载错误

说明当前配置引用了额外的规则数据。按实际的 `GEOIP` / `GEOSITE` 规则、`geodata-mode`、数据 URL 和错误日志核对需要的文件及存放位置，再处理下载连通性；不要仅凭别的模板列出的文件名猜测。

本文复用的配置同时声明 DAT、MMDB 和 ASN 数据地址。遇到 MMDB、GeoSite 或 GeoIP 报错时，先看实际规则和日志，再按当前版本下载对应数据；不要把其他模板中的文件直接混用。

### 应用访问成功，却看不到代理节点流量

先看应用是否实际连接 `7890`，再看匹配结果是否为 `DIRECT`。面板连通、容器处于 running 状态、网页能打开，都不能单独证明请求经过了某个节点。

### 修改 config.yaml 后没有生效

核对是否编辑了实际挂载目录中的文件，是否通过配置检查并重载或重启。下载的完整配置需保存到 Compose 实际挂载的 `config/config.yaml`；管理面板选错项目目录，也会让相对路径指向另一份文件。修改后必须重新执行配置检查并重启容器。

### 改端口后面板失联

代理端口、控制器和网页端口分别核对。改网页宿主端口时同步 CORS 来源；改控制器宿主端口时同步面板后端地址；改容器实际监听端口时，还要同步 Compose 映射右侧。

## 参考资料

- windowBR：[《在 docker 中使用 mihomo》](https://windowbr.top/2024/11/02/mihomo-docker/)，2024 年 11 月 2 日。本文的完整配置按公开示例整理，访问日期为 2026 年 10 月 9 日；字段和行为仍以 Mihomo 官方文档为准。
- [Mihomo 项目](https://github.com/MetaCubeX/mihomo)、[官方容器构建流程](https://github.com/MetaCubeX/mihomo/blob/Meta/.github/workflows/build.yml)与[Dockerfile](https://github.com/MetaCubeX/mihomo/blob/Meta/Dockerfile)：镜像与启动方式。
- [全局配置](https://wiki.metacubex.one/config/general/)、[代理端口](https://wiki.metacubex.one/config/inbound/port/)：监听、认证、控制器与 CORS。
- [代理集合](https://wiki.metacubex.one/config/proxy-providers/)、[集合文件格式](https://wiki.metacubex.one/config/proxy-providers/content/)、[代理组](https://wiki.metacubex.one/config/proxy-groups/)与[规则](https://wiki.metacubex.one/config/rules/)：订阅、健康检查、策略选择和匹配顺序。
- [DNS 配置](https://wiki.metacubex.one/config/dns/)与[TUN 配置](https://wiki.metacubex.one/config/inbound/tun/)：名称解析与额外流量接入方式。
- [MetaCubeX/meta-rules-dat](https://github.com/MetaCubeX/meta-rules-dat)：GeoIP、GeoSite 数据与分类；本例使用其发布的 DAT 数据。
- [MetaCubeXD](https://github.com/MetaCubeX/metacubexd)：独立面板与内核连接说明。
- [Docker daemon 代理](https://docs.docker.com/engine/daemon/proxy/)、[Compose run](https://docs.docker.com/reference/cli/docker/compose/run/)：拉取镜像的网络与临时运行参数。
- Keba：[《mzz2017/v2raya》](https://hi.keba.host/archives/v2raya)：v2rayA 的 NAS 部署、端口分享与应用代理参考，核对日期为 2026 年 10 月 10 日。
- [v2rayA Docker 部署说明](https://github.com/v2rayA/v2rayA/blob/v2.5.10/README.md#install)与[v2.5.10 发布记录](https://github.com/v2rayA/v2rayA/releases/tag/v2.5.10)：官方镜像、bridge 部署与版本变化。
- v2rayA v2.5.10 的[快速开始](https://github.com/v2rayA/v2rayA/blob/v2.5.10/gui/src/docs/zh/quick-start.md)、[入站说明](https://github.com/v2rayA/v2rayA/blob/v2.5.10/gui/src/docs/zh/inbounds.md)与[分流说明](https://github.com/v2rayA/v2rayA/blob/v2.5.10/gui/src/docs/zh/routing.md)：订阅与节点、默认端口、局域网访问、认证和规则代理。
