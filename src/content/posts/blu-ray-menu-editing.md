---
title: 蓝光原盘菜单修改篇：IG 菜单与 BD-J 菜单
description: 给蓝光菜单加音轨或字幕按钮：改 IG 图形与导航命令，或沿 BD-J 应用改资源、轨道映射并重签名。
author: Ayulog
pubDatetime: "2026-10-11T12:00:00+08:00"
draft: false
category: diy
tags:
  - 蓝光
---

为蓝光原盘加入新音轨或中文字幕后，若希望在原盘菜单界面上直接显示并选中新轨道，需要同步修改菜单的**视觉文字、按钮导航逻辑与底层轨道映射**。

蓝光原盘菜单按技术架构分为两类：**IG（Interactive Graphics）菜单**通过 HDMV 交互图形流、按钮命令与播放列表流表（STN）控制；**BD-J（Blu-ray Disc Java）菜单**则由 Java Xlet 应用程序驱动，通过代码、配置文件与图片图集管理界面和切轨逻辑。底层轨道混流方法见[蓝光原盘 DIY](/posts/blu-ray-diy/)，目录结构基础见[认识蓝光碟片](/posts/understanding-blu-ray/)。

## 菜单类型识别与轨道映射记录

### IG 菜单与 BD-J 菜单的结构差异

动手前先从正片的实际播放入口确认当前盘片使用的菜单架构（部分盘片可能主菜单与花絮采用不同架构）：

| 维度         | IG 菜单（HDMV）                                                   | BD-J 菜单（Java）                                |
| ------------ | ----------------------------------------------------------------- | ------------------------------------------------ |
| 菜单载体     | 封装在 M2TS 流中的 Interactive Graphics（IG）图形对象、页面与命令 | `BDMV/JAR/` 下的 Java 类、图片图集、字体与配置表 |
| 启动与挂载   | 由 `MovieObject.bdmv` 引导，通过 MPLS 的 STN 流表及 SubPath 挂载  | 由 `BDMV/BDJO/*.bdjo` 指定启动 Xlet 类与类路径   |
| 涉及核心文件 | `MovieObject.bdmv`、`.mpls`、`.clpi`、承载 IG 流的 `.m2ts`        | `.bdjo`、`.jar`、外置资源目录及 `CERTIFICATE/`   |
| 新增按钮改动 | 修改按钮状态位图、上下左右邻接关系、导航指令与 STN 流表           | 修改按钮数组、图集切图坐标、轨道索引映射并重签名 |

### 记录菜单与轨道的映射关系

修改菜单前，先用 BDInfo 和 BDEdit 梳理并记下以下对应关系表：

1. **正片播放列表（MPLS）**：记录从主菜单进入正片所调用的 `.mpls` 编号（若存在剧场版/加长版或多语言入口，需一并记录）。
2. **菜单承载文件**：定位主菜单与播放中弹出菜单（Pop-up Menu）对应的 `.m2ts` / `.clpi` 文件或 `.jar` 包编号。
3. **编号映射关系**：分别记录**按钮 ID（Button ID）**、**播放列表 STN 中的轨道序号（Stream Number）**、**实际流的 PID** 以及 **SubPath ID**。

这一点尤为关键：蓝光菜单按钮切换音轨或字幕时，指向的通常是**当前 MPLS 流表（STN）中的轨道序号**。若混流时把原本隐藏的轨道也一并加入 STN，导致后续轨道序号顺延，原有的按钮就会切到错误的字幕轨。因此，修改菜单前需先把混流后的 STN 轨道顺序固定下来。

## 一、IG 菜单修改流程

### 常用工具分工

- **[BDEdit][bdedit]**：查看与修改 BDMV 导航命令、MPLS 流表（STN）与 SubPath，支持导出/导入 `.mnu` 菜单结构、替换 PNG 按钮图形并将修改后的 IG 流复用（Mux）回 `.m2ts`（版本记录见 [BDedit 更新说明][bdedit-history]）。
- **[DVDLogic IG Editor][ig-editor]**：专业的 IG 菜单图形与导航编辑器，支持导入/导出 Photoshop PSD 图层、可视化编辑按钮坐标与命令，可配合 [EasyBD UHD][easybd] 或 Scenarist 编译使用。

