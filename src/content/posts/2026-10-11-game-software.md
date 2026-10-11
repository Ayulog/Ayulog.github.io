---
setupCategory: games
setupRole: overview
title: 游戏总篇：流程、软件与教程
description: 按游戏平台、Mod、串流、Android 和 Steam Deck 的使用顺序整理软件与资料，并记录独立教程的整理状态。
author: Ayulog
pubDatetime: "2026-10-11T00:00:00+08:00"
modDatetime: "2026-10-11T00:00:00+08:00"
draft: false
tags:
  - 游戏
  - Mod
  - 星露谷物语
  - Steam Deck
  - Android
  - 软件清单
---

游戏类目的总入口，先按游戏平台、Mod、串流或设备找到要走的流程，再看对应软件和项目说明。桌面软件和系统设置见 [Windows 总篇](/posts/2026-10-09-windows-software/)。

## 目录

- [流程概览](#流程概览)
- [独立教程](#独立教程)
- [游戏平台与资源](#游戏平台与资源)
- [Mod 资源与管理](#mod-资源与管理)
- [修改器](#修改器)
- [串流与跨平台运行](#串流与跨平台运行)
- [Steam Deck 与 SteamOS](#steam-deck-与-steamos)
- [安卓模拟器](#安卓模拟器)

## 流程概览

| 使用场景                 | 阅读顺序                                                          | 软件与资料                                      |
| ------------------------ | ----------------------------------------------------------------- | ----------------------------------------------- |
| 在电脑上安装和管理游戏   | 确认游戏平台 → 安装客户端 → 管理对应游戏库                        | [游戏平台与资源](#游戏平台与资源)               |
| 给游戏安装 Mod           | 找具体游戏的 Mod 页面 → 核对版本、加载器和前置依赖 → 选择管理方式 | [Mod 资源与管理](#mod-资源与管理)               |
| 从另一台设备玩 PC 游戏   | 区分远程串流与设备本机运行 → 按主机、客户端和游戏核对支持范围     | [串流与跨平台运行](#串流与跨平台运行)           |
| 在 Steam Deck 上扩展功能 | 先核对 SteamOS 与插件前提 → 按项目说明安装和配置                  | [Steam Deck 与 SteamOS](#steam-deck-与-steamos) |
| 在电脑上运行安卓游戏     | 先确认目标游戏与运行环境 → 选择平台或模拟器 → 查看对应设置说明    | [安卓模拟器](#安卓模拟器)                       |

## 独立教程

游戏类目目前还没有独立子篇。下方先保留软件入口和项目文档；Mod 安装、串流配置、Steam Deck 插件等内容写成教程后，会按单个流程或软件从这里进入。

目前可直接查阅的操作资料包括 [SMAPI 玩家指南](https://stardewvalleywiki.com/Modding:Player_Guide/Getting_Started)、[GameNative 兼容性记录](https://gamenative.app/compatibility)和 [DeckyClash 项目说明](https://github.com/chenx-dust/DeckyClash/tree/main)。这些是外部资料，尚未整理为本站子篇。

## 游戏平台与资源

- **[Steam](https://store.steampowered.com/about/)**：购买、下载和管理 PC 游戏的平台，也提供自动更新、好友聊天和创意工坊等功能。
- **[WeGame](https://www.wegame.com.cn/)**：腾讯旗下的 PC 游戏平台，用于发现、下载和启动游戏，并提供游戏助手与玩家社区服务。
- **[Xbox PC 应用](https://www.xbox.com/zh-TW/apps/xbox-app-on-pc)**：在 Windows 上浏览、购买、下载和启动游戏，也可管理 Game Pass 游戏库。链接为官方繁体中文页面。
- **[小黑盒](https://www.xiaoheihe.cn/)**：面向游戏玩家的社区与游戏信息平台，用于查看游戏内容和参与玩家讨论。
- **[BYRUT · GOG 游戏资源](https://byrut.org/gog-games/)**：第三方游戏资源目录，收录 GOG 版本的游戏资源，非 GOG 官方网站。

## Mod 资源与管理

- **[Nexus Mods（N 网）](https://www.nexusmods.com/)**：按游戏查找和下载 Mod，也能查看安装说明、前置依赖和作者更新。
- **[Nexus Mods：星露谷物语专区](https://www.nexusmods.com/games/stardewvalley)**：集中查找《星露谷物语》的 Mod。安装前按具体 Mod 页面核对游戏版本、SMAPI 和前置模组要求；加载器与安装方法可查 [SMAPI 官网](https://smapi.io/)及 [Wiki 玩家指南](https://stardewvalleywiki.com/Modding:Player_Guide/Getting_Started)。
- **[Mod DB](https://www.moddb.com/)**：收录游戏 Mod、独立游戏和开发动态，可找大型模组与旧游戏的社区作品。
- **[CurseForge](https://www.curseforge.com/)**：查找《Minecraft》模组、整合包和《魔兽世界》等游戏的插件，也提供管理客户端。
- **[Steam 创意工坊](https://steamcommunity.com/workshop/)**：为支持工坊的游戏订阅 Mod、地图等社区内容，由 Steam 下载和更新。
- **[mayflyMods](https://github.com/aojiangfuyou1/mayflyMods/releases)**：Windows 桌面 Mod 管理器，支持本地 Mod 的导入、安装与卸载、配置切换、备份恢复，以及 NexusMods 浏览和下载。
- **[小火星露谷管理器](https://smallfire.cn/tools/fsvm)**：面向《星露谷物语》的模组管理工具，支持模组安装与更新、启用配置切换，以及常见 SMAPI 报错的分析与修复。

## 修改器

- **[FLiNG Trainer（风灵月影）](https://flingtrainer.com/)**：按游戏提供 PC 修改器、功能列表、适配版本和更新说明。使用前核对自己的游戏版本，并查看条目的适用模式；部分修改器明确限于离线或单人模式。

## 串流与跨平台运行

- **[Moonlight PC](https://github.com/moonlight-stream/moonlight-qt/releases)**：开源游戏串流客户端，可连接运行 Sunshine 等主机软件的电脑，在其他设备上远程游玩游戏或操作桌面。
- **[GameNative](https://github.com/utkarshdalal/GameNative)**：在 Android 设备上本机运行 PC 游戏，可接入 Steam、Epic、GOG 等游戏库，支持云存档、手柄与触控。项目仍处早期，并非所有游戏都能运行；使用前按设备和游戏查看 [兼容性记录](https://gamenative.app/compatibility)。

## Steam Deck 与 SteamOS

- **[DeckyClash](https://github.com/chenx-dust/DeckyClash/tree/main)**：为 SteamOS 设计的 Clash/Mihomo 代理客户端，通过 Decky 插件导入订阅和管理代理。需要先安装 Decky Loader，并自行准备代理配置或订阅；安装方法见项目 README。

## 安卓模拟器

- **[NoxPlayer（夜神模拟器）](https://www.bignox.com/)**：在电脑上运行安卓应用与手游，支持键鼠映射、多开和操作录制。附 [Windows 11 的 Hyper-V 共存测试版说明](https://support.bignox.com/ja/else/hypervonbeta)，这是日文 beta 说明，支持范围需按版本核对。
- **[雷电模拟器](https://www.ldmnq.com/)**：面向电脑玩手游的安卓模拟器，支持键鼠操作、多开和录屏。
- **[网易 MuMu 模拟器](https://mumu.163.com/)**：网易推出的安卓模拟器，用于在电脑上运行安卓应用和手游，支持键鼠映射、多开等功能。
- **[BlueStacks（蓝叠）](https://www.bluestacks.com/)**：在电脑上运行安卓应用和手游，支持键鼠映射与多开。
- **[MEmu（逍遥模拟器）](https://www.memuplay.com/)**：安卓模拟器，支持键鼠操作、多开和不同安卓版本的实例。
- **[Google Play Games 电脑版](https://play.google.com/googleplaygames)**：Google 提供的 PC 手游平台，可玩其收录的安卓游戏；游戏和地区支持情况以官方列表为准。
- **[腾讯手游助手](https://syzs.qq.com/)**：腾讯的电脑手游平台，提供游戏下载和键鼠操作适配。

2026 年 10 月 11 日核对了本次补充的 GameNative、DeckyClash 项目说明和 FLiNG 官网；星露谷 Mod 的安装前提参照 SMAPI 官网与 Wiki 玩家指南。具体支持范围以各项目后续说明为准。
