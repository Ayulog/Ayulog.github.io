---
title: 字幕软件清单
description: 从 OCR、校对、ASS 排版到 SUP 制作的工具与资料。
author: Ayulog
pubDatetime: "2026-10-10T10:00:00+08:00"
modDatetime: "2026-10-11T16:00:00+08:00"
draft: false
category: subtitles
tags:
  - 字幕
  - 软件清单
  - Aegisub
  - OCR
---

字幕处理先看手里的素材，再确定成品：已有文本可以直接校对，图形字幕需要改字时才做 OCR；最后根据播放或蓝光制作要求，保留 SRT、ASS，或渲染为 SUP。下面是各环节用到的软件和资料，具体操作放在对应文章里。

## 目录

- [处理流程](#处理流程)
- [相关文章](#相关文章)
- [公网字幕来源](#公网字幕来源)
- [常用软件](#常用软件)
- [文档、教程与个人文章](#文档教程与个人文章)
- [按处理目标选择入口](#按处理目标选择入口)

## 处理流程

| 环节             | 先确定什么                                       | 后续产物或操作                                       |
| ---------------- | ------------------------------------------------ | ---------------------------------------------------- |
| 获取与核对       | 影片版本、语言、来源与格式                       | 保留原稿；从原盘提取，或取得匹配版本的外挂字幕       |
| 识别与整理       | 已有文本、PGS 图形字幕、画面硬字幕，还是只有音频 | 文本直接校对；其他素材按需 OCR 或语音转写            |
| 校字、对轴与翻译 | 内容是否完整、时间轴是否一致、是否需要译文       | 得到校对过的文字稿；翻译后再审校术语和分条           |
| 排版与特效       | 字幕画布、字体、样式和目标渲染器                 | 保存可编辑的 ASS 工程与所需字体、图片                |
| 导出与回看       | 外挂播放、MKV 封装，还是蓝光 PGS 字幕            | 保留文本或渲染成 SUP，检查开头、中段、结尾和特效段落 |

完整的文字字幕制作流程见[字幕处理教程：从来源核对到 ASS 与 SUP](/posts/subtitle-workflow/)。只改已有 SUP 的时间、位置或图像时，可直接进入图形字幕修改教程。

## 相关文章

### 识别、校对与制作

- [字幕处理教程：从来源核对到 ASS 与 SUP](/posts/subtitle-workflow/)：沿着一份字幕稿完成来源核对、OCR、校对、翻译、ASS 排版和 SUP 导出。
- [AI 字幕：图形识别、硬字幕提取与翻译校对](/posts/ai-subtitles/)：按素材选择识别路线，再用 VideoCaptioner、LinguaGacha 等工具辅助翻译并人工审校。
- [基于 Aegisub 的 ASS 特效字幕制作教程](/posts/aegisub-ass-effects/)：建立样式，使用覆盖标签、矢量绘图、卡拉 OK 和 PNG 挂图。

### 图形字幕与播放

- [SUP 图形字幕的修改方法](/posts/sup-subtitle-editing/)：直接调整现有 SUP，或导出 BDN XML / PNG 修改后重新编码。
- [使用大金 Scenarist BD 制作特效字幕 SUP](/posts/scenarist-bd-effects-sup/)：把已渲染的字幕图像加入 Scenarist BD 工程，再提取 SUP 并验收。
- [PotPlayer 和 MPC-HC 挂载 VSFilterMod 加载外挂特效字幕](/posts/vsfiltermod-external-subtitles/)：注册滤镜，配置播放器，检查扩展标签、PNG 和高位深视频的兼容性。

校对视频需要缩小体积时，接[字幕校对用的快速压片教程](/posts/handbrake-shanaencoder-subtitle-proxy/)；字幕定稿后的蓝光混流与菜单处理见 [蓝光与媒体工具清单](/posts/media-diy-software/)。

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

已有 SUP 需要调整时间、位置、大小，或局部修改图像，见[SUP 图形字幕的修改方法](/posts/sup-subtitle-editing/)，包括 BDSup2Sub 直接编辑与 BDN XML / PNG 修改后重新编码两条路线。

ASS 转 SUP 可以用下面的直接转换工具，不必手工处理每份 XML 和 PNG；需要检查中间图像或单独控制编码时，再走 ass2bdnxml + SUPer 的分步路线。两种方式都见[流程总览](/posts/subtitle-workflow/#第六步渲染并转回-sup)。

| 工具                                                                                    | 用途与前提                                                                                                                                                                                     |
| --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [ass2sup（kidpoleon）](https://github.com/kidpoleon/ass2sup)                            | Windows 终端交互工具，匹配目录中的 ASS 与参考视频，直接输出 SUP。封装 Spp2Pgs 及所需 DLL；仍需可用的 ffprobe 和字体，本次核对 v2.0.0。                                                         |
| [Spp2Pgs](https://github.com/subelf/Spp2Pgs)                                            | 使用 xy-VSSppf / xy-VSFilter 系渲染组件，命令行直接将 ASS 转为 SUP。旧工具，另有 [GUI 前端](https://github.com/xinnidajiji/spp2pgs-gui)；依赖、路径限制与特效兼容性需按所用版本检查。          |
| [ass2bdnxml](https://github.com/cubicibo/ass2bdnxml)                                    | 使用 libass 将 ASS 与字体渲染为 BDN XML 和 PNG，可继续交给 SUPer 编码为 SUP。制作前确认字幕画布、帧率与字体，具体衔接见[流程总览](/posts/subtitle-workflow/#第六步渲染并转回-sup)。 |
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
- **制作或处理蓝光图形字幕**：先看[整体流程](/posts/subtitle-workflow/)。ASS 直接转 SUP 可看 ass2sup / Spp2Pgs，普通排版也可用 Subtitle Edit 导出；需要分步渲染与编码时看 ass2bdnxml + SUPer。格式转换与缩放可用 BDSup2Sub++，SUP 切分看 pball 的工具。
