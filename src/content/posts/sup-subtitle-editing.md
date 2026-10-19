---
title: SUP 图形字幕的修改方法
description: 不改文字，只调 SUP 的时间、位置、大小与 forced，或在 BDN XML 与 PNG 上局部修图再编码回去。
author: Ayulog
pubDatetime: "2026-10-11T12:00:00+08:00"
modDatetime: "2026-10-11T16:00:00+08:00"
draft: false
category: subtitles
tags:
  - SUP
  - BDN XML
---

拿到一条现成的蓝光 PGS（`.sup`）字幕时，如果只需要整体平移时间轴、调整对白高低、缩放尺寸或修补几张局部图片，可以直接在图形字幕层修改，无需做全片 OCR 重制。

下文以原版 **BDSup2Sub（Java 5.1.2）** 与 **SUPer（v0.2.8）** 为主介绍图形层的修改方法（C++ / Qt 移植版 BDSup2Sub++ 1.0.2 的菜单差异在对应小节注明）。相关软件下载见[字幕软件清单](/posts/subtitle-software/)；若需要大规模改字、换字体或重新翻译排版，请参考[字幕处理教程：从来源核对到 ASS 与 SUP](/posts/subtitle-workflow/)。

## 按修改需求选择路线

PGS / SUP 保存的是光栅化后的字幕图像、256 色调色板、画面坐标与起止时间戳。动工前先根据修改范围选择路线：

| 修改目标                         | 推荐处理路线                      | 注意事项                                         |
| -------------------------------- | --------------------------------- | ------------------------------------------------ |
| 全片统一提前或延后               | BDSup2Sub 的 `Delay`              | 仅适用于固定时间偏移；中途有增删镜头需分段处理   |
| 播放速度差导致的线性失步         | BDSup2Sub 的 `Change frame rate`  | 适用于 PAL 25 fps 与 23.976 / 24 fps 同剪辑互转  |
| 对白整体上移、下移或单条微调位置 | BDSup2Sub，或批量改 BDN XML 坐标  | 注意区分底部对白与跟随画面的顶部注释、招牌       |
| 字幕图像整体偏大或偏小           | BDSup2Sub 图像缩放 / 画布转换     | 属于位图重采样，尽量从原始 SUP 一次缩放成型      |
| 剔除个别事件、修改 `forced` 标记 | BDSup2Sub 的 `Edit Frame`         | 注意单张图可能同时包含多处文字                   |
| 局部擦除、修补错字或补入少量字幕 | 导出 `BDN XML + PNG` 修改后重编码 | 保持 PNG 透明通道，同步维护 XML 中的尺寸与时间码 |
| 大量改字、换字体、翻译或重排双语 | OCR 提取文本 → ASS 排版 → 转 SUP  | 回到文本工程重新渲染，无法在原位图上直接改字号   |

如果只是本地播放时临时对齐声音，直接在播放器中设置字幕延迟即可；确认需要固化为文件时，在“修改 `.sup` 内部时间戳”与“MKV 封装容器层设置轨道延迟”之间二选一，避免两处重复叠加延迟。

## 准备原件与工作副本

