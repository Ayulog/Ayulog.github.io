---
title: 一键压制篇：用图形工具完成一次转码
description: 用 HandBrake 与 ShanaEncoder 走通一次转码，检查预设、尺寸、帧率、音轨和字幕。
author: Ayulog
pubDatetime: "2026-10-10T12:00:00+08:00"
modDatetime: "2026-10-11T16:00:00+08:00"
draft: false
category: encode
tags:
  - HandBrake
  - ShanaEncoder
---

使用 HandBrake 或 ShanaEncoder 等图形界面工具（GUI）转码时，软件内置预设已经预先设定了缩放尺寸、帧率上限、音频重编码与字幕规则。想要压出预期效果，关键在于选定基础预设后逐项核对**画面裁边与分辨率、帧率时基、质量模式（CRF）以及音轨与字幕行为**，确认无误后再保存为个人预设批量执行。

本文以**逐行扫描、恒定帧率（CFR）的 SDR 视频**为例演示完整图形转码流程（蓝光原盘分流见[蓝光原盘 Remux](/posts/blu-ray-remux/)；需要编写复杂滤镜脚本见 [VapourSynth 压制篇](/posts/encode-vapoursynth/)；编码器参数详解见[编码篇](/posts/encode-codecs/)；软件下载汇总见[压制软件与资料清单](/posts/encode-software/)）。

## 常用图形转码工具选型