### 第一步：定位主菜单与弹出菜单 Clip

1. 在 BDEdit 中打开原盘目录，切换到正片对应的 `.mpls`。
2. 查看 `PlayItem`、`STN` 流表和 `SubPath`：
   - 若原盘采用**独立外置 IG Clip**，`SubPath` 中会显示 `IG menu` 条目，并在 `SubPlayItem` 中指明对应的菜单 `.m2ts` 编号；
   - 若原盘将 IG 流与正片视频直接复用在同一个 `.m2ts` 中，则在主 `PlayItem` 的 `STN` 表下直接查看 `IG` 条目。
3. 选中承载 IG 的 Clip，点击进入 **Menu** 视图，浏览各页面（Page）与按钮（Button），确认目标音轨/字幕菜单所在的页面编号（多语言盘片需区分不同语种对应的菜单页面）。

### 第二步：编辑页面、按钮状态与导航命令

在 BDEdit 的 Menu 视图或 IG Editor 中，菜单由以下层级构成：

| 结构层级                                  | 修改时的核心操作                                                               |
| ----------------------------------------- | ------------------------------------------------------------------------------ |
| Page / BOG（Button Overlap Group）        | 管理当前页面包含的按钮重叠组，以及组内默认激活显示的按钮                       |
| Button                                    | 设置按钮 ID、屏幕 X/Y 坐标，以及按下遥控器上/下/左/右方向键时跳转的邻接按钮 ID |
| 状态图形（Normal / Selected / Activated） | 分别对应按钮在普通、光标选中、按下瞬间的状态位图（Object）                     |
| Object / Palette                          | 导入修改后的透明 PNG 位图，并匹配当前页面的 256 色调色板（Palette）            |
| Navigation Command                        | 编写按下确认键后执行的导航命令（如 `SetStream` 切换指定音轨或字幕序号）        |

根据修改目标选择操作方式：

- **替换现有按钮文字（推荐优先采用）**：保留原按钮 ID、坐标和方向键导航不变，导出该按钮 Normal、Selected、Activated 三个状态的 PNG 图片，在图像软件中改为中文（如“简体中文字幕”），保持相同尺寸与透明背景导回并重新生成调色板，最后将按钮的 `SetStream` 命令指向新字幕在 STN 中的序号。
- **新增独立按钮**：复制一个同类的音轨或字幕按钮，分配新的 Button ID 与 BOG，调整画面坐标，修改相邻按钮的上下左右焦点链路（确保遥控器方向键能顺畅移入和移出），绑定新制作的中文状态 PNG，并设置对应的 `SetStream` 切轨命令。

### 第三步：复用输出并同步 CLPI

在 BDEdit 中完成图形与命令修改后：

1. 若 IG 位于独立的菜单 `.m2ts` 中，点击 **Mux** 将修改后的 IG 流输出为新的菜单 `.m2ts`，替换工作盘 `BDMV/STREAM/` 下的同名文件，并让 BDEdit 同步更新对应的 `.clpi` 文件。
2. 若 IG 与视频流复用在同一 `.m2ts` 中，则需通过编著或混流工具将新 IG 流与原音视频流重新混流，并更新配套 `.clpi`。

### 第四步：恢复 tsMuxeR 混流后丢失的外置弹出菜单

使用 [tsMuxeR][tsmuxer]（见[发布说明][tsmuxer-release]与[使用文档][tsmuxer-usage]）重新混流正片后，新生成的 `.mpls` 往往会丢失原有的外置 IG 弹出菜单关联，导致播放正片时按遥控器无法呼出菜单。此时可用两个 BDEdit 窗口对比原盘备份与工作盘的正片 `.mpls` 进行修复：

