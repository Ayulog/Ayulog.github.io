---
title: 压制软件与资料清单
description: 压制流程会用到的图形工具、脚本环境、编码器和学习资料，按环节分组。
author: Ayulog
pubDatetime: "2026-10-09T16:10:00+08:00"
modDatetime: "2026-10-11T16:00:00+08:00"
draft: false
category: encode
tags:
  - VapourSynth
---

压制先看成品用途：是否需要重新编码，随后选择图形工具或脚本处理，做短片试压，最后封装和验收。工具、教程与文档按环节归在一起；单次转码、脚本处理、编码比较和学习练习各自成篇。

只需要换容器、补字幕或调整音轨时，先看 [蓝光与媒体工具清单](/posts/media-diy-software/)；裁边、缩放、烧录字幕和降低视频体积等需求，再进入压制流程。公开资料于 **2026 年 10 月 10 日**核查；各工具与教程的版本边界见对应条目。

## 从片源检查到成品验收

1. **检查片源和用途。** 确认节目版本、帧率、分辨率、位深与色彩信息，明确目标播放器、尺寸和体积要求。
2. **选择处理路线。** 简单转码从图形工具开始；需要裁边、滤镜或可复用脚本时，再接 VapourSynth。
3. **做一份短片基线。** 先走通输入、画面处理、编码、封装和播放，再逐项调整滤镜或编码参数。
4. **比较代表场景。** 检查暗部、渐变、运动、细线与颗粒，同时记录体积、耗时和参数变化。
5. **生成并验收成品。** 正式编码后整理音轨、字幕、字体和章节，核对元数据、同步及目标设备播放。

<a id="四篇怎么读"></a>

## 相关文章

### 按工具与处理任务进入

- [一键压制篇：用图形工具完成一次转码](/posts/encode-one-click/)：用 HandBrake 或 ShanaEncoder 检查预设、画面、音轨、字幕与队列。
- [VapourSynth 压制篇：环境、脚本与输出](/posts/encode-vapoursynth/)：配置环境，写最小脚本，完成预览、裁边、缩放和编码输出。
- [编码篇：x264、x265 与 AV1](/posts/encode-codecs/)：理解 CRF、preset 与兼容条件，用同一段素材做编码比较。

### 按具体用途练习

- [HandBrake 与 ShanaEncoder：字幕校对用的快速压片教程](/posts/handbrake-shanaencoder-subtitle-proxy/)：制作便于校对的小片，保留画幅与时间线，避免把字幕烧入视频。
- [压制练习：从一段样片到文档查阅](/posts/encode-learning/)：记录片源与版本，建立基线，做单项比较，并把报错或画面问题定位到对应组件。

## 一键压制篇

