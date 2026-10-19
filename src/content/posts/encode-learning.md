---
title: 压制练习：从一段样片到文档查阅
description: 用一段样片走通输入记录、基线输出、单项比较与查文档，留下可复查的设置和样片。
author: Ayulog
pubDatetime: "2026-10-10T12:00:00+08:00"
modDatetime: "2026-10-11T16:00:00+08:00"
draft: false
category: encode
tags:
  - VapourSynth
  - x264
  - x265
---

刚开始练习视频压制时，如果直接拿两小时的正片跑各种参数，不仅每次等待耗时极长，压完后也很难分清体积和画质的变化究竟来自哪一步。更高效的入门方式是：**先切出一段 30–60 秒的典型测试样片，查清源片规格，跑出一条基线编码，再通过控制变量测试 CRF 与 preset，学会看编码日志与同帧截图对比**。

下面以一份蓝光 Remux 或高码率 MKV 视频（`source.mkv`）为例，完整走通一轮可复现的压制练习。相关工具下载与进阶教程汇总在[压制软件与资料清单](/posts/encode-software/)。

## 第一步：查看源片参数并切出测试样片

### 1. 用 MediaInfo 或 ffprobe 查清源片规格

动工前先用 `mediainfo`（GUI 切换至 Text 视图，或直接在终端运行命令）查看源视频的核心参数：

```sh
mediainfo source.mkv
```

在输出的 `Video` 段落中，重点记录以下六项信息：

| 参数字段                                           | 示例值                                 | 在压制中的作用                                                 |
| -------------------------------------------------- | -------------------------------------- | -------------------------------------------------------------- |
| `Format` / `Bit rate`                              | `AVC` / `32.5 Mb/s`                    | 了解源片编码格式与原始码率水平                                 |
| `Width` / `Height`                                 | `1920 pixels` / `1080 pixels`          | 确认分辨率；后续还需播放画面检查上下是否有黑边                 |
| `Frame rate mode` / `Frame rate`                   | `Constant` / `23.976 (24000/1001) FPS` | 确认是恒定帧率（CFR）还是可变帧率（VFR），锁定精确时基         |
| `Color space` / `Chroma subsampling` / `Bit depth` | `YUV` / `4:2:0` / `8 bits`             | 确认像素格式（如 `yuv420p`），决定前处理与输出位深             |
| `Scan type`                                        | `Progressive`（逐行）                  | 若为 `Interlaced`（隔行）或 `MBAFF`，需先做反交错或逆胶卷      |
| `Color primaries` / `Matrix`                       | `BT.709`                               | 确认 SDR（BT.709）还是 HDR（BT.2020 + PQ/HLG），编码时如实标记 |

如果习惯使用 FFmpeg 自带的 `ffprobe`，也可以运行以下命令一键打印视频流关键属性：

```sh
ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height,pix_fmt,field_order,r_frame_rate,color_range,color_space,color_transfer,color_primaries -of default=noprint_wrappers=1 source.mkv
```

### 2. 用 FFmpeg 无损切出 45 秒测试样片

从正片中挑选一段同时包含**暗场渐变、人物面部/织物细节和快速运动**的镜头（例如从第 5 分钟开始的 45 秒），用 `-c copy` 流复制切出独立的纯视频测试样片 `sample.mkv`：

```sh
ffmpeg -ss 00:05:00 -i source.mkv -t 45 -map 0:v:0 -an -sn -dn -c:v copy sample.mkv
```

- `-ss 00:05:00` 与 `-t 45`：从 5 分 00 秒附近的最近关键帧（I 帧）开始，无损截取约 45 秒。
- `-map 0:v:0 -an -sn -dn`：只保留第一条视频流，剔除音轨与字幕轨，方便直接用输出文件大小对比视频码率。
- `-c:v copy`：直接复制原始视频码流，不经过重编码，保证 `sample.mkv` 与原片画质完全一致。

切好后播放一遍 `sample.mkv`，并用 `mediainfo sample.mkv` 确认其总帧数（例如 `23.976 fps` 下 45 秒约为 `1079` 帧）。后续所有参数实验都统一以这份 `sample.mkv` 作为输入。

