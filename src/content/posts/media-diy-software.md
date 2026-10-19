---
title: 蓝光与媒体工具清单
description: 蓝光原盘检查、Remux、章节、菜单与封装各环节用到的软件清单。
author: Ayulog
pubDatetime: "2026-10-10T10:00:00+08:00"
modDatetime: "2026-10-17T21:00:00+08:00"
draft: false
category: diy
tags:
  - 蓝光
---

拿到一张蓝光碟或一份原盘目录后，通常会依次经过**检查原盘、提取音视频与字幕、编辑章节、重新封装（Remux）或重制蓝光结构**几个环节。以下按处理阶段整理常用工具及对应的教程入口。

## 整体处理流程

| 阶段       | 核心关注点                                           | 对应操作                                |
| ---------- | ---------------------------------------------------- | --------------------------------------- |
| 确定目标   | 保留原盘菜单、制作精简正片蓝光，还是封装单文件 MKV   | 选择原盘重制、tsMuxer 混流或 Remux 路线 |
| 检查原盘   | 碟片类型、影片版本、目标 MPLS、轨道、章节与 HDR 规格 | 用 BDInfo 扫描记录，备份原始目录        |
| 准备素材   | 音轨、字幕与章节时间轴是否与目标版本对齐             | 按需分流、校对、转换格式并规划轨道      |
| 制作成品   | 容器封装参数、Dolby Vision 层处理或菜单按钮映射      | 混流输出 MKV，或重制 BDMV 目录 / ISO    |
| 验收与留档 | 轨道完整性、HDR 状态、无缝分支接缝、章节与菜单导航   | 扫描成品信息、实际播放测试并归档工程    |

若目标是给一部蓝光影片补中文字幕，可直接阅读全流程指南[蓝光加字幕教程：从原盘检查到混流验收](/posts/blu-ray-diy-workflow/)；若只需处理其中某一环，可从下方对应篇目进入。

## 各环节教程入口

### 基础规格与原盘结构

- [认识蓝光碟片](/posts/understanding-blu-ray/)：光盘介质、容量、A/B/C 区码，以及 BDMV 目录结构与 MPLS 播放列表机制。
- [认识 HDR](/posts/understanding-hdr/)：HDR10、HDR10+、HLG 与杜比视界（Profile 5 / 7 / 8.1、BL / EL / RPU）解读及播放链路排查。

### 轨道提取、章节与 MKV 封装

- [蓝光原盘 Remux](/posts/blu-ray-remux/)：确认正片播放列表，使用 MakeMKV、MKVToolNix、DGDemux、eac3to 提取轨道，处理 Dolby Vision 并封装 MKV。
- [章节的处理](/posts/media-chapters/)：从原盘或 MKV 提取章节、补充标题、平移或缩放时间轴，并写回 MKV 或蓝光结构。

### 蓝光原盘重制与菜单修改

- [蓝光加字幕教程：从原盘检查到混流验收](/posts/blu-ray-diy-workflow/)：串联校对小片压制、Aegisub 排版、SUP 渲染、混流输出与播放验收。
- [蓝光原盘 DIY：tsMuxeR、BDFix Pro、KITe UHD 与大金](/posts/blu-ray-diy/)：对比四套蓝光结构制作与重制工具的实操流程。
- [新版 tsMuxer：与 2.7.0 旧版的区别](/posts/tsmuxer-new-version/)：介绍 `teaching-droid/tsMuxer` v2.19.0 的 BDMV 保留菜单打包 ISO、光盘分层写入保护及格式修复。
- [蓝光原盘菜单修改篇：IG 菜单与 BD-J 菜单](/posts/blu-ray-menu-editing/)：修改 IG 交互图形菜单与 BD-J Java 菜单的按钮图形、导航命令、轨道映射及重签名。

字幕 OCR、翻译与特效排版工具汇总在[字幕软件清单](/posts/subtitle-software/)，音轨转换与编码工具见[音频软件清单](/posts/audio-software/)。

## 原盘与文件检查

