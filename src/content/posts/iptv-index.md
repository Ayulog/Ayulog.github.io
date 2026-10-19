---
title: IPTVindex：找直播源、接入播放器与节目单
description: 找现成直播列表并接入播放器：IPTVindex 导航、IPTV-org 的 M3U 列表与 XMLTV 节目单。
author: Ayulog
pubDatetime: "2026-10-11T12:00:00+08:00"
modDatetime: "2026-10-11T00:00:00+08:00"
draft: false
category: library
tags:
  - IPTV
---

如果不想在 NAS 上部署容器服务，可以直接从 [IPTVindex](https://iptvindex.com/) 寻找现成的公开直播列表，导入电脑或电视播放器，再补充 XMLTV 节目单。若后续需要为家里多台设备统一维护订阅与自定义分组，再考虑部署 [Allinone 与频道整理服务](/posts/iptv-guide/)。相关工具入口见 [NAS 服务清单](/posts/nas-software-websites/#直播命名与刮削)。

## IPTVindex 导航结构

IPTVindex 是一个直播与影音工具导航站，首页按功能划分为多个专区，汇总了常用的播放器客户端、公开直播源、EPG 节目单与辅助工具：

| 导航专区                            | 主要收录内容                                                    |
| ----------------------------------- | --------------------------------------------------------------- |
| [直播](https://iptvindex.com/#iptv) | 各平台 IPTV 播放器、公开直播源列表、EPG 节目单及酷9等客户端说明 |
| [在线](https://iptvindex.com/#web)  | 央视网及各省市地方广电的官方网页直播入口                        |
| [点播](https://iptvindex.com/#vod)  | 点播工具导航（站内原有的自建聚合点播接口已停止开放）            |

从导航站进入具体项目后，建议直接查阅该项目 GitHub 仓库或发布页的最新说明，以确认当前维护状态与适配平台（例如 [fanmingming/live](https://github.com/fanmingming/live) 目前已转为维护电视/广播台标库与工具，不再直接作为频道直播源使用）。

## 常见地址与文件类型

在收集和配置直播资源时，需按链接实际返回的内容填入播放器的对应位置：

| 地址类型         | 实际内容                                        | 使用方式                          |
| ---------------- | ----------------------------------------------- | --------------------------------- |
| 导航页、项目主页 | 网页说明、文档或客户端安装包下载链接            | 在浏览器中打开，查找具体订阅链接  |
| M3U 频道列表     | 以 `#EXTM3U` 开头，包含多频道名称、台标与流地址 | 填入播放器的“直播订阅 / 播放列表” |
| 单频道流地址     | 单个频道的实时流（常见为 HLS `.m3u8`）          | 在播放器中“打开网络串流”单次测试  |
| XMLTV 节目单     | `.xml` 或 `.xml.gz` 格式的频道节目预告数据      | 填入播放器的“EPG / 节目单订阅”    |

注意区分播放列表 `.m3u` 与单频道 HLS 分片清单 `.m3u8`（以及不带文件扩展名的动态订阅接口），配置前可先在浏览器或文本编辑器中打开链接，确认返回的是以 `#EXTM3U` 开头的频道列表，而非普通网页（如 `https://iptvindex.com/` 导航首页）。

## 获取公开直播列表

[IPTV-org](https://github.com/iptv-org/iptv) 维护了全球公开可访问的网络电视直播流，并提供按语言、国家/地区和节目类型拆分的 M3U 订阅链接。初次测试可直接使用其按语言筛选的中文列表：

```text
https://iptv-org.github.io/iptv/languages/zho.m3u
```

若需要其他分类范围，可在项目的 [PLAYLISTS.md](https://github.com/iptv-org/iptv/blob/master/PLAYLISTS.md) 中查找对应链接：

| 列表范围 | 订阅地址                                            | 说明                   |
| -------- | --------------------------------------------------- | ---------------------- |
| 全部频道 | <https://iptv-org.github.io/iptv/index.m3u>         | 汇总所有公开收录的频道 |
| 中文频道 | <https://iptv-org.github.io/iptv/languages/zho.m3u> | 按语言（中文）筛选     |
| 中国频道 | <https://iptv-org.github.io/iptv/countries/cn.m3u>  | 按播出国家/地区筛选    |

公开直播流的可用性会随上游源状态与本地网络环境（如运营商线路、IPv4 / IPv6 连通性）动态变化；部分收录在项目数据库中的频道可能暂时没有可用流地址（详见项目 [FAQ](https://github.com/iptv-org/iptv/blob/master/FAQ.md)），导入后挑选当前网络下播放流畅的频道即可。

## 导入电脑和电视播放器

### 电脑端：使用 VLC 验证列表

从 [VideoLAN 官网](https://www.videolan.org/vlc/) 下载安装 VLC，参照官方[网络串流说明](https://docs.videolan.me/vlc-user/desktop/3.0/en/basic/media.html#playing-a-network-stream)测试列表：

1. 打开 **媒体 → 打开网络串流**（Media → Open Network Stream）。
2. 在网络 URL 框中粘贴上方的 `zho.m3u` 地址，点击**播放**。
3. 打开 VLC 的**播放列表视图**（快捷键 `Ctrl+L`），即可看到解析出的全部频道并逐个点击试播。

### 电视端：以酷9订阅配置为例

在 Android TV 或电视盒子上使用酷9等直播应用时，首次打开尚未导入列表会显示黑屏，按以下路径填入订阅地址（具体功能说明见[酷9维护者说明帖](https://www.right.com.cn/FORUM/thread-8427797-1-1.html)）：

- **列表配置 → 列表订阅**：填入 M3U 或 TXT 直播列表地址。
- **列表配置 → EPG 订阅**：填入下方的 XMLTV 节目单地址。

保存并手动刷新订阅后，即可调出频道列表测试切台与解码。

## 配置 XMLTV 节目单（EPG）

直播列表用于提供视频流，而 EPG 节目单用于在切台时显示当前节目名称与后续时间表。[EPG.PW](https://epg.pw/xmltv.html?lang=zh-hans) 提供了按国家/地区整理的免费 XMLTV 数据，例如中国大陆地区的 XML 地址为：

```text
https://epg.pw/xmltv/epg_CN.xml
```

该页面同时提供体积更小的 `.xml.gz` 压缩格式（根据所用播放器是否支持直接解压 `.gz` 选择）。将地址填入播放器的 EPG 设置后，重点检查三项：

1. **节目单拉取状态**：确认播放器已成功下载并解析 XMLTV 文件。
2. **频道标识匹配**：播放器通常依据 M3U 中的 `tvg-id` 或频道名与 XMLTV 里的频道 ID 自动关联。由于不同来源的 M3U 列表与 EPG 节目单命名未必完全一致，若个别频道有画面但未显示节目预告，可在播放器内手动绑定频道映射。
3. **时区与时间偏移**：若节目预告时间整体相差数小时，在播放器的 EPG 设置中调整时区偏移量即可。

## 直接观看官方网页直播

如果平时只在电脑或平板上看少量央视及地方卫视，也可以直接从 IPTVindex 的“[在线](https://iptvindex.com/#web)”栏目打开电视台官方直播网页（如[央视直播大全](https://tv.cctv.com/live/)），在浏览器中直接观看，省去维护 M3U 列表与节目单的步骤。

## 常见问题

| 现象                   | 优先检查                                                                       |
| ---------------------- | ------------------------------------------------------------------------------ |
| 导入后频道列表为空     | 确认填入的是以 `#EXTM3U` 开头的订阅链接而非网页地址，且播放器支持该列表格式    |
| 列表有频道但黑屏无画   | 切换几个不同频道对比，排查单条流地址是否已失效、有地区限制或需切换播放器软硬解 |
| 电脑能播，电视不能播   | 检查电视端的 DNS 设置、网络代理覆盖范围，以及电视是否具备可用的 IPv6 连接      |
| 只有 IPv6 频道打不开   | 确认路由器与播放设备已获取正常的公网 IPv6 地址                                 |
| 画面正常，但无节目单   | 检查 EPG 地址是否下载成功，以及 M3U 的 `tvg-id` / 频道名是否与 XMLTV 条目匹配  |
| 节目单时间差了几个小时 | 检查设备系统时区，或在播放器 EPG 设置中调整时间偏移                            |

## 参考资料

- [IPTVindex](https://iptvindex.com/)。
- [IPTV-org](https://github.com/iptv-org/iptv)、[播放列表说明](https://github.com/iptv-org/iptv/blob/master/PLAYLISTS.md)、[FAQ](https://github.com/iptv-org/iptv/blob/master/FAQ.md)。
- [EPG.PW XMLTV 列表](https://epg.pw/xmltv.html?lang=zh-hans)。
- [VLC：播放网络串流](https://docs.videolan.me/vlc-user/desktop/3.0/en/basic/media.html#playing-a-network-stream)。
- [酷9维护者说明帖](https://www.right.com.cn/FORUM/thread-8427797-1-1.html)。
- [fanmingming/live](https://github.com/fanmingming/live)。
- [央视直播大全](https://tv.cctv.com/live/)。
