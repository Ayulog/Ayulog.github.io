---
title: 字幕处理教程：从来源核对到 ASS 与 SUP
description: 从原盘或公网拿到字幕，经 OCR、校对、翻译与 ASS 排版，再渲染回可播放的 SUP。
author: Ayulog
pubDatetime: "2026-10-10T23:30:00+08:00"
modDatetime: "2026-10-11T16:00:00+08:00"
draft: false
category: subtitles
tags:
  - OCR
  - Aegisub
  - 蓝光
---

拿到的字幕可能是蓝光原盘里的 PGS 图形轨，也可能是从字幕站下载的 SRT 或 ASS。处理时不必每次都走完全套流程，先根据手头素材的格式与目标成品决定从哪一步切入。相关软件入口汇总在[字幕软件清单](/posts/subtitle-software/)与[蓝光与媒体工具清单](/posts/media-diy-software/)。

## 流程阶段与切入点

完整的字幕处理依次经过以下阶段：**获取与核对来源 → 图形字幕 OCR → 原文与时间轴校对 → 翻译与审校 → ASS 样式与特效排版 → 渲染并编码为 SUP → 封装与回看**。

实际操作时按需求裁剪步骤：

- **直接保留原盘字幕**：提取 SUP 后直接封装进 MKV 或蓝光结构，无需 OCR。
- **仅调整现有 SUP 的时间、位置、大小或局部图像**：直接按[SUP 图形字幕的修改方法](/posts/sup-subtitle-editing/)在图像层处理。
- **已有 SRT 或 ASS 文本字幕**：跳过 OCR，直接核对文本与时间轴；若原稿是带样式的 ASS，直接在原工程上修改以保留原有排版。
- **语言已匹配且只需普通字幕**：校对完原文和时间轴后即可将 SRT 或基础 ASS 作为成品封装。
- **播放端支持 ASS 渲染**：保留外挂 ASS，或将 ASS 与字体附件一同封装进 MKV。
- **需要蓝光兼容的 PGS 图形字幕**：在文字与时间轴定稿后完成 ASS 排版，再渲染并编码为 `.sup`。

需要翻译和做特效时，遵循“先校对原文与时间轴，再翻译审校，最后制作 ASS 特效与转 SUP”的顺序，避免把早期的识别错字或未定稿译文带入特效层导致返工。同时建议妥善保留原始 SUP、纯文本底稿（SRT）和可编辑的 ASS 工程。

## 常见字幕格式与职责

下文提到的 `.sup` 均指蓝光 **PGS（Presentation Graphic Stream）** 图形字幕。不同格式在流程中的分工如下：

| 格式          | 保存内容                                 | 在流程中的作用                         |
| ------------- | ---------------------------------------- | -------------------------------------- |
| PGS / SUP     | 字幕图像、调色板、画面坐标与起止时间码   | 原盘提取的原始素材，或最终封装的图形轨 |
| SRT           | 纯文本、序号与起止时间，样式能力极少     | OCR 初稿、校对稿、译稿或普通文本成品   |
| ASS           | 文本、时间、样式表、定位、矢量绘图与动画 | 可持续编辑的排版与特效工程文件         |
| BDN XML + PNG | 图像事件的时间轴、坐标及对应的 PNG 序列  | ASS 渲染后、编码为 PGS 前的中间素材    |

SUP 存储的是光栅化后的点阵图像，需要修改文字时必须先做 OCR；OCR 只提取纯文本和时间范围，原图的字体、描边、坐标和双语布局都需要在后续 ASS 阶段重新建立。

此外，ASS 脚本只记录字体名称，**不包含字体文件本身**。分发或渲染 ASS 前需要用字体收集工具打包字体（或作为 MKV 附件封装）；而渲染生成的 SUP 已经把字形固化为图像，播放时不再依赖系统字库，但后续若要改字仍需退回 ASS 工程重新渲染。

## 第一步：获取并核对字幕来源

### 从原盘或 MKV 提取

**输入：已确认版本的原盘节目或 MKV；输出：独立的 `.sup` 字幕文件。**

