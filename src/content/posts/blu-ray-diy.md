---
title: 蓝光原盘 DIY：tsMuxeR、BDFix Pro、KITe UHD 与大金
description: 在现有 BDMV 上换音轨、加字幕，或用 tsMuxeR、KITe、Scenarist 重建蓝光结构并对应菜单。
author: Ayulog
pubDatetime: "2026-10-11T10:00:00+08:00"
draft: false
category: diy
tags:
  - 蓝光
  - tsMuxer
  - BDFix
---

[蓝光原盘 Remux](/posts/blu-ray-remux/)将所选节目提取封装为单文件 MKV；若要修改蓝光 BDMV 目录本身（例如往原盘里塞入中文字幕或国语配音，或从音视频素材从头制作带菜单的蓝光盘），则需要处理播放列表、流文件与菜单导航的对应关系。

常见的四条蓝光 DIY 路线按工具定位区分：**tsMuxeR 制作正片新结构、BDFix Pro 修改已有 1080p 原盘、KITe UHD 拆盘重混流、Scenarist BD / UHD 从素材编著整盘**（中文圈常将 Scenarist BD 称为“大金”）。

## 四条路线对比与选择

| 工具                     | 适用起点与目标                                           | 核心特点与处理范围                                                       |
| ------------------------ | -------------------------------------------------------- | ------------------------------------------------------------------------ |
| tsMuxeR                  | 已有音视频、字幕或播放列表，制作以正片为主的 BDMV 或 ISO | 快速生成全新播放结构；若需保留原盘外置 IG 菜单需用 BDedit 修补关联       |
| BDFix Pro                | 已有未加密 1080p BDMV，直接替换或追加音轨、字幕          | 保留原盘结构与菜单文件；追加新轨时需另行补充菜单按钮入口                 |
| KITe UHD Authoring Suite | 导入已有 BD / UHD 原盘，编辑素材、Clip 与播放列表后输出  | 支持局部混流（Partial Mux）回写原盘；字幕需准备 SST / BDN XML / PES 资产 |
| Scenarist BD / UHD       | 从零建立或重编著商业规格的完整蓝光工程                   | 完整控制轨道、Clip、Playlist、IG 菜单与 HDMV / BD-J 导航逻辑             |

## 动手前的目录与素材准备

1. **确认目标播放列表（MPLS）**：用 BDInfo 扫描原盘并结合实际播放确认正片对应的 `.mpls` 编号，记录其引用的 `.m2ts` 片段顺序、时长、章节和轨道列表（目录结构基础见[认识蓝光碟片](/posts/understanding-blu-ray/)）。
2. **规划独立工作目录**：将不同阶段的文件分开存放，避免混流输出覆盖唯一原盘备份（尤其是 KITe 拆盘的目标工程目录需指定为空文件夹）：

```text
source-disc/       原始盘片只读备份
work-disc/         用于结构修改的工作副本
assets/            校准好时间线的新增音轨、字幕与章节
project/           拆盘工程与中间素材
output-disc/       混流输出的最终成品
```

3. **准备合规音轨与字幕资产**：确保新增音轨、字幕与目标 MPLS 的时间线完全对齐（字幕制作与时间轴校对见[字幕的处理](/posts/subtitle-workflow/)，章节提取见[章节的处理](/posts/media-chapters/)）。蓝光标准字幕需预先渲染为图形字幕资产（如 tsMuxeR 与 BDFix 使用 `.sup`，KITe 与 Scenarist 使用 BDN XML + PNG 或 PES）。

## 一、tsMuxeR 制作蓝光结构

### 版本分支说明

- **经典分支（[justdan96/tsMuxer][tsmuxer-original]）**：最终归档版本为 **2.7.0 Final**，其[官方使用说明][tsmuxer-usage]涵盖了标准的 MPLS 读取、轨道混流与章节参数。
- **社区维护分支（[teaching-droid/tsMuxer][tsmuxer-fork]）**：在经典版基础上持续更新（如新增[完整 BDMV 目录直接打包 ISO][tsmuxer-iso]、光盘分层保护及多项杜比视界与字幕修复，详见[新版 tsMuxer 介绍](/posts/tsmuxer-new-version/)）。

### 混流生成新蓝光目录

