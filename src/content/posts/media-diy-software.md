---
title: 蓝光与媒体工具清单
description: 蓝光原盘检查、Remux、章节、菜单与封装各环节用到的软件清单。
author: Ayulog
pubDatetime: "2026-10-10T10:00:00+08:00"
modDatetime: "2026-10-11T16:00:00+08:00"
draft: false
category: diy
tags:
  - 蓝光
---

一张碟或一份原盘到手，先要确认它是什么、正片对应哪个播放列表，再决定补字幕、换音轨、改章节，还是重做菜单。检查原盘、准备音视频和字幕、编辑章节、按成品目标重新封装或制作蓝光，是这条线上的几个环节。

工具按环节分组，各任务的操作写在各自的文章里；这里只保留软件与入口。

## 处理流程

| 环节       | 先确认什么                                           | 对应操作                             |
| ---------- | ---------------------------------------------------- | ------------------------------------ |
| 确定目标   | 保存原菜单、制作正片蓝光，还是输出 MKV               | 选择重制、重新混流或 Remux 路线      |
| 检查原盘   | 碟片类型、影片版本、正确 MPLS、轨道、章节与 HDR 信息 | 记录报告，保留来源副本               |
| 准备素材   | 音轨、字幕与章节是否匹配同一版本                     | 按需分流、校对、转换并整理轨道安排   |
| 制作成品   | 输出格式、菜单与导航是否需要修改                     | 封装 MKV，或制作、重制蓝光结构       |
| 验收与留档 | 轨道、元数据、时间线、章节、菜单和目标设备播放       | 扫描输出、实际回看，并保存工程与日志 |

给一部蓝光影片补字幕的连续操作见[蓝光加字幕教程：从原盘检查到混流验收](/posts/blu-ray-diy-workflow/)；只做其中一环时，从下面对应篇目进入。

## 各环节对应的篇目

### 先认识素材与播放条件

- [认识蓝光碟片](/posts/understanding-blu-ray/)：碟片类型、容量、区码，以及原盘目录与播放列表。
- [认识 HDR](/posts/understanding-hdr/)：HDR 格式、杜比视界 Profile、元数据和播放兼容性。

### 轨道、章节与文件整理

- [蓝光原盘 Remux](/posts/blu-ray-remux/)：选择播放列表、提取轨道、处理 Dolby Vision 并整理 MKV。
- [章节的处理](/posts/media-chapters/)：取得章节和名称，调整时间，写入 MKV 或蓝光并检查跳转。

### 蓝光制作与菜单

- [蓝光加字幕教程：从原盘检查到混流验收](/posts/blu-ray-diy-workflow/)：围绕给蓝光补字幕这一项任务，串起校对小片、ASS、SUP、混流和验收。
- [蓝光原盘 DIY：tsMuxeR、BDFix Pro、KITe UHD 与大金](/posts/blu-ray-diy/)：按制作目标选择工具，记录素材导入、轨道替换、编著和混流操作。
- [新版 tsMuxer：与 2.7.0 旧版的区别](/posts/tsmuxer-new-version/)：介绍 `teaching-droid/tsMuxer` 的 v2.19.0、菜单保留式 BDMV 打包、光盘分层写入保护，以及与旧版教程的适用边界。
- [蓝光原盘菜单修改篇：IG 菜单与 BD-J 菜单](/posts/blu-ray-menu-editing/)：单独处理菜单按钮、轨道映射、弹出菜单挂接与打包后的检查。

字幕的识别、翻译、排版与 SUP 制作归在[字幕软件清单](/posts/subtitle-software/)，音轨转换与编码见[音频软件清单](/posts/audio-software/)。

## 原盘与文件检查

