---
mediaCategory: diy
mediaRole: overview
title: DIY 常用软件与资料
description: 蓝光与媒体文件 DIY 工具清单，按原盘检查、轨道提取、重新封装、章节和 Dolby Vision 元数据整理。
author: Ayulog
pubDatetime: "2026-10-10T10:00:00+08:00"
draft: false
tags:
  - DIY
  - 蓝光
  - Media
  - 软件清单
---

这里的 DIY 主要指蓝光与媒体文件的轨道整理：检查原盘、提取视频和音轨、加入字幕、编辑章节，再按需要重新封装。Dolby Vision 元数据处理也放在这一类；具体操作按下面的系列文章展开。

入门第一篇：[认识蓝光碟片](/posts/2026-10-10-understanding-blu-ray/)，先了解碟片类型、容量、区码，以及原盘目录和播放列表的关系。

入门第二篇：[认识 HDR](/posts/2026-10-10-understanding-hdr/)，分清 HDR 格式与杜比视界 Profile，了解元数据、封装和播放兼容性。

入门第三篇：[章节的处理](/posts/2026-10-10-media-chapters/)，按章节提取、获取名称、修改时间、重新封装和检查的顺序使用下面的工具。

入门第四篇：[蓝光原盘 Remux](/posts/2026-10-10-blu-ray-remux/)，从确认播放列表到分流与封装，分别说明 Dolby Vision Profile 7 的保留和 Profile 8.1 兼容副本的制作。

入门第五篇：[字幕的处理](/posts/2026-10-10-subtitle-workflow/)，从原盘或公网获取字幕，按格式进入 OCR、校对、翻译和 ASS 特效制作，再渲染回 SUP 与封装检查；具体入口和工具见字幕目录。

## 目录

