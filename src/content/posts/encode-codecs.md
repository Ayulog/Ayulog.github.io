---
title: 编码篇：x264、x265 与 AV1
description: 用 FFmpeg 对同一段素材试压 x264、x265 与 SVT-AV1，比较 CRF、预设与兼容条件。
author: Ayulog
pubDatetime: "2026-10-10T12:00:00+08:00"
modDatetime: "2026-10-11T16:00:00+08:00"
draft: false
category: encode
tags:
  - x264
  - x265
  - AV1
---

视频前处理（裁边、缩放或滤镜）完成后，编码器负责将未压缩的视频帧编码为符合目标标准的码流。压制时通常围绕**编码格式与实现**、**码率控制（CRF / ABR）**、**速度预设（preset）**以及**位深与硬件兼容性**四组设置展开调优。

相关软件下载与进阶教程汇总在[压制软件与资料清单](/posts/encode-software/)；若需要先用脚本处理画面，可先看 [VapourSynth 压制篇](/posts/encode-vapoursynth/)。

## 编码标准与常用编码器实现

视频编码标准（H.264、H.265、AV1）规定了码流语法与解码规范，而具体压缩过程由各自的软件或硬件编码器完成：

| 编码标准     | 主流软件实现    | FFmpeg 调用名称 | 适用场景与播放兼容考量                                           |
| ------------ | --------------- | --------------- | ---------------------------------------------------------------- |
| H.264 / AVC  | x264            | `libx264`       | 硬件兼容性最广；常规分发普遍采用 8-bit `yuv420p`                 |
| H.265 / HEVC | x265            | `libx265`       | 适合 1080p 与 4K 10-bit（Main 10）压制，主流设备均支持硬解       |
| AV1          | SVT-AV1         | `libsvtav1`     | 压缩率高、多线程扩展好；需确认目标播放设备是否支持硬解或流畅软解 |
| AV1          | libaom / aomenc | `libaom-av1`    | AOM 参考与慢速高质量编码实现，预设命名与参数体系独立于 SVT-AV1   |

容器格式（MKV、MP4）仅负责封装视频、音轨、字幕与章节，不影响视频流本身的压缩率（仅换容器不重编码的流程见[蓝光原盘 Remux](/posts/blu-ray-remux/)）。此外，NVENC、QSV、AMF 等显卡硬件编码器虽然同样输出 H.264、HEVC 或 AV1 码流，但其内部预测算法、参数接口及码率效率均与 x264 / x265 / SVT-AV1 软件编码器不同。

## 码率控制、速度预设与兼容约束

### 1. CRF（恒定质量因子）

日常压制没有死板的文件体积硬上限时，优先使用 **CRF（Constant Rate Factor）** 模式：

- CRF 数值越低，量化步长越小，保留的画面细节越多，输出码率与文件体积也越大；数值调高则节省体积，但更容易出现暗部色带或纹理涂抹。
- **不同编码器的 CRF 刻度互不等价**：例如 `x264 --crf 18`、`x265 --crf 20` 与 `SVT-AV1 --crf 28` 各自处于不同的量化曲线上，跨编码器对比画质时需要先将输出码率（文件大小）调整到相近水平，再对比画面。

### 2. preset（速度预设）与 tune（素材微调）

- **preset**：控制编码器在运动搜索、模式决策和分区划分上投入的计算量。x264 与 x265 由快到慢依次使用 `ultrafast`、`veryfast`、`fast`、`medium`、`slow`、`slower`、`veryslow` 等名称；SVT-AV1 则使用数字预设（如 `preset 8` 到 `preset 2`，数字越小越慢、压缩率越高）。日常试压常以 x264/x265 的 `slow` 或 SVT-AV1 的 `preset 6`–`4` 作为平衡耗时与质量的起点。
- **tune**：针对特定片源特征批量覆写一组内部参数（如胶片颗粒 `grain`、二维动画 `animation`）。例如 [x265 的 `--tune grain`][x265-presets] 会收紧帧内与帧间的量化波动（提高 `ipratio / pbratio` 与 `qcomp`、关闭 `sao` 等），以防止粗颗粒在画面上忽聚忽散。建议先用默认无 tune 的预设试压，确有针对性需求时再开启对应 tune。

### 3. ABR 与 2-Pass（两遍编码）

当成品有严格的体积上限（例如必须塞入固定容量的存储介质或满足固定带宽要求）时，才采用 **2-Pass ABR（平均码率）**：第一遍扫描全片收集帧复杂度统计文件（`.stats`），第二遍根据统计数据分配全片码率。计算目标视频码率时，需从总目标容量中扣除音频、字幕轨与容器封装开销。

### 4. VBV、Profile 与 Level

