---
title: 使用大金 Scenarist BD 制作特效字幕 SUP
description: 把 ASS 特效渲染成 BDN XML 与 PNG，经 Scenarist BD 编码、MUX，再用 tsMuxeR 取出独立 SUP 字幕。
author: Ayulog
pubDatetime: "2026-10-11T15:00:00+08:00"
draft: false
category: subtitles
tags:
  - SUP
  - ASS
  - BDN XML
---

在蓝光 DIY 里，“大金”通常指 **Scenarist BD**。ASS 里做的文字、位置和动画要进蓝光，得先渲染成图片，再由 Scenarist 编成 PGS 图形字幕；播放器显示的是这些图形，不再执行 ASS 标签，也不用安装制作时用的字体。

整条路线是 **ASS → BDN XML / PNG → Scenarist BD → SUP**。为了拿到可导入的工程，用一段黑屏视频经 tsMuxeR 和 BD Reauthor 建一个临时蓝光工程；手上已有可用的 Scenarist 工程，可以跳过这段。只改现成 SUP 的时间、位置或大小，另见 [SUP 图形字幕的修改方法](/posts/sup-subtitle-editing/)。

公开资料核对时间为 **2026 年 10 月 11 日**。工程菜单沿用 **Scenarist BD 5.1.3、BD Reauthor 2.1.3、tsMuxeR 2.6.9** 的旧版界面记录，渲染命令按 avs2bdnxml 上游说明补充；这些版本号用于界定操作入口，不是当前安装推荐。本次未运行 Scenarist 转码，也没有进行实体播放机测试。

## 从 ASS 到 SUP 经过哪些文件

```text
ASS + 字体 + 特效所需图片
    ↓ AviSynth / MaskSub 渲染
RGBA 画面
    ↓ avs2bdnxml
BDN XML + PNG
    ↓ Scenarist BD 导入并编码
PES 字幕资产 → 绑定 Clip 的 PG 轨 → Full MUX
    ↓ tsMuxeR 从播放列表 Demux
SUP 图形字幕
```

BDN XML 记录图形显示的时间、位置和文件名，PNG 保存实际画面；PES 是工程中间资产，不能把扩展名改成 `.sup` 当作成品。完整 MUX 后，再从蓝光结构里抽出独立的 PGS/SUP。

这种借助临时蓝光工程重新编码字幕的做法，也常被叫作“过水”。复杂字幕经过一次 MUX 后会不会闪烁，还要放到目标设备上看。

## 准备工具和一小段测试素材

| 工具                        | 在这条路线中的作用                    | 需要确认的地方                                      |
| --------------------------- | ------------------------------------- | --------------------------------------------------- |
| Aegisub                     | 制作 ASS、检查时间与排版              | 字体和特效图片齐全，渲染器支持所用标签              |
| AviSynth 与 VSFilter 系滤镜 | 通过 `MaskSub` 输出带透明度的字幕画面 | 与 avs2bdnxml 进程位数一致，实际 DLL 提供该接口     |
| avs2bdnxml                  | 把 RGBA 画面转换成 BDN XML 和 PNG     | 这里选索引 PNG 输出；不同打包版本先查帮助           |
| tsMuxeR                     | 封装临时蓝光目录，最后提取 SUP        | 旧界面为 2.6.9；原仓库已停止开发，指向 2.7.0 发布页 |
| BD Reauthor 与 Scenarist BD | 生成工程、编码字幕和 MUX              | 授权、版本配套，以及 MUI Generator 的位置           |

Scenarist 官网目前提供订阅与永久许可信息。BD Reauthor 的官方说明要求安装 Scenarist，以便使用随附的 **MUI Generator** 生成工程元数据。旧版驱动和组件是否支持当前 Windows，需要按实际授权版本确认。

先选几十秒的 ASS，包含普通对白、淡入淡出和一段运动效果。第一轮只验证普通对白，确认时间、透明度与导入流程正常后，再加入动态效果。整片直接渲染会产生大量 PNG，出错后很难判断问题在哪一步。

