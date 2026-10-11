---
mediaCategory: encode
mediaRole: guide
title: 压制学习篇：教程、博客与文档
description: 整理 VCB-Studio、iAvoe、NAZOrip、FXXS 等压制教程与个人站点，按完整流程、编码滤镜、旧文专题和官方文档安排阅读，并注明译文关系、年代与访问情况。
author: Ayulog
pubDatetime: "2026-10-10T12:00:00+08:00"
draft: false
tags:
  - Encode
  - 视频压制
  - 学习资料
  - VapourSynth
  - x264
  - x265
  - AV1
---

把之前压制清单里的教程、博客和论坛集中放在这里。软件入口见[压制常用软件与资料](/posts/2026-10-09-encode-software/)；具体操作分为[一键压制篇](/posts/2026-10-10-encode-one-click/)、[VapourSynth 压制篇](/posts/2026-10-10-encode-vapoursynth/)和[编码篇](/posts/2026-10-10-encode-codecs/)。

这些资料的侧重点不同：有的从动画蓝光处理讲起，有的关注真人素材、保留颗粒或控制体积，也有专门解释编码器内部行为的长文。阅读时先确认作者处理的素材和目标，再判断某个设置是否适合自己的任务。

本篇于 **2026 年 10 月 10 日**联网核查。下面的介绍依据实际页面；访问失败和旧地址另行注明。能打开一篇教程，只能说明它还可阅读，不代表文中的工具组合和参数经过当前版本验证。

## 目录

