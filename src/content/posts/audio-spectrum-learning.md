---
title: 音频篇：频谱学习
description: 看频谱图的坐标、FFT 与分辨率取舍，用固定参数观察截断、斑块与上采样线索。
author: Ayulog
pubDatetime: "2026-10-11T14:00:00+08:00"
modDatetime: "2026-10-11T16:00:00+08:00"
draft: false
category: audio
tags:
  - 频谱
---

在音频整理与压制验收中，频谱图（准确而言是**声谱图，Spectrogram**）用于直观展示**音频信号在时间轴上的频率分布与各频段相对能量**，常用于排查有损编码低通截断、局部编码斑块、异常底噪或伪高采样率（上采样）线索。

关于音轨提取、格式转换与重编码流程，见[音频处理篇：音轨识别、提取与编码](/posts/audio-processing/)，相关工具汇总在[音频软件清单](/posts/audio-software/)。

## 波形图、单帧频谱与声谱图

音频软件中常见的三种图形视图分别展示不同维度的信号特征：

| 视图名称              | 横轴 | 纵轴       | 主要观察内容                           |
| --------------------- | ---- | ---------- | -------------------------------------- |
| 波形图（Waveform）    | 时间 | 振幅       | 整体动态包络、静音段、瞬态峰值与削波   |
| 单帧频谱（Spectrum）  | 频率 | 幅度或功率 | 某一时刻或选定片段内的频率成分与基频   |
| 声谱图（Spectrogram） | 时间 | 频率       | 全轨频率成分随时间的变化及相对能量分布 |

日常所说的“看频谱”主要指第三种**声谱图**（Adobe Audition 称为 Spectral Frequency Display，Audacity 称为 Spectrogram）。声谱图将连续音频切分为大量短片段，对每个片段做傅里叶变换（STFT），并按时间顺序排列成二维图像，用像素的颜色或明暗代表该时频网格内的相对能量。

由于声谱图的视觉呈现直接受窗口函数、FFT 大小、频率轴缩放方式和色阶范围影响，对比不同音频文件时，需要先将分析软件的显示参数固定一致。

## 声谱图的坐标与能量标尺

### 时间轴与奈奎斯特频率上限

声谱图的横轴为时间（秒），纵轴为频率（Hz / kHz）。根据奈奎斯特采样定理，采样率为 $f_s$ 的数字音频可记录的最高频率上限为 $f_s / 2$：

| 采样率   | 理论频率上限（$f_s / 2$） |
| -------- | ------------------------- |
| 44.1 kHz | 22.05 kHz                 |
| 48 kHz   | 24 kHz                    |
| 96 kHz   | 48 kHz                    |

纵轴刻度通常提供**线性（Linear）**与**对数（Logarithmic）**两种模式：

- **线性频率轴**：高低频等距排列，最适合观察 16–24 kHz 高频区域的低通截断边界与上采样特征。
- **对数频率轴**：将低频与中频区域展开，更贴合人耳对音高（八度）的听觉感受，适合观察乐器基频与人声泛音。

### 颜色标尺（dBFS）与响度指标

声谱图的颜色色阶通常以数字满刻度 **dBFS（Decibels relative to Full Scale）** 为基准，以 `0 dBFS` 为数字采样最大值，常规信号分布在负值区间（如 `-120 dBFS` 至 `0 dBFS`）。色阶中颜色越亮的区域，代表该时频点在当前量程下的能量越强。

在音频分析中，以下几个能量与响度指标各司其职：

