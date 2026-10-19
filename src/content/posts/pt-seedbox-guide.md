---
title: PT Seedbox：选机、安装与做种
description: 先确认站规和流量预算，再用 Dedicated-Seedbox 装 qBittorrent 并接 RSS。
author: Ayulog
pubDatetime: "2026-10-09T23:20:00+08:00"
draft: false
category: pt
tags:
  - qBittorrent
---

Seedbox（俗称“盒子”）是运行在机房网络下的远程下载服务器，下载与做种流量直接走服务器带宽，本地电脑只负责登录管理。

本文梳理租用 Seedbox 前的站规与流量核算，并在具备管理员权限的 Debian / Ubuntu 服务器上使用 [Dedicated-Seedbox](https://github.com/jerry048/Dedicated-Seedbox) 部署 qBittorrent、建立 SSH 管理隧道以及配置 RSS 规则。

## 选机前的站规与成本核对

### 站点规则与统计口径

在租用服务器前，先查阅目标 PT 站点的盒子使用规范：确认站点是否需要提前申报盒子 IP、允许哪些客户端版本，以及是否对盒子设置了专门的上传计分折算、单种限速或同时在线 IP 限制。

核对做种数据时，注意区分三项指标：

- **客户端实际上传量**：下载器向其他节点发出的原始数据量。
- **站点计入上传量**：经过站点优惠倍率、盒子计分规则折算后写入个人档案的上传量。
- **站点做种时间**：站点 Tracker 记录的有效保种时长。许多站点对 Freeleech（免费）种子同样执行 H&R（Hit and Run）最低保种时长或分享率考核，设置删种规则前需以站点规则为准。

### 机型对比与月流量预算

初次使用建议先按月租用，验证网络连通性、磁盘读写与账单成本后再决定是否长期续费：

| 类型                    | 适用场景                   | 下单前核对要点                                               |
| ----------------------- | -------------------------- | ------------------------------------------------------------ |
| 托管 Seedbox / 共享盒子 | 希望开箱即用、免系统维护   | 预装客户端版本、活跃任务数上限、磁盘配额、流量政策及扩展权限 |
| VPS                     | 任务规模较小、练手部署     | 共享 CPU / 磁盘 I/O 限制、持续占满带宽的限制条款与月流量包   |
| 独立服务器（独服）      | 大容量存储或高并发刷流保种 | 硬盘健康度（SMART）、实际可用容量、机房线路、初装费与月流量  |

评估机器性能与账单时重点关注两项：

1. **端口速率与磁盘瓶颈**：`1 Gbit/s` 端口的理论传输上限约为 `125 MB/s`，实际持续上传速率还受对端下载需求、机房线路与磁盘随机 I/O 制约；多任务高并发读写下，机械硬盘往往比网络端口更早达到瓶颈（多盘位机型组 RAID 0 虽能合并容量并提升吞吐，但单盘故障会导致整组数据丢失）。
2. **月出站流量上限**：若平均持续上传速率为 `10 MB/s`，按十进制计算 30 天累计出站流量约为 **25.92 TB**。以 [Hetzner 官方流量说明](https://docs.hetzner.com/robot/general/traffic/)为例，其独立服务器 1 Gbit 端口套餐通常不限月流量，而 10 Gbit 端口套餐默认包含 20 TB 月出站流量（超出部分按量计费），Cloud VPS 则按地区和规格单独设定流量包。下单前需看清流量统计口径，并在下载器中合理设置全局上传限速。社区机型反馈可参考 [Hostloc](https://hostloc.com/misc.php?mod=mobile) 等论坛，并结合当前商家条款核实。

<span id="第一步准备服务器"></span>

## 服务器环境与磁盘准备

Dedicated-Seedbox（V2.0.0）支持 Debian 11+ 与 Ubuntu 20.04+（`amd64` / `arm64` 架构）。下文以全新安装的 Debian 12 / 13 独立服务器为例。

在服务商控制台完成系统安装并配置 SSH 密钥后，从本地终端登录服务器：

```bash
ssh -p SSH_PORT ADMIN_USER@SERVER_IP
```

登录后先检查系统版本、内存以及大容量数据盘的挂载位置：

```bash
cat /etc/os-release
uname -m
free -h
lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINTS
df -hT
```

重点确认几 TB 的数据盘是否已正确挂载到目标目录，避免后续把种子文件写入只有几十 GB 的系统根分区。同时规划好防火墙规则：放行当前 SSH 端口以及后续 BitTorrent 入站端口（本例使用 `45000/TCP` 与 `45000/UDP`），并禁止公网直接访问 WebUI 端口（`8080/TCP`）。

<span id="第二步安装-qbittorrent"></span>

## 使用 Dedicated-Seedbox 安装 qBittorrent

### 拉取并检查安装脚本

当前版本的 Dedicated-Seedbox 通过 `seedboxctl` 统一管理 qBittorrent、系统调优、BBR、Docker、Vertex、autobrr 与自动删种组件。为了保持环境可控，本例**仅安装 qBittorrent 组件**（`--components qbittorrent --no-tuning`），暂不启用内核网络调优、BBR 变体或自动删种模块，待基础下载和做种稳定后再按需评估。

下面将脚本固定到已验证的提交版本（`97470df4`），先下载脚本并查看源码与[静态版本清单](https://github.com/jerry048/Dedicated-Seedbox/blob/97470df47a948b0f39082e7679c630eaeff438d1/manifests/qbittorrent.tsv)：

```bash
sudo apt update
sudo apt install --no-install-recommends ca-certificates curl less

mkdir -p ~/seedbox-setup
cd ~/seedbox-setup
SEEDBOX_REF=97470df47a948b0f39082e7679c630eaeff438d1
curl --fail --location \
  "https://raw.githubusercontent.com/jerry048/Dedicated-Seedbox/${SEEDBOX_REF}/Install.sh" \
  --output Install.sh
less Install.sh
```

### 执行最小化安装

确认站点客户端白名单允许的 qBittorrent 版本在清单内后，在同一个 SSH 会话中执行安装：

```bash
bash Install.sh --lang zh-CN --help

sudo env SEEDBOX_RUNTIME_REF="$SEEDBOX_REF" \
  bash Install.sh --lang zh-CN \
  --components qbittorrent --no-tuning \
  --user seedbox --source static \
  --cache 512 --web-port 8080 --incoming-port 45000
```

关键参数说明：

- `--user seedbox`：创建名为 `seedbox` 的专用系统运行账户（可替换为自定义账户名）。脚本会交互式提示输入 WebUI 密码（输入过程不回显），并列出当前架构支持的 `qBittorrent / libtorrent` 版本组合供选择。
- `--cache 512`：将客户端缓存设为 `512` MiB。
- `SEEDBOX_RUNTIME_REF="$SEEDBOX_REF"`：将脚本运行期动态拉取的 [`lib/` 模块](https://github.com/jerry048/Dedicated-Seedbox/tree/97470df47a948b0f39082e7679c630eaeff438d1/lib)锁定在同一提交版本；静态二进制包下载后默认执行 SHA-256 校验。

安装完成后检查服务运行状态：

```bash
seedboxctl version
sudo seedboxctl qbittorrent status --user seedbox
sudo seedboxctl doctor
```

> 注：若使用的是仅提供普通非 root 账号的共享盒子，在征得服务商允许后可查阅项目的 `--rootless` 安装模式（该模式仅在用户目录下部署 qBittorrent，不调用 APT 或创建系统服务）。

<span id="第三步连接面板并完成初始设置"></span>

## SSH 隧道连接与初始设置

### 建立 SSH 本地端口转发

为了避免将 HTTP WebUI 直接暴露在公网，在本地电脑新开一个终端窗口，建立 SSH 隧道将本机 `18080` 端口转发到服务器的 `127.0.0.1:8080`：

```bash
ssh -N -L 127.0.0.1:18080:127.0.0.1:8080 -p SSH_PORT ADMIN_USER@SERVER_IP
```

保持该终端运行，在本地浏览器访问 `http://127.0.0.1:18080`，输入用户名 `seedbox` 和安装时设定的密码登录。SSH 隧道仅转发网页管理请求，种子数据传输仍直接走服务器机房网络；若日常仅通过隧道访问面板，可在 qBittorrent 的 **Web UI** 设置中将监听 IP 地址改为 `127.0.0.1`。

### 核对路径、队列与限速

首次进入 WebUI 后依次检查以下四项：

1. **默认保存路径**：脚本默认将下载目录设为 `/home/seedbox/qbittorrent/Downloads`，请确认该路径位于大容量数据盘分区上（若数据盘挂载在其他目录，先修改默认保存路径并确认 `seedbox` 账户拥有读写权限）。
2. **任务队列限制**：脚本默认配置关闭了活动任务排队。建议重新勾选队列限制，起步先设为同时下载 `1–2` 个任务，防止短时间内涌入大量任务拖垮磁盘 I/O。
3. **全局速度与连接数**：确认入站端口为 `45000`，并根据服务器月流量包预算与站规设置全局上传/下载速度上限。
4. **安全校验**：保持启用 CSRF 防护与 Host Header 校验。

<span id="第四步先手动跑通一个任务"></span>

### 手动跑通首个种子

在开启任何自动化工具前，先从站点手动下载一个体积适中、有活跃下载需求的种子，指定分类并确认保存路径正确。下载完成转入做种后，检查客户端内的 Tracker 状态显示正常，再到 PT 站点的个人中心确认该种子已出现在“当前做种”列表中。

<span id="rss-与自动管理"></span>
<span id="第五步逐步开启-rss-与自动管理"></span>

## RSS 订阅与自动管理

### 配置 RSS 与筛选条件

手动下载与做种汇报验证通过后，再启用客户端内置 RSS，或接入 [Vertex](/posts/vertex-guide/)、autobrr 等自动化工具。初次配置建议遵循“单站点、单条规则、限定独立分类”的原则：

| 过滤维度 | 起步配置建议                                                |
| -------- | ----------------------------------------------------------- |
| 资源范围 | 仅勾选目标分类，排除大体积合集或重复发布                    |
| 单种体积 | 结合磁盘空间与月流量设置体积范围（例如限制 `20 GiB` 内）    |
| 推送频率 | 设置每小时或每日添加任务数上限，遵守站点请求频率规范        |
| 磁盘余量 | 扣除当前未完成任务的待写入空间，预留充足的安全余量          |
| 优惠筛选 | 仅在工具能准确识别时开启 Freeleech 过滤，并留意优惠剩余时间 |

在配置 [autobrr](https://autobrr.com/filters/) 等工具时，务必填写体积、分类或频率限制（未填写的过滤项默认不限制，若仅勾选站点而不设条件，会把该站新发布的全部种子推入下载器）。

### 制定自动删种策略

自动添加稳定运行后，最后再评估自动删种（如 Vertex 删种规则或 Dedicated-Seedbox 可选的 `autoremove-torrents` 组件）：

- **严格对齐保种规则**：删种条件应同时限定在自动化专用分类内，并确保已满足站点的最短做种时长、分享率或 H&R 要求。若自动化工具只能读取本地做种时间和分享率、无法获知站点侧 H&R 状态，应延长本地保留时间或采用人工确认。
- **空间告警处理**：当磁盘空间接近阈值时，优先暂停 RSS 新增任务，避免让“剩余空间不足”规则强行删除尚未完成保种考核的种子。

## 常见问题与维护

### 日常监控与故障排查

日常维护可通过以下命令检查磁盘余量、内存占用与 qBittorrent 服务日志，并定期在服务商后台核对月度出站流量账单：

```bash
df -h
free -h
sudo systemctl status seedbox-qbittorrent-seedbox.service --no-pager
sudo journalctl -u seedbox-qbittorrent-seedbox.service -n 100 --no-pager
```

| 现象                       | 优先检查                                                            |
| -------------------------- | ------------------------------------------------------------------- |
| SSH 隧道已连上，面板打不开 | 本地 `18080` 端口是否冲突、`seedbox-qbittorrent` 服务是否运行       |
| 下载正常，但上传量很低     | 种子当前是否有下载需求、Tracker 状态、`45000` TCP/UDP 防火墙放行    |
| 磁盘 I/O 满载，带宽跑不满  | 同时下载或校验的任务过多；开启队列限制、减少并发任务数              |
| 客户端进程反复重启退出     | 通过 `journalctl` 排查是否触发了内存不足（OOM）、磁盘写满或权限错误 |
| RSS 规则未自动添加任务     | RSS 链接与凭据是否有效、体积或关键词条件是否过严、网络是否可达      |
| 站点个人数据未更新上传量   | 等待站点正常汇报周期刷新，核对站点优惠倍率与盒子上传计分规则        |

### 升级、迁移与到期退租

- **客户端升级与备份**：升级前先确认目标版本在站点白名单内，停止服务后备份 qBittorrent 的配置目录、`.fastresume` 任务恢复数据及自动化规则。
- **到期退租与迁移**：计划退租或更换服务器时，提前几天停止 RSS 新增任务，待现有任务全部完成站点 H&R 保种要求后，再迁移需长期保种的数据文件并在新机器上完成本地校验，最后在服务商账单周期截止前取消续费并清理旧服务器数据。

## 参考资料

- [Dedicated-Seedbox 项目](https://github.com/jerry048/Dedicated-Seedbox)、[Install.sh 源码](https://github.com/jerry048/Dedicated-Seedbox/blob/97470df47a948b0f39082e7679c630eaeff438d1/Install.sh)、[qBittorrent 组件](https://github.com/jerry048/Dedicated-Seedbox/blob/97470df47a948b0f39082e7679c630eaeff438d1/lib/components/qbittorrent.bash)与[环境检测](https://github.com/jerry048/Dedicated-Seedbox/blob/97470df47a948b0f39082e7679c630eaeff438d1/lib/core/detect.bash)。
- [Hetzner 官网](https://www.hetzner.com/)、[官方流量说明](https://docs.hetzner.com/robot/general/traffic/)、[服务条款](https://www.hetzner.com/legal/terms-and-conditions/)与[系统政策](https://www.hetzner.com/legal/system-policies/)。
- [autobrr 过滤规则](https://autobrr.com/filters/)与 [autoremove-torrents 文档](https://autoremove-torrents.readthedocs.io/en/latest/intro.html)。
- [Hostloc 手机版入口](https://hostloc.com/misc.php?mod=mobile)。
