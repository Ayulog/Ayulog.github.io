---
title: 新版 tsMuxer：与 2.7.0 旧版的区别
description: 对比 v2.19.0 与旧版 2.7.0：BDMV 打包 ISO、分层与容量选项、字幕与 Matroska 修复。
author: Ayulog
pubDatetime: "2026-10-11T17:00:00+08:00"
draft: false
category: diy
tags:
  - tsMuxer
  - 蓝光
---

这里的“新版 tsMuxer”指社区持续维护的 [teaching-droid/tsMuxer][new-repo] 分支。原有的 [justdan96/tsMuxer][old-repo] 在发布 **2.7.0 Final** 后已归档停更；而新版社区仓库基于 C++20 与 Qt 6 持续演进，并于 **2026 年 10 月**发布了 **v2.19.0**。

新版在完整保留传统 TS / M2TS / Blu-ray 混流功能的基础上，新增了保留菜单的 BDMV 打包 ISO、多层光盘分层写入保护等功能，并集中修复了大量 Matroska、字幕、音频、3D 与杜比视界相关问题。

## 项目来源与版本对比

| 维度     | 旧版（经典归档分支）          | 新版（社区维护分支）                             |
| -------- | ----------------------------- | ------------------------------------------------ |
| 项目仓库 | [justdan96/tsMuxer][old-repo] | [teaching-droid/tsMuxer][new-repo]               |
| 代表版本 | 2.7.0 Final                   | v2.19.0（2026-10）                               |
| 技术栈   | 原始公开项目的最终归档版      | 基于 jaminmc 分支演进的 C++20 / Qt 6 维护版      |
| 适用场景 | 传统正片混流、基础章节与字幕  | 保留菜单打包 ISO、光盘分层计算、新编码与缺陷修复 |

## 相比 2.7.0 旧版的主要变化

### 1. 原样将已有 BDMV 目录打包为 ISO

新版新增了 `--bdmv-to-iso` 参数，并在 GUI 中提供了独立的 **BDMV folder → ISO** 页面。该模式面向已存在且未加密的完整 BDMV 目录，将其直接封装为符合 BD-ROM 规范的可刻录 ISO 镜像，同时完整保留原有的 BD-J / IG 菜单以及现有的片段和播放列表关联。

这一功能区分了两种工作流：

- **常规混流（Blu-ray folder / ISO）**：从音视频流或 MPLS 重新生成全新的正片播放结构，不含原盘菜单。
- **目录打包（BDMV folder → ISO）**：在不改动现有 BDMV 结构的前提下，将已完成重制或带菜单的原盘目录直接打包成 ISO 镜像。

### 2. 双层与多层蓝光盘的分层写入保护

针对需要将成品刻录到实体双层（BD-R/RE DL）或多层（BD-R XL）光盘的场景，新版增加了容量检查与物理分层辅助选项（详见新版[光盘编著说明][disc-authoring]）：

- `--disc-size`：检查输出体积是否超出目标光盘标称容量（必要时可通过 `--allow-oversize` 放宽限制）；
- `--layer-break-lbn`：指定 BD-R/RE DL 或 BD-R XL 的物理分层扇区位置（Layer Break）；
- `--layer-break-guard`：在分层交界区域填充保护扇区，降低播放机跨层读取时的卡顿风险；
- **GUI 分层计算器**：可根据 ImgBurn 等刻录软件显示的可用扇区数自动计算最佳分层位置；
- `--3d-single-copy`：以单份视频数据保存 3D 蓝光盘图像，节省盘片空间。

### 3. 扩展 Dolby Vision、HEVC、3D 与新编码支持

根据[新版仓库 README][new-readme]，除传统蓝光格式外，新版扩展了 H.266/VVC（Alpha 阶段）、AV1、TrueHD、Opus、FLAC、LPCM 等格式的输入或输出支持，并完善了 Dolby Vision 双层视频在 Matroska 与蓝光结构之间拆分与合并的处理逻辑。

针对 HEVC 视频流，新版支持在不重新编码的情况下修改 Level 标记、补齐访问单元分隔符（AUD），以及在随机访问点重复写入 HDR10 元数据，提升了在各类软硬件播放器上的兼容性。

### 4. Matroska、字幕与蓝光输出修复

v2.19.0 累计包含 98 项改进与修复（详见 [v2.19.0 发布说明][release]），其中直接影响日常整理的更新包括：

- **字幕保留与容错**：输出 Matroska（MKV）时支持将 SRT 保留为文本字幕（输出 TS 或蓝光时则渲染为 PGS 图形字幕）；改进了对 SRT、PGS 及 MP4/MKV 内置字幕的时间戳重叠、字符编码、颜色与异常行的容错处理。
- **Matroska 封装修正**：修复了章节写入、索引构建、时长统计、TrueHD / E-AC-3 声道描述以及 LPCM / AAC / VC-1 元数据标记问题，并在输出文件中写入 tsMuxeR 版本号以便溯源。
- **蓝光结构修复**：修复了部分 3D 播放列表、PCR 时钟、分层位置及 4 KB 扇区设备的相关兼容性问题。

## 与现有教程的衔接

本站[章节的处理](/posts/media-chapters/)、[蓝光原盘 DIY](/posts/blu-ray-diy/)和[蓝光加字幕教程](/posts/blu-ray-diy-workflow/)中的基础混流步骤（添加 MPLS、筛选音视频与 SUP 字幕、设置自定义章节时间、输出新 BDMV）在新旧版本中完全通用。

当遇到以下需求时，可直接切换至新版 v2.19.0 操作：

1. **带菜单原盘打包 ISO**：完成 BDFix、KITe 或 BDedit 改盘后，使用新版的 **BDMV folder → ISO**（`--bdmv-to-iso`）直接生成保留菜单的镜像。
2. **实体盘刻录准备**：刻录 BD50 / BD66 / BD100 空白盘前，利用新版的容量检查与分层保护参数生成合规 ISO。
3. **排查旧版混流异常**：若旧版 2.7.0 在处理特定 TrueHD、HEVC HDR10、双层 Dolby Vision 或复杂字幕时出现报错或不同步，可升级至新版重试，并通过 MediaInfo 与实际播放验收结果（反馈问题可参考仓库 [Issues 页面][issues]）。

## 参考资料

- [新版仓库 README][new-readme]：项目来源、支持格式、下载方式和新增能力。
- [v2.19.0 发布说明][release]：Matroska、字幕、蓝光、3D 与 GUI 的具体修复和新增项。
- [光盘编著说明][disc-authoring]：BDMV 到 ISO、分层保护、容量检查和 3D 单份视频。
- [新版使用说明][usage]：GUI 与 Meta file 参数。
- [旧版 2.7.0 发布记录][old-release]：经典归档分支的最终版本说明。

[new-repo]: https://github.com/teaching-droid/tsMuxer
[new-readme]: https://github.com/teaching-droid/tsMuxer#readme
[release]: https://github.com/teaching-droid/tsMuxer/releases/tag/v2.19.0
[disc-authoring]: https://github.com/teaching-droid/tsMuxer/blob/master/docs/DISC_AUTHORING.md
[usage]: https://github.com/teaching-droid/tsMuxer/blob/master/docs/USAGE.md
[issues]: https://github.com/teaching-droid/tsMuxer/issues
[old-repo]: https://github.com/justdan96/tsMuxer
[old-release]: https://github.com/justdan96/tsMuxer/releases/tag/2.7.0