当成品需要烧录蓝光光盘、送交硬件机顶盒或用于流媒体推流时，需通过 `--vbv-maxrate`（最大入列码率）与 `--vbv-bufsize`（解码缓冲区大小）限制局部码率峰值，并指定对应的 `profile`（如 `high`、`main10`）与 `level`（如 `4.1`、`5.1`）。

需要注意：

- **x265 的 `--high-tier`** 属于 HEVC 标准中对应 Level 的高码率档位标记（例如 Level 4.1 High Tier 允许比 Main Tier 更高的峰值码率），取决于目标播放设备的解码规格。
- **x264 的最大参考帧数（`--ref`）** 受目标 `level` 与视频分辨率共同约束：例如在蓝光兼容的 Level 4.1 下，`1920×1080` 最多允许 `--ref 4`，而 `1280×720` 则可支持到 `--ref 9`。若无特殊硬件限制，日常 MKV 压制无需手动强加严苛的 VBV。

## 常见高级编码参数分类

在默认 preset 基础上进一步微调 x264 / x265 时，可按参数所作用的编码环节分组理解（具体取值范围与默认行为以 [x265 官方 CLI 文档][x265-cli] 与 `x264 --fullhelp` 为准）：

| 调节方向                     | 常见参数                                            | 作用机制与调优思路                                                                                              |
| ---------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 复杂与平缓场景间的码率分配   | `qcomp`                                             | 控制量化曲线压缩率（`0.0` 趋向恒定码率，`1.0` 趋向恒定量化器）；调高会给高速复杂动态画面分配更多码率            |
| 帧内平坦区与纹理区的码率分配 | `aq-mode`、`aq-strength`                            | 自适应量化（AQ）将码率从高复杂度边缘匀向平坦区域或暗部（如 `aq-mode 3` 针对暗场加强分配），减轻暗部色带         |
| 时域引用权重与前瞻分析       | x264 `mbtree`、x265 `cutree`，以及 `rc-lookahead`   | 统计后续帧对当前块的引用频次，为高频被引用的基础块分配更低 QP；`rc-lookahead` 决定前瞻分析的帧数窗口            |
| 参考帧、B 帧与关键帧间隔     | `ref`、`bframes`、`b-adapt`、`keyint`、`min-keyint` | 控制多帧参考、连续 B 帧决策及最大 GOP 长度；可结合压制结束时的连续 B 帧分布日志判断 `bframes` 上限是否够用      |
| 运动估计搜索                 | `me`、`merange`、`subme`                            | 决定运动矢量的搜索算法（如 `hex`、`umh`、`star`）、搜索半径与亚像素内插精度                                     |
| 率失真优化（RDO）与量化决策  | x265 `rd`、`rdoq-level`，x264 `trellis`             | 在编码模式决策与变换系数量化时综合权衡码率代价与画面失真                                                        |
| 心理视觉优化                 | `psy-rd`，以及 x265 `psy-rdoq`                      | 引导率失真决策倾向于保留原画的高频纹理能量与颗粒感；调得过高可能引发边缘振铃（Ringing）或蚊噪                   |
| 环路滤波                     | `deblock`，以及 x265 `sao`                          | `deblock` 平滑分块边界；x265 的 `sao`（样本自适应偏移）可抑制振铃伪影，但在高码率精细压制中有时被关闭以保留锐度 |

调节高级参数时需注意参数间的前置依赖关系：例如在 x265 中，`--psy-rdoq` 仅在 `--rdoq-level` 设为 `1` 或 `2` 时生效；`--psy-rd` 则要求 `--rd` 至少为 `3`。建议每次基于固定 preset 只修改一两个参数，对比样片后再决定去留。

## 位深（8-bit / 10-bit）与色彩前提

- **H.264（x264）**：考虑到各类电视、盒子与浏览器的硬解兼容性，H.264 成品普遍保持 **8-bit 4:2:0（`yuv420p`）**。
- **HEVC（x265）与 AV1（SVT-AV1）**：主流软硬件解码器均已原生支持 10-bit 解码。即使源片是 8-bit SDR，在压制 HEVC 或 AV1 时也常采用 **10-bit 4:2:0（`yuv420p10le`）** 编码——更高的内部计算与量化精度能有效减少渐变区域的编码色带（Banding），并略微提升压缩效率。
- **10-bit 与 HDR 的区分**：10-bit 仅代表每个颜色通道的量化位深；HDR（如 HDR10、HLG、Dolby Vision）还需要配套的色彩原色（`BT.2020`）、传递函数（`smpte2084` PQ 或 `arib-std-b67` HLG）及母版亮度元数据（`master-display`、`max-cll`，背景知识见[认识 HDR](/posts/understanding-hdr/)）。

## 实操：用同一段素材试压 x264、x265 与 SVT-AV1

