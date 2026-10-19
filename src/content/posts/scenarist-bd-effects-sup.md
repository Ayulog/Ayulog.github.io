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

在蓝光 DIY 制作中，“大金”指专业蓝光母盘制作软件 **Scenarist BD**。要把包含复杂定位、渐变和动画的 ASS 特效字幕做成蓝光兼容的 PGS（`.sup`）图形轨，传统母盘级做法是先将 ASS 渲染为 `BDN XML + 8-bit PNG` 图像序列，导入 Scenarist BD 编码为 `.pes` 资产并执行一次完整混流（常称“过水”），最后从生成的蓝光结构中拆出独立的 `.sup` 文件。

如果手头没有现成的正片 Scenarist 工程，可以先用一段蓝光合规的黑屏占位视频，经 tsMuxeR 与 BD Reauthor 快速搭建一个临时工程来承载字幕编码。下文界面基于 **Scenarist BD 5.1.3、BD Reauthor 2.1.3 与 tsMuxeR 2.6.9** 整理；若只需修改现有 SUP 的时间或位置，请直接参考[SUP 图形字幕的修改方法](/posts/sup-subtitle-editing/)。

## 工具链与前期准备

整套流程依次衔接五项组件：

| 工具                       | 在流程中的职责                                        | 关键环境要求                                                      |
| -------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------- |
| Aegisub                    | 完成 ASS 排版、特效编写与时间轴核对                   | 收集齐工程所用字体与 `\1img` 外部图片素材                         |
| AviSynth + VSFilter 系滤镜 | 通过 `MaskSub` 将 ASS 渲染为带 Alpha 通道的 RGBA 帧流 | AviSynth、滤镜 DLL 与 `avs2bdnxml` 进程位数（32/64 位）保持一致   |
| [avs2bdnxml][avs2bdnxml]   | 将 RGBA 帧流切分并量化为 `BDN XML + 8-bit 索引 PNG`   | 开启 `-p1` 输出 8-bit 调色板 PNG 以适配 Scenarist BD              |
| [tsMuxeR][tsmuxer]         | 将黑屏占位视频封装为临时 BDMV，并在最后拆出 `.sup`    | 封装临时目录时选 `Blu-ray folder`，最后提流选 `Demux`             |
| BD Reauthor + Scenarist BD | 生成 `.ssol` 临时工程、编码 `.pes` 字幕资产并执行 MUX | 需在 BD Reauthor 中关联 Scenarist 安装目录下的 `MUIGenerator.exe` |

正式渲染整部电影前，建议先截取包含普通对白、淡入淡出和动态位移的 **60 秒 ASS 片段**走通一遍流程，避免一次性渲染上万张 PNG 后才发现帧率或透明度配置有误。

动手前先统一四项基准参数：**目标画布分辨率**、**精确帧率**、**时间零点**与**末条字幕结束时间**。下文以蓝光最常见的 **1920×1080、24000/1001 fps（23.976 fps）** 为例，渲染脚本、BDN 参数与临时占位视频三者的分辨率和帧率必须完全一致。

## 阶段一：将 ASS 渲染为 BDN XML 与 PNG

### 1. 编写 AviSynth 渲染脚本（MaskSub）

`avs2bdnxml` 需要读取输出 RGBA 透明画面的 `.avs` 脚本。在工作目录新建 `render.avs`，调用 VSFilter（若使用了 `\1vc`、`\1img` 等扩展标签则调用 VSFilterMod）的 `MaskSub` 接口生成带 Alpha 通道的字幕画面：

```avisynth
LoadPlugin("C:\Tools\VSFilter\VSFilter.dll")
MaskSub("C:\SubtitleWork\sample.ass", 1920, 1080, 24000.0 / 1001.0, 1440)
```

参数说明：

- `1920, 1080` 与 `24000.0 / 1001.0` 分别指定渲染画布宽高与帧率（23.976 fps）。
- 末尾的 `1440` 为总渲染帧数（在 23.976 fps 下约对应 **60.06 秒**）。压制全片时，须将帧数改为覆盖全片最后一条字幕结束时间（并略留几秒余量）的总帧数，防止后半程字幕被截断。
- 若部分旧版滤镜渲染出的字幕存在上下颠倒，可按需在末尾追加 `FlipVertical()`。

### 2. 运行 avs2bdnxml 导出索引图序列

在工作目录下新建 `bdn` 文件夹，打开命令提示符执行 `avs2bdnxml`：

```bat
avs2bdnxml.exe -t Effects -l zho -v 1080p -f 23.976 -a1 -p1 -b0 -o "bdn\effects.xml" "render.avs"
```

