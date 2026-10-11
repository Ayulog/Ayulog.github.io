---
setupCategory: windows
setupRole: overview
title: Windows 总篇：流程、软件与教程
description: 按装机、日常使用、自动启动、远程访问与容器环境整理 Windows 流程，汇总软件入口和独立教程。
author: Ayulog
pubDatetime: "2026-10-09T00:00:00+08:00"
modDatetime: "2026-10-11T00:00:00+08:00"
draft: false
tags:
  - Windows
  - 装机
  - 软件清单
---

这篇是 Windows 类目的总入口：先按要做的事找流程，再选软件；程序自启动、远程桌面证书和容器环境各有独立教程。装机工具和日常软件保留在后面的清单中。

游戏平台、Mod、修改器、串流和安卓模拟器收在 [游戏总篇](/posts/2026-10-11-game-software/)。

## 目录

- [流程概览](#流程概览)
- [设置与使用笔记](#设置与使用笔记)
- [系统安装与硬件检测](#系统安装与硬件检测)
- [文件检索与预览](#文件检索与预览)
- [写作、编辑与开发](#写作编辑与开发)
- [下载与云盘](#下载与云盘)
- [聊天与通讯](#聊天与通讯)
- [影音播放与音乐](#影音播放与音乐)
- [录屏与直播](#录屏与直播)
- [远程控制与组网](#远程控制与组网)
- [安卓模拟器](#安卓模拟器)
- [游戏平台与相关工具](#游戏平台与相关工具)

## 流程概览

| 要做的事                   | 阅读顺序                                                             | 对应教程                                               |
| -------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------ |
| 准备或重装电脑             | 系统安装工具 → 硬件检测 → 文件、编辑和影音软件                       | 先按下方用途找软件；系统安装尚无独立子篇               |
| 登录后自动运行应用         | 明确是否需要登录 → 选择启动文件夹、任务计划或服务 → 验证重启后的行为 | [程序自启动](/posts/2026-10-09-windows-app-startup/)   |
| 远程访问桌面               | 确认被控端支持 RDP → 准备证书 → 绑定并从客户端验证                   | [RDP 配置 TLS](/posts/2026-10-09-windows-rdp-tls/)     |
| 在 Windows 运行 Linux 容器 | 准备 WSL → 选择 Docker Desktop 或独立 Engine → 检查容器与数据位置    | [WSL 与 Docker](/posts/2026-10-10-windows-containers/) |

这几条流程按需要使用，不是每次装机都要全部完成。游戏、Mod 和串流的入口单列在 [游戏总篇](/posts/2026-10-11-game-software/)。

## 设置与使用笔记

### 自动化与远程访问

- [程序自启动](/posts/2026-10-09-windows-app-startup/)：启动文件夹、任务计划和系统服务。
- [远程桌面 TLS 证书](/posts/2026-10-09-windows-rdp-tls/)：导入、绑定、续期和客户端验证。

### 开发与容器环境

- [WSL 与 Docker](/posts/2026-10-10-windows-containers/)：在 Windows 上运行 Linux 容器。

## 系统安装与硬件检测

- **[微PE工具箱](https://www.wepe.com.cn/download.html)**：制作 PE 启动盘，用于装系统和离线维护。
- **[图吧工具箱](https://www.tbtool.cn/index.html)**：汇集硬件检测、性能测试等工具，方便查看电脑配置、检查硬件状态和排查问题。
- **[tubatools（WinUI 3 工具箱）](https://github.com/luolangaga/tubatools)**：社区维护的 WinUI 3 工具箱，提供硬件检测、性能测试和系统维护等功能，界面设计贴近 Windows 11。
- **[TrafficMonitor](https://github.com/zhongyang219/TrafficMonitor)**：在桌面悬浮窗或任务栏中显示网速、CPU 和内存占用，方便随时查看系统运行情况。

## 文件检索与预览

- **[Everything](https://www.voidtools.com/zh-cn/)**：按文件名搜索本机文件，找文件比逐层翻目录省事。
- **[QuickLook](https://github.com/QL-Win/QuickLook)**：选中文件后按空格预览，额外格式可装插件。
- **[ImageGlass](https://github.com/d2phap/ImageGlass)**：支持多种图片格式的看图工具，提供缩放、旋转、裁剪、取色等常用功能。

## 写作、编辑与开发

- **[Typora](https://typora.io/#feature)**：所见即所得的 Markdown 编辑器，支持表格、代码块和公式；试用后需要付费。
- **[Notepad2](https://www.flos-freeware.ch/notepad2.html)**：轻量文本编辑器，支持语法高亮，适合快速查看和修改纯文本、配置文件。
- **[Notepad3](https://github.com/rizonesoft/Notepad3)**：轻量文本编辑器，支持语法高亮、代码折叠和正则查找替换，适合日常文本与配置文件编辑。
- **[Visual Studio Code](https://code.visualstudio.com/)**：可通过扩展支持多种语言的代码编辑器，集成终端、调试和版本控制，适合写代码、脚本以及维护项目。
- **[PowerShell 7](https://learn.microsoft.com/zh-cn/powershell/scripting/install/install-powershell-on-windows?view=powershell-7.6)**：微软的命令行 Shell 与脚本工具，可用于系统管理和自动化。PowerShell 7 可以与系统自带的 Windows PowerShell 5.1 并存。

## 下载与云盘

- **[Neat Download Manager](https://www.neatdownloadmanager.com/index.php/en/)**：下载管理工具，支持分段下载、暂停续传、分类管理和浏览器扩展。
- **[百度网盘](https://pan.baidu.com/download#win)**：用于云端文件存储、分享和上传下载，链接可直接进入客户端下载页面。
- **[CloudDrive2](https://www.clouddrive2.com/)**：集中管理多个云盘，并将云盘挂载为本地磁盘，方便通过文件管理器或其他软件访问云端文件。
- **[115-Desktop](https://github.com/Shimily-3/115-Desktop)**：基于 115 开放平台 API 的第三方桌面客户端，支持文件管理、上传下载、媒体播放和离线任务管理。使用时以项目公开文档和当前版本说明为准。

## 聊天与通讯

- **[QQ Windows 版](https://im.qq.com/index/#/windows)**：腾讯的桌面通讯客户端，支持消息交流、音视频通话和远程控制。
- **[微信 Windows 版](https://windows.weixin.qq.com/)**：用于电脑端聊天、音视频通话和文件传输，可与手机互传文件。
- **[Telegram Desktop](https://desktop.telegram.org/)**：Telegram 的电脑客户端，用于聊天、收发文件和查看频道消息。
- **[Discord](https://discord.com/download)**：以社区服务器和频道组织聊天，支持语音、视频通话与屏幕共享。

## 影音播放与音乐

- **[PotPlayer](https://potplayer.tv/)**：Windows 多媒体播放器，支持硬件加速和多种字幕格式，适合播放本地视频与音频。 [PotPlayer 中文资料站](https://potplayer.org/) 资料入口。
- **[PowerDVD](https://www.cyberlink.com/products/powerdvd-ultra/overview_en_US.html)**：付费播放器，可播放蓝光、DVD 和本地影音文件，购买时留意不同版本的功能。
- **[PlayerFab](https://playerfab.dvdfab.cn/)**：播放本地视频、DVD 和蓝光，光盘菜单等功能按版本提供。
- **[VLC](https://www.videolan.org/vlc/)**：免费开源播放器，可播放本地音视频、光盘和网络串流。
- **[QQ 音乐](https://y.qq.com/download/)**：腾讯的音乐客户端，用于听歌、整理歌单和查看歌词。
- **[网易云音乐](https://music.163.com/#/download)**：听歌、收藏歌单，也可以逛评论区和听播客。
- **[酷狗音乐](https://download.kugou.com/)**：听歌、看歌词和管理本地音乐，官网提供 Windows 客户端。
- **[音流](https://music.aqzscn.cn/)**：跨平台 NAS 音乐播放器，可连接不同的音乐服务，适合集中收听自己整理的音乐库。
- **[Listen 1](https://listen1.github.io/listen1/)**：聚合多个音乐平台的搜索、播放和歌单管理功能，提供桌面版与浏览器扩展。
- **[LX Music（洛雪音乐助手）](https://github.com/lyswhut/lx-music-desktop)**：跨平台音乐软件，支持播放列表和数据同步；在线音频播放取决于所配置的自定义源。
- **[Any Listen](https://github.com/any-listen/any-listen)**：私人音乐播放工具，支持本地和 WebDAV 歌曲，提供桌面客户端，也可以自行部署 Web 版。
- **[Spotify Geek](https://spotigeek.com/news/)**：提供 Spotify 相关新闻和使用指南的第三方网站，作为音乐相关资讯入口收藏，并非 Spotify 官方客户端。

## 录屏与直播

- **[OBS Studio](https://obsproject.com/)**：免费开源的录屏与直播工具，可组合窗口、摄像头和音频，按场景切换画面。
- **[Action!](https://actionrecorder.com/zh-cn)**：面向 Windows 桌面和游戏的录制软件，支持录屏、麦克风解说、摄像头画面以及直播推流。

## 远程控制与组网

- **[Windows 远程桌面（RDP）](https://learn.microsoft.com/zh-cn/windows-server/remote/remote-desktop-services/remotepc/remote-desktop-allow-access)**：运行 `mstsc` 即可打开系统自带的客户端；被控电脑需要支持远程桌面的 Windows 版本，家庭版不能作为服务端。
- **[向日葵](https://sunlogin.oray.com/)**：远程控制电脑、传输文件，也能从手机连接电脑。
- **[ToDesk](https://www.todesk.com/)**：支持远程桌面、文件传输和多屏切换，可用于远程办公或协助家人处理电脑问题。
- **[网易 UU 远程](https://uuyc.163.com/)**：支持多端连接的远程控制工具，可用于远程办公、协助和游戏，也提供文件传输、多屏协作等功能。
- **[RayLink](https://www.raylink.live/)**：面向远程办公、协助与游戏场景的远控软件，支持文件传输、多屏控制和电脑、手机之间的远程连接。
- **[RustDesk](https://rustdesk.com/zh/)**：开源远程桌面软件，支持 Windows、macOS、Linux 等平台，也可以自行部署服务端。
- **[ZeroTier](https://www.zerotier.com/)**：将不同地点的设备连接到同一个虚拟网络，便于跨网络访问家中的电脑、服务器等设备。
- **[Tailscale](https://tailscale.com/download/windows)**：基于 WireGuard 的组网工具，在不同网络的设备之间建立加密连接，适合远程访问电脑和 NAS。
- **[RemoteApp Tool](https://github.com/kimmknight/remoteapptool)**：用于创建和管理 Windows RemoteApp，让其他电脑通过远程连接使用发布出来的单个应用。使用前需要确认宿主系统版本支持 RemoteApp。

## 安卓模拟器

夜神、雷电、MuMu 等工具已移到 [游戏篇的安卓模拟器清单](/posts/2026-10-11-game-software/#安卓模拟器)。

## 游戏平台与相关工具

Steam、Moonlight、Mod 网站和管理器等条目已移到 [游戏总篇](/posts/2026-10-11-game-software/)，新篇也收录 Android 与 SteamOS 上的游戏工具。
