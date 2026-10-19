---
title: AI 字幕：图形识别、硬字幕提取与翻译校对
description: 把图形或画面里的字幕识别成文本，再用大模型或机器翻译出译稿，并逐条校对时间轴。
author: Ayulog
pubDatetime: "2026-10-11T13:00:00+08:00"
draft: false
category: subtitles
tags:
  - SUP
  - OCR
---

没有现成的中文字幕时，通常先从原盘图形轨、画面硬字幕或原声音轨中提取出带时间轴的原文 SRT，校对无误后再交由大模型或翻译工具生成译稿，最后回填到 Aegisub 完成排版。

完整字幕制作规范见[字幕处理教程：从来源核对到 ASS 与 SUP](/posts/subtitle-workflow/)；若仅需调整现有 SUP 图形字幕的时间偏移或位置，直接参考[SUP 图形字幕的修改方法](/posts/sup-subtitle-editing/)。

## 按手头素材选择起点

| 手头素材                            | 第一步提取方式                           | 常用工具                                        |
| ----------------------------------- | ---------------------------------------- | ----------------------------------------------- |
| 蓝光原盘、独立 SUP、MKV 中的 PGS 轨 | 提取图形字幕轨，再做图像 OCR             | DGDemuxGUI + Subtitle Edit（或命令行 PgsToSrt） |
| DVD VobSub、BDN XML 等图形字幕      | 直接导入图形字幕做 OCR                   | Subtitle Edit                                   |
| 压进视频画面的硬字幕                | 框选画面字幕区，检测文字起止时间并做 OCR | VideOCR、VSE（video-subtitle-extractor）        |
| 只有音视频、无任何字幕              | 语音识别（ASR）生成带时间轴的原文初稿    | faster-whisper-GUI、VideoCaptioner              |
| 已有外语 SRT / ASS / VTT            | 校对原文与断行后直接进入翻译环节         | VideoCaptioner、LinguaGacha、Subtitle Edit      |

凡是能分离出独立字幕轨的片源，优先提取原轨以保留精确的起止时间戳；只有当关闭播放器字幕选项后文字依然固定在画面上时，才需要走硬字幕画面 OCR。

## 阶段一：从图形字幕、硬字幕或音轨提取原文

### 1. 蓝光 PGS / SUP 图形字幕

#### 从蓝光原盘分流 SUP

