---
title: 压制软件与资料清单
description: 压制流程会用到的图形工具、脚本环境、编码器和学习资料，按环节分组。
author: Ayulog
pubDatetime: "2026-10-09T16:10:00+08:00"
modDatetime: "2026-10-17T21:00:00+08:00"
draft: false
category: encode
tags:
  - VapourSynth
---

视频压制涉及图形转码前端、VapourSynth 帧服务器与插件、软件/硬件编码器以及音视频封装工具。本文按压制环节汇总常用软件入口、官方文档与公开教程。

如果只需要无损换容器、增删音轨或封装外挂字幕，无需重新编码视频，请直接查阅[蓝光与媒体工具清单](/posts/media-diy-software/)。

## 压制流程与站内教程导航

一套标准的视频压制任务通常分为五步：

1. **检查片源规格**：使用 MediaInfo 或 `ffprobe` 确认影片版本、分辨率、帧率、位深、扫描方式与色彩矩阵。
2. **选择处理路线**：常规降体积或制作校对小片使用 HandBrake / ShanaEncoder；需要精确裁边、缩放或调用去色带、降噪滤镜时使用 VapourSynth 脚本。
3. **截取样片建立基线**：切出 30–60 秒测试样片，先跑通默认预设下的基线输出。
4. **控制变量调优参数**：在相同样片上逐项对比 CRF、preset 与高级参数，结合编码日志与同帧截图定稿参数。
5. **全片编码与混流验收**：完成全片编码后，用 MKVToolNix 封装音轨、字幕、字体与章节，并在目标设备上回看检查。

<a id="四篇怎么读"></a>

站内各环节实操文章如下：

- **图形界面转码**：[一键压制篇：用图形工具完成一次转码](/posts/encode-one-click/)
- **脚本处理与管道输出**：[VapourSynth 压制篇：环境、脚本与输出](/posts/encode-vapoursynth/)
- **编码器选择与参数详解**：[编码篇：x264、x265 与 AV1](/posts/encode-codecs/)
- **样片切分、单变量对比与日志解读**：[压制练习：从一段样片到文档查阅](/posts/encode-learning/)
- **制作字幕校对专用低码率小片**：[HandBrake 与 ShanaEncoder：字幕校对用的快速压片教程](/posts/handbrake-shanaencoder-subtitle-proxy/)

## 一键压制与图形前端