## 第二步：跑通基线压制与单变量对比测试

拿到 `sample.mkv` 后，按**一次只改一个变量**的原则，使用 FFmpeg 调用 `libx264` 或 `libx265`（或使用独立 `x264` / `x265` CLI）跑三组对比实验。

### 1. 建立第一条基线输出

先用 10-bit `libx265`、预设 `slow`、`CRF 20` 跑出第一份基线样片（若测试 H.264，可换为 `-c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p`）：

```sh
ffmpeg -i sample.mkv -c:v libx265 -preset slow -crf 20 -pix_fmt yuv420p10le -x265-params colorprim=bt709:transfer=bt709:colormatrix=bt709:range=limited sample_x265_slow_crf20.mkv
```

如果使用独立的 `x265` 命令行（或配合 [VapourSynth 的 `vspipe`](/posts/encode-vapoursynth/#把画面交给编码器)），对应的等效命令为：

```sh
ffmpeg -v error -i sample.mkv -f yuv4mpegpipe - | x265 --y4m --preset slow --crf 20 --output-depth 10 --colorprim bt709 --transfer bt709 --colormatrix bt709 --range limited --output sample_x265_slow_crf20.hevc -
```

### 2. 实验一：固定 preset，对比不同 CRF 档位

保持 `-preset slow` 不变，分别将 `-crf` 改为 `18`、`20`（已有基线）、`23`，测试不同质量因子对码率与细节保留的影响：

```sh
# 更高画质 / 更大体积：CRF 18
ffmpeg -i sample.mkv -c:v libx265 -preset slow -crf 18 -pix_fmt yuv420p10le -x265-params colorprim=bt709:transfer=bt709:colormatrix=bt709:range=limited sample_x265_slow_crf18.mkv

# 更小体积 / 更高压缩：CRF 23
ffmpeg -i sample.mkv -c:v libx265 -preset slow -crf 23 -pix_fmt yuv420p10le -x265-params colorprim=bt709:transfer=bt709:colormatrix=bt709:range=limited sample_x265_slow_crf23.mkv
```

### 3. 实验二：固定 CRF，对比不同 preset 速度预设

保持 `-crf 20` 不变，对比 `fast`、`medium`、`slow`（基线）与 `slower` 的编码速度、输出体积及复杂场景表现：

```sh
# 较快预设：fast 与 medium
ffmpeg -i sample.mkv -c:v libx265 -preset fast -crf 20 -pix_fmt yuv420p10le -x265-params colorprim=bt709:transfer=bt709:colormatrix=bt709:range=limited sample_x265_fast_crf20.mkv
ffmpeg -i sample.mkv -c:v libx265 -preset medium -crf 20 -pix_fmt yuv420p10le -x265-params colorprim=bt709:transfer=bt709:colormatrix=bt709:range=limited sample_x265_medium_crf20.mkv

# 更慢预设：slower
ffmpeg -i sample.mkv -c:v libx265 -preset slower -crf 20 -pix_fmt yuv420p10le -x265-params colorprim=bt709:transfer=bt709:colormatrix=bt709:range=limited sample_x265_slower_crf20.mkv
```

### 4. 实验三：针对具体画面痛点微调单个高级参数

当基线样片在暗场出现轻微色带，或希望调整自适应量化分配时，保持 `slow + crf 20` 不变，仅在 `-x265-params` 中修改一项参数（如将默认的 `aq-mode=2` 改为向暗场倾斜的 `aq-mode=3`）：

```sh
ffmpeg -i sample.mkv -c:v libx265 -preset slow -crf 20 -pix_fmt yuv420p10le -x265-params colorprim=bt709:transfer=bt709:colormatrix=bt709:range=limited:aq-mode=3 sample_x265_slow_crf20_aq3.mkv
```

更多编码器参数含义见[编码篇：x264、x265 与 AV1](/posts/encode-codecs/)。

## 第三步：解读压制日志（帧类型、QP、码率与速度）

每次编码结束时，x264 或 x265 都会在终端打印一段汇总统计日志。把这段日志保存下来，重点看懂以下几行数据：

```text
x265 [info]: frame I:     12, Avg QP:17.85  kb/s: 14520.30
x265 [info]: frame P:    268, Avg QP:20.12  kb/s: 4810.50
x265 [info]: frame B:    800, Avg QP:22.94  kb/s: 1420.80
x265 [info]: Weighted P-Frames: Y:4.1% UV:2.6%
x265 [info]: consecutive B-frames: 8.2% 11.4% 25.0% 38.1% 17.3%
encoded 1080 frames in 42.50s (25.41 fps), 2412.65 kb/s, Avg QP:22.18
```

1. **总帧数、耗时与编码速度（`encoded 1080 frames in 42.50s (25.41 fps)`）**：
   - 先核对 `1080 frames` 是否与源样片 `sample.mkv` 的帧数完全一致，确保没有丢帧或重复帧。
   - `25.41 fps` 代表当前机器在该预设下的压制速度。借此可推算整部电影的耗时：若正片长 120 分钟（约 172,600 帧），以 25.4 fps 压制大约需要 1.9 小时。如果测出 `slower` 只有 `5 fps`（全片需近 10 小时），而画质与体积和 `slow` 差距极小，就可以果断留用 `slow`。
2. **输出平均码率（`2412.65 kb/s`）**：
   - 反映视频流的实际体积开销。注意：有时把某项心理视觉参数（如 `psy-rd`）或 `aq-mode=3` 打开后画面显得更干净，但看一眼日志发现码率从 `2412 kb/s` 涨到了 `3100 kb/s`。要公平评估该参数本身是否提升了压缩效率，需要适当调高一点 CRF，让两份测试片的 `kb/s` 回到同一水平线上再对比画面。
3. **I / P / B 帧数量与平均量化参数（`Avg QP`）**：
   - **I 帧（帧内编码关键帧）**：独立编码，提供跳转定位与后续帧的参考基准，单帧码率最高、`Avg QP` 最低（上例为 `17.85`）。
   - **P 帧（前向预测帧）**：参考前面的 I 帧或 P 帧编码，码率与 QP 居中（`20.12`）。
   - **B 帧（双向预测帧）**：同时参考前后帧，压缩率最高、占比最大（1080 帧中占了 800 帧），`Avg QP` 也最高（`22.94`）。
4. **连续 B 帧分布（`consecutive B-frames`）**：
   - 括号内从左到右依次代表连续出现 0、1、2、3、4 个 B 帧的百分比（对应默认 `bframes=4`）。如果最末尾一项（这里是 `17.3%`，在动画片源中甚至常超过 `40%`）占比很高，说明编码器经常用满连续 B 帧上限，此时尝试将 `bframes` 提高到 `6` 或 `8` 往往能进一步节省体积。

## 第四步：画面对比与记录整理

看完日志后，用画面对比检验实际观感：

1. **同帧静态对比**：使用 VapourSynth Editor 预览窗口、AvsPmod 或支持逐帧步进的播放器（如 `mpv` 按 `.` 键逐帧前进），将源样片 `sample.mkv` 与各测试片对齐到**完全相同的帧号**，截取无损 PNG 放大对比。对比时留意当前帧是 I 帧、P 帧还是 B 帧（B 帧更容易暴露涂抹和块效应）。
2. **连续播放对比**：静态截图容易忽略时域问题。正常播放样片，重点观察暗部背景是否有色块跳动（呼吸效应）、胶片颗粒是否自然流动、高速平移镜头是否有拖影。
3. **整理实验记录表**：每跑完一组测试，用一张简表记录参数、码率、速度与主观结论，避免文件一多互相混淆：

| 测试文件名                       | 编码设置摘要               | 平均码率 (`kb/s`) | 速度 (`fps`) | Avg QP | 画面观察结论                           |
| -------------------------------- | -------------------------- | ----------------- | ------------ | ------ | -------------------------------------- |
| `sample_x265_slow_crf20.mkv`     | `x265 slow crf=20`（基线） | 2412.6            | 25.4         | 22.18  | 亮部细节良好，00:18 暗场墙壁有轻微色带 |
| `sample_x265_slow_crf18.mkv`     | `x265 slow crf=18`         | 3580.4            | 23.1         | 19.95  | 暗部色带基本消失，但体积增加约 48%     |
| `sample_x265_slow_crf20_aq3.mkv` | `x265 slow crf=20 aq=3`    | 2690.1            | 25.2         | 21.60  | 暗场墙壁色带明显改善，码率仅增加 11%   |

确定采用的参数组合后，去掉 `-ss` 与 `-t` 对全片执行正式压制，最后用 MKVToolNix 将生成的视频流与原片音轨、字幕、章节封装成最终 MKV，并在目标播放设备上抽查片头、中段与片尾的音画同步。

## 第五步：遇到报错或画质问题如何查文档

练习中遇到命令报错或画面异常时，先根据现象定位所属环节，再查阅对应项目的官方文档：

| 常见现象或报错                            | 所属环节                        | 排查与文档核对方向                                                                                 |
| ----------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------- |
| `.vpy` 无法导入片源，或 `vspipe` 无帧输出 | VapourSynth 环境与源滤镜        | 检查 Python 虚拟环境与插件位数是否匹配（见 [VapourSynth 篇](/posts/encode-vapoursynth/)）          |
| 编码器提示 `unknown option` 或拒绝参数    | FFmpeg 包装层 vs 独立编码器 CLI | 区分 FFmpeg 的 `-x265-params` 写法与独立 `x265.exe --参数` 写法，运行 `--fullhelp` 核对本机版本    |
| 压制后色彩发灰、偏暗或人物比例变形        | 色彩矩阵标记 / 裁边与 SAR 缩放  | 用 `mediainfo` 对比源片与成品的 `Matrix`、`Range` 和 `Display aspect ratio`                        |
| 封装后外挂/内封 ASS 字幕缺字或特效丢失    | 字幕封装与播放器渲染器          | 检查是否漏封字体附件，以及播放端是否支持对应 ASS 标签（见[字幕流程篇](/posts/subtitle-workflow/)） |
| 成片越往后声音或字幕偏差越大              | 帧率时基或 VFR 时间戳           | 核对是否把 `23.976 (24000/1001)` 误写成了整 `24 fps`，或源片本身为可变帧率（VFR）                  |

<a id="入门与完整流程"></a><a id="vcb-studio-公开教程"></a><a id="fxxs-压制教程"></a><a id="encode-mystery"></a><a id="fansubbing-guide"></a><a id="the-encoding-guide"></a><a id="编码器与滤镜进阶"></a><a id="iavoex264x265av1-及音频专题"></a><a id="advanced-encoding-guide-与中文译本"></a><a id="高清视频转码进阶指南"></a><a id="x264-参数-wiki-与-kokomins"></a><a id="旧文专题与自动化案例"></a><a id="nazorip-新人流程与一键高压缩脚本"></a><a id="在-premiere-中使用-ass-字幕"></a><a id="quicktime-gamma-bug-与历史制式"></a><a id="博客项目与社区"></a><a id="nazorip-与-nannan"></a><a id="技术论坛与软件目录"></a><a id="查当前用法时回到项目文档"></a>

## 延伸教程与文档导航

更完整的公开教程、编码器手册与社区资料已按分类整理在[压制软件与资料清单的学习篇](/posts/encode-software/#学习篇)：

- [入门与完整流程教程](/posts/encode-software/#入门与完整流程)：VCB-Studio 公开教程、FXXS 压制教程、Encode Mystery、Fansubbing Guide 与 The Encoding Guide。
- [编码器与滤镜进阶资料](/posts/encode-software/#编码器与滤镜进阶)：iAvoe 的 x264 / x265 / AV1 专题、Advanced Encoding Guide 及中译本、x264 参数 Wiki。
- [专题案例与技术社区](/posts/encode-software/#旧文专题与自动化案例)：自动化压制脚本案例、Doom9 与 VideoHelp 论坛。
- [上游项目官方文档](/posts/encode-software/#查当前用法时回到项目文档)：VapourSynth、x264、x265、SVT-AV1 与 FFmpeg 官方参数手册。
