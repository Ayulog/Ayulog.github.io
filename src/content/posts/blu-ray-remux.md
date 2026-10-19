---
title: 蓝光原盘 Remux
description: 选定蓝光播放列表，提取音视频、字幕和章节，封装成 MKV，并处理 Dolby Vision 保留与转换。
author: Ayulog
pubDatetime: "2026-10-10T23:00:00+08:00"
modDatetime: "2026-10-11T16:00:00+08:00"
draft: false
category: diy
tags:
  - 蓝光
  - Dolby Vision
  - MKVToolNix
---

一张蓝光原盘里常有多条播放列表，Remux 的核心任务是先确认要保留的影片版本，再将其中的音视频、字幕和章节无损提取并封装成便于播放的 MKV。关于播放列表、HDR 与章节的基础原理，可参考[认识蓝光碟片](/posts/understanding-blu-ray/)、[认识 HDR](/posts/understanding-hdr/)和[章节的处理](/posts/media-chapters/)。

本文以 **Blu-ray / UHD Blu-ray → MKV** 流程为主，涉及的软件入口集中在[蓝光与媒体工具清单](/posts/media-diy-software/)，音频工具见[音频软件清单](/posts/audio-software/)。

## Remux 的目标与工作边界

**Remux（重新封装）**直接复制原盘中的压缩视频与音频码流，将容器从 M2TS 转换为 MKV，不经过视频解码与重编码。动手前可按保存目标决定处理深度：

| 目标                               | 处理方式                            | 关注重点                          |
| ---------------------------------- | ----------------------------------- | --------------------------------- |
| 保存整张碟的菜单、花絮和多版本结构 | 保存原盘目录或 ISO                  | 维持完整 BDMV 目录与导航结构      |
| 保存选定版本的原始音视频           | 提取该 MPLS 对应的节目，封装为 MKV  | 核对轨道、章节、HDR/DV 数据与同步 |
| 为特定设备制作兼容副本             | 按需增加兼容音轨，或转换 DV Profile | 记录具体改动，同时保留原始版本    |

