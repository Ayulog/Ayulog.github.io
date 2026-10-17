---
title: 音频处理篇：音轨识别、提取与编码
description: 从 MediaInfo 识别蓝光与视频文件中的音轨，按用途选择直通、提取核心、无损转换或重新编码，并记录 QAAC 与 deew 的当前使用入口。
author: Ayulog
pubDatetime: "2026-10-11T10:00:00+08:00"
modDatetime: "2026-10-11T16:00:00+08:00"
draft: false
category: audio
tags:
  - 音频
  - 音轨
  - DTS
  - TrueHD
  - QAAC
  - Dolby
  - deew
  - Media
---

音频处理先要回答一个问题：**成品需要保留原始码流，还是要生成另一种编码？** 只把轨道从容器中取出、或在不改变编码的情况下重新封装，属于分流和封装；把 TrueHD 解码成 PCM，再编码为 DTS、AAC 或 Dolby Digital Plus，则是一次新的有损或无损转换。两条路线的输入、依赖和验收方式不同，不能只看文件扩展名判断结果。

这篇按“识别来源 → 选择路线 → 处理 → 封装 → 回看”记录常见做法。工具入口见[音频软件清单](/posts/audio-software/)，蓝光播放列表、分流与 Remux 的上下文见[蓝光原盘 Remux](/posts/blu-ray-remux/)。deew 的命令和依赖依据项目 README 于 **2026 年 10 月 11 日**核对；QAAC 的中文参数参考为 [NAZOrip 的教程](https://www.nazorip.site/archives/44/)，页面标题标注 **2026.8 更新**。版本、编码器和操作界面会变化，正式处理前仍要查看手头版本的帮助信息。

## 目录

- [先识别音轨](#先识别音轨)
- [按目标选择处理路线](#按目标选择处理路线)
- [DTS 系列：保留核心还是重新编码](#dts-系列保留核心还是重新编码)
- [TrueHD 与 LPCM：解码后的取舍](#truehd-与-lpcm解码后的取舍)
- [用 QAAC 编码 AAC 或 ALAC](#用-qaac-编码-aac-或-alac)
- [用 deew 编码 Dolby 音频](#用-deew-编码-dolby-音频)
- [封装与检查](#封装与检查)
- [容易混淆的情况](#容易混淆的情况)
- [参考资料](#参考资料)

## 先识别音轨

先用 [MediaInfo](https://mediaarea.net/en/MediaInfo) 或播放器的轨道信息查看真实编码。至少记录编码名称、声道布局、采样率、位深、码率、语言、轨道延迟和容器。文件名里的 `DTS`、`Atmos` 或 `5.1` 只能作为线索，不能代替轨道信息。

| MediaInfo 中常见的项目                                    | 处理时要关心的事情                                             |
| --------------------------------------------------------- | -------------------------------------------------------------- |
| DTS、DTS-HD MA、DTS:X、DTS-ES                             | DTS 核心与高清扩展是否都要保留，输出设备能否直通               |
| Dolby Digital（AC-3）与 Dolby Digital Plus（E-AC-3、DDP） | 容器和播放设备是否支持，是否要转为另一种有损格式               |
| Dolby TrueHD、TrueHD with Atmos                           | 是否保留无损码流；解码或转码后不会自动保留对象音频信息         |
| LPCM / PCM                                                | 未压缩音频的声道、位深和采样率，是否需要用 FLAC 保存或重新编码 |
| FLAC、AAC、ALAC、Opus                                     | 已经是编码后的文件，继续转为另一种有损格式通常会再损失一次     |

TrueHD 与 DTS-HD MA 是完整的音频编码，不要仅凭“有一个核心”就把两者当成同一种结构。DTS-HD 音轨可以包含可独立解码的 DTS core；TrueHD 在蓝光中可能伴随 AC-3 兼容部分，但它和 DTS core 不是同一套提取语义。是否保留兼容轨，取决于成品播放器与自己的用途。

确认输入来自同一个播放列表或同一次分流结果。视频、音频和字幕分别来自不同版本时，即使片长相同，也可能在分支接缝或片头出现延迟差异。先保存 MediaInfo 输出和原始日志，再开始转换。

## 按目标选择处理路线

可以把选择先写成一张小表，再决定工具：

| 目标                                    | 建议路线                                             | 结果与代价                                                         |
| --------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------ |
| 播放设备支持原轨                        | 直接封装或直通                                       | 不改变音频编码；只需检查容器、轨道标记与同步                       |
| 需要兼容 DTS 的成品                     | DTS-HD 取 DTS core，或把其他音频解码后编码为 DTS     | 取 core 不重新编码；其他来源转 DTS 会产生新的有损音轨              |
| 保存 LPCM 但减少体积                    | 解码或分流后转 FLAC                                  | FLAC 是无损压缩，仍需核对位深、声道和采样率                        |
| 生成 AAC 音轨                           | 用 QAAC 编码 AAC，或按用途使用 ALAC                  | AAC 有损；ALAC 用于无损保存，体积和兼容性取决于设备                |
| 生成 Dolby Digital / Dolby Digital Plus | 准备 Dolby Encoding Engine，再用 deew 组织输入与参数 | 需要独立的 DEE、许可文件、ffmpeg 与 ffprobe；deew 本身不携带编码器 |

“兼容性更好”不是默认的转码理由。先确认目标设备真正不能播放原轨，再用一小段素材试做，比较音量、声道顺序、同步和文件信息。不要把一次转换得到的码率或声道数当成所有片源的固定规则。

## DTS 系列：保留核心还是重新编码

### 在 MKVToolNix 中提取 DTS core

如果输入是 DTS-HD 音轨，而目标只需要有损 DTS 核心，可以在 MKVToolNix GUI 的音频属性中启用 **Reduce to core（仅保留核心）**，再进行混流。不同版本的界面文字可能略有变化，操作前确认选中的确实是 DTS-HD 音轨。

这一步是从 DTS-HD 中取出已有的 DTS core，不是把音频重新编码成 DTS。输出后用 MediaInfo 检查编码名称、声道、采样率和码率，再与输入日志对照。需要 DTS-HD MA 或 DTS:X 的场景不要勾选该选项，否则高清扩展会被丢弃。

### 用 eac3to 或 UsEac3To 转换

[eac3to](https://forum.doom9.org/showthread.php?t=125966) 负责分流与音频转换，[UsEac3To](https://forum.doom9.org/showthread.php?t=145574) 是便于选择输入、输出和参数的图形前端。GUI 的基本动作是：拖入已经确认的 MKV 或播放列表，读取信息窗口中的轨道编号，选择输出格式，加入命令后运行；运行结束先看日志，再检查生成文件。

例如，概念上可以把 TrueHD 转成 DTS：

```text
eac3to input.thd output.dts
```

如果源音频是 96 kHz，而目标编码器或成品要求 48 kHz，再显式加入重采样参数：

```text
eac3to input.thd output.dts -resampleTo48000
```

这两条命令只说明输入、输出与重采样的关系。TrueHD 到 DTS 需要可用的 DTS 编码器，具体依赖、授权和参数以当前 eac3to / UsEac3To 说明为准；不能因为 GUI 能列出轨道，就认为编码器已经安装。运行后至少检查输出的采样率、声道布局、码率和延迟。

LPCM 可以按需要转为 FLAC，例如：

```text
eac3to input.lpcm output.flac
```

无头 LPCM 的声道顺序、位深和采样率需要人工确认；如果输入信息不完整，先用 MediaInfo 或原盘轨道说明补齐条件。把 LPCM 转为 FLAC 是无损压缩，把它转为 DTS 则进入有损编码路线。

## TrueHD 与 LPCM：解码后的取舍

TrueHD / Atmos、DTS-HD MA / DTS:X 和 LPCM 都可能出现在蓝光中，但处理目标不同：

- 需要保留原始无损音频时，优先直接分流并封装原轨，不要为了统一扩展名先转 PCM。
- 需要兼容只支持 DTS 的设备时，先确认设备和发布目标，再把音频解码后编码为 DTS。转码后的文件不再包含原来的 Atmos 或 DTS:X 对象元数据。
- 96 kHz 源音频不应盲目重采样。只有目标编码器、设备或发布规范明确要求 48 kHz 时，才在转换步骤加入相应重采样，并在输出中复核。
- 只有声道数、位深和采样率都已确认时，才把无头 LPCM 当作可直接转换的输入。错误的声道顺序比体积变化更难在事后发现。

旧教程里常见的“所有次世代音频统一转 DTS”是特定工作流的取舍，不是音频处理的通用规则。现在更适合先保留原轨，另外生成兼容副本，再在最终封装时明确轨道名称和用途。

## 用 QAAC 编码 AAC 或 ALAC

[qaac](https://github.com/nu774/qaac) 是调用 Apple 音频组件的命令行编码工具，支持 AAC 与 ALAC。使用前准备与程序位数匹配的 Apple CoreAudio 组件，运行 `--check` 确认依赖能被找到；不要把 32 位和 64 位 DLL 混放，也不要把网页教程里某一版组件当成永久要求。

一个简单的 WAV 到 AAC 示例是：

```text
qaac64.exe --tvbr 91 -o output.m4a input.wav
```

`--tvbr` 的数字是质量挡位，具体挡位、封装方式、声道映射和输入格式以当前 `qaac --help` 为准。需要无损压缩时使用 ALAC 相关选项，不要把 AAC 的质量挡位套到 ALAC 上。输入是裸 PCM、管道或多声道文件时，必须额外确认采样率、位深、声道顺序与容器信息。

[NAZOrip 的 QAAC 音频编码器命令行参数教程](https://www.nazorip.site/archives/44/)整理了依赖准备、`qaac --check`、WAV / ffmpeg 管道输入、TVBR / CVBR / ABR、ALAC 与 `--normalize` 等入口，页面在 2026 年 8 月更新过。它适合查参数含义和示例；安装包、Apple 组件、编译工具链和旧版命令仍要结合当前 qaac 发布页与自己的系统重新确认。

QAAC 的编码模式解决的是 AAC / ALAC 输出，不会替代蓝光音轨的分流、DTS core 提取或 Dolby Encoding Engine。处理影视音轨时，把它当成目标明确的音频编码步骤，不要把它和封装工具混为一谈。

## 用 deew 编码 Dolby 音频

[deew](https://github.com/pcrlnd/deew) 是 Dolby Encoding Engine Wrapper，为 DEE 生成输入文件与 XML，并提供批量编码用的命令行界面。当前 README 的帮助示例为 deew 3.2.1，格式选项包括 `dd`、`ddp`、`ac4` 和 `thd`；版本更新后，以本地 `deew -h` 的输出为准。

### 准备依赖

README 列出的基础依赖是：

- Python（使用独立构建版时可不装）；
- `ffmpeg` 与 `ffprobe`；
- Dolby Encoding Engine。DEE 需要单独安装，并把 `license.lic` 放到对应的 DEE 程序目录；许可和下载入口以 Dolby 官方页面为准。

deew 可以用发行版安装，也可以在已有 Python 环境中安装：

```text
pip install deew

deew -c
```

第一次运行会生成配置文件；`deew -c` 用于查看配置及其路径，`deew -gc` 可重新生成配置。先检查 ffmpeg、ffprobe、DEE 和许可证路径，再处理正式素材。Windows、Linux、macOS 的 DEE 支持范围不同，TrueHD 编码尤其要按 README 的平台说明确认。配置中使用完整路径时，先用小样本测试，避免 PATH 或 WSL 路径转换造成误判。

### 先做一条 DDP

下面的命令来自 README 的使用示例，分别展示默认 DDP、指定码率与指定 DD：

```text
deew -i input.flac

deew -b 768 -i input.flac

deew -f dd -b 448 -i input.dts
```

`-i` 可以接文件或目录；第一次使用建议只处理一条输入，确认输出格式、声道、码率、延迟和日志后再使用批量目录。`-b` 的有效值由 DEE 的编码格式决定，可以用 `deew -lb` 查看当前 DD / DDP 可用码率，不要直接套用旧教程中的数字。

需要明确输出格式时写出 `-f ddp` 或 `-f dd`；要做立体声或 5.1 下混，使用 `-dm` 前先确认下混是目标需求，而不是把源音轨错误地当成声道数不足。deew 还会处理部分采样率转换、7.1 声道交换和 DEE 的编码延迟，但这些自动行为仍需用 MediaInfo、波形或实际播放检查，不能省略验收。

deew 只是包装层：它不提供 Dolby 编码器，也不替代 Dolby 的许可证。没有可用的 DEE 时，命令可能能够解析输入却无法完成编码；遇到 DLL、许可证或平台错误，先按 README 和 Dolby 文档排查依赖，不要反复更改码率掩盖环境问题。

## 封装与检查

音频编码结束后，先把新音轨当成独立产物检查，再交给 MKVToolNix 等封装工具：

1. **核对文件信息**：记录编码、声道、采样率、位深、码率、时长和延迟。对比源轨与目标轨，确认是否发生了预期的重采样、下混或声道映射。
2. **核对轨道来源**：视频、章节、字幕和音频尽量来自同一个播放列表或同一次处理结果。加入兼容副本时，用轨道名说明来源和编码，不要覆盖原始无损轨道。
3. **抽查同步**：播放开头、对白密集段、音乐段和片尾；有无缝分支时要在接缝前后连续播放。出现整体偏移时先查看工具日志里的 delay / gap，再决定是否需要调整。
4. **确认播放链路**：在实际电视、播放器、功放或软件播放器上确认是否直通、是否被转码、是否正确显示声道与 Atmos / DTS:X 标记。播放器显示一个标签不能证明整条轨道没有问题。
5. **保留可复现记录**：保存 MediaInfo 文本、完整命令、工具版本、配置、日志和输出文件名。批量处理前先对一条样本做完这套检查。

成品只需要兼容播放时，可以同时保留原始轨和新编码的兼容轨；成品只需要一个音轨时，也要在删除原轨前确认备份和回退路径。重新封装不会改变音频编码，转码则一定要在轨道名或说明中留下记录。

## 容易混淆的情况

| 说法                                  | 实际含义                                                                            |
| ------------------------------------- | ----------------------------------------------------------------------------------- |
| “把 DTS-HD 转成 DTS”                  | 勾选 Reduce to core 是提取已有核心；输出 DTS 的其他路线可能是重新编码，需看工具日志 |
| “TrueHD 自带 AC-3，所以一定能提 core” | TrueHD 的兼容部分不等同于 DTS core；是否单独保留要按工具输出和设备需求确认          |
| “Atmos 还是 Atmos，转码不会丢”        | 取决于承载格式和编码器；解码成普通 PCM 或有损编码通常不会保留对象元数据             |
| “采样率越高越好”                      | 采样率必须和目标编码器、设备与发布要求匹配；不必要的重采样只会增加变量              |
| “输出扩展名对了就完成”                | 扩展名不说明编码是否复制、解码或重新编码，必须查看 MediaInfo 和日志                 |
| “码率一样，音质就一样”                | 不同编码器、声道布局和源素材不能只按一个码率比较，仍要听检与播放检查                |

## 参考资料

- [deew 项目 README](https://github.com/pcrlnd/deew)：安装、DEE / 许可证依赖、配置项、格式和命令行示例；本文按 2026 年 10 月 11 日页面核对。
- [Dolby Encoding Engine](https://customer.dolby.com/content-creation-and-delivery/dolby-encoding-engine-with-ac-4)：DEE 的官方产品与许可入口。
- [qaac 项目](https://github.com/nu774/qaac)：发布版、源码和当前帮助信息。
- [QAAC 音频编码器命令行参数教程](https://www.nazorip.site/archives/44/)：依赖准备、参数说明、管道输入和 QAAC 例子；页面标题标注 2026.8 更新。
- [eac3to](https://forum.doom9.org/showthread.php?t=125966) 与 [UsEac3To](https://forum.doom9.org/showthread.php?t=145574)：音轨分析、分流和转换入口。
- [MKVToolNix 文档](https://mkvtoolnix.download/doc/mkvmerge.html)：混流、音频轨道属性和章节说明。
- [MediaInfo](https://mediaarea.net/en/MediaInfo)：查看容器、编码、声道、采样率和轨道元数据。
- [音频软件清单](/posts/audio-software/)：本博客的工具与资料总览。

下一篇可以按目标设备单独记录 AAC、DDP 或 DTS 兼容轨的批处理参数；在此之前，先用一条样本跑通并保存日志。