1. **核对菜单文件**：确认工作盘 `STREAM/` 与 `CLIPINF/` 中仍完整保留着原盘的 IG 菜单 `.m2ts` 和 `.clpi`。
2. **补回 SubPath 与 SubPlayItem**：在工作盘 `.mpls` 中参照原盘补齐 `IG menu` 类型的 `SubPath`，填入正确的菜单 Clip 编号、入出点（In/Out Time，需匹配新正片时间轴）及同步类型。
3. **补回 STN 中的 IG 条目**：在主 `PlayItem` 的 `STN` 流表中新增 IG 流，关联刚才添加的 `SubPath`、菜单流 PID（从菜单 Clip 实际读取）及语言代码。
4. **同步备份**：保存修改并同步更新 `BDMV/BACKUP/` 下的同名文件。

### 第五步：修改背景视频中的烘焙文字

部分蓝光菜单将按钮文字直接画在背景视频画面上，IG 流仅包含透明的高亮边框或光标。此时仅修改 IG 位图无法改变底图文字，需一并处理菜单背景视频：

1. 先用 MediaInfo 或 [ffprobe][ffprobe] 查看菜单背景 `.m2ts` 的分辨率、帧率、时长、色彩空间（BT.709 SDR 或 BT.2020 HDR）与编码格式：

```powershell
ffprobe -v error -select_streams v:0 -show_streams -show_format -of json "menu-source.m2ts"
```

2. 若为静态画面循环视频，提取单帧图像修改文字后，严格按照源视频的分辨率、帧率、时长、色彩空间与蓝光合规参数重新编码为 AVC / HEVC 流。
3. 将新背景视频与原菜单音频、IG 流重新混流为 `.m2ts` 并更新 `.clpi`，核对 IG 高亮光标位置与新背景文字准确对齐。

## 二、BD-J 菜单修改流程

### 第一步：从 BDJO 定位应用入口与资源结构

BD-J 菜单由 `BDMV/BDJO/*.bdjo` 启动配置驱动（详见 [HD Cookbook 的 BDJO 工具说明][hdc-bdjo]）：

1. 用 BDEdit 打开原盘，查看目标 Title 对应的 `.bdjo` 文件，记录其指向的启动 `Jar` 编号（如 `00000.jar`）、入口 Xlet 类名（Initial Class）、Organization ID 与 Application ID。
2. 将 `BDMV/JAR/` 下的相关 `.jar` 文件及子目录复制到独立分析目录，使用 Java 反编译器（如 CFR、Vineflower 或 Jadx）打开入口类，顺着 `initXlet`、`startXlet` 查找菜单初始化、语言分支、资源加载与按钮事件分派逻辑。

### 第二步：识别常见商业盘 BD-J 菜单框架

不同发行商与制作公司使用的 BD-J 框架各有规律，常见结构如下：

| 常见菜单框架案例                                           | 核心文件与修改关注点                                                                                                |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **迪士尼（Disney）部分 UHD 菜单**                          | 入口类、语言菜单、主菜单与 Pop-up 子菜单分离；需同步修改按钮列表、切图坐标、动作类与轨道数组                        |
| **Radius60 框架**（常见于狮门等部分发行版）                | 采用 PNG 图集 + XML 布局 + Java 列表/动作类（部分含 `bluray_project.bin`）；新增条目超出一页时需配置分页逻辑        |
| **索尼（Sony）部分菜单框架**                               | 包含 `common.properties`、`onQClient.cfg`、`playlists.xml` 及 HCF / QCT 字库与配置表；通过属性表与 XML 管理轨道映射 |
| **配置文件驱动型框架**（如含 `menu.xml`、`disc.xml` 结构） | 菜单布局、章节与轨道映射集中在 XML / CSV / TXT 配置文件中，配合 PNG 字体图集显示                                    |

由于同一片商在不同时期或不同影片中可能采用不同外包团队的框架，动手时以实际反编译看到的包结构与配置文件为准。

### 第三步：修改图片图集（Sprite Sheet）与分页

