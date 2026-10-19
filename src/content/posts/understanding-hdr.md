---
title: 认识 HDR
description: HDR 是什么，HDR10、HDR10+、HLG 和杜比视界有什么区别，MediaInfo 里的 Profile、BL、EL 与 RPU 又该怎么读。
author: Ayulog
pubDatetime: "2026-10-10T21:00:00+08:00"
modDatetime: "2026-10-11T16:00:00+08:00"
draft: false
category: diy
tags:
  - Dolby Vision
  - 蓝光
---

[认识蓝光碟片](/posts/understanding-blu-ray/)提到，UHD 蓝光普遍采用 HDR10，部分发行版同时包含 Dolby Vision 或 HDR10+。在整理或播放这类片源时，除了看文件名中的 `HDR`、`DV` 标识，更需要确认视频流内部的实际数据构成、重新封装后的保留情况，以及播放设备的输出方式。

本文先梳理 HDR 的核心概念与主流格式差异，再说明如何解读 MediaInfo 中的关键字段及排查播放链路。

## HDR 的核心作用

**HDR（High Dynamic Range，高动态范围）**扩展了视频信号能够表达的亮度跨度，使画面中的高光、正常照明区域与暗部阴影拥有更大的表现空间；与之相对的是 **SDR（Standard Dynamic Range，标准动态范围）**。

以室内镜头为例，HDR 可以在保持室内人物面部正常曝光的同时，让窗外阳光、灯光或金属反光呈现出显著更高的局部亮度，并保留高光区域的细节层次。HDR 的设计目标并非将整幅画面统一提亮——夜景镜头依然保持深邃的暗部，高光仅在特定光源或反光处触发。至于最终画面呈现的细节，则由前期拍摄、母版制作、调色、编码参数与显示设备性能共同决定。

## 亮度、色域、位深与分辨率

这组高频术语分别描述视频信号的不同维度：

| 概念       | 说明什么                                 | 常见标记                  |
| ---------- | ---------------------------------------- | ------------------------- |
| 动态范围   | 从暗部到高光可以表示多大的亮度跨度       | SDR、HDR                  |
| 色域       | 可以表示哪些颜色、色彩范围有多大         | BT.709、P3、BT.2020       |
| 位深       | 每个分量用多少级数值表示，渐变划分精度   | 8bit、10bit、12bit        |
| 分辨率     | 一帧画面包含多少像素                     | 1920×1080、3840×2160      |
| 编码与容器 | 视频如何压缩编码、多条轨道如何封装进文件 | HEVC、AV1；MKV、MP4、M2TS |

这些参数彼此独立组合：例如 10bit 位深广泛用于 1080p SDR 视频压制以平滑色彩渐变；而 UHD HDR 视频则通常将 3840×2160 分辨率、10bit 位深、BT.2020 色域容器与 PQ / HLG 传递函数结合使用。

### 亮度单位（nit）与峰值指标

显示亮度通常用 **nit（尼特）**表示（$1\text{ nit} = 1\text{ cd/m}^2$）。传统 SDR 制作常以约 100 nit 的参考白作为基准，实际观看亮度则随显示器设置和环境光调整。

在 HDR 规范与 MediaInfo 报告中常见的 1000、4000、10000 nit，分别对应三类不同概念：

- **信号系统的表示上限**：如 PQ 曲线最高可编码至 10000 nit；
- **母版监视器的峰值亮度**：后期调色所使用的参考监视器规格（常见 1000 nit 或 4000 nit）；
- **内容像素的峰值亮度**：影片中单帧最亮像素的目标亮度值。

查看电视或显示器规格时，还需区分小窗口峰值亮度（如 2% 或 10% 窗口）、持续亮度与全屏亮度，并结合暗部黑位、控光分区和色彩准确度综合评估显示效果。

### BT.2020 信号容器与实际调色色域

