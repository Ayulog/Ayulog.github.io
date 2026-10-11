---
title: 字幕常用软件与资料
description: 按字幕编辑、硬字幕识别、语音转写、翻译、时间轴同步和蓝光图形字幕整理工具与资料，保留项目入口和适用场景。
author: Ayulog
pubDatetime: "2026-10-10T10:00:00+08:00"
draft: false
mediaCategory: subtitles
mediaRole: overview
tags:
  - 字幕
  - 软件清单
  - Aegisub
  - OCR
---

这里汇总字幕处理会用到的软件、文档和个人文章。先按用途保留入口，具体安装、操作和效果对比，后续分别记录。

流程总览：[字幕的处理](/posts/2026-10-10-subtitle-workflow/)，也是 DIY 系列第五篇。先从原盘或公网获取字幕，再按“图形字幕 OCR → 原文校对 → 翻译与审校 → ASS 特效制作 → 渲染、编码回 SUP”选择工具；已有文本字幕直接进入校对。

## 公网字幕来源

这些是获取候选字幕的入口。下载后先看实际格式、语言、适配版本、作者或译者说明，再与目标影片核对内容和时间轴；SRT、ASS 可直接编辑，图形字幕需要改字时再做 OCR。

| 入口                                                               | 用途与本次核查情况                                                     |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| [SRTKU](https://srtku.com/)                                        | 公网找字幕的候选入口；本次访问出现网站验证页，未进一步核实站内栏目。   |
| [SubHD](https://subhd.tv/)                                         | 字幕分享与交流平台，可检索字幕，结合语言、版本说明及评论选择候选文件。 |
| [HD.Club 精研視務所](https://www.hd.club.tw/forum.php?forumlist=1) | 综合影音论坛，设有字幕讨论版块；本次首页可访问，字幕版块提示需登录。   |
| [OpenSubtitles](https://www.opensubtitles.org/zh)                  | 多语言字幕检索入口；本次访问遇到人机验证，未核实当前下载条件。         |

以上入口核查于 2026 年 10 月 10 日。访问、账号和下载条件以各站当前说明为准；保留来源地址、原始文件与署名，后续修改时使用副本。

## 常用软件

### 编辑、校对与排版

| 工具          | 用途与入口                                                                                                                                                                                                                                                         |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Subtitle Edit | 编辑文本、调整时间轴、检查错误与转换格式，也可对 PGS/SUP 做 OCR，并在支持的样式范围内导出 SUP。[原站入口](https://www.nikse.dk/subtitleedit) · [项目仓库](https://github.com/SubtitleEdit/subtitleedit) · [使用文档](https://subtitleedit.github.io/subtitleedit/) |
| Aegisub       | 制作和修改字幕，结合音频打轴，编辑 ASS 样式与特效，并通过视频预览检查排版。[官网](https://aegisub.org/)                                                                                                                                                            |

### 从画面提取硬字幕

这些工具识别的是已经压进画面的文字。能提取出的字幕轨应先直接导出；画面 OCR 的结果还需要校对文字、断句和时间轴。

| 工具                                                                                     | 用途与区别                                                                                                                  |
| ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| [VideOCR](https://github.com/timminator/VideOCR)                                         | 带图形界面的硬字幕提取工具，可使用本地 PaddleOCR，也提供 Google Lens 混合模式；选择模式时要区分本地识别与云端处理。         |
| [SubtitleOCR / 望言 OCR](https://github.com/nhjydywd/SubtitleOCR)                        | 视频硬字幕提取，提供 Windows、macOS 版本。项目区分社区版与专业版，批量处理、编辑和导出能力以对应版本说明为准。              |
| [Video-subtitle-extractor（VSE）](https://github.com/YaoFANGUK/video-subtitle-extractor) | 在本地检测字幕区域、识别文字并生成 SRT，支持批量处理；需要按视频调整字幕区域。                                              |
| [Caption OCR Tool（COCR）](https://github.com/sum1re/caption_ocr_tool)                   | 使用 OpenCV 处理字幕图像，再通过 Tesseract OCR 识别；提供颜色过滤、二值化等模块，也可导出图像交给其他工具识别。             |
| [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR)                                   | 通用 OCR 工具库，也是部分字幕提取工具使用的识别组件。适合查识别模型或搭建自己的处理流程；视频截帧、去重和打轴仍需配套工具。 |

### 语音转写与翻译

| 工具                                                                           | 用途与区别                                                                                           |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| [faster-whisper-GUI](https://github.com/CheshireCC/faster-whisper-GUI)         | faster-whisper、WhisperX 的图形界面，用音视频中的语音生成字幕或文本，可调整识别和语音活动检测参数。  |
| [VideoCaptioner / 卡卡字幕助手](https://github.com/WEIFENG2333/VideoCaptioner) | 串联语音识别、字幕断句与校正、翻译和视频合成；不同步骤使用的识别引擎、翻译服务和模型接口可分别配置。 |
| [LinguaGacha](https://github.com/neavo/LinguaGacha)                            | 通过本地或在线模型接口翻译字幕等文本，提供术语表与审校流程；译文仍需结合画面和上下文检查。           |
| [Translate Subtitles](https://translate-subtitles.com/zh-CN)                   | 在线字幕翻译入口，页面提供 SRT 翻译与合并功能，适合临时处理已有字幕文本。                            |

### 时间轴同步

| 工具                                                           | 用途与前提                                                                                                                          |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| [alass-gui](https://github.com/0xclockwise/alass-gui/releases) | ALASS 的图形界面，可用视频或已经同步的字幕作参照，调整另一份字幕的时间轴。                                                          |
| [ffsubsync](https://github.com/smacke/ffsubsync)               | 根据音频中的语音活动，或另一份已同步字幕的时间信息，自动对齐字幕。                                                                  |
| [Sushi](https://github.com/tp7/Sushi)                          | 比较两个版本的音轨，将匹配原版本的 SRT / ASS 字幕移轴到目标版本。需要原版和目标版音轨；原仓库列出的源码依赖较旧，准备环境时需核对。 |

### 蓝光图形字幕

PGS / SUP 属于图形字幕。格式转换、缩放或切分不会自动得到可编辑的文本；需要文字时，还要经过 OCR。

ASS 转 SUP 可以用下面的直接转换工具，不必手工处理每份 XML 和 PNG；需要检查中间图像或单独控制编码时，再走 ass2bdnxml + SUPer 的分步路线。两种方式都见[流程总览](/posts/2026-10-10-subtitle-workflow/#第六步渲染并转回-sup)。

| 工具                                                                                    | 用途与前提                                                                                                                                                                                     |
| --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [ass2sup（kidpoleon）](https://github.com/kidpoleon/ass2sup)                            | Windows 终端交互工具，匹配目录中的 ASS 与参考视频，直接输出 SUP。封装 Spp2Pgs 及所需 DLL；仍需可用的 ffprobe 和字体，本次核对 v2.0.0。                                                         |
| [Spp2Pgs](https://github.com/subelf/Spp2Pgs)                                            | 使用 xy-VSSppf / xy-VSFilter 系渲染组件，命令行直接将 ASS 转为 SUP。旧工具，另有 [GUI 前端](https://github.com/xinnidajiji/spp2pgs-gui)；依赖、路径限制与特效兼容性需按所用版本检查。          |
| [ass2bdnxml](https://github.com/cubicibo/ass2bdnxml)                                    | 使用 libass 将 ASS 与字体渲染为 BDN XML 和 PNG，可继续交给 SUPer 编码为 SUP。制作前确认字幕画布、帧率与字体，具体衔接见[流程总览](/posts/2026-10-10-subtitle-workflow/#第六步渲染并转回-sup)。 |
| [SUPer](https://github.com/cubicibo/SUPer)                                              | 把 BDN XML 与 PNG 图像编码为 HDMV PGS 字幕，输出 SUP 等格式，支持承载卡拉 OK、淡入淡出等已渲染的字幕效果。ASS 需先经过相应工具渲染为输入素材。                                                 |
| [BDSup2Sub++](https://github.com/amichaelt/BDSup2SubPlusPlus/tree/master)               | BDSup2Sub 的旧 C++ / Qt 移植版，用于图形字幕格式转换、缩放等处理；不负责 OCR 或 ASS 特效渲染，已有复杂动画的 SUP 不应未经检查就再次转换。                                                      |
| [pball's Bluray PGS Subtitle splitter](https://forum.doom9.org/showthread.php?t=172556) | 按时间或帧范围切分 SUP 字幕的工具。原帖注明不能把同一条正在显示的字幕拆到两个文件中，切点需要检查。                                                                                            |

## 文档、教程与个人文章

| 资料                                                                                                              | 主要内容                                                                                                                                                                                                  |
| ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Aegisub 当前手册：ASS 标签](https://aegisub.org/docs/latest/ass_tags/)                                           | 查询 ASS 特殊字符、样式覆盖、定位、动画与绘画指令。另参照[字体收集](https://aegisub.org/docs/latest/fonts_collector/)和[画布与色彩说明](https://aegisub.org/docs/latest/resolution_and_matrix/)准备渲染。 |
| [Aegisub Karaoke Effect 481 Templates](https://github.com/Seekladoom/Aegisub-Karaoke-Effect-481-Templates)        | 卡拉 OK 特效模板与相关教程入口。仓库说明了转载来源，可用于观察模板结构和效果；引用时保留原模板署名。                                                                                                      |
| [青空：使用 Aegisub 套用模板制作双语特效字幕教程](https://air.moe/archives/792)                                   | 2022 年的教程，讲解模板代码提取、样式匹配、双语分别套用模板和生成特效。需先完成歌词 K 轴分段并对齐音频；不包含基础打轴教程。                                                                              |
| [akarin：通过 VapourSynth 在 Premiere 中使用 ASS 字幕](https://akarin.dev/2019/08/03/use-ass-in-premiere/)        | 记录将 ASS 字幕接入 Premiere 的方法和几种方案的取舍。文章写于 2019 年，涉及的软件和插件兼容性需要结合当前版本核对。                                                                                       |
| [himiku：动漫字幕字体处理文章](https://www.himiku.com/archives/my-solution-for-perfect-anime-subtitle-fonts.html) | 页面摘要说明使用 AssFonts 生成子集化字幕，可作为字体收集与子集化的阅读入口。本次访问遇到站点验证，尚未完整核对正文。                                                                                      |
| [DIY-zimuzu](https://github.com/zjgwhcn/DIY-zimuzu/tree/master)                                                   | 字幕资料归档，包含双语字幕、特效字幕制作、easyavs2bdnxml 转 SUP 等 PDF，以及旧版工具包。先按文档主题查阅，工具下载另查各项目当前入口。                                                                    |

## 按处理目标选择入口

- **已有外挂字幕，需要改字、校对或重新排版**：先看 Subtitle Edit；涉及 ASS 样式、歌词或特效时，再看 Aegisub 和 ASS 标签手册。
- **已有校对好的原文，需要翻译**：可用 Subtitle Edit 对照原文翻译，或用 LinguaGacha 等工具辅助初译，再人工审校术语、原译对应和阅读节奏；定稿后进入 ASS 制作。
- **只有画面上的字幕**：从 OCR 工具中选一个做短片段识别，检查字幕区域、漏行和错字，再处理整段视频。
- **没有字幕，但能听到对白**：从语音转写工具生成初稿，再校对人名、术语、断句和时间轴。语音转写无法还原画面上独立出现的文字。
- **字幕对应另一个版本的视频**：先确认两个版本的剪辑差异；简单对齐可看 alass-gui、ffsubsync，具有两份音轨时可研究 Sushi。
- **制作或处理蓝光图形字幕**：先看[整体流程](/posts/2026-10-10-subtitle-workflow/)。ASS 直接转 SUP 可看 ass2sup / Spp2Pgs，普通排版也可用 Subtitle Edit 导出；需要分步渲染与编码时看 ass2bdnxml + SUPer。格式转换与缩放可用 BDSup2Sub++，SUP 切分看 pball 的工具。