| 参数                   | 作用说明                                                                   |
| ---------------------- | -------------------------------------------------------------------------- |
| `-v 1080p -f 23.976`   | 声明 BDN 头部画布规格与时间码帧率（需与 `.avs` 脚本严格一致）              |
| `-a1`                  | 自动裁剪掉字幕四周的多余透明区域，将图块左上角坐标写入 XML 的 `X / Y`      |
| `-p1`                  | 将图像量化为带透明通道的 8-bit 调色板索引 PNG，满足 Scenarist BD 导入要求  |
| `-b0`                  | 关闭自动多图块切分（先用单图块验证流程，需要针对解码缓冲拆图时再单独测试） |
| `-l zho`               | 写入中文语言代码标记                                                       |
| `-o "bdn\effects.xml"` | 指定输出的 BDN XML 路径（配套 PNG 会生成在同一目录下）                     |

### 3. 抽查生成的 XML 与 PNG

打开 `bdn/` 目录，抽查生成的 PNG 是否有透明背景、字体与描边是否正常，并查看 `effects.xml` 中的 `<Event>` 记录：

```xml
<Event InTC="00:00:10:00" OutTC="00:00:12:00" Forced="False">
  <Graphic Width="720" Height="96" X="600" Y="900">000001.png</Graphic>
</Event>
```

由于开启了 `-a1` 自动裁剪，生成的 PNG 仅包含文字包围盒大小（如 `720×96`），其在 `1920×1080` 画布中的位置由 `X="600" Y="900"` 决定。`InTC / OutTC` 的末尾两位是帧号（`00`–`23`），淡入淡出和位移特效会被拆分为连续多帧的 `<Event>` 序列。

## 阶段二：用黑屏占位视频建立临时 Scenarist 工程

如果手头已经有正片对应的 Scenarist Solution（`.ssol`），可直接跳至阶段三。没有现成工程时，准备一段符合蓝光规范的 H.264 裸流黑屏视频（`.264` 或 `.avc`，分辨率 `1920×1080`、帧率 `23.976 fps`，时长需大于字幕末尾时间），通过 tsMuxeR 与 BD Reauthor 生成临时工程：

### 1. 用 tsMuxeR 封装临时蓝光目录

1. 打开 tsMuxeR GUI，点击 **add** 载入准备好的合规黑屏视频流，确认识别出的分辨率与 `23.976` 帧率无误。
2. 在底部 **Output** 中选择 **Blu-ray folder**，将输出路径设为 `work\BlackBD`。
3. 点击 **Start muxing**，生成包含 `BDMV` 结构的临时蓝光目录。

### 2. 用 BD Reauthor 拆解生成 Scenarist Solution

1. 打开 BD Reauthor，进入 **Options → Settings**：
   - 在 **Path** 页指定独立的工程输出目录（如 `work\reauthor`）。
   - 在 **Scenarist** 页将路径指向 Scenarist 安装目录中的 `MUIGenerator.exe`，并选择对应的 Scenarist 版本号。
   - 确认**未勾选** `Do not generate XML project file for Scenarist`。
2. 点击 **File → Open BD…** 选择上一步生成的 `work\BlackBD` 目录，点击 **Demux all data**。
3. 待日志提示完成，确认 `work\reauthor\solution\` 下已生成 `solution.ssol` 工程文件。

## 阶段三：在 Scenarist BD 中编码字幕并执行 Full MUX

### 1. 加载 Solution 与 Project

1. 启动 Scenarist BD，点击 **File → Load Solution…** 打开 `solution.ssol`。
2. 在左侧 **SolutionExplorer** 中展开工程树，右键点击版本节点（如 `00.00.0000`），选择 **Load Project** 将项目载入工作区。

### 2. 导入 BDN XML 并编码为 PES 资产

1. 在 **DataTree** 面板右键点击 **Data** 根节点，选择 **Import… → BDN file…**，选中阶段一生成的 `bdn\effects.xml`。
2. 在弹出的 **Acquisition Point Interval** 对话框中保持默认设置继续，随后在 **Save ES File** 窗口中将编码输出的 `.pes` 文件保存到工程的 `Encode` 目录下（例如命名为 `effects.pes`）。
3. 观察底部日志确认全部字幕事件编码成功（若报缺图或时间重叠，需回退检查 XML 与 PNG）。
4. 确认磁盘上已生成 `effects.pes` 及配套 `.mui` 文件后，在 **DataTree** 中移除刚才导入时产生的临时节点，将 `Encode\effects.pes` 重新拖入 **DataTree**，并在 **Property** 属性栏核对 `Video Size`（1920×1080）、`Video Frame Rate`（23.976）与 `Language Code`（`zho`）。

### 3. 将 PES 资产挂载到 Clip 的 PG 轨

切换到 **StreamTree** 面板，双击展开主视频对应的 `Clip#0`，将刚导入的 `effects` 字幕资产拖拽到 **PG**（Presentation Graphics）轨道槽位上。若是在完整正片工程中加字幕，还需同步检查 PlayList 中的 PG 轨引用（详见[蓝光原盘 DIY 教程](/posts/blu-ray-diy/)）。