UHD HDR 视频规范统一使用 **BT.2020** 作为色彩信号的容器范围，而当前大多数电影母版的实际调色范围主要落在 **DCI-P3 / Display P3** 色域内。

因此，MediaInfo 中同时出现 `Color primaries: BT.2020` 和 `Mastering display color primaries: Display P3` 是标准现象：前者表示视频流按 BT.2020 容器编码，后者记录了母版调色监视器的 P3 色域规格。显示端在接收 BT.2020 信号后，会根据自身面板的色域覆盖能力完成映射显示。

### 10bit 与 12bit 位深

8bit 每个色彩分量提供 256 个量化等级，10bit 提供 1024 个等级，12bit 则提供 4096 个等级。由于 HDR 覆盖的亮度跨度远大于 SDR，至少需要 10bit 位深才能避免天空、灯光光晕等平滑渐变区域出现断层色带（Banding）。

在实际播放链路中，视频文件的编码位深、播放器内部渲染精度、HDMI 输出位深与显示面板原生位深各自独立工作。例如 10bit 编码的视频经播放器高精度处理后，可通过 HDMI 以 10bit 或 12bit 信号输出给显示设备。

## PQ、HLG 与色调映射

视频文件中存储的是离散的数字码值，显示设备需要通过**传递函数（Transfer Function）**将这些码值还原为对应的光学亮度。现行 [ITU-R BT.2100-3（2025）][itu-bt2100] 标准规定了两套 HDR 传递函数体系：**PQ** 与 **HLG**。

### PQ：按绝对亮度编码

**PQ（Perceptual Quantizer，感知量化）**的电光转换函数由 SMPTE ST 2084 定义，依据人眼对亮度的非线性感知特性分配码值，每个码值直接对应绝对亮度值，最高编码上限为 **10000 nit**。HDR10、HDR10+ 以及主流的 Dolby Vision 发行格式均建立在 PQ 传递函数之上。

### HLG：面向广播与直播的相对亮度体系

**HLG（Hybrid Log-Gamma）**由 BBC 与 NHK 联合开发，将信号下半段定义为传统伽马曲线、上半段定义为对数曲线，采用与场景相关的相对亮度表示方式（详见 [BBC 的 HLG 项目说明][bbc-hlg]）。

显示端会根据自身的峰值亮度与观看环境自动调整 HLG 信号的呈现，基础显示过程不依赖母版监视器元数据或逐帧动态元数据，且在色彩空间一致的前提下对传统 SDR 接收端具备良好的向下兼容性，因此广泛应用于电视广播、体育直播及部分相机录制。

### 色调映射：把片源亮度适配到屏幕

当片源中的高光目标亮度（例如 4000 nit）超出显示设备的实际峰值亮度（例如 800 nit）时，系统需要在保留高光层次与维持画面整体亮度之间做折中转换，这一过程称为 **Tone Mapping（色调映射）**；同理，超出面板物理色域的色彩也会经过色域映射。

色调映射既用于将高亮度 HDR 片源适配到不同档次的 HDR 屏幕，也用于在普通 SDR 显示器上观看 HDR 影片（HDR 转 SDR）。映射计算可以由本地播放器（如 mpv、madVR）、操作系统或电视机内置芯片完成。

## 常见 HDR 格式

在 UHD 蓝光、流媒体与本地视频文件中，最常遇到以下几种 HDR 格式：

| 格式                         | 技术特征                                                    | 播放与回退兼容性                                                |
| ---------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------- |
| **HDR10**                    | 10bit、BT.2020、PQ 传递函数，携带静态元数据                 | UHD 蓝光与 HDR 视频的基础强制格式，软硬件支持最广               |
| **HDR10+**                   | 在 HDR10 基础上增加逐场景 / 逐帧动态元数据                  | 需要片源与显示端同时支持；不支持 HDR10+ 的设备自动回退为 HDR10  |
| **Dolby Vision（杜比视界）** | 包含动态元数据与多种 Profile，支持单层或双层码流结构        | 能否向下回退为 HDR10 取决于具体 Profile（如 P7、P8.1 支持回退） |
| **HLG**                      | 基于 HLG 传递函数，无需动态元数据，常见于广播电视与拍摄素材 | 需播放软件与显示器识别 HLG 传递函数并匹配对应色彩空间           |

