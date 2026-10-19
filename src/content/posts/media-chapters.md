---
title: 章节的处理
description: 从原盘或 MKV 取出章节，补齐名称、校正时间，再写回 MKV 或蓝光结构。
author: Ayulog
pubDatetime: "2026-10-10T22:00:00+08:00"
modDatetime: "2026-10-11T16:00:00+08:00"
draft: false
category: diy
tags:
  - MKVToolNix
  - 蓝光
---

一部影片的章节通常随原盘播放列表或 MKV 容器保存。在 Remux 或蓝光 DIY 时，可以把章节提取出来，补上与画面对应的正式标题、校正时间轴，再写回 MKV 或蓝光结构。有关播放列表与 HDR 的基础知识，见[认识蓝光碟片](/posts/understanding-blu-ray/)和[认识 HDR](/posts/understanding-hdr/)。

本文涉及的软件集中在[蓝光与媒体工具清单](/posts/media-diy-software/)，以常规线性播放的电影章节为主。

## 章节的数据构成

普通视频章节主要由**起始时间点**与**显示名称**组成，供播放器生成章节菜单及执行上一章、下一章跳转。修改或添加章节只在容器或播放列表层面更新元数据，无需重新编码视频。

以一条章节记录 `00:05:12.480 — 第一次见面` 为例：

- **时间点**：对应当前正片时间线上的跳转位置。
- **显示名称**：播放器界面显示的章节标题。

在蓝光原盘中，MPLS 播放列表只记录章节跳转时间点，而原盘选章菜单上看到的章节标题往往绘制在菜单图片或 Java 资源里。因此，直接从原盘提取章节时，通常会生成 `Chapter 01`、`Chapter 02` 这类默认编号，章节名称需要另外对照菜单或资料补入。

此外，Matroska（MKV）章节规范还支持多语言标题、语言标签、嵌套子章节、Edition 与有序章节（Ordered Chapters），完整定义见 [Matroska 章节规范][matroska-chapters]。

## 常用章节工具与分工