1. **载入源播放列表**：在 tsMuxeR GUI 中点击 **Add**，载入已确认的正片 `.mpls` 文件，核对识别出的片段与总时长。
2. **筛选与添加轨道**：在轨道列表中保留所需的视频、原始音轨与字幕，再点击 **Add** 导入已对齐时间线的新音轨或 `.sup` 字幕，并在下方设置每条轨道的语言代码（中文为 `zho` / `chi`）。
3. **检查高清音频选项**：保留完整 TrueHD 或 DTS-HD 音轨时，确保未勾选“Downconvert TrueHD to AC3”或“Downconvert DTS-HD to DTS”（注：蓝光规范要求 TrueHD 轨包含伴随的 AC-3 核，若输入是从 MKV 提取的不含 AC-3 核的独立 `.thd`，需先生成含核流或改用支持的工具）。
4. **设置章节时间点**：切换到 **Blu-ray** 页，核对从 MPLS 自动带入的自定义章节列表（`Custom chapters list`），或按需导入章节时间点（详见[章节的处理：tsMuxer](/posts/media-chapters/#tsmuxer生成蓝光结构时写入章节)）。
5. **输出新结构**：在输出区选择 **Blu-ray folder** 或 **Blu-ray ISO**，指定输出到 `output-disc/` 并点击 **Start muxing**。

### 进阶：混流后用 BDedit 恢复外置 IG 弹出菜单

tsMuxeR 重新混流会生成全新的 `.m2ts`、`.clpi` 与 `.mpls`，仅包含正片本身。若要把这套新混流的正片替换回原盘副本（`work-disc/`），且原盘正片使用的是**独立外置 IG（Interactive Graphics）弹出菜单 Clip**，替换后需要用 [BDedit][bdedit] 恢复新 MPLS 中的菜单关联（参见 [IG SubPath 讨论][tsmuxer-ig]）：

1. 打开两个 BDedit 窗口，分别载入原始备份（`source-disc/`）和已替换正片文件的工作副本（`work-disc/`），定位到同一个正片 `.mpls`。
2. 在原盘窗口查看 `SubPath` 列表，记录 `IG menu` 子路径的类型、引用的菜单 `.m2ts` 文件编号、入出点（In/Out time）及同步属性，并确认工作副本的 `STREAM/` 与 `CLIPINF/` 中仍保留着该菜单文件。
3. 在工作盘窗口的 MPLS 中新增对应的 `SubPath` 与 `SubPlayItem`，参照原盘填入菜单 Clip 编号与对应时间范围。
4. 在主 `PlayItem` 的 `STN`（流编号表）中补回 IG 流条目，指向刚建立的 `SubPath`、菜单流 PID 与语言标记。
5. 点击保存（同时更新 `BACKUP/` 目录下的同名备份），用支持蓝光菜单的播放器从完整目录入口打开，测试播放途中呼出弹出菜单（Pop-up Menu）及切换新字幕轨。

注：BDedit 自 0.44 起支持 UHD BD、HDR 与 Dolby Vision 扩展字段，0.53 起支持修改 UHD 的 STN 扩展表，处理 4K 原盘时请使用 0.53 或更高版本。

## 二、BDFix Pro 替换和追加轨道

BDFix Pro（参考[历史产品资料][bdfix-info]与[公开重制示例][bdfix-guide]）适合在未加密的 1080p 普通蓝光原盘上直接替换或追加音轨、字幕，同时保留原有的菜单与花絮结构。

### 操作步骤

1. **载入原盘并选择模式**：打开工作副本的 `BDMV` 目录。若正片只由单个 `.m2ts` 构成且不被其他版本复用，可在 `M2ts Tree` 中选中该片段；若正片包含多段拼接或无缝分支，则切换到 `Mpls Tree` 选中目标正片 `.mpls`。
2. **核对现有轨道**：在 `Original tracks` 列表中查看原有的视频、音频与字幕轨及语言标记。
3. **替换或追加轨道**（按需求二选一）：
   - **替换原轨（Replace Track）**：右键点击一条不需要的外语字幕或音轨，选择 `Replace Track` 导入准备好的 `.sup` 字幕或音频文件。此方式直接复用原轨道槽位，原盘菜单中对应的按钮可直接切到新轨道。
   - **追加新轨（New tracks）**：点击 `New tracks` 区域的加号导入 `.sup` 字幕或音轨，确认识别为 `PG(Subtitle)` 或对应音频类型，设置 `Language` 为 `Chinese`（`chi`），`Delay` 保持为 0。
4. **输出并验证**：在底部确认新旧轨道排列无误后，指定新的输出文件夹点击 **Build**。完成后用播放器从光盘主菜单进入正片，检查章节跳转、分支接缝以及遥控器/菜单切轨是否正常（追加新轨若需在原盘菜单界面上增加对应按钮，见[蓝光原盘菜单修改篇](/posts/blu-ray-menu-editing/)）。

## 三、KITe UHD 导入与混流

DVDLogic 的 **[KITe UHD Authoring Suite][kite]**（2026 年 3 月已更新至 [v3.1][kite-news]）支持 1080p 蓝光与 4K UHD（含 HDR10、HDR10+、Dolby Vision）原盘的拆解、轨道编辑与局部重混流。

### 1. 准备支持的输入资产

根据 [KITe 官方格式表][kite-features]，其直接接收的图形字幕资产格式为 **SST、BDN XML（配 PNG 序列图）或 Scenarist PES（配 `.mui`）**。因此，制作字幕时可使用 `ass2bdnxml` 直接导出 **BDN XML + PNG** 交给 KITe，无需先打包成 `.sup`。同理，导入 TrueHD / Atmos 或 DTS-HD 音轨时也需遵循其格式表要求。

### 2. 拆盘、加轨与局部混流（Partial Mux）

以下以经典流程说明核心步骤（具体菜单位置随 v1.x 至 v3.x 界面微调）：

1. **导入拆解原盘（Import BDMV）**：源路径选择工作副本的 `BDMV` 目录，目标工程路径选择一个**全新的空白目录**（`project/`）。模式可选择 `Complete demux all assets`（完整分流所有素材）或 `Pre-demux`（虚拟资产快速导入），等待拆盘日志完成。
2. **添加新资产（Add assets）**：在 `Assets` 面板中找到正片对应的素材组，右键选择 `Add assets`，导入准备好的 BDN XML / PES 字幕或音轨，并设置语言代码。
3. **挂载到片段（Add new stream）**：切换到 `Clips` 面板，展开正片对应的 Clip，使用 `Add new stream` 将刚才导入的字幕或音轨挂载到该片段中。
4. **检查播放列表流表**：在 `PlayList` 面板中确认引用该 Clip 的 PlayItem 已将新轨道列入流表（STN）；若正片由多个 Clip 拼接而成，需确保各分段 Clip 的轨道结构一致。
5. **执行局部混流（Mux → Partial Mux）**：勾选被修改过的正片 Clip 执行局部混流。
6. **替换回工作副本**：混流完成后，在输出目录中找到新生成的 `.m2ts`、`.clpi` 和 `.mpls` 文件，一并复制替换到工作副本 `work-disc/BDMV/` 对应的 `STREAM/`、`CLIPINF/`、`PLAYLIST/` 及 `BACKUP/` 目录中。

## 四、大金 Scenarist BD 制作

[Scenarist BD][scenarist]（1080p 蓝光）与 **Scenarist UHD**（4K UHD 蓝光）是工业级蓝光编著软件，适合从音视频、字幕与菜单图形素材出发，从头构建完整的蓝光盘片工程。初次上手可结合 [QuickStart Tutorial v1.1 官方入门指南存档][scenarist-tutorial]练习。

### 1. 导入资产与构建正片时间线

1. **准备合规素材**：准备符合蓝光编码规范的视频裸流（如 `.avc` / `.hevc`）、音频文件、BDN XML + PNG 字幕资产，以及使用 Scenarist Designer（Photoshop 插件）导出的 IG 菜单资产。
2. **新建工程**：创建 `New Solution` 与 `New Disc Project`，分别设置工程目录、工作缓存目录与输出目录，将音视频与字幕拖入 `DataTree` 完成解析（生成配套 `.ves` / `.mui` 等索引文件）。
3. **创建 Clip 与 PlayList**：在 `DataTree` 中右键点击正片视频流，选择 `Generate → PlayList` 自动生成对应的 Clip 与 PlayList，随后将音频流、字幕资产拖入该 Clip，并在 PlayList 时间线上添加章节标记（PlayMark）。

### 2. 编排 IG 菜单与 Scenario 导航

在 `IG Editor` 中核对菜单页面的按钮状态图（Normal / Selected / Activated）与方向键焦点移动关系后，切换到 `Scenario Editor` 连接盘片导航逻辑：

- **FirstPlayback**：建立插盘自动运行的第一个 MovieObject（如播放片头 Logo 后跳转到主菜单）。
- **TopMenu**：绑定主菜单页面，指定遥控器按下“主菜单”键时的返回入口。
- **HDMV Title**：为正片建立 Title 并关联刚才创建的 PlayList。
- **按钮动作绑定**：为菜单上的“播放正片”“章节选择”“音轨切换（SetStream）”“字幕切换”按钮编写对应的导航命令。

### 3. 编译输出（MUX）

完成导航逻辑检查后，打开 **MUX** 窗口，选择输出为 BDMV 目录或镜像文件，观察编译日志确认无规范报错。

此外，若要对现有商业原盘做深度的 Scenarist 级重编著，通常会先使用 **BD Reauthor Pro** 将原盘逆向拆解并生成可直接导入 Scenarist 的工程文件，修改完成后再通过 Scenarist 重新编译输出。

## 成品验收清单

无论使用上述哪条路线，混流或重制完成后都应从**完整 BDMV 目录或 ISO 镜像入口**进行全面检查：

| 检查项目            | 验收方法与标准                                                         |
| ------------------- | ---------------------------------------------------------------------- |
| 光盘引导与菜单导航  | 从目录/ISO 启动，检查 First Play、主菜单、弹出菜单（Pop-up）及返回逻辑 |
| 播放列表与版本时长  | 用 BDInfo 重新扫描成品，核对正片时长、片段顺序与章节时间点无误         |
| 新增音轨与字幕切换  | 分别通过原盘菜单按钮和播放器快捷键切换新轨道，确认语言与内容一一对应   |
| 音画同步与分支接缝  | 抽查片头、中段、片尾，并连续播放无缝分支接缝处，确认无跳帧或爆音       |
| 视频 HDR 与源码音频 | 在目标播放机与电视/功放链路上验证 HDR10 / Dolby Vision 及源码直通输出  |
| 目录与备份一致性    | 确认修改过的 `.mpls`、`.clpi` 与 `BACKUP/` 目录下的备份文件完全一致    |

## 参考资料

- [tsMuxeR 原仓库][tsmuxer-original]与[使用说明][tsmuxer-usage]：传统混流、MPLS 输入、蓝光输出、字幕和章节参数。
- [tsMuxeR 社区分支][tsmuxer-fork]与[BDMV 打包 ISO 教程][tsmuxer-iso]：区分重新混流和将完整目录原样打包。
- [tsMuxeR 的 IG SubPath 讨论][tsmuxer-ig]：外置菜单关联丢失及导航初始化依赖。
- [BDedit 功能及版本记录][bdedit]：MPLS、SubPath、STN、IG 编辑及 UHD 相关支持记录。
- [BDFix 历史产品资料][bdfix-info]与[公开重制示例][bdfix-guide]：打开 BDMV、轨道替换与输出的操作参考。
- [KITe 官方产品页][kite]、[格式与功能表][kite-features]及[界面说明][kite-screenshots]：产品范围、输入资产、Clip 与播放列表编辑。
- [Scenarist 官网][scenarist]与[QuickStart Tutorial v1.1 存档][scenarist-tutorial]：BD / UHD 的区别和小型蓝光菜单工程的完整入门练习。

[tsmuxer-original]: https://github.com/justdan96/tsMuxer
[tsmuxer-usage]: https://github.com/justdan96/tsMuxer/blob/master/docs/USAGE.md
[tsmuxer-fork]: https://github.com/teaching-droid/tsMuxer
[tsmuxer-iso]: https://github.com/teaching-droid/tsMuxer/blob/master/docs/BDMV_TO_ISO.md
[tsmuxer-ig]: https://github.com/justdan96/tsMuxer/issues/129
[bdedit]: https://www.videohelp.com/software/BDedit
[bdfix-info]: https://www.qweas.com/downloads/audio/multimedia-creation-tools/moreinfo-bdfix.html
[bdfix-guide]: https://home.gamer.com.tw/artwork.php?sn=5652920
[kite-news]: https://dvd-logic.com/
[kite]: https://dvd-logic.com/kite
[kite-features]: https://dvd-logic.com/kite/features
[kite-screenshots]: https://dvd-logic.com/kite/screenshots
[scenarist]: https://www.scenarist.com/
[scenarist-tutorial]: https://archive.org/details/scenarist-bd-quick-start-tutorial-v-1.1