若字幕封装在 MKV 中，先用 MKVToolNix 的 `mkvextract` 将 `S_HDMV/PGS` 轨道导出为独立的 `.sup` 文件；若从蓝光原盘分流，先核对正确的 MPLS 播放列表（见[蓝光原盘 Remux](/posts/blu-ray-remux/#第二步选择提取路线)）。

开始修改前，复制一份工作副本（保留 `original.sup`，修改结果另存为 `edited.sup`），并确认以下基准信息：

- 目标视频的剪辑版本、总时长与精确帧率（如 `24000/1001` 即 `23.976 fps`，或 `24 fps`）。
- 源 SUP 的画布分辨率（通常为 `1920×1080`）、是否包含强制字幕（Forced）或逐帧渐变动画。
- 片头、中段与片尾三处对齐参照点的时间码。

## 路线一：用 BDSup2Sub 直接调整时间、位置与大小

[BDSup2Sub][bdsup] 支持直接读取 `.sup`，批量修改时间码、画面坐标、缩放比例与单条事件属性，再重新打包为新的 `.sup`。

### 1. 载入字幕与转换设置

1. 点击 **File → Load** 打开 `.sup` 工作副本，浏览预览窗确认源字幕图像完整。
2. 在弹出的 **Conversion Settings**（也可从 **Settings → Conversion Settings** 重新打开）中核对输入与输出帧率、分辨率。如果只是挪位置或调延迟，不要勾选分辨率转换或帧率变换。
3. 在主界面顶部的 **Output Format** 下拉框中选择 **SUP(BD)**（蓝光 PGS 格式，切勿误选为 DVD 的 `SUP/IFO` 或 `SUB/IDX`）。
4. 修改完成后，点击 **File → Save/Export** 导出为新文件。

### 2. 调整时间轴（整体平移与帧率换算）

在 **Conversion Settings** 中可处理两类全局时间轴问题：

| 时间轴现象                     | 处理方式与排查方向                                                                                                           |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| 片头、中段、片尾固定早或晚半秒 | 在 **Delay** 中填入带正负号的毫秒数（如字幕偏早需延后半秒填 `500`，偏晚需提前填 `-500`）                                     |
| 片头对齐，越往后偏差呈线性增大 | 核对源字幕与目标视频是否存在帧率速度差（如 25 fps 与 23.976 fps），按需勾选 **Change frame rate** 填写真实的源帧率与目标帧率 |
| 前半段正常，某个镜头后突然错开 | 属于片头标识不同或正片剪辑增删，全局平移无法解决，需导出 XML 分段偏移或结合音轨对齐                                          |

使用负数 `Delay`（整体提前）时，注意检查靠近 `00:00:00` 的首条字幕是否因越过时间零点而被截断。此外，即使未开启帧率转换，BDSup2Sub 导出时也会将时间戳对齐到目标帧率的帧边界。

### 3. 调整显示位置

- **全局移动（Edit → Move all captions）**：原版 Java 5.1.2 的全局移动主要按画面宽高比边界对齐（如将全部字幕移至 `21:9` 画面框内部或移入底部黑边）。若使用 **BDSup2Sub++ 1.0.2**，移动对话框额外提供了相对原始 `X / Y` 坐标增减偏移量的选项。
- **单条微调（Edit → Edit Frame）**：直接修改当前帧的 **X Offset / Y Offset**（对应字幕图块左上角在画布中的像素坐标）。

调整位置前需注意两点：

1. **确认黑边是否在视频画布内**：只有当视频本身是保留了上下黑边的 `1920×1080` 标准画布时，才能把字幕往下挪进黑边区；如果压制版视频已经裁掉了黑边（例如 `1920×804`），将坐标移出画布边界会导致字幕无法显示。
2. **区分对白与顶部注释**：全局移动会同时改变底部对白、顶部背景注释和屏幕招牌的垂直位置。若只想把底部白字对白统一上移 60 像素、保留顶部注释不动，建议使用路线二的 BDN XML 批量筛选修改。

### 4. 缩放字幕尺寸与转换画布

- **画布不变，仅缩放字形大小**：在 **Conversion Settings** 中勾选 **Apply free scaling**，将 **Scale X** 与 **Scale Y** 设为相同比例（例如 `0.9` 表示等比缩小至 90%），导出后复核边距。
- **随视频分辨率转换画布**：当目标视频从 1080p 缩至 720p 时，可在转换设置中同步切换输出分辨率，让画布坐标与图像尺寸一同按比例换算。

由于图形字幕是点阵位图，缩放本质上是像素重采样（可在主界面选择 Lanczos、Bicubic 等重采样滤镜）。多次反复缩放会让描边和笔画发虚，尽量基于原始 1080p SUP 一次性生成目标尺寸。

### 5. 剔除单条事件、局部擦除与修改 Forced 标记

在 **Edit → Edit Frame** 窗口中可以逐条修改单帧属性：

- **剔除整条事件**：勾选 **Exclude from Export**，该条字幕在导出时会被整体跳过。
- **局部矩形擦除**：如果一张图片里同时画了底部对白和顶部网址/注释，只想抹掉其中一部分，可在预览区用鼠标框选目标区域后点击 **Erase** 将其擦为透明，再点击 **Save Changes** 保存。
- **修改强制标记**：勾选或取消单条事件的 **Forced Caption**。

_操作提示：在 `Edit Frame` 窗口修改完一条字幕后，务必点击 **Save Changes**（或 **OK**）保存，直接点击 Prev / Next 翻页不会自动保存当前改动。另外，在导出对话框中注意核对 **Export only forced** 开关——只有在专门提取纯强制字幕轨时才勾选该项，日常导出完整字幕时保持取消勾选。_

## 路线二：导出 BDN XML + PNG 修改后重编码

当需要精确按像素偏移某几百条对白的 `Y` 坐标、用修图软件修补个别错字，或者补入几张新字幕图时，可将 SUP 拆解为 **Sony BDN XML + PNG 图像序列**，修改后再编码回 `.sup`。

在 BDSup2Sub 主界面将 **Output Format** 设为 **XML/PNG**，点击 **File → Save/Export** 导出到新建的空文件夹（如 `work/`）。由于 BDSup2Sub 对复杂调色板动画和逐帧淡入淡出存在[已知读取限制][bdsup-issues]，拆包后先抽查动态特效段是否完好。

### 1. BDN XML 事件结构说明

打开导出的 `.xml` 文件，每条字幕由一个 `<Event>` 节点描述（以下为 `24 fps` 下的单条事件示例，实际修改时须保留原 XML 顶部的完整 `<Description>` 与 `<Format>` 头部）：

```xml
<Event InTC="00:01:20:00" OutTC="00:01:23:00" Forced="False">
  <Graphic Width="1000" Height="80" X="460" Y="900">dialogue-0001.png</Graphic>
</Event>
```

| 属性 / 节点        | 含义与修改约束                                                                                  |
| ------------------ | ----------------------------------------------------------------------------------------------- |
| `InTC` / `OutTC`   | 起止帧时间码，格式为 `HH:MM:SS:FF`（末尾 `FF` 为**帧号**而非毫秒，如 24 fps 下 `:12` 代表半秒） |
| `Forced`           | 是否标记为强制显示事件（`True` / `False`）                                                      |
| `Graphic` 文本内容 | 当前事件引用的同目录 PNG 文件名                                                                 |
| `Width` / `Height` | PNG 图像的实际像素宽、高（若修图改变了图片尺寸，必须同步更新此处数值）                          |
| `X` / `Y`          | 图像左上角在字幕画布（如 `1920×1080`）中的水平与垂直坐标                                        |

### 2. 精确修改坐标、修补图片或增删事件

- **批量微调底部对白坐标**：上例中画布为 `1920×1080`，图片宽 `1000`、高 `80`，`X="460"` 使其水平居中（`(1920 - 1000) / 2 = 460`），`Y="900"` 表示图片顶边距离画布顶部 900 像素。将其改为 `Y="840"` 即可让该条字幕精确上移 60 像素。修改时确保满足 `0 ≤ X` 且 `X + Width ≤ 画布宽`、`0 ≤ Y` 且 `Y + Height ≤ 画布高`，并只对底部对白行做偏移，避开顶部注释行。
- **局部修图（改字或去瑕疵）**：用支持透明通道的图像编辑软件（如 Photoshop、GIMP）打开对应的 `.png` 修改，保存时务必**保留透明背景（Alpha 通道）**。若保持原画布像素宽高不变，则无需改动 XML 中的 `Width`、`Height` 和 `X / Y`；若同一张 PNG 被多个 `<Event>` 复用而只想修改其中一处，先将修改后的图片另存为新文件名，再单独更改目标 `<Event>` 的文件名引用。
- **增删事件**：删除某条字幕时，删掉完整的 `<Event>…</Event>` 块并同步更新 XML 头部 `<Events>` 的 `NumberofEvents` 等统计字段；新增字幕时，准备好透明背景 PNG 并按时间顺序插入 `<Event>` 节点，确保相邻事件的起止时间码不重叠。

### 3. 将 XML + PNG 重新编码为 SUP

根据字幕复杂度，可选择 BDSup2Sub 或 SUPer 打包回 `.sup`：

#### 方式 A：使用 BDSup2Sub 重新打包（适合普通静态对白）

1. 打开 BDSup2Sub，点击 **File → Load** 选择修改后的 `.xml` 文件（软件会自动加载同目录下的全部 PNG）。
2. 在预览区抽查修改过的坐标、图片边缘与时间码。
3. 将 **Output Format** 设为 **SUP(BD)**，点击 **File → Save/Export** 另存为 `edited.sup`。

#### 方式 B：使用 SUPer 编码（适合含渐变、多图块或动态效果的字幕）

[SUPer][super]（下文按 [v0.2.8][super-release] 说明）是专门将 `BDN XML + PNG` 编码为合规 HDMV PGS 流的编码器：

1. 启动 SUPer GUI，选择工作目录中的 `.xml` 文件，并指定 `.sup` 输出路径。
2. 确认量化与编码参数（按 v0.2.8 发布说明，建议将 **Anchor Interval 保持为默认的 `0.0`**），点击 **Make it SUPer** 开始编码。
3. 观察命令行终端输出的编码日志，检查是否有报错或因超出 PGS 缓冲带宽限制而被丢弃的事件（dropped events）。

使用 SUPer v0.2.8 时需留意其输入约束：

- **禁止跨 Event 时间重叠**：相邻 `<Event>` 的 `InTC / OutTC` 不能重叠；若同一时刻屏幕上下都有字，应合并在同一个 `<Event>` 下使用两个不相交的 `<Graphic>` 子节点（或合成在一张 PNG 内）。
- **宽高严格校验**：XML 中的 `Width / Height` 必须与 PNG 实际像素尺寸完全相等（支持 8-bit 索引 PNG 或 32-bit RGBA PNG）。
- **Forced 标记复核**：SUPer v0.2.8 的编码路径会将输出图形的 forced 标记统一写为 `False`。若原轨包含必须保留的单条 forced 事件，编码后需用 BDSup2Sub 打开成品补回对应条目的 `Forced Caption` 标记。

## 商业蓝光重制工程（BD Reauthor + Scenarist BD）

在完整的原盘 DIY 重制项目中，如果已经通过 **BD Reauthor Pro** 拆解生成了 **Scenarist BD** 工程，也可以直接在 Scenarist 的 DataTree 中导入 BDN XML，编码生成 `.pes` 资产并替换 Clip 的 PG 轨道。具体操作见[使用大金 Scenarist BD 制作特效字幕 SUP](/posts/scenarist-bd-effects-sup/)与[章节与蓝光结构教程](/posts/media-chapters/#第四步写入-mkv-或蓝光结构)。若只是单独调整一条 SUP 的延迟或高度，直接使用上面的 BDSup2Sub 即可，无需搭建完整的 Scenarist 工程。

## 成品检查清单

导出 `edited.sup` 后，先在 BDSup2Sub 或 Subtitle Edit 中预览，再混流进 MKV 或蓝光目录实机播放检查：

| 检查项                     | 核对要点                                                     |
| -------------------------- | ------------------------------------------------------------ |
| 片头、中段、片尾与转场接点 | 时间偏移是否准确，有无帧率选错导致的渐进失步或首尾截断       |
| 位置与画布边界             | 单双行对白、顶部注释是否出界，移动后的边距是否协调           |
| 修补过的 PNG 图像          | 透明背景是否正常（有无黑底或白边）、抗锯齿描边与颜色是否自然 |
| 淡入淡出与连续特效         | 动画过渡是否连贯，有无闪烁、掉帧或停留不消失                 |
| 暂停、快进与章节跳转       | 跳转恢复播放后字幕能否正常刷新，有无残留旧图块               |
| Forced 强制标记            | 事件级 Forced 标记与 MKV 容器轨道标记是否符合预期播放行为    |

验收通过后，将原始 `original.sup`、工作目录中的 `BDN XML + PNG`（或 ASS 工程）与最终 `edited.sup` 一并归档保存。

## 参考资料

- BDSup2Sub 官方 Wiki：[下载与版本][bdsup-download]、[主界面][bdsup-main]、[转换设置][bdsup-conversion]、[单帧编辑][bdsup-edit]、[支持格式与 BDN 示例][bdsup-formats]、[已知限制][bdsup-issues]。
- [BDSup2Sub++ 仓库][bdsup-plus]（[v1.0.2 移动窗口实现][bdsup-plus-move]）：C++ / Qt 移植版及相对坐标偏移选项。
- [SUPer 仓库][super]与 [v0.2.8 发布说明][super-release]（源码参考：[BDN 解析][super-bdn] · [渲染编码][super-render]）。
- [Subtitle Edit OCR 文档][se-ocr]与[导入导出说明][se-file]。
- [MKVToolNix：mkvextract 文档][mkvextract]：`S_HDMV/PGS` 轨道提取。
- [BD Reauthor Pro][bd-reauthor] 与 [Scenarist BD][scenarist]：商业蓝光重制与工程工具链。

[bdsup]: https://github.com/mjuhasz/BDSup2Sub
[bdsup-download]: https://github.com/mjuhasz/BDSup2Sub/wiki/Download
[bdsup-main]: https://github.com/mjuhasz/BDSup2Sub/wiki/Main-Window
[bdsup-conversion]: https://github.com/mjuhasz/BDSup2Sub/wiki/Conversion-Dialog
[bdsup-edit]: https://github.com/mjuhasz/BDSup2Sub/wiki/Edit-Dialog
[bdsup-formats]: https://github.com/mjuhasz/BDSup2Sub/wiki/Supported-Formats
[bdsup-issues]: https://github.com/mjuhasz/BDSup2Sub/wiki/Known-Issues
[bdsup-plus]: https://github.com/amichaelt/BDSup2SubPlusPlus
[bdsup-plus-move]: https://github.com/amichaelt/BDSup2SubPlusPlus/blob/1.0.2/src/movedialog.ui
[super]: https://github.com/cubicibo/SUPer
[super-release]: https://github.com/cubicibo/SUPer/releases/tag/v0.2.8
[super-bdn]: https://github.com/cubicibo/SUPer/blob/v0.2.8/SUPer/filestreams.py
[super-render]: https://github.com/cubicibo/SUPer/blob/v0.2.8/SUPer/render2.py
[se-ocr]: https://subtitleedit.github.io/subtitleedit/features/ocr.html
[se-file]: https://subtitleedit.github.io/subtitleedit/features/file.html
[mkvextract]: https://mkvtoolnix.download/doc/mkvextract.html
[bd-reauthor]: https://dvd-logic.com/bd_reauthor
[scenarist]: https://scenarist.com/