提取前先通过 BDInfo 或播放器确认正片对应的 MPLS 播放列表和影片版本（剧场版、加长版、导演剪辑版），并区分正片对白、评论音轨字幕与外语强制字幕（Forced）。具体分流与播放列表判别见[蓝光原盘 Remux 教程](/posts/blu-ray-remux/#第二步选择提取路线)。

| 来源类型            | 提取方式                                                             |
| ------------------- | -------------------------------------------------------------------- |
| 未加密的 BDMV 原盘  | 用 DGDemux 或 eac3to / UsEac3To 读取目标 MPLS，勾选对应 PGS 轨道分流 |
| 准备先转为 MKV      | 用 MakeMKV 勾选目标字幕轨生成 MKV，再从中提取                        |
| 已有包含 PGS 的 MKV | 用 MKVToolNix 中的 `mkvextract` 将 `S_HDMV/PGS` 轨道导出为 `.sup`    |

提取出的字幕尽量与目标视频来自同一 MPLS 的同一次分流，防止重复叠加延迟或混入其他分支的时间线。遇到只翻译外语对白或画面文字的强制字幕时，先检查它是独立轨道，还是完整 PGS 轨中部分带有 `forced` 标记的事件，避免把整条完整对白轨误标为强制显示。

### 从公网检索现成字幕

公网字幕可从 [SRTKU][srtku]、[SubHD][subhd]、[HD.Club 精研視務所][hdclub]、[OpenSubtitles][opensubtitles] 等站点检索（详见[字幕软件清单](/posts/subtitle-software/#公网字幕来源)）。下载压缩包后先查看内含的文件格式、版本说明和附带字体：如果拿到的是已经排好版的 ASS，直接基于该 ASS 校对即可，不必先转成 SRT 以免丢失样式与特效标签。

### 核对版本与同步情况

无论字幕来自原盘还是公网，开始编辑前都要核对片名、年份、季集、发行区域、剪辑版本、帧率和总时长，并加载到目标视频中抽查**开头、中段、片尾及分支接缝处**。

如果发现时间轴不匹配，先判断属于哪一类问题：

- **固定偏移**：全片统一提前或延后固定秒数，直接整体平移时间轴。
- **帧率漂移**：开头对齐但越往后偏差越大，常见于 `23.976 fps`、`24 fps` 与 `25 fps` 混用，需按比例转换帧率时基。
- **剪辑差异**：前半段对齐、某个镜头后突然错开，说明片头标识或正片镜头有增删，需要分段对齐或借助音轨同步工具（如 Sushi、ffsubsync）处理。

保留原始下载文件、版本说明与原作者署名，在新建的工作副本上修改。

**阶段产物：** 原始 `.sup` / `.srt` / `.ass` 及版本核对记录。图形字幕进入第二步 OCR；文本字幕直接跳至第三步校对。

## 第二步：OCR 识别图形字幕

**输入：PGS / SUP 图形字幕；输出：UTF-8 编码的 `ocr.srt` 初稿。**

这一步通常使用 [Subtitle Edit][se-ocr]，它支持直接打开 `.sup`、BDN XML 或读取 MKV 内的 PGS 轨进行识别：

1. 打开 `.sup` 文件，浏览右侧预览图和时间范围，确认轨道内容无误。
2. 根据字幕语言选择 OCR 引擎（如 Tesseract、nOCR / Binary Image Compare 或 PaddleOCR）及对应语言数据包与词典。
3. 先试跑包含斜体、标点、双行对白和专有名词的前几十条，检查中文简繁、英文连字符和特殊符号的识别质量，再执行全片识别。
4. 遇到存疑字词时对照右侧原图即时修正，完成后将结果保存为 UTF-8 编码的 `ocr.srt`。

如果视频里没有独立字幕轨、文字已经压进画面，需要改用[字幕软件清单](/posts/subtitle-software/#从画面提取硬字幕)中的 VideOCR 或 VSE 提取硬字幕；若只有音轨没有字幕，则使用 faster-whisper-GUI 等工具先做语音转写。

## 第三步：校对原文与时间轴

**输入：OCR 初稿或公网文本字幕；输出：文字与时间轴准确的 `proofread.srt`（或 `proofread.ass`）。**

在 Subtitle Edit 中同时加载字幕、原片音视频（以及原始 SUP 图像），逐条清理识别错误后再交由后续翻译：

- **易混字符与标点**：重点排查英文 `I / l / 1`、`O / 0`、引号、音乐符号、行首对话短横线，以及中文形近字、人名和地名。使用批量替换或自动拼写检查时需逐项确认上下文。
- **分条与合并**：原盘 PGS 常因为排版位置或连续特效将同一句话拆成多张图，或者把顶部注释与底部对白合成同一张图。文本化后应按自然语意合并碎句、拆分双人对话。
- **时间轴微调**：结合音频波形检查起止时间，修正闪轴、重叠行和停留过短的条目。
- **强制字幕分离**：SRT 无法按单条事件记录 PGS 的 `forced` 标记。若原轨混有少量外语牌匾或强制对白，可将其单独拆分保存或记录行号，方便后续制作时单独赋予样式或导出。

## 第四步：翻译与译后审校

**输入：校对后的原文稿；输出：定稿译文 `translated.srt` / `translated.ass` 及术语表。**

翻译可采用 Subtitle Edit 的[对照翻译模式][se-translation]或[自动翻译接口][se-auto-translate]，也可借助 [LinguaGacha][linguagacha]、VideoCaptioner 等工具调用大模型辅助初译（具体配置见[AI 字幕：图形识别、硬字幕提取与翻译校对](/posts/ai-subtitles/)）。

无论手译还是机翻辅助，建议按四个环节把控质量：

1. **统一术语与称谓**：在开译前确定简繁用字规范，整理角色译名、地名、机构名与核心术语表。
2. **结合语境连贯处理**：对照前后多条字幕及原片画面处理省略主语的短句、代词指代、反问、双关和画面注释，避免逐行机械直译。
3. **核对条目与时间码对应**：检查机翻工具是否擅自合并不相邻的句子、漏译短句或打乱原有序号与时间轴。
4. **调整阅读节奏**：结合画面播放检查每行字数与停留时长，拆分过长译句，确保观众来得及阅读。双语字幕需逐行核对上下两行的语意对应关系。

## 第五步：制作 ASS 样式与特效

**输入：定稿的单语或双语字幕；输出：`styled.ass` 工程及配套字体文件。**

打开 [Aegisub][aegisub]，导入定稿字幕并加载参考视频与音频，按以下顺序建立排版工程（标签语法与进阶写法详见[基于 Aegisub 的 ASS 特效字幕制作教程](/posts/aegisub-ass-effects/)）：

1. **设置脚本分辨率（PlayResX / PlayResY）**：在脚本属性中确认画布尺寸（如 `1920×1080`）。定位标签（`\pos`、`\move`）均以脚本画布为坐标系，开始制作定位特效后不要再中途修改画布尺寸或画面裁切方式。
2. **建立分级样式表**：在样式管理器中为正片对白、双语次行、顶部注释、屏幕招牌和片尾歌词分别建立独立样式，统一字体、字号、描边粗细、阴影、对齐锚点（`\an1`–`\an9`）与边距。
3. **处理避让与特效标签**：结合视频画面调整字幕换行与坐标，避开画面自带文字或人物面部；按需添加淡入淡出（`\fad`）、位移（`\move`）、动态变换（`\t`）或卡拉 OK 音节轴（`\k`）。双语对白、顶部注释与歌词同时出现时，重点检查图层（Layer）遮挡关系与画面可读性。
4. **收集并核验字体**：通过 Aegisub 的[字体收集器][aegisub-fonts]检查全片是否存在缺字（字形回退），并将用到的字体打包保存在工程目录中。同名但不同版本的字体可能存在字宽和基线差异，后续渲染 SUP 时应使用与制作阶段完全一致的字体文件。

## 第六步：渲染并转回 SUP

**输入：定稿的 `styled.ass` 与字体；输出：蓝光兼容的 `final.sup`。**

将 ASS 转为 PGS/SUP 需要先把矢量文字与特效标签渲染为带透明通道的位图，再按蓝光规范做调色板量化和流编码。根据是否需要检查中间图像，可分为**直接转换**与**分步转换**两条路线。

### 路线一：使用直接转换工具

适合常规排版与常见特效，工具在内部自动完成渲染与 PGS 编码：

| 工具                            | 转换方式                                                               | 适用条件与注意事项                                                                                     |
| ------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| [ass2sup（kidpoleon）][ass2sup] | Windows 10/11 x64 终端交互界面，自动匹配同目录的 ASS 与参考视频        | v2.0.0 内置 Spp2Pgs 及所需 DLL，另需环境变量 `PATH` 中有 `ffprobe`；参考视频仅用于读取分辨率与帧率     |
| [Spp2Pgs][spp2pgs]              | 命令行直接读取 ASS 并输出 SUP（另有第三方 [spp2pgs-gui][spp2pgs-gui]） | 基于 xy-VSSppf / xy-VSFilter 渲染；注意旧版路径尽量避免空格，复杂标签需抽样核对渲染效果                |
| [Subtitle Edit][se-file]        | 打开 ASS 后通过导出菜单生成 Blu-ray SUP                                | 图形界面直观，仅支持基础样式与[部分覆盖标签][se-export-tags]，复杂 `\t` 动画、矢量绘图与卡拉 OK 会丢失 |

_注：早期教程常见的 [easySUP][easysup] 停留在 0.5 版且已停止维护（依赖旧版 AviSynth 与 Java），新环境优先选用上表工具。_

### 路线二：ass2bdnxml + SUPer 分步渲染编码

当字幕包含复杂动态特效、需要检查中间 PNG 序列，或希望使用 `libass` 渲染器时，可采用分步路线：

1. **用 [ass2bdnxml（cubicibo 分支）][ass2bdnxml] 渲染图像**：调用 `libass` 将 ASS 与字体渲染为一套 `BDN XML + PNG` 序列。准备交由 SUPer 编码时，按项目说明不要启用前置的 `quantize` 和 `split` 选项，留给编码器统一处理。
2. **用 [SUPer][super] 编码为 PGS**：读取同目录下的 BDN XML 与 PNG，完成调色板量化、缓冲分配并输出 `.sup`。

如果需要走商业蓝光软件 Scenarist BD 的编码管线，可参阅[使用大金 Scenarist BD 制作特效字幕 SUP](/posts/scenarist-bd-effects-sup/)；若只需对已生成的图形字幕做缩放或偏移，可使用 [BDSup2Sub++][bdsup] 辅助处理。

### 转换前必须统一的四项参数

无论走哪条转换路线，导出前都要核对以下四项设置：

- **画布尺寸**：按蓝光规范，即使目标视频是 2160p（4K UHD），PGS 字幕画布依然按 **1920×1080** 渲染输出，播放时由播放器或电视叠加放大。
- **目标帧率**：严格对齐目标视频的实际帧率（如 `24000/1001` 即 `23.976`、`24`、`25`、`29.97`）。ASS 的厘秒时间戳与 BDN/PGS 的帧时间码换算若选错帧率，会导致全片逐渐失步。
- **渲染器兼容性**：Aegisub 默认预览常用 `libass`，而 Spp2Pgs 使用 VSFilter 系组件，两者的字间距、描边叠加和特殊标签解释存在细微差异。全片转换前先截取包含复杂特效的 1 分钟片段试转，对照检查边缘和动画。
- **PGS 硬件解码限制与色彩**：PGS 规范对图像面积、调色板（单色板 256 色）和解码缓冲带宽有严格上限。大面积全屏特效或高频逐帧动画可能触发缓冲溢出，导致 SUPer 为满足合规要求而丢弃部分事件（需留意编码日志中的 dropped events 提示）。此外，将 SDR 字幕叠加到 HDR 视频播放时，注意在实际播放端检查字幕峰值亮度是否刺眼，以及[彩色遮罩与原画色彩的匹配情况][aegisub-resolution]。

## 第七步：封装与成品回看

拿到 `final.sup` 后，按最终交付形式完成混流或封装：

| 交付目标                | 封装工具与要点                                                                                                                                  |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| MKV 视频文件            | 用 MKVToolNix 混流 `.sup`，设置语言代码、轨道名称、Default 与 Forced 标记（见[Remux 教程](/posts/blu-ray-remux/#第四步用-mkvtoolnix-整理成品)） |
| 新建无菜单蓝光结构      | 用 tsMuxeR 等混流工具将视频、音轨与 `.sup` 重新打包为 BDMV 目录或 ISO                                                                           |
| 保留原盘菜单的 DIY 重制 | 替换流文件并同步更新播放列表、Clip 信息与菜单按钮引用（见[章节与蓝光结构教程](/posts/media-chapters/#第四步写入-mkv-或蓝光结构)）               |

封装完成后，用实际播放软件或目标播放机回看检查：

1. **同步与完整性**：抽查片头、中段、片尾及无缝分支接点，确认无整体偏移、帧率漂移或末尾字幕被截断。
2. **位置与遮挡**：检查双语长句、多人对话与顶部注释是否出界、重叠或遮挡关键画面。
3. **动态效果与色彩**：检查淡入淡出、卡拉 OK 走字、半透明描边在调色板量化后是否出现杂边或闪烁，HDR 播放下字幕亮度是否舒适。
4. **清除与跳转**：确认字幕到点正常消失，在特效中途暂停、快进或跳转章节后不会残留旧字幕图块。

## 参考资料

- [MKVToolNix：mkvextract 文档][mkvextract]：`S_HDMV/PGS` 轨道提取说明。
- [Subtitle Edit OCR 文档][se-ocr]、[文件导入导出文档][se-file]、[SRT 格式说明][se-srt]与 [v5.2.0 导出标签实现][se-export-tags]：图形字幕识别与 Blu-ray SUP 导出支持范围（核对版本 [v5.2.0][se-release]）。
- [Subtitle Edit 翻译模式][se-translation]、[自动翻译][se-auto-translate]与 [LinguaGacha][linguagacha]：原文对照、机器初译与术语审校。
- [Aegisub 官网][aegisub]、[ASS 标签手册][aegisub-tags]、[字体收集说明][aegisub-fonts]与[画布及色彩说明][aegisub-resolution]（核对版本 [v3.5.0][aegisub-release]）。
- [ass2sup（kidpoleon）][ass2sup]（[v2.0.0][ass2sup-release]）、[Spp2Pgs][spp2pgs]（[0.9.3.7-delta][spp2pgs-release]）、[spp2pgs-gui][spp2pgs-gui] 与 [easySUP 说明][easysup]（[VideoHelp 归档][easysup-status]）：ASS 直接转 SUP 工具链。
- [ass2bdnxml（cubicibo，v0.7h）][ass2bdnxml]、[SUPer（v0.2.8）][super] 与 [BDSup2Sub++][bdsup]：BDN XML / PNG 渲染、PGS 编码与图形字幕调整。
- 公网字幕站点：[SRTKU][srtku]、[SubHD][subhd]、[HD.Club 精研視務所][hdclub]、[OpenSubtitles][opensubtitles]。

[mkvextract]: https://mkvtoolnix.download/doc/mkvextract.html
[se-ocr]: https://subtitleedit.github.io/subtitleedit/features/ocr.html
[se-file]: https://subtitleedit.github.io/subtitleedit/features/file.html
[se-srt]: https://subtitleedit.github.io/subtitleedit/reference/subrip.html
[se-release]: https://github.com/SubtitleEdit/subtitleedit/releases/tag/v5.2.0
[se-translation]: https://subtitleedit.github.io/subtitleedit/features/empty-translation.html
[se-auto-translate]: https://subtitleedit.github.io/subtitleedit/features/auto-translate.html
[linguagacha]: https://github.com/neavo/LinguaGacha
[aegisub]: https://aegisub.org/
[aegisub-release]: https://github.com/TypesettingTools/Aegisub/releases/tag/v3.5.0
[aegisub-tags]: https://aegisub.org/docs/latest/ass_tags/
[aegisub-fonts]: https://aegisub.org/docs/latest/fonts_collector/
[aegisub-resolution]: https://aegisub.org/docs/latest/resolution_and_matrix/
[ass2sup]: https://github.com/kidpoleon/ass2sup
[ass2sup-release]: https://github.com/kidpoleon/ass2sup/releases/tag/v2.0.0
[spp2pgs]: https://github.com/subelf/Spp2Pgs
[spp2pgs-release]: https://github.com/subelf/Spp2Pgs/releases/tag/0.9.3.7
[spp2pgs-gui]: https://github.com/xinnidajiji/spp2pgs-gui
[easysup]: https://forum.doom9.org/showthread.php?t=149160
[easysup-status]: https://www.videohelp.com/software/easySUP
[se-export-tags]: https://github.com/SubtitleEdit/subtitleedit/blob/v5.2.0/src/libuilogic/Export/ExportTextTags.cs
[ass2bdnxml]: https://github.com/cubicibo/ass2bdnxml
[super]: https://github.com/cubicibo/SUPer
[bdsup]: https://github.com/amichaelt/BDSup2SubPlusPlus
[srtku]: https://srtku.com/
[subhd]: https://subhd.tv/
[hdclub]: https://www.hd.club.tw/forum.php?forumlist=1
[opensubtitles]: https://www.opensubtitles.org/zh
