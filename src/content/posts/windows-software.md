---
title: Windows 软件清单
description: Windows 装机工具与日常软件清单，按用途分组，附自启动、远程桌面和容器环境的笔记。
author: Ayulog
pubDatetime: "2026-10-09T00:00:00+08:00"
modDatetime: "2026-10-17T21:00:00+08:00"
draft: false
category: windows
tags:
  - 桌面软件
---

本文按用途整理 Windows 装机维护与日常使用的桌面软件。系统配置相关的独立笔记见：[设置程序开机自启动](/posts/windows-app-startup/)、[为 RDP 配置 TLS](/posts/windows-rdp-tls/)、[Windows 容器（WSLc / Docker）](/posts/windows-containers/)；游戏平台、Mod 管理、修改器、串流与安卓模拟器另见 [游戏平台与工具清单](/posts/game-software/)。

<span id="安卓模拟器"></span>
<span id="游戏平台与相关工具"></span>

## 系统安装与硬件检测

- **[微PE工具箱](https://www.wepe.com.cn/download.html)**：干净无捆绑的 Windows PE 启动盘制作工具，用于系统安装、分区与离线维护。
- **[图吧工具箱](https://www.tbtool.cn/index.html)**：集成主流硬件检测、烤机与跑分工具的合集，便于装机验机与故障排查。
- **[tubatools（WinUI 3 工具箱）](https://github.com/luolangaga/tubatools)**：社区维护的 WinUI 3 硬件检测与系统维护工具箱，采用 Windows 11 原生界面风格。
- **[TrafficMonitor](https://github.com/zhongyang219/TrafficMonitor)**：在任务栏或桌面悬浮窗实时显示上下行网速、CPU 与内存占用。

## 文件检索与预览

- **[Everything](https://www.voidtools.com/zh-cn/)**：基于 NTFS 索引的本地文件名秒级搜索工具。
- **[QuickLook](https://github.com/QL-Win/QuickLook)**：在资源管理器中选中文件后按空格键快速预览内容，支持通过插件扩展预览格式。
- **[ImageGlass](https://github.com/d2phap/ImageGlass)**：轻量开源的看图软件，支持常见与专业图片格式，内置缩放、旋转、裁剪和取色工具。

## 写作、编辑与开发

- **[Typora](https://typora.io/#feature)**：所见即所得的 Markdown 编辑器，支持表格、代码块、数学公式与图表渲染（付费买断制）。
- **[Notepad2](https://www.flos-freeware.ch/notepad2.html)**：启动极快的单文件轻量文本编辑器，适合替换系统记事本查看和修改配置文件。
- **[Notepad3](https://github.com/rizonesoft/Notepad3)**：基于 Scintilla 的轻量文本编辑器，支持语法高亮、代码折叠与正则表达式查找替换。
- **[Visual Studio Code](https://code.visualstudio.com/)**：主流开源代码编辑器，内置终端、Git 版本控制与调试支持，拥有丰富的语言扩展生态。
- **[PowerShell 7](https://learn.microsoft.com/zh-cn/powershell/scripting/install/install-powershell-on-windows?view=powershell-7.6)**：微软跨平台命令行 Shell 与脚本环境，可与系统自带的 Windows PowerShell 5.1 并存。

## 下载与云盘

- **[Neat Download Manager（NDM）](https://www.neatdownloadmanager.com/index.php/en/)**：轻量多线程下载工具，支持断点续传、资源嗅探与浏览器扩展接管。
- **[百度网盘](https://pan.baidu.com/download#win)**：百度网盘 Windows 官方桌面客户端。
- **[CloudDrive2](https://www.clouddrive2.com/)**：支持将多种网盘与 WebDAV 存储挂载为 Windows 本地磁盘，方便文件管理器或本地播放器直接读取。
- **[115-Desktop](https://github.com/Shimily-3/115-Desktop)**：基于 115 开放平台 API 构建的第三方桌面客户端，支持文件管理、上传下载、在线播放与离线任务管理。

## 聊天与通讯

- **[QQ Windows 版](https://im.qq.com/index/#/windows)**：基于 NT 架构的 QQ 桌面客户端。
- **[微信 Windows 版](https://windows.weixin.qq.com/)**：微信官方桌面端，支持聊天、音视频通话与手机文件互传。
- **[Telegram Desktop](https://desktop.telegram.org/)**：Telegram 官方桌面客户端。
- **[Discord](https://discord.com/download)**：面向游戏与开源社区的语音、文字及屏幕共享沟通平台。

## 影音播放与音乐

- **[PotPlayer](https://potplayer.tv/)**：功能全面的本地音视频播放器，支持硬件解码、着色器、外挂音轨与 ASS 特效字幕（中文资料可参考 [PotPlayer 资料站](https://potplayer.org/)）。
- **[VLC media player](https://www.videolan.org/vlc/)**：开源跨平台播放器，支持本地音视频、光盘镜像及各类网络流媒体协议。
- **[PowerDVD](https://www.cyberlink.com/products/powerdvd-ultra/overview_en_US.html)**：支持蓝光原盘（BDMV / ISO）完整导航菜单与 HDR 播放的商业播放器。
- **[PlayerFab](https://playerfab.dvdfab.cn/)**：支持本地视频、DVD 与蓝光原盘导航菜单播放的商业媒体播放器。
- **[QQ 音乐](https://y.qq.com/download/)** / **[网易云音乐](https://music.163.com/#/download)** / **[酷狗音乐](https://download.kugou.com/)**：国内主流在线音乐平台的 Windows 官方客户端。
- **[音流](https://music.aqzscn.cn/)**：跨平台 NAS 音乐客户端，支持连接 Navidrome、Subsonic、Emby、Jellyfin 等自建音乐服务端。
- **[Listen 1](https://listen1.github.io/listen1/)**：聚合多个在线音乐平台搜索与歌单播放的开源工具，提供桌面端与浏览器扩展。
- **[LX Music（洛雪音乐助手）](https://github.com/lyswhut/lx-music-desktop)**：开源跨平台桌面音乐软件，支持歌单管理、本地播放与自定义音源导入。
- **[Any Listen](https://github.com/any-listen/any-listen)**：支持本地音乐库与 WebDAV 挂载播放的私人音乐客户端，同时提供 Web 部署版本。
- **[Spotify Geek](https://spotigeek.com/news/)**：整理 Spotify 使用技巧与资讯的第三方站点。

## 录屏与直播

- **[OBS Studio](https://obsproject.com/)**：开源免费的屏幕录制与直播推流软件，支持多音轨混音、窗口采集与多场景切换。
- **[Action!](https://actionrecorder.com/zh-cn)**：主打低资源占用的 Windows 游戏与桌面录屏软件，支持硬件加速编码、麦克风分轨录制及直播推流。

## 远程控制与异地组网

- **[Windows 远程桌面（RDP）](https://learn.microsoft.com/zh-cn/windows-server/remote/remote-desktop-services/remotepc/remote-desktop-allow-access)**：系统内置的低延迟远程桌面协议，运行 `mstsc` 打开客户端（被控端需为 Windows 专业版、企业版或服务器版）。
- **[RustDesk](https://rustdesk.com/zh/)**：开源跨平台远程桌面软件，支持端到端加密与自建中继服务端（ID/Relay Server）。
- **[向日葵](https://sunlogin.oray.com/)** / **[ToDesk](https://www.todesk.com/)**：国内常用的跨平台远程控制工具，支持无人值守、文件传输与移动端远控。
- **[网易 UU 远程](https://uuyc.163.com/)** / **[RayLink](https://www.raylink.live/)**：主打高帧率、低延迟与手柄外设映射的远程控制软件，兼顾远程办公与远程游戏场景。
- **[Tailscale](https://tailscale.com/download/windows)**：基于 WireGuard 协议的零配置异地组网工具，便于在外网安全访问家中电脑与 NAS。
- **[ZeroTier](https://www.zerotier.com/)**：支持二层虚拟局域网组网的跨平台工具，可将异地设备接入同一虚拟网段。
- **[RemoteApp Tool](https://github.com/kimmknight/remoteapptool)**：在支持的主机系统上配置并生成 Windows RemoteApp 连接文件，实现在客户端无缝运行远端单个应用程序窗口。