先用 BDInfo 确认正片对应的 MPLS 播放列表、总时长与字幕轨道信息（区分普通对白、听障辅助 SDH、强制字幕与评论轨），再打开 **DGDemuxGUI** 提取（其他分流工具见[蓝光原盘 Remux](/posts/blu-ray-remux/#第二步选择提取路线)）：

1. 在 **Disk** 中选择蓝光原盘根目录，在 **Output folder** 中指定输出路径。
2. 在 **Playlists** 中选中正片对应的 `.mpls`，核对时长与章节数。
3. 在 **Streams** 列表中仅勾选目标 **PGS subtitles**，取消音视频轨道以加快提取速度。
4. 点击 **Demux** 导出 `.sup` 文件，随后用 Subtitle Edit 打开抽查片头、中段与片尾，确认轨道内容无误。

#### 方式 A：使用 Subtitle Edit 图形界面 OCR

打开 Subtitle Edit（下文按 v5.2.0 界面说明），通过 **File → Import → Image-based subtitle for OCR…** 或直接拖入 `.sup` 文件进入识别窗口：

1. **选择 OCR 引擎与语言**：英文等拉丁字母字幕可选用本地 **Tesseract**（按窗口提示下载对应语言包与拼写词典如 `en_US`）；若需识别复杂字形或中日韩文字，也可尝试 **PaddleOCR** 或联网的 **Google Lens** 模式（当前版本区分 Google Lens Sharp 与 Windows 专用的 Standalone 模式）。字体高度统一的图形轨还可使用基于字模训练的 **nOCR**。
2. **小段试跑与修正**：先点击 **Start OCR** 识别前几十条包含斜体、双行、人名和标点的字幕，对照右侧原图检查识别效果。
3. **局部重识别與导出**：若联网引擎中途限流报错，可右键选中缺失行执行 **OCR selected lines** 重新识别。全部确认后点击 **OK** 进入主界面，另存为 UTF-8 编码的 `ocr-draft.srt`。

#### 方式 B：使用 PgsToSrt 命令行批量识别

需要批量或脚本化识别 `.sup` 与 MKV 内封 PGS 轨时，可使用基于 LibSE 与 Tesseract 的命令行工具 [PgsToSrt][pgstosrt]（v1.4.8）：

1. 安装 **.NET 8 Runtime**，下载并解压 [PgsToSrt v1.4.8 发布包][pgstosrt-release]。
2. 从 [Tesseract tessdata 仓库][tessdata] 下载源语言训练数据（如英文 `eng.traineddata`），放入程序目录下的 `tessdata` 文件夹。
3. 在终端中指定输入文件、输出路径与语言代码运行识别：

```powershell
# 识别独立 .sup 文件
dotnet PgsToSrt.dll --input "source.eng.sup" --output "ocr-draft.eng.srt" --tesseractlanguage eng --tesseractdata "tessdata"

# 直接识别 MKV 内的 PGS 字幕轨（需先通过 mkvinfo 确认对应的轨道编号）
dotnet PgsToSrt.dll --input "source.mkv" --track 4 --output "ocr-draft.eng.srt" --tesseractlanguage eng --tesseractdata "tessdata"
```

### 2. 视频画面硬字幕提取

当字幕已经压入视频画面时，使用 VideOCR 或 VSE 框选字幕显示区域，通过帧间文本检测推算起止时间并识别文字。

#### 方式 A：VideOCR

从 [VideOCR 发布页][videocr-release]（v1.6.0）下载匹配系统与硬件的运行包（NVIDIA 显卡可选对应 CUDA 版本的 GPU 包，通用环境选 CPU 包）：

1. 导入视频，定位到包含常规单双行对白的片段，拖动裁剪框圈出底部字幕区域（上下略留边距，避开台标与常驻水印）。
2. 选择源语言与识别引擎：**PaddleOCR** 全程在本地检测并识别；**Google Lens** 在本地检测文字框后上传图片片段识别。
3. 先设置 1–2 分钟的起止时间点击 **Run**，检查生成的 SRT 是否漏掉短句、有无重复拆分或时间边界偏移（v1.6.0 支持保存 PaddleOCR 检测标注图以便排查漏检）。
4. 确认裁剪框和跳帧参数合适后，再执行全片提取。若片中存在顶部注释或排版位置变化，可分段调整裁剪框多次提取后合并。

#### 方式 B：VSE（video-subtitle-extractor）

从 [VSE 发布页][vse-release]（v2.2.0）获取安装包并按[项目说明][vse]准备本地模型（程序与视频路径尽量使用纯英文且不含空格，如 `D:/work/ep01.mp4`）：

1. 点击 **打开** 导入视频，拖动滑块框选字幕区域。
2. 选择字幕语言与识别模式（先用 **自动** 或 **快速** 模式测试短片段），点击 **运行**。
3. 导出生成的 `.srt` 文件，重点回看切镜处、淡入淡出字幕和连续相似句子的起止时间轴。

### 3. 纯音轨语音转写（ASR）

只有音视频、没有任何字幕时，可使用 [faster-whisper-GUI][fw-gui]（[v0.8.5 发布包][fw-gui-release] 需同时下载 `part1.exe` 与 `part2.rar` 放在同目录解压）在本地将语音转写为原文字幕：

1. 配置好 FFmpeg 路径并加载本地 faster-whisper 模型。
2. 导入音视频，指定原声语言，先以**转写原文**模式试跑 2 分钟片段。
3. 开启并调整 **VAD（语音活动检测）** 参数，防止背景配乐被误判为人声产生幻觉重复，或漏掉轻声对白。
4. 导出原文 SRT，对照原声修正专有名词、断句与起止时间，再进入翻译环节。

## 阶段二：校对原文与预处理换行

### 1. 修正 OCR / ASR 识别错误

将提取出的初稿导入 Subtitle Edit，结合原图（OCR 窗口支持 **Save all images with HTML index…** 导出图文对照表）或原片音视频进行校对：

- **形近字与符号**：重点排查英文 `I / l / 1`、`O / 0`、音乐符号 `♪`、引号以及双人对话行首的短横线 `- `（批量替换连字符时注意保留行首对话标记）。
- **专有名词**：确认无误的角色名、地名可加入用户词典（User dictionary）或名称列表（Names list），减少拼写检查误报。
- **时间边界复核**：硬字幕提取和语音转写生成的初稿需对照音频波形检查句子切分，补齐漏检的短促感叹词或画面字幕。

### 2. 处理听障标注与常规错误

- **清理听障辅助文本（SDH）**：若原字幕包含 `[DOOR SLAMS]`、`(sighs)` 或说话人前缀，而目标是制作纯对白字幕，可通过 **Tools → Remove text for hearing impaired…** 预览命中项并勾选清理。注意保留正常剧情所需的全大写招牌文字，以及代表画外音或强调语气的 `<i>…</i>` 斜体标签。
- **修复常规格式错误**：运行 **Tools → Fix common errors…**，先预览并修复多余空格、破损标签等明确格式问题；涉及合并短行、修改最短显示时长或重排断行的选项，需结合视频节奏逐项勾选。

### 3. 整理翻译前的折行副本

校对完成后，先保存一份 `proofread.srt` 原稿。若英文等原文字幕仅因单行宽度限制把同一句话硬折成两行，可在送交翻译工具前将其合并为单行完整句子，提升机器翻译与大模型理解句法结构的准确度。

例如在 Aegisub 中打开副本，通过 **编辑 → 搜索替换** 将单句内的硬换行 `\N` 替换为空格（关闭正则表达式，逐条或选中单人连续句子替换，保留双人对话的换行）：

```text
整理前：The train leaves\Nat six.
整理后：The train leaves at six.
```

按以下阶段命名并保留各步文件，方便随时回退核查：

- `source.sup`：原始图形字幕
- `ocr-draft.srt`：OCR / ASR 识别初稿
- `proofread.srt`：校对定稿的原文 SRT
- `translation.srt`：翻译并审校后的译稿
- `final.ass`：最终排版与特效工程

## 阶段三：用大模型或翻译工具生成译稿

根据字幕体量与术语一致性要求，可从以下三种翻译方式中选择一种。全片开译前，先挑包含角色称谓、短句问答和特殊格式的 30–50 条字幕试译，确认不漏行、不乱轴后再跑完全片。

| 适用场景                                 | 推荐工具 / 方式                      | 核心关注点                             |
| ---------------------------------------- | ------------------------------------ | -------------------------------------- |
| 调用大模型快速翻译 SRT，导出单语或双语稿 | VideoCaptioner（卡卡字幕助手）       | 关闭自动重断句、控制并发线程、核对行数 |
| 剧集或多角色电影，需自动提取并维护术语表 | LinguaGacha                          | 术语表审核、上下文一致性、ASS 标签保留 |
| 调用传统机器翻译 API，或逐行双栏人工精翻 | Subtitle Edit（自动翻译 / 对照模式） | 接口凭据配置、结合上下文补全短句主语   |

### 方案一：VideoCaptioner（卡卡字幕助手）批量翻译 SRT

从 [VideoCaptioner 发布页][vc-release]（下文按 v1.4.2 说明）下载程序，打开 **设置 → LLM 配置**：

1. **配置兼容接口**：填入服务商（如 DeepSeek、SiliconCloud）或本地推理服务（Ollama、LM Studio）提供的 OpenAI 兼容 **API Base URL**、**API Key** 与模型名称，点击 **检查连接** 确认通信正常。
2. **调整字幕优化与翻译参数**：切换到 **字幕优化与翻译** 页面，针对已校对好的句子级 SRT 按下表设置：

| 设置项          | 建议配置                                                                                                                              |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 翻译服务        | 选择 **LLM 大模型翻译**，目标语言设为 **简体中文**                                                                                    |
| 字幕翻译        | **开启**                                                                                                                              |
| 字幕校正 / 优化 | **关闭**（原文已在上一阶段人工校对完毕，避免模型擅自改写原文）                                                                        |
| 字幕分割        | **关闭**（保持已校对的条目数量与时间轴，不主动重新断句）                                                                              |
| 反思翻译        | 先关闭跑出初稿，按需在小片段上对比开启后的译文流畅度与耗时                                                                            |
| 批处理与线程数  | 批处理大小可保持默认 `10`；并发线程数建议从 **1–3** 起步，视接口限流逐步调高（软件上限为 50），避免高并发触发 `429 Too Many Requests` |

3. **填写文稿提示（Prompt）**：在提示框中简要列出已确认的人名、地名译法与语气要求，无需粘贴冗长的剧情梗概：

```text
请翻译成自然流畅的简体中文影视字幕，保持原文的语气、否定与指代关系。
固定译名：Alice → 艾丽丝；Harbor Station → 港口站。
前后称谓保持一致，不要添加原文没有的解释。
```

4. **导入翻译并导出**：拖入整理好的 SRT，核对识别出的时间码与原文行数，点击 **开始**。翻译完成后通过 **保存** 菜单导出（审校阶段可导出“原文在上”或“译文在上”的双语 SRT，定稿单语时再导出“仅译文”）。

_注意：VideoCaptioner v1.4.2 在导入 ASS 时会剥离 `{…}` 行内覆盖标签，导出时也会重建样式表，且默认会清理中文行末的句号与逗号。因此建议统一用纯文本 **SRT** 作为该工具的翻译中间稿；若原工程是带特效的 ASS，先导出纯对白副本翻译，审校后再回填至原 ASS 工程。_

### 方案二：LinguaGacha 术语表提取与项目化审校

[LinguaGacha][linguagacha]（下文按 [v0.127.1][linguagacha-release] 说明）支持 SRT、ASS、SSA、VTT、LRC 格式，适合需要先提取全片专有名词、统一角色译名与性别称谓后再全文翻译的项目：

1. **创建工程与模型连接**：解压运行 `app.exe`，将字幕副本拖入窗口建立 `.lg` 工程，在 **基础设置** 中设定源语言与目标语言。随后在 **模型管理** 中配置在线或本地兼容接口并测试连接，在 **AGENT** 页面选定所用模型。
2. **提取并审核术语表**：在 **AGENT** 页面运行 **术语提取**，完成后打开 **术语表** 检查候选词条。修正角色名、地名与机构译法，并在“描述”栏补充角色性别、身份或称呼关系（如“男主角，对长辈使用敬称”），删除被误判为专名的普通词汇。
3. **全文翻译与审校导出**：依次运行 **全文翻译** 与 **自动审校**，对未译行或语境存疑的对白人工微调，最后点击 **生成译文**（输出文件保存在 `.lg` 同级目录的 `{工程名}_译文` 文件夹下）。

对于 ASS 字幕，LinguaGacha v0.127.1 只提取 `Dialogue` 行的 `Text` 文本字段送译，保留图层、起止时间、样式名等其余字段。普通带基础标签的 ASS 可先抽样测试导出效果；包含逐字卡拉 OK、矢量绘图或复杂动态定位的特效行，仍建议单独剥离纯对白翻译后回填。

### 方案三：Subtitle Edit 自动翻译与双栏人工对照

如果不使用大模型，可在 Subtitle Edit 中直接调用传统翻译接口或建立双栏对照表人工精翻：

- **调用传统机器翻译或自建服务**：打开校对后的 SRT 副本，进入 **Translate → Auto-translate…**，选择 Google Cloud Translation V2、Microsoft Translator、DeepL V2（需填入对应 API Key）或本地自建的 LibreTranslate 实例，翻译后在预览表中逐行核对并另存。
- **建立空白双栏对照表（适合人工精翻或局部修润）**：打开原文字幕，点击 **Tools → Make new empty translation from current subtitle**。软件会将原文固定在右侧 **Original text** 列，左侧 **Text** 列留空供逐条输入译文，完整保留原时间码与行序。遇到疑难长句需借助外部工具探讨译法时，可复制相邻几句上下文询问，确认后再将纯文本填回对应行。

## 阶段四：译后双语审校与 ASS 排版

机翻或初译完成后，在 Subtitle Edit 或 Aegisub 中同时加载译稿、原文与原片视频，逐条完成终审：

- **核对语意与指代**：检查省略主语的短句、反问句、否定词、数字单位及双关语是否准确，修正脱离画面语境的生硬直译。
- **核对专名与前后呼应**：确认全片人名、地名、头衔及角色间的称呼（“你 / 您”等）前后统一。
- **检查条目对应与断行**：确认总行数、时间码与原文严格对应，没有串行或漏译；将过长的译句按语法停顿拆分为上下两行，确保在画面停留时间内能舒适读完。

文字与时间轴彻底定稿后，导入 Aegisub 设置中英双语样式、画面注释避让与动态特效，详见[基于 Aegisub 的 ASS 特效字幕制作教程](/posts/aegisub-ass-effects/)。若使用了 VSFilterMod 扩展标签并准备外挂播放，可按 [PotPlayer 和 MPC-HC 挂载 VSFilterMod 加载外挂特效字幕](/posts/vsfiltermod-external-subtitles/) 配置播放环境。

## 参考资料

- [DGDemux 项目页][dgdemux]：蓝光原盘播放列表与 PGS 字幕轨分流工具。
- [Subtitle Edit OCR 文档][se-ocr]、[自动翻译][se-auto-translate]与[双栏对照翻译模式][se-translation]（核对版本 [v5.2.0][se-release]）。
- [PgsToSrt v1.4.8 文档][pgstosrt]（[发布页][pgstosrt-release]）与 [Tesseract tessdata 语言包仓库][tessdata]：命令行 SUP / MKV PGS 识别。
- [VideOCR v1.6.0 文档][videocr]（[发布页][videocr-release]）与 [VSE 2.2.0 文档][vse]（[发布页][vse-release]）：视频画面硬字幕提取。
- [faster-whisper-GUI 仓库][fw-gui]（[v0.8.5 发布页][fw-gui-release]）：本地语音识别转写字幕。
- [VideoCaptioner v1.4.2 发布页][vc-release]、[项目说明][vc-readme]与 [LLM 配置文档][vc-llm]（源码参考：[并发配置][vc-config] · [字幕格式][vc-formats] · [解析导出][vc-data] · [处理管线][vc-pipeline]）。
- [LinguaGacha v0.127.1 说明][linguagacha]（[发布页][linguagacha-release] · [术语表 Wiki][linguagacha-glossary] · [ASS 解析源码][linguagacha-ass]）。
- [Aegisub ASS 标签手册][aegisub-tags]：换行符与覆盖标签说明。

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