此外，国内流媒体与终端设备上还会见到 **HDR Vivid**（由世界超高清视频产业联盟 [UWA 制定的动态 HDR 标准][uwa-hdr]）。HDR10+、Dolby Vision 与 HDR Vivid 各自使用独立的动态元数据规范，需要片源、播放器与显示设备在对应标准下协同支持。其中 [HDR10+ 官方 FAQ][hdr10plus-faq] 明确了其基于 HDR10 的向下兼容机制。

## 静态与动态元数据

**元数据（Metadata）**用于向显示设备描述母版制作环境与内容亮度特征，辅助显示端执行更准确的色调映射：

- **静态元数据**（如 HDR10 使用的 SMPTE ST 2086 和 MaxCLL / MaxFALL）：整部影片共用一组固定数值。
- **动态元数据**（如 HDR10+、Dolby Vision）：可按每个场景甚至每一帧调整亮度映射参数，让暗场与亮场各自获得合适的映射曲线。

MediaInfo 中常见的静态元数据字段含义如下：

| MediaInfo 常见字段                  | 技术含义                                  | 解读注意事项                                              |
| ----------------------------------- | ----------------------------------------- | --------------------------------------------------------- |
| `Mastering display color primaries` | 母版调色监视器的色域规格（如 Display P3） | 描述制作参考环境，单帧实际色彩分布可能小于该范围          |
| `Mastering display luminance`       | 母版监视器的黑位与最大标称亮度            | 常见 `min: 0.0001 / 0.0050 cd/m2, max: 1000 / 4000 cd/m2` |
| `MaxCLL`                            | Maximum Content Light Level，内容最大光级 | 全片最亮单像素的峰值亮度，部分发行版可能留空或标注为 0    |
| `MaxFALL`                           | Maximum Frame-Average Light Level         | 全片所有帧中“单帧平均亮度”的最大值                        |

在播放静态 HDR10 片源时，现代电视与播放器（如 [mpv 的实时峰值检测][mpv-manual]）也可以通过实时分析画面直方图来实现设备端的“动态色调映射”；而片源自带的 HDR10+ 或 Dolby Vision 动态元数据，则是直接提供制作端预设的逐景映射指令。

## 杜比视界的 Profile、BL、EL 与 RPU

在杜比视界（Dolby Vision）码流中，**Profile** 定义编码结构与向下兼容方式，**Level** 则定义分辨率与帧率对应的解码速率规格。

处理 HEVC 杜比视界片源时，会频繁接触三个核心组件：

| 缩写    | 名称                      | 在 HEVC 杜比视界片源中的作用                                             |
| ------- | ------------------------- | ------------------------------------------------------------------------ |
| **BL**  | Base Layer，基础层        | 承载主画面视频流；是否具备 HDR10 向下兼容性由 Profile 决定               |
| **EL**  | Enhancement Layer，增强层 | UHD 蓝光双层结构（Profile 7）中的增强层流，分为 MEL 与 FEL               |
| **RPU** | Reference Processing Unit | 携带逐帧动态元数据与映射参数的数据单元，用于指导显示端画面重构与色调映射 |

### Profile 5、7 与 8 的区别

本地影视整理中最常遇到以下几种 Profile（转换工具规则详见 [dovi_tool 文档][dovi-tool]）：