- [建议的学习顺序](#建议的学习顺序)
- [入门与完整流程](#入门与完整流程)
- [编码器与滤镜进阶](#编码器与滤镜进阶)
- [旧文、专题与自动化案例](#旧文专题与自动化案例)
- [博客、项目与社区](#博客项目与社区)
- [查当前用法时回到项目文档](#查当前用法时回到项目文档)

## 建议的学习顺序

1. **先读基础概念。** 分清容器、编码格式和编码器，理解帧率、位深、色度采样、码率与色彩范围。VCB-Studio 基础篇和 iAvoe 的 x264 教程都可作为起点。
2. **走通一小段素材。** 完成片源分析、脚本预览或图形前端配置、编码、封装与播放检查。初次练习先不叠加一长串滤镜。
3. **学会比较。** 从暗部、渐变、运动、细线和颗粒中各选代表片段，在一致的播放条件下比较原片与输出，同时记下体积和耗时。
4. **带着问题查进阶资料。** 看见色带才研究去色带，看见锯齿才研究抗锯齿；需要控制编码失真时，再查率控制、自适应量化和心理视觉参数。
5. **最后组织批量任务。** 单个任务已经能稳定完成，再研究自动生成脚本、分段、异常处理和复检。批量脚本会把同一个设置应用到许多文件，先确认这个设置本身成立。

一次完整练习还要把视频编码之外的环节串起来：确认输入的节目或版本，分别准备视频、音轨和字幕，完成封装，再检查轨道语言、章节、字幕字体以及音画字幕同步。只看到编码器正常结束，还不能说明最终文件已经正确。

每次练习保留源文件信息、软件版本、脚本、完整命令、日志和样片比较结果。以后更新插件或调整参数时，才能分清变化来自素材、处理步骤还是编码器。

## 入门与完整流程

### VCB-Studio 公开教程

**[新版教程网站](https://guides.vcb-s.com/)** · **[VCB-Studio GitHub 组织](https://github.com/vcb-s)**

中文教程，适合作为系统学习的主线。基础篇按顺序讲音视频知识、压制工具链、编码器和 VapourSynth 初级处理；进阶篇涉及更复杂的画面处理、非 BD 载体和专题。当前首页说明进阶篇只公开前两章，阅读时不用把没有公开的后续章节当成链接故障。

网页便于连续阅读；示例脚本、素材、勘误和讨论从对应仓库查找。GitHub 组织还收录工具、整理规范和发布规范，教程与项目源码可以互相对照。

旧清单中的 **[VCB-Studio 旧教程专栏](https://vcb-s.nmm-hd.org/)** 继续保留，本次连接未成功。旧教程中的 Python、VapourSynth 和插件安装方式，应与新版公开教程及项目文档对照。

### FXXS 压制教程

**[FXXS](https://fxxs-encoder.github.io/)**

中文资料，包含基本概念、工具、压制基础、画面对比、HDR 参数、去交错和音轨字幕等内容，也收录翻译整理的进阶指南。适合已经认识基本术语，准备串起片源、脚本、编码与封装的人。

站点序言明确写着教程仍在建设中，并可能存在不准确之处。参数示例和内部规则都带有各自用途，阅读时保留这个前提。旧清单中的 [FXXS 基础教程 Markdown 地址](https://github.com/ted423/FXXS-Encode-Guide/blob/main/%E5%8E%8B%E5%88%B6%E5%9F%BA%E7%A1%80%E6%95%99%E7%A8%8B.md) 本次返回 404，实际阅读使用上面的站点。

### Encode Mystery

**[Encode Mystery](https://guide.geeking.moe/)**

中文指南，以 Windows 下的 VapourSynth 为主要环境，从分析片源、编写第一个脚本、添加滤镜，写到编码、封装和最后检查，还包含色彩、位深、色带、交错和滤镜条目。

首页说明它受到 Fansubbing Guide 启发，目标更偏重视频处理和压制。本次首页显示约六年前更新，所以更适合用来理解流程与概念；环境安装、插件命名和函数参数需要重新核对。

### Fansubbing Guide

**[Fansubbing Guide](https://guide.encode.moe/)**

英文协作指南，面向字幕组工作的各个环节，既有视频编码与画面处理，也有字幕制作、排版等资料。读动画字幕组相关教程时，可以在这里补足压制以外的知识。

首页仍说明项目在建设中，许多主题尚未补齐。它与 Encode Mystery 有内容方向上的联系，两者并非互为完整译本。

### The Encoding Guide

**[The Encoding Guide（旧清单中的 AHD / AVS 教程）](https://encoding-guide.neocities.org/)**

英文指南，按 Tools、Demux、Filtration / Encoding / Muxing 和 Extras 组织，适合对照理解工具准备、分流、过滤、编码与封装之间的关系。首页标注最后更新为 **2025 年 3 月 16 日**。

沿用旧清单的 AHD / AVS 名称便于查找。涉及 AviSynth 的示例要在对应环境中理解，不能直接复制成 VapourSynth 脚本。

## 编码器与滤镜进阶

### iAvoe：x264、x265、AV1 及音频专题

**[教程仓库](https://github.com/iAvoe/x264-x265-QAAC-ffprobe-Ultimatetutorial)** · **[教程索引与更新记录](https://github.com/iAvoe/x264-x265-QAAC-ffprobe-Ultimatetutorial/blob/master/%E6%95%99%E7%A8%8B.md)**

中文长篇教程。仓库中的《教程.md》现在主要负责导读与更新记录，完整内容分为独立网页；本次索引已列出 2026 年的更新记录。

| 入口                                                                   | 主要内容                                                           | 阅读位置                   |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------- |
| [x264 教程](https://iavoe.github.io/x264-web-tutorial/HTML/index.html) | 封装与编码基础、预测、量化、率控制、自适应量化、环路滤镜和色彩信息 | 先读基础部分，再按参数查阅 |
| [x265 教程](https://iavoe.github.io/x265-web-tutorial/HTML/index.html) | HEVC 编码结构、率失真优化、线程控制、VUI / HDR 和参数说明          | 理解 x264 基础之后继续读   |
| [AV1 教程](https://iavoe.github.io/av1-web-tutorial/HTML/index.html)   | AV1 编码过程、SVT-AV1 参数与预设、报错、画质指标和编码测试         | 已掌握编码基础后阅读       |

索引还包含 QAAC、Opus、ffprobe、码率曲线、VMAF、图像序列与去交错 / IVTC 等专题。需要音频或分析工具时，从对应章节进入即可。

作者将这些教程定位为业余分析与参考。长文有助于理解参数，但示例里的结论仍有素材、软件版本和测试条件；尤其不能把不同编码器的同一个 CRF 数字当成相同质量，也不能把一次性能比较推广到所有素材。

### Advanced Encoding Guide 与中文译本

**[Advanced Encoding Guide 英文原版](https://silentaperture.gitlab.io/mdbook-guide/introduction.html)** · **[高级编码指南中文译本](https://suwmlee.github.io/encoding-guide/introduction.html)**

英文原版面向想制作高质量压制的新人与有经验的压制者，中文译本由 suwmlee 仓库维护，译者前言介绍主要贡献者为 Aicha。内容涉及位深、缩放、去色带、颗粒、脏边、遮罩、编码设置和画面对比。

这组资料适合按具体画面问题查阅。原版明确不讲 VapourSynth 的安装配置；中文译本也说明部分章节尚未完成，术语和脚本有疑问时可回看英文原文。译文中“色度分辨率减半”一类表述，还要分清是在说宽高各减半，还是总采样数，避免只凭一句话理解格式。

### 高清视频转码进阶指南

**[typing-more：高清视频转码进阶指南](https://github.com/typing-more/encode_guide/blob/master/%E9%AB%98%E6%B8%85%E8%A7%86%E9%A2%91%E8%BD%AC%E7%A0%81%E8%BF%9B%E9%98%B6%E6%8C%87%E5%8D%97.md)**

Concertos Encode_Guide 的中文翻译整理，与上面的指南有共同项目背景。涵盖工具、分流、VapourSynth、缩放、抖动、去色带、脏线、抗锯齿、降噪、遮罩和编码等内容。

文首已注明并非所有内容都正确，正文还保留未译段落和较早的项目链接。可以用它补充中文术语和处理思路；涉及安装路径、编辑器选择、修改版编码器、脚本接口及计算公式时，回到当前项目文档核对，示例不要整段照搬。

### x264 参数 Wiki 与 Kokomins

- **[x264 参数 Wiki](https://en.wikibooks.org/wiki/MeGUI/x264_Settings)**：英文社区资料，按 MeGUI / x264 设置解释参数。适合辅助查词，但默认值、预设展开结果和可用参数以手头编码器的帮助信息为准。
- **[Kokomins：Anime Encoding Guide for x265 (HEVC) & AAC/OPUS](https://kokomins.wordpress.com/2019/10/10/anime-encoding-guide-for-x265-and-why-to-never-use-flac/)**：英文文章，始于 2019 年，作者明确以 1080p 动画调整参数，讨论 x265、颗粒、微色带与 AAC / Opus。标题中的“不要使用 FLAC”体现其体积与分发取向，不能据此否定无损音频在归档、编辑或其他需求中的用途。

## 旧文、专题与自动化案例

这些文章仍有可读的思路，但年代和依赖是阅读的一部分。

### NAZOrip 新人流程与一键高压缩脚本

- **[组内新人培训（一）：本组工作基本流程](https://www.nazorip.site/archives/7/)**：F@NAZOrip 于 **2017 年 10 月 19 日**发表。可以看到 Python、VapourSynth、VSEdit、插件和编码器如何衔接，以及检查脚本、预览和启动编码的顺序。原文依赖当时组内提供的工具包与脚本，适合读工作流程，环境安装另看现行文档。
- **[迷之压制组一键高压缩脚本说明与下载](https://nazorip.site/archives/46/)**：F@NAZOrip 于 **2018 年 6 月 21 日**发表，标题标注同年 7 月更新。使用 Python、VapourSynth 和定制 x265 串联扫描、章节分段、脚本生成、分 GOP 编码、复检及封装。

后一篇涉及 Python 3.6 和特定 x265 修改版，记录的是当时为高压缩目标设计的自动化方案。按章节或 GOP 调整质量会改变画质分配，不能仅凭整体码率更低判断效果更好；是否接受这种取舍，要回到实际画面对比。今天搭建自动化流程时，可以参考任务组织方式，所附组件和参数另行验证。

### 在 Premiere 中使用 ASS 字幕

**[通过 VapourSynth 在 Premiere 中使用 ASS 字幕](https://akarin.dev/2019/08/03/use-ass-in-premiere/)**

小透明于 **2019 年 8 月 3 日**发表的中文文章。讨论 ASS 字幕进入非线性编辑软件的几条路径：图片序列、带透明度的中间视频，以及通过 VapourSynth、虚拟 AVI 和遮罩组织字幕画面。

适合了解“把字幕渲染成画面”与“直接导入可编辑字幕”之间的区别，也能帮助理解字幕色层与透明度遮罩。文中使用当年的 Premiere 和插件环境，不能由此断言当前版本具有相同限制；avfs、字幕渲染器、透明度处理和宿主软件兼容性需要逐项检查。

### QuickTime Gamma Bug 与历史制式

- **[The QuickTime Gamma Bug](https://vitrolite.wordpress.com/2010/12/31/quicktime_gamma_bug/)**：ssfire 于 **2010 年 12 月 31 日**发表的英文文章，针对当年的 QuickTime 和 After Effects CS5，分别观察编码时的亮度变化与播放时的对比度变化。适合用来提醒自己区分像素已经改变、范围解释错误和播放器显示差异；文中的 gamma 修正值不能当作现代播放器的通用补偿公式。
- **[fnscar：技术文档抢救计划](https://fnscar.blogspot.com/)**：历史文档转载与保存站点，包含 Jukka Aho 的数字视频分辨率、宽高比转换资料。页面转载日期与原文修订日期不同；讨论模拟电视、标清采样和像素宽高比时，保留原作者及制式背景。

## 博客、项目与社区

### NAZOrip 与 NanNan

**[NAZOrip](https://nazorip.site/)** 收录编码器、滤镜、播放、自动化和工具文章。前面的 2017 / 2018 年文章只是其中的旧资料，本次首页也能看到 2026 年的工具与 Opus 专题。查站内文章时看具体发布日期和依赖，不因某篇旧文把整个站点当成停止更新。

**[NanNan's Blog](https://blog.nannan.cool/)** · **[关于页](https://blog.nannan.cool/about/)** 是个人技术与折腾记录，已有收藏继续保留。与本篇直接相关的是 [AV1 编码详解和测试](https://blog.nannan.cool/archives/61/)和 [AV1 编码器使用指南](https://blog.nannan.cool/archives/105/)，分别发表于 **2021 年 10 月 13 日和 18 日**，介绍 AOM-AV1、SVT-AV1 及其使用经验。

这两篇可用于了解 AV1 早期实践，但当时的编码器成熟度、速度、预设和默认值已经带有版本边界。当前选项要查 SVT-AV1 官方文档，性能结论则用自己的素材和当前版本重测。

### 技术论坛与软件目录

- **[Doom9](https://forum.doom9.org/index.php)**：英文音视频技术论坛，常能找到滤镜、帧服务器、编码器和字幕工具的开发讨论。阅读长帖时注意楼层日期、发布版本与后续修复。
- **[VideoHelp](https://www.videohelp.com/)**：英文软件目录、教程和论坛，适合按用途找工具、查版本历史，再回到项目维护者的发布入口。
- **[NMM 论坛](https://www.nmm-hd.org/newbbs/)** · **[NMM Document](https://www.nmm-hd.org/doc/%E9%A6%96%E9%A1%B5)**：旧清单保留的中文视频技术社区与文档入口。本次连接未成功，暂时保留地址，未据此判断站点是否停止维护。

## 查当前用法时回到项目文档

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