- **[BDInfo](https://www.videohelp.com/software/BDInfo)**：扫描蓝光 BDMV 目录的播放列表（MPLS）与流信息，输出包含时长、码率、视频、音轨、字幕和章节的完整报告，用于定位目标正片版本。
- **[MediaInfo](https://mediaarea.net/en/MediaInfo)**：查看媒体文件的容器格式、视频编码、帧率、位深、HDR / Dolby Vision 元数据、音轨声道、字幕及章节信息，适合在封装前后核对轨道规格。

## 提取与封装

- **[MakeMKV](https://www.makemkv.com/)**：读取 DVD、普通蓝光与 UHD 蓝光节目并直接封装为无损 MKV，完整保留音视频码流、双层杜比视界与章节信息（操作步骤见 [Remux 教程](/posts/blu-ray-remux/#makemkv先得到一份完整节目)）。
- **[MKVToolNix](https://mkvtoolnix.download/)**：创建、混流、提取和修改 Matroska（MKV）文件的标准工具集。支持直接读取蓝光 `.mpls` 播放列表并将双轨 Dolby Vision 自动合并为单条视频轨（操作步骤见 [Remux 教程](/posts/blu-ray-remux/#mkvtoolnix直接读取-mpls)）。
- **[tsMuxer](https://github.com/justdan96/tsMuxer)**：TS / M2TS 混流与蓝光结构生成工具，支持输出 BDMV 目录或 ISO 并写入自定义章节时间点（见[章节教程](/posts/media-chapters/#tsmuxer生成蓝光结构时写入章节)与[原盘 DIY 教程](/posts/blu-ray-diy/#一tsmuxer-制作蓝光结构)）。原仓库归档于 2.7.0 Final，社区持续维护的 [teaching-droid 分支](https://github.com/teaching-droid/tsMuxer)已更新至 v2.19.0（新特性对比见[新版 tsMuxer 介绍](/posts/tsmuxer-new-version/)）。
- **BDFix Pro**：Defsoft 开发的 1080p 蓝光重制工具（参考[历史产品资料](https://www.qweas.com/downloads/audio/multimedia-creation-tools/moreinfo-bdfix.html)），支持按 M2TS 或 MPLS 模式替换、追加音轨与 SUP 字幕并保留原盘菜单（操作与章节复核见[章节教程](/posts/media-chapters/#bdfix-pro重制现有蓝光时保留和复核章节)）。
- **[KITe UHD Authoring Suite](https://dvd-logic.com/kite)**：DVDLogic 的蓝光与 UHD 编著工具，支持将已有 BDMV 拆解为工程资产、挂载新音轨或字幕（SST / BDN XML / PES）并通过局部混流（Partial Mux）写回原盘（操作见[导入与混流流程](/posts/blu-ray-diy/#三kite-uhd-导入与混流)）。
- **[Scenarist BD / UHD](https://www.scenarist.com/)**：工业级蓝光与 UHD 蓝光编著软件（Scenarist BD 常称“大金”），用于从底层音视频、字幕与 IG 菜单资产构建完整的商业规格蓝光工程（入门流程见[Scenarist 制作流程](/posts/blu-ray-diy/#四大金-scenarist-bd-制作)）。
- **[DGDemux](https://www.rationalqm.us/dgdemux/dgdemux.html)**：面向蓝光与 UHD 蓝光播放列表的专用分流工具，擅长处理无缝分支（Seamless Branching）同步与双层杜比视界合并，提供 Windows 与 Linux 版 GUI 及命令行程序（操作见 [Remux 教程](/posts/blu-ray-remux/#dgdemux按播放列表分流)，历史版本见 [VideoHelp 资料页](https://www.videohelp.com/software/DGDemux)）。
- **[eac3to](https://www.videohelp.com/software/eac3to)** 与 **[UsEac3To](https://forum.doom9.org/showthread.php?t=145574)**：经典的蓝光播放列表分析、轨道分流与音频转换工具及配套图形前端（操作见 [Remux 教程](/posts/blu-ray-remux/#eac3to-与-useac3to分析与音轨分流)）。

## 章节与 Matroska 编辑

- **[ChapterTool](https://github.com/tautcony/ChapterTool)**：读取、编辑与转换章节格式（TXT、XML、MPLS 等），提供桌面版、命令行与[网页版](https://tautcony.xyz/ChapterTool/)（桌面版读取 MKV 需配合 `mkvextract`，读取通用媒体需 `ffprobe`）。
- **[chapterEditor](https://www.videohelp.com/software/chapterEditor)**：集章节格式转换、时间轴调整、Matroska 标签与多版本（Multi-Edition）封装于一体的综合工具（发布与使用说明见 [Doom9 原帖](https://forum.doom9.org/showthread.php?t=169984)）。
- **[igstools](https://github.com/SAPikachu/igstools)**：解析蓝光 HDMV IGS 交互图形流并将菜单按钮与页面导出为 PNG 图片，方便查阅原盘选章菜单上的章节标题（安装与用法见[章节教程](/posts/media-chapters/#用-igstools-提取蓝光菜单图片)）。

## Dolby Vision 元数据处理

- **[dovi_tool](https://github.com/quietvoid/dovi_tool)**：处理 Dolby Vision HEVC 码流与 RPU 动态元数据的核心命令行工具，支持提取与注入 RPU、合并双层 BL+EL，以及将 Profile 7 转换为单层 Profile 8.1（具体命令见 [Remux 教程](/posts/blu-ray-remux/#第三步处理-dolby-vision)）。
- **[DDVT Tool](https://forum.doom9.org/showthread.php?t=183479)**：基于 `dovi_tool` 等组件封装的交互式批处理脚本集，提供 RPU 分流、注入、画幅边距校准与 Profile 转换菜单。

## 相邻分类工具清单

- [音频软件清单](/posts/audio-software/)：eac3to、qaac、deew 等音轨提取、无损转换与多声道编码工具。
- [字幕软件清单](/posts/subtitle-software/)：Aegisub、Subtitle Edit、ass2bdnxml、SUPer 等字幕编辑、OCR 与 SUP 渲染工具。
- [压制软件与资料清单](/posts/encode-software/)：FFmpeg、x264 / x265 编码器、滤镜工具及 Doom9、VideoHelp 等技术社区入口。
