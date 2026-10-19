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
---

在脚本压制流程中，**VapourSynth（简称 VS）** 作为帧服务器负责解码读取片源，执行裁边、缩放、降噪、去色带等画面处理，再通过 `vspipe` 将未压缩的视频帧以 Y4M 流的形式通过管道送交 `x264`、`x265` 或 `SVT-AV1` 编码器，最后使用 MKVToolNix 与原片音轨、字幕、章节封装成 MKV。

本文面向 **Windows x64 环境**，基于 [VapourSynth R81](https://github.com/vapoursynth/vapoursynth/releases/tag/R81) 与 Python 3.12+ 的现代 `pip` 安装方式，以一份**逐行扫描、恒定帧率（CFR）、BT.709 SDR 的 4:2:0 片源**为例，从零走通环境搭建、最小脚本编写、裁边缩放与管道编码输出。若只需用图形工具快速转码，可先参考[一键压制篇](/posts/encode-one-click/)；相关软件与进阶教程汇总在[压制软件与资料清单](/posts/encode-software/)。

## 核心组件与职责分工

一套最小可用的 VapourSynth 压制环境包含以下组件：

| 组件                   | 在工具链中的职责                                                        |
| ---------------------- | ----------------------------------------------------------------------- |
| Python（64 位 3.12+）  | 执行 `.vpy` 脚本，并通过 `pip` 管理 VS 本体与 Python 滤镜包             |
| VapourSynth            | 提供视频处理核心 API、内置基础滤镜（`std`、`resize`）与插件接口         |
| L-SMASH-Works 等源滤镜 | 解码 MKV / MP4 / M2TS 视频流，建立精确到帧的随机访问索引                |
| VapourSynth Editor     | 编写 `.vpy` 脚本、逐帧预览画面、测量滤镜速度与辅助裁边                  |
| `vspipe`               | 运行 `.vpy` 脚本并将处理后的视频帧以 Y4M 格式输出到标准输出管道         |
| 编码器与 MKVToolNix    | `x264` / `x265` / `SVT-AV1` 负责压缩视频流，MKVToolNix 负责最终混流封装 |

## 阶段一：安装 VapourSynth 与预览编辑器

### 1. 用 pip 部署虚拟环境与源滤镜

自 VapourSynth R74 起，[官方安装文档](https://www.vapoursynth.com/doc/installation.html)已改为直接通过 Python 的 `pip` 安装，无需再像早期教程那样手动拼凑便携包目录。

先在系统中安装 **64 位 Python 3.12 或更高版本**（以及 Microsoft Visual C++ Redistributable 运行库）。随后在压制工作目录中打开 PowerShell，创建虚拟环境并安装 `vapoursynth` 与 [L-SMASH-Works 源滤镜](https://github.com/HomeOfAviSynthPlusEvolution/L-SMASH-Works)（`vapoursynth-lsmas`）：

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install vapoursynth vapoursynth-lsmas
.\.venv\Scripts\vapoursynth.exe config
.\.venv\Scripts\vspipe.exe --version
```

上面所有命令直接调用 `.venv\Scripts\` 下的可执行文件，无需事先激活虚拟环境。

### 2. 用测试脚本验证 VS 核心与 vspipe

在工作目录新建 `blank.vpy`，生成一段 24 帧、1280×720、10-bit 的测试空白片段：

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

在 PowerShell 中运行以下命令验证脚本解析与帧输出：

```powershell
.\.venv\Scripts\vspipe.exe --info blank.vpy -
.\.venv\Scripts\vspipe.exe --container y4m blank.vpy blank.y4m
```

第一条命令会打印 `1280×720`、`24 frames`、`24 fps`、`YUV420P10` 等流信息；第二条命令实际渲染出 24 帧并写入 `blank.y4m`（测试通过后即可删除 `blank.y4m`）。

### 3. 配置 VapourSynth Editor 预览器

从 [YomikoR/VapourSynth-Editor Releases](https://github.com/YomikoR/VapourSynth-Editor/releases?page=1)（核对版本 `R19-mod-6.10`）下载已适配 R74+ 库查找机制的编辑器。

如果命令行下 `vspipe` 正常，但打开编辑器时提示找不到 VSScript 库，可在 PowerShell 中运行以下命令查看当前虚拟环境的库路径与插件目录：

```powershell
.\.venv\Scripts\python.exe -c "import vapoursynth as vs; print(vs.get_vsscript()); print(vs.get_plugin_dir())"
```

然后将打印出的路径填入编辑器设置，或运行 `.\.venv\Scripts\vapoursynth.exe register-install` 注册当前环境。

编辑器中的常用快捷键如下（基于[默认快捷键定义](https://github.com/YomikoR/VapourSynth-Editor/blob/R19-mod-6.10/common-src/settings/settings_manager.cpp)）：

| 菜单项             | 快捷键 | 功能说明                                            |
| ------------------ | ------ | --------------------------------------------------- |
| Preview            | `F5`   | 打开画面预览窗口，拖动时间轴逐帧检查滤镜效果与裁边  |
| Check script       | `F6`   | 检查脚本语法与输出节点属性（不实际渲染全片）        |
| Benchmark          | `F7`   | 测试指定帧范围内的纯脚本解码与滤镜处理速度（fps）   |
| Encode video       | `F8`   | 调用外部编码器压制当前脚本                          |
| Enqueue encode job | `F9`   | 将当前脚本加入内置编码队列（按 `F10` 打开队列面板） |

### 4. 查找与按需安装滤镜插件

日常无需预先塞入几十个滤镜包，遇到具体画质问题时再按需安装：

- **[VapourSynth Database（VSDB）](https://vsdb.top/)**：检索滤镜插件的命名空间（Namespace）、功能简介与上游 GitHub 仓库地址。
- **[vsrepo](https://github.com/vapoursynth/vsrepo)**：命令行插件管理工具，支持 `vsrepo update` 与 `vsrepo install <包名>`（已发布 PyPI wheel 的新版插件及脚本库如 `havsfunc`、`vstools` 等，也可按各自仓库说明直接用 `pip install` 安装；早期 `VSRepoGUI` 仓库已归档停更，不再使用）。

需要注意：像 `havsfunc` 这类 Python 脚本函数库内部往往还会调用多个底层 C/C++ 原生滤镜 DLL；导入某个函数报错时，根据报错提示补齐对应的底层插件即可。

## 阶段二：编写最小脚本、裁边与缩放

### 1. 用 LWLibavSource 导入源视频

将待处理的测试片源命名为 `source.mkv` 放入工作目录，新建 `encode.vpy`：

```python
import vapoursynth as vs

core = vs.core
src = core.lsmas.LWLibavSource(source="source.mkv")
src.set_output()
```

运行 `.\.venv\Scripts\vspipe.exe --info encode.vpy -` 或在编辑器中按 `F5` 预览。首次打开 `source.mkv` 时，L-SMASH-Works 会扫描全片并在同目录下生成 `source.mkv.lwi` 索引文件（耗时取决于文件大小与磁盘速度；若源目录只读，可通过 `cachefile` 或 `cachedir` 参数将索引指向可写目录，详见[插件说明](https://github.com/HomeOfAviSynthPlusEvolution/L-SMASH-Works/blob/master/VapourSynth/README.md)）。

### 2. 检查画幅黑边并执行偶数裁切（Crop）

许多宽高比为 `2.39:1` 的宽银幕电影封装在 `1920×1080` 标准帧内，上下带有黑边。在编辑器中按 `F5` 打开预览窗：

1. 拖动时间轴抽查片头、中段、亮场与特效镜头，确认全片画幅固定（注意避开带有 IMAX 变画幅切换的影片，且不要把夜间纯黑场景误当成黑边）。
2. 开启预览窗右下角的 **Crop（裁切辅助面板）**，模式选 `Relative`，放大画面边缘微调 `Top`、`Bottom`、`Left`、`Right`，直到正好切净黑边。
3. **满足色度采样偶数对齐**：对于 `YUV 4:2:0` 视频，1 个色度像素对应 `2×2` 个亮度像素，因此上下左右的裁切像素数必须为**偶数**。如果发现边缘有 1 像素的暗线或脏边，可再多裁 1 像素凑成偶数（或后续用 `FillBorders` / 边缘修复滤镜处理）。
4. 预览面板的数值仅作测量辅助，确认无误后需写入脚本的 `core.std.Crop` 中。

### 3. 等比缩放与转换 10-bit 输出（Resize）

假设 `source.mkv` 为 `1920×1080` 方形像素（SAR `1:1`），经测量上下各有 `138` 像素黑边，裁切后有效画面为 `1920×804`。若目标是将宽度等比缩放到 `1280`，则对应高度为 $804 \times (1280 / 1920) = 536$，同时将输出位深转换为 10-bit（`vs.YUV420P10`）以减少后续编码色带。

完整的 `encode.vpy` 如下：

```python
import vapoursynth as vs

core = vs.core
src = core.lsmas.LWLibavSource(source="source.mkv")

# 裁去上下各 138 像素黑边，得到 1920x804
cropped = core.std.Crop(src, top=138, bottom=138)

# 等比缩放到 1280x536，并转为 10-bit YUV420P10（使用误差扩散抖动）
resized = core.resize.Bicubic(
    cropped,
    width=1280,
    height=536,
    format=vs.YUV420P10,
    dither_type="error_diffusion",
)
resized.set_output()
```

编写要点：

- 若不需要缩放分辨率、仅需将 8-bit 裁边画面转为 10-bit 送交 x265，可去掉 `width` 与 `height` 参数（或直接使用 `core.resize.Point(cropped, format=vs.YUV420P10)`）。
- 上例建立在源片与输出均为 **BT.709、Limited Range SDR** 的前提下，无需做色彩矩阵转换。若源片为 RGB、标清 BT.601 或 HDR BT.2020，需在 `resize` 中显式指定 `matrix_in_s`、`matrix_s` 等色彩转换参数（详见 [Resize 官方文档](https://www.vapoursynth.com/doc/functions/video/resize.html)与[认识 HDR](/posts/understanding-hdr/)）。

<a id="把画面交给编码器"></a>

## 阶段三：把画面交给编码器

### 1. 截取片段试压（Trim 或 vspipe 帧范围）

正式压制全片前，先截取一小段（例如 240 帧，约 10 秒）测试管道与编码参数。有两种常用截取方式：

- **方式一：直接在 `vspipe` 命令行指定 `--start` 与 `--end`**（无需改动脚本，两边均包含边界帧，如 `0` 到 `239` 共 240 帧）：
  ```powershell
  .\.venv\Scripts\vspipe.exe --container y4m --start 0 --end 239 encode.vpy sample.y4m
  ```
- **方式二：在脚本末尾用 `std.Trim` 或 Python 切片截取特定镜头**：
  ```python
  # 截取第 10000 到 10239 帧（共 240 帧；等价于 Python 切片 resized[10000:10240]）
  sample = core.std.Trim(resized, first=10000, last=10239)
  sample.set_output()
  ```
  _注意：使用 `Trim` 试压完毕后，正式压制全片前务必删掉 `Trim` 行，恢复 `resized.set_output()`。_

### 2. 通过管道连接 x265 / x264 编码

由于未压缩的 `.y4m` 文件体积巨大，实际压制时使用匿名管道 `|` 将 `vspipe` 的标准输出（`-`）直接喂给 `x265` 的标准输入（`-`）。

_环境提示：Windows 自带的旧版 PowerShell 5.1 会将管道 `|` 中的数据当作文本对象解析并破坏二进制视频流。因此运行管道命令时，请使用 **`cmd.exe`（命令提示符）**、保存为 `.bat` / `.cmd` 批处理脚本，或使用 **PowerShell 7（`pwsh`）**。_

在 `cmd.exe` 中执行以下试压命令（请确保 `x265.exe` 已放入环境变量 `PATH` 或当前目录）：

```bat
".venv\Scripts\vspipe.exe" --container y4m --start 0 --end 239 encode.vpy - | x265 --y4m --preset slow --crf 20 --output-depth 10 --colorprim bt709 --transfer bt709 --colormatrix bt709 --range limited --output sample-x265.hevc -
```

参数说明：

- `--container y4m` 与 `--y4m`：`vspipe` 在帧流头部附带分辨率、帧率与像素格式信息，`x265` 据此自动识别输入规格。
- `--colorprim bt709 --transfer bt709 --colormatrix bt709 --range limited`：由于 Y4M 管道头不传递色彩空间元数据，需在编码器参数中显式写入源片的色彩标记，防止成品播放时因标记缺失被播放器误判。
- `--output sample-x265.hevc -`：末尾的 `-` 表示从标准输入读取视频流，并将编码后的 HEVC 裸流保存为 `sample-x265.hevc`。

若改用 `x264` 压制 8-bit H.264，可将脚本输出改为 `vs.YUV420P8`，并使用：

```bat
".venv\Scripts\vspipe.exe" --container y4m --start 0 --end 239 encode.vpy - | x264 --demuxer y4m --preset slow --crf 18 --colorprim bt709 --transfer bt709 --colormatrix bt709 --range tv --output sample-x264.mkv -
```

（编码器参数对比与 SVT-AV1 用法详见[编码篇：x264、x265 与 AV1](/posts/encode-codecs/)与[压制练习篇](/posts/encode-learning/)。）

## 阶段四：全片输出、MKV 封装与验收

1. **执行全片编码**：试压样片确认画面、比例与色彩无误后，去掉 `vspipe` 命令中的 `--start 0 --end 239`，将输出文件名改为 `full-encode.hevc` 跑完全片，并在结束后核对终端打印的总编码帧数是否与源片一致。
2. **使用 MKVToolNix 混流封装**：打开 MKVToolNix GUI，先拖入原始 `source.mkv`（取消勾选原视频轨，保留所需的原片音轨、字幕、字体附件与章节），再拖入新压好的 `full-encode.hevc` 裸流。
   - **核对裸流帧率**：导入 `.hevc` 裸流时，在轨道属性的“默认时长 / 帧率”栏确认其识别出的帧率与源片完全一致（例如 `24000/1001p`），防止因裸流缺少容器时间戳导致音画逐渐失步。
   - 具体的轨道语言标记、默认轨设置见[蓝光原盘 Remux 教程](/posts/blu-ray-remux/#第四步用-mkvtoolnix-整理成品)、[字幕处理教程](/posts/subtitle-workflow/)与[章节教程](/posts/media-chapters/)。
3. **回看验收与记录归档**：用播放器打开最终封装的 MKV，抽查片头、中段与片尾的音画字幕同步，并用 MediaInfo 核对分辨率、帧率与色彩标记。最后将本次使用的 `encode.vpy` 脚本与 `.cmd` 编码命令保存在工程目录中以便日后复查。

## 常见报错排查速查

| 报错或异常现象                           | 排查方向与解决办法                                                                       |
| ---------------------------------------- | ---------------------------------------------------------------------------------------- |
| `No module named 'vapoursynth'`          | 检查当前调用的 `python.exe` 是否为安装了 VS 的 `.venv` 虚拟环境                          |
| `No attribute with the name lsmas`       | 检查 `vapoursynth-lsmas` 是否安装在当前虚拟环境中，且均为 64 位                          |
| 插件 DLL 加载失败（Error 126）           | 安装最新 Visual C++ 运行库，检查滤镜是否缺少依赖的外部 DLL（如 FFTW）                    |
| 命令行 `vspipe` 正常但编辑器报错         | 在 VapourSynth Editor 设置中核对 `VSScript` 路径是否指向 `.venv`                         |
| `Resize error: Matrix must be specified` | 源帧缺少色彩属性，或在做 RGB ↔ YUV 转换时未在 `resize` 中指定 `matrix_in_s` / `matrix_s` |
| PowerShell 下管道编码立刻中断报错        | 改用 `cmd.exe`、`.bat` 批处理或 PowerShell 7（`pwsh`）运行二进制管道                     |
| 封装后成片只有几十秒或音画失步           | 检查脚本中是否忘删测试用的 `std.Trim`，以及导入裸流时是否正确填写了 `24000/1001p` 帧率   |

## 参考资料

- VapourSynth 官方文档：[安装指南](https://www.vapoursynth.com/doc/installation.html)、[快速入门](https://www.vapoursynth.com/doc/gettingstarted.html)、[vspipe 输出说明](https://www.vapoursynth.com/doc/output.html)、[Crop 裁切](https://www.vapoursynth.com/doc/functions/video/crop_cropabs.html)、[Resize 缩放与格式转换](https://www.vapoursynth.com/doc/functions/video/resize.html)、[Trim 截取](https://www.vapoursynth.com/doc/functions/video/trim.html)。
- 工具与插件仓库：[VapourSynth Releases（R81）](https://github.com/vapoursynth/vapoursynth/releases/tag/R81)、[YomikoR/VapourSynth-Editor](https://github.com/YomikoR/VapourSynth-Editor/releases)、[L-SMASH-Works](https://github.com/HomeOfAviSynthPlusEvolution/L-SMASH-Works)、[vsrepo](https://github.com/vapoursynth/vsrepo)、[VSDB 插件目录](https://vsdb.top/)。
- 进阶滤镜与片源处理教程：[VCB-Studio 公开教程](https://guides.vcb-s.com/)、[FXXS 压制教程](https://fxxs-encoder.github.io/)、[Encode Mystery](https://guide.geeking.moe/)，以及[压制软件与资料清单](/posts/encode-software/#编码器与滤镜进阶)。
