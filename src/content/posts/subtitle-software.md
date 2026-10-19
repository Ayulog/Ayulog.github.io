---
title: 字幕软件清单
description: 从获取、OCR、校对、排版到 SUP 转换，各环节可用的软件、资料与公网字幕入口。
author: Ayulog
pubDatetime: "2026-10-10T10:00:00+08:00"
modDatetime: "2026-10-17T21:00:00+08:00"
draft: false
category: subtitles
tags:
  - Aegisub
  - OCR
---

字幕处理的工具链取决于手头素材与最终封装要求：现成文本字幕（SRT / ASS）可以直接进编辑器校对排版；原盘 PGS（`.sup`）或画面硬字幕需要先做 OCR 提取文本；没有字幕时则用语音识别（ASR）生成初稿。

以下按处理环节整理常用软件、公网字幕站点与参考资料。

## 字幕处理各环节与对应教程

| 环节             | 核心任务                                          | 后续产物与衔接                                     |
| ---------------- | ------------------------------------------------- | -------------------------------------------------- |
| 获取与核对       | 确认影片剪辑版本、语言、帧率与字幕格式            | 从原盘提取 SUP，或下载匹配版本的外挂字幕           |
| 识别与转写       | 区分 PGS 图形轨、画面硬字幕与纯音轨素材           | 图形字幕做 OCR，无字幕音视频做语音转写             |
| 校字、对轴与翻译 | 修正识别错字、对齐时间轴、完成翻译与术语审校      | 产出准确的 SRT / ASS 文本底稿                      |
| 排版与特效       | 设置 ASS 画布、样式表、定位、矢量绘图与卡拉 OK    | 保存可编辑的 ASS 工程及配套字体、图片素材          |
| 导出与封装       | 选择外挂播放、MKV 内封或渲染编码为蓝光 PGS（SUP） | 渲染生成 `.sup` 或封装进容器，在目标播放器回看检查 |

各环节的具体操作见对应教程：

- 完整流程：[字幕处理教程：从来源核对到 ASS 与 SUP](/posts/subtitle-workflow/)
- 识别与机翻辅助：[AI 字幕：图形识别、硬字幕提取与翻译校对](/posts/ai-subtitles/)
- ASS 排版与特效：[基于 Aegisub 的 ASS 特效字幕制作教程](/posts/aegisub-ass-effects/)
- 图形字幕直接修改：[SUP 图形字幕的修改方法](/posts/sup-subtitle-editing/)
- 压制校对用低码率小片：[HandBrake 与 ShanaEncoder：字幕校对用的快速压片教程](/posts/handbrake-shanaencoder-subtitle-proxy/)
- 蓝光分流、混流与菜单重制：[蓝光与媒体工具清单](/posts/media-diy-software/)

## 公网字幕来源

寻找现成外挂字幕时可从以下站点检索。下载后先核对片名、发行版本（Blu-ray / WEB）、帧率与时间轴是否和手头片源一致；保留原始文件与译者署名，在工作副本上修改。

