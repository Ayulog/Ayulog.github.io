---
title: PotPlayer 和 MPC-HC 挂载 VSFilterMod 加载外挂特效字幕
description: 注册与播放器位数一致的 VSFilterMod，分别设置 PotPlayer 和 MPC-HC 的字幕滤镜，检查外挂 ASS、PNG 挂图、硬件解码与高位深视频的兼容性。
author: Ayulog
pubDatetime: "2026-10-11T14:00:00+08:00"
draft: true
category: subtitles
tags:
  - 字幕
  - PotPlayer
  - MPC-HC
  - VSFilterMod
  - ASS
---

ASS 中的 `\1vc` 四角渐变、`\1img` 图片挂图等 VSFilterMod 扩展，需要支持这些标签的字幕渲染器。只把 ASS 拖进播放器，可能能看到文字，却看不到预期特效。这篇记录 Windows 下的外挂播放设置：先注册 VSFilterMod，再分别设置 PotPlayer 或 MPC-HC。

普通 ASS 不必为了显示字幕安装这个组件。需要制作扩展效果时，先看 [Aegisub 特效字幕教程](/posts/aegisub-ass-effects/)，再用目标播放器检查成品。

本文于 **2026 年 10 月 11 日**核对公开资料。MPC-HC 的菜单按维护分支 **2.8.3** 的源码核实；PotPlayer 菜单沿用原有操作记录，中文名称可能不同。VSFilterMod 存在多个分支，以下 DirectShow 播放链路参考 [sorayuki/VSFilterMod][vsfm]，不把它的 VapourSynth 接口能力套用到播放器上。

## 先准备播放器、字幕和滤镜

先确认**播放器进程的位数**。64 位播放器需要 64 位 VSFilterMod；32 位播放器即使运行在 64 位 Windows 中，也需要 32 位组件。只按 Windows 位数选择 DLL，可能出现注册成功但播放器找不到滤镜的情况。

准备一段短视频和对应的外挂 ASS。可以先用这样的文件结构，确认普通文字和时间轴正常，再加入扩展效果：

```text
test/
  sample.mkv
  sample.ass
  images/
    sign.png
```

同名只是方便自动发现字幕；必要时在滤镜属性中手动指定 ASS。用到字体和 PNG 时还要准备相应文件。`\1img` 里的路径必须能被当前滤镜解析，不能只移动文件、保留原电脑的图片路径。

本文按外挂 ASS 配置。内封字幕还涉及分离器、字幕输入引脚和选轨方式，不能保证沿用相同步骤；要复现这里的结果，先把字幕提取出来。也不应据此断言 VSFilterMod 的所有版本都不支持内封字幕。

## 注册 VSFilterMod

关闭播放器，把 DLL 解压到以后不再随意移动的位置。若工具包带有“安装 VSFilterMod插件.bat”，先确认脚本注册的是这份 DLL，再以管理员身份运行。管理员权限取决于系统配置，不能按“Windows 7 直接双击、Windows 10 才需提权”来区分。

没有安装脚本时，可以在**管理员命令提示符（cmd）**中使用 `regsvr32`。以下两个例子用于 64 位 Windows，路径是占位示例，只执行与播放器和 DLL 位数一致的一条：

```bat
rem 64 位播放器 + 64 位 DLL
"%SystemRoot%\System32\regsvr32.exe" "C:\Tools\VSFilterMod\x64\VSFilterMod.dll"

rem 32 位播放器 + 32 位 DLL
"%SystemRoot%\SysWOW64\regsvr32.exe" "C:\Tools\VSFilterMod\x86\VSFilterMod.dll"
```

看到 `DllRegisterServer` 成功提示后再打开播放器。若报错，先核对实际 DLL 路径、位数及随包依赖；不要把 DLL 复制到系统目录来碰运气。

VSFilterMod 注册后的名称仍可能是 **DirectVobSub** 和 **DirectVobSub (auto-loading version)**。这两个名称也可能被其他 VSFilter 组件使用，所以**名称相同不代表加载的就是 VSFilterMod**。通过滤镜属性、版本信息和模块路径确认实际文件；装有其他字幕滤镜时，先记下原配置，便于恢复。

## PotPlayer 的设置

打开视频，在画面上右键进入“选项”，找到“滤镜控制 → 个人滤镜优先权”（有些版本直接显示“个人滤镜优先权”）：

1. 点击“添加系统滤镜”。
2. 添加 **DirectVobSub** 和 **DirectVobSub (auto-loading version)**。
3. 选中 **DirectVobSub (auto-loading version)**，优先顺序设为“强制使用”。
4. 选中 **DirectVobSub**，优先顺序设为“按优先级使用”。
5. 应用设置，关闭并重新打开视频，让滤镜链重新建立。

加载外挂 ASS 后，查看正在使用的滤镜或 DirectVobSub 属性，确认实际加载的 DLL 和字幕文件。播放器内置字幕与 DirectVobSub 同时显示时会出现重影，应关闭内置字幕显示，让本次测试只保留一套字幕渲染。

如果同名 ASS 没有被自动找到，进入 DirectVobSub 属性手动选择文件。不要只在 PotPlayer 的内置字幕菜单里切换文件，就假定外部滤镜也已经切换。

## MPC-HC 的设置

这里使用的是 [clsid2 维护的 MPC-HC][mpc]。打开“选项 → 回放 → 输出”，在“字幕渲染器”中选择 **VSFilter / DirectVobSub**，应用后重新打开视频。

MPC-HC 2.8.3 仍有这个选项；如果它显示不可用，先检查该位数的滤镜是否已注册。选项控制的是注册的 VSFilter 类，不能通过这个名称分辨普通 VSFilter 和 VSFilterMod，因此同样需要查看实际滤镜文件。

