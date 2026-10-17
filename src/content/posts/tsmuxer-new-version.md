---
title: 新版 tsMuxer：与 2.7.0 旧版的区别
description: 对比 v2.19.0 与旧版 2.7.0：BDMV 打包 ISO、分层与容量选项、字幕与 Matroska 修复。
author: Ayulog
pubDatetime: "2026-10-11T17:00:00+08:00"
draft: true
category: diy
tags:
  - tsMuxer
  - 蓝光
  - BDMV
  - ISO
  - Matroska
  - 字幕
  - Media
---

这里的“新版 tsMuxer”指社区维护的 [teaching-droid/tsMuxer][new-repo]，与旧仓库分属两条发布线。旧的 [justdan96/tsMuxer][old-repo] 最后公开版本是 **2.7.0**；新版仓库在 **2026 年 10 月 11 日**发布了 **v2.19.0**。新版仍保留 tsMuxer 的混流、重新封装和蓝光输出路线，另加了独立的光盘编著辅助功能，并持续修复 Matroska、字幕、音频、3D 和蓝光输出问题。

两套版本的基本混流思路可以互相参考，具体 GUI 按钮、参数和输出行为要按各自版本确认。现有文章继续按旧版界面记录；使用新版新增功能时，查新版仓库的 README、使用说明和发行包。

## 项目来源和版本边界

| 项目             | 旧版                          | 新版                                               |
| ---------------- | ----------------------------- | -------------------------------------------------- |
| 仓库             | [justdan96/tsMuxer][old-repo] | [teaching-droid/tsMuxer][new-repo]                 |
| 当前可核对的版本 | 2.7.0 Final                   | v2.19.0                                            |
| 项目关系         | 原始公开项目的历史发布线      | 基于 jaminmc 的 C++20 / Qt 6 改进 fork，并继续维护 |
| 适合的资料       | 旧版 GUI、传统混流和章节参数  | 新版发行包、光盘编著文档和持续修复记录             |

新版 README 将自己描述为 jaminmc/tsMuxer 的 fork，而 jaminmc/tsMuxer 又源自原来的 justdan96/tsMuxer。因此文章中把旧版称为“历史发布线”，把新版称为“社区维护仓库”，不把它们写成同一个官方版本号序列。

## 相比旧版的主要变化

### 1. 可以把已有 BDMV 原样打包成 ISO

新版增加 `--bdmv-to-iso`，GUI 也有 **BDMV folder → ISO** 页面。它针对已经存在的、未加密的 BDMV 目录，把目录内容包装成可刻录的 BD-ROM ISO；README 说明该模式会保留 BD-J 菜单以及现有的片段、播放列表引用。

这与重新混流不同：重新混流会生成新的播放结构，原盘菜单不会自动恢复；BDMV 到 ISO 只是对完整目录做打包，没有菜单的目录仍是原样。使用前确认目录完整，并在目标播放器上检查导航。

### 2. 增加双层和多层光盘的写入保护

新版加入了光盘容量检查和分层写入辅助：

- `--disc-size` 检查输出是否超过目标光盘容量，`--allow-oversize` 可在明确知情时放宽阻止；
- `--layer-break-lbn` 指定 BD-R/RE DL 或 BD-R XL 的分层位置；
- `--layer-break-guard` 在分层交界附近填充保护区，降低跨层播放时的风险；
- GUI 的分层计算器可以根据 ImgBurn 显示的可用扇区计算分层位置；
- `--3d-single-copy` 用单份视频保存 3D 盘的图像，减少重复占用的空间。

这些选项处理的是光盘镜像和刻录阶段的问题，与蓝光菜单编著无关。分层位置、空白盘容量和刻录软件设置必须对应同一张盘；本次没有在实体光盘和多种播放器上复测，生成的 ISO 仍要在目标设备上播放确认。详细前提见新版的[光盘编著说明][disc-authoring]。

### 3. 对 Dolby Vision、HEVC、3D 和新编码格式的处理更完整

新版 README 列出了 H.266/VVC（Alpha）、AV1、TrueHD、Opus、FLAC、LPCM 等输入或输出方向，并补充了 Dolby Vision 双层视频在 Matroska 与蓝光制作之间拆分、合并的处理说明。针对 HEVC，新版还加入了不重新编码修改 level、补写访问单元分隔符，以及在随机访问点重复 HDR10 元数据等处理。