为这次转换记录四项参数：目标字幕画布、视频帧率、时间零点、最后一条字幕的结束时间。ASS 的脚本分辨率可以映射到目标画布，不必机械改成同一组数字；改动 `PlayResX / PlayResY` 后还要检查字号、坐标和缩放。关键是**最终渲染画布、BDN 参数和临时 Clip 相互匹配**。

下面以 **1920×1080、24000/1001 fps（通常显示为 23.976）** 为例。24 fps 和 23.976 fps 不能混用；普通 BD 的这一套设置也不能直接推成 UHD 字幕方案。

## 第一步：把 ASS 渲染成 BDN XML 和 PNG

### 用 MaskSub 生成透明字幕画面

[avs2bdnxml 上游说明][avs2bdnxml]要求输入是输出 RGBA 的 AviSynth 脚本。它不直接读取 ASS；提供 ASS 输入框的 GUI，通常在背后生成了脚本。

以下是根据上游 `MaskSub` 示例整理的短片脚本。将路径替换为自己的工作目录，保存为 `render.avs`：

```text
LoadPlugin("C:\Tools\VSFilter\VSFilter.dll")
MaskSub("C:\SubtitleWork\sample.ass", 1920, 1080, 24000.0 / 1001.0, 1440)
```

`1440` 是输出帧数，这个例子约长 **60.06 秒**，只覆盖 ASS 的前一分钟左右。转换整片时，帧数至少要覆盖最后一条字幕结束，并留出空白尾段；只改画布而忘记改长度，会把后面的字幕截掉。这里的路径是占位示例，DLL 也必须是所用 AviSynth 和转换器能够加载的版本。

样本事件也必须位于这段时间内。从影片中段挑选事件时，在 ASS 副本中把时间移到前一分钟，并记录偏移；配合原片检查时还要还原这项偏移。全片制作回用原时间轴，避免把测试时的平移带进成品。

`MaskSub` 的用途就是生成带 alpha 的字幕画面。不要先把字幕压在一段黑色视频上，再把黑底当成透明；RGB 黑色和透明像素不是一回事。也不要给所有脚本机械添加 `FlipVertical()`：不同滤镜版本有过方向处理差异，应检查实际输出。

`\1img`、`\1vc` 这些扩展要靠 VSFilterMod 系滤镜渲染，用到时确认所选滤镜既支持标签，也提供这条 AviSynth 渲染接口。播放器已经注册了 VSFilterMod，脚本里的 `LoadPlugin` 不会因此自动指向那份 DLL，路径要自己写对。特效制作可接着看 [Aegisub 特效字幕教程](/posts/aegisub-ass-effects/)。

### 用 avs2bdnxml 输出图片和时间轴

先建立 `bdn` 输出目录，在工作目录的命令提示符中运行。以下命令要求 `avs2bdnxml.exe` 可被找到，`render.avs` 位于当前目录：

```bat
avs2bdnxml.exe -t Effects -l zho -v 1080p -f 23.976 -a1 -p1 -b0 -o "bdn\effects.xml" "render.avs"
```

| 参数                 | 这里的用途                                                   |
| -------------------- | ------------------------------------------------------------ |
| `-v 1080p -f 23.976` | 指定输出视频格式和时间码帧率，不会替你修正错误的源时间轴     |
| `-a1`                | 自动裁剪字幕图像，位置由 XML 的 X / Y 保存                   |
| `-p1`                | 输出带透明信息的 8-bit 调色板 PNG，供这条 Scenarist 路线使用 |
| `-b0`                | 关闭为 PG 缓冲优化而进行的多图拆分                           |
| `-l zho`             | 标记中文；这个代码本身不区分简体与繁体                       |
| `-o`                 | 指定 BDN XML 输出文件                                        |

参数按 [koroban 维护的上游说明][avs2bdnxml]记录。手头软件包可能不同，可以先不带参数运行，核对它打印的用法。BDN 作为中间格式可容纳不同 PNG 类型；这里选择索引图，是针对接收软件的兼容性，不是说所有 BDN 工具都只能读 8-bit PNG。

上游明确提醒：启用 `-b` 拆图后，不要再用 BDSupEdit / BDSup2Sub 处理该输出。先保留 `-b0`，需要优化时再针对目标编码器验证，不要把所有优化选项一起打开。

