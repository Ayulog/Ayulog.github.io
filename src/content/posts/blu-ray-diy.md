---
title: 蓝光原盘 DIY：tsMuxeR、BDFix Pro、KITe UHD 与大金
description: 在现有 BDMV 上换音轨、加字幕，或用 tsMuxeR、KITe、Scenarist 重建蓝光结构并对应菜单。
author: Ayulog
pubDatetime: "2026-10-11T10:00:00+08:00"
draft: false
category: diy
tags:
  - 蓝光
  - tsMuxer
  - BDFix
---

前一步的[蓝光原盘 Remux](/posts/blu-ray-remux/)把节目整理成 MKV；要改蓝光目录本身，则给原盘加入音轨或字幕，或者从音视频素材重新制作 BDMV，并让章节、菜单和轨道选择对应起来。

四条路线按工具区分：**tsMuxeR 制作新结构、BDFix Pro 修改已有原盘、KITe UHD 导入工程后混流、Scenarist BD 从素材编排蓝光**。“大金”指 Scenarist BD；UHD 制作另有 Scenarist UHD，是另一个版本。

公开资料核对日期为 **2026 年 10 月 11 日**。BDFix Pro 的可用资料主要是历史产品说明；KITe 的旧界面与当前官网版本也有差异。以下流程按公开资料整理，没有用这四套软件分别完成实盘制作。

## 四条路线怎么选

| 工具                     | 适合的起点和目标                                         | 需要另外处理的部分                                   |
| ------------------------ | -------------------------------------------------------- | ---------------------------------------------------- |
| tsMuxeR                  | 已有音视频、字幕或播放列表，制作正片为主的蓝光目录或 ISO | 不会在重新混流时自动恢复原菜单和导航                 |
| BDFix Pro                | 已有可读取的 BDMV，替换或追加音轨、字幕                  | 菜单文字、按钮与新增轨道的对应；旧版兼容范围         |
| KITe UHD Authoring Suite | 导入已有 BD / UHD，编辑素材、Clip 和播放列表后输出       | 所购版本和附加功能、字幕资产格式、局部混流的关联文件 |
| Scenarist BD / UHD       | 从素材建立或重做完整盘片工程                             | 素材规范、菜单设计、按钮命令与完整导航逻辑           |

**无损混流不等于原盘结构完全保留。** 视频可以没有重新编码，播放列表、时间戳、轨道编号和菜单关联却已经变化。只需要一个方便播放的文件时，MKV Remux 更直接；确实要保留或制作光盘菜单时，再进入下面的结构编辑。

## 动手前：目录与素材

先用 BDInfo、MediaInfo 和完整原盘播放确认目标 MPLS，记录它引用的片段、播放次序、时长、章节和轨道。最大的 M2TS 只提供线索：同一段视频可能被多个版本共用，多段拼接的正片也可能分布在许多文件中。目录关系见[认识蓝光碟片](/posts/understanding-blu-ray/)。

把工作目录分开，避免工具输出覆盖唯一的一份素材：

```text
source-disc/       原始盘片备份
work-disc/         用于结构修改的完整副本
assets/            新增音轨、字幕、章节
project/           工程和拆分素材
output-disc/       生成的成品
```

这些是用途示例，实际路径在软件里分别指定。KITe 拆盘的目标工程目录尤其要使用独立空目录；某些旧版导入流程会清空目标目录。涉及写入的工作副本先退出播放器、媒体扫描和做种程序，避免文件占用。

新增音轨、字幕必须与**所选影片版本的时间线**一致。固定偏移和随播放逐渐累积的偏移是两种问题，不能都靠填一个 delay 解决。字幕处理见[字幕的处理](/posts/subtitle-workflow/)，分章见[章节的处理](/posts/media-chapters/)。ASS 的字体与特效也不会因为封装进蓝光就自动得到保留，需要先准备工具接受的蓝光字幕资产。

以下步骤以软件能够读取的盘片文件为前提；受保护实体碟的读取还取决于光驱、读取软件和当前支持情况。

## 一、tsMuxeR 制作蓝光结构

### 版本与教程入口

[justdan96/tsMuxer][tsmuxer-original] 已归档，最终版为 **2.7.0 Final**。它的[使用说明][tsmuxer-usage]仍可用来查 MPLS 输入、蓝光输出和章节参数。另有继续演进的社区分支 [teaching-droid/tsMuxer][tsmuxer-fork]；选择安装包时要分清仓库和版本，不把一个分支新增的功能套到另一版 GUI 上。