| Profile         | 码流结构与常见来源                                                 | 向下兼容与播放特性                                                            |
| --------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| **Profile 5**   | `BL + RPU` 单层，常见于流媒体（WEB-DL），使用专有 IPTPQc2 色彩空间 | 无 HDR10 兼容基础层；若在不支持 DV 的链路按普通 YCbCr 解码会出现画面偏绿/偏紫 |
| **Profile 7**   | `BL + EL + RPU` 双层，UHD 蓝光原盘标准格式                         | BL 为标准 HDR10 视频流，支持回退为 HDR10；完整双层处理需同时解码 EL 与 RPU    |
| **Profile 8.1** | `BL + RPU` 单层，基于 HDR10 兼容基础层                             | 兼具杜比视界动态元数据与 HDR10 向下兼容能力，广泛用于本地兼容封装             |
| **Profile 8.4** | `BL + RPU` 单层，基于 HLG 兼容基础层                               | 常见于移动设备拍摄视频，基础回退目标为 HLG                                    |

### MEL、FEL 与双层重构

UHD 蓝光使用的 Profile 7 根据增强层（EL）的数据内容分为两类：

- **MEL（Minimal Enhancement Layer，最小增强层）**：EL 不含有效画面差值信息，画面细节完全在 BL 中，体积较小。
- **FEL（Full Enhancement Layer，完整增强层）**：EL 包含 1080p 残差图像数据，与 10bit BL 叠加并结合 RPU 运算后，可重构出最高 12bit 精度的画面信号。

在播放或转换 Profile 7 片源时需要注意两层差异：

1. **播放端对 FEL 的处理**：部分播放器或电视在播放 Profile 7 文件时，仅读取 `BL + RPU` 来触发杜比视界模式，并未实际解码叠加 FEL 的残差图像。
2. **P7 转 P8.1 的数据取舍**：使用 `dovi_tool` 将 Profile 7 转换为单层 Profile 8.1 时，会丢弃 EL 增强层并将 RPU 转换为 P8.1 兼容形式。对于 MEL 片源，这种转换不会损失画面残差数据；而对于 FEL 片源，丢弃 EL 意味着舍弃了增强层中的残差图像信息。

### 码流层数与容器轨道结构

UHD 蓝光原盘通常将 Profile 7 的 BL（2160p）和 EL（1080p，内含 RPU）分别存放在两条独立的 HEVC 视频流（两个 PID）中；而在封装为 MKV 时，MakeMKV、MKVToolNix（81.0 及以上）或 `dovi_tool` 会将 BL、EL 与 RPU 合并交织进**同一条 HEVC 视频轨**中。

因此，在 MKV 容器里只看到一条视频轨，依然可以完整承载 `BL + EL + RPU` 双层杜比视界数据。判断文件实际的杜比视界构成，应查看 MediaInfo 中的 `HDR format` 字段或使用 `dovi_tool` 检查码流。

## 怎样读 MediaInfo

打开 [MediaInfo][mediainfo] 的文本（Text）或树状（Tree）视图，重点关注视频轨的编码规格、色彩参数与 `HDR format` 行。

### HDR10 示例

```text
Format                       : HEVC
Format profile               : Main 10@L5.1@High
HDR format                   : SMPTE ST 2086, HDR10 compatible
Bit depth                    : 10 bits
Color range                  : Limited
Color primaries              : BT.2020
Transfer characteristics     : PQ
Matrix coefficients          : BT.2020 non-constant
Mastering display luminance  : min: 0.0050 cd/m2, max: 1000 cd/m2
Maximum Content Light Level  : 1000 cd/m2
Maximum Frame-Average Light Level : 400 cd/m2
```

- `Format profile: Main 10@L5.1@High`：指 HEVC 视频编码采用 Main 10 Profile、Level 5.1 High Tier。
- `Transfer characteristics: PQ` 与 `Color primaries: BT.2020`：表明该视频流采用 PQ 传递函数和 BT.2020 色彩容器。
- `SMPTE ST 2086, HDR10 compatible`：包含母版监视器静态元数据，符合 HDR10 标准。

### Dolby Vision 示例

