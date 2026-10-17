---
title: 音频软件清单
description: 按用途整理音轨提取、转换、编码与频谱检查所用的工具和文档。
author: Ayulog
pubDatetime: "2026-10-10T10:00:00+08:00"
modDatetime: "2026-10-11T16:00:00+08:00"
draft: false
category: audio
tags:
  - 音轨
  - Dolby
---

处理一条音轨前先确定用途：保留原轨、制作兼容副本，还是检查来源与转码痕迹。目标不同，提取、转换或编码的路径也不同，做完再核对声道、时长与同步。

## 从识别来源到封装验收

1. **识别来源。** 记录音轨编码、声道、采样率、时长与延迟，确认它属于目标节目的哪个版本。
2. **选择处理方式。** 能满足播放要求时保留原轨；需要核心、无损转换或兼容编码时，再明确要保留和改变的内容。
3. **先处理一条音轨。** 提取或编码后核对日志与输出信息，再决定是否处理剩余任务。
4. **按问题补做分析。** 怀疑来源或转码痕迹时，按一致的参数观察频谱，并结合来源和测量结果判断。
5. **封装与验收。** 写清语言、轨道名称与默认标记，回看开头、中段和结尾，检查音画同步及目标设备播放。

## 相关文章

- [音频处理篇：音轨识别、提取与编码](/posts/audio-processing/)：按目标选择原轨保留、DTS core、无损转换、QAAC 或 deew 编码，最后封装检查。
- [音频篇：频谱学习](/posts/audio-spectrum-learning/)：读懂坐标与 FFT，使用固定参数比较频谱，区分观察线索与可下的结论。

## 音轨提取与转换

- **[eac3to](https://forum.doom9.org/showthread.php?t=125966)**：音视频分流与音频转换工具，可查看轨道信息、提取音轨和章节、处理延迟、重采样以及转换音频格式。Doom9 原帖保留说明，并指向新版本发布入口；格式支持与依赖条件随所用版本而不同。
- **[UsEac3to](https://forum.doom9.org/showthread.php?t=145574)**：eac3to 的图形前端，便于选择文件、组织命令和查看帮助；仍需要理解并填写 eac3to 参数。下载时一起核对原帖中的 eac3to 版本要求。
- **[AudioMuxer](https://www.videohelp.com/software/AudioMuxer)**：面向音频转换与影音封装的 Windows 工具，可处理多声道音频，并生成 DVD、MKV 等输出。VideoHelp 已标为停止开发；[SurroundByUs 原发布帖](http://www.surroundbyus.com/sbu/viewtopic.php?p=788#p788)在本次整理时返回 404，保留作旧资料入口。

如果只是保留原有音轨并调整轨道顺序、语言或默认标记，可接着看 [DIY 清单中的 MKVToolNix](/posts/media-diy-software/#提取与封装)。

## AAC 与 Dolby 编码

- **[qaac](https://github.com/nu774/qaac)**：调用 Apple 音频组件的 AAC / ALAC 命令行编码工具。项目仓库提供源码和发布版本，安装依赖、质量模式和多声道处理可查下面的官方 Wiki。使用前核对当前 README 中的编码模式与组件版本说明。
- **[deew](https://github.com/pcrlnd/deew)**：Dolby Encoding Engine 的命令行封装，负责输入转换、配置生成和批量编码等步骤。需要 FFmpeg、ffprobe，以及另行准备的 Dolby Encoding Engine 和相应许可；deew 本身不包含 Dolby 编码器，具体参数与依赖以项目 README 为准。

## 文档与教程

- **[eac3to Wiki](https://en.wikibooks.org/wiki/Eac3to)**：包含功能说明、使用方式、技术解释和 FAQ，适合查分流、格式转换与延迟处理的概念。部分内容基于旧版本，需要对照当前发布说明。
- **[qaac Wiki](https://github.com/nu774/qaac/wiki)**：查具体选项时的主要入口，涵盖输入输出格式、编码器配置、采样率转换、混音矩阵和章节等内容。
- **[QAAC 音频编码器命令行参数教程](https://www.nazorip.site/archives/44/)**：NAZOrip 的中文教程，页面署名 A@NAZOrip，包含安装依赖、命令行参数和音频处理说明。
- **[压制软件与资料清单](/posts/encode-software/)**：收录 iAvoe 的 x264 / x265 / QAAC / ffprobe 教程、通用压制指南与论坛。音频与视频一起处理时，可从那里查完整流程和 FFmpeg 入口。

## 相关分类

- [字幕软件清单](/posts/subtitle-software/)：字幕编辑、识别、翻译和时间轴同步。
- [蓝光与媒体工具清单](/posts/media-diy-software/)：原盘检查、轨道提取、重新封装、章节和 HDR 元数据。
