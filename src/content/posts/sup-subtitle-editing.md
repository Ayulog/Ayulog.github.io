---
title: SUP 图形字幕的修改方法
description: 保留现有 SUP 字幕图像，调整时间、位置、大小与 forced 标记；需要局部修图或补入字幕时，导出 BDN XML 和 PNG 后修改，再编码回 SUP。
author: Ayulog
pubDatetime: "2026-10-11T12:00:00+08:00"
modDatetime: "2026-10-11T16:00:00+08:00"
draft: true
category: subtitles
tags:
  - 字幕
  - SUP
  - BDSup2Sub
  - BDN XML
  - SUPer
---

拿到一条 SUP，可能只是想让对白往上挪一点、延后半秒，或者修正其中一幅字幕图。这些修改不必全部从 OCR 开始。先分清要改的是**显示时间、图像位置，还是图片里的文字**，再选处理方法。

本文的 SUP 指蓝光 **PGS（Presentation Graphic Stream）**，不包含使用相同扩展名的 DVD 字幕格式。软件入口见[字幕软件清单](/posts/subtitle-software/)；需要重新识别、翻译和制作 ASS 时，接[字幕的处理](/posts/subtitle-workflow/)。

公开文档核对于 **2026 年 10 月 11 日**。下面的 BDSup2Sub 菜单按 Java 版 5.1.2 的官方说明记录；BDSup2Sub++ 是另一套 C++ / Qt 移植实现，界面与限制不能完全混用。以下操作按公开文档与源码整理，未进行软件实机测试。

## 先选修改路线

SUP 保存的是字幕图像、调色板、位置和时间等信息。它没有可直接选择的字体名称，也没有一份随时能改字的原文。

| 要改什么                         | 处理路线                         | 需要注意                             |
| -------------------------------- | -------------------------------- | ------------------------------------ |
| 全片统一提前或延后               | BDSup2Sub 的 Delay               | 适用于固定偏移；不能解决中途增删镜头 |
| 逐渐失步，且确认来自播放速度差   | 转换源、目标帧率对应的时间轴     | 先核对版本，不能看到失步就改帧率     |
| 白字整体上移、下移或单条挪位置   | BDSup2Sub，或修改 BDN XML 的坐标 | 区分对白与跟随画面的注释             |
| 字幕图像太大或太小               | 缩放图像，必要时同时转换画布     | 会重采样，不等于换字号               |
| 排除整条字幕事件、修改 forced    | BDSup2Sub 的单条编辑             | 一个事件可能包含多处文字或连续效果   |
| 局部修图、替换或补入少量字幕     | SUP → BDN XML + PNG → 修改 → SUP | 同时维护图片、坐标和时间             |
| 大量改字、改字体、翻译或重做双语 | OCR / 原有文本稿 → ASS → SUP     | 原图样式不会由 OCR 自动还原          |

如果只是看电影时临时调延迟，可以先用播放器确认偏移量；确定要保存为新文件后，再修改字幕或封装时间。封装时已经加过延迟，就不要又在 SUP 中重复加一次。

## 修改前保留原件