### 4. 执行 Full MUX 生成蓝光结构

1. 保存工程，点击顶部工具栏的 **MUX…** 按钮。
2. 在对话框中将 **Selected Contents** 设为 **Disc only**，**MUX Processing Type** 设为 **Full MUX**，点击 **MUX Start**。
3. 等待混流完成并检查日志确认无缓冲溢出报错。生成的蓝光根目录默认位于工程输出路径下的 `Output\MUX\BDROM\DB\`（内含 `BDMV` 文件夹）。

## 阶段四：从混流结果提取独立 SUP 并回看验证

### 1. 用 tsMuxeR 拆出 SUP

1. 重新打开 tsMuxeR GUI，点击 **add** 载入 `Output\MUX\BDROM\DB\BDMV\PLAYLIST\00000.mpls` 播放列表。
2. 在轨道列表中**仅勾选目标 PGS 字幕轨**，取消勾选黑屏视频轨。
3. 将 **Output** 设为 **Demux**，指定成品保存目录后点击 **Start demuxing**，即可取出重编码完成的独立 `.sup` 字幕文件（如 `00000.track_4608.sup`，可重命名为正式文件名）。

### 2. 挂载至正片视频回看检查

将最终 `.sup` 外挂或用 MKVToolNix 混流进正片视频，在电脑播放器与目标客厅播放机/电视上重点检查以下几项：

| 检查维度         | 关注重点                                                                         |
| ---------------- | -------------------------------------------------------------------------------- |
| 字形、坐标与边缘 | 对照原 ASS 预览，检查 8-bit 索引化后描边是否有杂色、透明底是否干净、位置是否偏离 |
| 淡入淡出与位移   | 动态帧过渡是否顺畅，有无因超越 PGS 解码缓冲上限导致的闪烁、卡顿或吞帧            |
| 全片时间轴同步   | 抽查片头、中段与片尾，确认 `23.976` 与 `24` 时基无误，末尾字幕未被截断           |
| 进度跳转与清除   | 在特效中途暂停、快进或跳章节，恢复播放后旧字幕能否干净消失                       |

_注：检查成品动态特效时请直接用播放器或播放机加载 `.sup` 实测；避免再用 BDSup2Sub 重新打开另存，以免其调色板重算破坏已编好的渐变帧。若发现某段全屏粒子或高频动画在硬件播放机上闪烁，需回到源 ASS 缩小特效区域或降低逐帧面积后再重新渲染。_

## 替代方案：不经过 Scenarist BD 的轻量化路线

如果不需要构建商业母盘工程、只想把 ASS 特效快速转成独立 `.sup`，可省去临时黑屏工程与 Scenarist 混流，改用以下两条轻量化路线：

- **ass2bdnxml + SUPer**：用 `ass2bdnxml`（cubicibo 分支，基于 `libass`）直接从 ASS 渲染出 `BDN XML + 32-bit PNG`，再交由开源编码器 [SUPer][super] 直接输出 `.sup`（详见[字幕处理教程第六步](/posts/subtitle-workflow/#第六步渲染并转回-sup)）。
- **avs2bdnxml 直接输出 SUP**：在阶段一运行 `avs2bdnxml.exe` 时，直接将 `-o` 输出文件的扩展名写为 `.sup`（如 `-o "effects.sup"`），由工具直接打包生成 SUP 文件。

## 参考资料

- [Scenarist 官方网站][scenarist]：Scenarist BD 母盘制作系统说明。
- [DVDLogic：BD Reauthor][bd-reauthor]（[v2.0 手册归档][bd-manual]）：蓝光拆解、MUI Generator 关联与 Scenarist 工程生成。
- [avs2bdnxml 项目说明][avs2bdnxml] 与 [xy-VSFilter AviSynth 接口文档][xy-vsfilter]：`MaskSub` 透明字幕渲染与 BDN XML / 8-bit PNG 导出参数。
- [ass2bdnxml（cubicibo 分支）][ass2bdnxml] 与 [SUPer 仓库][super]：基于 `libass` 的现代 BDN 渲染与 PGS 编码替代方案。
- [tsMuxeR 仓库][tsmuxer]（[v2.7.0 发布页][tsmuxer-release]）、[BDSup2Sub 已知限制][bdsup-issues]与 [MKVToolNix 文档][mkvmerge]。

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