这些能力需要片源、容器和目标设备同时满足条件。尤其是 VVC 标为 Alpha 支持，成熟度低于蓝光常用的编码；Dolby Vision 也要先确认 Profile、BL/EL 关系和播放设备，再决定是否转换或重新封装。

### 4. Matroska、字幕和章节修复更密集

v2.19.0 的发行说明列出 98 项变更，重点集中在 Matroska、字幕和蓝光输出。可以直接影响日常使用的例子包括：

- SRT 字幕可以在输出 Matroska 时保留为文本；输出 TS 或蓝光时仍需转成图形字幕；
- Matroska 的章节、索引、时长、TrueHD / DD+ 声道信息和 LPCM / AAC / VC-1 描述得到多项修复；
- SRT、PGS 以及从 Matroska、MP4 读取的字幕，针对时间、重叠、编码、颜色、字体和异常行有多项容错改进；
- Matroska 输出会记录写入它的 tsMuxeR 版本，便于之后追查问题；
- 蓝光输出修复了部分 3D、时钟、分层、播放列表和 4 KB 扇区设备相关问题。

发行说明也明确提醒 Matroska 输出仍在持续成熟；某个样本成功之后，仍要用 MediaInfo、日志和实际播放确认。

## 旧版教程还能用在哪

现有[章节教程](/posts/media-chapters/)、[蓝光原盘 DIY 教程](/posts/blu-ray-diy/)和[蓝光加字幕流程](/posts/blu-ray-diy-workflow/)保留旧版 GUI 的操作记录，不在这些文章里替换成新版截图或参数。它们仍可用来理解“选择轨道—设置章节—生成新 BDMV—检查播放”的基本流程，但以下内容应以新版资料为准：

- BDMV 到 ISO、分层保护和光盘容量检查；
- 新版 GUI 的选项名称、默认值和多语言界面；
- Matroska 保留文本字幕、Dolby Vision 拆分，以及 v2.19.0 的具体修复；
- 3D、VVC、TrueHD 和目标设备的兼容性。

如果只是把确认好的音视频和字幕重新封装成新的蓝光结构，旧教程的步骤仍然是可读的参考；如果目标是保留已有菜单，应改看 BDMV 到 ISO 的说明，避免先重新混流再期待菜单自动回来。

## 使用新版前的检查清单

1. 在 [Releases][release] 下载与系统对应的 v2.19.0 压缩包，先从程序版本行确认确实运行的是新版。
2. 需要保留原盘菜单时，确认手上的目录是完整、未加密的 BDMV，再使用 BDMV folder → ISO；不要把它和重新混流混为一谈。
3. 需要刻录 BD-R/RE DL 或 BD-R XL 时，记录目标盘的容量、可用扇区和分层位置，检查镜像大小后再交给刻录软件。
4. 输出 MKV 时，用 MediaInfo 或 mkvinfo 检查轨道、章节、字幕类型、Dolby Vision 层和写入版本；输出蓝光后再扫描 BDMV 并实际播放。
5. 遇到异常时保留版本行、完整日志、Meta file 内容、片源 MediaInfo 和播放器信息，按新版仓库的[问题反馈说明][issues]提交。

## 参考资料

- [新版仓库 README][new-readme]：项目来源、支持格式、下载方式和新增能力。
- [v2.19.0 发布说明][release]：Matroska、字幕、蓝光、3D 与 GUI 的具体修复和新增项。
- [光盘编著说明][disc-authoring]：BDMV 到 ISO、分层保护、容量检查和 3D 单份视频。
- [新版使用说明][usage]：GUI 与 Meta file 参数。
- [旧版 2.7.0 发布记录][old-release]：旧版发布线的版本边界。

[new-repo]: https://github.com/teaching-droid/tsMuxer
[new-readme]: https://github.com/teaching-droid/tsMuxer#readme
[release]: https://github.com/teaching-droid/tsMuxer/releases/tag/v2.19.0
[disc-authoring]: https://github.com/teaching-droid/tsMuxer/blob/master/docs/DISC_AUTHORING.md
[usage]: https://github.com/teaching-droid/tsMuxer/blob/master/docs/USAGE.md
[issues]: https://github.com/teaching-droid/tsMuxer/issues
[old-repo]: https://github.com/justdan96/tsMuxer
[old-release]: https://github.com/justdan96/tsMuxer/releases/tag/2.7.0
