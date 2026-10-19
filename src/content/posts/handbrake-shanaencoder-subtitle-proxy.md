---
title: HandBrake 与 ShanaEncoder：字幕校对用的快速压片教程
description: 用 HandBrake 或 ShanaEncoder 压一份 720p 小片，便于字幕校对，同时避开字幕烧录和时间轴偏移。
author: Ayulog
pubDatetime: "2026-10-11T12:00:00+08:00"
draft: false
category: encode
tags:
  - HandBrake
  - ShanaEncoder
---

直接把几十 GB 的蓝光原盘或高码率 Remux 加载进 Aegisub、Subtitle Edit 打轴校对时，拖动时间轴和生成音频波形往往比较卡顿。更顺手的做法是先用 HandBrake 或 ShanaEncoder 快速压制一份体积小、解码轻量的 **720p H.264 工作副本（俗称“校对小片”）**，在编辑器中外挂 SRT / ASS 完成打轴、翻译与初步排版，最后再切回原片做特效精调与成品验收。

制作校对小片的核心要求只有三条：**完整保留原片时长与帧率时基**、**保留原画幅比例（含上下黑边）**、**绝不将测试字幕烧录进视频画面**。下文基于 **HandBrake 1.11.2** 与 **ShanaEncoder 7.4** 整理具体配置步骤（通用图形转码说明见[一键压制篇](/posts/encode-one-click/)）。

## 确认源片版本与提取原盘

开始压片前，先用 [MediaInfo][mediainfo] 核对源视频的时长、帧率（如 `23.976 fps`）、分辨率、扫描方式与音轨列表：

- **严格使用与字幕同版本的源片**：剧场版、导演剪辑版、流媒体 WEB 版与蓝光版的片头标识和镜头剪辑经常存在差异，必须直接从目标正片压制小片。
- **蓝光原盘先按 MPLS 无损提取**：若源片是 BDMV 原盘目录，先核对正片对应的 MPLS 播放列表并无损 Remux 为单个 MKV（详见[蓝光原盘 Remux 教程](/posts/blu-ray-remux/)），切勿直接挑 `STREAM` 目录下体积最大的单个 `.m2ts` 压制，以免遇到无缝分支（Seamless Branching）影片导致漏掉段落。
- **保留全片完整时间线**：压制正式小片时不裁片头、不剪片尾、不变速，输出文件单独命名为 `movie-proof.mp4` 以区分原片。

## 校对小片推荐参数配置

针对常规**逐行扫描、恒定帧率（CFR）的 SDR 视频**，推荐使用以下参数组合：

| 设置项     | 推荐参数                                    | 作用说明                                                           |
| ---------- | ------------------------------------------- | ------------------------------------------------------------------ |
| 容器格式   | `MP4`                                       | 在 Aegisub、Subtitle Edit 与各类播放器中兼容性最好、索引最快       |
| 视频编码器 | 软件 `H.264 (x264)`，8-bit `4:2:0`          | 解码开销极低，拖动时间轴响应迅速                                   |
| 分辨率尺寸 | `1280×720`（保持原宽高比，不放大低清源）    | 常规校字对轴用 720p 即可；若需频繁辨认画面细小背景文字可保 1080p   |
| 画面裁剪   | 上下左右裁剪全部设为 `0`                    | 保留原片上下黑边，确保 ASS 脚本画布与原片坐标 1:1 对应             |
| 质量与预设 | `CRF / RF 23` + 预设 `veryfast`             | 兼顾压制速度与画面可读性；若画面文字模糊可调至 `CRF 21`            |
| 帧率控制   | `Same as source`（保持源帧率）              | 严格保留 `23.976`、`24`、`25` 或 `59.94` 原生帧率与时间戳          |
| 音频设置   | 仅保留一条原声主音轨，`AAC Stereo 160 kbps` | 剔除多余配音轨、评论轨与高码率无损音轨，大幅减小体积并加快波形提取 |
| 字幕设置   | **清空全部字幕轨，关闭字幕烧录（Burn-In）** | 保持画面干净，字幕留在编辑器中外挂实时预览                         |

## 方案一：使用 HandBrake 压制校对小片

### 1. 载入源文件并选择基础预设

从 [HandBrake 官网][hb-download]安装并打开源视频，先在预设列表中选择 `General → Very Fast 720p30` 作为修改起点（该内置预设默认带有自动裁边和 30 fps 帧率上限，需按下面步骤逐页调整）。

### 2. 尺寸（Dimensions）：关闭自动裁剪，保留黑边

切换到 **Dimensions** 页面：

1. 将 **Cropping（裁剪）** 从 `Automatic` 改为 `None`（或选 `Custom` 并将上、下、左、右四个方向的像素全部填为 `0`），确保原片内嵌的上下黑边完整保留，方便后续核对字幕是否压在黑边分界线上。
2. 将 **Resolution Limit** 设为 `720p HD`，保持 `Keep Aspect Ratio`，输出尺寸即为 `1280×720`（针对标准 16:9 画布）。

