---
mediaCategory: diy
mediaRole: guide
title: 章节的处理
description: DIY 入门第三篇：提取章节、获取名称与调整时间，再用 MKVToolNix 写入 MKV，或用 tsMuxer、BDFix Pro 处理蓝光结构中的章节，并检查最终跳转结果。
author: Ayulog
pubDatetime: "2026-10-10T22:00:00+08:00"
draft: false
tags:
  - 章节
  - MKVToolNix
  - 蓝光
  - DIY
  - Media
---

前两篇分别介绍了[蓝光碟片与播放列表](/posts/2026-10-10-understanding-blu-ray/)、[HDR 与杜比视界](/posts/2026-10-10-understanding-hdr/)。从这一篇开始，把这些概念用到文件整理里：先提取章节，再补名称、调整时间，最后写入成品。

用到的软件都放在 [DIY 常用软件与资料](/posts/2026-10-10-media-diy-software/)。下面按处理顺序说明各工具的作用，不需要把所有软件都装一遍。公开资料核对到 **2026 年 10 月 10 日**；正文以普通线性播放的电影章节为主，多版本与 Ordered Chapters 另行区分。

## 目录

- [章节里保存了什么](#章节里保存了什么)
- [按流程选择工具](#按流程选择工具)
- [第一步：取得对应版本的章节](#第一步取得对应版本的章节)
- [第二步：获取章节名称](#第二步获取章节名称)
- [用 igstools 提取蓝光菜单图片](#用-igstools-提取蓝光菜单图片)
- [第三步：修改名称与时间](#第三步修改名称与时间)
- [第四步：写入 MKV 或蓝光结构](#第四步写入-mkv-或蓝光结构)
- [第五步：检查最终文件](#第五步检查最终文件)
- [几种容易混淆的情况](#几种容易混淆的情况)
- [参考资料](#参考资料)

## 章节里保存了什么

普通章节主要保存**时间点与显示名称**。播放器根据这些标记提供章节列表，以及上一章、下一章等跳转功能。添加章节通常不需要重新压制视频，也不会把一部电影真的切成多个视频文件。

例如，某一章从 `00:05:12.480` 开始，名称是“第一次见面”。其中：

- 时间回答“跳到哪里”，需要与当前影片的时间线对应。
- 名称回答“显示什么”，可以是发行方给出的标题，也可以只是“第 2 章”。

**有章节时间点，不代表一定有正式名称。** 蓝光菜单中出现的标题，可能只是菜单图片的一部分，并没有直接作为文字写进正片的章节信息。提取后只得到 `Chapter 01`、`Chapter 02`，并不一定是工具漏提了名称。

Matroska 章节还可以包含语言、嵌套层级、结束时间、Edition 和 UID 等信息。它们的完整结构见 [Matroska 章节规范][matroska-chapters]；日常给一部电影补章节名，通常只需先处理时间点、名称和语言。

## 按流程选择工具

| 环节           | 现有目录中的工具                                                                                                   | 主要做什么                                                           |
| -------------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| 确认正片       | [BDInfo](/posts/2026-10-10-media-diy-software/#原盘与文件检查)                                                     | 查看播放列表、时长、片段与轨道，确定要处理的版本                     |
| 从原盘取得章节 | [MakeMKV、DGDemux](/posts/2026-10-10-media-diy-software/#提取与封装)                                               | MakeMKV 将节目及章节保存到 MKV；DGDemux 按播放列表分流，也可输出章节 |
| 单独读取章节   | [MKVToolNix](/posts/2026-10-10-media-diy-software/#提取与封装)                                                     | 从 MKV 提取 XML / 简单文本，或在章节编辑器中打开 MPLS                |
| 编辑名称与时间 | [ChapterTool、chapterEditor](/posts/2026-10-10-media-diy-software/#章节与-matroska-编辑)，或 MKVToolNix 章节编辑器 | 补名称、检查时间点、转换章节格式；按工具支持进行批量调整             |
| 从菜单找名称   | [igstools](/posts/2026-10-10-media-diy-software/#章节与-matroska-编辑)                                             | 对支持的蓝光 IGS 菜单流导出图片，再人工辨认名称                      |
| 写入与复查     | MKVToolNix、MediaInfo、实际播放器                                                                                  | 将章节写入 MKV，复查列表、字符与跳转位置                             |

如果输出目标是蓝光目录或 ISO，还会用到 [tsMuxer 与 BDFix Pro](/posts/2026-10-10-media-diy-software/#提取与封装)：前者在生成新蓝光结构时写入章节时间点，后者用于现有蓝光的重制，并需检查原播放列表中的章节是否保留、是否仍有效。对应操作放在[第四步](#第四步写入-mkv-或蓝光结构)。

如果手里已经是 MKV，通常从 MKVToolNix 开始即可。如果只想读取原盘的章节时间点，也可以直接打开正确的 MPLS，不必为了章节先导出整部电影。

## 第一步：取得对应版本的章节

### 从蓝光原盘取得

先用 BDInfo 确认正片对应哪个 `BDMV/PLAYLIST/*.mpls`，核对时长、剪辑版本、引用的片段与轨道。有关原盘结构的解释，见[为什么不能只找最大的 M2TS](/posts/2026-10-10-understanding-blu-ray/#为什么不能只找最大的-m2ts)。

章节时间应当对应**播放列表组织后的正片时间线**，不是随意选一个 M2TS 的内部时间。特别是无缝分支、多片段和多版本影片，不要把最大的文件直接当成完整正片。

确定播放列表后，按已有工作流程选择一种方式：

1. **只处理章节**：在 MKVToolNix GUI 的“章节编辑器”中打开正确的 `.mpls`，读取后另存为 XML。ChapterTool 当前也支持读取 MPLS / BDMV 章节。这里处理的是工具能够正常读取的原盘文件，直接读 MPLS 不等于完成受保护实体碟的全部播放或读取工作。
2. **准备先做 MKV**：用 MakeMKV 选择对应节目，核对时长和章节数量，生成 MKV 后再提取或编辑章节。[MakeMKV 官方说明][makemkv]明确列出了章节保留功能。
3. **本来就需要分流轨道**：用 DGDemux 处理选定播放列表，在分流时一并输出章节。它的公开说明列有章节提取与无缝分支处理能力，见 [DGDemux 资料页][dgdemux]。章节文件与音视频尽量来自同一次、同一列表的处理结果。

不要同时从不同剪辑或发行版各取一部分，再只因为片名相同就直接组合。

### 从现有 MKV 提取

图形界面可以在 MKVToolNix 的“章节编辑器”中打开 MKV，再选择**保存为 XML**。如果从 MKV 打开后直接使用普通“保存”，会回写原 MKV；保存独立章节文件与写回影片是两种操作。

命令行则使用 MKVToolNix 自带的 `mkvextract`。以下命令假设工具已加入 PATH，`movie.mkv` 与输出文件都位于当前工作目录；这些文件名只是示例。

提取为 Matroska XML：

```sh
mkvextract "movie.mkv" chapters "chapters.xml"
```

提取为简单章节文本：

```sh
mkvextract "movie.mkv" chapters --simple "chapters.txt"
```

[当前 mkvextract 手册][mkvextract]把这两种输出明确区分开。**XML 更适合作为原始备份**；简单文本适合普通的单层章节列表，但不能完整表达多语言、嵌套、多个 Edition 或有序章节等结构。

这两条命令只会提取现有章节，不会自动替没有章节的影片分析剧情、生成分章，也不会凭空补出正式名称。

## 第二步：获取章节名称

先保留已经核对过的时间点，再找与该发行版对应的名称。只有名字缺失时，通常只补名字，不需要顺便替换整套时间点。

### 优先看原盘菜单与随碟资料

在能正常运行该碟菜单的播放器里，进入 Scene Selection / Chapter Selection，逐页记录名称。随碟小册子、发行方资料或唱片曲目表，也可能提供对应信息。

留意菜单是否分了多页、是否含额外的片头或片尾章节，以及不同语言菜单的排序是否一致。不能只抄第一屏，也不要把花絮菜单上的标题混进正片。

如果用截图或 OCR 辅助录入，最后仍需人工核对拼写、标点、页序和章节序号。OCR 识别出的文字不会自动与章节时间对应。

### ChapterDB 可以作检索线索

旧教程常提到 ChapterDB。截至本文核对时，公开可用的 [ChapterDB 存档][chapterdb]明确说明：它是原 `chapterdb.org` 的**只读存档，不能编辑**，不应再按仍可正常投稿的实时数据库介绍。

检索到条目后，至少比较片名、发行版本、时长、章节数量和若干关键时间点。同片名的院线版、导演剪辑版、不同地区发行版，可能使用不同分章；DVD 的章节与蓝光也未必一致。

社区条目只能作为线索。确认名称可以对应当前版本时，可以只借用名称，继续使用从当前片源提取的时间；不要因为找到一份现成 XML 就整份覆盖。

### 没有正式名称时怎么办

保留“第 01 章”“第 02 章”这类编号即可，也可以按自己的用途命名。自行概括的剧情标题应与发行方正式名称区分，避免写成“官方章节名”。

如果是演唱会，曲目表也需要核对实际视频中的开场、串场、返场和谢幕。音频专辑的曲序与时长不能直接当作演唱会视频的章节表。

## 用 igstools 提取蓝光菜单图片

菜单播放不方便时，可以尝试从菜单图形里找名称。[igstools][igstools]是一个较早的蓝光 **IGS（Interactive Graphics Stream，交互图形流）**解析工具，支持将相关菜单图形导出为 PNG，也支持直接读取包含 IGS 的 M2TS。

**它提取的是菜单图片，不是自动生成章节文件，也不会替你 OCR 或匹配时间点。** 其解析入口查找的是 IGS 流，不能把它当成适用于任意 BD-J 菜单的通用截图工具。

### 在独立 Python 环境中安装

这是旧项目，安装方式需要结合当前 Python 与 pip 核对。Windows 可以在一个工作目录中建立独立环境，再安装所需依赖和工具：

```powershell
py -3 -m venv .venv-igstools
.\.venv-igstools\Scripts\python.exe -m pip install setuptools wheel pypng
.\.venv-igstools\Scripts\python.exe -m pip install --no-build-isolation "https://github.com/SAPikachu/igstools/archive/refs/heads/master.zip"
```

这里先装 `pypng`，再关闭该次安装的构建隔离，是因为项目的旧 `setup.py` 在准备包信息时就会导入依赖 `png` 的模块。它针对的是这个旧项目的打包方式，不是所有 Python 工具都要照抄的安装参数。旧文中的 `python setup.py install` 也不再作为推荐入口，见 [Python Packaging 的说明][python-packaging]。

上述安装流程已在 Python 3.12 环境验证到命令行帮助正常运行；具体原盘能否提图，仍需用其中的菜单流确认。

### 导出并辨认名称

下面用 `00006.m2ts` 演示命令，文件编号**不对应每张碟的菜单**，应换成当前原盘里确实含有菜单 IGS 的文件：

```powershell
.\.venv-igstools\Scripts\python.exe -m igstools "Disc\BDMV\STREAM\00006.m2ts"
```

工具会在输入文件所在目录导出 PNG，文件名带有页面、按钮状态等信息。普通、选中和激活状态可能产生多张相似图片，并不是每张图片都代表一个新的章节。

逐页找到章节名称后，按菜单中的顺序人工核对，再填进已有的章节列表。只修改名字时，保留原有时间点。

Windows 资源管理器里“没有缩略图”并不能可靠判断某个 M2TS 就是菜单。如果工具报找不到 IGS、导出图里没有名称，或者该碟使用其他菜单结构，应回到实际菜单播放或其他资料核对；不要把报错一律关闭忽略。

这套方法也不会从一份普通正片 REMUX 中还原已经没有保留的原盘菜单。

## 第三步：修改名称与时间

### 简单章节文本怎么写

普通 OGM 风格章节文本由成对的时间与名称组成。下面是虚构示例，不对应实际影片：

```text
CHAPTER01=00:00:00.000
CHAPTER01NAME=片头
CHAPTER02=00:05:12.480
CHAPTER02NAME=第一次见面
CHAPTER03=00:10:30.000
CHAPTER03NAME=出发
```

按 **UTF-8** 保存，使用半角数字、冒号、点和等号。时间中的 `.480` 表示 480 毫秒，不是第 480 帧；`HH:MM:SS.mmm` 也不能与 `HH:MM:SS:FF` 形式的帧时间码直接混用。

编号与名称要一一对应。对于这里讨论的普通单层章节，时间应按顺序排列，并落在影片的有效时长内；想让开头也能方便跳转，通常会保留一个从 `00:00:00.000` 开始的章节。

名称含中文并不等于文件自动带上了中文语言标记。需要明确语言、多语言标题或保留复杂结构时，使用章节编辑器和 XML 更合适。

### 用现有编辑工具修改

- **MKVToolNix 章节编辑器**：适合直接打开 MKV、MPLS 或章节 XML，修改时间、显示名称和语言，再保存为 XML。已有嵌套、Edition、UID 等信息时，优先在原结构上改动。
- **ChapterTool**：适合集中填写名称、调整时间和转换章节格式。当前项目提供桌面、命令行和浏览器版；桌面读取 MKV 依赖 `mkvextract`，读取部分通用媒体依赖 `ffprobe`。浏览器版可处理 TXT、XML、MPLS 等文件，但不能调用这些本机程序，不要把桌面版的全部媒体读取能力套到网页版上，见[项目说明][chaptertool]。
- **chapterEditor**：现有目录中的另一套章节工具，包含格式编辑、时间处理及多版本 Matroska 相关功能。普通章节编辑与多版本封装是不同任务，按[工具说明][chaptereditor]选择所需功能即可。

如果保留同一章的中英文名称，要看工具能否保存多个带语言标记的标题；简单文本只能写一个名字时，也可以写成“中文名 / English Title”。播放器是否按语言选择名称，仍取决于它对章节的支持。

### 全片固定偏移

如果两个文件内容相同，只是开头多了一段片头，章节可能只需要整体平移：

```text
新时间 = 原时间 + 偏移量
```

例如，当前视频在前面新增了 8 秒内容，原来 `00:05:12.480` 的章节就对应 `00:05:20.480`。同时考虑是否要给新增开头保留一个从零开始的章节。

如果切掉开头 8 秒，则向前移动；落到零之前的标记不能照原样保留。调整后抽查片头、中段和结尾，确认偏差确实始终相同。

### 只有播放速度真的改变，才按比例缩放

同一批画面帧若从 24 fps 加速到 25 fps 播放，时间会缩短：

```text
新时间 = 原时间 × 24 / 25
01:00:00.000 → 00:57:36.000
```

**仅仅看到两个文件的帧率不同，不能直接套这个公式。** 补帧、重复帧、去交错或重新编码后，影片总时间线仍可能保持不变；这时章节不应随意缩放。

如果前半段能对上，后半段突然出现固定偏差，更可能有删减、加长或插入内容。需要分段对照画面调整，不能用一次整体平移或比例变换解决所有剪辑差异。

## 第四步：写入 MKV 或蓝光结构

先分清目标：**生成新 MKV、修改已有 MKV，还是输出蓝光目录 / ISO**。MKV 的章节保存在 Matroska 容器里，蓝光的章节跳转点则与 MPLS 播放列表有关；修改外置 `chapters.txt` / `chapters.xml` 并不会自动更新其中任何一种成品。

### 图形界面重新封装

用 MKVToolNix GUI 的混流器处理普通电影时，可以按以下顺序操作：

1. 加入源 MKV，确认需要保留的视频、音轨、字幕和附件。
2. 在输入项目中禁用源文件的旧章节；不同界面的显示方式可能是章节条目或复制章节选项。
3. 在输出设置的章节文件选项中选择编辑后的 XML / TXT；使用简单文本时核对字符集与章节语言。
4. 指定一个新的输出文件名，开始混流。

替换章节时要避免同时带入旧章节和新章节。[mkvmerge 手册][mkvmerge-chapters]说明，从多个来源读入的章节通常会分别形成 Edition，并不会自动替你把时间和名称配好。

这一步是重新封装，不是重新压制视频。文件仍要重新写出，所以大体积 REMUX 需要相应磁盘空间和读写时间。

### 命令行重新封装

使用编辑后的 XML：

```sh
mkvmerge -o "movie.chaptered.mkv" --no-chapters "movie.mkv" --chapters "chapters.xml"
```

`--no-chapters` 放在对应输入文件前，表示不复制该输入的旧章节；`--chapters` 再读入编辑后的章节文件。输入与输出使用不同文件名。

如果使用上面的简单文本，并希望将章节名称标为简体中文：

```sh
mkvmerge -o "movie.chaptered.mkv" --no-chapters "movie.mkv" --chapter-charset UTF-8 --chapter-language zh-Hans --chapters "chapters.txt"
```

`--chapter-charset UTF-8` 明确按 UTF-8 读取文本，避免无 BOM 中文文件被按系统默认编码解释；它与 `--chapter-language` 都应位于对应的 `--chapters` 前。XML 自身可以保存每个名称的语言，不能把语言参数当作覆盖所有 XML 语言标记的通用办法。

### 只改章节：先复制，再原地写入

`mkvpropedit` 可以直接修改已有 Matroska 文件，不必完整重新混流。但它**会写入指定的那个文件，且 `--chapters` 替换的是整组章节**，并非只追加几个名称。

例如，在 Windows PowerShell 中先复制一份，再修改副本：

```powershell
Copy-Item -LiteralPath "movie.mkv" -Destination "movie.chaptered.mkv"
mkvpropedit "movie.chaptered.mkv" --chapters "chapters.xml"
```

目标文件名应选择尚未使用的名字，避免覆盖已有成品。先复制仍需完整的文件空间与复制时间，只是之后的章节编辑无需重新封装音视频。

MKVToolNix 章节编辑器中的“保存到 Matroska / WebM”也会直接修改选中的现有文件。要保留原文件，就对副本操作；要生成新文件，则使用前面的混流流程。具体行为以 [mkvpropedit 手册][mkvpropedit]和当前 GUI 的保存选项为准。

### tsMuxer：生成蓝光结构时写入章节

[tsMuxer][tsmuxer]适合在重新封装音视频时生成带章节的新蓝光结构。它的章节列表处理的是**时间点**，没有 MKVToolNix 那样的名称与语言编辑功能，也不会把 MKV 中的章节标题自动做成蓝光菜单。

在 tsMuxer GUI 中，可以按以下步骤处理：

1. 在 **Input** 中加入正确的 `.mpls`，或已经带章节的 MKV。原盘优先加载播放列表；单独添加某个 `.m2ts`，读不到它所属 MPLS 中的章节。工具能够识别的章节会进入自定义列表，仍需核对数量和时间，尤其不要默认复杂 MKV 中的所有 Edition 都会保留。
2. 输出选择 **Blu-ray folder、Blu-ray ISO 或 AVCHD**，再进入 **Blu-ray** 页的章节设置。只选择 **M2TS muxing** 不会生成承载这些章节的 MPLS，不能把单个 M2TS 文件当作完整章节成品。
3. 需要沿用或修改现有分点时，选 **Custom chapters list**，每行填一个 `HH:MM:SS.mmm` 时间。不要把 `CHAPTER01=`、`CHAPTER01NAME=` 或整段 XML 直接粘进去。
4. 如果只是人工生成等间隔导航点，选 **Insert chapter every** 并填写分钟数，例如 5 表示每隔 5 分钟；**No chapters** 则不设置这份章节列表。这些选项不能恢复缺失的发行版分章。
5. 输出到新的目录或 ISO，完成后重新读取生成的 `BDMV/PLAYLIST/*.mpls`，核对时间点，并以蓝光目录 / ISO 方式播放检查跳转。

例如，前面的三章在自定义列表中只填写：

```text
00:00:00.000
00:05:12.480
00:10:30.000
```

在 GUI 中是一行一个时间；保存为 `.meta` 时，对应的参数使用分号连接，[官方使用文档][tsmuxer-usage]给出了格式：

```text
MUXOPT --blu-ray --custom-chapters=00:00:00.000;00:05:12.480;00:10:30.000
```

这只是 `.meta` 的首行示例，后面还需要实际音视频轨道配置，不是一份可以直接执行的完整工程。`--auto-chapters=5` 则对应每隔 5 分钟添加章节。

如果同一次封装还在 **Split & cut** 中设置了 `Cut start`，tsMuxer 会在生成 MPLS 时从章节时间中减去裁切起点；这里应使用裁切前源文件的时间点，避免手工先减一次、工具再减一次。裁切后还要确认新片头是否保留了零起点章节。若输入视频已经在其他工具中裁好，章节应对应那个新文件的时间线。

**新建蓝光结构不等于保留原盘交互菜单。** tsMuxer 不会仅靠一份章节时间列表还原原来的选单、按钮与 BD-J 导航。原有章节名称可以继续保存在 XML / TXT 中供 MKV 版本使用，但不能假定它们也出现在新蓝光菜单里。该 tsMuxer 项目已停止开发，版本状态与限制以[仓库说明][tsmuxer]为准。

### BDFix Pro：重制现有蓝光时保留和复核章节

这里说的是 **Defsoft 的 BDFix / BDFix Pro 蓝光重制工具**。旧[产品资料][bdfix-info]介绍了对未加密 HDMV / BD-J 结构进行处理、按 M2TS 或 MPLS 模式替换轨道、输出新 BDMV 等用途。[公开的 BDFix Pro 重制示例][bdfix-guide]也展示了打开 BDMV、调整轨道、Build 输出及回放检查的流程。它更适合放在现有原盘的重制流程里，而不是作为 MKV 章节文本编辑器使用。

处理章节时，可以把它与前面的工具这样衔接：

1. **先记录原章节**：用 BDInfo 确认目标 MPLS、时长与所引用片段，再用 MKVToolNix 章节编辑器或 ChapterTool 保存对应章节。保留一份原盘副本，输出选择新目录。
2. **按正确播放列表重制**：需要处理完整节目时，结合 BDFix 的 MPLS 模式选择对应列表，再进行所需的音轨、字幕或片段调整。不能把一个被多个播放列表引用的 M2TS，与整部影片的所有版本视为同一对象。
3. **按时间线变化检查章节**：如果只替换音轨或字幕、正片时间线未变，应重点确认原章节分点仍然保留；如果调整了片段入点、出点或顺序，就要重新核对所有受影响的分点，不能只看章节数量相同。
4. **重读输出的 MPLS**：把重制结果的播放列表重新交给章节编辑器读取，与原记录逐项比较；再从蓝光菜单进入正片，检查选章、上一章与下一章是否正常。

[BDFix 的公开历史记录][bdfix-history]曾列出“直接修改 M2TS 的入点 / 出点”和“重设无效播放列表标记（Reset invalid playlist mark）”。这说明重制时需要留意章节标记与片段范围的关系，**不能把“修复无效标记”理解成自动恢复原版分章，更不能据此推断菜单上的名称也会同步修改**。

这份历史记录来自旧版 BDFix 的免费版资料页，不能直接套用成所有 Pro 版本的操作界面。公开资料尚不足以确认某个 Pro 版本支持通用章节 TXT / XML 导入、任意章节改名等功能，因此这里不写未经核实的按钮步骤；需要重新指定一整套分点时，可在前面的编辑器中整理，再按 tsMuxer 的新建蓝光流程使用。

原盘菜单里的章节名或按钮如果来自图形、BD-J 逻辑，改变 MPLS 标记不会自动重画菜单。旧资料列出的支持范围也不足以证明它能完整处理 UHD、HEVC 或 Dolby Vision，不能仅凭“支持蓝光”就套到所有 UHD 原盘上。

## 第五步：检查最终文件

写入成功只说明工具完成了操作，还需要看章节是不是落在预期位置。

MKV 成品先用 MediaInfo 或重新打开章节编辑器确认章节数量、名称、语言和时间点。也可以从成品再提取一次 XML：

```sh
mkvextract "movie.chaptered.mkv" chapters "chapters-check.xml"
```

蓝光目录 / ISO 则重新检查目标 `BDMV/PLAYLIST/*.mpls`。只播放其中的 M2TS，不能验证播放列表章节或原盘菜单的选章行为；保留菜单的重制结果尤其需要从菜单进入检查。

接着用实际观看的播放器检查：

1. **列表完整**：有没有旧章节与新章节重复出现，是否出现不需要的多个 Edition。
2. **名称正确**：中文、英文与特殊字符是否正常，顺序是否和菜单对应。
3. **位置正确**：抽查开头、中间、结尾，以及调整过或跨分支的章节，观察是否跳到对应场景。
4. **播放正常**：音画同步、字幕、所需轨道与 HDR 播放状态是否符合预期。HDR 相关检查见[第二篇](/posts/2026-10-10-understanding-hdr/#diy-时哪些信息不能随便丢)。

播放器的跳转实现可能受关键帧与解码策略影响。轻微的落点差异不应立即通过修改章节时间“补偿”；可以换一个播放器交叉核对，再判断是章节本身还是播放器寻址行为。

## 几种容易混淆的情况

| 情况                              | 应怎样理解                                                                 |
| --------------------------------- | -------------------------------------------------------------------------- |
| 给 MKV 加了章节，却没有蓝光菜单   | 章节列表与原盘交互菜单是不同结构；普通章节不会还原菜单按钮、动画或导航逻辑 |
| 想给无章节影片每 5 分钟加一个标记 | 可以用工具生成等间隔章节，但那是人为添加的导航点，不是恢复发行版分章       |
| XML 转成 TXT 后少了信息           | 简单文本无法完整表达 XML 中的多语言、层级、Edition 等内容；保留原 XML      |
| 片名相同，章节却越往后越不准      | 核对剪辑、片头、播放速度和时间线，不要只比文件名或章节数量                 |
| 修改章节后，整个 MKV 的哈希变了   | 文件内容确实发生了变化；全文件哈希改变不能单独证明视频被重新编码           |
| 想把 MKV 命令直接用于 MP4         | 本文的 MKVToolNix 命令针对 Matroska；MP4 的章节结构和工具支持另行确认      |

**Ordered Chapters（有序章节）**还可能参与播放顺序、片段组合与跨文件引用，不能当作普通跳转标记随意展开成一份 TXT。带有多版本、外部引用或与章节 UID 关联标签的文件，应保留其结构和对应关系，再按专门流程处理。

FFmpeg 使用的 `FFMETADATA1` 章节文本也不是这里的 OGM 文本；它有自己的 `[CHAPTER]`、`TIMEBASE`、`START`、`END` 等字段，见[官方元数据格式说明][ffmpeg-metadata]。扩展名同样是 `.txt`，并不代表可以直接互换。

下一篇[蓝光原盘 Remux](/posts/2026-10-10-blu-ray-remux/)，把章节与视频、音轨、字幕一起整理，并说明 Dolby Vision 原始数据保留和兼容转换的区别。

## 参考资料

- [MKVToolNix：mkvextract][mkvextract]、[mkvmerge 的章节说明][mkvmerge-chapters]、[mkvpropedit][mkvpropedit]：提取格式、MPLS 读取、章节导入与原地替换。
- [MKVToolNix 章节编辑器源码][mkvtoolnix-editor]：可打开的文件类型，以及保存为 XML、写回 Matroska 的区别。
- [Matroska 章节规范][matroska-chapters]：章节、Edition、语言与有序播放结构。
- [MakeMKV][makemkv]、[DGDemux 资料页][dgdemux]：节目转换、章节保留与分流。
- [tsMuxer 项目][tsmuxer]与[使用文档][tsmuxer-usage]：蓝光输出、自定义章节时间与自动分章参数。
- [BDFix 历史产品资料][bdfix-info]、[版本记录][bdfix-history]与[公开重制示例][bdfix-guide]：旧版重制能力、入出点、无效播放列表标记处理及 BDMV 操作流程；不作为所有 Pro 版本的完整功能说明。
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
