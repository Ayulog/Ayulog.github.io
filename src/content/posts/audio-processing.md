---
title: 音频处理篇：音轨识别、提取与编码
description: 用 MediaInfo 识别音轨，按用途决定直通、取核心、转无损或重新编码，再封装验收。
author: Ayulog
pubDatetime: "2026-10-11T10:00:00+08:00"
modDatetime: "2026-10-11T16:00:00+08:00"
draft: false
category: audio
tags:
  - 音轨
---

处理影视音轨时，第一步是明确目标：是直接保留原盘音轨（分流与封装），还是将原始音频解码后重新编码为 FLAC、DTS、AAC 或 Dolby Digital Plus（DDP）。

本文梳理从音轨识别、提取到各类编码工具的操作流程。相关工具入口汇总在[音频软件清单](/posts/audio-software/)，蓝光播放列表与原盘分流背景见[蓝光原盘 Remux](/posts/blu-ray-remux/)。

## 第一步：用 MediaInfo 识别音轨

动手前先用 [MediaInfo](https://mediaarea.net/en/MediaInfo) 查看容器内音频轨的详细参数，记录**编码格式、声道布局、采样率、位深、码率、语言及轨道延迟（Delay）**：

| 常见音轨类型                                             | 结构特点与处理方向                                                                                   |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **DTS-HD MA / DTS:X / DTS-ES**                           | 采用“有损 DTS 核心（Core）+ 高清扩展层”结构；可完整保留，也可直接剥离出 DTS 核心                     |
| **Dolby TrueHD / TrueHD Atmos**                          | 独立无损压缩码流（蓝光原盘中常伴随一条供旧设备兼容的 AC-3 流）；解码为 PCM 后会丢失 Atmos 对象元数据 |
| **LPCM / PCM**                                           | 未压缩原始音频；可封装为 WAV / W64 直接保留，或无损压缩为 FLAC 减小体积                              |
| **Dolby Digital（AC-3）与 Dolby Digital Plus（E-AC-3）** | 常见于流媒体、蓝光兼容轨或评论音轨；通常直接提取并原样封装                                           |
| **FLAC、AAC、ALAC、Opus**                                | 常见于重编码成品或压制版；无损 FLAC 可按需转换，有损格式直接保留以避免二次损耗                       |

需要特别区分蓝光中两类高清无损音轨的内部结构：**DTS-HD MA** 内部天然包含可独立剥离的 DTS Core；而 **Dolby TrueHD** 是独立的无损编码流，蓝光原盘里的 AC-3 是与之交织存放的伴随兼容轨（在 MKV 中通常拆分为独立轨道或仅保留 TrueHD）。

## 第二步：按目标选择处理路线

根据播放设备支持情况与压制要求，选择对应的处理路线与工具：

| 目标用途                                 | 处理路线                              | 所用工具                      |
| ---------------------------------------- | ------------------------------------- | ----------------------------- |
| 保留原始无损或源码音轨                   | 从 MPLS / MKV 直接提取并重新封装      | MKVToolNix、DGDemux、eac3to   |
| 从 DTS-HD 提取兼容的普通 DTS             | 剥离高清扩展，仅保留内嵌 DTS Core     | MKVToolNix、eac3to（`-core`） |
| 将 LPCM 或无损轨压缩为 FLAC              | 解码为 PCM 并无损编码为 FLAC          | eac3to、FFmpeg                |
| 压制高质量立体声或多声道 AAC / ALAC      | 调用 Apple CoreAudio 编码器转换       | qaac                          |
| 制作兼容的 Dolby Digital / DDP（E-AC-3） | 调用 Dolby Encoding Engine（DEE）编码 | deew + DEE                    |

## 第三步：提取、剥离核心与基础转换

### 1. 在 MKVToolNix 中提取 DTS Core

当输入源包含 DTS-HD MA 音轨，而目标成品只需要有损 DTS 核心轨时，无需使用外部编码器：

1. 将包含 DTS-HD 音轨的源文件拖入 MKVToolNix GUI 混流器。
2. 在轨道列表中选中该 DTS-HD 音轨，在右侧属性面板勾选 **Reduce to core（仅保留核心）**。
3. 指定输出路径开始混流，工具会自动剥离高清扩展层，仅将内嵌的 DTS Core 封装进新 MKV。

### 2. 用 eac3to / UsEac3To 分流与转换

[eac3to](https://forum.doom9.org/showthread.php?t=125966) 及其图形前端 [UsEac3To](https://forum.doom9.org/showthread.php?t=145574) 可根据指定的输出扩展名自动执行原样提取、核心剥离或重编码：

```sh
# 1. 从 DTS-HD 音轨中无损剥离出有损 DTS 核心
eac3to input.dtshd output.core.dts -core -keepDialnorm

# 2. 将 LPCM 或 TrueHD 无损转换为 FLAC（保留原始采样率与位深）
eac3to input.lpcm output.flac
eac3to input.thd output.flac

# 3. 将其他无损音轨解码并重编码为 DTS（需本机配置可用的外部 DTS 编码器）
eac3to input.thd output.dts

# 4. 当源音轨为 96 kHz 且目标编码器要求 48 kHz 时，显式添加重采样参数
eac3to input.thd output.dts -resampleTo48000
```

**操作要点**：

- **无头 LPCM（Raw PCM）**：若处理不含文件头的 `.pcm` / `.lpcm` 裸流，需先根据原盘 BDInfo 报告确认声道数、位深（16/24-bit）、采样率与字节序，优先在分流阶段直接输出为带文件头的 `.wav` 或 `.w64`（超过 4 GB 时使用 W64）以避免声道映射错乱。
- **采样率保持**：除非目标编码器或设备明确限制最高 48 kHz，否则无需对 96 kHz 原声添加 `-resampleTo48000`。

## 第四步：用 QAAC 编码 AAC 与 ALAC

[qaac](https://github.com/nu774/qaac) 是调用 Apple CoreAudio 音频组件的命令行工具，广泛用于压制高质量有损 AAC 与无损 ALAC 音轨（详细参数说明可参考 [qaac 官方 Wiki](https://github.com/nu774/qaac/wiki) 与 [NAZOrip 的 QAAC 参数教程](https://www.nazorip.site/archives/44/)）。

### 1. 环境准备与检查

将与程序位数一致（64 位 `qaac64.exe` 对应 64 位 DLL）的 Apple Application Support（CoreAudioToolbox）组件放入 `QTfiles64` 目录，在终端运行以下命令确认组件加载正常：

```sh
qaac64.exe --check
```

### 2. 常用编码命令

```sh
# 使用 TVBR（True VBR）质量模式 91 将 WAV 编码为有损 AAC（封装在 M4A 容器中）
qaac64.exe --tvbr 91 -o output.m4a input.wav

# 使用 ALAC 无损压缩编码
qaac64.exe --alac -o output_lossless.m4a input.wav

# 通过 ffmpeg 管道将 FLAC 或其他格式直接送入 qaac 编码为 AAC
ffmpeg -i input.flac -f wav - | qaac64.exe --tvbr 91 --ignorelength -o output.m4a -
```

`--tvbr` 的常用档位包括 `91`、`109`、`127` 等（数字越大码率越高），可通过 `qaac64.exe --help` 查看完整支持的码率档位与声道布局选项。

## 第五步：用 deew 编码 Dolby Digital / DDP

[deew](https://github.com/pcrlnd/deew) 是针对商业级 **Dolby Encoding Engine（DEE）** 的命令行封装工具（Wrapper），能够自动将 FLAC、WAV、DTS、TrueHD 等输入转换为 DEE 所需的中间格式与 XML 配置，并批量输出 `dd`（AC-3）、`ddp`（E-AC-3）、`ac4` 或 `thd` 音轨。

### 1. 安装与配置依赖

运行 deew 需要提前准备三项环境依赖：

1. **FFmpeg 与 ffprobe**：已加入系统环境变量 `PATH` 或在配置中指定路径。
2. **Dolby Encoding Engine（DEE）**：单独获取安装，并将有效的 `license.lic` 许可证文件放入 DEE 程序目录（详见 [Dolby 官方页面](https://customer.dolby.com/content-creation-and-delivery/dolby-encoding-engine-with-ac-4)）。
3. **安装 deew 并配置路径**：

```sh
pip install deew

# 首次运行生成并查看配置文件路径
deew -c
```

打开生成的配置文件，填入本机 `ffmpeg`、`ffprobe` 与 `dee` 可执行文件的准确路径。

### 2. 编码命令示例

```sh
# 1. 将 5.1 或 7.1 FLAC 默认编码为 DDP（E-AC-3）
deew -i input.flac

# 2. 指定码率为 768 kbps 编码为 DDP
deew -b 768 -i input.flac

# 3. 指定编码格式为普通 DD（AC-3），码率 448 kbps
deew -f dd -b 448 -i input.dts

# 4. 将多声道音轨下混（Downmix）为 5.1 或 2.0 立体声编码
deew -f ddp -dm 5.1 -b 640 -i input_71.thd

# 查看当前格式支持的所有有效码率档位
deew -lb
```

deew 在处理过程中会自动补偿 DEE 编码产生的起始延迟，并对 7.1 声道的环绕声道顺序做标准映射转换。

## 第六步：封装与成品验收

音轨提取或重编码完成后，在封装进最终 MKV 前后执行以下验收检查：

1. **比对 MediaInfo 参数**：核对新音轨的编码格式、声道数、声道布局（如 `L R C LFE Ls Rs`）、采样率、码率与总时长是否与预期一致。
2. **设置轨道标记**：在 MKVToolNix 中为保留的原盘无损轨与新增的兼容轨分别填写清晰的轨道名称（例如区分 `TrueHD 7.1 Atmos` 与 `DDP 5.1 兼容轨`）及准确的语言代码。
3. **检查音画同步与延迟**：若分流日志提示存在剩余毫秒延迟，在混流时填入 `--sync`（或 GUI 的“延迟”栏）；封装后抽查片头、对白密集段落、无缝分支接缝处和片尾，确认全程音画同步。
4. **目标设备实测**：在电视、播放器或功放上实测播放，确认源码直通（Bitstream）或解码输出正常、各声道定位无错位。

若需要进一步通过频谱图排查音频来源或检验有损转码痕迹，可继续阅读[音频篇：频谱学习](/posts/audio-spectrum-learning/)。

## 参考资料

- [deew 项目 README](https://github.com/pcrlnd/deew)：安装、DEE / 许可证依赖、配置项与命令行示例。
- [Dolby Encoding Engine](https://customer.dolby.com/content-creation-and-delivery/dolby-encoding-engine-with-ac-4)：DEE 的官方产品与许可说明。
- [qaac 项目](https://github.com/nu774/qaac)与 [qaac Wiki](https://github.com/nu774/qaac/wiki)：发布版、源码与完整命令行参数说明。
- [QAAC 音频编码器命令行参数教程](https://www.nazorip.site/archives/44/)：依赖准备、参数说明、管道输入和 QAAC 示例。
- [eac3to](https://forum.doom9.org/showthread.php?t=125966) 与 [UsEac3To](https://forum.doom9.org/showthread.php?t=145574)：音轨分析、分流和转换工具。
- [MKVToolNix 文档](https://mkvtoolnix.download/doc/mkvmerge.html)：混流、音频轨道属性与 DTS 核心剥离说明。
- [MediaInfo](https://mediaarea.net/en/MediaInfo)：查看容器、编码、声道、采样率和轨道元数据。
- [音频软件清单](/posts/audio-software/)：音频相关工具与资料汇总。