1. **修改 PNG 图集**：BD-J 菜单通常将所有按钮文字拼在一张或多张大图（PNG 图集）中，通过 XML、配置文件或 Java 数组中的 `(X, Y, Width, Height)` 坐标裁切显示。可在图集空白处绘制“中文字幕”“国语配音”的普通、选中、激活状态字样，记录像素坐标；或直接替换不再使用的外语按钮区域。
2. **处理字形图集（Bitmap Font）**：若菜单使用单字拼接方式渲染文字（如 Sony 的 HCF 字库或带 CSV/TXT 字符映射表的 PNG 字库），需在字库图中补充所需汉字，并在字符索引表中注册对应的字符编码、坐标与字宽。
3. **处理列表分页**：当原有音频或字幕列表一页已满、新增条目导致超出单页容量时（例如部分 Radius60 菜单），需参照同盘“章节选择”等多页菜单的实现，启用翻页容器并绑定“上一页 / 下一页”导航箭头。

### 第四步：添加按钮逻辑与绑定轨道映射

在代码或配置文件中串联起新增按钮的完整链路：

1. **更新应用层轨道表**：将新增音轨或字幕在 MPLS STN 中的序号（注意核对代码从 `0` 还是 `1` 开始计数）加入 BD-J 程序的轨道定义表或 `playlists.xml`。
2. **扩充按钮数组与资源引用**：在字幕或音轨菜单列表中插入新按钮对象，增大数组长度或列表容量，绑定第三步记录的图集坐标或资源 ID。
3. **绑定切轨动作与选中状态**：确保按下新按钮时调用正确的流切换方法，并同步更新当前选中项的勾选图标（Checkmark）以及主菜单与播放中 Pop-up 菜单之间的状态同步。

### 第五步：重新编译与打包 JAR

1. **编译前基线验证**：在修改代码前，先尝试将反编译出的单个目标 `.java` 类在不改逻辑的情况下编译回 `.class`。配置好BD-J 平台 API 依赖（如 `bdj.jar` / Java TV / HAVi / DVB 类库，仅作编译期 `-classpath` 引用，切勿打包进成品 JAR）与原盘一致的字节码目标版本（如 `-source 1.4 -target 1.4` 或对应版本）。
2. **最小范围替换**：只重编译被修改的 `.java` 文件（注意连同其生成的 `ClassName$1.class` 等内部类/匿名类文件），用压缩工具按原有目录层级替换进原 `.jar` 副本中，保持其余未修改的 `.class` 原封不动。

### 第六步：BD-J 重签名与证书同步

如果原盘的 `.jar` 包含数字签名（`META-INF/SIG-BD00.SF`、`.RSA` 等），修改 JAR 内部任何文件（包括仅替换一张 PNG 图片）都会导致原有哈希校验失效，使得播放器启动 BD-J 时黑屏或报错。

此时需要使用专用的 BD-J 签名工具（如 [HD Cookbook 安全工具集][hdc-security]中的 `BDCertGenerator`、`BDSigner` 或 Scenarist 配套签名工具，不可仅用普通 Java SE 的 `jarsigner` 替代，因为 BD-J 规范要求清单中包含 `BDJ-Signature-Version: 1.0` 等特定扩展属性）：

1. **核对 Organization ID**：读取本盘 `.bdjo` 与 `id.bdmv` 中的 Organization ID（8 位十六进制）。
2. **生成证书与统一重签**：若使用新建的根证书签名，需用同一套密钥对该盘所有需要签名的 `.jar` 包统一执行 BD-J 重签名，并将配套生成的新应用根证书覆盖到盘片根目录的 `CERTIFICATE/app.discroot.crt` 与 `CERTIFICATE/BACKUP/app.discroot.crt`。
3. **辅助查看签名状态**：需要查看 JAR 包内的证书链与摘要信息时，可使用 JDK 的 [jarsigner][jarsigner] 命令检查：

```powershell
jarsigner -verify -verbose -certs "00000.jar"
```

## 改盘后的完整菜单与播放测试

菜单修改完成后，使用支持完整 HDMV / BD-J 导航的播放软件（如集成 [libbluray][libbluray] 与 JRE 的播放器、PowerDVD）以及目标硬件蓝光播放机，从**整个 BDMV 根目录或打包后的 ISO 镜像**启动测试：