先按传统 tsMuxeR GUI 的新建流程走一遍。它适合把选定的节目混成新结构，生成的是新的播放结构，原盘菜单不会随之出现。

### 加入素材并输出

1. **加入视频或已确认的 MPLS**。已有原盘时优先从目标播放列表开始，核对工具实际列出的片段和时长。多段影片不要随意按文件名排序后拼接。
2. **选择需要保留的轨道**。检查视频编码、音频格式和语言，取消不需要的轨道，再添加已校准时间线的新音轨或字幕。
3. **检查音频选项**。需要保留 TrueHD、DTS-HD 等原轨时，别误选只保留 AC-3 兼容音轨或 DTS 核心的选项；输出后再确认编码和扩展信息。原版对 TrueHD 配套的 AC-3 兼容部分也有要求，不能默认从 MKV 分出的独立 TrueHD 在所有版本中都能直接混流。
4. **设置字幕**。PGS / SUP 是常见输入；使用说明也支持 SRT 的图形字幕渲染，但需检查字体、断行、位置和画面尺寸。复杂 ASS 应先完成渲染，不能把 SRT 路线当作完整 ASS 特效渲染器。
5. **设置章节**。在 `Blu-ray` 页选择自定义章节时间，或按需要等间隔分章。章节时间点不包含原菜单里的章节名称和按钮。裁切与章节起点的关系见[tsMuxeR 章节说明](/posts/media-chapters/#tsmuxer生成蓝光结构时写入章节)。
6. **选择输出**。用 `Blu-ray folder` 生成到新的输出目录，或选择对应版本支持的 `Blu-ray ISO`。完成后先检查日志，再用支持蓝光目录的播放器打开成品。

HEVC、UHD、HDR 和 Dolby Vision 要单独核对具体版本与输入结构。能识别 HEVC 只解决基础层读入，完整 DV 信息仍要看输出；原盘 Profile 7 保留 BL+EL+RPU，MKV 用的 Profile 8.1 兼容副本不能代替它。

新分支还提供[完整 BDMV 打包 ISO][tsmuxer-iso]的专门流程：将已有目录原样放入 ISO，不重新混流。这类操作可以保留输入目录中已有的菜单文件，但不会修复已经损坏的导航，也不会给无菜单的 BDMV 自动制作菜单。

### 给重混流后的盘恢复 IG 弹出菜单

这一步是**已有原盘的结构修复**，前提是原来的菜单文件和导航仍然保留在工作副本中。只拿到一份新生成的正片 BDMV，不能靠添加几个播放列表字段凭空还原原菜单。

IG 是 Interactive Graphics，交互图形；PG 是 Presentation Graphics，常用于字幕。两者不能互换。某些原盘把弹出菜单放在独立片段中，通过 MPLS 的 `SubPath` 及 `STN` 流表关联。tsMuxeR 重建播放列表后，如果这组关联丢失，正片仍能播放，弹出菜单却可能无法呼出。原项目的 [IG SubPath 功能请求][tsmuxer-ig]也讨论了这种情况，以及菜单命令对原导航初始化状态的依赖。

对于**原盘确实采用这种外置 IG 结构**的情况，可以用 [BDedit][bdedit] 对照检查：

1. 分别打开原盘备份和工作副本，进入 `PLAYLIST`，找到对应的正片 MPLS。先核对新旧主片段、时长和轨道，确认没有把其他影片版本拿来比较。
2. 在原 MPLS 查看 IG 对应的 `SubPath`、菜单片段编号、入出点及同步关系。确认工作副本保留了相应的菜单 M2TS 和 CLPI。
3. 在新 MPLS 恢复需要的 IG 子路径，并按实际目标片段设置关联。新旧时间线或编号不同，必须调整对应关系，不能整块照抄。
4. 在对应 PlayItem 的 `STN` 表恢复 IG 项，核对引用的子路径、流 PID 和语言。原盘有多语言菜单时，逐项检查实际需要的关联。
5. 保存到工作副本，从完整光盘入口测试弹出、关闭、按钮移动和轨道切换，再确认相关备份数据与修改一致。

这里没有通用的 `1400`、`1401` 或固定 Out time。它们只能来自当前盘实际的流与时间信息；也不是所有 IG 都通过独立 `SubPath` 挂载。原菜单和正片复用在同一个片段里的情况，应检查对应结构，不能照这套步骤额外加一条子路径。

BDedit 的[公开版本记录][bdedit]将 UHD BD、HDR 扩展和 Dolby Vision 子流支持列在 **0.44**，将 UHD 的 STN 修改相关扩展处理列在 **0.53**。动手前按这份记录核对手头版本具备的具体能力。

即使 `SubPath` 和 `STN` 已恢复，IG 按钮仍可能依赖 First Play 或其他 Title 初始化的 GPR 寄存器及导航命令，需要一并核对。恢复引用之后，完整盘的初始化和按钮逻辑仍要实际测试。

**BD-J 也不能默认直接换入新 MPLS。** 它使用 Java 应用参与导航，还可能依赖原来的播放列表编号、轨道顺序和其他结构。这里的 IG 修复步骤不能替代 BD-J 菜单的分析与测试。

## 二、BDFix Pro 替换和追加轨道

BDFix / BDFix Pro 是 Defsoft 的旧蓝光重制工具。[历史产品资料][bdfix-info]与[公开重制示例][bdfix-guide]能支撑打开 BDMV、选择 M2TS / MPLS、修改轨道再输出的流程。当前没有足够可靠的官方资料把某个旧 Pro 版本认定为通用 UHD、HEVC 或 Dolby Vision 工具，这里按旧版界面记录。

### 先选操作对象

打开工作副本的 `BDMV` 文件夹，核对目标节目。

- 单一片段承载整部影片时，可以在 `M2ts Tree` 中选中该片段，但仍要检查哪些播放列表引用它。
- 多段拼接或无缝分支影片，按确认过的正片列表进入 `Mpls Tree`，在完整播放顺序下处理轨道。

历史产品说明中的 MPLS 模式可接收对应完整节目的轨道，无需先按每个 M2TS 手工切割；素材须按所选播放列表的完整时间线准备，并核对所用 Pro 版本的具体行为。字幕可准备为 SUP / PGS。

通常所谓“肉酱盘”是在说正片被拆成很多段。目录里 M2TS 多也可能只是菜单和花絮占用了文件，判断时按播放列表看正片由哪几段组成。

### 替换、追加和输出

1. **核对原轨**。在 `Original tracks` 看清类型、语言和对应片段，记下打算替换的那一条。视频、音频和字幕不要选错。
2. **按目标选择替换或追加，以下两项不是必须连续执行**。
   - **替换原轨**：对目标轨右键选择 `Replace Track`，导入已准备的素材。常见做法是占用一条不需要的字幕轨，但菜单原有语言文字不会因此自动变成中文。
   - **追加新轨**：用 `New tracks` 区域的加号添加素材；添加字幕时可导入匹配的 SUP，确认出现 `PG(Subtitle)`，再核对 `Language` 与 `Delay`，中文字幕选择相应中文语言标记。追加和替换的影响不同：新增轨道后，菜单里还要另补入口。
3. **复核结果列表**。检查原轨保留情况、新轨位置、轨道顺序与语言，确认没有误删需要保留的高清音频或字幕。
4. **Build 到新目录**。输出一份新的蓝光文件夹，检查错误和警告，再从完整盘入口回放。章节、轨道选择和每个分支接缝都要检查。

旧版对音轨输入的要求不能靠扩展名猜。TrueHD 的无损部分和蓝光中配套的 AC-3 兼容部分需要按该版本的导入规则准备；不要把 TrueHD 简化成“和 DTS 一样提一个 core”，也不要靠把文件改成 `.thd` 或 `.ac3` 来转换格式。

替换轨道可以沿用原菜单入口，但原按钮文字、语言标记和实际轨道仍要相互对应。追加轨道后若只在播放器的轨道菜单里可选，而原盘菜单没有入口，说明混流与菜单编辑还没有一起完成。

## 三、KITe UHD 导入与混流

这里说的是 DVDLogic 的 **[KITe UHD Authoring Suite][kite]**。[官方新闻][kite-news]在 **2026 年 3 月 30 日**发布了 v3.1 的消息；旧教程里的 `KryptonITe.exe` 和 **1.7.0.9** 界面属于较早版本。官网列有 BD / UHD、HDR / SDR、HDR10+、Dolby Vision 等能力，但产品档位与附加授权不同，需按实际许可核对。

### 先准备它支持的字幕资产

[KITe 官方格式表][kite-features]列出的字幕输入有 **SST、BDN XML，以及 PES 配套 MUI**，没有把直接导入 SUP 列为通用输入。因此，不能默认把给 tsMuxeR 用的 SUP 原封不动交给 KITe。

旧流程常先用 Scenarist 生成可用的 PES 字幕资产，再加入 KITe；当前官方列出的 BDN XML / SST 也是可选输入，不必把“所有人都先装大金”当成前提。PES 还应保留工具要求的配套文件，SUP 改扩展名不会变成 PES。音轨同样要核对格式表，例如 TrueHD / Atmos 的配套输入与 DTS-HD 资产要求。

### 按旧版界面理解导入和混流

以 **1.7.0.9** 的界面名称说明流程，适合对照旧教程理解素材与片段的关系；当前版本按内置帮助调整菜单位置。

1. **Import BDMV**：源目录选工作副本的 BDMV，目标项目目录选独立空目录。旧界面提供 `Pre-demux, quick demux with virtual assets` 与 `Complete demux all assets`；按完整拆分路线学习时，选择后者并等待日志完成。
2. **查看 Assets**：按片段分组找到需要处理的素材，在对应组使用 `Add assets` 加入支持的音轨或字幕资产，检查语言和素材信息。
3. **挂到 Clips**：进入相应 Clip，用 `Add new stream` 将素材加入实际片段。素材只出现在 Assets 列表中时，还没有成为影片的一条轨道。
4. **检查播放列表**：确认引用该 Clip 的 PlayList / PlayItem 中，新轨有正确的流表关联。多片段节目还要核对各段的轨道排列与时间线。
5. **Partial Mux**：旧界面可从 `Mux → Partial Mux` 选择需要重新混流的片段。只有正片确实是一个 Clip、且改动仅限该 Clip 时，才可以把操作简化成“只勾选一个主片段”。
6. **核对生成文件并合回副本**：按输出日志确认受影响的 `.m2ts`、`.clpi` 和 `.mpls`，分别对应 `STREAM`、`CLIPINF`、`PLAYLIST`。相关备份数据也要保持一致，替换时连同 CLPI、MPLS 一起更新。

工具可以处理关联数据，成品仍需逐个检查实际使用的播放列表。多版本、无缝分支或复杂导航项目，不应凭“Partial Mux 成功”就覆盖原盘；改动范围不清楚时，先在完整工程中检查依赖关系，再选择输出方式。

## 四、大金 Scenarist BD 制作

[Scenarist BD][scenarist]用于 Blu-ray / BD3D 编著，Ultra HD Blu-ray 对应 **Scenarist UHD**。它的工作重点是建立轨道、片段、播放列表、菜单和导航工程；软件名称本身不会让不合规范的素材自动变得合规。

比较适合从[官方作者的 QuickStart Tutorial v1.1 公开存档][scenarist-tutorial]开始。文档为 **2022 年**版本，要求 Scenarist BD v2022 或更新版本，演示一张小型菜单盘的完整制作。它是官方教程的第三方存档，界面与安装环境应按手头版本对照。

### 先做一个最小工程

1. **准备资产**。准备符合目标盘规范的音视频、字幕与菜单素材。普通 MKV、SRT、ASS 并不是所有编著工具都能直接接受的输入。字幕按版本手册准备 PG 资产；BDN XML 与配套图像是应了解的制作路线。
2. **New Solution 与 New Disc Project**。建立解决方案和盘片工程，分开工程、临时文件和输出目录，将音视频导入 `DataTree`，先处理解析错误。
3. **生成 Clip 和 Playlist**。QuickStart 使用视频素材上的 `Generate → PlayList` 创建对应 Clip 与 Playlist，再向 Clip 加入音频。Clip 组织轨道，Playlist 组织播放的片段和次序，两者职责不同。
4. **加入字幕和章节**。把受支持的字幕资产挂到相应片段，在播放列表中安排章节，检查各轨时长、语言和起点。先让一小段正片正确播放，再继续增加菜单。

### 菜单和导航要分别完成

菜单图形负责显示，导航命令负责播放行为。只有背景和可高亮的按钮，点击后仍可能什么也不发生。

QuickStart 的菜单路线使用 Scenarist Designer 准备菜单资产，并在 `IG Editor` 设置按钮间的方向键导航、编码菜单。静态背景也需要按工具流程准备为可用素材。随后把菜单和影片接到 `Scenario Editor` 中：

- 建立 `FirstPlayback` 对应的 MovieObject，设置插盘后的第一条播放路径。
- 建立 `TopMenu` 的入口，让返回主菜单有明确去向。
- 为影片建立 HDMV Title 并关联相应 Playlist。
- 将菜单按钮连接到影片或章节，配置影片播完后的返回行为。
- 设置需要的音轨、字幕切换逻辑，并让按钮文字与轨道一致。

入门时先做“一个主菜单、一个播放按钮、一段影片、播放结束回菜单”的小工程，再增加章节页、音轨页和弹出菜单。不要一开始就用复杂商业盘测试所有功能。

### MUX 与原盘重编著的边界

工程检查通过后设置 MUX 输出，查看警告和错误，并生成适合本次验证的成品。QuickStart 里的测试盘、镜像和工厂交付设置属于不同输出条件，不应把某组勾选写成所有项目通用的配方。

旧资料还常提到 **BD Reauthor Pro + Scenarist BD**：前者负责把已有盘转换为可供后续处理的素材或工程，再进入 Scenarist。它和这里的“从零建立工程”不同，菜单、BD-J、无缝分支和元数据能否往返保留要逐项检查。要用这条路线，应先核对两套软件的版本与支持范围，再核对重建结果。

## 成品检查：媒体流与光盘行为

验证时要同时看媒体流和光盘行为。仅把 `STREAM` 中的主 M2TS 拖进播放器，只能证明其中部分媒体内容可以播放。

| 检查对象           | 实际检查方法                                                       |
| ------------------ | ------------------------------------------------------------------ |
| 完整盘入口         | 打开 BDMV 或 ISO，检查首次播放、主菜单、弹出菜单、返回与播放结束   |
| 播放列表和版本     | 对照源盘片段顺序、时长、章节；抽查每个保留的影片版本               |
| 新增音轨和字幕     | 既从播放器轨道菜单选择，也从原盘菜单选择，确认标签与实际内容对应   |
| 同步和接缝         | 播放开头、中段、片尾，并连续播放每个分支接缝前后                   |
| 字幕显示           | 检查位置、断行、字形、时间、强制字幕行为和黑边区域                 |
| HDR、DV 和高清音频 | 对照分析结果，在支持目标格式的实际播放链路上验证                   |
| 文件结构           | 核对 M2TS、CLPI、MPLS 及相关备份数据，确认不存在指向缺失文件的引用 |

普通软件播放器能播放视频，不等于它支持这张盘使用的完整菜单。反过来，一个播放器的菜单不工作，也不能马上认定是混流错误；需要在支持相应 HDMV / BD-J 功能的播放环境中定位。

保留工具版本、目标 MPLS、轨道改动表和输出日志。对新版本软件或复杂盘，先完成一个小样本的制作与回放，再处理整张盘。

## 教程与参考资料

- [tsMuxeR 原仓库][tsmuxer-original]与[使用说明][tsmuxer-usage]：传统混流、MPLS 输入、蓝光输出、字幕和章节参数。
- [tsMuxeR 社区分支][tsmuxer-fork]与[BDMV 打包 ISO 教程][tsmuxer-iso]：区分重新混流和将完整目录原样打包。
- [tsMuxeR 的 IG SubPath 讨论][tsmuxer-ig]：外置菜单关联丢失及导航初始化依赖。
- [BDedit 功能及版本记录][bdedit]：MPLS、SubPath、STN、IG 编辑及 UHD 相关支持记录。
- [BDFix 历史产品资料][bdfix-info]与[公开重制示例][bdfix-guide]：旧工具定位及打开 BDMV、轨道替换、输出的操作参考。
- [KITe 官方产品页][kite]、[格式与功能表][kite-features]及[界面说明][kite-screenshots]：当前产品范围、输入资产、Clip 与播放列表编辑。
- [Scenarist 官网][scenarist]与[QuickStart Tutorial v1.1 存档][scenarist-tutorial]：BD / UHD 的区别和小型蓝光菜单工程的完整入门练习。

[tsmuxer-original]: https://github.com/justdan96/tsMuxer
[tsmuxer-usage]: https://github.com/justdan96/tsMuxer/blob/master/docs/USAGE.md
[tsmuxer-fork]: https://github.com/teaching-droid/tsMuxer
[tsmuxer-iso]: https://github.com/teaching-droid/tsMuxer/blob/master/docs/BDMV_TO_ISO.md
[tsmuxer-ig]: https://github.com/justdan96/tsMuxer/issues/129
[bdedit]: https://www.videohelp.com/software/BDedit
[bdfix-info]: https://www.qweas.com/downloads/audio/multimedia-creation-tools/moreinfo-bdfix.html
[bdfix-guide]: https://home.gamer.com.tw/artwork.php?sn=5652920
[kite-news]: https://dvd-logic.com/
[kite]: https://dvd-logic.com/kite
[kite-features]: https://dvd-logic.com/kite/features
[kite-screenshots]: https://dvd-logic.com/kite/screenshots
[scenarist]: https://www.scenarist.com/
[scenarist-tutorial]: https://archive.org/details/scenarist-bd-quick-start-tutorial-v-1.1
