---
title: VapourSynth 压制篇：环境、脚本与输出
description: 在 Windows 上装好 VapourSynth，用最小脚本完成导入、裁边、缩放和试压输出。
author: Ayulog
pubDatetime: "2026-10-10T12:00:00+08:00"
modDatetime: "2026-10-11T16:00:00+08:00"
draft: false
category: encode
tags:
  - VapourSynth
  - Python
---

VapourSynth（下文简称 VS）负责读取、处理并输出视频帧。脚本描述如何导入片源、裁边、缩放或使用滤镜，编码器再把这些帧压成 H.264、HEVC 或 AV1，最后与音频、字幕和章节封装成成品。

先走通最小流程，不预装一整套滤镜。示例面向 **Windows x64、逐行、恒定帧率、方形像素的 SDR YUV 片源**；裁边和缩放例子进一步限定为已确认的 BT.709、limited range 素材。HDR、Dolby Vision、隔行与 VFR 输入需要另外处理。

公开文档核查于 **2026 年 10 月 10 日**。当日最新正式版为 [VapourSynth R81](https://github.com/vapoursynth/vapoursynth/releases/tag/R81)，官网安装页标题仍显示 R80。下文的接口按现行文档核对，尚未在实际环境中安装插件并完成编码测试。

只想先用图形界面转码，可以先看[一键压制篇](/posts/encode-one-click/)；工具与资料入口在[压制软件与资料清单](/posts/encode-software/)。

## 工具之间怎样配合

```text
片源 → 源滤镜解码 → VapourSynth 处理 → vspipe 输出视频帧
                                             ↓
                                      x264 / x265 / AV1 编码器
                                             ↓
原有音轨、字幕、章节 ──────────────────────→ 封装 → 检查成品
```

| 组件                   | 分工                                 |
| ---------------------- | ------------------------------------ |
| Python                 | 执行 `.vpy` 脚本，管理 Python 包     |
| VapourSynth            | 提供视频处理核心、内置滤镜与插件接口 |
| L-SMASH-Works 等源滤镜 | 解码视频，建立可按帧访问的输入       |
| Python 脚本库          | 组合滤镜；可能还依赖多个原生插件     |
| VapourSynth Editor     | 编辑、检查和预览脚本，本身不是编码器 |
| vspipe                 | 执行脚本并把视频输出到文件或管道     |
| 编码器与封装器         | 分别完成视频压缩和轨道组合           |

MOV、AVI、MKV 只是容器名，无损与否要看编码参数和位深。蓝光和 WEB 视频通常已经压缩过；重新编码是为了新的尺寸、体积或播放目标，会产生新的取舍。保留优质源，避免没有用途的反复有损转码。

## 安装当前环境

### R74 之后的安装方式

[官方安装说明](https://www.vapoursynth.com/doc/installation.html)已推荐使用 Python 包。R74 起 Windows 的打包与查找方式有变化，旧教程里“把 Python、VS Portable、编辑器文件全部复制到同一目录”的步骤不再作为默认方案。

安装受支持的 **64 位 Python 3.12 或更高版本**。以下用已经安装 Python 3.12 和 Python Launcher 的机器举例；如果选择其他受支持版本，相应修改 `py -3.12`，并核对所需插件是否提供对应平台的包。

在自己的工作目录中打开 PowerShell：

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install vapoursynth vapoursynth-lsmas
.\.venv\Scripts\vapoursynth.exe config
.\.venv\Scripts\vspipe.exe --version
```

这里创建一个独立环境，并安装 VS 与 L-SMASH-Works 源滤镜。Windows 下按 `config` 提示检查 Microsoft Visual C++ 运行库。所有命令直接指定虚拟环境中的程序，无需先运行激活脚本。

`vapoursynth-lsmas` 的对应上游是 [HomeOfAviSynthPlusEvolution/L-SMASH-Works](https://github.com/HomeOfAviSynthPlusEvolution/L-SMASH-Works)。本次确认它有 Windows x64 包；其他插件能否用 pip 安装，要看各自项目说明。下载脚本时也要区分实际 `.py` 源码与 GitHub 网页，不能把保存的 HTML 改名为 `.py` 使用。

### 先验证 VS 本体

保存为 `blank.vpy`：

```python
import vapoursynth as vs

vs.core.std.BlankClip(
    width=1280,
    height=720,
    format=vs.YUV420P10,
    length=24,
    fpsnum=24,
    fpsden=1,
).set_output()
```

运行：

```powershell
.\.venv\Scripts\vspipe.exe --info blank.vpy -
.\.venv\Scripts\vspipe.exe --container y4m blank.vpy blank.y4m
```

第一条应报告 1280×720、24 帧、24 fps 等信息；第二条实际请求这些帧并写入测试文件。`--info` 能成功只说明脚本可以建立，不能代替逐帧输出测试。

## 编辑器与插件目录

### VapourSynth Editor

收藏入口是 [YomikoR/VapourSynth-Editor Releases](https://github.com/YomikoR/VapourSynth-Editor/releases?page=1)。本次最新版本为 **R19-mod-6.10（2026-04-17）**，已适配 R74 之后的库查找方式。

命令行能运行、编辑器却找不到 VS 时，先确认两者使用同一个 Python 环境。可查看当前库的位置：

```powershell
.\.venv\Scripts\python.exe -c "import vapoursynth as vs; print(vs.get_vsscript()); print(vs.get_plugin_dir())"
```

对照编辑器设置中的 VSScript 库路径。官方还提供 `vapoursynth register-install`，供外部程序通过 `VSSCRIPT_PATH` 找到所选安装；这是需要时再做的注册步骤，切换多个环境时尤其要知道注册的是哪一个。旧程序的兼容注册另见官方安装文档。

### 编辑器里常用的几个功能

下面按 R19-mod-6.10 的[默认菜单和快捷键](https://github.com/YomikoR/VapourSynth-Editor/blob/R19-mod-6.10/common-src/settings/settings_manager.cpp)整理。自行改过快捷键时，以菜单显示为准。

| Script 菜单        | 默认快捷键 | 用途                                     |
| ------------------ | ---------- | ---------------------------------------- |
| Preview            | F5         | 预览脚本输出，在不同位置检查画面         |
| Check script       | F6         | 求值脚本并读取输出信息，不遍历全片       |
| Benchmark          | F7         | 在所选帧范围请求视频帧，统计脚本处理速度 |
| Encode video       | F8         | 配置外部编码器，执行单个编码任务         |
| Enqueue encode job | F9         | 将脚本加入编码队列                       |
| Jobs               | F10        | 查看和管理任务队列                       |

Benchmark 可以指定首末帧，也可以选择 Whole video。它测的是解码与脚本处理速度，不包含 x264／x265 的编码开销；既不能把短范围测试当成全片检查，也不能拿这个速度直接估计最终编码耗时。

在 **Edit → Snippets and templates** 中，可以把最小脚本保存为 New script template，把核对过的函数用法保存为 Code snippets。模板里先放导入、源读取与输出，不预设固定裁边、降噪或改帧率参数。

使用 F8 编码时，需要分别设置 Header、Executable 和 Arguments。选择 Y4M 头时，编码器也要按 Y4M 输入读取；给输出文件写上 `.mkv` 后缀不会让只能输出裸流的编码器自动完成 MKV 封装。下面先用命令行走通同样的输入输出关系，再保存成编辑器预设。

### 插件怎么找

- [VapourSynth Database](https://vsdb.top/)：查插件用途、namespace、依赖与上游项目。它是第三方目录，条目版本可能落后上游。
- [vsrepo](https://github.com/vapoursynth/vsrepo)：插件管理工具。当前可先在同一环境安装 `vsrepo`，再使用 `vsrepo update` 与 `vsrepo install lsmas` 等命令；已迁移到 pip 的包优先按项目新说明安装。
- [VSRepoGUI Releases](https://github.com/theChaosCoder/VSRepoGUI/releases)：保留旧教程入口。**仓库已归档，项目明确标为 Obsolete**，不能再把它作为新环境的默认安装器。

R74 之后插件布局有变化，旧目录不会全部照常自动加载。原生 DLL、Python 包和 Python 脚本库也不是同一种依赖：`import havsfunc` 成功只说明 Python 这一层可用，它调用的底层滤镜仍可能缺失。先装当前脚本真正用到的组件，缺什么再按报错和文档补齐。

## 写一个最小脚本

把已确认的测试视频命名为 `source.mkv`，与脚本放在当前工作目录，保存下面内容为 `encode.vpy`：

```python
import vapoursynth as vs

core = vs.core
src = core.lsmas.LWLibavSource(source="source.mkv")
src.set_output()
```

这时只有导入与输出，不必预先导入 `awsmfunc`、`havsfunc` 或一组暂时不用的包。当前写法使用 `vs.core`；旧文中的 `vs.get_core()` 和旧 API 插件要逐项更新。

```powershell
.\.venv\Scripts\vspipe.exe --info encode.vpy -
```

首次导入时 L-SMASH-Works 通常需要建立 `.lwi` 索引，耗时受片长、格式和存储速度影响。源目录不可写时，可按[插件文档](https://github.com/HomeOfAviSynthPlusEvolution/L-SMASH-Works/blob/master/VapourSynth/README.md)设置 `cachefile` 或 `cachedir`。

在编辑器中预览多个位置，确认帧率、帧数、尺寸和画面。`24000/1001` 与 `24` 不相同，不能用 `AssumeFPS` 单纯把标签改成看起来顺眼的数值；改变播放速度而不处理音轨会造成不同步。VFR 源的时间戳无法从这里报告的平均帧率恢复。

## 裁边与缩放

### 先确认全片画幅

黑边需要在多个镜头检查，包括片头、字幕、暗场和画幅切换处。不要把黑暗画面当成黑边，也不要按一帧检测结果裁完整部电影。4:2:0 视频的裁切还受到色度采样对齐限制，通常需要偶数裁切量与输出尺寸；单像素脏边要多裁一行或换用其他处理，代价是损失一点画面。

在编辑器中用 F5 预览尚未裁边的输出，找一个边界清楚的镜头，启用裁切面板并选择 Relative。放大边缘，逐项调整 left、right、top、bottom，再换几个位置确认数值。预览面板调整的是显示区域，**单纯调整面板不会改变正式脚本的输出**；需要把确定的数值写进 `core.std.Crop`，重新运行并检查输出尺寸。

下面是一个**明确给定条件的例子**：输入为 1920×1080、方形像素，确认全片上下各有 138 像素黑边。裁后有效画面为 1920×804，等比缩至宽 1280 时，高度是 536。

将最小脚本最后一行替换为：

```python
cropped = core.std.Crop(src, top=138, bottom=138)
resized = core.resize.Bicubic(
    cropped,
    width=1280,
    height=536,
    format=vs.YUV420P10,
    dither_type="error_diffusion",
)
resized.set_output()
```

**138 和 1280×536 仅属于这个算例。** 没有相应黑边就不运行裁切；不需要降分辨率就不填写缩放尺寸。非方形像素源还要考虑 SAR，直接按存储宽高相除会算错显示比例。`std.CropRel` 是旧文常见别名，当前文档使用 `std.Crop`。

### 位深与颜色信息

`format=vs.YUV420P10` 把输出设为 10-bit 4:2:0，源里没有的细节不会因此出现，SDR 也不会变成 HDR。`error_diffusion` 是这里使用的 CPU resize 抖动方式；不要把这段直接移到不支持该方式的 GPU 路径。

示例没有进行 RGB/YUV 矩阵转换或 HDR 色调映射。真实输入若是 RGB、BT.2020、PQ、HLG，或缺少可信的颜色信息，需要根据实际信号填写转换参数；单纯把标签写成 BT.709 不会完成转换。相关说明见 [Resize 文档](https://www.vapoursynth.com/doc/functions/video/resize.html)和本站[认识 HDR](/posts/understanding-hdr/)。

修复脏线、降噪、去色带、抗锯齿等操作，等确认源有对应问题后再加。保留处理前后的对比，避免“滤镜越多越好”。

## 把画面交给编码器

### 先输出短样片

假设输入至少有 240 帧，下面输出前 240 帧；`--end` 包含指定的末帧：

```powershell
.\.venv\Scripts\vspipe.exe --container y4m --start 0 --end 239 encode.vpy sample.y4m
```

Y4M 是带尺寸、帧率等头信息的视频帧流，此处不含音频、字幕和章节。未压缩帧体积很大，只用短样片检查通路；正式流程通常用管道衔接。

另选运动、渐变、暗部和细节片段分别试压。把零散样片拼起来可以帮助估计画质，但这条时间线不再与整片音轨一一对应，不能直接拿来做完整成品。

也可以保存一个单独的测试脚本，在输出前截取连续片段。例如已经确认片长足够时，将前面裁边缩放示例的 `resized.set_output()` 替换为：

```python
sample = core.std.Trim(resized, first=10000, last=10239)
sample.set_output()
```

这会取第 10000 至 10239 帧，共 240 帧。这里的末帧包含在内；等价的 Python 切片则写成 `resized[10000:10240]`，终点不包含在内，详见 [Trim 文档](https://www.vapoursynth.com/doc/functions/video/trim.html)。使用这种测试脚本时，vspipe 输出范围是截取后的新帧序号。正式编码前恢复完整输出节点，别把样片当成整片。

### 用管道连接 x265

准备能输出 10-bit 的 x265 构建，先运行 `x265 --version` 与 `x265 --help`。原版 x265 输入主要是 raw YUV／Y4M；部分修改版支持直接读 `.vpy`，不能把扩展功能当成所有版本都有。

下面放在 **cmd.exe** 中执行，或保存为 `.cmd` 文件。使用同一工作目录，确保 `x265` 可从命令行找到；这样也避开 Windows PowerShell 5.1 对原生程序二进制管道的处理问题。

```bat
".venv\Scripts\vspipe.exe" --container y4m --start 0 --end 239 encode.vpy - | x265 --y4m --preset slow --crf 20 --output-depth 10 --colorprim bt709 --transfer bt709 --colormatrix bt709 --range limited --output sample-x265.hevc -
```

这条命令沿用前面的 **BT.709、limited range、SDR** 前提，颜色参数是在标记实际信号。不能给其他片源无条件复制这些值；Y4M 也不会自动传递全部帧属性或 HDR 元数据。

`slow` 与 CRF 20 只是试压起点，不是推荐给所有素材的质量标准。确认几组样片后，正式输出时去掉 `--start`、`--end`，并换成独立的完整输出文件名。完整日志、编码帧数和退出状态都要检查；文件出现，任务未必结束。

需要换 x264 时，对照它的 `--demuxer y4m` 与输出位深选项；需要 AV1 时，对照具体编码器的 stdin／Y4M 输入说明。三种编码器的 CRF 和 preset 不能互相照搬，见[编码篇](/posts/encode-codecs/)。

## 对比、封装与检查

测试分成两个问题：**前处理是否合理**，以及**编码损失是否可接受**。先对比源与处理结果，再把处理后的帧与编码后解码的帧比较；裁切、缩放已经改变画面，这部分差异要单独归因。

对齐相同时间点和帧，保持显示尺寸、色彩转换与显示设备一致。除静态截图外，还要播放运动片段，观察拖影、闪烁和时域噪声；截图使用 PNG 等无损格式。

最后用 MKVToolNix 将新视频与选定的音轨、字幕、章节封装。若未改时间线，可以沿用相同来源的对应轨道；删帧、拼接或变速后必须重新核对同步。裸 `.hevc` 缺少完整容器时间戳信息，导入时核对其帧率是否正确，尤其分清 `24000/1001` 和 `24`。

具体轨道设置见[蓝光原盘 Remux 的成品整理](/posts/blu-ray-remux/#第四步用-mkvtoolnix-整理成品)、[字幕的处理](/posts/subtitle-workflow/)和[章节的处理](/posts/media-chapters/)。这里视频已经重编码，最终文件不再属于视频 REMUX。

保存脚本、编码命令、程序与插件版本，记录最终尺寸、帧数、耗时和输出体积。成品抽查开头、中段、结尾的音画同步、字幕及章节，并在目标设备上播放。

## 常见问题与进阶入口

| 现象                          | 先检查什么                                                 |
| ----------------------------- | ---------------------------------------------------------- |
| `No module named vapoursynth` | 运行脚本的 Python 是否是安装 VS 的那个环境                 |
| 找不到 `lsmas`                | 源滤镜是否装入同一环境，架构与 API 是否匹配                |
| DLL 加载失败                  | Visual C++ 运行库、插件依赖与版本；不要用随机 DLL 覆盖     |
| 脚本能导入，某一帧才报错      | 对应镜头、滤镜输入格式与边界条件，继续请求实际帧定位       |
| 编辑器失败而 vspipe 正常      | 编辑器选择的 VSScript 路径、Python 环境与自身版本          |
| 色彩转换提示缺少 matrix       | 确认源的实际矩阵、传递特性与范围，按文档补齐转换条件       |
| 试压正常，成品不同步          | 是否保留抽帧／截取语句，是否改变帧率，裸流导入帧率是否正确 |

官方入口：[安装](https://www.vapoursynth.com/doc/installation.html)、[入门](https://www.vapoursynth.com/doc/gettingstarted.html)、[输出与 vspipe](https://www.vapoursynth.com/doc/output.html)、[裁切](https://www.vapoursynth.com/doc/functions/video/crop_cropabs.html)、[缩放与格式转换](https://www.vapoursynth.com/doc/functions/video/resize.html)。

后续按画面问题查 [VCB-Studio 教程](https://guides.vcb-s.com/)、[FXXS](https://fxxs-encoder.github.io/)、[Encode Mystery](https://guide.geeking.moe/)与[压制清单](/posts/encode-software/#编码器与滤镜进阶)里的进阶资料。旧 AVS 流程可继续查 [AviSynth Wiki](http://avisynth.nl/index.php/Main_Page) 与 [AvsPmod](https://github.com/gispos/AvsPmod)，但 `.avs` 和 `.vpy` 的语法、插件接口不能混用。
