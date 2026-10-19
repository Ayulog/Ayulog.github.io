---
title: 音频软件清单
description: 按用途整理音轨提取、转换、编码与频谱检查所用的工具和文档。
author: Ayulog
pubDatetime: "2026-10-10T10:00:00+08:00"
modDatetime: "2026-10-17T21:00:00+08:00"
draft: false
category: audio
tags:
  - 音轨
---

处理影视与音乐音轨时，通常会根据成品要求选择保留原始无损码流、提取内嵌核心、转换为 FLAC，或是重新编码为 AAC、Dolby Digital Plus（E-AC-3）等兼容格式。以下按工作环节整理常用工具与教程入口。

## 音轨处理基本流程

1. **识别音轨参数**：使用 MediaInfo 查看编码格式、声道布局、采样率、位深、时长与延迟，确认其对应的影片版本。
2. **确定处理路线**：优先保留原盘无损轨（TrueHD / DTS-HD MA / LPCM）；有设备兼容或体积要求时，再选择剥离 DTS Core、转 FLAC 或压制有损兼容轨。
3. **提取与编码转换**：使用 eac3to、DGDemux、qaac 或 deew 执行分流与编码，检查运行日志与输出文件信息。
4. **声谱与质量排查**：怀疑音源经历过有损转码或上采样时，使用固定 FFT 参数查看声谱图并结合抓轨/编码记录核实。
5. **混流封装与验收**：在 MKVToolNix 中填写准确的语言代码、轨道名称与延迟值，混流后抽查片头、中段、分支接缝与片尾的音画同步。

## 本站教程入口

- [音频处理篇：音轨识别、提取与编码](/posts/audio-processing/)：涵盖 MediaInfo 音轨识别、DTS Core 剥离、FLAC 无损转换，以及使用 qaac、deew 编码 AAC 与杜比音轨的完整步骤。
- [音频篇：频谱学习](/posts/audio-spectrum-learning/)：解析声谱图（Spectrogram）的频率坐标、dBFS 标尺与 STFT 分辨率设置，辨析有损低通截断、编码斑块与母带特征。

## 音轨提取与转换

- **[eac3to](https://forum.doom9.org/showthread.php?t=125966)**：经典的蓝光播放列表分析、音视频分流与音频转换命令行工具，支持提取原始音轨、剥离 DTS Core、校正延迟、重采样及转换为 FLAC / WAV / AC-3 / DTS 等格式（视频与原盘分流用法见[蓝光原盘 Remux](/posts/blu-ray-remux/#eac3to-与-useac3to分析与音轨分流)）。
- **[UsEac3To](https://forum.doom9.org/showthread.php?t=145574)**：eac3to 的图形界面前端，方便直观选择轨道编号、输出扩展名与常用参数，并支持联动 `mkvmerge` 直接混流（下载时注意匹配对应的 eac3to 版本）。
- **[AudioMuxer](https://www.videohelp.com/software/AudioMuxer)**：面向多声道音频转换与影音封装的经典 Windows 工具（已归档停更），支持处理多声道 WAV / FLAC / DTS 并封装至 MKV 或 DVD 结构。

若只需在现有容器中调整音轨顺序、修改语言标签或勾选 `Reduce to core` 提取 DTS 核心，可直接使用 [蓝光与媒体工具清单中的 MKVToolNix](/posts/media-diy-software/#提取与封装)。

## AAC 与 Dolby 编码工具

- **[qaac](https://github.com/nu774/qaac)**：调用 Apple CoreAudio 组件的命令行音频编码器，支持高质量有损 AAC（TVBR / CVBR / ABR）与无损 ALAC 编码，广泛用于压制立体声及多声道音轨。
- **[deew](https://github.com/pcrlnd/deew)**：针对商业级 Dolby Encoding Engine（DEE）的命令行封装工具，配合 FFmpeg、ffprobe 与已授权的 DEE 环境，可将 FLAC、WAV、TrueHD、DTS 等音轨批量编码为合规的 Dolby Digital（AC-3）、Dolby Digital Plus（E-AC-3）、AC-4 或 TrueHD。

## 参考文档与进阶资料

- **[eac3to Wiki](https://en.wikibooks.org/wiki/Eac3to)**：整理了 eac3to 的核心功能、输入输出格式支持、延迟处理机制与常用参数说明。
- **[qaac Wiki](https://github.com/nu774/qaac/wiki)**：qaac 官方文档，详述 Apple CoreAudio 依赖提取、质量档位、采样率转换、多声道混音矩阵与管道输入用法。
- **[QAAC 音频编码器命令行参数教程](https://www.nazorip.site/archives/44/)**：由 A@NAZOrip 整理的中文指南，包含运行环境配置、`qaac --check` 校验、FFmpeg 管道联动及常用压制参数示例。
- **[压制软件与资料清单](/posts/encode-software/)**：汇总 FFmpeg、x264 / x265 编码器、VapourSynth 滤镜及 iAvoe 等压制教程，适合音视频联合压制时查阅。

## 相邻分类清单

- [蓝光与媒体工具清单](/posts/media-diy-software/)：原盘检查、播放列表分流、MKV Remux、章节编辑与杜比视界元数据处理。
- [字幕软件清单](/posts/subtitle-software/)：字幕编辑、OCR 识别、时间轴对齐与蓝光 SUP 图形字幕渲染。