### 3. 滤镜（Filters）：关闭反交错与额外滤镜

切换到 **Filters** 页面，对于已确认为逐行扫描（Progressive）的片源，将 `Interlace Detection`、`Deinterlace`、`Denoise`、`Sharpen` 等滤镜全部设为 **Off**，加快压制速度。

### 4. 视频（Video）：x264、veryfast 与原片帧率

切换到 **Video** 页面：

- **Video Encoder**：选择 `H.264 (x264)`。
- **Framerate (FPS)**：将默认的 `30` 改为 **Same as source（与源相同）**，下方勾选 `Constant Framerate`（或针对可变帧率片源保留 `Variable Framerate`）。
- **Quality**：选择 `Constant Quality`，将滑块设在 **RF 23**。
- **Encoder Preset**：设为 **veryfast**；`Encoder Tune` 设为 `None`，`Profile` 与 `Level` 均设为 `Auto`。

### 5. 音频与字幕（Audio & Subtitles）：保留单条原声，清空字幕

- **Audio 页面**：只保留与待校对字幕对应的那一条原声音轨（删掉多余的多国配音与导演评论轨），编码选 `AAC (avcodec)`，`Mixdown` 选 `Stereo`，码率设为 `160 kbps`。
- **Subtitles 页面**：点击列表右侧的删除按钮，**清空包括 `Foreign Audio Scan` 在内的所有字幕条目**。若打算将当前配置保存为个人预设，点击 `Selection Behavior` 将字幕自动选择规则设为 `None`，并取消勾选自动添加外语扫描与 Closed Captions，防止批量压片时误把内封字幕烧进画面。

### 6. 试压 1 分钟并导出全片

先将顶部范围改为 `Seconds: 00:00:00 – 00:01:00`，导出 1 分钟测试片 `movie-proof-test.mp4`，拖入 Aegisub 检查画面比例、清晰度与音画同步。确认无误后将范围恢复为全片时长，导出正式小片 `movie-proof.mp4`，并通过 **Presets → Save New Preset** 保存为 `Subtitle-Proof-720p` 预设供日后复用。

## 方案二：使用 ShanaEncoder 压制校对小片

在 Windows 下习惯使用 [ShanaEncoder][shana-download]（v7.4）批量压制多集校对小片时，按以下步骤配置：

### 1. 打开快速设置（F6）配置视频与音频

拖入源视频后按 **F6** 打开快速设置窗口：

1. **输出与视频编码**：文件格式选 `MP4`，视频编码器选 `H264 (SW: x264)`，预设选 `veryfast`，将编码模式从码率（kbps）切换为 **质量（CRF）** 并填入 `23`（`Tune` 设 `None`，`Level` 设 `Auto`）。
2. **尺寸与帧率**：勾选“尺寸变更”，填入 `1280×720`（若源片并非 16:9 画布，可填宽 `1280`、高 `-1` 按原比例自动计算高度），关闭画面裁剪与拉伸；**不勾选**“帧率变更”，保持原片帧率与 `1.0` 原速。
3. **音频与多音轨选择**：音频编码设为 `AAC`、立体声（Stereo）、`160 kbps`。若源文件包含多条音轨，在主界面文件列表上右键点击 **视频/音频流选择**，指定正确的原声主音轨。

### 2. 关闭字幕烧录与自动加载

ShanaEncoder 默认会自动加载同目录下的同名外挂字幕或视频内封字幕并叠加到画面上。制作校对小片时必须关闭该行为：

1. 在 **F6 → 视频 / 字幕** 页面，**取消勾选“将字幕叠加到视频”（`영상에 자막 입히기`）**。
2. 在 **其他** 页面，取消勾选 Closed Caption 封装选项。
3. 先用分段编码功能压出 1 分钟样片，在播放器中关闭字幕显示后回看，确认画面上没有任何被烧死的硬字幕，再关闭分段限制压制全片。

## 在字幕软件中加载小片与复核时间轴

压好 `movie-proof.mp4` 后，建议在工作目录中保持清晰的文件分工：

```text
movie-original.mkv    # 高码率原片（用于最终特效定位与成品复核）
movie-proof.mp4       # 720p 校对小片（日常加载到 Aegisub / Subtitle Edit 打轴校字）
movie-working.ass     # 持续编辑的字幕工程文件
```

在 Aegisub 中加载 `movie-proof.mp4` 时需注意两点：

- **保持 ASS 脚本的 `PlayResX / PlayResY` 为原片分辨率（如 `1920×1080`）**：即使当前预览挂载的是 `1280×720` 小片，也不要对已有 `1920×1080` 的 ASS 工程执行“重采样分辨率”，这样在 720p 小片上调整的坐标在切回 1080p 原片时依然精确对应。
- **单独加载原片字体**：从 MKV 转码生成的 MP4 小片不包含原 MKV 内封的字体附件，预览特定字体样式时需先安装字体或从原片提取附件。