以下示例基于一段**逐行扫描、恒定帧率（CFR）、BT.709 SDR 的 4:2:0 视频（`input.mkv`）**，统一截取从 `00:05:00` 开始的 30 秒画面进行纯视频试压。

### 1. 检查本地 FFmpeg 编码器与源片规格

运行前先确认当前 FFmpeg 已编译内置 `libx264`、`libx265` 与 `libsvtav1`，并用 `ffprobe` 查看源片流信息：

```sh
# 确认 FFmpeg 版本及各编码器可用选项
ffmpeg -version
ffmpeg -h encoder=libx264
ffmpeg -h encoder=libx265
ffmpeg -h encoder=libsvtav1

# 检查源视频的编码、分辨率、像素格式、帧率与色彩标记
ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height,pix_fmt,field_order,r_frame_rate,avg_frame_rate,color_range,color_space,color_transfer,color_primaries -of default=noprint_wrappers=1 input.mkv
```

### 2. x264（8-bit H.264 试压）

```sh
ffmpeg -ss 00:05:00 -i input.mkv -t 30 -map 0:v:0 -an -sn -dn -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p test-x264.mkv
```

命令中 `-map 0:v:0 -an -sn -dn` 仅抽取第一路视频流并排除音频、字幕与数据流，便于后续直接对比纯视频文件大小与码率。需要传递 x264 专有高级参数时，可通过 `-x264-params`（如 `-x264-params aq-mode=3:aq-strength=0.8`）传入，详见 [FFmpeg libx264 文档][ffmpeg-x264]。

### 3. x265（10-bit HEVC 试压）

```sh
ffmpeg -ss 00:05:00 -i input.mkv -t 30 -map 0:v:0 -an -sn -dn -c:v libx265 -preset slow -crf 20 -pix_fmt yuv420p10le test-x265.mkv
```

此处通过 `-pix_fmt yuv420p10le` 输出 10-bit HEVC（需本机 `libx265` 编译了 10-bit 支持），扩展参数可通过 `-x265-params` 传入（详见 [FFmpeg libx265 文档][ffmpeg-x265]）。

若在脚本压制中使用独立的 `x265.exe` 命令行程序，原版 CLI 默认只接收 raw YUV 或 Y4M 视频流（常配合 `vspipe --container y4m` 管道输入）；社区常用的第三方增强构建 [x265 Mod by Patman][x265-patman] 则额外内置了直接读取 `.vpy` / `.avs` 脚本及进度预估支持。

### 4. SVT-AV1（10-bit AV1 试压）

```sh
ffmpeg -ss 00:05:00 -i input.mkv -t 30 -map 0:v:0 -an -sn -dn -c:v libsvtav1 -preset 6 -crf 30 -pix_fmt yuv420p10le test-av1.mkv
```

使用 AV1 编码器时需注意以下细节：

- **SVT-AV1 与 libaom 的区别**：[SVT-AV1][svt-av1]（`libsvtav1` / `SvtAv1EncApp`）针对多核并行做了深度优化，速度预设使用 `--preset 0`–`13`；而 AOM 官方的 [libaom][libaom]（`libaom-av1` / `aomenc`）使用 `--cpu-used` 控制速度，两者的参数不可混用。
- **FFmpeg 接口与独立 CLI 参数表**：在 [SVT-AV1 v4.2.0 参数文档][svt-params]中，独立程序 `SvtAv1EncApp` 的 `--crf` 支持 `1`–`70` 及 `0.25` 小数步进；而在 [FFmpeg 的 `libsvtav1` 包装层][ffmpeg-svtav1]中，`-crf` 为 `0`–`63` 整数，其余内部参数通过 `-svtav1-params key=value:key=value` 透传（详见 [SVT-AV1 FFmpeg 指南][svt-ffmpeg]）。
- **胶片颗粒合成（Film Grain Synthesis）**：AV1 支持通过 `film-grain` 参数分析源片噪点特征并在解码端重建颗粒（配套 `film-grain-denoise` 控制编码前是否用内建去噪滤镜抹平源噪点，v4.2.0 默认为 `0`）。基础试压时建议先保持关闭，遇到高噪点胶片源再单独开启测试（一般从 `film-grain=6` 至 `12` 试起），并在连续播放下观察合成颗粒是否自然。

<a id="怎样比较试压结果"></a>

## 怎样比较试压结果

### 1. 挑选覆盖痛点的连续测试片段

评估编码参数不能只看一两张明亮的静态截图，建议从正片中切出 30–60 秒包含以下典型场景的连续片段：