### 导入前检查 XML 和 PNG

保持 XML 与图片的引用关系，整个输出目录一起保留。下面只是一段解释字段的示例，不能单独作为完整 BDN 导入：

```xml
<Event InTC="00:00:10:00" OutTC="00:00:12:00" Forced="False">
  <Graphic Width="720" Height="96" X="600" Y="900">000001.png</Graphic>
</Event>
```

`Width / Height` 必须与实际 PNG 尺寸一致，`X / Y` 是图片左上角在字幕画布中的位置。开启自动裁剪后，图片小于 1920×1080 很正常，不要重新把它拉满画布。`HH:MM:SS:FF` 的末尾是帧号，不是毫秒；时间码换算还要结合 XML 头部的帧率和 DropFrame 信息。

检查透明背景、字体、描边、图片方向，以及动画中间帧。淡入淡出、移动和逐帧换图会变成连续的图形事件；重叠的 ASS 图层应由渲染器合成，不要把几份 BDN 的重叠事件直接拼起来，期待 Scenarist 自动复原图层。

## 第二步：用黑屏视频建立临时工程

已有匹配的 Scenarist Solution，可以直接进入下一步。没有工程时，需要一段 **BD 合规的 AVC/H.264 占位视频**，画布和帧率与字幕一致，时长覆盖字幕结束并留出尾段。这里的黑色视频只是工程载体，与上一节的透明字幕画面是两份素材。

旧流程使用长黑屏 `.264` 文件，长达数小时不是必要条件。做一分钟的测试时，用稍长的合规素材即可；只把普通视频改成 `.264` 扩展名，不会变成可用的蓝光码流。还没有合规视频时，应先按编码器的 Blu-ray 约束准备素材，这属于本流程的输入前提。

### tsMuxeR 封装蓝光目录

1. 打开 tsMuxeR GUI，点 **add** 加入占位视频。
2. 检查识别到的分辨率、帧率和时长，不要为了让菜单一致而强制覆盖真实帧率。
3. Output 选择 **Blu-ray folder**，指定新的输出目录，例如 `work/BlackBD`。
4. 点击 **Start muxing**，完成后确认输出中有 `BDMV` 等蓝光目录。

这是临时工程的封装，没有把字幕压到视频画面上。选择 **Blu-ray folder**，不要误选 ISO 或普通 TS 输出。

### BD Reauthor 生成 Scenarist Solution

在 BD Reauthor 中打开 **Options → Settings**：

1. 在 **Path** 页指定独立的目标目录，例如 `work/reauthor`，避免与输入蓝光目录混在一起。
2. 在 **Scenarist** 页选择随 Scenarist 安装的 **MUIGenerator.exe**，并选择匹配的 Scenarist 工程版本。
3. 确认没有勾选 **Do not generate XML project file for Scenarist**；本步骤需要生成工程，不是只拆出视频。
4. 保存设置，用 **File → Open BD…** 选择上一步的蓝光根目录，即包含 `BDMV` 的那一层。
5. 点击 **Demux all data**，等日志确认拆流完成并已生成 Scenarist 工程。

旧版的工程结构中可见 `solution/solution.ssol`，项目目录下还有视频、元数据和编码资产，文件名可能和这里列出的不同。MUI Generator 用于生成 Scenarist 所需元数据，路径应指向安装目录中的真实程序，不需要复制一个同名文件来代替。

BD Reauthor 官方说明的输入范围是未加密蓝光。此处自己封装的临时目录满足这个前提；普通 MKV 不能直接替代蓝光目录交给这一入口。

## 第三步：在大金中编码字幕并加入 PG 轨

### 加载工程

在 Scenarist BD 中选择 **File → Load Solution…**，打开生成的 `.ssol`。然后在 **SolutionExplorer** 展开项目，找到版本节点；旧版示例的名称是 `00.00.0000`，右键选择 **Load Project**。

只打开 Solution 时 Project 还没有加载。如果 DataTree、StreamTree 中看不到后续所需资产，先检查这一步，而不是反复导入 XML。

### 导入 BDN 并保存 PES

