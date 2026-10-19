---
title: PotPlayer 和 MPC-HC 挂载 VSFilterMod 加载外挂特效字幕
description: 在 PotPlayer 或 MPC-HC 中注册并挂载 VSFilterMod，让外挂 ASS 的渐变与 PNG 挂图正常显示。
author: Ayulog
pubDatetime: "2026-10-11T14:00:00+08:00"
draft: false
category: subtitles
tags:
  - ASS
---

当 ASS 字幕使用了 `\1vc` 四角渐变、`\1img` PNG 纹理挂图或 `\fsvp` 垂直偏移等 **VSFilterMod 扩展标签**时，播放器内置的默认字幕渲染器（如 `libass`）会直接忽略这些标签，导致画面只显示普通文字。要在本地播放时完整还原这些特效，需要先在系统中注册 `VSFilterMod.dll`，再将 PotPlayer 或 MPC-HC 的字幕渲染链路切换到该外部滤镜。

扩展标签的具体编写方法见[基于 Aegisub 的 ASS 特效字幕制作教程](/posts/aegisub-ass-effects/)；下文基于 [sorayuki/VSFilterMod][vsfm] 分支与 [MPC-HC 2.8.3][mpc-release] 整理外挂字幕的挂载步骤。

## 准备播放器、字幕与对应位数的滤镜

开始配置前先确认两件事：

1. **匹配播放器与 DLL 的位数（32 位 / 64 位）**：DirectShow 滤镜必须与**播放器进程位数**一致——64 位播放器挂载 64 位 `VSFilterMod.dll`，32 位播放器挂载 32 位 `VSFilterMod.dll`。
2. **整理外挂字幕与图片相对路径**：将测试视频、外挂 `.ass` 字幕及 `\1img` 引用的 PNG 图片放在固定目录中，保持同名以便滤镜自动关联：

```text
test/
  sample.mkv
  sample.ass
  images/
    sign.png
```

若特效字幕原本内封在 MKV 容器内，建议先用 MKVToolNix 提取为外挂 `.ass`（并安装所需字体）再按本文方式挂载，避开内封轨道分离器与外部滤镜引脚连接的兼容问题。

## 第一步：使用 regsvr32 注册 VSFilterMod

先关闭正在运行的播放器，将 `VSFilterMod.dll` 解压到固定目录（如 `C:\Tools\VSFilterMod\`，注册后切勿移动或删除该目录）。

以**管理员身份**打开命令提示符（`cmd.exe`），根据所用播放器的位数执行对应的 `regsvr32` 注册命令：

```bat
rem 64 位播放器注册 64 位 VSFilterMod.dll
"%SystemRoot%\System32\regsvr32.exe" "C:\Tools\VSFilterMod\x64\VSFilterMod.dll"

