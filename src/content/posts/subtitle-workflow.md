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

手上是一张蓝光原盘，或一份从公网下到的外挂字幕；无论哪一种，最终都要变成能封装、能播放的成品。中间要走的步骤取决于素材：原盘里可能只有 PGS 图形字幕，公网拿到的 SRT、ASS 则可以直接进入校对。

整套步骤按获取、OCR、校对、翻译、排版和转 SUP 的顺序排开，每一步写明输入、输出与检查点。工具入口沿用[字幕软件清单](/posts/subtitle-software/)与 [蓝光与媒体工具清单](/posts/media-diy-software/)；公开资料核对到 **2026 年 10 月 10 日**。

## 一张字幕稿要走过的步骤

```text
获取字幕：原盘提取 / 公网获取
    ↓ 核对来源、版本与格式
图形字幕 → OCR → 文字初稿
文本字幕 → 直接保留文字稿
    ↓ 校对原文与时间轴
校对稿（SRT / ASS）
    ↓ 翻译 + 译后审校
译稿（单语 / 双语）
    ↓ 排版、定位、分层和特效制作
styled.ass + 所用字体
    ↓ 渲染为字幕图像，再编码为 PGS
final.sup
    ↓ 封装进 MKV 或蓝光结构，回看检查
播放成品
```

这条线不是每次都要走完：

- **只想保留原盘字幕**：提取 SUP 后直接封装即可，不需要 OCR。
- **已有 SUP，只改时间、位置、大小或少量图像**：见[SUP 图形字幕的修改方法](/posts/sup-subtitle-editing/)，可以保留图像直接处理。
- **已有 SRT 或 ASS 文本字幕**：跳过 OCR，先校对内容与时间轴；已有 ASS 样式也一并保留。
- **已经是所需语言**：校对后可以跳过翻译；只需要普通文本字幕时，SRT 就可以作为成品。
- **播放器能正确渲染 ASS**：可以使用外挂 ASS，或把 ASS 与所需字体封装进 MKV。
- **目标需要 PGS 图形字幕**：再把排版好的字幕渲染、编码为 SUP。

校对先修正原文和时间轴，翻译再处理目标语言，特效制作则在文字基本定稿后进行。翻译完成仍需审校译文，避免把原文中的 OCR 错字或译文错误固化到特效中。

最后的 SUP 是重新制作的图形字幕：OCR 把文字从图片里识别出来，排版与特效又生成新的图片；原件和可编辑工程都应分别保留。

## SUP、SRT、ASS 各保存哪些信息

这里的 `.sup` 指蓝光 **PGS（Presentation Graphic Stream）** 字幕，不把所有同名扩展的旧字幕格式混为一谈。

| 格式          | 主要保存什么                           | 在流程中的作用                        |
| ------------- | -------------------------------------- | ------------------------------------- |
| PGS / SUP     | 字幕图像、调色板、位置与显示时间等信息 | 原盘提取结果，或最终图形字幕          |
| SRT           | 文字、分条和起止时间，样式能力有限     | 公网获取或 OCR 后的校对稿、译稿与成品 |
| ASS           | 文字、时间、样式、定位、绘图与动画标签 | 可以继续编辑的排版和特效工程          |
| BDN XML + PNG | 图像事件的时间与位置，以及实际字幕图片 | ASS 渲染后、PGS 编码前的中间素材      |

SUP 里的字本来就是图片，没有一份原始文本等着“另存为 SRT”。OCR 不会自动恢复字体、描边、位置、双语样式或原制作工程。SRT 改成 `.ass` 后缀也不会生成特效；需要由编辑器导入并建立样式。

ASS 通常只引用字体名称，**字体文件并不在脚本里**。字体收集、安装或作为 MKV 附件保存，是另外一步。SUP 在渲染后已把字形做进图像，播放时不再依赖同一套字体，但也没法像 ASS 那样直接改字。

## 第一步：获取并核对字幕来源