| 测试环节         | 验收标准                                                                |
| ---------------- | ----------------------------------------------------------------------- |
| 冷启动与引导     | 完全退出播放器并清除该盘持久化缓存后重开，能正常走完片头进入主菜单      |
| 主菜单与弹出菜单 | 播放前在主菜单、播放中呼出 Pop-up 菜单、暂停及返回均响应正常            |
| 遥控器焦点导航   | 上下左右移动、翻页箭头、确认与返回键焦点连贯，无死胡同或跳出屏幕        |
| 音轨与字幕切换   | 点击新增中文按钮能准确切到目标音轨/字幕，关闭字幕与导评音轨互不串位     |
| 视觉状态反馈     | 按钮在普通、选中、按下三种状态下的文字与高亮正常，当前选中勾选框准确    |
| 多入口与备份一致 | 多版本播放列表、章节跳转正常，`BACKUP/` 与 `CERTIFICATE/BACKUP/` 已同步 |

### 常见故障速查

- **正片能播，但按遥控器呼不出 IG 弹出菜单**：检查工作盘 MPLS 的 `SubPath` 与 `STN` 是否漏填 IG 条目，以及菜单 `.m2ts` / `.clpi` 的 PID 是否匹配。
- **点击“中文字幕”按钮却切到了其他语种字幕**：核对混流后正片 MPLS 的 `STN` 字幕轨排列顺序，修正按钮命令或 Java 轨道映射表中的索引号。
- **新增按钮看不见或光标移不过去**：检查 PNG 图集裁切坐标、调色板透明度、按钮所属 BOG 以及相邻按钮的上下左右指向 ID。
- **BD-J 启动后黑屏或无限加载**：查看播放器日志（如 libbluray 日志），重点排查 `.class` 字节码版本过高、内部类漏打包或 JAR 重签名与 `app.discroot.crt` 不匹配。

## 参考资料

- [BDEdit 官方说明][bdedit]与[更新记录][bdedit-history]：导航、IG 编辑、菜单复用与文件处理功能。
- [DVDLogic IG Editor][ig-editor]与[EasyBD UHD][easybd]：IG 编著、图形与导航编辑、菜单参与蓝光编译的流程。
- [tsMuxeR 原项目][tsmuxer]、[2.7.0 发布记录][tsmuxer-release]和[使用说明][tsmuxer-usage]：输入与蓝光输出能力。
- [Scenarist 官方网站][scenarist]：BD、UHD 与 Designer 的产品分工。
- [HD Cookbook 作者站][hdc]所链接的[BDJO 工具档案][hdc-bdjo]与[安全工具档案][hdc-security]：BD-J 应用组织与专用签名实现。
- [Oracle JDK 25 jarsigner 文档][jarsigner]：JAR 签名校验说明。
- [FFmpeg ffprobe 文档][ffprobe]：视频流与容器信息检查。
- [VideoLAN libbluray][libbluray]：开源蓝光导航、菜单与 BD-J 支持范围。

[bdedit]: http://bdedit.pel.hu/
[bdedit-history]: http://pel.hu/down/BDedit.txt
[ig-editor]: https://dvd-logic.com/ig_editor
[easybd]: https://dvd-logic.com/easy_bd
[tsmuxer]: https://github.com/justdan96/tsMuxer
[tsmuxer-release]: https://github.com/justdan96/tsMuxer/releases/tag/2.7.0
[tsmuxer-usage]: https://github.com/justdan96/tsMuxer/blob/master/docs/USAGE.md
[scenarist]: https://www.scenarist.com/
[hdc]: https://hdcookbook.jovial.com/
[hdc-bdjo]: https://github.com/zathras/java.net/blob/master/hdcookbook/DiscCreationTools/bdjo/README.txt
[hdc-security]: https://github.com/zathras/java.net/blob/master/hdcookbook/DiscCreationTools/security/README.html
[jarsigner]: https://docs.oracle.com/en/java/javase/25/docs/specs/man/jarsigner.html
[ffprobe]: https://ffmpeg.org/ffprobe.html
[libbluray]: https://www.videolan.org/developers/libbluray.html
