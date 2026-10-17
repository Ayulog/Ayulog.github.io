---
title: AI 字幕：图形识别、硬字幕提取与翻译校对
description: 把图形或画面里的字幕识别成文本，再用大模型或机器翻译出译稿，并逐条校对时间轴。
author: Ayulog
pubDatetime: "2026-10-11T13:00:00+08:00"
draft: true
category: subtitles
tags:
  - 字幕
  - AI 字幕
  - SUP
  - OCR
  - 字幕翻译
  - Subtitle Edit
  - VideoCaptioner
  - Aegisub
---

一段视频没有现成字幕，原因可能是字幕被压进了画面，也可能素材里只有音轨。蓝光 SUP 与硬字幕都是图片，提取方法不同；只有音轨时要先做语音转写，已有的 SRT 则可以直接整理和翻译。原文与时间轴可靠之后，再进入翻译和审校。

主线是 **DGDemuxGUI → Subtitle Edit → Aegisub → VideoCaptioner**；命令行 SUP 识别、硬字幕 OCR、其他翻译工具和人工对照作为分支。按素材选用其中一条即可，不必把所有软件都跑一遍。

资料核对于 **2026 年 10 月 11 日**，本次没有进行软件实机测试。Subtitle Edit 按 **5.2.0** 发布页与在线文档、VideoCaptioner 按 **1.4.2** 文档及源码核对；其他工具的版本边界在对应段落标明。旧版参考界面的 DGDemuxGUI 为 **1.0.0.82**、Subtitle Edit 为 **4.0.15**、VideoCaptioner 为 **1.3.3**，菜单名称仍需结合安装版本。

完整路线见[字幕的处理](/posts/subtitle-workflow/)；只想修改 SUP 的时间、位置或图片，可以先看[SUP 图形字幕的修改方法](/posts/sup-subtitle-editing/)。

## 先按素材选择路线

| 手上的素材                          | 先做什么                                 | 可选工具                                                          |
| ----------------------------------- | ---------------------------------------- | ----------------------------------------------------------------- |
| 蓝光原盘、独立 SUP、MKV 中的 PGS 轨 | 提取图形字幕，再 OCR                     | DGDemuxGUI + Subtitle Edit；已有 SUP 或 MKV PGS 时也可用 PgsToSrt |
| DVD VobSub、BDN XML 等图形字幕      | 用支持该格式的入口做 OCR                 | Subtitle Edit                                                     |
| 已压进视频画面的硬字幕              | 限定画面区域，检测字幕与出现时间，再 OCR | VideOCR、VSE                                                      |
| 只有音视频，没有可用字幕            | 语音识别（ASR），生成原文字幕            | faster-whisper-GUI、VideoCaptioner                                |
| 已有可用 SRT / ASS / VTT            | 校对原文，制作翻译副本                   | VideoCaptioner、LinguaGacha、Subtitle Edit                        |

能够提取独立字幕轨时，优先利用原轨的事件和时间信息。硬字幕 OCR 需要从画面推断出现与消失的时刻；语音识别需要从音频生成时间轴，两者都要特别检查短句、重复句和时间边界。播放器关闭字幕显示后文字仍在画面上，通常才是硬字幕；可开关的外挂或内封文本字幕应先提取。

## 图形字幕：提取 SUP，再选择 OCR 工具

### 从原盘提取 SUP

先用 BDINFO 确认正片播放列表、时长与字幕语言。相同语言下可能有完整对白、听障辅助、强制字幕或评论字幕，选轨前先确认内容。

在 DGDemuxGUI 中按以下顺序操作：

1. 在 **Disk** 中选择蓝光源目录，在 **Output folder** 中设置输出目录。
2. 根据 BDINFO 的结果选择 **Playlists** 中的 MPLS，核对时长和章节，避免选到预告片或另一剪辑版本。
3. 在 **Streams** 中勾选需要的 **PGS subtitles**。只提取字幕时，取消不需要的音视频轨道。
4. 点击 **Demux**，完成后检查日志和输出的 `.sup`。
5. 用 Subtitle Edit 打开 SUP，抽查开头、中段和片尾的内容，确认语言与影片版本对应。