- **[HandBrake](https://handbrake.fr/)**：[功能列表](https://handbrake.fr/features.php)与[官方文档](https://handbrake.fr/docs/en/latest/)。跨平台转码工具，提供预设、滤镜、音轨、字幕与队列；视频会重新编码。
- **[ShanaEncoder](https://shana.pe.kr/shanaencoder_download)**：Windows 下的 FFmpeg 图形前端。收藏的 [GitHub 分发仓库](https://github.com/1265578519/ShanaEncoder)提供第三方绿色包与汉化资料，不是上游源码仓库；本次官网返回访问限制，未核实其当前最新版。
- **[StaxRip](https://github.com/staxrip/staxrip)**：整合编码器、AviSynth／VapourSynth 与任务队列的 Windows 前端。
- **[Simple x264/x265 Launcher](https://github.com/lordmulder/Simple-x264-Launcher/releases)**：轻量编码前端，支持脚本输入与队列；上游最新正式发行仍为 2024 年的 3.04，需要核对当前 VS 与编码器兼容性。
- **其他保留工具**：[Hybrid](https://www.selur.de/)、[Avidemux](http://avidemux.sourceforge.net/)（[源码](https://github.com/mean00/avidemux2)）、[MeGUI](https://sourceforge.net/projects/megui/)、[小丸工具箱](https://maruko.appinn.me/)。用途和旧组件边界见[一键压制篇](/posts/encode-one-click/#脚本前端与其他工具)。

## VapourSynth 压制篇

- **[VapourSynth](https://www.vapoursynth.com/)**：[官方文档目录](https://www.vapoursynth.com/doc/)、[安装说明](https://www.vapoursynth.com/doc/installation.html)与[发布记录](https://github.com/vapoursynth/vapoursynth/releases)。R74 起安装与插件布局已有变化，旧便携包教程需要按当前接口重查。
- **[VapourSynth Editor（YomikoR）](https://github.com/YomikoR/VapourSynth-Editor/releases?page=1)**：脚本编辑与预览工具。编辑器、Python 与 VS 库应使用相互兼容的版本。
- **[L-SMASH-Works](https://github.com/HomeOfAviSynthPlusEvolution/L-SMASH-Works)**：源滤镜项目，当前可通过 `vapoursynth-lsmas` 包安装；负责把压缩片源解码成脚本可访问的视频帧。
- **[VapourSynth Database](https://vsdb.top/)**：第三方插件与脚本目录，用来查用途、依赖和上游；安装方法看项目说明。
- **[VSRepoGUI](https://github.com/theChaosCoder/VSRepoGUI/releases)**：保留旧入口，仓库已经归档并标为过时。新环境按官方文档和各插件的 pip 安装说明配置。
- **旧 AVS 流程**：[AviSynth Wiki](http://avisynth.nl/index.php/Main_Page)与[AvsPmod](https://github.com/gispos/AvsPmod)。阅读旧教程时注意脚本语言与插件接口不同。

环境检查、最小脚本、裁边缩放和编码输出集中在 [VapourSynth 压制篇](/posts/encode-vapoursynth/)。

## 编码篇

| 编码器                                                               | 文档与用途                                                                                                                                     |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| [x264](https://www.videolan.org/developers/x264.html)                | H.264／AVC 软件编码器；查当前构建的 `--fullhelp` 与上游源码                                                                                    |
| [x265](https://www.videolan.org/developers/x265.html)                | HEVC 软件编码器；以[官方参数文档](https://x265.readthedocs.io/en/master/cli.html)核对 preset、率控制与颜色标记                                 |
| [x265 Mod by Patman](https://github.com/Patman86/x265-Mod-by-Patman) | 第三方增强构建，补充进度、Y4M 与脚本输入等能力；扩展功能需对照项目说明                                                                         |
| [SVT-AV1](https://gitlab.com/AOMediaCodec/SVT-AV1)                   | AV1 编码器；收藏的 GitLab 地址仍是官方项目入口，查[参数表](https://gitlab.com/AOMediaCodec/SVT-AV1/-/blob/master/Docs/Parameters.md)与发行记录 |
| [FFmpeg](https://ffmpeg.org/)                                        | 转码、滤镜、分流和封装工具，可调用不同编码库；具体能力取决于构建中启用的组件                                                                   |

H.264、HEVC、AV1 是编码格式，x264、x265、SVT-AV1 是具体实现。不同编码器的 CRF 数字不能当成同一画质刻度，软件与硬件编码也需要按实际素材和目标比较。短片命令及参数选择见[编码篇](/posts/encode-codecs/)。

## 学习篇

先读基本概念，再选一篇操作文章完成短片练习；有了能复现的基线，再查滤镜、率控制或自动化。一次完整练习还要包含音轨、字幕、封装与播放检查，具体记录方法见[压制练习：从一段样片到文档查阅](/posts/encode-learning/)。

这些资料的侧重点不同：有的从动画蓝光处理讲起，有的关注真人素材、保留颗粒或控制体积，也有专门解释编码器内部行为的长文。先确认作者处理的素材和目标，再判断某个设置是否适合自己的任务。下面的介绍沿用 **2026 年 10 月 10 日**的联网核查记录；教程能打开，工具组合和参数是否经过当前版本验证则是另一回事。

- [入门与完整流程](#入门与完整流程)：选一套系统教程建立主线。
- [编码器与滤镜进阶](#编码器与滤镜进阶)：按画面问题和参数查阅。
- [旧文、专题与自动化案例](#旧文专题与自动化案例)：参考问题分析与任务组织，保留年代和依赖前提。
- [博客、项目与社区](#博客项目与社区)：找专题、讨论和项目更新。
- [当前项目文档](#查当前用法时回到项目文档)：核对本机版本对应的选项、接口和依赖。

### 入门与完整流程

#### VCB-Studio 公开教程

**[新版教程网站](https://guides.vcb-s.com/)** · **[VCB-Studio GitHub 组织](https://github.com/vcb-s)**

中文教程，适合作为系统学习的主线。基础篇按顺序讲音视频知识、压制工具链、编码器和 VapourSynth 初级处理；进阶篇涉及更复杂的画面处理、非 BD 载体和专题。当前首页说明进阶篇只公开前两章，阅读时不用把没有公开的后续章节当成链接故障。

网页便于连续阅读；示例脚本、素材、勘误和讨论从对应仓库查找。GitHub 组织还收录工具、整理规范和发布规范，教程与项目源码可以互相对照。

旧清单中的 **[VCB-Studio 旧教程专栏](https://vcb-s.nmm-hd.org/)** 继续保留，本次连接未成功。旧教程中的 Python、VapourSynth 和插件安装方式，应与新版公开教程及项目文档对照。

#### FXXS 压制教程

**[FXXS](https://fxxs-encoder.github.io/)**

中文资料，包含基本概念、工具、压制基础、画面对比、HDR 参数、去交错和音轨字幕等内容，也收录翻译整理的进阶指南。适合已经认识基本术语，准备串起片源、脚本、编码与封装的人。

站点序言明确写着教程仍在建设中，并可能存在不准确之处。参数示例和内部规则都带有各自用途，阅读时保留这个前提。旧清单中的 [FXXS 基础教程 Markdown 地址](https://github.com/ted423/FXXS-Encode-Guide/blob/main/%E5%8E%8B%E5%88%B6%E5%9F%BA%E7%A1%80%E6%95%99%E7%A8%8B.md) 本次返回 404，实际阅读使用上面的站点。

#### Encode Mystery

**[Encode Mystery](https://guide.geeking.moe/)**

中文指南，以 Windows 下的 VapourSynth 为主要环境，从分析片源、编写第一个脚本、添加滤镜，写到编码、封装和最后检查，还包含色彩、位深、色带、交错和滤镜条目。

首页说明它受到 Fansubbing Guide 启发，目标更偏重视频处理和压制。本次首页显示约六年前更新，所以更适合用来理解流程与概念；环境安装、插件命名和函数参数需要重新核对。

#### Fansubbing Guide

**[Fansubbing Guide](https://guide.encode.moe/)**

英文协作指南，面向字幕组工作的各个环节，既有视频编码与画面处理，也有字幕制作、排版等资料。读动画字幕组相关教程时，可以在这里补足压制以外的知识。

首页仍说明项目在建设中，许多主题尚未补齐。它与 Encode Mystery 有内容方向上的联系，两者并非互为完整译本。

#### The Encoding Guide

**[The Encoding Guide（旧清单中的 AHD / AVS 教程）](https://encoding-guide.neocities.org/)**

英文指南，按 Tools、Demux、Filtration / Encoding / Muxing 和 Extras 组织，适合对照理解工具准备、分流、过滤、编码与封装之间的关系。首页标注最后更新为 **2025 年 3 月 16 日**。

沿用旧清单的 AHD / AVS 名称便于查找。涉及 AviSynth 的示例要在对应环境中理解，不能直接复制成 VapourSynth 脚本。

### 编码器与滤镜进阶

#### iAvoe：x264、x265、AV1 及音频专题

**[教程仓库](https://github.com/iAvoe/x264-x265-QAAC-ffprobe-Ultimatetutorial)** · **[教程索引与更新记录](https://github.com/iAvoe/x264-x265-QAAC-ffprobe-Ultimatetutorial/blob/master/%E6%95%99%E7%A8%8B.md)**

中文长篇教程。仓库中的《教程.md》现在主要负责导读与更新记录，完整内容分为独立网页；本次索引已列出 2026 年的更新记录。

| 入口                                                                   | 主要内容                                                           | 阅读位置                   |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------- |
| [x264 教程](https://iavoe.github.io/x264-web-tutorial/HTML/index.html) | 封装与编码基础、预测、量化、率控制、自适应量化、环路滤镜和色彩信息 | 先读基础部分，再按参数查阅 |
| [x265 教程](https://iavoe.github.io/x265-web-tutorial/HTML/index.html) | HEVC 编码结构、率失真优化、线程控制、VUI / HDR 和参数说明          | 理解 x264 基础之后继续读   |
| [AV1 教程](https://iavoe.github.io/av1-web-tutorial/HTML/index.html)   | AV1 编码过程、SVT-AV1 参数与预设、报错、画质指标和编码测试         | 已掌握编码基础后阅读       |

索引还包含 QAAC、Opus、ffprobe、码率曲线、VMAF、图像序列与去交错 / IVTC 等专题。需要音频或分析工具时，从对应章节进入即可。

作者将这些教程定位为业余分析与参考。长文有助于理解参数，但示例里的结论仍受素材、软件版本和测试条件限制；不同编码器的同一个 CRF 数字不是同一档质量，一次性能比较也推广不到所有素材。

#### Advanced Encoding Guide 与中文译本

**[Advanced Encoding Guide 英文原版](https://silentaperture.gitlab.io/mdbook-guide/introduction.html)** · **[高级编码指南中文译本](https://suwmlee.github.io/encoding-guide/introduction.html)**

英文原版面向想制作高质量压制的新人与有经验的压制者，中文译本由 suwmlee 仓库维护，译者前言介绍主要贡献者为 Aicha。内容涉及位深、缩放、去色带、颗粒、脏边、遮罩、编码设置和画面对比。

这组资料适合按具体画面问题查阅。原版明确不讲 VapourSynth 的安装配置；中文译本也说明部分章节尚未完成，术语和脚本有疑问时可回看英文原文。译文中“色度分辨率减半”一类表述，还要分清是在说宽高各减半，还是总采样数，避免只凭一句话理解格式。

#### 高清视频转码进阶指南

**[typing-more：高清视频转码进阶指南](https://github.com/typing-more/encode_guide/blob/master/%E9%AB%98%E6%B8%85%E8%A7%86%E9%A2%91%E8%BD%AC%E7%A0%81%E8%BF%9B%E9%98%B6%E6%8C%87%E5%8D%97.md)**

Concertos Encode_Guide 的中文翻译整理，与上面的指南有共同项目背景。涵盖工具、分流、VapourSynth、缩放、抖动、去色带、脏线、抗锯齿、降噪、遮罩和编码等内容。

文首已注明并非所有内容都正确，正文还保留未译段落和较早的项目链接。可以用它补充中文术语和处理思路；涉及安装路径、编辑器选择、修改版编码器、脚本接口及计算公式时，回到当前项目文档核对，示例不要整段照搬。

#### x264 参数 Wiki 与 Kokomins

- **[x264 参数 Wiki](https://en.wikibooks.org/wiki/MeGUI/x264_Settings)**：英文社区资料，按 MeGUI / x264 设置解释参数。适合辅助查词，但默认值、预设展开结果和可用参数查手头编码器的帮助信息。
- **[Kokomins：Anime Encoding Guide for x265 (HEVC) & AAC/OPUS](https://kokomins.wordpress.com/2019/10/10/anime-encoding-guide-for-x265-and-why-to-never-use-flac/)**：英文文章，始于 2019 年，作者明确以 1080p 动画调整参数，讨论 x265、颗粒、微色带与 AAC / Opus。标题中的“不要使用 FLAC”体现其体积与分发取向，不能据此否定无损音频在归档、编辑或其他需求中的用途。

### 旧文、专题与自动化案例

这些文章仍有可读的思路，但年代和依赖是阅读的一部分。

#### NAZOrip 新人流程与一键高压缩脚本

- **[组内新人培训（一）：本组工作基本流程](https://www.nazorip.site/archives/7/)**：F@NAZOrip 于 **2017 年 10 月 19 日**发表。可以看到 Python、VapourSynth、VSEdit、插件和编码器如何衔接，以及检查脚本、预览和启动编码的顺序。原文依赖当时组内提供的工具包与脚本，适合读工作流程，环境安装另看现行文档。
- **[迷之压制组一键高压缩脚本说明与下载](https://nazorip.site/archives/46/)**：F@NAZOrip 于 **2018 年 6 月 21 日**发表，标题标注同年 7 月更新。使用 Python、VapourSynth 和定制 x265 串联扫描、章节分段、脚本生成、分 GOP 编码、复检及封装。

后一篇涉及 Python 3.6 和特定 x265 修改版，记录的是当时为高压缩目标设计的自动化方案。按章节或 GOP 调整质量会改变画质分配，整体码率更低与效果更好是两件事；是否接受这种取舍，要回到实际画面对比。今天搭建自动化流程时，可以参考任务组织方式，所附组件和参数另行验证。

#### 在 Premiere 中使用 ASS 字幕

**[通过 VapourSynth 在 Premiere 中使用 ASS 字幕](https://akarin.dev/2019/08/03/use-ass-in-premiere/)**

小透明于 **2019 年 8 月 3 日**发表的中文文章。讨论 ASS 字幕进入非线性编辑软件的几条路径：图片序列、带透明度的中间视频，以及通过 VapourSynth、虚拟 AVI 和遮罩组织字幕画面。

适合了解“把字幕渲染成画面”与“直接导入可编辑字幕”之间的区别，也能帮助理解字幕色层与透明度遮罩。文中使用当年的 Premiere 和插件环境，当前版本的限制要重新查；avfs、字幕渲染器、透明度处理和宿主软件兼容性需要逐项检查。

#### QuickTime Gamma Bug 与历史制式

- **[The QuickTime Gamma Bug](https://vitrolite.wordpress.com/2010/12/31/quicktime_gamma_bug/)**：ssfire 于 **2010 年 12 月 31 日**发表的英文文章，针对当年的 QuickTime 和 After Effects CS5，分别观察编码时的亮度变化与播放时的对比度变化。适合用来提醒自己区分像素已经改变、范围解释错误和播放器显示差异；文中的 gamma 修正值不能当作现代播放器的通用补偿公式。
- **[fnscar：技术文档抢救计划](https://fnscar.blogspot.com/)**：历史文档转载与保存站点，包含 Jukka Aho 的数字视频分辨率、宽高比转换资料。页面转载日期与原文修订日期不同；讨论模拟电视、标清采样和像素宽高比时，保留原作者及制式背景。

### 博客、项目与社区

#### NAZOrip 与 NanNan

**[NAZOrip](https://nazorip.site/)** 收录编码器、滤镜、播放、自动化和工具文章。前面的 2017 / 2018 年文章只是其中的旧资料，本次首页也能看到 2026 年的工具与 Opus 专题。查站内文章时看具体发布日期和依赖，不因某篇旧文把整个站点当成停止更新。

**[NanNan's Blog](https://blog.nannan.cool/)** · **[关于页](https://blog.nannan.cool/about/)** 是个人技术与折腾记录，已有收藏继续保留。与压制直接相关的是 [AV1 编码详解和测试](https://blog.nannan.cool/archives/61/)和 [AV1 编码器使用指南](https://blog.nannan.cool/archives/105/)，分别发表于 **2021 年 10 月 13 日和 18 日**，介绍 AOM-AV1、SVT-AV1 及其使用经验。

这两篇可用于了解 AV1 早期实践，但当时的编码器成熟度、速度、预设和默认值已经带有版本边界。当前选项要查 SVT-AV1 官方文档，性能结论则用自己的素材和当前版本重测。

#### 技术论坛与软件目录

- **[Doom9](https://forum.doom9.org/index.php)**：英文音视频技术论坛，常能找到滤镜、帧服务器、编码器和字幕工具的开发讨论。阅读长帖时注意楼层日期、发布版本与后续修复。
- **[VideoHelp](https://www.videohelp.com/)**：英文软件目录、教程和论坛，适合按用途找工具、查版本历史，再回到项目维护者的发布入口。
- **[NMM 论坛](https://www.nmm-hd.org/newbbs/)** · **[NMM Document](https://www.nmm-hd.org/doc/%E9%A6%96%E9%A1%B5)**：旧清单保留的中文视频技术社区与文档入口。本次连接未成功，暂时保留地址，未据此判断站点是否停止维护。

### 查当前用法时回到项目文档

教程帮助建立思路，参数名称、默认值、支持格式和安装条件则优先查所用版本的上游文档。这里收录的入口会持续变化，保存实践记录时最好写下版本号或提交号。

| 要查的内容                    | 入口                                                                                | 核对重点                                                         |
| ----------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| VapourSynth 安装、API、vspipe | [官网](https://www.vapoursynth.com/) · [官方文档](https://www.vapoursynth.com/doc/) | Python 与架构要求、插件 API、命令行选项；本次文档页标为 R80      |
| VapourSynth 插件与脚本        | [VSDB](https://vsdb.top/)                                                           | 这是第三方检索目录，找到项目后再看 README、发行记录和依赖        |
| AviSynth 与旧 AVS 脚本        | [AviSynth Wiki](http://avisynth.nl/index.php/Main_Page)                             | AviSynth / AviSynth+、插件位数和脚本语法，不与 VapourSynth 混用  |
| x264                          | [VideoLAN x264 项目](https://www.videolan.org/developers/x264.html)                 | 构建支持与命令行帮助；社区修改版可能添加上游没有的参数           |
| x265                          | [官方文档](https://x265.readthedocs.io/en/latest/)                                  | CLI 参数、预设与修改记录，注意 `latest` 文档可能与本地旧版本不同 |
| SVT-AV1                       | [上游仓库](https://gitlab.com/AOMediaCodec/SVT-AV1)                                 | 对应版本的 Docs、参数说明与发行记录                              |
| FFmpeg 与 ffprobe             | [官方文档目录](https://ffmpeg.org/documentation.html)                               | 通用选项、滤镜、编码器包装层和所编译组件                         |

查询一个问题时，可以先记录输入规格、软件版本、最小脚本、完整命令和报错位置，再把问题落到某个组件。例如 `vspipe` 还没有正常输出帧，就先检查 VapourSynth 环境；编码完成后字幕样式不对，则检查字幕轨、字体与渲染方式。这样更容易找到对应的文档或讨论。

本次能够读取上面新收录的教程、博客和 GitHub 页面；旧 FXXS Markdown 地址返回 404，旧 VCB 专栏和两个 NMM 入口未能建立连接。访问核查没有包含完整安装、插件兼容测试或实际编码，相关操作仍需按各实践篇列出的前提验证。

## 基础工具与成品整理

- **[MediaInfo](https://mediaarea.net/en/MediaInfo)** 与 **[ffprobe](https://ffmpeg.org/ffprobe.html)**：核对容器、轨道、帧率、位深、色彩信息与输出参数。
- **[VLC](https://www.videolan.org/vlc/)**：用于播放检查；画面对比要保持相同播放器设置与显示条件，并补做目标设备测试。
- **[音频软件清单](/posts/audio-software/)**：音轨提取、转码与 AAC、Dolby 等编码工具。
- **[字幕软件清单](/posts/subtitle-software/)**：字幕编辑、OCR、时间轴和字体处理。
- **[蓝光与媒体工具清单](/posts/media-diy-software/)**：蓝光、轨道、章节与 MKVToolNix 封装；色彩与元数据另见[认识 HDR](/posts/understanding-hdr/)。