- [原盘与文件检查](#原盘与文件检查)
- [提取与封装](#提取与封装)
- [章节与 Matroska 编辑](#章节与-matroska-编辑)
- [Dolby Vision 元数据](#dolby-vision-元数据)
- [资料与相关分类](#资料与相关分类)

## 原盘与文件检查

- **[BDInfo](https://www.videohelp.com/software/BDInfo)**：读取蓝光的播放列表与轨道信息，生成包含时长、码率、视频、音频和字幕格式的报告。适合先确认原盘结构，再选择要处理的播放列表。
- **[MediaInfo](https://mediaarea.net/en/MediaInfo)**：查看封装格式、视频编码、帧率、位深、音频声道、字幕和章节等信息。重新封装后可用来核对轨道与元数据；实际同步和播放兼容性仍需播放检查。

## 提取与封装

- **[MakeMKV](https://www.makemkv.com/)**：把 DVD、蓝光中的节目转成 MKV，保留音视频轨道、章节和语言等信息，不重新压制画面。选节目与输出流程见 [Remux 教程](/posts/2026-10-10-blu-ray-remux/#makemkv先得到一份完整节目)。蓝光处理功能的试用和授权说明以官网为准。
- **[MKVToolNix](https://mkvtoolnix.download/)**：创建、修改和检查 Matroska 文件的工具集，常用于音视频与字幕重新封装、编辑轨道信息、章节和附件，也提供轨道提取工具。当前版本可以直接读取受支持的 MPLS 并合并蓝光双轨 DV，见 [Remux 教程](/posts/2026-10-10-blu-ray-remux/#mkvtoolnix直接读取-mpls)。
- **[tsMuxer](https://github.com/justdan96/tsMuxer)**：处理 TS / M2TS 的混流与重新封装，可输出蓝光或 AVCHD 结构；蓝光输出支持自定义章节时间与按分钟等间隔分章。操作见[章节教程](/posts/2026-10-10-media-chapters/#tsmuxer生成蓝光结构时写入章节)。该仓库目前明确标为停止开发，使用前查看对应版本的格式支持与已知问题。
- **BDFix Pro**：Defsoft 的旧蓝光重制工具，可参考[历史产品资料](https://www.qweas.com/downloads/audio/multimedia-creation-tools/moreinfo-bdfix.html)了解 M2TS / MPLS 模式、轨道替换与新 BDMV 输出。重制时需复核播放列表中的章节，流程与资料限制见[章节教程](/posts/2026-10-10-media-chapters/#bdfix-pro重制现有蓝光时保留和复核章节)；不能从旧版功能说明推断所有 Pro 版本或 UHD 原盘的兼容性。
- **[DGDemux](https://www.rationalqm.us/dgdemux/dgdemux.html)**：按蓝光 / UHD 播放列表分流视频、音频、字幕和章节，支持无缝分支影片的同步处理。可在 Windows 和 Linux 上运行，当前两平台发行包均含图形界面与命令行程序；具体选项按对应版本核对。操作见 [Remux 教程](/posts/2026-10-10-blu-ray-remux/#dgdemux按播放列表分流)，发布记录可参照 [VideoHelp 资料页](https://www.videohelp.com/software/DGDemux)。
- **[eac3to](https://www.videohelp.com/software/eac3to)** 与 **[UsEac3To](https://forum.doom9.org/showthread.php?t=145574)**：前者用于轨道分析、分流与音频处理，后者是图形前端。原样提取、转换和日志检查见 [Remux 教程](/posts/2026-10-10-blu-ray-remux/#eac3to-与-useac3to分析与音轨分流)；下载时核对前端与 eac3to 的配套版本。

轨道转换和延迟处理见 [音频清单](/posts/2026-10-10-audio-software/)，FFmpeg 等通用媒体工具见 [压制清单](/posts/2026-10-09-encode-software/)。

## 章节与 Matroska 编辑

- **[ChapterTool](https://github.com/tautcony/ChapterTool)**：读取、编辑和转换章节，提供桌面、命令行与[浏览器版](https://tautcony.xyz/ChapterTool/)。桌面读取 MKV 需配合 mkvextract，部分其他媒体格式需 ffprobe；浏览器版可处理 TXT、XML、MPLS 等章节文件，不能调用本机外部工具。
- **[chapterEditor](https://www.videohelp.com/software/chapterEditor)**：编辑和转换章节文件，处理章节名称与时间，也包含 Matroska 标签、多版本和菜单相关工具。[Doom9 原帖](https://forum.doom9.org/showthread.php?t=169984)提供功能说明、发布入口与使用资料，部分功能需要 MKVToolNix 或 eac3to 等外部工具。
- **[igstools](https://github.com/SAPikachu/igstools)**：从支持的蓝光 IGS 交互图形流导出菜单 PNG，可辅助辨认章节名称。它不负责 OCR 或自动生成章节，也不是任意 BD-J 菜单的通用提图工具；旧项目的安装方式与限制见[章节教程](/posts/2026-10-10-media-chapters/#用-igstools-提取蓝光菜单图片)。

普通章节可先用 MKVToolNix 自带的章节编辑器处理，再按需要选择上面的辅助工具。完整流程见[章节的处理](/posts/2026-10-10-media-chapters/)。章节、多版本和菜单的处理方式会影响播放器兼容性，输出后要在实际使用的播放器上检查跳转结果。

## Dolby Vision 元数据

- **[dovi_tool](https://github.com/quietvoid/dovi_tool)**：处理 Dolby Vision 的命令行工具，可读取、导出和编辑 RPU 元数据，也支持从 HEVC 流提取、注入 RPU，以及部分 Profile 转换。保留 P7、合并 BL/EL、转换 P8.1 与回查命令见 [Remux 教程](/posts/2026-10-10-blu-ray-remux/#第三步处理-dolby-vision)。
- **[DDVT Tool](https://forum.doom9.org/showthread.php?t=183479)**：基于 quietvoid 工具的批处理脚本集合，用于 Dolby Vision RPU 分流、注入和编辑。Doom9 原帖有说明及项目下载入口，其中 HDR10+ 转 Dolby Vision 元数据功能标为实验性。

为不同片源处理 RPU 时，需要先核对帧序、剪辑与画幅是否匹配，再检查目标播放设备支持的 Dolby Vision Profile。元数据处理完成后仍要验证画面和播放结果。

## 资料与相关分类

- [音频常用软件与资料](/posts/2026-10-10-audio-software/)：eac3to、qaac、deew，以及音轨转换和多声道处理资料。
- [字幕常用软件与资料](/posts/2026-10-10-subtitle-software/)：字幕编辑、图形字幕转换、OCR 和同步工具。
- [压制常用软件与资料](/posts/2026-10-09-encode-software/)：FFmpeg、编码器和滤镜工具，也汇总 Doom9、VideoHelp、NMM 等论坛与教程。