1. 在 **DataTree** 的 **Data** 根节点上右键，选择 **Import… → BDN file…**。
2. 选择 `effects.xml`。旧版随后出现 **Acquisition Point Interval** 对话框，再进行事件分析和编码。
3. 在 **Save ES File** 中保存生成的 `.pes`。旧工程通常放在项目版本目录的 `Encode` 下；使用容易识别的新文件名，例如 `effects.pes`。
4. 等待成功提示并检查日志。缺图、图像格式、事件时间或编码缓冲错误都应先处理。

Acquisition Point Interval 属于编码和随机访问设置，按该版本帮助及工程要求处理；它不是字幕延迟，也不是影片帧率。旧记录中的数值不能当作适用于所有动画的优化参数。

**检查真正加入工程的资产。** 旧版操作记录采用先保存 PES、移除刚导入的临时字幕资源，再把生成的 `.pes` 重新拖入 DataTree 的方式。这里移除的是工程中的那一项，不是删除磁盘上的 PES。若所用版本已经建立正确的 PES 资产，先确认它的来源和属性，再决定是否需要重新导入。

### 绑定到 Clip

选中新字幕资产，在 **Property** 核对 **Video Size、Video Frame Rate、Video Drop**，并设置 **Language Code**。中文可用 `zho`，简繁体和双语用途另由轨道命名、项目记录说明。

然后切换 **StreamTree**，双击目标 Clip，把新字幕资产拖到 **PG** 轨位置。单段黑屏工程可能只有 `Clip#0`，实际影片则不一定；不要照着编号把字幕放到错误的片段。

如果替换已有字幕，明确替换的是哪条 PG 轨。多条字幕轨可以共存，播放时只显示选中的一条；需要移除的是不再使用或绑定错误的资源。复用影片工程时，还涉及播放列表的字幕轨引用，见 [蓝光 DIY](/posts/blu-ray-diy/)。

### 执行 Full MUX

保存工程，打开工具栏 **MUX…**。旧版对话框中，**Selected Contents** 选择目标光盘，示例为 **Disc only**；**MUX Processing Type** 选择 **Full MUX**，再点击 **MUX Start**。

先读日志，不要把所有警告一律忽略。`PlayListMark is not an I-Picture` 指向章节标记与视频 I 帧的关系，需要检查章节点；字幕时间、图像编码、缓冲或资产缺失则是另一类问题。临时工程的目的虽只是取得字幕，也要确认本次字幕编码和 MUX 完整结束。

旧版示例的目录层级如下，实际根路径由 **Disc Root Path** 等工程设置决定：

```text
Output/
  MUX/
    BDROM/
      DB/
        BDMV/
          PLAYLIST/
          STREAM/
          CLIPINF/
```

这里 **DB 才是包含 BDMV 的蓝光根目录**。重新打开或复制结果时，应保持这一层以下的目录关系，不要只取走 PLAYLIST。

## 第四步：从播放列表提取 SUP

再次打开 tsMuxeR：

1. 加入生成目录中的 `BDMV/PLAYLIST/*.mpls`。单段测试工程里可能是 `00000.mpls`。
2. 在轨道列表里只勾选目标 **PGS**，取消视频及其他轨道，核对语言、时长和延迟。
3. Output 选择 **Demux**，指定新的成品目录。
4. 点击 **Start demuxing**。旧示例的输出名为 `00000.track_4608.sup`，实际轨道编号可以不同。

`.mpls` 是播放列表，`.clpi` 是 Clip 信息，二者不能互换。若列表里没有 PGS，回查该 Clip 是否绑定了字幕、本次 MUX 是否成功，以及现在打开的是不是新的输出目录。

黑屏视频不会进入这份独立 SUP。检查后可以给成品起一个有意义的名字，工程和 XML / PNG 仍应保留，方便回改。

## 第五步：用实际视频检查特效

先把 SUP 加载到目标视频中播放；需要验证内封行为时，用 MKVToolNix 封装成测试 MKV，再明确选择这条 PGS 字幕。它是可开关的字幕轨，不是烧录进画面的视频。