字幕的入口不只蓝光原盘。可以提取已有媒体文件中的字幕，也可以在公网检索现成的原文、译文或双语字幕；先确认拿到的内容和格式，再决定是否需要 OCR。

### 从原盘或 MKV 提取

**输入是正确的原盘节目，输出是一份独立 PGS/SUP。** 先确定 MPLS 和影片版本，再选对应字幕；文件最大或语言标记相同，仍可能选到别的版本、评论字幕或强制字幕。

从原盘或 MKV 提取时，可以选以下路线：

| 已有来源           | 提取路线                                                                 |
| ------------------ | ------------------------------------------------------------------------ |
| 可读取的 BDMV 原盘 | 用 DGDemux 或 eac3to / UsEac3To 处理已确认的 MPLS，选择目标 PGS 轨道分流 |
| 准备先保存为 MKV   | 用 MakeMKV 保留目标字幕，生成 MKV 后再提取                               |
| 已有带 PGS 的 MKV  | 用 MKVToolNix 的 mkvextract 导出目标字幕轨为 SUP                         |

[mkvextract 手册][mkvextract]明确说明，Matroska 中的 `S_HDMV/PGS` 会提取为 SUP。它负责把已有轨道取出来，不负责把图片识别成文字。分流、播放列表和编号的具体区别见[Remux 教程](/posts/blu-ray-remux/#第二步选择提取路线)。

字幕与视频尽量来自同一 MPLS 的同次处理结果，避免重复套用延迟或混入另一版本的时间线。

如果原盘有只翻译外语对白、画面文字的强制字幕，先确认它是独立轨道，还是完整 PGS 中的部分事件带有 forced 标记。条数少只是线索，判断依据是事件上的 forced 标记；也不要把整条完整字幕一律设为强制。

### 从公网获取

可以从 [SRTKU][srtku]、[SubHD][subhd]、[HD.Club 精研視務所][hdclub]、[OpenSubtitles][opensubtitles]等入口查找。它们也收录在[字幕软件与资料目录](/posts/subtitle-software/#公网字幕来源)中；HD.Club 是影音论坛，具体内容需按版块和帖子查找。部分站点或版块有访问验证、登录等条件，以当前页面说明为准。

取得文件后先看实际格式：SRT、ASS 是文本字幕；SUP 等图形字幕需要编辑文字时才做 OCR；压缩包则先查看里面有哪些字幕、说明和字体。**公网是获取渠道，不是一种字幕格式。** 已有 ASS 不必为了套流程先转成 SRT，否则会丢掉原有样式与特效信息。

### 原盘与公网来源都要核对版本

核对片名、年份、季集、语言、发行版、剪辑版本、帧率和时长，再播放开头、中段、片尾与分支连接处检查。字幕标注适配 Blu-ray、WEB 或某个版本，只是筛选线索；片名相同，也仍要播放核对。

固定偏移、逐渐漂移和中途剪辑差异需要不同处理。使用目录中的时间轴工具前，先判断问题属于哪一种；整体平移不能解决另一剪辑版本多出或少掉的片段。

保留下载页地址、版本说明、原作者或译者署名，以及原始文件；继续修改时使用工作副本，遵循来源标注的使用要求。站点能检索到某条字幕，翻译质量、完整性和同步仍要自己核对。

**阶段产物：** 原始 SUP / SRT / ASS、对应来源与版本记录。图形字幕进入 OCR；文本字幕直接进入原文和时间轴校对。

## 第二步：OCR 得到文字初稿

**输入是图形字幕，输出是尚待校对的文字初稿。** 这一步主要使用 [Subtitle Edit][se-ocr]。它可读取蓝光 SUP，也支持从 MKV 中的 PGS 或 BDN XML 等来源进行 OCR；已经提取成 SUP，便于保留原件与复查。

大致过程是：

1. 打开 SUP，确认读取的是目标字幕，查看原图和时间范围。
2. 按语言与字形选择 OCR 引擎、语言数据和识别设置。当前文档列有 Tesseract、nOCR / Binary、Paddle OCR 等路线，实际可用组件按安装版本确认。
3. 先识别一小段，检查中文简繁、英文斜体、标点、双语行和特殊字，再处理整条字幕。
4. 保留识别中不确定的字和待确认项目，保存为 UTF-8 编码的 SRT 初稿。

OCR 与语音识别是两件事。这里读的是已有字幕图片，不需要把电影对白重新转写一遍。没有字幕轨、文字已经压进画面的情况，才转向目录中的硬字幕 OCR 工具；连画面字幕都没有时，语音转写又是另一条流程。

**阶段产物：** `ocr.srt`。它是供下一步校对的初稿，不能把“识别完成”当成“字幕已经正确”。

## 第三步：校对原文与时间轴

**输入是 OCR 初稿或公网取得的文本字幕，输出是内容和时间轴可靠的校对稿。** 用 Subtitle Edit 对照原字幕图像、视频与音频检查，不要把识别错误直接交给翻译工具。

校对重点包括形近字、`I / l / 1`、`O / 0`、人名、标点、漏行和重复条目。还要结合上下文确认说话人、句子是否完整、分条是否合理；自动拼写检查和批量替换后的结果仍需复核。对于公网文本字幕，没有原图时则结合原声、画面和可靠的对应版本检查。

原 SUP 已有显示时间，OCR 一般沿用读取到的事件时间，但不会每条都刚好合适。连续图片、重叠字幕、画面注释和多区域字幕可能需要合并、拆分或调整；转换前后的条数不必相同。

SRT 无法完整承接 PGS 的定位和逐条 forced 语义。需要保留强制字幕用途时，可另存专用字幕并记录用途；导出后再检查，而不是假定所有标记会自动传递。

**阶段产物：** `proofread.srt`，或保留已有样式的 `proofread.ass`。先稳定原文、分条和时间轴，再进入翻译；已有目标语言字幕也应完成这一步。

## 第四步：翻译与译后审校

**输入是校对后的原文，输出是审校后的目标语言字幕。** 先确定做单语还是双语，再统一人名、地名、称谓和术语；结合画面、原声和上下文处理语气、指代、双关与画面文字。

Subtitle Edit 可建立[原文对照的翻译稿][se-translation]，保留时间与行序，把译文另存为新文件；它的[自动翻译功能][se-auto-translate]也可用于辅助初译。已有目录中的 [LinguaGacha][linguagacha]支持 SRT、ASS 和术语表，可辅助翻译与审校。更多入口见[语音转写与翻译工具目录](/posts/subtitle-software/#语音转写与翻译)，具体配置留到翻译专题。

这些工具生成的结果仍需人工确认：术语自动提取、自动审校和双语合并完成后，都要对照原文与音画检查。

这一阶段按下面的顺序处理：

1. **确定语言与术语**：明确目标语言、简繁和称谓习惯，整理人名与专有词表。
2. **结合上下文翻译**：不要孤立地逐行替换单词；原文的一句话可能跨越多条字幕。
3. **检查原译对应**：核对漏译、重复、错配、否定与数字等细节，确认工具没有打乱时间码和条目关系。
4. **审校译文与阅读节奏**：检查表达是否自然、长度是否来得及读，必要时调整分条和时间，再回放核对。

双语字幕要保留校对后的原文与译文对应关系，之后在 ASS 中分别设置样式；条数相同，还要逐条核对对应关系。翻译引起的合并或拆分，也应同步检查两种语言的时间关系。

已有满意的目标语言字幕时可以跳过翻译，但仍需检查文本和时间轴。简繁转换也不能替代翻译与审校，尤其要核对专名、地区用语和语境。

**阶段产物：** `translated.srt` 或 `translated.ass`，以及需要保留的原文稿和术语记录。文字基本定稿后再进入特效制作，减少改一句译文就返工大量特效事件的情况。

## 第五步：制作 ASS 样式与特效

**输入是已经校对、完成翻译与审校的文字和时间轴，输出是 ASS 工程及其字体。** 主要使用 [Aegisub][aegisub]；不需要特效的普通字幕，也可以只做好基础排版。

把定稿的 SRT 导入 Aegisub，或直接打开已有 ASS，加载对应视频与音频后，先完成基础设置：

1. 确认脚本分辨率、画面宽高比与坐标关系，再开始摆位置。脚本分辨率是坐标系统，不必与视频像素尺寸完全相同；不要在做好复杂定位后，随意改脚本画布或裁切预览画面。
2. 为对白、双语、注释、招牌或歌词建立不同样式，统一字体、字号、描边、阴影、对齐和边距。
3. 调整换行、位置与重叠关系，避开人物、原画文字或已有字幕。
4. 按需要增加淡入淡出、移动、变换或卡拉 OK 效果，并结合画面逐段检查。

ASS 标签可以控制位置与动画，例如 `\pos`、`\move`、`\fad`、`\t`、`\k`；语法与制作方法另文展开。卡拉 OK 还需要对应到歌词音节的时间信息，一句 SRT 的起止时间不足以得到准确 K 轴。

特效模板和自动化脚本可以提高效率，但使用后仍需看生成结果。两行对白、注释和歌词同时出现时，层级、遮挡、可读性与实际播放负担都要检查。

用 Aegisub 的字体收集功能检查所用字体和缺字情况，并保存需要的字体。即使名称相同，不同版本的字体也可能造成宽度、换行和位置变化；交给下一步渲染时，应使用与制作阶段一致的字体资源。

**阶段产物：** `styled.ass`、所需字体，以及用于复核的对应视频信息。SRT 保留作纯文本底稿，ASS 作为继续修改排版和特效的工程。

## 第六步：渲染并转回 SUP

**输入是排版好的 ASS，输出是新的 PGS/SUP，可以使用直接转换工具完成。** 不必每次都手工导出、管理 BDN XML 和 PNG。工具内部仍会把文字和标签渲染成图像，再编码为字幕流；这不会把字幕烧进电影画面，原视频也无需因此重新压制。

### 直接转换：ASS 输入，SUP 输出

```text
定稿的 ASS + 所用字体
    ↓ 直接转换工具（渲染与编码在内部完成）
SUP
```

本次核实到的直接转换工具如下：

| 工具                            | 直接转换方式                                                      | 使用前提与范围                                                                                   |
| ------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| [ass2sup（kidpoleon）][ass2sup] | Windows 10/11 x64 终端交互界面，匹配目录中的 ASS 与视频后输出 SUP | v2.0.0 封装了 Spp2Pgs 及所需 DLL，另需 PATH 中可用的 ffprobe；核对视频匹配、字体、帧率与输出画布 |
| [Spp2Pgs][spp2pgs]              | 命令行直接读取 ASS、输出 SUP                                      | 使用 xy-VSSppf / xy-VSFilter 系字幕渲染组件；属于旧工具，复杂特效需按实际 DLL 与输出结果检查     |
| [Subtitle Edit][se-file]        | 打开 ASS，再导出 Blu-ray SUP                                      | 图形界面方便，适合它支持的样式和标签；不能假定复杂动画与卡拉 OK 完整保留                         |

如果在 Windows 上希望把步骤串起来，可以先看 **kidpoleon 的 ass2sup**。它提供的是终端中的交互界面，内部调用 Spp2Pgs；参考视频用于取得尺寸、帧率等信息，不会重新编码这份视频。字体仍需准备好，自动匹配到的视频也要确认是当前字幕对应的版本。

Spp2Pgs 另有 [spp2pgs-gui][spp2pgs-gui] 图形前端，按其说明需放入 Spp2Pgs 目录，并留意路径不能含空格等旧限制。也能在老教程中看到 [easySUP][easysup]：它可接收 ASS/SSA/SRT 并生成 SUP，但[版本资料][easysup-status]仍停留在 0.5，并标为停止开发；它依赖 AviSynth、Java 等旧环境，不能把旧安装包当作当前维护方案。

**直接转换不会保留所有 ASS 特效。** Spp2Pgs 使用的渲染组件与 libass 有差别；Subtitle Edit 的 SUP 导出只支持列出的 ASS 标签子集，虽包含部分定位、字体、颜色和淡入淡出，`\t` 动画、绘图或卡拉 OK 仍可能出错。先转换包含复杂效果的一小段，再对照原 ASS 检查。

### 分步转换：ass2bdnxml 与 SUPer

如果需要检查中间字幕图像，或分别控制渲染和 PGS 编码，再采用下面的分步路线。它是另一种选择，不是 ASS 转 SUP 的必经操作：

```text
Aegisub 保存的 ASS + 字体
    ↓ ass2bdnxml：用 libass 渲染
BDN XML + PNG 图像
    ↓ SUPer：编码为 HDMV PGS
SUP
```

[cubicibo 的 ass2bdnxml][ass2bdnxml]负责把 ASS 渲染为 BDN XML 与 PNG；[SUPer][super]再把这些图像事件编码为 PGS。**SUPer 本身不读取 ASS，也不做 OCR。** BDN XML 中记录的时间与位置、引用的 PNG 应作为一组保存，编码时一起交给 SUPer。

按当前 ass2bdnxml README，准备交给 SUPer 的输入时，不使用前置的 `quantize` 和 `split` 处理，让 SUPer 完成自己的图像量化与编码组织。具体环境、参数和批量流程留到单独教程中展开。

[BDSup2Sub++][bdsup]适合在图形字幕之间转换、缩放和检查等环节使用，可以作为辅助工具；它不能替代 SRT 校对，也不能凭空恢复 ASS 工程。

### 导出前要统一的条件

无论选择哪条路线，都先确认以下条件：

- **画布与坐标**：ASS 的脚本坐标、渲染尺寸和目标字幕画布应正确对应。按 ass2bdnxml 的说明，UHD 蓝光字幕仍按 1080p 渲染，由播放器放大；2160p 图像输出不属于蓝光合规输出，即使影片是 4K，也仍按 1080p 画布导出。
- **帧率与时间**：按目标视频核对 `24000/1001`、`24` 等实际帧率。SRT 的毫秒时间、ASS 时间和 BDN 的帧时间需要正确对应，不能混用 23.976、24 或 25。
- **字体与渲染器**：Aegisub 预览与最终渲染采用的字体、libass / VSFilter 等实现可能不同，复杂标签和边缘效果要看最终图像。
- **颜色与透明度**：描边、渐变、半透明和淡入淡出经过调色板量化后可能变化；放到 HDR 视频上，还要在实际播放链路中检查字幕亮度和颜色。

PGS 有图像、调色板、缓冲与解码方面的限制。大量逐帧动画、复杂叠层或大面积效果不一定能原样落到目标设备上；SUPer 可能为满足流规范而丢弃部分事件，编码日志里的事件数量要与预期比较。先做包含复杂效果的短片段，检查结果与编码日志，再处理全片。

[Aegisub 的画布与色彩说明][aegisub-resolution]还区分了 HDR 使用条件：普通对白可以显示，但彩色遮罩等效果不能假定在不同播放器中都能精确匹配 HDR 画面。转换工具的色彩矩阵选项也不会自动完成字幕亮度适配。

**阶段产物：** `final.sup` 与转换记录；采用分步路线时再保留 BDN XML、PNG。最终 SUP 中只有渲染结果，今后改字或调整样式仍应回到 ASS 工程。

## 第七步：封装与回看

先把最终 SUP 重新打开预览，再封装到实际观看的文件中。输出文件生成成功，或者 OCR 后文字没有错，都还要做图形字幕检查。

| 输出目标               | 后续做什么                                                                       |
| ---------------------- | -------------------------------------------------------------------------------- |
| MKV                    | 用 MKVToolNix 加入 SUP，设置语言、轨道名、默认与强制标记；保留需要的原字幕作对照 |
| 新建蓝光结构           | 用支持 PGS 的混流工具，例如 tsMuxer，按目标蓝光格式重新组织轨道                  |
| 保留现有原盘菜单的重制 | 另外处理播放列表、轨道引用和菜单关系，不能把 SUP 复制进目录就算完成              |

MKV 的处理接[Remux 教程](/posts/blu-ray-remux/#第四步用-mkvtoolnix-整理成品)；蓝光结构与旧重制工具的边界见[章节教程](/posts/media-chapters/#第四步写入-mkv-或蓝光结构)。输出字幕和修改视频是不同操作，只为加入 SUP 时无需烧录字幕或重新压制画面。

回看时至少覆盖以下内容：

1. **文字与时间**：开头、中间、片尾及分支接缝，是否错字、漏译、原译错配、提前消失或逐渐失步。
2. **位置与可读性**：双语、招牌、长句与多人对白，是否出界、遮挡或重叠。
3. **效果与颜色**：淡入淡出、歌词、透明度、渐变是否与预期一致；HDR 播放时是否过亮或变色。
4. **字幕清除与跳转**：字幕到点是否消失，暂停、快进、章节跳转后是否残留或丢失。
5. **轨道选择**：语言、默认和强制显示行为是否符合用途，在实际播放器上确认。

复杂 ASS 可能由一个事件渲染出多幅图片，PGS 编码又可能重组图像事件，所以 SUP 条数或大小不足以判断效果完整。应对照同一段画面、同一时间点检查。

## 参考资料

- [MKVToolNix：mkvextract][mkvextract]：PGS 轨道提取为 SUP 的格式说明。
- [Subtitle Edit OCR 文档][se-ocr]、[文件导入导出文档][se-file]与 [SRT 格式说明][se-srt]：图形字幕识别、SUP 导出及格式边界。本次核对稳定版 [5.2.0][se-release]。
- [Subtitle Edit 翻译稿][se-translation]、[自动翻译][se-auto-translate]与 [LinguaGacha][linguagacha]：原文对照、辅助初译和术语处理。
- [Aegisub 官网][aegisub]、[ASS 标签手册][aegisub-tags]、[字体收集说明][aegisub-fonts]、[画布与色彩说明][aegisub-resolution]及 [3.5.0 更新记录][aegisub-release]：字幕编辑、排版、字体与当前版本入口。
- [ass2sup（kidpoleon）][ass2sup]与 [v2.0.0 发布页][ass2sup-release]：Windows 终端交互式 ASS 到 SUP 转换，本次核对说明与源码。
- [Spp2Pgs][spp2pgs]、[可选 GUI][spp2pgs-gui]及 [easySUP 开发者说明][easysup]：直接转换与旧工具链的依赖。Spp2Pgs 最新列出的 [0.9.3.7-delta][spp2pgs-release] 是预发布版本；easySUP 已停止开发。
- [Subtitle Edit 5.2.0 导出标签处理][se-export-tags]：SUP 图片导出所支持的 ASS 标签子集，不能与完整 ASS 渲染混同。
- [ass2bdnxml 项目][ass2bdnxml]：ASS 到 BDN XML / PNG 的 libass 渲染路线，本次核对 v0.7h。
- [SUPer 项目][super]：BDN XML / PNG 到 PGS 编码及相关限制，本次核对 v0.2.8。
- [BDSup2Sub++ 项目][bdsup]：图形字幕转换与缩放工具。
- 公网字幕入口：[SRTKU][srtku]、[SubHD][subhd]、[HD.Club 论坛][hdclub]、[OpenSubtitles][opensubtitles]；具体字幕仍需核对版本、内容与时间轴。

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
