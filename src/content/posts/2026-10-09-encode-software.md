---
mediaCategory: encode
mediaRole: overview
title: 压制常用软件与资料
description: 压制系列总目录，分为一键压制、VapourSynth 压制、x264／x265／AV1 编码和学习资料四篇，汇总常用软件与当前文档入口。
author: Ayulog
pubDatetime: "2026-10-09T16:10:00+08:00"
modDatetime: "2026-10-10T12:00:00+08:00"
draft: false
tags:
  - Encode
  - 学习笔记
  - 视频压制
  - 视频编码
  - VapourSynth
  - 软件清单
---

把压制相关的软件、操作流程和学习资料整理在这里，按一键压制、VapourSynth 压制、编码和学习四篇展开。第一次接触可以先用图形工具完成短片转码，再逐步接触脚本、滤镜和编码参数。

只需要换容器、补字幕或调整音轨时，先看 [DIY 常用软件与资料](/posts/2026-10-10-media-diy-software/)；裁边、缩放、烧录字幕和降低视频体积等需求，再进入压制流程。本文及系列文章的公开资料核查日期为 **2026 年 10 月 10 日**。

## 目录

- [四篇怎么读](#四篇怎么读)
- [一键压制篇](#一键压制篇)
- [VapourSynth 压制篇](#vapoursynth-压制篇)
- [编码篇](#编码篇)
- [学习篇](#学习篇)
- [基础工具与成品整理](#基础工具与成品整理)

## 四篇怎么读

| 文章                                                                          | 主要内容                                                       |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------- |
| [一键压制篇：用图形工具完成一次转码](/posts/2026-10-10-encode-one-click/)     | HandBrake、ShanaEncoder、前端选择，预设、音轨、字幕与短片检查  |
| [VapourSynth 压制篇：环境、脚本与输出](/posts/2026-10-10-encode-vapoursynth/) | 当前 Windows 安装方式、编辑器、插件、导入、裁边、缩放与 vspipe |
| [编码篇：x264、x265 与 AV1](/posts/2026-10-10-encode-codecs/)                 | CRF、preset、位深、码率约束、三类编码器的试压与参数文档        |
| [压制学习篇：教程、博客与文档](/posts/2026-10-10-encode-learning/)            | VCB-Studio、iAvoe、FXXS、NAZOrip 等教程及中英文进阶资料        |

先了解容器、编码格式、帧率、分辨率与位深，再找一段素材走通“检查源 → 处理画面 → 编码 → 封装 → 检查成品”。有了能复现的基线，再调整滤镜和编码参数；每次记录改了什么，以及画质、体积和耗时的变化。

## 一键压制篇

- **[HandBrake](https://handbrake.fr/)**：[功能列表](https://handbrake.fr/features.php)与[官方文档](https://handbrake.fr/docs/en/latest/)。跨平台转码工具，提供预设、滤镜、音轨、字幕与队列；视频会重新编码。
- **[ShanaEncoder](https://shana.pe.kr/shanaencoder_download)**：Windows 下的 FFmpeg 图形前端。收藏的 [GitHub 分发仓库](https://github.com/1265578519/ShanaEncoder)提供第三方绿色包与汉化资料，不是上游源码仓库；本次官网返回访问限制，未核实其当前最新版。
- **[StaxRip](https://github.com/staxrip/staxrip)**：整合编码器、AviSynth／VapourSynth 与任务队列的 Windows 前端。
- **[Simple x264/x265 Launcher](https://github.com/lordmulder/Simple-x264-Launcher/releases)**：轻量编码前端，支持脚本输入与队列；上游最新正式发行仍为 2024 年的 3.04，需要核对当前 VS 与编码器兼容性。
- **其他保留工具**：[Hybrid](https://www.selur.de/)、[Avidemux](http://avidemux.sourceforge.net/)（[源码](https://github.com/mean00/avidemux2)）、[MeGUI](https://sourceforge.net/projects/megui/)、[小丸工具箱](https://maruko.appinn.me/)。用途和旧组件边界见[一键压制篇](/posts/2026-10-10-encode-one-click/#脚本前端与其他工具)。

## VapourSynth 压制篇

- **[VapourSynth](https://www.vapoursynth.com/)**：[官方文档总入口](https://www.vapoursynth.com/doc/)、[安装说明](https://www.vapoursynth.com/doc/installation.html)与[发布记录](https://github.com/vapoursynth/vapoursynth/releases)。R74 起安装与插件布局已有变化，旧便携包教程需要按当前接口重查。
- **[VapourSynth Editor（YomikoR）](https://github.com/YomikoR/VapourSynth-Editor/releases?page=1)**：脚本编辑与预览工具。编辑器、Python 与 VS 库应使用相互兼容的版本。
- **[L-SMASH-Works](https://github.com/HomeOfAviSynthPlusEvolution/L-SMASH-Works)**：源滤镜项目，当前可通过 `vapoursynth-lsmas` 包安装；负责把压缩片源解码成脚本可访问的视频帧。
- **[VapourSynth Database](https://vsdb.top/)**：第三方插件与脚本目录，用来查用途、依赖和上游；具体安装方法以项目说明为准。
- **[VSRepoGUI](https://github.com/theChaosCoder/VSRepoGUI/releases)**：保留旧入口，仓库已经归档并标为过时。新环境按官方文档和各插件的 pip 安装说明配置。
- **旧 AVS 流程**：[AviSynth Wiki](http://avisynth.nl/index.php/Main_Page)与[AvsPmod](https://github.com/gispos/AvsPmod)。阅读旧教程时注意脚本语言与插件接口不同。

环境检查、最小脚本、裁边缩放和编码输出集中在 [VapourSynth 压制篇](/posts/2026-10-10-encode-vapoursynth/)。

## 编码篇

| 编码器                                                               | 文档与用途                                                                                                                                     |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| [x264](https://www.videolan.org/developers/x264.html)                | H.264／AVC 软件编码器；查当前构建的 `--fullhelp` 与上游源码                                                                                    |
| [x265](https://www.videolan.org/developers/x265.html)                | HEVC 软件编码器；以[官方参数文档](https://x265.readthedocs.io/en/master/cli.html)核对 preset、率控制与颜色标记                                 |
| [x265 Mod by Patman](https://github.com/Patman86/x265-Mod-by-Patman) | 第三方增强构建，补充进度、Y4M 与脚本输入等能力；扩展功能需对照项目说明                                                                         |
| [SVT-AV1](https://gitlab.com/AOMediaCodec/SVT-AV1)                   | AV1 编码器；收藏的 GitLab 地址仍是官方项目入口，查[参数表](https://gitlab.com/AOMediaCodec/SVT-AV1/-/blob/master/Docs/Parameters.md)与发行记录 |
| [FFmpeg](https://ffmpeg.org/)                                        | 转码、滤镜、分流和封装工具，可调用不同编码库；具体能力取决于构建中启用的组件                                                                   |

H.264、HEVC、AV1 是编码格式，x264、x265、SVT-AV1 是具体实现。不同编码器的 CRF 数字不能当成同一画质刻度，软件与硬件编码也需要按实际素材和目标比较。短片命令及参数选择见[编码篇](/posts/2026-10-10-encode-codecs/)。

## 学习篇

完整书目已整合到[压制学习篇](/posts/2026-10-10-encode-learning/)，每项附用途、阅读阶段和必要的版本边界：

- **基础与流程**：[VCB-Studio](https://guides.vcb-s.com/)、[FXXS](https://fxxs-encoder.github.io/)、[Encode Mystery](https://guide.geeking.moe/)、[Fansubbing Guide](https://guide.encode.moe/)。
- **编码与滤镜**：[iAvoe 教程索引](https://github.com/iAvoe/x264-x265-QAAC-ffprobe-Ultimatetutorial/blob/master/%E6%95%99%E7%A8%8B.md)、[Advanced Encoding Guide](https://silentaperture.gitlab.io/mdbook-guide/introduction.html)、[中文译本](https://suwmlee.github.io/encoding-guide/introduction.html)、[高清视频转码进阶指南](https://github.com/typing-more/encode_guide/blob/master/%E9%AB%98%E6%B8%85%E8%A7%86%E9%A2%91%E8%BD%AC%E7%A0%81%E8%BF%9B%E9%98%B6%E6%8C%87%E5%8D%97.md)。
- **博客、项目与专题**：[NAZOrip](https://nazorip.site/)、[VCB-Studio GitHub](https://github.com/vcb-s)、[NanNan](https://blog.nannan.cool/)，以及 QuickTime 色彩问题、ASS 与 Premiere、自动化压制等旧文。
- **社区与旧资料**：Doom9、VideoHelp、NMM、AHD／AVS 教程、x264 参数 Wiki 与个人博客均在学习篇保留。

旧教程适合学习问题分析和流程组织。安装版本、插件接口、编码参数与下载地址仍需回到当前上游核对，不把当年的固定配置当成通用答案。

## 基础工具与成品整理

- **[MediaInfo](https://mediaarea.net/en/MediaInfo)** 与 **[ffprobe](https://ffmpeg.org/ffprobe.html)**：核对容器、轨道、帧率、位深、色彩信息与输出参数。
- **[VLC](https://www.videolan.org/vlc/)**：用于播放检查；画面对比要保持相同播放器设置与显示条件，并补做目标设备测试。
- **[音频常用软件与资料](/posts/2026-10-10-audio-software/)**：音轨提取、转码与 AAC、Dolby 等编码工具。
- **[字幕常用软件与资料](/posts/2026-10-10-subtitle-software/)**：字幕编辑、OCR、时间轴和字体处理。
- **[DIY 常用软件与资料](/posts/2026-10-10-media-diy-software/)**：蓝光、轨道、章节与 MKVToolNix 封装；色彩与元数据另见[认识 HDR](/posts/2026-10-10-understanding-hdr/)。