| 检查内容         | 具体观察                                                           |
| ---------------- | ------------------------------------------------------------------ |
| 字体、位置和颜色 | 与所选 ASS 渲染器的结果相比，有没有缺字、出界、错色、黑底或白边    |
| 淡入淡出和移动   | 开始、中间、结束是否完整，有没有漏帧、闪烁或突然停住               |
| 时间同步         | 开头、中间、片尾是否都对齐，最后一条是否被工程时长截断             |
| 随机跳转         | 在效果中途暂停、拖动或跳章节，恢复后是否残留旧字幕                 |
| 目标设备         | 电脑播放器与实际电视、播放机各查一遍，预览窗口说明不了电视上的效果 |

固定相差半秒，先查时间零点、整体偏移和封装延迟；从头到尾逐渐漂移，才进一步核对播放速度和帧率比例。片中某处突然错位，还要排查剪辑版本。不要靠反复切换 23.976 / 24 来猜。

PGS 的颜色量化、图像解码速率与缓冲都会限制动态效果。逐帧更新整幅画面、同时显示大量粒子或复杂渐变，更容易遇到体积和兼容性问题。处理时回到源 ASS，减小活动区域、减少不必要的变化，再检查输出日志和实际片段；改一个帧率标签，动画帧数并没有减少。

可以用 BDSup2Sub 辅助看图像和时间，但它的[已知限制][bdsup-issues]包括动画和调色板效果。不要把复杂成品在其中重新另存后的结果，当作未经改变的 Scenarist 输出；验证动态效果时，直接播放原始 SUP。

## 不经过大金的路线

[avs2bdnxml][avs2bdnxml]本身支持直接输出 SUP：保持其他参数，给 `-o` 使用 `.sup` 扩展名即可。另一种做法是把 BDN XML / PNG 交给 [SUPer][super] 编码。只为得到独立 SUP 时，这些路线可以省去临时蓝光工程；已经在做 Scenarist 蓝光工程时，则可继续使用其中的字幕编码流程。

编码器不同，调色板、事件组织、forced 标记和具体设备表现也可能不同，仍应使用同一段测试素材比较。缺失字体或不支持的 ASS 标签必须先在渲染阶段解决，换一个后端编码器不能补回未渲染出来的效果。

## 参考资料

- [Scenarist 官方网站][scenarist]：Scenarist BD 的产品定位与许可方式。
- [DVDLogic：BD Reauthor][bd-reauthor]与[原厂 2.0 手册存档][bd-manual]：Scenarist 工程生成和 MUI Generator；手册是旧版本资料。
- [avs2bdnxml README][avs2bdnxml]：RGBA 输入、MaskSub 示例、BDN / SUP 输出和拆图限制。
- [xy-VSFilter 的 AviSynth 接口说明][xy-vsfilter]：MaskSub 与不同版本的渲染差异。
- [ass2bdnxml README][ass2bdnxml]：工具维护者对 Scenarist BD 图像量化要求的说明。
- [tsMuxeR 官方项目][tsmuxer]与 [2.7.0 发布页][tsmuxer-release]：蓝光封装、工具状态和发行信息。
- [BDSup2Sub 已知限制][bdsup-issues]、[SUPer 项目][super]与 [MKVToolNix 文档][mkvmerge]：成品检查及其他编码、封装路线。

[scenarist]: https://www.scenarist.com/
[bd-reauthor]: https://dvd-logic.com/bd_reauthor
[bd-manual]: https://archive.org/details/bdreauthor-pro-2
[avs2bdnxml]: https://github.com/koroban/avs2bdnxml/blob/master/README.md
[xy-vsfilter]: https://github.com/pinterf/xy-VSFilter/blob/xy_sub_filter_rc5/README.md
[ass2bdnxml]: https://github.com/cubicibo/ass2bdnxml
[tsmuxer]: https://github.com/justdan96/tsMuxer
[tsmuxer-release]: https://github.com/justdan96/tsMuxer/releases/tag/2.7.0
[bdsup-issues]: https://github.com/mjuhasz/BDSup2Sub/wiki/Known-Issues
[super]: https://github.com/cubicibo/SUPer
[mkvmerge]: https://mkvtoolnix.download/doc/mkvmerge.html