```text
Dolby Vision, Version 1.0, dvhe.05.06, BL+RPU
Dolby Vision, Version 1.0, dvhe.07.06, BL+EL+RPU, Blu-ray compatible
Dolby Vision, Version 1.0, dvhe.08.06, BL+RPU, HDR10 compatible
```

- **Profile 与 Level**：`dvhe.07.06` 中，`07` 代表 **Profile 7**，`06` 代表 **Level 6**；同理 `dvhe.08.06` 代表 **Profile 8、Level 6**（末尾的 `HDR10 compatible` 表示其子类型为 8.1）。
- **数据层组成**：`BL+RPU` 表示单层结构，`BL+EL+RPU` 表示包含增强层的双层结构（具体属于 MEL 还是 FEL 可通过 `dovi_tool info` 查看）。
- **多格式共存**：若同一视频流同时携带 Dolby Vision 与 HDR10+ 动态元数据，`HDR format` 行会用斜杠同时列出两套格式信息。

### 信号数值范围：Limited 与 Full

MediaInfo 中的 `Color range: Limited`（有限范围，又称 TV Level）是商业蓝光、流媒体与广播电视视频的工业标准约定：在 8bit 下亮度有效码值范围为 `16–235`，在 10bit 下为 `64–940`（两端预留容差空间）。

只要片源标记、播放器解码、显卡驱动与显示器输入设置保持一致（例如均按 Limited 识别或自动匹配），就能准确还原从纯黑到纯白的完整动态范围。若中间某一环将 Limited 信号误当作 Full（`0–1023`）处理，会导致画面泛白、黑位发灰；反之则会导致暗部细节死黑与高光裁切。

## HDR 播放链路的配置要点

要让一部 HDR 影片正确呈现，需要**片源、播放设备、播放软件、传输线材与显示设备**全链路配合：