小片压完并挂载字幕后，先在**片头、中段、片尾**各挑一处对白与原片交叉核对：

| 异常现象                       | 原因排查方向                                                              |
| ------------------------------ | ------------------------------------------------------------------------- |
| 全片固定提前或延后半秒         | 检查转码时是否开启了片头截取，或是否选错了带有不同延迟的音轨              |
| 片头对齐，越往后偏差呈线性增大 | 检查转码时是否误将 `23.976 fps` 改成了 `24` 或 `30 fps`                   |
| 某处转场后突然整体错位         | 源视频与字幕分属不同剪辑版本，或原盘提取时漏掉了分支 M2TS                 |
| 时间轴对齐，但字幕位置偏离     | 检查 HandBrake / ShanaEncoder 是否开启了自动裁黑边，或 ASS 画布被误重采样 |

完成全部文本校对、翻译和常规时间轴对齐后，在 Aegisub 中通过“视频 → 打开视频”切回原始高码率 `movie-original.mkv`，复查精细定位、遮罩边缘与特效，再进入[字幕处理与封装流程](/posts/subtitle-workflow/)。

## 特殊片源处理与硬件加速

- **HDR / Dolby Vision 片源**：如果手头只有 4K HDR 原盘，直接压成 8-bit SDR H.264 会因未做色调映射（Tone Mapping）导致画面发灰泛白。虽然仅对听音打轴影响不大，但若需看清画面细节与色彩，可在 HandBrake 的 **Filters → Colourspace** 中将其设为 `BT.709` 完成基础色调映射（HDR 色彩原理详见[认识 HDR](/posts/understanding-hdr/)）。
- **隔行扫描（Interlaced）与胶转磁（Telecine）片源**：老 DVD 或电视录播源若为 `29.97i` 隔行或胶转磁素材，需在 HandBrake 的 **Filters** 页按素材类型开启 `Decomb`（反交错）或 `Detelecine`（逆胶卷），避免画面出现拉丝梳齿或帧率节奏异常。
- **显卡硬件编码加速（NVENC / QSV / AMF）**：若希望几分钟内压完两小时小片，可将视频编码器切换为 `H.264 (NVEnc)`、`H.264 (Intel QSV)` 或 `H.264 (AMD VCE)`，并将预设调至平衡档、CQ / ICQ 设为 `24–26`。硬件编码下的体积会比软件 `x264` 略大，作为临时校对小片完全够用。

## 参考资料

- [HandBrake 官方下载页][hb-download]（[v1.11.2 发布记录][hb-release]）与官方文档：[内置预设][hb-presets]、[质量调优][hb-quality]、[帧率说明][hb-framerate]、[尺寸与裁剪][hb-dimensions]、[字幕处理][hb-subtitles]及[音轨字幕自动选择规则][hb-tracks]。
- [ShanaEncoder 下载页][shana-download]（[v7.4 发布说明][shana-release]）与[官方帮助文档][shana-help]：[字幕叠加开关][shana-subtitles]、[多音轨选择][shana-audio]、[等比缩放][shana-resize]、[帧率与 VFR][shana-framerate] 及 [x264 参数设置][shana-x264]。
- [MediaInfo][mediainfo] 与 [Aegisub 分辨率及色彩矩阵说明][aegisub-resolution]。

[hb-download]: https://handbrake.fr/downloads.php
[hb-release]: https://github.com/HandBrake/HandBrake/releases/tag/1.11.2
[hb-presets]: https://handbrake.fr/docs/en/latest/technical/official-presets.html
[hb-quality]: https://handbrake.fr/docs/en/latest/workflow/adjust-quality.html
[hb-framerate]: https://handbrake.fr/docs/en/latest/technical/frame-rates.html
[hb-dimensions]: https://handbrake.fr/docs/en/latest/advanced/resizing-video.html
[hb-subtitles]: https://handbrake.fr/docs/en/latest/advanced/subtitles.html
[hb-tracks]: https://handbrake.fr/docs/en/latest/advanced/audio-subtitle-defaults.html
[shana-download]: https://shana.pe.kr/shanaencoder_download
[shana-release]: https://shana.pe.kr/shanaencoder_download/173616
[shana-help]: https://shana.pe.kr/shanaencoder_help
[shana-subtitles]: https://shana.pe.kr/48397
[shana-audio]: https://shana.pe.kr/83847
[shana-resize]: https://shana.pe.kr/80582
[shana-framerate]: https://shana.pe.kr/173928
[shana-x264]: https://shana.pe.kr/100453
[mediainfo]: https://mediaarea.net/en/MediaInfo
[aegisub-resolution]: https://aegisub.org/docs/latest/resolution_and_matrix/