以下分流与封装步骤均以**已解密、可正常读取的原盘文件**为前提；商业加密实体碟的读取要求见[实体碟播放链路与设备要求](/posts/understanding-blu-ray/#实体碟播放链路与设备要求)。

## 常用工具与当前版本

根据处理路线按需选用以下工具即可：

| 工具                        | 参考版本                          | 核心用途                                      |
| --------------------------- | --------------------------------- | --------------------------------------------- |
| [MakeMKV][makemkv-download] | 2.0.0（2026-09）                  | 选定节目，直接生成保留音视频、DV 与章节的 MKV |
| [MKVToolNix][mkv-news]      | 102.0（2026-09）                  | 直接读取 MPLS，或对分流轨道进行最终混流封装   |
| [eac3to][eac3to-release]    | 4.00 稳定版 / 4.01 测试版         | 分析播放列表、分流轨道与音频转换              |
| [UsEac3To][useac3to]        | 1.4.0（2026-10）                  | eac3to 的图形前端（需与 eac3to 版本配套）     |
| [DGDemux][dgdemux-release]  | Windows 1.0.0.86 / Linux 1.0.0.85 | 按播放列表分流，专长处理无缝分支与 UHD DV     |
| [dovi_tool][dovi-release]   | 2.3.4（2026-09）                  | 提取、合并和转换 Dolby Vision 码流与 RPU      |

注：**MKVToolNix 自 81.0 起已原生支持将蓝光双轨 Dolby Vision（BL + EL）自动合并为单条视频轨**（详见[官方更新记录][mkv-news]），无需再依赖旧版工作流手工提取合成。

## 第一步：确认正确的播放列表

先用 BDInfo 扫描原盘的 `BDMV/PLAYLIST/*.mpls`，确认准备处理的正片列表并保存报告：

1. **时长与版本**：核对剧场版、导演剪辑版、加长版或不同语种片头片尾对应的 MPLS 编号。
2. **片段组合**：查看 MPLS 引用的 M2TS 顺序，确认是否存在多段拼接或无缝分支（Seamless Branching）。
3. **视频规格**：记录编码格式、分辨率、帧率与 HDR 格式；UHD 杜比视界盘同时留意 2160p BL 与 1080p EL。
4. **音轨与字幕**：记下各条音轨和 PGS 字幕的语言、编码、声道数，区分正片原声、配音与评论音轨。
5. **章节信息**：确认章节数量与时间点对应当前剪辑版本。

面对多条时长相近的候选列表时，可配合支持蓝光菜单的播放器查看实际调用的 MPLS。确认列表后，**视频、音频、字幕和章节应统一从同一个 MPLS 提取**，并将输出目录与原盘目录分开存放。

## 第二步：选择提取路线

根据片源结构与修改需求，从以下三种提取路线中任选一种：

| 路线                     | 适用场景                                     | 后续衔接                           |
| ------------------------ | -------------------------------------------- | ---------------------------------- |
| MakeMKV 直接生成 MKV     | 快速提取完整节目、保留双层 DV 与无缝分支同步 | 用 MKVToolNix 修改轨道名或章节     |
| MKVToolNix 直接读取 MPLS | 原盘结构清晰，希望一步选轨并完成封装         | 输出后重点抽查分支接缝与同步       |
| DGDemux / eac3to 先分流  | 需单独处理音轨、外挂字幕或转换 DV Profile    | 将分流出的裸流交给 MKVToolNix 封装 |

### MakeMKV：先得到一份完整节目

1. 打开 MakeMKV，载入光盘、ISO 或原盘目录中的 `BDMV/index.bdmv`。
2. 在左侧展开节目树，对照第一步记录的 MPLS 编号、时长、片段数与章节数勾选目标正片。
3. 展开该节目，勾选需要保留的视频、音轨与 PGS 字幕（注意勾选 TrueHD / DTS-HD 完整无损轨）。
4. 指定新的输出目录，点击输出生成 MKV。
5. 如需进一步调整轨道顺序、名称、默认标记或章节标题，将该 MKV 拖入 MKVToolNix 整理。

### MKVToolNix：直接读取 MPLS

在 MKVToolNix GUI 的混流器中操作：

1. 点击**添加源文件**，选择已确认的 `BDMV/PLAYLIST/00800.mpls`（弹窗提示扫描其他播放列表时，若已确认版本可直接选**不扫描，仅添加此文件**）。
2. 在**轨道、章节及标签**列表中，勾选需要的视频、音轨、字幕和章节（蓝光双轨 DV 会自动合并显示为一条视频轨）。
3. 逐条选中保留的轨道，在右侧设置**语言**、**轨道名称**、**默认轨**与**强制显示**标记。
4. 切换到**输出**标签页，确认文件标题与章节设置，指定原盘目录之外的输出路径，点击**开始混流**。

若使用命令行，可先用 `-J` 查看轨道识别结果，再执行混流（将 `00800.mpls` 替换为实际列表）：

```sh
mkvmerge -J "disc/BDMV/PLAYLIST/00800.mpls"
mkvmerge -o "movie.remux.mkv" "disc/BDMV/PLAYLIST/00800.mpls"
```

### DGDemux：按播放列表分流

[DGDemux][dgdemux] 专为 Blu-ray / UHD 轨道分流设计，尤其适合处理包含无缝分支或多段拼接的原盘。在 DGDemuxGUI（以 Windows 1.0.0.86 为例）中操作如下：

1. 点击 **Disk / Browse** 选择原盘根目录或 `BDMV` 目录，在扫描出的列表中选中目标 MPLS。
2. 如遇多版本或首尾包含额外垫片的盘片，先点击 **Analyze** 检查各片段入出点；若需严格按 MPLS 窗口裁剪首尾，勾选对应的严格播放列表选项（对应命令行 `-strictpl`）。
3. 在轨道区勾选要导出的视频、音轨、PGS 字幕与 **Chapters**，设置 **Output folder** 与 **Output name**。
4. 若处理 UHD Dolby Vision 且希望在分流时直接合并视频流，同时勾选 BL 与 EL，并按需选择合并保留 P7（`-mergedv`）或转为 P8.1（`-mergedv81`，需在程序目录放置 `dovi_tool`）。
5. 保持默认的音频间隙修正（Gaps correction），点击 **Demux** 开始分流。

使用命令行时，先列出该 MPLS 下的流 PID，再指定 PID 与输出前缀（需预先创建 `work` 目录）：

```sh
DGDemux -i "disc/BDMV/PLAYLIST/00800.mpls"
DGDemux -i "disc/BDMV/PLAYLIST/00800.mpls" -o "work/movie" -demux 4113,4352,Chapters
```

**DGDemux 分流注意事项**：

- **音频同步**：DGDemux 在分流时已将音轨按视频时间线对齐，后续封装进 MKVToolNix 时无需再手动填写原盘的延迟值。
- **TrueHD 输出选项**：默认可能同时输出 `.thd`、`.ac3` 及复合流；若只需独立 TrueHD 裸流，可在命令行加入 `-thd 2`，并在封装时只添加所需的 `.thd` 文件。
- **HDR10+ 共存盘**：`-dvstrip` 参数会移除 HDR10+ 元数据，常规保留 DV 流程无需添加该参数。

### eac3to 与 UsEac3To：分析与音轨分流

eac3to 既能扫描原盘播放列表，也能按指定扩展名完成原样提取（Demux）或音频解码转换。

#### 1. 命令行扫描与分流

先扫描原盘目录，查看按时长排列的节目序号（如 `1)`、`2)`），再查看对应节目的轨道列表，或直接指定已知的 `.mpls`：

```sh
eac3to "disc"
eac3to "disc" "1)"
eac3to "disc/BDMV/PLAYLIST/00800.mpls"
```

查看轨道列表后，可按需选择**整套节目批量分流**或**单条轨道提取**（`-keepDialnorm` 用于保留杜比音轨原始对白归一化元数据）：

```sh
# 批量分流所有非隐藏轨道与章节
eac3to "disc/BDMV/PLAYLIST/00800.mpls" "work/movie.*" -keepDialnorm

# 按轨道编号单独提取（编号以实际扫描结果为准）
eac3to "disc/BDMV/PLAYLIST/00800.mpls" 3: "work/audio.thd" -keepDialnorm
eac3to "disc/BDMV/PLAYLIST/00800.mpls" 4: "work/audio.dtshd" -keepDialnorm
eac3to "disc/BDMV/PLAYLIST/00800.mpls" 8: "work/eng.sup"

# 仅在需要单独提取有损 DTS 核心轨时加 -core
eac3to "disc/BDMV/PLAYLIST/00800.mpls" 4: "work/eng.core.dts" -core -keepDialnorm
```

注：eac3to 3.60 起已集成基于 DGDemux 算法的 TrueHD 间隙修正；3.66 起新增 `-strictpl`（严格按 MPLS 入出点提取）和 `-auditpl`（仅分析播放列表）。

#### 2. 使用 UsEac3To 图形前端

打开 [UsEac3To][useac3to] 并确认已关联 `eac3to.exe` 路径，拖入原盘目录或 `.mpls` 文件，在 **Settings → Output Folder** 中设为自定义输出目录（**User defined**）：

| 操作目标           | 界面步骤                                                                                                          |
| ------------------ | ----------------------------------------------------------------------------------------------------------------- |
| 批量分流全部轨道   | 在 **Global parameters** 选择 `demux`，点击右侧 **RUN**                                                           |
| 按需提取指定轨道   | 在 **Track Input** 选轨道编号，在 **Output format** 选扩展名（TrueHD 需手动选 `thd`），点击 **Add** 后 **RUN CL** |
| 分流后直接混流 MKV | 在 **Settings** 指定 `mkvmerge.exe` 路径，逐条 **Add** 轨道后点击 **Run and MkvMux**                              |

## 音轨、字幕与延迟处理要点

### 音轨保留与兼容轨选择

Remux 优先保留原盘的原始无损或源码音轨，有设备兼容需求时再额外附加兼容副本：

| 来源音轨                    | 原样保留方式                                     | 常见兼容处理与影响                                         |
| --------------------------- | ------------------------------------------------ | ---------------------------------------------------------- |
| Dolby TrueHD / TrueHD Atmos | 提取并封装 `.thd` 完整码流                       | 解码为 FLAC / WAV 或转 AC-3 会丢失 Atmos 空间对象元数据    |
| DTS-HD MA / DTS:X           | 提取并封装 `.dtshd` 完整码流                     | 提取 `-core`（`.dts`）仅保留有损核心，丢失高清扩展与 DTS:X |
| LPCM                        | 分流为 WAV / W64 直接封装，或无损压缩为 FLAC     | 转 FLAC 时需核对位深（16/24-bit）、采样率与声道顺序        |
| AC-3、DTS、E-AC-3           | 直接提取封装（常见于评论音轨、配音或蓝光兼容轨） | 保持原编码直通，无需二次有损转码                           |

### 音频延迟（Delay）设置

分流日志或文件名中出现的延迟数值分为三类，封装时只需补偿尚未消除的时间差：

- **容器时间戳偏移**：MKVToolNix 或 MakeMKV 直接读取 MPLS 时，会自动根据源时间戳对齐，无需手动填延迟。
- **裸流剩余延迟**：使用 eac3to 等工具分流时，工具会自动修正可处理的音频帧延迟，若仍有剩余毫秒数会在日志及输出文件名中注明（如 `DELAY 80ms`），混流时按该数值填写一次即可。
- **无缝分支接缝修正**：由 DGDemux 或新版 eac3to 在分流阶段自动处理各片段接缝处的音频重叠与空隙。

### PGS 图形字幕与强制标记

蓝光原盘自带的 PGS 字幕（`.sup`）可直接封装进 MKV。在整理字幕轨时，需区分**整轨强制标记**与**轨内强制事件**：

- 某些原盘将外语对白翻译（Forced 字幕）单独做成一条字幕轨，可在 MKVToolNix 中将该轨设为“强制显示（Forced display）”。
- 另一些原盘将强制字幕事件混在完整字幕轨内部（仅部分字幕帧带 forced 标记），此时保持整轨为普通字幕即可，切勿将整条完整字幕轨设为强制显示。

## 第三步：处理 Dolby Vision

UHD 蓝光的 Dolby Vision Profile 7 由 **BL（基础层）、EL（增强层，含 MEL 或 FEL）和 RPU（动态元数据）**组成（详见[认识 HDR：杜比视界的 Profile、BL、EL 与 RPU](/posts/understanding-hdr/#杜比视界的-profileblel-与-rpu)）。在 Remux 阶段，可根据播放设备支持情况选择三种保存路线：

| 目标路线               | 封装后保留的数据            | 适用场景与数据变化                                          |
| ---------------------- | --------------------------- | ----------------------------------------------------------- |
| **保留原盘 Profile 7** | `BL + EL + RPU`（单轨双层） | 完整保留原盘 MEL / FEL 数据，供支持 P7 的播放器使用         |
| **转换 Profile 8.1**   | `BL + 转换后的 RPU`（单层） | 提升播放器/电视对单层 DV 的兼容性；会丢弃 EL（及 FEL 残差） |
| **仅保留 HDR10**       | HDR10 兼容基础层（BL）      | 不需要杜比视界时直接只封装 BL                               |

### 路线一：完整保留原盘 Profile 7

- **MakeMKV 或 MKVToolNix 直接读取 MPLS**：两者均会自动将 2160p BL 与 1080p EL 合并到 MKV 的同一条 HEVC 视频轨中，直接完成 Profile 7 封装。
- **DGDemux 分流**：勾选 `-mergedv` 时输出已合并的单文件 P7 HEVC，直接拖入 MKVToolNix 即可；若分流为独立的 `BL.hevc` 与 `EL.hevc` 两个文件，则先用 [dovi_tool][dovi] 合并为单条 P7 码流后再封装：

```sh
dovi_tool mux --bl "BL.hevc" --el "EL.hevc" -o "BL_EL_RPU.hevc"
```

### 路线二：制作 Profile 8.1 兼容副本

当目标播放端不支持 Profile 7、仅支持单层 Profile 8.1 时，可使用 `dovi_tool` 将 P7 转换为 P8.1（对于 FEL 片源，由于 [FEL 参与残差重建与 12bit 画面还原][dolby-authoring]，建议在制作 P8.1 副本的同时保留原版 P7 文件）。

若手里是已封装好的 P7 MKV，先提取完整视频流，再用 `dovi_tool -m 2 convert --discard` 丢弃 EL 并转换 RPU，最后替换回 MKV：

```sh
# 1. 查看视频 Track ID（通常为 0）并提取完整 HEVC 流
mkvmerge -J "movie.p7.mkv"
mkvextract "movie.p7.mkv" tracks 0:"BL_EL_RPU.hevc"

# 2. 用模式 2 转换 RPU 为 P8.1 兼容格式，并丢弃 EL
dovi_tool -m 2 convert --discard "BL_EL_RPU.hevc" -o "BL_RPU_P81.hevc"

# 3. 将新生成的 P8.1 视频流与原 MKV 的音轨、字幕、章节重新混流
mkvmerge -o "movie.p81.mkv" "BL_RPU_P81.hevc" --no-video "movie.p7.mkv"
```

注：`-m 2` 会将 RPU 转换为 Profile 8.1 兼容格式并移除 FEL 映射参数，`--discard` 用于剥离 EL 视频流。

### 跨片源 RPU 移植的前提条件

RPU 动态元数据与视频的每一帧严格绑定。若尝试将流媒体版（Profile 5 / 8.1）的 RPU 注入无 DV 的蓝光版视频，必须先核对两份视频的剪辑版本、帧率、片头帧偏移、画幅黑边像素（Active Area）以及基础调色是否完全吻合，并通过 `dovi_tool` 的编辑功能校准帧序与边距后再注入。

## 第四步：用 MKVToolNix 整理成品

完成轨道提取与杜比视界处理后，在 MKVToolNix 中将所有素材合成为最终 MKV。

### GUI 混流步骤

1. **添加轨道**：将视频、音轨和字幕拖入混流器，选择**添加为新源文件**（勿选“追加”）。裸 HEVC 视频流导入后，核对识别出的帧率（如 `24000/1001p` 或 `24p`）与 BDInfo 报告一致。
2. **填写轨道属性**：为每条音轨和字幕设置正确的**语言**与直观的**轨道名称**（如注明 `国语配音`、`粤语配音`、`导演评论`、`简英双语`），按需设置一条默认音轨与默认字幕。
3. **导入章节**：若直接读取 MPLS 或 MakeMKV 生成的文件，可直接保留内置章节；若需单独修改章节名称，可在 MKVToolNix **章节编辑器**中载入 `.mpls` 或 `.xml`，修改标题后另存为 `chapters.xml`，再在**输出 → 章节 → 章节文件**中载入，并取消勾选源文件自带的旧章节（详细操作见[章节的处理](/posts/media-chapters/#第四步写入-mkv-或蓝光结构)）。
4. **开始混流**：指定新文件名并输出，完成后确认底部任务日志无警告或错误。

### 命令行混流示例

将独立视频、音轨、字幕与章节文件混流为 MKV，并为第 0 号音频轨设置语言与 80 ms 延迟：

```sh
# 先查询输入文件的 Track ID
mkvmerge -J "audio.thd"

# 混流并指定该音频文件的语言与同步延迟（参数写在对应输入文件之前）
mkvmerge -o "movie.remux.mkv" "video.hevc" --language 0:en --sync 0:80 "audio.thd" "subtitle.sup" --chapters "chapters.xml"
```

有关命令行参数作用域与 Track ID 规则，详见 [mkvmerge 官方手册][mkvmerge]。

## 单个 MPLS 包含多集剧集时的切分方法

部分剧集蓝光盘将多集内容连在同一个 MPLS 播放列表中。若原盘未提供单集独立 MPLS，可利用章节时间点在 MKVToolNix 中按集切分。

1. 先播放原盘并对照章节列表，记下每一集开头对应的章节序号。例如共 4 集、每集占 4 个章节时，第 2、3、4 集的起始章节分别为第 `5`、`9`、`13` 章。
2. 在 MKVToolNix GUI 中载入该 MPLS 并选好轨道，切换到**输出 → 切割**。
3. **切割模式**选择**在章节之前**，**章节编号**填写 `5,9,13`（第 1 集从头开始，无需填写 `1`），取消勾选**链接文件**，点击**开始混流**即可生成 4 个独立的单集 MKV。

命令行对应写法如下：

```sh
mkvmerge -o "episode.mkv" --split chapters:5,9,13 "disc/BDMV/PLAYLIST/00800.mpls"
```

根据 [mkvmerge 切割说明][mkv-split]，按章节切割的切点落在目标章节时间点或其后的第一个视频关键帧（I 帧）之前；切分完成后，建议逐集抽查片头片尾过渡、音画同步与单集章节跳转。

## 第五步：检查文件与实际播放

混流完成后，结合 MediaInfo、工具检查与实际播放完成最终验收：

| 检查项       | 核对内容                                                                    |
| ------------ | --------------------------------------------------------------------------- |
| 版本与时间线 | 总时长、片段顺序、片头片尾与目标剪辑版本一致                                |
| 视频与 HDR   | 编码、分辨率、帧率正确；`HDR format` 显示预期的 HDR10 / HDR10+ / DV Profile |
| 音轨         | 编码格式、声道数、语言标记正确；TrueHD Atmos / DTS:X 扩展信息完整保留       |
| 字幕与章节   | 字幕语言、默认/强制标记及显示位置正常；章节名称、数量与场景跳转准确         |
| 分支接缝     | 定位到无缝分支拼接处连续播放，确认无画面卡顿、爆音或音画失步                |

对于 Dolby Vision 成品，除查看 MediaInfo 中的 `dvhe.07`（`BL+EL+RPU`）或 `dvhe.08`（`BL+RPU`）标识外，还可直接用 `dovi_tool` 提取 RPU 核对帧数与 Profile 汇总：

```sh
dovi_tool extract-rpu "movie.remux.mkv" -o "RPU.bin"
dovi_tool info -i "RPU.bin" --summary
```

确认成品播放正常后，再清理分流产生的临时中间文件。若后续还需要为影片搜集、OCR 校对或制作特效字幕，可继续阅读[字幕的处理](/posts/subtitle-workflow/)。

## 参考资料

- [MakeMKV 下载与更新记录][makemkv-download]：当前版本与发布变更。
- [MKVToolNix 更新记录][mkv-news]、[mkvmerge 手册][mkvmerge]与[章节切割说明][mkv-split]：蓝光双轨 Dolby Vision 合并、轨道选择、延迟与按集切分。
- [eac3to 发布资料][eac3to-release]、[eac3to Wiki][eac3to-wiki]与 [UsEac3To 作者帖][useac3to]：工具入口、参数和图形前端说明。
- [DGDemux 项目页][dgdemux]与[发布记录][dgdemux-release]：播放列表分流、无缝分支及 DV 处理。
- [dovi_tool 文档][dovi]与[版本记录][dovi-release]：Dolby Vision 合并、Profile 转换与 RPU 检查。
- [Dolby Vision UHD Blu-ray Authoring Workflow Guide][dolby-authoring]：MEL/FEL 的信号与重建关系。

[makemkv-download]: https://www.makemkv.com/download/
[mkv-news]: https://mkvtoolnix.download/doc/NEWS.md
[mkvmerge]: https://mkvtoolnix.download/doc/mkvmerge.html
[mkv-split]: https://mkvtoolnix.download/doc/mkvmerge.html#mkvmerge.description.split
[eac3to-release]: https://www.videohelp.com/software/eac3to
[eac3to-wiki]: https://en.wikibooks.org/wiki/Eac3to
[useac3to]: https://forum.doom9.org/showthread.php?t=145574
[dgdemux]: https://www.rationalqm.us/dgdemux/dgdemux.html
[dgdemux-release]: https://www.videohelp.com/software/DGDemux
[dovi]: https://github.com/quietvoid/dovi_tool/blob/2.3.4/README.md
[dovi-release]: https://github.com/quietvoid/dovi_tool/releases/tag/2.3.4
[dolby-authoring]: https://professional.dolby.com/siteassets/pdfs/dolby_vision_uhd_bluray_authoring_workflow.pdf