- **[HandBrake](https://handbrake.fr/)**（[功能列表](https://handbrake.fr/features.php) · [官方文档](https://handbrake.fr/docs/en/latest/)）：跨平台开源图形转码工具，支持内置设备预设、尺寸裁切、x264 / x265 / SVT-AV1 / 硬件编码、多音轨与字幕管理。
- **[ShanaEncoder](https://shana.pe.kr/shanaencoder_download)**：Windows 下基于 FFmpeg 的高效图形转码与批量队列工具（第三方绿色包与汉化归档见 [1265578519/ShanaEncoder](https://github.com/1265578519/ShanaEncoder)）。
- **[StaxRip](https://github.com/staxrip/staxrip)**：将源滤镜分流、AviSynth / VapourSynth 脚本、主流编码器与 MKVToolNix 封装整合为一体式任务队列的 Windows 压制前端。
- **[Simple x264/x265 Launcher](https://github.com/lordmulder/Simple-x264-Launcher/releases)**：轻量级脚本编码前端，负责接收 `.vpy` / `.avs` 脚本并管理 x264 / x265 多任务队列（最新正式版为 3.04）。
- **其他传统工具**：[Hybrid](https://www.selur.de/)、[Avidemux](http://avidemux.sourceforge.net/)（[源码](https://github.com/mean00/avidemux2)）、[MeGUI](https://sourceforge.net/projects/megui/)、[小丸工具箱](https://maruko.appinn.me/)（各工具特点见[一键压制篇](/posts/encode-one-click/#脚本前端与其他工具)）。

## VapourSynth 与帧服务器生态

- **[VapourSynth](https://www.vapoursynth.com/)**（[官方文档](https://www.vapoursynth.com/doc/) · [安装说明](https://www.vapoursynth.com/doc/installation.html) · [Releases](https://github.com/vapoursynth/vapoursynth/releases)）：现代 Python 视频处理框架，自 R74 起支持直接通过 Python `pip` 安装管理。
- **[VapourSynth Editor（YomikoR 维护分支）](https://github.com/YomikoR/VapourSynth-Editor/releases?page=1)**：`.vpy` 脚本编写、逐帧画面预览、裁边测量与速度测试工具，已适配 R74+ 的库查找方式。
- **[L-SMASH-Works](https://github.com/HomeOfAviSynthPlusEvolution/L-SMASH-Works)**：最常用的 VapourSynth / AviSynth 源滤镜（可通过 `pip install vapoursynth-lsmas` 安装），负责解码视频文件并建立帧索引。
- **[VapourSynth Database（VSDB）](https://vsdb.top/)** 与 **[vsrepo](https://github.com/vapoursynth/vsrepo)**：VSDB 用于检索插件命名空间、依赖与上游仓库；`vsrepo` 为官方命令行插件安装工具（早期图形前端 [VSRepoGUI](https://github.com/theChaosCoder/VSRepoGUI/releases) 已归档停更）。
- **AviSynth+ 生态**：[AviSynth Wiki](http://avisynth.nl/index.php/Main_Page) 与 [AvsPmod 预览器](https://github.com/gispos/AvsPmod)，用于维护或运行传统的 `.avs` 脚本。

## 视频编码器与命令行工具

| 工具                                                                 | 标准与定位                                                                                                           |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| [x264](https://www.videolan.org/developers/x264.html)                | 成熟的 H.264 / AVC 软件编码器（[上游源码与 CLI 帮助](https://code.videolan.org/videolan/x264/-/blob/master/x264.c)） |
| [x265](https://www.videolan.org/developers/x265.html)                | 主流 H.265 / HEVC 软件编码器（[官方 CLI 参数文档](https://x265.readthedocs.io/en/master/cli.html)）                  |
| [x265 Mod by Patman](https://github.com/Patman86/x265-Mod-by-Patman) | 第三方增强构建版 x265，内置 `.vpy` / `.avs` 直接读取、Y4M 总帧数标记与进度显示                                       |
| [SVT-AV1](https://gitlab.com/AOMediaCodec/SVT-AV1)                   | 高性能开源 AV1 编码器（[官方参数表](https://gitlab.com/AOMediaCodec/SVT-AV1/-/blob/master/Docs/Parameters.md)）      |
| [FFmpeg](https://ffmpeg.org/)                                        | 通用音视频转码、流复制切分与管道工具，内置 `libx264`、`libx265`、`libsvtav1`、`libaom-av1` 等编码库封装              |

## 学习篇

以下收录中文与英文社区公开的系统教程、编码器深度解析与历史专题文章。阅读时注意区分**通用画质分析思路**与**特定时期的工具版本**——涉及环境安装、插件名称或编码器新参数时，结合文末的上游项目文档核对。

- [入门与完整流程](#入门与完整流程)：适合从零建立压制概念与标准工作流。
- [编码器与滤镜进阶](#编码器与滤镜进阶)：按画面瑕疵类型（色带、噪点、脏边）与编码器内部机制深入查阅。
- [旧文、专题与自动化案例](#旧文专题与自动化案例)：了解压制组工作流、自动化脚本设计与跨软件字幕合成。
- [博客、项目与社区](#博客项目与社区)：技术博客与海内外音视频论坛。
- [查当前用法时回到项目文档](#查当前用法时回到项目文档)：各组件官方参数手册速查表。

### 入门与完整流程

#### VCB-Studio 公开教程

**[新版教程网站](https://guides.vcb-s.com/)** · **[VCB-Studio GitHub 组织](https://github.com/vcb-s)**（[早期旧教程专栏归档](https://vcb-s.nmm-hd.org/)）

系统的中文动漫与蓝光压制教程。基础篇按顺序讲解音视频编码概念、工具链配置、x264 / x265 编码器基础与 VapourSynth 初级处理；进阶篇讨论复杂画面修复、非 BD 载体处理与专题案例（目前网站已公开基础篇全章与进阶篇前两章，配套脚本与规范文档可在其 GitHub 组织中查阅）。

#### FXXS 压制教程

**[FXXS 压制教程站点](https://fxxs-encoder.github.io/)**

涵盖音视频基础概念、工具准备、压制流程、同帧画面对比、HDR 参数配置、反交错以及音轨字幕整理，同时收录了多篇外文进阶指南的中文译稿，适合已了解基本术语、准备串联全流程的读者。

#### Encode Mystery

**[Encode Mystery](https://guide.geeking.moe/)**

以 Windows 下 VapourSynth 为核心的中文压制指南，按片源分析、首个 `.vpy` 脚本编写、常见滤镜应用（色彩、位深、去色带、反交错、抗锯齿）、编码到最终封装检查的顺序展开。由于成文时间较早，阅读时重点参考其片源诊断思路，Python 与 VS 插件安装请按现行 `pip` 方式操作。

#### Fansubbing Guide 与 The Encoding Guide

- **[Fansubbing Guide](https://guide.encode.moe/)**：英文字幕组协作指南，除视频压制与滤镜处理外，还涵盖时间轴、ASS 特效排版与质检流程。
- **[The Encoding Guide（原 AHD / AVS 教程）](https://encoding-guide.neocities.org/)**：英文高清电影压制指南，按 Tools、Demux、Filtration、Encoding、Muxing 组织，适合了解真人电影与蓝光重编码的标准处理思路（部分早期示例基于 AviSynth）。

### 编码器与滤镜进阶

#### iAvoe：x264、x265、AV1 及音频专题

**[GitHub 教程仓库与更新索引](https://github.com/iAvoe/x264-x265-QAAC-ffprobe-Ultimatetutorial/blob/master/%E6%95%99%E7%A8%8B.md)**

详尽的中文编码器原理解析与参数手册，各主篇均已独立为在线网页并持续更新：

| 专题入口                                                                   | 涵盖内容                                                                       |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| [x264 网页教程](https://iavoe.github.io/x264-web-tutorial/HTML/index.html) | 帧内/帧间预测、离散余弦变换、量化、CRF/ABR 码率控制、MB-Tree、AQ 与环路滤波    |
| [x265 网页教程](https://iavoe.github.io/x265-web-tutorial/HTML/index.html) | HEVC CTU 分区结构、RDO / RDOQ、心理视觉优化（Psy-RD）、并行控制与 HDR VUI 标记 |
| [AV1 网页教程](https://iavoe.github.io/av1-web-tutorial/HTML/index.html)   | AV1 编码工具、SVT-AV1 预设与参数详解、颗粒合成、画质评估指标与实测分析         |

仓库索引内还包含 QAAC / Opus 音频编码、`ffprobe` 流分析、码率分布曲线、VMAF 测量与 IVTC 反交错等专题。

#### Advanced Encoding Guide 与中文译本

- **[Advanced Encoding Guide（英文原版）](https://silentaperture.gitlab.io/mdbook-guide/introduction.html)**
- **[高级编码指南（suwmlee / Aicha 中文译本）](https://suwmlee.github.io/encoding-guide/introduction.html)**
- **[typing-more：高清视频转码进阶指南](https://github.com/typing-more/encode_guide/blob/master/%E9%AB%98%E6%B8%85%E8%A7%86%E9%A2%91%E8%BD%AC%E7%A0%81%E8%BF%9B%E9%98%B6%E6%8C%87%E5%8D%97.md)**（同源项目的另一份中文整理稿）

围绕高质量脚本压制展开，重点讲解色深转换、Resizer 缩放核特征、Dither 抖动、去色带（Debanding）、脏边修复、Mask 遮罩保护、降噪与 x264 / x265 参数调优，适合在遇到特定画面瑕疵时按章节查阅。

#### x264 参数 Wiki 与 Kokomins 指南

- **[MeGUI / x264 Settings Wiki](https://en.wikibooks.org/wiki/MeGUI/x264_Settings)**：经典的英文 x264 参数速查词典。
- **[Kokomins：Anime Encoding Guide for x265 & AAC/OPUS](https://kokomins.wordpress.com/2019/10/10/anime-encoding-guide-for-x265-and-why-to-never-use-flac/)**：面向 1080p 动画体积控制的英文经验长文，重点讨论 x265 下的微色带抑制与参数取舍。

### 旧文、专题与自动化案例

- **[NAZOrip：本组工作基本流程](https://www.nazorip.site/archives/7/)**（2017）与 **[一键高压缩脚本说明](https://nazorip.site/archives/46/)**（2018）：记录了压制组从脚本检查、预览到按章节/GOP 自动切分压制与复检的完整自动化设计思路。
- **[akarin：通过 VapourSynth 在 Premiere 中使用 ASS 字幕](https://akarin.dev/2019/08/03/use-ass-in-premiere/)**（2019）：解析如何利用 VapourSynth、虚拟文件系统（AVFS）与 Alpha 遮罩将复杂 ASS 特效字幕无损引入非线性剪辑软件。
- **[The QuickTime Gamma Bug](https://vitrolite.wordpress.com/2010/12/31/quicktime_gamma_bug/)**（2010）与 **[fnscar 技术文档抢救计划](https://fnscar.blogspot.com/)**：分别讨论早期播放器色彩管理引发的 Gamma 漂移问题，以及标清数字视频采样与宽高比（PAR / DAR）的历史标准。

### 博客、项目与社区

- **[NAZOrip 站点](https://nazorip.site/)**：持续更新编码器测试、滤镜对比、音频编码（如 Opus）与压制工具文章。
- **[NanNan's Blog](https://blog.nannan.cool/)**（[AV1 编码详解和测试](https://blog.nannan.cool/archives/61/) · [AV1 编码器使用指南](https://blog.nannan.cool/archives/105/)）：个人技术博客，记录了 AOM-AV1 与 SVT-AV1 的早期参数测试实践。
- **[Doom9 论坛](https://forum.doom9.org/index.php)** 与 **[VideoHelp](https://www.videohelp.com/)**：国际主流音视频开发与压制技术社区，许多编码器补丁、滤镜插件与蓝光工具都在此首发讨论。
- **[NMM-HD 论坛](https://www.nmm-hd.org/newbbs/)** 与 **[NMM Document](https://www.nmm-hd.org/doc/%E9%A6%96%E9%A1%B5)**：老牌中文音视频压制技术论坛与滤镜文档库。

### 查当前用法时回到项目文档

| 查询目标                       | 官方文档入口                                                                        | 查阅要点                                                       |
| ------------------------------ | ----------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| VapourSynth 核心 API 与 vspipe | [官网](https://www.vapoursynth.com/) · [在线文档](https://www.vapoursynth.com/doc/) | Python 版本要求、内置 `std` / `resize` 函数签名与管道参数      |
| VapourSynth 第三方插件检索     | [VSDB 插件库](https://vsdb.top/)                                                    | 查找插件 Namespace 与上游 GitHub 仓库的发布说明                |
| AviSynth / AviSynth+           | [AviSynth Wiki](http://avisynth.nl/index.php/Main_Page)                             | 查阅传统 `.avs` 滤镜语法与调用方式                             |
| x264                           | [VideoLAN x264 页面](https://www.videolan.org/developers/x264.html)                 | 结合本机 `x264 --fullhelp` 核对预设展开项                      |
| x265                           | [x265 ReadTheDocs](https://x265.readthedocs.io/en/latest/)                          | 核对各 preset 默认值、高级参数前置依赖与色彩标记               |
| SVT-AV1                        | [GitLab 官方仓库](https://gitlab.com/AOMediaCodec/SVT-AV1)                          | 查阅 `Docs/Parameters.md` 与 `Docs/Ffmpeg.md`                  |
| FFmpeg 与 ffprobe              | [FFmpeg 官方文档](https://ffmpeg.org/documentation.html)                            | 查阅 `-x264-params`、`-x265-params`、`-svtav1-params` 包装接口 |

## 辅助检测与成品整理工具

- **[MediaInfo](https://mediaarea.net/en/MediaInfo)** 与 **[ffprobe](https://ffmpeg.org/ffprobe.html)**：检查源片与压制成品的容器格式、帧率、位深、色彩矩阵及各轨道元数据。
- **[mpv](https://mpv.io/)** 与 **[VLC](https://www.videolan.org/vlc/)**：本地播放检查与逐帧画面对比工具。
- 关联工具清单：[音频软件清单](/posts/audio-software/)、[字幕软件清单](/posts/subtitle-software/)、[蓝光与媒体工具清单](/posts/media-diy-software/)。