1. **核实片源规格**：本地文件先用 MediaInfo 查看实际编码与 `HDR format`（特别是区分 Dolby Vision Profile 5、7、8.1）；流媒体播放则需确认当前账号订阅档位、客户端设备认证及画质设置是否已启用 HDR / 杜比视界。
2. **确认显示设备支持**：确认电视或显示器支持的 HDR 标准（HDR10、HDR10+、Dolby Vision 或 HLG）。若屏幕仅支持 HDR10，播放 Profile 7 或 8.1 片源时会自动使用 HDR10 基础层，而播放无兼容层的 Profile 5 片源则需依赖播放器完成色彩空间转换与映射。
3. **检查播放端解码与输出能力**：电视内置应用、外接播放器（如 Apple TV、蓝光机、安卓盒子）或电脑显卡需支持对应 HEVC / AV1 硬解及目标 HDR 格式输出。若播放商业实体 UHD 碟片，还需满足[实体碟播放链路与设备要求](/posts/understanding-blu-ray/#实体碟播放链路与设备要求)。
4. **配置系统与播放器渲染路径**：在 Windows 桌面环境下直通输出 HDR10，通常需先在[“设置 → 系统 → 显示”][windows-hdr]中开启系统 HDR，并在播放器（如 mpv、MPC-HC + madVR / MPC Video Renderer）中设置 HDR 直通（Passthrough）或元数据传递；若使用 SDR 显示器观看，则保持系统 SDR 并启用播放器的色调映射（详情见[色调映射说明](#色调映射把片源亮度适配到屏幕)）。
5. **检查 HDMI / DP 传输链路**：连接功放、回音壁、切换器或扩展坞时，确认中间设备支持 4K 高带宽与对应 HDR 格式直通，并在电视端开启对应 HDMI 接口的“增强格式”或“HDMI 深色（Deep Color）”选项（可参考 [Apple TV 4K 的链路检查说明][apple-hdr]）。
6. **网络与媒体库设置**：通过 NAS 或 Emby、Jellyfin、Plex 播放高码率 UHD 原盘时，确保局域网吞吐稳定，并在服务端与客户端开启“直接播放（Direct Play）”，避免触发不必要的服务端转码。

### 播放链路的兼容性层级

讨论某款软件或设备“支持 HDR / 杜比视界”时，可以按以下五个层级具体核对：

| 环节         | 具体工作内容                                                        |
| ------------ | ------------------------------------------------------------------- |
| 容器解复用   | 正确读取 MKV、MP4、M2TS 或 BDMV 播放列表中的视频轨与附加流          |
| 解码与色彩   | 硬件或软件解码 10bit HEVC / AV1，正确转换 YCbCr 或 IPTPQc2 色彩     |
| 元数据解析   | 读取静态元数据、HDR10+ 动态元数据或杜比视界 RPU（及 FEL 残差）      |
| 渲染与映射   | 在播放器内部执行动态色调映射（如转 SDR 或转 HDR10），或封装直通信号 |
| 接口信号输出 | 向显示设备发送原生 HDR10、HDR10+ 或 Dolby Vision 握手信号           |

例如，[mpv 手册][mpv-manual]支持读取片源中的 Dolby Vision RPU 与 HDR10+ 动态元数据，在渲染器内部完成动态色调映射，或生成适配目标显示器的 HDR10 信号；这种工作方式利用了动态元数据优化画面，而电视端接收到的握手信号显示为 HDR10（或 SDR）。

### 常见色彩与亮度异常排查

- **画面整体发灰、色彩寡淡**：通常是 PQ / HLG 视频在未开启 HDR 直通也未做色调映射的情况下，被当作普通 BT.709 SDR 直接输出。
- **画面严重偏紫或偏绿**：常见于 Dolby Vision Profile 5 片源在不支持 IPTPQc2 色彩空间的播放器上被当作普通 YCbCr 解码。
- **黑位发灰或暗部死黑**：检查播放器、显卡驱动与电视的色彩范围（Limited / Full）设置是否匹配。
- **字幕白得刺眼**：HDR 模式下峰值亮度极高，若播放器将外挂字幕按 100% 满白（峰值亮度）合成，会造成强烈眩光；可在播放器设置中调低字幕白电平（如将字幕亮度限制在 100–200 nit 对应的灰阶）。

## DIY 封装时的元数据保留

进行蓝光 Remux、重制或压制时，虽然视频流未重编码或仅做特定处理，但容器转换与工具版本可能影响 HDR 元数据的留存。操作前后建议分别保存一份 MediaInfo 或 BDInfo 报告进行比对：

1. **记录源盘规格**：确认源视频包含 HDR10、HDR10+ 还是 Dolby Vision（注明 Profile 7 MEL / FEL、8.1 或 5），以及静态元数据数值。
2. **明确成品目标**：根据目标播放设备选择完整保留 Profile 7（`BL + EL + RPU`）还是制作 Profile 8.1（`BL + RPU`）兼容副本，并在发布或归档说明中如实标注。
3. **核对跨片源 RPU 注入条件**：若需将流媒体版的 RPU 注入蓝光版视频（或反之），必须先核对两份视频的剪辑版本、总帧数、片头偏移（帧序）、画幅黑边裁切（Active Area）及基础调色是否完全一致。
4. **重新压制时的元数据同步**：若对视频进行了裁黑边（Crop）、缩放、删减拼接或调色滤镜处理，需使用对应工具同步更新 RPU 的画幅边距参数（Crop offsets）与帧范围，确保元数据与新画面对齐。

后续提取轨道、封装 MKV 与转换 RPU 的具体命令，见 [DIY 工具清单](/posts/media-diy-software/)与[蓝光原盘 Remux](/posts/blu-ray-remux/)。

## 近年新增的 HDR 认证与标准名称

- **DisplayHDR / DisplayHDR True Black**：VESA 制定的显示器 HDR 性能认证标准（涵盖峰值亮度、全屏持续亮度、黑位与色域等测试指标，详见 [VESA 性能要求][vesa-displayhdr]）。当前测试规范为 CTS 1.2，并于 **2026 年 7 月**新增了面向高端 OLED 的 [DisplayHDR True Black 1400 等级][vesa-1400]。
- **HDR10+ Adaptive / HDR10+ ADVANCED**：前者结合环境光传感器调整画面呈现；后者是官方于 **2025 年 12 月**公布的扩展技术体系（涵盖更高亮度范围、色彩与运动控制，详见 [HDR10+ ADVANCED 官方说明][hdr10plus-advanced]与 [官方 FAQ][hdr10plus-faq]）。
- **Dolby Vision 2**：Dolby 于 **2026 年 8 月**[在部分海信电视上首发推出][dolby-vision-2-launch]的新一代杜比视界显示技术体系（详见 [Dolby 官方介绍][dolby-vision-2]），属于产品与显示处理代际名称，与 MediaInfo 中的编码 `Profile` 编号相互独立。

了解完蓝光结构与 HDR 格式后，下一步可继续阅读[章节的处理](/posts/media-chapters/)，了解章节提取、命名与时间轴校正。

## 参考资料

- [ITU-R BT.2100][itu-bt2100]：HDR 电视图像参数，现行有效版本为 BT.2100-3（02/2025）。
- [BBC Research & Development：High Dynamic Range][bbc-hlg]：HLG 的设计、广播应用与 SDR 兼容条件。
- [HDR10+ 官方 FAQ][hdr10plus-faq]、[HDR10+ ADVANCED][hdr10plus-advanced]：HDR10 兼容关系、动态元数据与新功能说明。
- [Dolby Vision for Content Creators][dolby-creators]、[Dolby Vision 2][dolby-vision-2]：动态元数据、内容映射与新一代技术介绍。
- [dovi_tool][dovi-tool]：RPU、EL、Profile 转换及工具行为。
- [MediaInfo][mediainfo]：查看文件的编码、色彩与 HDR 元数据。
- [mpv 手册][mpv-manual]：元数据处理、色调映射、输出色彩与字幕亮度选项。
- [VESA DisplayHDR 性能要求][vesa-displayhdr]：显示器认证及其测试指标。
- [UWA：HDR Vivid][uwa-hdr]：动态 HDR 视频标准介绍。
- [Microsoft：Windows 中的 HDR 设置][windows-hdr]、[Apple：Apple TV 4K 的 HDR 播放条件][apple-hdr]：系统设置、显示设备、连接线与中间设备的要求。

[itu-bt2100]: https://www.itu.int/rec/R-REC-BT.2100/en
[bbc-hlg]: https://www.bbc.co.uk/rd/projects/high-dynamic-range
[hdr10plus-faq]: https://hdr10plus.org/hdr10-faq/
[hdr10plus-advanced]: https://hdr10plus.org/advanced/
[dolby-creators]: https://professional.dolby.com/content-creation/dolby-vision-for-content-creators/
[dolby-vision-2]: https://www.dolby.com/technologies/dolby-vision-2/
[dovi-tool]: https://github.com/quietvoid/dovi_tool
[mediainfo]: https://mediaarea.net/en/MediaInfo
[mpv-manual]: https://mpv.io/manual/master/
[vesa-displayhdr]: https://displayhdr.org/performance-criteria/
[vesa-1400]: https://displayhdr.org/pr/vesa-introduces-displayhdr-true-black-1400-to-certify-next-generation-oled-displays-for-professional-hdr-content-creation/
[uwa-hdr]: https://www.theuwa.com/hdr
[dolby-vision-2-launch]: https://news.dolby.com/en-WW/268998-dolby-vision-2-arrives-bringing-dolby-s-most-advanced-picture-experience-yet-to-hisense-tvs/
[windows-hdr]: https://support.microsoft.com/en-us/windows/hdr-settings-in-windows-2d767185-38ec-7fdc-6f97-bbc6c5ef24e6
[apple-hdr]: https://support.apple.com/en-us/102339
