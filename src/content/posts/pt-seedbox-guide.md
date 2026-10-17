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

Seedbox 是一台持续运行下载器的远程服务器，也就是 PT 圈里说的“盒子”：下载和做种走机房网络，家里的设备只负责管理。租之前要先弄清楚两件事：站点允许怎么用盒子，以及每月的流量够不够。

下面的配置针对有管理员权限的 Debian / Ubuntu 服务器，用 [Dedicated-Seedbox](https://github.com/jerry048/Dedicated-Seedbox) 安装 qBittorrent，再接 RSS。安装参数已对照 **2026 年 10 月 9 日**的项目源码，带宽和费用按供应商条款计算，没有租机跑分数据。

## 先确认站规，再决定租什么

租服务器前，先检查准备使用的站点是否允许盒子、是否需要申报 IP，以及允许哪些客户端和版本。有的站点会限制盒子上传计分、单种速度、账号同时使用的 IP 或自动订阅方式，这些要求无法用一份通用教程代替。

还要把下面三个概念分开：

- **实际上传量**：客户端向其他用户传出的数据。
- **站点计入的上传量**：经过站点倍率、优惠和盒子规则计算后的结果。
- **做种时间**：站点认可的持续保种时间，可能与客户端本地计时不同。

分享率通常是站点计入上传量除以计入下载量，但站点可能另有考核规则。Freeleech 也不一定免除 H&R（下载后未满足保种要求）责任；部分站点连未完成下载的任务也有约束。开始前记下最低做种时间、分享率条件及截止期限。

盒子用于传输自己有权获取和分享的内容。供应商标注“不限流量”，也仍受服务条款约束，使用前要一并确认内容政策与投诉处理要求。

## 选机：带宽、硬盘和账单一起看

先定预算和维护方式。第一次租用可选短周期，确认安装、做种与账单合适，再决定是否续费。

| 类型                    | 适合的情况                 | 下单前确认                                                   |
| ----------------------- | -------------------------- | ------------------------------------------------------------ |
| 托管 Seedbox / 共享盒子 | 希望直接使用现成面板       | 客户端版本、任务数、存储配额、流量政策，是否允许自己安装程序 |
| VPS                     | 想学习部署，任务规模较小   | 共享 CPU / 磁盘限制、持续带宽政策、端口和月流量              |
| 独立服务器              | 需要较大容量和更可控的资源 | 硬盘健康、实际可用容量、机房网络、安装费与维护成本           |

**端口的 1 Gbit/s 是链路速率，理论上限 125 MB/s，持续上传通常更低。** 实际值还会受协议开销、对端需求、线路、CPU 与磁盘读写影响。机械盘面对大量并发随机读写，也可能先于网络成为瓶颈。

月流量尤其容易忽略。假设平均持续上传 10 MB/s，按十进制计算，30 天就约为 **25.92 TB**；只有 20 TB 出站额度的套餐，长时间运行也需要限速和预算管理。客户端显示的 MiB/s 与商家标注的 MB/s、TB，不一定使用同一套单位。

以 [Hetzner 官方流量说明](https://docs.hetzner.com/robot/general/traffic/)为例，本次核对时，独立服务器默认 1 Gbit 上联包含不限流量；10 Gbit 上联包含 20 TB 月流量，超出部分另收费。Cloud 产品有自己的地区和套餐额度，**独服的规则不适用于 VPS**。页面同时说明月流量按出站计算，下单前看具体订单与当时政策。

预算至少包含：租金、安装费、税费、额外 IP、超额流量及必要备份。RAID 0 可以汇总容量并改善部分读写场景，但任一成员盘故障都可能导致整个阵列数据丢失；它也不提供备份能力。对于长期保种，稳定运行和恢复成本往往比瞬时峰值更值得关注。

[Hostloc](https://hostloc.com/misc.php?mod=mobile)可以用来寻找使用反馈，但机型、机房、测试时间和商家条款都要对齐。这里保存的是社区入口，不是具体评测。

<span id="第一步准备服务器"></span>

## 准备服务器

Dedicated-Seedbox 当前文档标注为 V2.0.0，支持 Debian 11 及以上、Ubuntu 20.04 及以上，以及 `amd64` / `arm64`。这是脚本的兼容范围；新装机器仍应选择处于安全维护期、供应商支持的系统。本例按带 systemd 的全新 Debian 12 / 13 服务器展开。

通过供应商控制台安装系统、配置 SSH 密钥并核对主机指纹，然后从自己的电脑连接：

```bash
ssh -p SSH_PORT ADMIN_USER@SERVER_IP
```

将占位符替换成实际 SSH 端口、管理员账号和服务器地址；它们不是稍后创建的下载器账号。后面的安装命令在服务器的 Bash 中执行，使用具备 `sudo` 权限的管理员。

先核对机器与挂载情况：

```bash
cat /etc/os-release
uname -m
free -h
lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINTS
df -hT
```

尤其看清大容量数据盘是否已经挂载。买了几 TB 硬盘，却把任务下载到几十 GB 的系统分区，是很常见的空间问题。准备独立数据目录时，让下载器账号拥有对应权限；不要靠给整个目录 `777` 解决权限错误。

安装前就规划防火墙：保留自己的 SSH 管理入口，禁止公网访问 WebUI 的 `8080/TCP`；BitTorrent 入站端口另按本例放行 `45000/TCP` 与 `45000/UDP`。同时检查 IPv4、IPv6 和供应商侧规则，修改 SSH 规则时保留当前连接并确认新连接能登录。

<span id="第二步安装-qbittorrent"></span>

## 安装 qBittorrent

### 先看脚本会做什么

当前项目以 `seedboxctl` 管理 qBittorrent、调优、BBR、Docker、Vertex、autobrr 和自动删种组件，旧教程中的一长串短参数与现在的脚本行为已经不同。

默认的 dedicated 安装会选择 qBittorrent 和主机调优。本例**明确只装 qBittorrent**，建立账号、安装所需依赖、写入配置和 systemd 服务，暂时不安装订阅器、删种器及 BBR 变体。调优会涉及内核、网络和磁盘参数，BBR 组件还可能引入内核或 DKMS 变更，等基础传输稳定后再单独评估。

下面固定到本次核对的提交，方便对照参数；以后安装新版本，应重新查看项目更新和安全修复，再一起更新提交与版本选择。

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

在 `less` 中按 `q` 退出。还需要查看同一提交中的 [`lib/`](https://github.com/jerry048/Dedicated-Seedbox/tree/97470df47a948b0f39082e7679c630eaeff438d1/lib) 与[静态版本清单](https://github.com/jerry048/Dedicated-Seedbox/blob/97470df47a948b0f39082e7679c630eaeff438d1/manifests/qbittorrent.tsv)：`Install.sh` 会继续下载运行模块和客户端，保存到本地后仍会访问网络。

### 执行最小安装

确认站点允许的 qBittorrent 版本存在于清单后，在**同一个 SSH 会话**执行：

```bash
bash Install.sh --lang zh-CN --help

sudo env SEEDBOX_RUNTIME_REF="$SEEDBOX_REF" \
  bash Install.sh --lang zh-CN \
  --components qbittorrent --no-tuning \
  --user seedbox --source static \
  --cache 512 --web-port 8080 --incoming-port 45000
```

`seedbox` 是示例服务账号，可以统一换成自己的中性账号名。脚本会交互询问 WebUI 密码；输入时不回显，避免把真实密码直接写进命令历史。未指定客户端版本时，交互会话会列出当前架构支持的 qBittorrent / libtorrent 组合，再选择站点允许的一组；没有合适版本就先停止，不必为了完成安装跳过站规。

`--cache 512` 是示例缓存参数，单位 MiB，**不是进程总内存上限**，具体效果与客户端及 libtorrent 版本有关。`--no-tuning` 跳过的是主机调优，qBittorrent 自身仍会被写入项目的配置参数，安装后还要检查。

`SEEDBOX_RUNTIME_REF` 将后续模块固定在同一提交，避免只固定入口脚本却下载另一版本的模块。静态二进制下载默认要求 SHA-256 校验；校验失败应检查来源与日志，不使用 `--allow-unverified-downloads` 把错误跳过去。

装好后查看：

```bash
seedboxctl version
sudo seedboxctl qbittorrent status --user seedbox
sudo seedboxctl doctor
```

共享盒子若只提供普通 Unix 账号，需先取得服务商允许，再看项目的 `--rootless` 流程。它只支持安装 qBittorrent，不运行 APT、不创建系统用户，也不安装主机调优与其它管理组件，不能直接套用上面的 `sudo` 命令。

<span id="第三步连接面板并完成初始设置"></span>

## SSH 隧道与初始设置

在自己的电脑另开终端，建立 SSH 隧道：

```bash
ssh -N -L 127.0.0.1:18080:127.0.0.1:8080 -p SSH_PORT ADMIN_USER@SERVER_IP
```

保持终端运行，在本机浏览器打开 `http://127.0.0.1:18080`，用 `seedbox` 和刚设定的 WebUI 密码登录。本机 `18080` 被占用时可以换另一个端口；服务器端仍对应 `8080`。

这个隧道只负责管理页面。种子流量仍走服务器网络，BT 入站端口也与 WebUI 端口无关。隧道不会自动关闭原有公网监听，所以前面的防火墙限制仍然需要保留。只通过隧道管理时，可在 WebUI 设置中把监听地址改为 `127.0.0.1`，并保留身份认证。

随后逐项检查：

1. **保存路径**：项目默认下载目录为 `/home/seedbox/qbittorrent/Downloads`，确认它落在计划使用的文件系统上，必要时先改到数据盘。
2. **队列与并发**：本次源码默认关闭 qBittorrent 队列限制。先重新启用合适的限制，例如从 1～2 个同时下载任务开始观察；长期保种任务仍需保持可连接。
3. **连接与限速**：核对入站端口，按套餐流量和站规设全局速度限制，不照抄“连接数越大越好”的参数。
4. **管理安全**：保留 CSRF、Host 校验等保护，不开启公网免密访问；PT Passkey、Cookie、RSS 地址和 `.torrent` 文件都按凭据保管。

WebUI、SSH 和 PT 站点应使用不同密码。截图或求助日志要遮掉 Tracker 地址中的 Passkey，配置备份也不能直接发到公开仓库。

<span id="第四步先手动跑通一个任务"></span>

## 下载与站点记录

先选一个站规允许、体积可控、确实有下载需求的任务，手动添加到明确分类，检查保存路径，再开始下载。等客户端完成下载并转为做种后，核对 Tracker 返回状态和站点的做种列表。

客户端显示“做种中”时，上传可能仍是零：其他用户已经下完、对端速度较慢、相同资源做种者太多，都会让上传很少。新发布资源可能更容易遇到下载需求，同时也可能面对更多高速盒子竞争；单看发布时间或热度，无法预测最终上传量。

选种可以同时考虑需求、资源大小、保留时间与自己的磁盘余量。Freeleech 有助于控制站点计入下载量，但它有时限，优惠结束后如何计费要看站规。不要在优惠快结束时自动加入一个明显无法及时完成的大任务。

对比站点统计时，留出正常汇报和刷新时间。客户端总上传量、单任务上传量与站点计入值不是同一指标，也不要为了刷新数字而反复强制汇报。客户端下载、校验、上传与站点记录都正常后，再增加任务。

<span id="第五步逐步开启-rss-与自动管理"></span>

## RSS 与自动管理

手动任务正常后，再用客户端 RSS，或接入 [Vertex](/posts/vertex-guide/)与 autobrr。Vertex 管理订阅和任务；autobrr 按站点支持的公告方式匹配资源。

第一次只接一个站点、一条规则，并限定分类。下面是一组**配置思路示例**，数值按自己的硬盘和流量预算改：

| 条件       | 起步做法                                                |
| ---------- | ------------------------------------------------------- |
| 资源范围   | 只选自己希望保留的分类，排除不需要的合集与重复发布      |
| 单种体积   | 按硬盘和流量预算设上限，例如先限制在 20 GiB 以内        |
| 添加频率   | 设置每小时或每天的任务数量上限，遵守站点订阅频率要求    |
| 空间余量   | 同时计算未完成任务还需写入的数据，预留运行空间          |
| 并发与带宽 | 管理工具限制添加量，下载器负责实际并发与全局限速        |
| 优惠条件   | 仅在工具能可靠识别时使用 Freeleech 条件，并考虑剩余时间 |

不同工具提供的字段不同；某个限制没有对应选项时，就在下载器或管理流程中补齐。只有关键词、没有体积和数量限制的 RSS，很容易在一轮更新中塞满磁盘。[autobrr 文档](https://autobrr.com/filters/)也明确说明：未填写的过滤条件会被跳过，只选择站点而不设置其他条件，可能匹配该站全部发布。

### 自动删种最后再开

自动添加与自动删除分开配置。第一轮先看规则命中哪些任务，核对最低保种要求，然后再允许执行删除。

删除条件应同时满足：任务属于自动管理分类、站点规定的做种义务已经完成、没有人工保护标记，并且删除数据不会破坏其他任务。**客户端分享率达到 1，站点侧的最低保种要求仍要单独看**；本地做种计时也要回到站点统计确认。

如果规则工具只知道本地时间、速度或分享率，却不知道站点的考核状态，应保守保留或人工确认。磁盘接近满时优先暂停新增任务；不要让“剩余空间不足”直接覆盖最低保种时间。

Dedicated-Seedbox 的 autoremove-torrents 组件默认生成待编辑的配置模板，需要编辑后再启用定时器，本例没有安装它。以后配置删种时，还要分清“删除任务”和“同时删除数据”：删除跨站辅种共用的文件，可能破坏其他任务；媒体库仍保留硬链接时，删除下载目录的入口也未必立即释放预期空间。

## 监控、排错与到期处理

日常至少看磁盘、内存、月出站流量和服务状态。流量预算以供应商账单口径为准，客户端计数可以辅助观察；Hetzner Robot 的流量告警只是提醒，不是自动停机或封顶开关。

```bash
df -h
free -h
sudo systemctl status seedbox-qbittorrent-seedbox.service --no-pager
sudo journalctl -u seedbox-qbittorrent-seedbox.service -n 100 --no-pager
```

| 现象                       | 优先检查                                                         |
| -------------------------- | ---------------------------------------------------------------- |
| SSH 隧道建立，但面板打不开 | 本机端口是否冲突、服务是否启动、远端 WebUI 是否确实使用 8080     |
| 下载正常，上传很少         | 是否有下载者、Tracker 状态、入站 TCP / UDP、防火墙与实际网络限制 |
| 磁盘繁忙，网络跑不满       | 并发任务、校验操作与随机读写，先减少并发再判断硬件瓶颈           |
| 客户端反复退出             | 日志中的 OOM、磁盘满、权限和版本问题                             |
| RSS 没有添加任务           | 订阅是否有效、过滤条件是否命中、凭据是否过期、接口是否可达       |
| 站点统计没有增加           | 汇报是否成功、统计刷新时间、优惠倍率与盒子上传计分规则           |

更新客户端前，先确认站点白名单和配置兼容性，并备份 qBittorrent 配置、任务恢复数据及自动化规则。配置备份不包含下载文件，需要迁移做种数据时应另外搬运并重新校验。

准备退租时，提前停止接收新任务，完成已有保种义务，备份必要数据并按供应商期限取消续费。迁移到另一台机器后重新校验文件，确认站点记录正常，再清理旧机器；不要等到最后一天才发现仍有未满足要求的任务。

## 参考资料

- [Dedicated-Seedbox 项目](https://github.com/jerry048/Dedicated-Seedbox)：当前安装入口、支持环境与组件管理。
- [本次核对的 Install.sh](https://github.com/jerry048/Dedicated-Seedbox/blob/97470df47a948b0f39082e7679c630eaeff438d1/Install.sh)、[qBittorrent 组件](https://github.com/jerry048/Dedicated-Seedbox/blob/97470df47a948b0f39082e7679c630eaeff438d1/lib/components/qbittorrent.bash)与[环境检测](https://github.com/jerry048/Dedicated-Seedbox/blob/97470df47a948b0f39082e7679c630eaeff438d1/lib/core/detect.bash)：参数、版本选择、配置写入与系统要求。
- [Hetzner 官网](https://www.hetzner.com/)、[官方流量说明](https://docs.hetzner.com/robot/general/traffic/)、[服务条款](https://www.hetzner.com/legal/terms-and-conditions/)与[系统政策](https://www.hetzner.com/legal/system-policies/)：产品及流量政策看订单和当前官方条款。
- [autobrr 过滤规则](https://autobrr.com/filters/)与[autoremove-torrents 文档](https://autoremove-torrents.readthedocs.io/en/latest/intro.html)：自动筛选与删除功能的边界。
- [Hostloc 手机版入口](https://hostloc.com/misc.php?mod=mobile)：社区入口，不作为供应商政策或性能结论的依据。