| 工具                                                                                     | 适用场景                                           | 特点与注意事项                                                          |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------- |
| [HandBrake](https://handbrake.fr/)                                                       | 跨平台单文件或队列视频转码                         | 视频流必定重新编码；若仅需无损换容器或增删轨道请用 MKVToolNix           |
| [ShanaEncoder](https://shana.pe.kr/shanaencoder_download)                                | Windows 下基于 FFmpeg 的快速转码与批量队列         | 支持查看生成的完整 FFmpeg 参数，支持流复制（Stream Copy）与字幕叠加控制 |
| [StaxRip](https://github.com/staxrip/staxrip)                                            | 串联 VapourSynth / AviSynth 脚本、编码器与封装队列 | 集成全套压制组件，适合从纯 GUI 过渡到脚本压制                           |
| [Simple x264/x265 Launcher](https://github.com/lordmulder/Simple-x264-Launcher/releases) | 将写好的 `.vpy` / `.avs` 脚本直接交给 x264 / x265  | 轻量级编码任务队列前端                                                  |

## HandBrake 转码配置流程

### 1. 载入片源与选择起始预设

从 [HandBrake 官方下载页](https://handbrake.fr/downloads.php)安装程序，打开待转码的 MKV 或 MP4 文件。

先在右侧或顶部预设菜单中选择一个接近目标分辨率的内置预设（如 `General` 下的 `Fast 1080p30` 或 `HQ 1080p30 Surround`）。需要注意：[HandBrake 官方预设](https://handbrake.fr/docs/en/latest/technical/official-presets.html)名称中的 `1080p30` 代表分辨率上限为 1920×1080、峰值帧率上限为 30 fps，并附带默认的音轨转码与字幕规则，因此选完预设后还需按以下步骤逐页检查。

### 2. 尺寸与滤镜（Dimensions & Filters）

- **核对自动裁边（Cropping）**：在 **Dimensions** 页面检查上下左右的自动裁边数值。切换几个不同时间点的预览图，防止片头暗景或可变画幅（IMAX 切换）镜头被误判为黑边裁掉。
- **保持画面宽高比（Resolution & Scaling）**：缩小分辨率时保持正确的显示宽高比（Anamorphic / Display Aspect Ratio）。裁去上下黑边的宽银幕电影（如 `1920×804`）等比缩至 720p 档位时为 `1280×536`，无需为了凑满 `1280×720` 而拉伸画面或重新补黑边。
- **精简滤镜（Filters）**：确认片源为逐行扫描（Progressive）后，在 **Filters** 页将 `Deinterlace`（反交错）与 `Interlace Detection` 设为 `Off`；无特殊噪点或瑕疵时，保持降噪（Denoise）、锐化（Sharpen）与去色带关闭。

### 3. 视频编码、帧率与质量（Video）

切换到 **Video** 页面，依次确认四项核心参数（官方说明见[帧率文档](https://handbrake.fr/docs/en/latest/technical/frame-rates.html)与[质量调优文档](https://handbrake.fr/docs/en/latest/workflow/adjust-quality.html)）：

- **编码器（Video Encoder）**：追求广泛设备兼容可选 `H.264 (x264)`；追求更高压缩率且播放端支持硬解时，可选 `H.265 10-bit (x265)` 或 `AV1 10-bit (SVT-AV1)`。若追求极高转码速度且对体积不敏感，也可尝试显卡硬件编码（NVENC、QSV、AMF）。
- **帧率（Framerate）**：设为 **Same as source（与源相同）**。对于恒定帧率影视片源，可搭配 `Constant Framerate`（或保留 `Variable Framerate` 以透传源时间戳），切勿手动将 `23.976 fps` 改为 `24` 或 `30`。
- **编码器预设（Encoder Preset）**：控制压缩效率与耗时的平衡。日常压制 x264 / x265 常从 `medium` 或 `slow` 起步，快速工作副本可用 `veryfast` 或 `fast`。
- **质量模式（Quality）**：选择 **Constant Quality（恒定质量）**，通过滑块设置 RF（即 CRF）值。x264 1080p 常在 `RF 18–22` 之间取舍（数值越小画质越好、体积越大）。

### 4. 音轨、字幕与章节（Audio, Subtitles & Chapters）

1. **音频（Audio）**：检查轨道列表，区分原声主音轨、配音轨与导演评论轨。若希望无损保留原片音轨（如 AC3、DTS、FLAC），在编码下拉框中选择对应的 **Passthru（直通）**；若需压小体积，可转码为 AAC 或 Opus。
2. **字幕（Subtitles）**：重点区分**软字幕封装**与 **Burn-In（烧录硬字幕）**。勾选 `Burn-In` 会将字幕永久画进视频画面且无法关闭；若希望保留可开关的软字幕，取消勾选 `Burn-In`（注意 MP4 容器对软字幕格式限制严格，封装 ASS 或 PGS 软字幕时建议将主界面的容器格式改为 **MKV**，或压完视频后用 MKVToolNix 单独混流）。
3. **章节（Chapters）**：保持勾选 `Create chapter markers` 以继承原片章节时间点。

### 5. 短片试压与保存个人预设

全片开压前，先将顶部范围从 `Chapters` 改为 `Seconds`，截取正片中段 30–60 秒导出试看。确认画质、体积、音轨和字幕方式均符合预期后，将范围恢复为全片，点击 **Presets → Save New Preset** 保存为自定义预设（建议在名称中标明编码器与用途，如 `x265-10bit-1080p-CRF20`），再加入队列（**Add to Queue**）批量处理。

## ShanaEncoder 批量转码流程

[ShanaEncoder](https://shana.pe.kr/shanaencoder_download) 是 Windows 下常用的 FFmpeg 图形前端（第三方汉化与绿色包归档见 [1265578519/ShanaEncoder](https://github.com/1265578519/ShanaEncoder)），适合需要直观配置 FFmpeg 参数并批量处理多文件的场景：

1. **载入文件并打开快速设置（F6）**：拖入测试视频，按 **F6** 打开快速设置窗口。
2. **配置容器、编码器与 CRF**：选择输出容器（`MKV` 或 `MP4`）与视频编码器（如 `H264 (SW: x264)` 或 `HEVC (SW: x265)`），将质量模式切换为 **CRF**（避免把 CRF 数值误填进固定码率 kbps 模式），设定速度预设（Preset）、Profile 与像素格式（如 10-bit 选 `yuv420p10le`）。
3. **核对尺寸、帧率与字幕叠加**：
   - 不需要改变分辨率时关闭“尺寸变更”；需要等比缩放时可将高度设为 `-1` 由软件按原片比例自动计算。
   - 保持源片帧率，不勾选额外的帧率强转或补帧。
   - 在“视频 / 字幕”页确认**是否勾选“将字幕叠加到视频”**：除非明确需要压制内嵌硬字幕，否则取消勾选该项，防止同目录下的同名外挂字幕被直接烧录进画面。
4. **验证命令行并批量运行**：先用分段编码功能试压 1 分钟，查看日志面板中实际执行的 FFmpeg 命令与输出文件；确认无误后保存预设并开始批量队列。

<a id="脚本前端与其他工具"></a>

## 脚本前端与其他工具

### StaxRip 与 Simple x264/x265 Launcher

- **[StaxRip](https://github.com/staxrip/staxrip)**：将源滤镜分流、VapourSynth / AviSynth 脚本编辑、x264 / x265 / SVT-AV1 / 硬件编码器、音轨压制与 MKVToolNix 封装整合在同一套任务流中。适合既想使用 VapourSynth 滤镜处理画面，又习惯用 GUI 管理编码参数和任务队列的用户。
- **[Simple x264/x265 Launcher](https://github.com/lordmulder/Simple-x264-Launcher/releases)**：专注于接收写好的 `.vpy` 或 `.avs` 脚本，通过内置管道直接送交 x264 或 x265 执行多任务队列编码（最新正式版为 3.04）。使用时需在设置中将 VapourSynth 与 Python 路径指向本机当前环境（纯命令行管道写法见 [VapourSynth 压制篇](/posts/encode-vapoursynth/#把画面交给编码器)）。

### 其他传统压制前端

- **[Hybrid](https://www.selur.de/)**：提供极细粒度的编码器与滤镜开关面板，适合熟悉底层参数的进阶用户。
- **[Avidemux](http://avidemux.sourceforge.net/)**（[源码仓库](https://github.com/mean00/avidemux2)）：带时间轴预览的轻量剪切与转码工具，支持按关键帧（I 帧）做无损流复制粗剪。
- **[MeGUI](https://sourceforge.net/projects/megui/)** 与 **[小丸工具箱](https://maruko.appinn.me/)**：早期基于 AviSynth 与 x264 的经典图形前端，阅读旧压制教程时常会遇到；新建压制任务建议优先使用持续维护的 HandBrake、ShanaEncoder 或 StaxRip。

## 成品验收检查项

转码完成后，先用 [MediaInfo](https://mediaarea.net/en/MediaInfo) 查看输出文件规格，再在目标播放器中抽查以下项目：

| 检查维度 | 核对要点                                                     |
| -------- | ------------------------------------------------------------ |
| 时间线   | 总时长、帧率是否与源片一致，抽查片头、中段与片尾是否音画同步 |
| 画面比例 | 画面宽高比是否正常（人物有无拉长或压扁）、黑边裁剪是否干净   |
| 画质表现 | 暗场有无明显色带或色块跳动，运动场景与边缘细节是否符合预期   |
| 色彩还原 | 画面亮度与对比度是否正常，有无因色彩矩阵或范围标记缺失而发灰 |
| 音轨字幕 | 多音轨与软字幕的语言代码、默认标记是否正确，字幕是否被误烧录 |

## 参考资料与延伸阅读

- [HandBrake 官方文档](https://handbrake.fr/docs/en/latest/)（[内置预设说明](https://handbrake.fr/docs/en/latest/technical/official-presets.html) · [帧率说明](https://handbrake.fr/docs/en/latest/technical/frame-rates.html) · [质量调优](https://handbrake.fr/docs/en/latest/workflow/adjust-quality.html)）。
- [FFmpeg 官方文档](https://ffmpeg.org/documentation.html)：查阅 ShanaEncoder 等前端底层调用的滤镜与编码器参数。
- 站内关联教程：[HandBrake 与 ShanaEncoder：字幕校对用的快速压片教程](/posts/handbrake-shanaencoder-subtitle-proxy/)、[VapourSynth 压制篇](/posts/encode-vapoursynth/)、[编码篇：x264、x265 与 AV1](/posts/encode-codecs/)、[压制练习：从一段样片到文档查阅](/posts/encode-learning/)。