| 场景类型                     | 重点观察对象                                                |
| ---------------------------- | ----------------------------------------------------------- |
| 暗场、夜空、浓雾或墙面渐变   | 暗部细节是否被吃掉、是否产生阶梯状色带（Banding）或呼吸闪烁 |
| 细密发丝、织物、树叶与字幕   | 微小纹理是否被抹平，高频边缘是否出现振铃伪影（Ringing）     |
| 横移镜头、高速打斗与闪光转场 | 动态清晰度、切镜首帧后是否出现短暂马赛克崩坏及恢复速度      |
| 胶片颗粒或精细噪点           | 连续播放时颗粒是否自然流动，有无结块或像一层网固定在画面上  |

### 2. 控制变量与对齐码率

1. **固定前处理与时基**：保持同一份输入源、时间范围、缩放滤镜、色彩矩阵和输出位深，每轮测试只改变一项编码参数。
2. **在相近码率下对比画质**：某个参数（如降低 CRF 或调高 `psy-rd`）让画面看起来更锐利，往往是因为它多消耗了 15%–30% 的码率。科学比较两个 preset 或两个编码器时，应先微调 CRF 使两份样片的最终文件体积（平均码率）基本一致，再对齐到同一帧（分清 I / P / B 帧类型）用相同显示设置对比细节。
3. **结合编码日志分析**：留意终端输出的 I / P / B 帧数量、平均 QP 值（量化参数）、最终平均码率（`kb/s`）与编码帧率（`fps`）。VMAF、SSIM、PSNR 等客观指标可用于辅助回归测试，但开启心理视觉优化（`psy-rd`）或颗粒合成后客观分数可能会下降，最终取舍仍以人眼在静帧与连续播放下的观感为准。

## 从样片试压到全片封装

确定满意的编码参数后，去掉测试命令中的 `-ss` 与 `-t` 时间截取限制，执行全片压制。

全片编码完成后，检查控制台退出状态与总帧数是否与源片完全一致，再使用 MKVToolNix 将新编码的视频流与原片音轨、字幕、字体附件及章节混流封装（详见[蓝光原盘 Remux 教程](/posts/blu-ray-remux/#第四步用-mkvtoolnix-整理成品)）。若压制的是 HDR10、HDR10+ 或 Dolby Vision 片源，还需在编码或封装阶段准确写入源片的 `master-display`、`max-cll` 及动态元数据。

## 参考资料与文档入口

| 项目               | 版本参考与文档入口                                                                                                                                                                                                           |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| x264               | [VideoLAN x264 项目页](https://www.videolan.org/developers/x264.html) · [上游源码与 CLI 帮助](https://code.videolan.org/videolan/x264/-/blob/master/x264.c)                                                                  |
| x265               | [官方发行说明（v4.3）](https://x265.readthedocs.io/en/master/releasenotes.html) · [CLI 参数文档][x265-cli] · [Preset 与 Tune 表][x265-presets]                                                                               |
| x265 Mod by Patman | [GitHub 仓库][x265-patman] · [Releases 发布页](https://github.com/Patman86/x265-Mod-by-Patman/releases)（核对版本 `4.3+22+73`）                                                                                              |
| SVT-AV1            | [GitLab 官方仓库][svt-av1] · [Releases（v4.2.0）](https://gitlab.com/AOMediaCodec/SVT-AV1/-/releases) · [参数文档][svt-params] · [FFmpeg 指南][svt-ffmpeg]                                                                   |
| FFmpeg             | [编码器封装文档](https://ffmpeg.org/ffmpeg-codecs.html)（[`libx264`][ffmpeg-x264] · [`libx265`][ffmpeg-x265] · [`libsvtav1`][ffmpeg-svtav1] · [`libaom-av1`][ffmpeg-aom]） · [ffprobe 文档](https://ffmpeg.org/ffprobe.html) |

[x265-cli]: https://x265.readthedocs.io/en/master/cli.html
[x265-presets]: https://x265.readthedocs.io/en/master/presets.html
[x265-patman]: https://github.com/Patman86/x265-Mod-by-Patman
[svt-av1]: https://gitlab.com/AOMediaCodec/SVT-AV1
[svt-params]: https://gitlab.com/AOMediaCodec/SVT-AV1/-/blob/v4.2.0/Docs/Parameters.md
[svt-ffmpeg]: https://gitlab.com/AOMediaCodec/SVT-AV1/-/blob/master/Docs/Ffmpeg.md
[libaom]: https://aomedia.googlesource.com/aom/
[ffmpeg-x264]: https://ffmpeg.org/ffmpeg-codecs.html#libx264_002c-libx264rgb
[ffmpeg-x265]: https://ffmpeg.org/ffmpeg-codecs.html#libx265
[ffmpeg-svtav1]: https://ffmpeg.org/ffmpeg-codecs.html#libsvtav1
[ffmpeg-aom]: https://ffmpeg.org/ffmpeg-codecs.html#libaom_002dav1