- **dBFS**：单点或单频格相对于数字满刻度的幅度位置；
- **RMS**：一段音频信号的均方根平均能量；
- **真峰值（True Peak，dBTP）**：经重建滤波器还原后的连续模拟波形峰值；
- **集成响度（LUFS）**：依据 [ITU-R BS.1770](https://www.itu.int/rec/R-REC-BS.1770) / [EBU R 128](https://tech.ebu.ch/publications/r128) 标准加权计算的节目主观响度。

若需要评估整轨响度或动态范围，应结合专门的电平表与响度测量工具，而非仅凭声谱图色阶的整体明暗判断。

## FFT 窗口长度与时频分辨率

声谱图底层采用短时傅里叶变换（STFT）：用窗口函数截取长度为 $N$ 的采样点计算 FFT，再按一定重叠率滑向下一帧（详见 [SciPy `signal.stft` 参数说明](https://docs.scipy.org/doc/scipy/reference/generated/scipy.signal.stft.html)）。采样率为 $f_s$ 时，频率网格间隔约为：

$$\Delta f \approx \frac{f_s}{N}$$

在调整声谱图参数时，需要在**频率分辨率**与**时间分辨率**之间做取舍：

- **增大 FFT Size（如 4096、8192）**：频率网格更密，高频截断线、谐波横线和编码斑块边界更清晰；但单帧跨越的时间变长，瞬态鼓点在横向上会被拉宽。
- **减小 FFT Size（如 512、1024）**：时间定位更敏锐，适合定位瞬态爆音与切点；但频率纵向细节变粗。
- **窗口函数（Window Function）**：Blackman-Harris、Hann、Hamming 等窗口通过调整主瓣宽度与旁瓣衰减来抑制频谱泄漏（Spectral Leakage）。日常排查转码痕迹常选用旁瓣抑制较好的 Blackman-Harris 或 Hann 窗口，配合 2048 或 4096 的 FFT Size。

## 声谱图的观察顺序与常见特征

查看一条音轨的声谱图时，建议按以下顺序由整体到局部排查：

1. **核对基础属性**：先用 MediaInfo 查看采样率、位深、声道数、编码格式与码率，确定纵轴理论上限。
2. **浏览全轨轮廓**：在全轨视图下观察高频延伸是否连贯，不同乐段之间是否存在突兀的横向断层。
3. **放大典型片段**：分别框选鼓点镲片（高频瞬态丰富）、强人声乐段与安静尾奏放大查看，结合边缘形状判断。

### 1. 截断（Cutoff）与隔断（Shelf）

- **低通截断（Low-pass Cutoff）**：在某一固定频率（如 16 kHz、18.5 kHz、20 kHz）上方能量呈一刀切消失。这常见于 MP3、AAC、AC-3 等有损编码器的预设低通滤波，也可能源于录音或母带制作阶段添加的硬件/软件低通滤波器。
- **高频隔断（Shelf）**：在某一频率上方整体能量明显台阶式衰减，但仍残留部分高频信号或直达上限的填充能量。

### 2. 频域斑块与空洞（编码伪影）

有损心理声学编码器在码率受限时，会根据掩蔽效应舍弃人耳不易察觉的时频块。在声谱图放大视图中，这类舍弃常表现为高频区域边缘整齐的**矩形黑块（空洞）**或与乐器谐波走向无关的**孤立块状斑点**。相比单纯的高频高度，这类规则块状空洞是辨别有损转无损（Transcode）更直接的特征。

### 3. 上采样（Upsampling）与伪高解析度线索

当一个标称 88.2 kHz 或 96 kHz 的音频文件，其全部有效频率成分与底噪都在 22.05 kHz 或 24 kHz 处整齐截止、上方完全空白，或者在 22.05 kHz / 24 kHz 上方出现上下对称的镜像频谱（混叠镜像）时，往往提示该文件可能由 44.1 kHz 或 48 kHz 音源上采样或转换而来。

## 录音与母带特征的辨析

声谱图上的某些视觉现象属于正常的录音、合成器或母带处理特征，排查时需与有损转码伪影区分开：

| 声谱图现象                         | 常见成因辨析                                                         |
| ---------------------------------- | -------------------------------------------------------------------- |
| 高频在 19–21 kHz 附近自然平滑滚落  | 模拟磁带母带、老电影光学声轨、话筒频响或母带工程师主动设置的低通滤波 |
| 整张图像颜色偏暗                   | 古典乐、爵士乐或电影大动态对白轨平均电平较低，属于正常高动态录制     |
| 贯穿全频段的垂直亮线               | 强瞬态打击乐，或局部采样点发生削波失真（Clipping，可切回波形图确认） |
| 约 15.6 kHz / 15.7 kHz 处的细横线  | 早期录音室 CRT 监视器的行频扫描干扰（PAL 15625 Hz / NTSC 15734 Hz）  |
| 22 kHz 以上存在一层均匀雾状能量    | DSD 转 PCM 或高解析度母带降位深时引入的超声波量化噪声 / 噪声整形     |
| 电子乐中仅部分音色存在整齐高频边界 | 编曲中混用了 44.1 kHz 采样音源与高采样率合成器轨                     |

因此，判断一份无损音频是否为真无损，应将**声谱图细节（尤其是放大后的时频块结构）、发行版母带背景、抓轨日志（EAC / XLD Log）与无损校验库（AccurateRip / CTDB）**结合起来综合核实。

## 常用频谱查看与生成工具

### 1. Audacity：本地手动查看与局部放大

Audacity 提供直观的声谱图与选区频谱分析功能（详见 [Spectrogram View][audacity-view]、[Spectrogram Settings][audacity-settings] 与 [Plot Spectrum][audacity-plot] 手册）：

1. 导入音频文件后，点击左侧轨道名称下拉菜单，切换为 **Spectrogram（频谱图）**。
2. 在声谱图设置中，将 **Scale（刻度）** 设为 **Linear（线性）**，最高频率设为文件采样率的一半（如 48 kHz 文件设为 `24000 Hz`），**Window size** 设为 `2048` 或 `4096`，**Window type** 设为 `Blackman-Harris`。
3. 框选高潮乐段或可疑片段，放大时间轴观察高频边缘与纹理细节。

### 2. Adobe Audition：波形与声谱同屏对照

在 [Adobe Audition][audition-doc] 的波形编辑器（Waveform Editor）中，可按快捷键 `Shift + D` 切换频谱显示，或同时分栏显示上方波形图与下方声谱图。通过右键频谱纵轴可快速切换线性/对数坐标与 FFT 分辨率，适合长音轨的流畅拖动与细节排查。

### 3. Spek 与 FFmpeg：快速预览与批量生成归档图

- **Spek**：轻量级独立声谱图预览工具，拖入音频文件即可快速渲染全轨线性声谱图。
- **FFmpeg 滤镜**：适合在命令行或自动化脚本中用固定参数批量输出声谱图 PNG（详见 [`showspectrumpic` 滤镜文档][ffmpeg-pic]与 [`showspectrum` 文档][ffmpeg-spec]）：

```sh
# 生成带坐标轴与图例的双声道分离声谱图（FFT 窗口 4096，Hann 窗）
ffmpeg -i input.flac -lavfi "showspectrumpic=s=1920x1080:mode=separate:win_func=hann:scale=log" spectrum.png
```

## 规范的频谱核查流程

在整理或分享音频、记录频谱检验结果时，可遵循以下五步：

1. **留存文件元数据**：保存文件的哈希值与 MediaInfo 完整报告（采样率、位深、声道数、编码器版本）。
2. **统一渲染参数**：使用线性频率轴、固定 FFT Size（如 2048 / 4096）与统一动态量程生成全轨声谱图。
3. **全轨加局部双图配合**：除全轨总览图外，截取 3–5 秒高频丰富的局部放大图，以便看清是否存在有损编码块状伪影。
4. **结合多维证据判断**：对照同曲目的其他发行版本、抓轨日志与校验信息，区分母带固有低通与后天有损转码。

## 参考资料

- [Audacity：Spectrogram View][audacity-view] 与 [Spectrogram Settings][audacity-settings]：声谱图坐标、频率轴、FFT、窗口和显示参数。
- [Audacity：Plot Spectrum][audacity-plot] 与 [Sample Rates][audacity-sr]：FFT 频率分辨率、窗口函数、采样率与奈奎斯特频率。
- [Adobe Audition：Displaying audio waveforms and spectral frequency][audition-doc]：波形与声谱图切换及编辑器参数设置。
- [FFmpeg filters：showspectrum][ffmpeg-spec] 与 [showspectrumpic][ffmpeg-pic]：批量生成频谱视频和图片的滤镜文档。
- [SciPy：signal.stft][scipy-stft]：STFT 的窗口、`nperseg`、`nfft` 和重叠参数定义。
- [ITU-R BS.1770][itu-bs1770] 与 [EBU R 128][ebu-r128]：节目响度、真峰值和响度范围测量标准。

[audacity-view]: https://manual.audacityteam.org/man/spectrogram_view.html
[audacity-settings]: https://manual.audacityteam.org/man/spectrogram_settings.html
[audacity-plot]: https://manual.audacityteam.org/man/plot_spectrum.html
[audacity-sr]: https://manual.audacityteam.org/man/sample_rates.html
[audition-doc]: https://helpx.adobe.com/audition/using/displaying-audio-waveforms-spectral-frequency.html
[ffmpeg-spec]: https://ffmpeg.org/ffmpeg-filters.html#showspectrum
[ffmpeg-pic]: https://ffmpeg.org/ffmpeg-filters.html#showspectrumpic
[scipy-stft]: https://docs.scipy.org/doc/scipy/reference/generated/scipy.signal.stft.html
[itu-bs1770]: https://www.itu.int/rec/R-REC-BS.1770
[ebu-r128]: https://tech.ebu.ch/publications/r128