先取得独立的 PGS/SUP。从 MKV 提取时，MKVToolNix 的 `mkvextract` 会把 `S_HDMV/PGS` 轨道导出为 SUP；从原盘选择 MPLS、分流的过程见[蓝光原盘 Remux](/posts/blu-ray-remux/#第二步选择提取路线)。

为工作副本记录以下信息：

- 对应影片版本、剪辑、时长与实际帧率；字幕是否已经带有提取时的时间修正。
- 字幕自身的画布尺寸、起止范围、是否含强制字幕与复杂动画。
- 准备修改的时间段，以及开头、中段、片尾几个同步参照点。

保留 `original.sup`，修改结果另存为 `edited.sup`。需要拆图时，XML 和 PNG 放在同一份工作目录里，原始导出另留一份。保留原作者、译者及制作信息；修正内容时也保留能回查的修改记录。

**先做一小段。** 最好选到双行对白、顶部注释和淡入淡出各一例。若原始效果在导入时就已经变成静止图片，后面的重编码不能把丢掉的动画补回来。

## 方法一：直接调整现有 SUP

[BDSup2Sub][bdsup]可以读写图形字幕，调整时间、位置、大小与单条属性，不进行文字识别。它是旧工具，使用前应从项目入口核对下载与运行要求；Java 版需要 Java 运行环境。

### 打开字幕与设置输出

1. 用 **File → Load** 打开工作副本，先看源字幕预览是否完整。
2. 在转换设置中核对输入、输出帧率和画布；只是移动位置时，不要顺手改变分辨率或启用帧率转换。
3. 主窗口的 **Output Format** 选择蓝光 **SUP(BD)**，不要选成 DVD SUP 或 SUB/IDX。
4. 完成修改后，用 **File → Save/Export** 另存，再重新打开输出文件检查。

转换设置可从 **Settings → Conversion Settings** 进入。即使没有启用帧率比例转换，输出时间仍可能对齐到目标帧率的帧边界；因此“只是另存一次”也不能承诺字节或时间戳完全不变。

### 整体提前或延后

在转换设置的 **Delay** 中输入带正负号的毫秒数。例如字幕比声音早半秒，需要晚一点出现，就加 `500` 毫秒；字幕晚半秒，则使用 `-500` 毫秒。

先在几个相隔较远的位置比对：

| 现象                             | 判断方向                     |
| -------------------------------- | ---------------------------- |
| 开头、中间、结尾都差不多早半秒   | 整体平移通常合适             |
| 开头基本对齐，越往后差得越多     | 核对帧率、播放速度与时间比例 |
| 前面正常，某个镜头后突然固定错开 | 优先查剪辑、片头或分支差异   |

负延迟会影响靠近零点的字幕，必须检查开头是否被截掉或排除。不要只在中段找一句对白对齐，就认定整条字幕已经正确。

**Change frame rate** 用于按源、目标帧率改变时间比例。这里修正的是已确认的速度差，不是给文件换一个显示标签。例如源字幕对应 25 fps 加速版、目标确为同剪辑的 24 fps 版时，才考虑相应转换；不同剪辑版本需要分段处理。

### 调整位置

全局位置调整的入口是 **Edit → Move all captions**；只处理当前一条时使用 **Edit → Edit Frame**，修改 **X Offset / Y Offset**。这里的单条坐标指图形左上角的位置。

Java 版的全局移动主要是相对画面边界定位：横向可居中或靠左右，纵向可移入、移出按宽高比划定的画面区域。窗口里的 Offset 并不都是“给原坐标加减这个数”；若只想把选定对白统一上移 60 像素，下面的 XML 路线更直观。BDSup2Sub++ 1.0.2 另有相对原 X / Y 位置移动的选项，使用时先确认版本。

位置修改有两个常见目标：对白放进画面，或移入黑边。黑边必须存在于实际视频画布内；如果压制版已经裁掉上下黑边，不能把字幕移到画布外，期待播放器替你生成一块显示区域。

整条字幕可能同时包含底部对白、顶部注释、招牌与歌词。全局移动会影响这些位置关系，尤其不能把所有图片一律居中、贴底。只有对白需要上移时，逐条处理，或使用下一节的 XML 路线按事件筛选。

### 调整大小

转换设置中的 **Apply free scaling** 可缩放字幕图像，等比例调整时让 **Scale X / Scale Y** 使用相同的值，例如 `0.9` 表示缩到 90%。改变输出分辨率则涉及字幕画布的转换。两者要分开理解：

- 画布仍是 1920×1080，只想把字稍微缩小：调整图像缩放，并重新检查边距与位置。
- 目标视频从 1080p 缩到 720p：核对画布和图像是否一起按预期换算。
- 视频另做了裁切：还要处理坐标偏移，不能只看横向分辨率比例。

图形字幕没有可直接修改的字号。缩放会重采样现有像素，放大不能恢复原本没有的字形细节；反复缩小再放大，还会让描边和细笔画变差。尽量从原始 SUP 一次生成目标版本。

### 排除事件与 forced 标记

在 **Edit Frame** 中可以查看单条图像，修改 **Start Time / End Time / Duration**、位置，并设置 **Exclude from Export** 或 **Forced Caption**。输入时间会对齐目标帧率，并可能为避免与相邻条目重叠而自动修正，改完要重新核对。

每条修改后点 **Save Changes** 保存并继续，或点 **OK** 保存并关闭。普通的 Prev / Next 导航不会替你保存当前修改；不要一路切到下一条，最后才发现前面没有生效。

**Exclude from Export** 是让该事件不进入导出结果，不是在一幅图里擦掉某一行字。只需去掉图中独立的一块区域时，编辑窗口也提供矩形选择后的 **Erase**，将该区域变透明；它不能还原被擦掉或原本被遮挡的字形。

例如同一幅 PNG 里同时有对白和注释，排除这一条会一起去掉两部分；若一段效果由连续多条组成，只排除其中一条还可能造成闪烁。先确定图像与时间范围，再决定排除整条还是局部修图。

PGS 事件中的 forced 与 MKV 容器里的“强制显示轨道”是两个层级。只保留 forced 事件、把全部事件设为 forced，以及给 MKV 整轨打强制标记，结果都不相同。转换设置里的 **Force All** 可保持、设置或清除所有事件的标记；导出时检查 **Export only forced**，避免意外只留下少量字幕。

## 方法二：导出 BDN XML 和 PNG 后修改

需要准确改坐标、修一幅图，或补入少量字幕时，可以把 SUP 导出为 **BDN XML + PNG**。XML 记录事件的时间、图片路径与位置，PNG 保存实际图像；改完再编码成新的 SUP。

```text
original.sup
    ↓ BDSup2Sub 导出 XML / PNG
work/subtitles.xml + PNG 图片
    ↓ 修改事件、位置或图片
work/edited.xml + 修改后的 PNG
    ↓ BDSup2Sub 或 SUPer 编码
edited.sup
```

在 BDSup2Sub 中选择 **XML/PNG** 输出，再用 **Save/Export** 保存。先导出一个未修改的版本并比较显示效果，确认原图和关键时间已被正确读取。官方已知问题明确列出淡入淡出、调色板与图像动画等限制；这不是完整保存原 PGS 编码结构与特效的无损往返。

### 读懂一个事件

下面是一个用于解释字段的 **24 fps 示例片段**，不是可以独立导入的完整 BDN 文件。实际操作应在工具导出的 XML 中修改，并保留它的头部与格式信息。

```xml
<Event InTC="00:01:20:00" OutTC="00:01:23:00" Forced="False">
  <Graphic Width="1000" Height="80" X="460" Y="900">dialogue-0001.png</Graphic>
</Event>
```

| 字段                 | 含义                         |
| -------------------- | ---------------------------- |
| `InTC` / `OutTC`     | 事件开始与结束的帧时间码     |
| `Forced`             | 此事件是否标记为强制显示     |
| `Graphic` 中的文件名 | 该事件引用的 PNG             |
| `Width` / `Height`   | 图像宽、高，需与实际图片一致 |
| `X` / `Y`            | 图像左上角在字幕画布内的位置 |

`HH:MM:SS:FF` 最后的 `FF` 是帧数，不是毫秒。上例在 24 fps 下显示于 1 分 20 秒至 1 分 23 秒；`00:01:20:12` 才表示该秒内再过 12 帧，即半秒。不要把这个例子直接套到 `23.976`、`29.97` 或其他时基，实际换算应依据 XML 头部的帧率与时间码规则。

### 只改对白的位置

假设字幕画布是 1920×1080，上例图片宽 1000、高 80：`X="460"` 使它水平居中，`Y="900"` 表示顶边距画布顶部 900 像素。改成 `Y="840"`，整幅图便上移 60 像素。

核对边界时可以用：

```text
0 ≤ X，X + 图像宽度 ≤ 画布宽度
0 ≤ Y，Y + 图像高度 ≤ 画布高度
```

只有确认一组事件全是同类对白时，才批量修改它们的 Y。不要全文件替换某个坐标数字，也不要直接把所有 Y 写成同一个值：双行、单行和顶部注释的图片高度与原定位不同。

如果同一事件包含多个 `Graphic`，应检查它们是否共同组成一条字幕。移动整体时保留各图之间的相对位置；导入工具对多图事件的支持也要事先核实。

### 删去、替换与补入

**删去一个事件**，是在副本里移除完整的 `<Event>…</Event>`，不是只删掉 PNG 文件。删完检查 XML 头部的事件总数、首尾时间等汇总信息是否仍与正文一致；不要留下引用不存在图片的事件。

**局部修改图片**，可用支持 PNG 透明度的图像编辑器打开对应文件，修改后保留透明背景。若保持原尺寸，XML 坐标通常无需改变；若裁切、扩大或换了尺寸，还要同步更新 Width、Height 和位置。

同一图片可能被多个事件引用。只想改其中一次显示时，先另存为新文件名，再仅修改目标事件的引用，避免其他时间段一起变化。放大检查边缘的半透明抗锯齿、描边和阴影，不能把透明背景保存成一块黑底或白底。

**补入一条字幕**，需要准备 PNG，再增加包含文件名、尺寸、坐标、起止时间和 forced 属性的事件。新事件按时间排列，并更新汇总字段。若原时间段已有对白，先处理重叠关系；不能只把另一份 XML 的 Event 粘进来，就假定两组字幕会自动正确合成。

这条路线适合少量图像修正。需要大规模改字或重新排版时，逐图修补往往更费工夫，也难以统一字体与字距。

### 编码回 SUP

普通静态字幕可以直接回到 BDSup2Sub：用 **File → Load** 打开修改后的 **XML 文件**，查看图像、时间与位置，再选择 **SUP(BD)**，另存为 `edited.sup`。不需要把 PNG 一张张单独导入。

BDSup2Sub 导出的 PNG 是带透明信息的 8-bit 调色板图；导入修改后的图像时仍有量化到 256 色的限制。保留原尺寸和透明背景能减少额外调整，但颜色与边缘仍应检查。

另一条路线是用 **SUPer** 编码，下面按本次核对的 **v0.2.8** 说明。

[SUPer][super]读取 Sony BDN XML 与 PNG，输出 SUP，也提供专业制作软件使用的 PES + MUI。它负责图形编码，不做 OCR，也不直接读取 ASS。

按官方 GUI 说明：

1. 选择工作目录中的 BDN XML，PNG 与 XML 保持在同一目录，并确认文件名引用有效。
2. 选择新的输出文件名，扩展名用 `.sup`。
3. 确认图像量化与编码设置，再点击 **Make it SUPer**。
4. 查看随 GUI 打开的命令行窗口，检查进度、错误及丢弃事件等报告。
5. 把结果重新打开，与原字幕和修改目标对照。

SUPer v0.2.8 对这份中间素材还有几项具体限制：

- **不同 Event 的时间不能重叠**，每条须满足开始早于结束。两处文字需要同时显示时，应先按时间边界重新组织为同一事件中的图像；同一 Event 可有多个 Graphic，但该版本要求各图块矩形不相交。
- **图片尺寸必须与 XML 一致**，只改 Width / Height 不会替你缩放 PNG。它接受调色板 PNG，也建议使用 32-bit RGBA；把原有 8-bit 图转为 RGBA 并不能恢复已经损失的颜色。
- **不能依赖它保留 forced 标记**。v0.2.8 虽读取 XML 的 Forced 字段，编码路径却将相应图形标记写为 False。需要保留原轨强制事件时，优先选能维护该标记的路线，并在成品中复核，不能用 MKV 整轨强制标记代替。
- 按该版发布说明，**Anchor Interval 保持 `0.0`**，避开已列出的已知问题。

PNG 的具体要求取决于接收工具。不要把旧制作软件“必须使用索引图”的要求套给所有路线；也不要为图方便把有透明度的 PNG 转为 JPEG。SUPer 有自己的量化步骤，颜色、渐变和透明边缘仍需比较输出结果。

PGS 的解码带宽和缓冲有限，SUPer 可能为了满足流约束丢弃部分事件。日志里的 dropped events 需要回看对应片段；生成文件不代表每幅图片都以原来的节奏显示。

## 要修改文字、字体或双语排版时

先找是否有原始 SRT / ASS 工程。有工程便回到工程修改；只有 SUP 时，再用 [Subtitle Edit OCR][se-ocr]识别文本，校对后重新排版。

基本路线是：

```text
SUP → OCR → 校对文字与时间 → 修改 SRT / ASS → 渲染、编码为新 SUP
```

少量普通对白可以用 Subtitle Edit 导出 Blu-ray SUP；复杂 ASS 标签、动画和卡拉 OK 则要核对渲染器与导出支持范围。完整的选择与操作顺序见[字幕流程篇](/posts/subtitle-workflow/#第六步渲染并转回-sup)。

OCR 后的文本不会继承原图的字形、描边与布局。改为同样的文字也不代表外观相同；SUP→SRT→SUP 是重新制作，不能称为无损修改。

## 旧的蓝光制作工具路线

在蓝光重制工作中，还会遇到 **BD Reauthor Pro + Scenarist BD**。[BD Reauthor Pro 官方说明][bd-reauthor]列出对未加密蓝光的分析、PG 字幕等素材提取和 Scenarist 工程生成；[Scenarist BD][scenarist]则是专业蓝光制作系统。这与直接编辑一份 SUP 的工作量不同。

如果已经在维护 Scenarist 工程，可以沿用该工程的字幕资产流程，并按所用版本检查输入格式、调色板与编码选项。只是改位置或延迟时，不必先把 SUP 和一段黑色视频混流成蓝光目录，再经过完整的重制流程。

不同编码器的输出可能在具体设备上表现不同，应该用播放检查确定是否适用。不能据此推导成“改时间轴只能用 Scenarist”，也不能反过来保证 BDSup2Sub 处理的所有复杂字幕都兼容。菜单、播放列表与原盘结构的修改另见[章节的处理](/posts/media-chapters/#第四步写入-mkv-或蓝光结构)。

## 导出后的检查

先重开 SUP，再封装到实际观看的文件里。检查时至少覆盖这些情况：

| 检查点                     | 具体看什么                                         |
| -------------------------- | -------------------------------------------------- |
| 开头、中段、片尾与剪辑接点 | 时间偏移是否一致，有没有逐渐漂移或突然失步         |
| 单行、双行、顶部注释       | 字幕是否出界，边距与相对位置是否正确               |
| 修改过的图像               | 有没有黑底、白边、错色、描边损坏或意外影响其他事件 |
| 连续效果与淡入淡出         | 是否漏帧、闪烁、提前消失或停留不退                 |
| 暂停、快进与章节跳转       | 字幕是否残留、缺失，恢复播放后能否正常更新         |
| 强制显示行为               | PGS 事件标记、导出过滤与 MKV 轨道标记是否符合用途  |

MKV 可用 MKVToolNix 重新封装，语言、轨道名、默认与强制标记分别设置。只有字幕变化时，无需重新压制视频。需要蓝光结构或实体播放机使用，则继续在目标播放链路上验证；电脑播放器显示正常，不能代替这一项。

最后保留原始 SUP、修改后的 XML / PNG 或 ASS 工程，以及成品 SUP。以后发现某一句需要再改，可以回到可编辑素材，不必再次从最终文件拆解。

## 参考资料

- BDSup2Sub：[下载与版本][bdsup-download]、[主窗口][bdsup-main]、[转换设置][bdsup-conversion]、[单条编辑][bdsup-edit]、[支持格式与 BDN 示例][bdsup-formats]、[已知限制][bdsup-issues]。
- [BDSup2Sub++ 项目][bdsup-plus]与 [1.0.2 移动窗口定义][bdsup-plus-move]：C++ / Qt 移植实现及相对原位置移动的选项。
- [SUPer 官方项目][super]与 [v0.2.8 发布说明][super-release]：GUI 操作、量化与 PGS 编码限制；[BDN 解析][super-bdn]和[编码实现][super-render]用于核对多图、事件重叠及 forced 的版本限制。
- [Subtitle Edit OCR][se-ocr]与[文件导入导出说明][se-file]：图形字幕识别与 Blu-ray SUP 输出。
- [MKVToolNix：mkvextract][mkvextract]：PGS 轨道提取为 SUP。
- [BD Reauthor Pro][bd-reauthor]与 [Scenarist][scenarist]：专业蓝光重制与工程制作路线。

[bdsup]: https://github.com/mjuhasz/BDSup2Sub
[bdsup-download]: https://github.com/mjuhasz/BDSup2Sub/wiki/Download
[bdsup-main]: https://github.com/mjuhasz/BDSup2Sub/wiki/Main-Window
[bdsup-conversion]: https://github.com/mjuhasz/BDSup2Sub/wiki/Conversion-Dialog
[bdsup-edit]: https://github.com/mjuhasz/BDSup2Sub/wiki/Edit-Dialog
[bdsup-formats]: https://github.com/mjuhasz/BDSup2Sub/wiki/Supported-Formats
[bdsup-issues]: https://github.com/mjuhasz/BDSup2Sub/wiki/Known-Issues
[bdsup-plus]: https://github.com/amichaelt/BDSup2SubPlusPlus
[bdsup-plus-move]: https://github.com/amichaelt/BDSup2SubPlusPlus/blob/1.0.2/src/movedialog.ui
[super]: https://github.com/cubicibo/SUPer
[super-release]: https://github.com/cubicibo/SUPer/releases/tag/v0.2.8
[super-bdn]: https://github.com/cubicibo/SUPer/blob/v0.2.8/SUPer/filestreams.py
[super-render]: https://github.com/cubicibo/SUPer/blob/v0.2.8/SUPer/render2.py
[se-ocr]: https://subtitleedit.github.io/subtitleedit/features/ocr.html
[se-file]: https://subtitleedit.github.io/subtitleedit/features/file.html
[mkvextract]: https://mkvtoolnix.download/doc/mkvextract.html
[bd-reauthor]: https://dvd-logic.com/bd_reauthor
[scenarist]: https://scenarist.com/