rem 32 位播放器（在 64 位 Windows 下）注册 32 位 VSFilterMod.dll
"%SystemRoot%\SysWOW64\regsvr32.exe" "C:\Tools\VSFilterMod\x86\VSFilterMod.dll"
```

弹出 `DllRegisterServer ... 已成功` 提示即表示注册完成。

需要注意：VSFilterMod 注册到系统后，在 DirectShow 滤镜列表中显示的名称依然是 **DirectVobSub** 和 **DirectVobSub (auto-loading version)**（与原版 VSFilter / xy-VSFilter 共享相同的滤镜名称与 CLSID）。如果此前注册过原版 VSFilter，此次注册会覆盖其关联路径。

## 第二步：在播放器中挂载滤镜

### PotPlayer 配置步骤

打开 PotPlayer，在画面上右键进入 **选项（F5）→ 滤镜控制 → 个人滤镜优先权**（部分版本译为“自定义滤镜管理器”）：

1. 点击右侧 **添加系统滤镜…**。
2. 在列表中找到并选中 **DirectVobSub** 与 **DirectVobSub (auto-loading version)**，点击确定添加。
3. 选中 **DirectVobSub (auto-loading version)**，将其右侧的优先顺序设为 **强制使用（Prefer）**。
4. 选中 **DirectVobSub**，将其优先顺序设为 **按优先级使用**。
5. 点击应用并确定，彻底关闭 PotPlayer 后重新打开测试视频。

视频开始播放后，为防止 PotPlayer 内置字幕渲染器与外部 DirectVobSub 同时渲染造成**双层字幕重影**，在画面上右键进入“字幕”，取消勾选“显示字幕”（关闭内置字幕渲染，仅保留外部 DirectVobSub 输出）。若外挂字幕未自动加载，可在“滤镜 → DirectVobSub”属性面板中手动指定 `.ass` 文件路径。

### MPC-HC 配置步骤

打开 [MPC-HC][mpc]（v2.8.3），进入 **查看 → 选项（O）→ 回放 → 输出**：

1. 在右侧的 **字幕渲染器（Subtitle renderer）** 下拉菜单中选择 **VSFilter / DirectVobSub**。
2. 点击应用并确定，关闭并重新打开视频使其生效。

播放视频时，右键查看 **滤镜（Filters）** 菜单：

- 确认列表中已出现 **DirectVobSub (auto-loading version)**，点击可打开其属性页核对当前加载的 `.ass` 路径与滤镜版本。
- 由于外部 VSFilter 需要直接在 CPU 内存中读写解码后的视频帧，[MPC-HC 的输出设置][mpc-output]要求搭配支持回传内存的解码模式。若开启原机硬件解码（Native DXVA2 / D3D11）后滤镜未能挂载，可在 LAV Video Decoder 设置中切换为 **D3D11/DXVA2 (copy-back)** 或软件解码。

## 第三步：检查特效与排查异常

配置完成后，建议按**普通文字 → `\1vc` 静态四角渐变 → `\1img` 静态 PNG 挂图 → `\t(\1img(...))` 动态滚动纹理**的顺序逐段检查画面。遇到异常时按下表排查：

| 异常现象                    | 排查方向与解决办法                                                                                 |
| --------------------------- | -------------------------------------------------------------------------------------------------- |
| 普通文字正常，渐变/PNG 消失 | 检查滤镜列表是否真正加载了 `VSFilterMod.dll`，而非播放器内置 `libass` 或原版 VSFilter              |
| PNG 挂图空白不显示          | 检查 `.ass` 中 `\1img(...)` 的图片相对路径是否正确；先去掉 `\1img` 测试 `\p1` 矩形本身能否正常显示 |
| 画面出现两层重叠字幕        | 关闭播放器的内置字幕开关，只留 DirectVobSub 一路渲染输出                                           |
| 播放逐帧 PNG 动画时严重掉帧 | 高分辨率逐帧换图对单核 CPU 开销较大，尝试裁剪缩小 PNG 透明白边或减少同屏叠加图层数                 |
| 挂载滤镜后黑屏或无法连接    | 将视频解码器从 Native 硬解切换为 Copy-back 模式或软件解码，并确认播放器与 DLL 位数一致             |

如果某段高负载 PNG 序列特效在实时外挂播放时始终卡顿，也可考虑将其预先渲染并编码为蓝光 PGS（`.sup`）图形字幕封装播放，具体转换方式见[字幕处理教程第六步](/posts/subtitle-workflow/#第六步渲染并转回-sup)。

## 10-bit 与 HDR 片源的播放限制

在挂载 DirectShow 版 VSFilterMod 时，需要注意其像素格式边界：

- **10-bit 色深回退为 8-bit**：[sorayuki/VSFilterMod 的 DirectShow 滤镜实现][vsfm-filter]仅接收和输出 `YV12`、`YUY2`、`RGB24`、`RGB32` 等 8-bit 像素格式，未实现 `P010` / `P016` 等 10-bit 通道直通（仓库 README 中提到的 `YUV420P10` / `YUV420P16` 支持仅属于其 **VapourSynth 压制插件接口**）。因此播放 10-bit 视频并强制插入 DirectVobSub 时，上游解码器会将视频画面下转成 8-bit 格式后再交给滤镜叠加字幕。
- **HDR 色调映射受阻**：由于外部 VSFilter 接管了渲染器之前的视频帧传输，可能会打断 madVR 或 MPC Video Renderer 的原生 HDR 直通与色调映射链路，导致 HDR 视频画面发灰或偏色。日常观看 10-bit HDR 视频且字幕无需 VSFilterMod 专有扩展时，建议切回播放器内置字幕渲染器。

## 恢复默认播放环境与注销滤镜

看完包含 VSFilterMod 特效的视频后，如需恢复常规播放环境：

- **PotPlayer**：在“个人滤镜优先权”中将 DirectVobSub 设为“禁用”或直接移除，并重新开启内置字幕显示。
- **MPC-HC**：在“选项 → 回放 → 输出”中将字幕渲染器切回默认的 **Internal Subtitle Renderer**。

若需从系统中彻底注销 `VSFilterMod.dll`，以管理员身份运行命令提示符，加上 `/u` 参数执行：

```bat
"%SystemRoot%\System32\regsvr32.exe" /u "C:\Tools\VSFilterMod\x64\VSFilterMod.dll"
```

## 参考资料

- [sorayuki/VSFilterMod 仓库][vsfm]（[DirectShow 注册定义][vsfm-registration] · [帧格式处理实现][vsfm-filter]）：注册方法、VapourSynth 接口与 DirectShow 像素格式支持范围。
- [MPC-HC 维护分支][mpc]（[v2.8.3 发布页][mpc-release] · [输出页面源码][mpc-output]）：字幕渲染器配置与硬件解码 Copy-back 要求。
- [Microsoft Learn：regsvr32 命令说明][regsvr32]与 [64 位 Windows 文件系统重定向说明][windows-redirector]。

[vsfm]: https://github.com/sorayuki/VSFilterMod
[vsfm-registration]: https://github.com/sorayuki/VSFilterMod/blob/master/src/vsfilter/VSFilter.cpp
[vsfm-filter]: https://github.com/sorayuki/VSFilterMod/blob/master/src/vsfilter/DirectVobSubFilter.cpp
[mpc]: https://github.com/clsid2/mpc-hc
[mpc-release]: https://github.com/clsid2/mpc-hc/releases/tag/2.8.3
[mpc-output]: https://github.com/clsid2/mpc-hc/blob/2.8.3/src/mpc-hc/PPageOutput.cpp
[regsvr32]: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/regsvr32
[windows-redirector]: https://learn.microsoft.com/en-us/windows/win32/winprog64/file-system-redirector