| 处理环节       | 推荐工具                                                                                                | 核心用途                                                               |
| -------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 确认正片列表   | [BDInfo](/posts/media-diy-software/#原盘与文件检查)                                                     | 扫描原盘播放列表、时长、片段与章节数量，确定目标版本                   |
| 从原盘随片提取 | [MakeMKV、DGDemux](/posts/media-diy-software/#提取与封装)                                               | MakeMKV 将正片及章节直接封装进 MKV；DGDemux 按 MPLS 分流时一并导出章节 |
| 单独提取章节   | [MKVToolNix](/posts/media-diy-software/#提取与封装)                                                     | 从 MKV 提取 XML / 简单文本，或在章节编辑器中直接读取 `.mpls`           |
| 编辑名称与时间 | [ChapterTool、chapterEditor](/posts/media-diy-software/#章节与-matroska-编辑)，或 MKVToolNix 章节编辑器 | 批量填写中英文章节名、平移或缩放时间点、转换 XML 与 OGM TXT 格式       |
| 从菜单提取图片 | [igstools](/posts/media-diy-software/#章节与-matroska-编辑)                                             | 将蓝光 IGS 交互菜单流导出为 PNG 图片，辅助人工查阅原盘章节名           |
| 写入与封装     | MKVToolNix、tsMuxer、BDFix Pro                                                                          | 将章节写入 MKV 容器（混流或原地更新）或写入蓝光 MPLS 结构              |

## 第一步：提取目标版本的章节

### 1. 从蓝光原盘提取

先用 BDInfo 确认正片对应的 `BDMV/PLAYLIST/*.mpls`，核对总时长、剪辑版本及引用的 `.m2ts` 片段（参见[MPLS 播放列表与 M2TS 片段的关系](/posts/understanding-blu-ray/#mpls-播放列表与-m2ts-片段的关系)）。确定目标 `.mpls` 后，按当前工作流任选一种提取方式：

1. **仅提取章节文件**：打开 MKVToolNix GUI 的**章节编辑器**（或使用 [ChapterTool][chaptertool]），直接载入目标 `.mpls`，读取后另存为 `.xml` 文件。
2. **随 MakeMKV 封装提取**：用 [MakeMKV][makemkv] 勾选目标节目生成 MKV，原盘章节会自动写入输出文件。
3. **随 DGDemux 分流提取**：在 [DGDemux][dgdemux] 中载入目标 `.mpls` 分流音视频时，勾选 **Chapters** 一并导出章节文本。

### 2. 从现有 MKV 提取

在图形界面中，可用 MKVToolNix GUI 的**章节编辑器**打开 MKV，选择**将章节另存为 XML 文件**。

在命令行中，可使用 MKVToolNix 自带的 [mkvextract][mkvextract] 导出为 Matroska XML 或 OGM 简单文本（`--simple`）：

```sh
# 导出为保留完整结构与多语言信息的 Matroska XML（推荐作为备份与编辑母本）
mkvextract "movie.mkv" chapters "chapters.xml"

# 导出为简洁的 OGM 风格单层文本（适合快速批量编辑单语标题）
mkvextract "movie.mkv" chapters --simple "chapters.txt"
```

## 第二步：获取并核对章节名称

保留从当前片源提取的准确时间点后，可通过以下途径查找对应的官方章节名称：

### 1. 查阅原盘菜单与随碟册子

在支持蓝光菜单的播放器中打开原盘，进入 **Scene Selection / Chapter Selection（场景/章节选择）** 页面，逐页记录各章标题；也可参考随碟附带的小册子（Booklet）或演唱会曲目单（注意核对正片中的开场、串场与返场是否单独成章）。

### 2. 检索 ChapterDB 存档

[ChapterDB 只读存档][chapterdb]保留了原 `chapterdb.org` 的历史章节数据。检索到同名影片条目后，先比对发行版本（剧场版、导演剪辑版）、总时长、章节总数与关键时间点。确认分章结构一致后，可借用其中的章节标题，填回从当前片源提取的时间点列表中。

### 用 igstools 提取蓝光菜单图片

当原盘采用 HDMV IGS（Interactive Graphics Stream）制作选章菜单、且不便逐页播放截图时，可用 [igstools][igstools] 将菜单流中的图形对象直接导出为 PNG 图片以便查阅文字。

#### 在独立 Python 环境中安装

由于 `igstools` 是较早期的 Python 项目，其 `setup.py` 在构建阶段直接导入了 `png` 模块，在现代 Python（如 Python 3.12）环境中建议先安装 `pypng` 并配合 `--no-build-isolation` 安装（详见 [Python Packaging 说明][python-packaging]）：

```powershell
py -3 -m venv .venv-igstools
.\.venv-igstools\Scripts\python.exe -m pip install setuptools wheel pypng
.\.venv-igstools\Scripts\python.exe -m pip install --no-build-isolation "https://github.com/SAPikachu/igstools/archive/refs/heads/master.zip"
```

#### 导出菜单 PNG 并录入标题

找到原盘中包含选章菜单 IGS 流的 `.m2ts` 文件（以 `00006.m2ts` 为例），执行导出：

```powershell
.\.venv-igstools\Scripts\python.exe -m igstools "Disc\BDMV\STREAM\00006.m2ts"
```

工具会在同目录下生成按页面与按钮状态命名的 PNG 图片，从中找出各页章节标题后，按顺序填入章节文件即可。

### 4. 无官方章节名时的规范编号

若原盘菜单本身只显示缩略图或序号、无正式文字标题，保持标准的 `Chapter 01`、`Chapter 02`（或 `第 01 章`、`第 02 章`）编号即可。

## 第三步：编辑章节名称与校正时间轴

### OGM 简单章节文本格式

OGM 风格文本（`.txt`）由成对的时间戳（`HH:MM:SS.mmm`，精确到毫秒）与章节名组成，保存时使用 **UTF-8** 编码：

```text
CHAPTER01=00:00:00.000
CHAPTER01NAME=片头
CHAPTER02=00:05:12.480
CHAPTER02NAME=第一次见面
CHAPTER03=00:10:30.000
CHAPTER03NAME=出发
```

### 使用章节编辑工具

- **MKVToolNix 章节编辑器**：直接打开 `.xml`、`.mpls` 或 `.mkv`，可视化修改章节时间、为同一章节添加多语言标题（如同时包含 `zh-Hans` 中文标题与 `en` 英文标题）并设置对应语言代码。
- **[ChapterTool][chaptertool]**：支持 TXT、XML、MPLS 等格式互转、批量重命名与时间轴偏移计算，提供桌面端、命令行与网页版（桌面端读取媒体文件需配置 `mkvextract` 与 `ffprobe`）。
- **[chapterEditor][chaptereditor]**：提供多格式章节转换、时间轴调整及 Matroska 多版本（Multi-Edition）编辑功能。

### 全片固定时间偏移

当参考章节源与当前视频内容一致，仅片头多出或少了一段固定长度的发行方 Logo 时，对所有章节时间做整体加减平移：

```text
新时间 = 原时间 + 偏移量
```

例如当前视频片头多出 8 秒，则将原 `00:05:12.480` 整体延后为 `00:05:20.480`，并将第 1 章起点保持在 `00:00:00.000`。

### 播放速度（帧率）变化时的比例缩放

仅当同一版本影片的**实际播放速度发生改变**（例如 PAL 制 25 fps 版本与 24 fps 电影原速版本之间存在约 4% 的时长伸缩）时，才按帧率比例缩放章节时间：

```text
新时间 = 原时间 × (原帧率 / 新帧率)
# 例：24 fps 转 25 fps 加速播放时，01:00:00.000 × 24 / 25 = 00:57:36.000
```

若两份视频虽然帧率不同（如 23.976 fps 与 29.97 fps），但经过插帧或逆胶卷过带后**总时长完全相同**，则时间轴并未伸缩，无需按比例缩放。若影片中间存在删减或加长段落，则需在差异点之后分段平移。

## 第四步：写入 MKV 或蓝光结构

编辑并保存好 `chapters.xml` 或 `chapters.txt` 后，根据成品格式将其写入目标容器。

### 1. MKVToolNix 重新混流写入

在生成新 MKV 的同时写入章节（详见 [mkvmerge 章节手册][mkvmerge-chapters]）：

- **GUI 操作**：在混流器中添加源媒体文件，取消勾选源文件原有的旧章节；切换到**输出 → 章节**，在**章节文件**中选择新编辑的 `.xml` 或 `.txt`（导入 `.txt` 时将字符集设为 `UTF-8` 并选择章节语言），指定新文件名开始混流。
- **命令行操作**：使用 `--no-chapters` 忽略源文件的旧章节，再用 `--chapters` 导入新章节：

```sh
# 导入 Matroska XML 章节
mkvmerge -o "movie.chaptered.mkv" --no-chapters "movie.mkv" --chapters "chapters.xml"

# 导入 UTF-8 简单文本章节，并指定简体中文语言标签
mkvmerge -o "movie.chaptered.mkv" --no-chapters "movie.mkv" --chapter-charset UTF-8 --chapter-language zh-Hans --chapters "chapters.txt"
```

### 2. mkvpropedit 原地快速更新现有 MKV

若成品 MKV 已经封装完毕，只需更新或替换其中的章节，可使用 [mkvpropedit][mkvpropedit] 直接修改文件头部的章节信息，无需重新读写整部视频（操作前建议先复制备份或对工作副本操作）：

```powershell
# 直接将 chapters.xml 写入目标 MKV（覆盖该文件原有章节）
mkvpropedit "movie.chaptered.mkv" --chapters "chapters.xml"
```

在 MKVToolNix GUI 的章节编辑器中打开现有 MKV、修改后点击**保存到 Matroska / WebM 文件**，同样执行的是原地快速更新。

### tsMuxer：生成蓝光结构时写入章节

使用 [tsMuxer][tsmuxer] 生成新的蓝光目录（BDMV）或 ISO 时，章节作为时间点写入生成的 `.mpls` 播放列表中：

1. 在 **Input** 页载入源 `.mpls` 或带章节的 MKV。
2. 在输出区选择 **Blu-ray folder** 或 **Blu-ray ISO**。
3. 切换到 **Blu-ray** 页：
   - 选择 **Custom chapters list**，在下方文本框中按行填入 `HH:MM:SS.mmm` 格式的时间点（仅填时间，不带 `CHAPTER01=` 等前缀）；
   - 或选择 **Insert chapter every** 按固定分钟数生成等间隔跳转点。
4. 开始混流，完成后检查新生成的 `BDMV/PLAYLIST/*.mpls`。

对应的 `.meta` 配置文件参数格式如下（详见 [tsMuxer 使用说明][tsmuxer-usage]）：

```text
MUXOPT --blu-ray --custom-chapters=00:00:00.000;00:05:12.480;00:10:30.000
```

注：若同时在 tsMuxer 的 **Split & cut** 页启用了 `Cut start` 裁剪片头，tsMuxer 会自动将章节列表中的时间减去裁剪起点，因此列表中保持填入裁剪前的源片时间点即可。

### BDFix Pro：重制现有蓝光时保留和复核章节

使用 Defsoft 的 BDFix / BDFix Pro（参考[历史产品资料][bdfix-info]、[版本记录][bdfix-history]与[公开重制示例][bdfix-guide]）在现有原盘结构上替换或追加音轨、字幕时，章节保留与复核流程如下：

1. **备份原盘章节记录**：动手前先用 BDInfo 和 MKVToolNix 章节编辑器读取原盘目标 `.mpls`，保存一份原始章节 XML 备份。
2. **按 MPLS 模式重制轨道**：在 BDFix 中按目标 `.mpls` 完成音轨或字幕的替换与追加（若正片时间线与片段入出点未做改动，原 MPLS 中的章节标记会随重制保留）。
3. **重读输出 MPLS 校验**：Build 生成新 BDMV 目录后，用章节编辑器打开新生成的 `.mpls`，与第一步备份的原始章节逐条比对时间点，并从蓝光菜单进入正片测试选章跳转。

## 第五步：验收章节跳转与显示

完成写入后，结合工具读取与实际播放进行最终检查：

1. **回读容器元数据**：用 MediaInfo 查看成品 MKV，或用 `mkvextract` 重新导出一次章节 XML，确认未因忘记加 `--no-chapters` 而产生新旧两套重复的 Edition。
2. **检查标题显示与语言**：在播放器章节菜单中查看中英文字符是否正常显示、无乱码，序号与章节名一一对应。
3. **抽查场景落点**：点击跳转到片头、中段、无缝分支接缝后以及片尾演职员表章节，确认实际画面落点与章节标题描述的场景吻合，且跳转后音画同步、HDR 状态正常（HDR 元数据检查见[认识 HDR：DIY 封装时的元数据保留](/posts/understanding-hdr/#diy-封装时的元数据保留)）。

## 常见章节格式与结构边界

| 场景与格式                       | 处理要点与边界说明                                                                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Matroska XML 与 OGM TXT 转换** | XML 支持多语言标题、嵌套层级与 Edition；转为 OGM TXT 时仅保留单层时间与单个名称                                                            |
| **Ordered Chapters（有序章节）** | 用于控制多版本共用片段的播放顺序或跨文件外部引用（Segment Linking），编辑时必须保持 XML 结构与 UID 完整                                    |
| **FFmpeg 的 `FFMETADATA1` 格式** | FFmpeg 导出/导入章节使用专用的 `[CHAPTER]`、`TIMEBASE`、`START`、`END` 语法（见[FFmpeg 元数据文档][ffmpeg-metadata]），与 OGM TXT 格式不同 |
| **MP4 容器章节**                 | MP4 支持 Nero 风格与 QuickTime `chpl` 轨道两种章节表示，需使用 MP4Box 或 FFmpeg 等对应工具写入                                             |

将章节与视频、音轨、字幕一并封装为成品 MKV 的完整步骤，见[蓝光原盘 Remux](/posts/blu-ray-remux/)。

## 参考资料

- [MKVToolNix：mkvextract][mkvextract]、[mkvmerge 的章节说明][mkvmerge-chapters]、[mkvpropedit][mkvpropedit]：提取格式、MPLS 读取、章节导入与原地替换。
- [MKVToolNix 章节编辑器源码][mkvtoolnix-editor]：可打开的文件类型，以及保存为 XML、写回 Matroska 的区别。
- [Matroska 章节规范][matroska-chapters]：章节、Edition、语言与有序播放结构。
- [MakeMKV][makemkv]、[DGDemux 资料页][dgdemux]：节目转换、章节保留与分流。
- [tsMuxer 项目][tsmuxer]与[使用文档][tsmuxer-usage]：蓝光输出、自定义章节时间与自动分章参数。
- [BDFix 历史产品资料][bdfix-info]、[版本记录][bdfix-history]与[公开重制示例][bdfix-guide]：重制能力、入出点、无效播放列表标记处理及 BDMV 操作流程。
- [ChapterTool][chaptertool]、[chapterEditor 资料页][chaptereditor]：章节编辑、格式支持和工具依赖。
- [ChapterDB 只读存档][chapterdb]：已有章节资料的检索入口。
- [igstools][igstools]：IGS 菜单图像提取，安装说明与源码。
- [Python Packaging：弃用直接运行 setup.py 的说明][python-packaging]。
- [FFmpeg 元数据格式][ffmpeg-metadata]。

[mkvextract]: https://mkvtoolnix.download/doc/mkvextract.html
[mkvmerge-chapters]: https://mkvtoolnix.download/doc/mkvmerge.html#mkvmerge.chapters
[mkvpropedit]: https://mkvtoolnix.download/doc/mkvpropedit.html
[mkvtoolnix-editor]: https://codeberg.org/mbunkus/mkvtoolnix/raw/tag/release-102.0/src/mkvtoolnix-gui/chapter_editor/tab.cpp
[matroska-chapters]: https://www.matroska.org/technical/chapters.html
[makemkv]: https://www.makemkv.com/
[dgdemux]: https://www.videohelp.com/software/DGDemux
[chaptertool]: https://github.com/tautcony/ChapterTool
[chaptereditor]: https://www.videohelp.com/software/chapterEditor
[chapterdb]: https://chapterdb.plex.tv/
[igstools]: https://github.com/SAPikachu/igstools
[python-packaging]: https://packaging.python.org/en/latest/discussions/setup-py-deprecated/
[ffmpeg-metadata]: https://ffmpeg.org/ffmpeg-formats.html#Metadata-1
[tsmuxer]: https://github.com/justdan96/tsMuxer
[tsmuxer-usage]: https://github.com/justdan96/tsMuxer/blob/master/docs/USAGE.md
[bdfix-info]: https://www.qweas.com/downloads/audio/multimedia-creation-tools/moreinfo-bdfix.html
[bdfix-history]: https://www.digital-digest.com/software/BDFix_history.html#16
[bdfix-guide]: https://home.gamer.com.tw/artwork.php?sn=5652920