然后确认：

1. 播放中的滤镜列表里出现 DirectVobSub，属性页可以打开。
2. DirectVobSub 加载的是本次的外挂 ASS。
3. 普通文字、字体和时间轴正确，再检查四角渐变与图片挂图。
4. 拖动进度、暂停和重新打开视频后，字幕仍正常出现、消失。

外部 VSFilter 需要访问解码后的视频帧。[MPC-HC 的输出设置源码][mpc-output]会把这个渲染器列为需要 copy-back 的情况。若硬件解码模式与滤镜连接冲突，可以先用软件解码排查，或选择解码器支持的 copy-back 模式；不能只靠“已经开启硬解”判断性能。

## 渐变和 PNG 特效怎么检查

先用普通 ASS 标签确认链路，再按静态渐变、静态 PNG、连续图片动画的顺序测试。这样扩展不显示或突然卡顿时，能缩小问题范围。

早期操作记录中，渐变和较简单的 PNG 效果较容易播放，连续逐帧更换 PNG 的 `\1img` 效果更容易卡顿。这只能作为排查线索，不能推出“渐变一定不卡”或“所有 PNG 都不适合外挂”。图片尺寸、事件数量、叠层、动画方式和 CPU 都会影响负担。

出现问题时可这样处理：

| 现象                       | 优先检查                                                                  |
| -------------------------- | ------------------------------------------------------------------------- |
| 普通文字正常，扩展效果消失 | 实际 DLL 是否为 VSFilterMod；标签是否被其他字幕渲染器接管                 |
| PNG 完全不显示             | 图片路径、读取权限、绘图区域和扩展语法；先用普通 `\p1` 矩形验证时间与位置 |
| 字幕显示两遍               | 内置字幕和外部滤镜是否同时启用                                            |
| 开启 PNG 动画后掉帧        | 缩小图片、减少同时出现的事件，用短片比较静态与连续变化的效果              |
| 加载滤镜后黑屏或无法连接   | 解码器输出格式、硬件解码模式及播放器/DLL 位数                             |

适合用矢量表示的色块和线条，可以改用标准 ASS 绘图；确实需要复杂图片动画时，也可以先渲染、再按目标设备转成图形字幕。转换路线见[字幕的处理](/posts/subtitle-workflow/#第六步渲染并转回-sup)。

## 10-bit 与 HDR 不能只看字幕是否显示

旧记录提到“加载后 10-bit 变成 8-bit”。本次核对的 [VSFilterMod DirectShow 实现][vsfm-filter]使用 YV12、YUY2、RGB24/32 等格式，没有看到该路径的 P010/P016 处理；10-bit 视频接入这条链路时，可能由解码器转换为 8-bit 等受支持格式，也可能连接失败。

这影响的是**播放时的解码与渲染结果**，不会重写视频文件。RGB32 的“32”也不是每通道 32-bit，不能据此判断保留了原视频的 10-bit 精度。

同一仓库 README 所说的 YUV420P10、YUV420P16 和 `accurate` 参数属于 **VapourSynth 接口**，不能作为 DirectShow 播放保留高位深的依据。其他分支或 DLL 可能不同，应查看实际滤镜输入、输出格式。

HDR 还涉及色彩空间、传递函数和输出方式。先用 SDR 短片验证字幕，再在目标 HDR 播放环境比较画面亮度、颜色和渐变；无法确认链路时，保留原有 HDR 播放配置，并选择它支持的字幕方式。

## 恢复原来的播放配置

PotPlayer 中撤销“强制使用”或移除本次添加的外部滤镜，重新启用原有字幕显示。MPC-HC 中把字幕渲染器恢复为原选项，再重新打开视频。

如果还要注销 DLL，在管理员命令提示符中对同一位数的 `regsvr32` 加 `/u`，例如：

```bat
"%SystemRoot%\System32\regsvr32.exe" /u "C:\Tools\VSFilterMod\x64\VSFilterMod.dll"
```

注销只移除这份组件的注册，不会自动恢复之前被替换的 VSFilter 注册；需要时用原组件安装包修复。确认不再使用后，才移动或删除 DLL 目录。

## 参考资料

- [VSFilterMod 项目与接口说明][vsfm]：注册方法、VapourSynth 接口以及分支维护状态。
- [VSFilterMod 的 DirectShow 注册定义][vsfm-registration]和[视频帧处理实现][vsfm-filter]：DirectVobSub 名称与像素格式边界。
- [MPC-HC 2.8.3 发布页][mpc-release]与[输出设置源码][mpc-output]：字幕渲染器选项和 copy-back 条件。
- [Microsoft Learn：regsvr32][regsvr32]：注册、注销命令。
- [Microsoft Learn：文件系统重定向][windows-redirector]：64 位 Windows 中 System32 与 SysWOW64 的区别。

[vsfm]: https://github.com/sorayuki/VSFilterMod
[vsfm-registration]: https://github.com/sorayuki/VSFilterMod/blob/master/src/vsfilter/VSFilter.cpp
[vsfm-filter]: https://github.com/sorayuki/VSFilterMod/blob/master/src/vsfilter/DirectVobSubFilter.cpp
[mpc]: https://github.com/clsid2/mpc-hc
[mpc-release]: https://github.com/clsid2/mpc-hc/releases/tag/2.8.3
[mpc-output]: https://github.com/clsid2/mpc-hc/blob/2.8.3/src/mpc-hc/PPageOutput.cpp
[regsvr32]: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/regsvr32
[windows-redirector]: https://learn.microsoft.com/en-us/windows/win32/winprog64/file-system-redirector