不同分支、片头和剪辑会影响字幕时间线。发现字幕明显过短或前后内容不对应时，回到播放列表检查。DGDemux 官方站本次访问遇到验证页，上面的 GUI 项目名称按旧版参考界面记录；蓝光提取的其他路线见[原盘 Remux](/posts/blu-ray-remux/#第二步选择提取路线)。

### 方法一：在 Subtitle Edit 中做 OCR

[Subtitle Edit 官方 OCR 文档][se-ocr]列出的入口是 **File → Import → Image-based subtitle for OCR…**；直接打开支持的图形字幕也会进入 OCR 窗口。它支持 Blu-ray SUP、VobSub、BDN XML，以及容器中的部分图形字幕。

先挑包含普通对白、斜体、双行、人名和标点的几条做识别，再处理全片：

1. 打开 SUP，选择 OCR 引擎。
2. 设置原文语言；英文字幕选 English，再选择对应的拼写检查字典，例如 `en_US`。
3. 本地识别可以使用 **Tesseract**，按 OCR 窗口下载所需语言数据；字体一致的字幕也可以考虑需要训练字库的 nOCR。
4. 使用 **Google Lens** 时先确认网络与服务可用。当前官方文档区分 Google Lens Sharp 和 Standalone，后者仅限 Windows；它们有使用限制，名称与旧版界面不同。
5. 点击 **Start OCR**，遇到未知词时对照右侧原图修正，完成后点击 **OK**，导入文本字幕。

旧界面曾列出 Tesseract 5.5.0，不必锁定这个版本。Google Lens 和本地 OCR 的准确率要按实际字幕的漏字、斜体、连字符与标点比较。

遇到网络报错或识别中断，先记录停止位置，再对缺失或错误的条目重试。当前官方文档提供右键 **OCR selected lines**；不要让错误页文字或空白结果混进字幕。

### 方法二：用 PgsToSrt 转换 SUP 或 MKV 中的 PGS

[PgsToSrt][pgstosrt] 适合命令行转换和重复处理。它能读取独立 `.sup`，也能对 MKV 中的 PGS 字幕轨做 OCR，输出 SRT。v1.4.8 使用 Tesseract，并使用 Subtitle Edit 的 LibSE。

1. 下载 [v1.4.8 发布包][pgstosrt-release]，安装 **.NET 8 Runtime**。
2. 从 [Tesseract 语言数据仓库][tessdata]下载原文对应的数据，例如英文 `eng.traineddata`，放进 PgsToSrt 程序目录下的 `tessdata` 文件夹。
3. 把待识别的 SUP 放在工作目录，在程序目录打开终端，指定输入、输出和语言。下面以英文为例：

```powershell
dotnet PgsToSrt.dll --input "source.eng.sup" --output "ocr-draft.eng.srt" --tesseractlanguage eng --tesseractdata "tessdata"
```

Windows 发布包带有 Tesseract / Leptonica 原生库，但仍需准备 .NET 运行时和语言数据。输入不在当前目录时，将示例文件名改为相应路径；每份字幕指定不同输出名，保留源文件和旧校对稿。

处理 MKV 时，可以使用 `--input "source.mkv" --track 4` 这样的参数组合。**4 只是示例**：官方文档要求从 `mkvinfo` 获取轨道编号，并确认该轨是 PGS；不要直接照抄其他提取工具显示的轨道 ID。输出后仍需对照原图校正斜体、人名和标点。

## 硬字幕：从视频画面提取文字与时间

VideOCR 和 VSE 直接处理视频画面，不是打开 SUP 的另一种入口。对白在底部、注释在顶部，或者不同段落的字幕位置变化时，一个固定裁剪框可能漏掉部分内容；可以分段调整区域，分别识别后再核对合并。

### 方法一：VideOCR

[VideOCR v1.6.0][videocr-release] 提供 Windows、Linux 图形界面及 CPU / GPU 运行方案。按发布说明选择与系统、显卡相符的包；GPU 包还需要匹配其 CUDA 要求。没有合适的 NVIDIA 显卡时可先选 CPU 方案。

1. 导入视频，找到包含普通对白、双行字幕和短句的一小段。
2. 拖动裁剪框圈出字幕区域，上下留少量余量，尽量避开台标和无关画面文字。
3. 选择原文语言和 OCR 引擎。**PaddleOCR** 在本地检测并识别；**Google Lens** 模式在本地检测文字，再交给云端识别，需要联网，字幕图像会离开本机。
4. 设置一小段起止时间，点击 **Run**，先检查生成的 SRT。
5. 检查识别文字、重复条目和起止时间，确认区域覆盖所需字幕后，再处理全片。

跳帧越多，处理可能越快，也越容易漏掉短字幕或让时间边界变粗。字幕淡入淡出、运动文字、复杂背景和画面切换都值得单独抽查；导出的文字通顺，时间边界仍要回看。v1.6.0 还可以保存 PaddleOCR 检测与识别的标注图，方便回查异常。

### 方法二：VSE（video-subtitle-extractor）

[VSE 2.2.0][vse-release] 的发布附件提供 **Windows x64 CPU** 和 **macOS ARM64 CPU** 安装包。源码文档另外说明 CPU、CUDA、DirectML 等运行方式，GPU 支持取决于实际安装路线，下载页标题不足以判断。

1. 按[官方说明][vse]准备程序和模型。文档提醒程序与视频路径避免中文和空格，可以先用 `videos/episode01.mp4` 这样的简单路径。
2. 点击 **打开**，选入视频，调整字幕区域。
3. 设置原文语言，先尝试 **快速**或**自动**模式，点击 **运行**。
4. 检查生成的 SRT，尤其是连续相似对白、短暂出现的文字和切镜位置。TXT 可作文字稿，继续制作字幕时使用带时间信息的 SRT。
5. 漏掉短字幕时，对问题片段尝试更细的检测方式，并重新对照视频；“精准”模式同样可能漏字或漏时间轴。

VSE 使用本地 OCR，不需要配置在线识别 API。批量打开多个视频前，确认它们的分辨率和字幕位置一致；同一系列也可能有不同片头、上下黑边或字幕布局，不要直接套用一个区域。

## 没有现成字幕：先做语音转写

这一步属于 **ASR**，识别的是声音。它可以补充 OCR 漏掉的对白，但通常无法恢复无声的招牌、屏幕提示和注释；硬字幕也可能与实际口语略有不同，不能把两份稿件直接逐行替换。

需要独立本地转写工具时，可以使用 [faster-whisper-GUI][fw-gui]。[0.8.5 发布包][fw-gui-release]采用 Windows 分卷自解压形式，需要同时下载 `part1.exe` 和 `part2.rar`，放在同一目录后运行第一卷。其 README 与发布说明给出的路线是：

1. 准备 FFmpeg，下载或在程序中配置可用的 faster-whisper 模型。
2. 导入音频或视频，设置实际对白语言，先以转写原文为目标。
3. 先处理短片段；根据设备能力调整模型，并检查 VAD（语音活动检测）有没有漏掉低声对白或把音乐当成人声。
4. 导出 SRT，对照音频校正文字、分句和时间，再进入下面的翻译流程。

下载模型后可以进行本地推理，处理速度取决于模型与硬件。没有对白的区段、重叠说话、歌曲、方言和专名都容易出错。模型界面的“翻译”选项面向特定目标语言；需要中文译稿时，先取得原文 SRT，再走专门的翻译步骤。

## 把识别初稿校对成可翻译的原文

### 对照原图、画面和音频改文字

先检查 `I / l / 1`、`O / 0`、引号、音乐符号、连字符、人名与地名。拼写检查只说明字典是否认识这个词，不能判定句意是否正确。

确认无误的专名可以加入名称列表或用户词典；临时跳过和永久加入字典是不同操作。反复出现的识别错误可以建立替换项，但先逐个查看命中结果。比如双人对白的行首短横线，不能和单词中的连字符一起删除。

当前 OCR 文档还提供 **Save all images with HTML index…**：导出每条字幕图与识别文字，方便并排复核。所用版本没有这个入口时，直接在 OCR 窗口逐条对照原图。

用 VideOCR / VSE 得到的稿件要回看视频画面；语音转写稿则要对照原声。原盘 SUP 的 OCR 主要是改文字，硬字幕提取和 ASR 还应检查分条、漏掉的短句与起止时间。用视频片段试跑时，也要确认输出时间是原视频时间还是从片段起点重新计时。

### 按用途处理听障说明与格式

`[DOOR SLAMS]`、说话人名称和音乐提示属于需要按用途决定是否保留的内容。制作听障辅助字幕时应保留；只制作对白稿时，可以用 **工具 → 删除听障辅助文本**筛选候选项，检查前后对照后再应用。

不要因为文字全大写就批量删除。招牌、屏幕文字、缩写、喊话以及部分原盘的全部对白都可能大写。感叹词和歌词同样可能承载剧情信息。

`<i>…</i>` 是斜体格式标签，不是听障提示。需要保留画外音或强调等排版信息时，保留对应标记；若准备一份纯文本翻译副本，再单独处理格式，并保存原稿以便恢复。

### 逐项运行常规修复

使用 **工具 → 修复常规错误**，先看预览，再勾选要修复的内容。多余空格、明显损坏的标签可以先处理；更改显示时长、合并短行、重排断行、修复重叠和大小写等选项，需要结合视频逐项勾选。

保留这些中间文件，便于回查：

```text
source.sup        原始图形字幕；其他路线保留源音视频
ocr-draft.srt     OCR 初稿；语音路线另存 ASR 初稿
proofread.srt     对照原图、视频或原声后的原文校对稿
translation.srt   翻译及审校稿
final.ass         最终排版工程
```

保存 SRT 时使用 UTF-8。SRT 可以承载文字、时间及有限格式，但不会完整继承 PGS 图像的字形、颜色、定位和 forced 事件属性。

## 翻译前：整理副本，保留时间与格式原稿

用 Aegisub 打开 `proofread.srt`，另存一份用于翻译。如果一个完整句子只是为了屏幕排版被折成两行，可以把这条字幕里的硬换行改为空格。

旧版界面的做法是 **编辑 → 搜索替换**：查找 `\N`，替换为一个空格，关闭“使用正则表达式”，先用“查找下一个”确认结果，再处理选中行。

```text
原文：The train leaves\Nat six.
整理：The train leaves at six.
```

只处理同一条事件中需要合并的显示换行，不要改动 SRT 的时间码或事件之间的空行。两人对白、双语上下行和歌词的分行有实际含义，应分别判断；不能全文件无差别替换。

VideoCaptioner v1.4.2 的 SRT 解析保留普通多行文本；这里的整理只是让句子结构更清楚，是否需要处理由短片测试决定。翻译完成后，仍要按画面和阅读速度重新断行。

以下几种翻译方法使用同一份校对稿。先选包含人名、短句、上下文指代和格式标记的几十条做试译，比较漏译、术语一致性和条目对应，再决定是否处理全片。

| 想怎样处理译稿                           | 可选方法               | 重点检查                                  |
| ---------------------------------------- | ---------------------- | ----------------------------------------- |
| 用大模型翻译普通 SRT，并导出单语或双语稿 | VideoCaptioner         | 分割与校正开关、原译对应、时间变化        |
| 按项目维护人物译名、术语和审校结果       | LinguaGacha            | 术语表、模型配置、未译条目和 ASS 行内标签 |
| 用传统翻译 API，或连接自托管翻译服务     | Subtitle Edit 自动翻译 | 语言支持、凭据、限流与缺少上下文的短句    |
| 只翻译少量对白，或逐句修正机翻           | 原译对照 + 人工填写    | 含义、条目归属、时间轴与阅读速度          |

## 翻译方法一：VideoCaptioner / 卡卡字幕助手

从 [VideoCaptioner 官方发布页][vc-release]取得软件，进入 **设置 → LLM 配置**。官方 README 说明它可接入 OpenAI 兼容接口；不同服务商和本地服务的地址、模型及认证要求各不相同，按所选服务填写。

### 填写接口并测试连接

1. 选择准备使用的服务或兼容接口类型。
2. 填写服务商提供的 **API Base URL**，不要把聊天网页地址填进去。
3. 填写该服务的 **API Key**，选择或输入账户实际可用的模型名称。
4. 点击 **检查连接**，确认请求能成功，再用少量字幕测试。

旧界面的服务列表出现过 DeepSeek、SiliconCloud、Ollama、LM Studio 等选项，列出的服务可以接入，效果要按自己的字幕片段比较。模型名称、费用与限流要求以提供方当前说明为准。截图或分享配置时遮住 API Key。

### 保留已校对的分条

切换到 **字幕优化与翻译**页面，按这条路线设置：

| 选项            | 本流程的处理方式                                     |
| --------------- | ---------------------------------------------------- |
| 翻译服务        | 选择 LLM 大模型翻译，目标语言选简体中文              |
| 字幕翻译        | 开启                                                 |
| 字幕校正 / 优化 | 原文已校对时先关闭，避免同时改写原文                 |
| 字幕分割        | 普通句子级 SRT 先关闭，不主动重新断句                |
| 反思翻译        | 可先关闭得到初译，再用同一小段比较开启后的效果与耗时 |
| 批处理与线程数  | 从小批量、较低并发开始，按模型限流和返回质量调整     |

v1.4.2 图形界面的默认批处理大小为 **10**、线程数为 **10**，线程配置范围为 **1–50**。这些是软件默认值，按所用服务的限流调整；首次试跑可以先把并发降到 **1–3**，成功后再逐步增加。旧截图中的 **100 线程**不适合作为通用建议。遇到 429、超时或反复失败时，先降低并发，检查额度、日志和失败条目。

关闭字幕分割后，v1.4.2 仍会对识别为字词级的输入进入重新断句流程。处理后的事件数量、起止时间和原译对应关系仍要与输入比较。

### 提供简短的文稿提示

在 **文稿提示**中填写已核实的角色名、地名、称呼和术语；不必粘贴与对白无关的大段资料。例如：

```text
请翻译成简体中文，保持原文的语气、否定和因果关系。
人名与术语：Alice → 艾丽丝；Harbor Station → 港口站。
保持这些译名和人物称呼前后一致，不添加原文没有的信息。
```

提示词只影响译文措辞；条目结构和时间轴要在工具设置里控制，再对比输出确认。

### 导入 SRT，翻译并另存

1. 在 **字幕优化与翻译**页面拖入整理好的 SRT，或点击文件夹按钮选择文件。
2. 检查导入后的开始时间、结束时间和原文，确认没有把单语双行误当成双语。
3. 核对翻译开关、目标语言与文稿提示，先处理一小段，点击 **开始**。
4. 查看译文有无漏行、空白、错误归属或重复；失败条目修正后再扩大范围。
5. 用 **保存**菜单导出新的 SRT。审校时可以选择“原文在上”或“译文在上”，最终需要单语时再导出“仅译文”。

v1.4.2 的图形界面支持导入 **SRT、ASS、VTT**，也实现了 SRT 和 ASS 保存。这里用 SRT 作为翻译中间稿：该版 ASS 导入会移除 `{…}` 覆盖标签，导出会重新生成样式与事件，已经做好的定位、图层和特效无法原样保留。已有复杂 ASS 时，先提取对白副本翻译，再把审校后的文字放回原工程。

SRT 也需要检查：例如 v1.4.2 的翻译处理会清理行末的中文逗号和句号，导出后应确认这种处理符合自己的标点规则。

## 翻译方法二：LinguaGacha 的术语与审校流程

[LinguaGacha][linguagacha] 适合把字幕作为一个项目维护，先统一人物译名，再进行全文翻译和审校。本节按 **v0.127.1** 核对，支持 SRT、ASS、SSA、VTT、LRC；其中 SSA、VTT、LRC 是 v0.127.0 新增支持，旧版不能直接套用这份格式列表。

### 建立项目并配置模型

1. 从[官方发布页][linguagacha-release]下载与系统相符的包。v0.127.1 提供 Windows x64 / ARM64 ZIP，解压后运行 `app.exe`。
2. 将字幕副本拖到页面，建立 `.lg` 项目。在**基础设置**中选好原文与译文语言。
3. 在**模型管理**选择服务商预设，或添加自定义兼容接口，填写接口地址、密钥和模型标识，先测试连接。
4. 回到 **AGENT**，选择本次使用的模型。

在线服务和本地模型服务都要提供软件可连接的接口。本地路线需要先启动模型服务、加载模型，再把它的兼容 API 地址填入配置；模型文件放在磁盘上还不够。模型能否装入内存或显存、是否适合目标语言，也要用实际字幕片段验证。

### 提取术语、翻译与生成译文

1. 在 **AGENT** 运行**术语提取**，打开**术语表**复核候选词。
2. 检查原文、译文和描述，修正人物、地点、组织与专有名词的译法，并启用准备使用的术语项。描述可以补充已确认的身份、性别和称呼关系。
3. 运行**全文翻译**，检查未完成条目和上下文不通的对白。
4. 运行**自动审校**，再人工复核改动；自动审校同样可能误解剧情。
5. 在 **AGENT** 点击**生成译文**。v0.127.1 会在 `.lg` 所在目录生成 `{工程名}_译文` 目录，重名时追加时间戳。

术语提取结果也需要校对，尤其是普通词被误当人名、同一角色有多个称呼，以及 OCR 已经认错的名字。不必把整句常用对白都加入术语表，先固定确有一致性要求的词。

### ASS 能保留什么

v0.127.1 的[ASS / SSA 解析与回写代码][linguagacha-ass]以 `Dialogue` 事件的 `Text` 字段为翻译内容，保留前面的时间、图层、样式等字段及其他段落。这比经 SRT 中转保留了更多 ASS 结构，但行内覆盖标签也在 `Text` 里，复杂特效仍要单独验证。

简单 ASS 可以先复制少量条目测试，导出后在 Aegisub 和目标播放器检查 `\N`、行内标签、位置与显示效果。逐字卡拉 OK、绘图、挂图或依赖原文长度的动画，继续采用“对白副本翻译 → 审校 → 回填原工程”的路线；需要按译文重新排版或重做 K 轴时，单独处理。

## 翻译方法三：传统机器翻译或自托管服务

不使用大模型时，可以选 Google Cloud Translation、Microsoft Translator、DeepL 等翻译 API；希望自建服务的，也可考虑 LibreTranslate。Subtitle Edit 的[自动翻译窗口][se-auto-translate]可以作为这些服务的字幕输入与结果预览界面。

1. 打开校对后的 SRT，另存一份翻译副本。
2. 进入 **Translate → Auto-translate…**，选择实际可用的引擎，设置源语言和目标语言。
3. 按引擎填写 API Key、服务地址等配置。例如 Google V2、Bing Microsoft Translator、DeepL V2 需要对应 API 凭据；LibreTranslate 则要有可连接的服务实例，是否需要密钥由该实例决定。
4. 点击 **Translate**，在表格中对照原文查看译文，修正后点击 **OK** 应用，另存为新文件。
5. 将输出与输入对比，检查事件数量、起止时间、多行对白与格式标记，再结合视频审校。

以上菜单按当前在线文档记录，旧版可能将入口放在不同位置。翻译网站账号、聊天软件订阅和 API 凭据属于不同的服务；费用、支持语言和限流以所选服务说明为准。

传统机器翻译适合快速取得初稿，但短字幕经常缺少主语、指代对象和前后文。遇到称呼、双关、方言或跨多条事件的长句，需要连着上下文重新判断。免费网页接口也可能限流或返回验证页，失败时先处理具体条目，不要把报错文字当译文保存。

## 人工对照：只翻译文字，保留原稿结构

不需要整部自动翻译，或只想修正一段机翻时，可以在 Subtitle Edit 建立[空白翻译副本][se-translation]：

1. 打开原文字幕，选择 **Tools → Make new empty translation from current subtitle**。
2. 软件将原文复制到 **Original text** 列，清空可编辑的 **Text** 列，保留时间、行序与格式元数据。
3. 逐条填写译文；需要外部翻译工具辅助时，一次提供相邻几条的原文和必要语境，再把确认后的文字填回相应条目。
4. 用新文件名保存，检查未译行和错填行。

这条路线便于处理少量难句，也避免把文件序号和时间码一起交给聊天工具重写。模型返回的解释、Markdown 围栏和“这句话可译为”等内容不能直接混入字幕。复杂 ASS 仍保留原工程，只将确认后的对白替换回对应事件。

## 逐行审校，再做 ASS 排版

将译稿与原文放在一起，在 Subtitle Edit 或 Aegisub 中加载对应视频检查：

- **含义**：否定、因果、指代、笑话和语气是否译对，有没有添加原文没有的信息。
- **专名**：人物、地点、数字、单位与称呼是否一致，OCR 原文本身有没有识别错。
- **条目**：是否漏译、重复、合并或错位，时间码和事件数量的变化是否有理由。
- **可读性**：译文是否来得及读完，换行有没有拆开姓名、固定短语或两人的对白。
- **播放效果**：开头、中段、结尾是否同步，画面文字与注释有没有遮挡重要内容。

如果还使用 Plus ASS 做字幕检查，把它作为补充检查步骤；自动检查不能确认翻译符合剧情。确定文字后再设置 Aegisub 样式、双语布局和特效，见[Aegisub 的 ASS 特效字幕制作教程](/posts/aegisub-ass-effects/)。需要 VSFilterMod 扩展时，再按[PotPlayer 与 MPC-HC 外挂特效字幕教程](/posts/vsfiltermod-external-subtitles/)检查目标播放环境。

保留源 SUP 或音视频、原文校对稿、译稿和最终 ASS。后面改一句译文或重做样式时，能直接回到对应阶段继续处理。

## 参考资料

- [DGDemux 官方入口][dgdemux]：本次遇到网站验证，GUI 步骤按旧版参考界面记录。
- [Subtitle Edit OCR 文档][se-ocr]与 [v5.2.0 发布页][se-release]：图形字幕导入、OCR 引擎、语言设置、选中行重识别与原图复核。在线文档持续更新，新增入口可能晚于安装版本。
- [Subtitle Edit 自动翻译][se-auto-translate]与[空白翻译副本][se-translation]：传统服务、接口配置、原译对照与保留条目结构。
- [PgsToSrt v1.4.8 README][pgstosrt]与[发布页][pgstosrt-release]：SUP / MKV 输入、语言数据、运行时与命令行参数。
- [VideOCR v1.6.0 README][videocr]与[发布页][videocr-release]：字幕区域、OCR 引擎、运行包和标注图。
- [VSE 2.2.0 README][vse]与[发布页][vse-release]：操作流程、批量限制和当前发布附件的平台。
- [faster-whisper-GUI README][fw-gui]与 [0.8.5 发布页][fw-gui-release]：FFmpeg、模型与音视频转写入口。
- [Aegisub ASS 标签手册][aegisub-tags]：硬换行与覆盖标签的含义。
- [VideoCaptioner v1.4.2][vc-release]、[官方 README][vc-readme]与 [LLM 配置文档][vc-llm]：安装、接口设置与文稿提示。服务商额度和模型推荐需另以提供方当前说明核对。
- VideoCaptioner v1.4.2 源码：[图形界面配置][vc-config]、[字幕格式定义][vc-formats]、[字幕解析与导出][vc-data]、[字幕处理流程][vc-pipeline]：用于核对并发范围、ASS 标签处理及重新断句行为。
- [LinguaGacha v0.127.1 README][linguagacha]与[发布页][linguagacha-release]：当前项目流程、模型、支持格式与译文导出；[术语表说明][linguagacha-glossary]用于理解术语用途，旧 Wiki 的界面入口需以当前版本为准。
- [LinguaGacha v0.127.1 ASS / SSA 处理源码][linguagacha-ass]：事件字段保留与行内标签的边界。

[dgdemux]: https://www.rationalqm.us/dgdemux/dgdemux.html
[se-ocr]: https://subtitleedit.github.io/subtitleedit/features/ocr.html
[se-release]: https://github.com/SubtitleEdit/subtitleedit/releases/tag/v5.2.0
[se-auto-translate]: https://subtitleedit.github.io/subtitleedit/features/auto-translate.html
[se-translation]: https://subtitleedit.github.io/subtitleedit/features/empty-translation.html
[pgstosrt]: https://github.com/Tentacule/PgsToSrt/blob/v1.4.8/README.md
[pgstosrt-release]: https://github.com/Tentacule/PgsToSrt/releases/tag/v1.4.8
[tessdata]: https://github.com/tesseract-ocr/tessdata/
[videocr]: https://github.com/timminator/VideOCR/blob/v1.6.0/README.md
[videocr-release]: https://github.com/timminator/VideOCR/releases/tag/v1.6.0
[vse]: https://github.com/YaoFANGUK/video-subtitle-extractor/blob/2.2.0/README.md
[vse-release]: https://github.com/YaoFANGUK/video-subtitle-extractor/releases/tag/2.2.0
[fw-gui]: https://github.com/CheshireCC/faster-whisper-GUI
[fw-gui-release]: https://github.com/CheshireCC/faster-whisper-GUI/releases/tag/0.8.5
[aegisub-tags]: https://aegisub.org/docs/latest/ass_tags/
[vc-release]: https://github.com/WEIFENG2333/VideoCaptioner/releases/tag/v1.4.2
[vc-readme]: https://github.com/WEIFENG2333/VideoCaptioner/blob/v1.4.2/README.md
[vc-llm]: https://weifeng2333.github.io/VideoCaptioner/config/llm
[vc-config]: https://github.com/WEIFENG2333/VideoCaptioner/blob/v1.4.2/videocaptioner/ui/common/config.py
[vc-formats]: https://github.com/WEIFENG2333/VideoCaptioner/blob/v1.4.2/videocaptioner/core/entities.py
[vc-data]: https://github.com/WEIFENG2333/VideoCaptioner/blob/v1.4.2/videocaptioner/core/asr/asr_data.py
[vc-pipeline]: https://github.com/WEIFENG2333/VideoCaptioner/blob/v1.4.2/videocaptioner/ui/thread/subtitle_thread.py
[linguagacha]: https://github.com/neavo/LinguaGacha/blob/MANUAL_BUILD_v0.127.1/README.md
[linguagacha-release]: https://github.com/neavo/LinguaGacha/releases/tag/MANUAL_BUILD_v0.127.1
[linguagacha-glossary]: https://github.com/neavo/LinguaGacha/wiki/Glossary
[linguagacha-ass]: https://github.com/neavo/LinguaGacha/blob/MANUAL_BUILD_v0.127.1/src/backend/file/subtitle/ass-ssa-format.ts