| 站点入口                                                           | 简介与检索特点                                                         |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| [SRTKU](https://srtku.com/)                                        | 常用中文字幕检索站点，提供影视剧 SRT、ASS 等外挂字幕下载。             |
| [SubHD](https://subhd.tv/)                                         | 中文影视字幕分享平台，可按片名、版本说明、语言及用户评论筛选字幕。     |
| [HD.Club 精研視務所](https://www.hd.club.tw/forum.php?forumlist=1) | 华语高清影音论坛，设有专门的字幕交流与发布版块（部分版块需注册登录）。 |
| [OpenSubtitles](https://www.opensubtitles.org/zh)                  | 多语种字幕数据库，适合检索英文等外语原版字幕或冷门片源的多国语言字幕。 |

## 常用软件

### 编辑、校对与排版

| 工具          | 用途与入口                                                                                                                                                                                                                                                                         |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Subtitle Edit | 文本校对、时间轴调整、常规错误修复与格式转换工具；支持对蓝光 SUP / VobSub 做 OCR，也可将基础样式字幕导出为 SUP。[官网](https://www.nikse.dk/subtitleedit) · [GitHub 仓库](https://github.com/SubtitleEdit/subtitleedit) · [官方文档](https://subtitleedit.github.io/subtitleedit/) |
| Aegisub       | 主流 ASS 字幕制作软件，支持结合音频波形精细打轴、管理样式表、编写覆盖标签与卡拉 OK 模板，并提供实时视频预览。[官网](https://aegisub.org/) · [GitHub 仓库](https://github.com/TypesettingTools/Aegisub)                                                                             |

### 从画面提取硬字幕

当视频没有独立字幕轨、文字已经烧录在画面中时，可通过以下工具框选字幕区域并做画面 OCR。提取出的 SRT 仍需结合原片校对错别字与起止时间。

| 工具                                                                                     | 特点与适用场景                                                                                                 |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| [VideOCR](https://github.com/timminator/VideOCR)                                         | 带图形界面的硬字幕提取工具，支持本地 PaddleOCR 引擎与云端 Google Lens 混合识别模式，提供 CPU 与 GPU 运行包。   |
| [SubtitleOCR / 望言 OCR](https://github.com/nhjydywd/SubtitleOCR)                        | 支持 Windows 与 macOS 的视频硬字幕提取工具，区分社区版与专业版，具体批量处理与导出能力见项目说明。             |
| [Video-subtitle-extractor（VSE）](https://github.com/YaoFANGUK/video-subtitle-extractor) | 本地检测视频字幕区域、识别文字并生成带时间轴的 SRT，支持批量处理；路径尽量避免中文与空格。                     |
| [Caption OCR Tool（COCR）](https://github.com/sum1re/caption_ocr_tool)                   | 基于 OpenCV 对字幕画面做颜色过滤与二值化预处理，再交由 Tesseract 识别，或导出处理后的图像供其他 OCR 工具使用。 |
| [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR)                                   | 开源 OCR 算法库，也是多款硬字幕提取软件的底层识别引擎，适合自建识别脚本或查阅模型文档。                        |

### 语音转写与翻译

| 工具                                                                           | 特点与适用场景                                                                                                    |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| [faster-whisper-GUI](https://github.com/CheshireCC/faster-whisper-GUI)         | faster-whisper 与 WhisperX 的图形前端，支持从音视频生成带时间轴的转写字幕，可调节模型与 VAD（语音活动检测）参数。 |
| [VideoCaptioner / 卡卡字幕助手](https://github.com/WEIFENG2333/VideoCaptioner) | 集成语音转写、字幕断句、大模型翻译与字幕合成的桌面工具，支持接入 OpenAI 兼容接口进行批量 SRT 翻译。               |
| [LinguaGacha](https://github.com/neavo/LinguaGacha)                            | 面向长文本与字幕项目的翻译工具，支持 SRT、ASS 等格式，提供术语自动提取、术语表维护与自动审校流程。                |
| [Translate Subtitles](https://translate-subtitles.com/zh-CN)                   | 在线 SRT 字幕翻译与合并工具，适合临时快速处理单份纯文本字幕。                                                     |

### 时间轴同步

| 工具                                                           | 特点与适用场景                                                                                                      |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| [alass-gui](https://github.com/0xclockwise/alass-gui/releases) | ALASS 的图形界面，可利用视频音轨或已同步的参考字幕自动对齐另一份字幕（支持校正固定偏移与广告/片段插播导致的错位）。 |
| [ffsubsync](https://github.com/smacke/ffsubsync)               | 命令行自动化对齐工具，根据音频中的人声活动（VAD）或参考字幕对齐时间轴。                                             |
| [Sushi](https://github.com/tp7/Sushi)                          | 通过对比源版本与目标版本的音轨特征，将匹配源版本的 SRT / ASS 字幕自动重对齐到目标版本（需同时准备两个版本的音轨）。 |

### 蓝光图形字幕

处理蓝光 PGS（`.sup`）图形字幕时，按具体需求选择工具：直接改时间、位置或局部修图见[SUP 图形字幕的修改方法](/posts/sup-subtitle-editing/)；将排版好的 ASS 渲染编码为 SUP 见[字幕处理教程第六步](/posts/subtitle-workflow/#第六步渲染并转回-sup)。

| 工具                                                                                    | 特点与适用场景                                                                                                                          |
| --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| [ass2sup（kidpoleon）](https://github.com/kidpoleon/ass2sup)                            | Windows 终端交互工具（v2.0.0），自动匹配目录中的 ASS 与参考视频并调用内置 Spp2Pgs 输出 SUP，需系统 `PATH` 中包含 `ffprobe`。            |
| [Spp2Pgs](https://github.com/subelf/Spp2Pgs)                                            | 基于 xy-VSSppf / xy-VSFilter 的命令行 ASS 转 SUP 工具（另有第三方图形前端 [spp2pgs-gui](https://github.com/xinnidajiji/spp2pgs-gui)）。 |
| [ass2bdnxml](https://github.com/cubicibo/ass2bdnxml)                                    | 调用 `libass` 将 ASS 与字体渲染为 `BDN XML + PNG` 序列，常与 SUPer 配合完成分步高质量转换。                                             |
| [SUPer](https://github.com/cubicibo/SUPer)                                              | 将 `BDN XML + PNG` 序列编码为符合蓝光规范的 HDMV PGS（`.sup` 或 Scenarist PES + MUI），支持承载淡入淡出、卡拉 OK 等复杂图形事件。       |
| [BDSup2Sub++](https://github.com/amichaelt/BDSup2SubPlusPlus/tree/master)               | BDSup2Sub 的 C++ / Qt 移植版（另有原版 Java 5.1.2），用于图形字幕的延迟调整、坐标移动、分辨率缩放及 XML/PNG 导出与重打包。              |
| [pball's Bluray PGS Subtitle splitter](https://forum.doom9.org/showthread.php?t=172556) | 按指定时间点或帧号切分 `.sup` 字幕的小工具（切分点需避开正在显示的字幕事件）。                                                          |

## 文档、教程与延伸阅读

| 资料                                                                                                              | 主要内容                                                                                                                                                                                                                   |
| ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Aegisub 官方手册：ASS 标签](https://aegisub.org/docs/latest/ass_tags/)                                           | 查阅 ASS 样式覆盖标签、定位、动态变换（`\t`）与矢量绘图（`\p1`）语法；另见[字体收集器](https://aegisub.org/docs/latest/fonts_collector/)与[分辨率和色彩矩阵说明](https://aegisub.org/docs/latest/resolution_and_matrix/)。 |
| [Aegisub Karaoke Effect 481 Templates](https://github.com/Seekladoom/Aegisub-Karaoke-Effect-481-Templates)        | 卡拉 OK 特效模板归档仓库（转载自 `huyhuu.com`），适合拆解学习模板结构与特效代码写法。                                                                                                                                      |
| [青空：使用 Aegisub 套用模板制作双语特效字幕教程](https://air.moe/archives/792)                                   | 介绍卡拉 OK 模板提取、样式名匹配及双语歌词分别套用模板的操作步骤（需提前完成歌词 K 轴切分）。                                                                                                                              |
| [akarin：通过 VapourSynth 在 Premiere 中使用 ASS 字幕](https://akarin.dev/2019/08/03/use-ass-in-premiere/)        | 讨论将 ASS 特效字幕接入非线性编辑软件 Premiere 的几种方案（图片序列、透明中间编码、VapourSynth + 虚拟 AVI 遮罩）。                                                                                                         |
| [himiku：动漫字幕字体处理文章](https://www.himiku.com/archives/my-solution-for-perfect-anime-subtitle-fonts.html) | 介绍使用 AssFonts 等工具收集动漫字幕字体并做字体子集化内嵌的实践思路。                                                                                                                                                     |
| [DIY-zimuzu](https://github.com/zjgwhcn/DIY-zimuzu/tree/master)                                                   | 早期蓝光 DIY 字幕教程归档仓库，包含双语特效制作、avs2bdnxml 与 Scenarist 转 SUP 等 PDF 教程讲义。                                                                                                                          |

## 常见任务选型速查

- **校对现成文本字幕或做 ASS 特效排版**：纯文本校对、调轴与常规修复用 Subtitle Edit；需要设计多样式、双语排版、矢量遮罩或卡拉 OK 特效时用 Aegisub。
- **翻译外语字幕**：需要在保留时间轴的前提下人工精翻，用 Subtitle Edit 的原文对照模式；需要调用大模型批量初译并统一专有名词，用 LinguaGacha 或 VideoCaptioner。
- **提取画面硬字幕**：优先使用 VideOCR 或 VSE 框选字幕区，先截取 1 分钟片段核对漏行与起止时间，再跑完全片。
- **纯音轨生成字幕**：使用 faster-whisper-GUI 或 VideoCaptioner 进行本地语音转写，导出 SRT 后结合原声校正专有名词和断句。
- **跨版本时间轴对齐**：同剪辑版本的平移或简单漂移可在 Subtitle Edit 中批量修正；不同片源存在插播片段或剪辑微调时，用 alass-gui、ffsubsync 或 Sushi 借助音轨自动对齐。
- **ASS 与蓝光 SUP 互转**：SUP 提取文字用 Subtitle Edit OCR；ASS 转回 SUP 可走 ass2sup / Spp2Pgs 直接转换，包含复杂特效时走 `ass2bdnxml + SUPer` 分步渲染编码。