- **[BDInfo](https://www.videohelp.com/software/BDInfo)**：读取蓝光的播放列表与轨道信息，生成包含时长、码率、视频、音频和字幕格式的报告。适合先确认原盘结构，再选择要处理的播放列表。
- **[MediaInfo](https://mediaarea.net/en/MediaInfo)**：查看封装格式、视频编码、帧率、位深、音频声道、字幕和章节等信息。重新封装后可用来核对轨道与元数据；实际同步和播放兼容性仍需播放检查。

## 提取与封装

- **[MakeMKV](https://www.makemkv.com/)**：把 DVD、蓝光中的节目转成 MKV，保留音视频轨道、章节和语言等信息，不重新压制画面。选节目与输出流程见 [Remux 教程](/posts/blu-ray-remux/#makemkv先得到一份完整节目)。蓝光处理功能的试用与授权见官网说明。
- **[MKVToolNix](https://mkvtoolnix.download/)**：创建、修改和检查 Matroska 文件的工具集，常用于音视频与字幕重新封装、编辑轨道信息、章节和附件，也提供轨道提取工具。当前版本可以直接读取受支持的 MPLS 并合并蓝光双轨 DV，见 [Remux 教程](/posts/blu-ray-remux/#mkvtoolnix直接读取-mpls)。
- **[tsMuxer](https://github.com/justdan96/tsMuxer)**：处理 TS / M2TS 的混流与重新封装，可输出蓝光或 AVCHD 结构；蓝光输出支持自定义章节时间与按分钟等间隔分章。操作见[章节教程](/posts/media-chapters/#tsmuxer生成蓝光结构时写入章节)。原仓库已停止开发，当前维护中的 [teaching-droid 社区仓库](https://github.com/teaching-droid/tsMuxer) 已发布 v2.19.0；两者的定位和功能差异见[新版 tsMuxer 介绍](/posts/tsmuxer-new-version/)。新建蓝光结构与完整目录打包的区别见[原盘 DIY 教程](/posts/blu-ray-diy/#一tsmuxer-制作蓝光结构)，功能随分支与版本不同。
- **BDFix Pro**：Defsoft 的旧蓝光重制工具，可参考[历史产品资料](https://www.qweas.com/downloads/audio/multimedia-creation-tools/moreinfo-bdfix.html)了解 M2TS / MPLS 模式、轨道替换与新 BDMV 输出。重制时需复核播放列表中的章节，流程与资料限制见[章节教程](/posts/media-chapters/#bdfix-pro重制现有蓝光时保留和复核章节)；不能从旧版功能说明推断所有 Pro 版本或 UHD 原盘的兼容性。
- **[KITe UHD Authoring Suite](https://dvd-logic.com/kite)**：DVDLogic 的蓝光与 UHD 编著工具，可导入已有 BDMV、编辑素材与片段后重新混流；输入格式和功能按产品档位核对，见[导入与混流流程](/posts/blu-ray-diy/#三kite-uhd-导入与混流)。
- **[Scenarist BD / UHD](https://www.scenarist.com/)**：从素材建立蓝光工程、菜单和导航的编著工具，中文圈常称 Scenarist BD 为“大金”。BD 与 UHD 是不同产品，入门见[Scenarist 制作流程](/posts/blu-ray-diy/#四大金-scenarist-bd-制作)。
- **[DGDemux](https://www.rationalqm.us/dgdemux/dgdemux.html)**：按蓝光 / UHD 播放列表分流视频、音频、字幕和章节，支持无缝分支影片的同步处理。可在 Windows 和 Linux 上运行，当前两平台发行包均含图形界面与命令行程序；具体选项见对应版本的说明。操作见 [Remux 教程](/posts/blu-ray-remux/#dgdemux按播放列表分流)，发布记录可参照 [VideoHelp 资料页](https://www.videohelp.com/software/DGDemux)。
- **[eac3to](https://www.videohelp.com/software/eac3to)** 与 **[UsEac3To](https://forum.doom9.org/showthread.php?t=145574)**：前者用于轨道分析、分流与音频处理，后者是图形前端。原样提取、转换和日志检查见 [Remux 教程](/posts/blu-ray-remux/#eac3to-与-useac3to分析与音轨分流)；下载时核对前端与 eac3to 的配套版本。

轨道转换和延迟处理见 [音频清单](/posts/audio-software/)，FFmpeg 等通用媒体工具见 [压制清单](/posts/encode-software/)。

## 章节与 Matroska 编辑

- **[ChapterTool](https://github.com/tautcony/ChapterTool)**：读取、编辑和转换章节，提供桌面、命令行与[浏览器版](https://tautcony.xyz/ChapterTool/)。桌面读取 MKV 需配合 mkvextract，部分其他媒体格式需 ffprobe；浏览器版可处理 TXT、XML、MPLS 等章节文件，不能调用本机外部工具。
- **[chapterEditor](https://www.videohelp.com/software/chapterEditor)**：编辑和转换章节文件，处理章节名称与时间，也包含 Matroska 标签、多版本和菜单相关工具。[Doom9 原帖](https://forum.doom9.org/showthread.php?t=169984)提供功能说明、发布入口与使用资料，部分功能需要 MKVToolNix 或 eac3to 等外部工具。
- **[igstools](https://github.com/SAPikachu/igstools)**：从支持的蓝光 IGS 交互图形流导出菜单 PNG，可辅助辨认章节名称。它不负责 OCR 或自动生成章节，也不是任意 BD-J 菜单的通用提图工具；旧项目的安装方式与限制见[章节教程](/posts/media-chapters/#用-igstools-提取蓝光菜单图片)。

普通章节可先用 MKVToolNix 自带的章节编辑器处理，再按需要选择上面的辅助工具。完整流程见[章节的处理](/posts/media-chapters/)。章节、多版本和菜单的处理方式会影响播放器兼容性，输出后要在实际使用的播放器上检查跳转结果。

## Dolby Vision 元数据

- **[dovi_tool](https://github.com/quietvoid/dovi_tool)**：处理 Dolby Vision 的命令行工具，可读取、导出和编辑 RPU 元数据，也支持从 HEVC 流提取、注入 RPU，以及部分 Profile 转换。保留 P7、合并 BL/EL、转换 P8.1 与回查命令见 [Remux 教程](/posts/blu-ray-remux/#第三步处理-dolby-vision)。
- **[DDVT Tool](https://forum.doom9.org/showthread.php?t=183479)**：基于 quietvoid 工具的批处理脚本集合，用于 Dolby Vision RPU 分流、注入和编辑。Doom9 原帖有说明及项目下载入口，其中 HDR10+ 转 Dolby Vision 元数据功能标为实验性。

为不同片源处理 RPU 时，需要先核对帧序、剪辑与画幅是否匹配，再检查目标播放设备支持的 Dolby Vision Profile。元数据处理完成后仍要验证画面和播放结果。

## 相邻分类的清单

- [音频软件清单](/posts/audio-software/)：eac3to、qaac、deew，以及音轨转换和多声道处理资料。
- [字幕软件清单](/posts/subtitle-software/)：字幕编辑、图形字幕转换、OCR 和同步工具。
- [压制软件与资料清单](/posts/encode-software/)：FFmpeg、编码器和滤镜工具，也汇总 Doom9、VideoHelp、NMM 等论坛与教程。
