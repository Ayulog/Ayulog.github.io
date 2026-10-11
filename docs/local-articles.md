# 本地文章清单

截至 **2026 年 10 月 11 日**，共 **69 篇文章**：58 篇 frontmatter 非草稿、11 篇草稿。状态来自本地 frontmatter，不代表线上已经部署。

每个类目固定一篇总篇，汇总整体流程、软件分工、子篇教程入口与参考资料；子篇围绕一个具体流程、软件或问题展开。一篇文章只放在一个主分类，跨类内容通过文章链接引用。运行 pnpm dev:all 可查看含草稿的完整目录；普通开发和生产构建会过滤草稿，Pagefind 使用正式构建的搜索索引。

本轮整理保留文章文件名和公开地址，主要调整总篇结构、补齐全部子篇入口，并将《字幕处理教程》归入字幕类。Docker 管理、IPTV、蓝光 DIY 和压制学习分别收敛为具体流程子篇；游戏类当前没有独立子篇。

历史原稿见[路由器拆分前原稿](article-sources/2026-10-10-router-split/README.md)、[NAS 合并前原稿](article-sources/2026-10-10-nas-consolidation/README.md)、[重组前原稿](article-sources/2026-10-10-reorganization/README.md)和[原稿材料](article-sources/2026-10-10/README.md)。这些快照不参与站点内容和搜索索引生成。

| 类目 | 总篇 | 子篇 | 合计 |
| --- | ---: | ---: | ---: |
| Windows | 1 | 3 | 4 |
| 游戏 | 1 | 0 | 1 |
| NAS | 1 | 29 | 30 |
| 软路由 | 1 | 2 | 3 |
| PT | 1 | 6 | 7 |
| 字幕 | 1 | 6 | 7 |
| 音频 | 1 | 2 | 3 |
| DIY | 1 | 7 | 8 |
| 压制 | 1 | 5 | 6 |

## Windows

| 文章 | 类型 | 状态 |
| --- | --- | --- |
| [Windows 总篇：流程、软件与教程](../src/content/posts/2026-10-09-windows-software.md) | 总篇 | 非草稿 |
| [Windows 设置程序开机自启动的几种方法](../src/content/posts/2026-10-09-windows-app-startup.md) | 子篇 | 非草稿 |
| [为 Windows RDP 配置 TLS](../src/content/posts/2026-10-09-windows-rdp-tls.md) | 子篇 | 非草稿 |
| [Windows 容器：WSL、Docker Desktop 与独立 Engine](../src/content/posts/2026-10-10-windows-containers.md) | 子篇 | 非草稿 |

## 游戏

| 文章 | 类型 | 状态 |
| --- | --- | --- |
| [游戏总篇：流程、软件与教程](../src/content/posts/2026-10-11-game-software.md) | 总篇 | 非草稿 |

## NAS

| 文章 | 类型 | 状态 |
| --- | --- | --- |
| [NAS 总篇：流程、软件与教程](../src/content/posts/2026-10-09-nas-software-websites.md) | 总篇 | 非草稿 |
| [CookieCloud：同步浏览器 Cookie，配合 MoviePilot 管理站点](../src/content/posts/2026-10-09-cookiecloud-moviepilot.md) | 子篇 | 非草稿 |
| [DebNAS 安装：系统初始化、磁盘共享与验收](../src/content/posts/2026-10-09-debnas-installation-notes.md) | 子篇 | 非草稿 |
| [DebNAS 自动观影流程](../src/content/posts/2026-10-09-debnas-media-workflow.md) | 子篇 | 非草稿 |
| [Mihomo：Docker 部署、订阅与分流设置](../src/content/posts/2026-10-09-mihomo-docker.md) | 子篇 | 非草稿 |
| [NAS 远程访问：网络条件与方案选择](../src/content/posts/2026-10-09-nas-remote-access.md) | 子篇 | 非草稿 |
| [1Panel：直接安装与 Docker 部署](../src/content/posts/2026-10-10-1panel-guide.md) | 子篇 | 非草稿 |
| [AList：Docker 部署、WebDAV 与路径权限](../src/content/posts/2026-10-10-alist-guide.md) | 子篇 | 非草稿 |
| [Aria2 与 AriaNg：Docker 部署与下载设置](../src/content/posts/2026-10-10-aria2-guide.md) | 子篇 | 非草稿 |
| [Cloud Media Sync：同步 115 媒体库与 Emby 302 播放](../src/content/posts/2026-10-10-cloud-media-sync.md) | 子篇 | 非草稿 |
| [CloudDrive2：网盘挂载、目录共享与缓存](../src/content/posts/2026-10-10-cloud-storage-local-mount.md) | 子篇 | 非草稿 |
| [ddns-go：自动更新域名的 IP 地址](../src/content/posts/2026-10-10-ddns-go-guide.md) | 子篇 | 非草稿 |
| [Docker 应用维护：迁移、更新与备份](../src/content/posts/2026-10-10-docker-management.md) | 子篇 | 非草稿 |
| [Docker 镜像加速源教程](../src/content/posts/2026-10-10-docker-registry-mirrors.md) | 子篇 | 非草稿 |
| [DockerCopilot：容器更新与配置备份](../src/content/posts/2026-10-10-dockercopilot.md) | 子篇 | 非草稿 |
| [Dockge：用网页管理 Compose 项目](../src/content/posts/2026-10-10-dockge-guide.md) | 子篇 | 非草稿 |
| [Emby：Docker 部署、媒体库与客户端设置](../src/content/posts/2026-10-10-emby-guide.md) | 子篇 | 非草稿 |
| [IPTV：在 NAS 上部署 Allinone 与直播源整理服务](../src/content/posts/2026-10-10-iptv-guide.md) | 子篇 | 非草稿 |
| [Jellyfin：Docker 部署与硬件转码设置](../src/content/posts/2026-10-10-jellyfin-guide.md) | 子篇 | 非草稿 |
| [Lucky：DDNS、证书与反向代理](../src/content/posts/2026-10-10-lucky-guide.md) | 子篇 | 非草稿 |
| [影视资源命名：发布名、入库名与字幕](../src/content/posts/2026-10-10-media-resource-naming.md) | 子篇 | 非草稿 |
| [MoviePilot：从部署到订阅、整理与进阶配置](../src/content/posts/2026-10-10-moviepilot-guide.md) | 子篇 | 非草稿 |
| [MT Photos：Docker 安装与照片目录](../src/content/posts/2026-10-10-mt-photos-guide.md) | 子篇 | 非草稿 |
| [Plex：Docker 部署、媒体库与远程播放](../src/content/posts/2026-10-10-plex-guide.md) | 子篇 | 非草稿 |
| [Portainer CE：安装与日常管理](../src/content/posts/2026-10-10-portainer-guide.md) | 子篇 | 非草稿 |
| [v2rayA：Docker 部署与应用代理设置](../src/content/posts/2026-10-10-v2raya-guide.md) | 子篇 | 非草稿 |
| [TMDB 代理：Vercel 部署与媒体软件设置](../src/content/posts/2026-10-10-vercel-tmdb-proxy.md) | 子篇 | 非草稿 |
| [Watchtower：检查镜像更新与维护旧部署](../src/content/posts/2026-10-10-watchtower-guide.md) | 子篇 | 非草稿 |
| [IPTVindex：找直播源、接入播放器与节目单](../src/content/posts/2026-10-11-iptv-index.md) | 子篇 | 草稿 |
| [qiandao：部署与签到任务](../src/content/posts/qiandao-docker-guide.md) | 子篇 | 非草稿 |

## 软路由

| 文章 | 类型 | 状态 |
| --- | --- | --- |
| [软路由总篇：流程、软件与教程](../src/content/posts/2026-10-10-soft-router-software.md) | 总篇 | 非草稿 |
| [OpenWrt：路由器配网与插件笔记](../src/content/posts/2026-10-09-openwrt-guide.md) | 子篇 | 非草稿 |
| [iStoreOS：安装、配网与插件笔记](../src/content/posts/2026-10-10-istoreos-guide.md) | 子篇 | 非草稿 |

## PT

| 文章 | 类型 | 状态 |
| --- | --- | --- |
| [PT 总篇：流程、软件与教程](../src/content/posts/2026-10-09-pt-software.md) | 总篇 | 非草稿 |
| [PT Seedbox：选机、安装与做种](../src/content/posts/2026-10-09-pt-seedbox-guide.md) | 子篇 | 非草稿 |
| [IYUUPlus：自动辅种与下载器转种](../src/content/posts/2026-10-10-iyuuplus-docker-guide.md) | 子篇 | 非草稿 |
| [下载目录与做种常识](../src/content/posts/2026-10-10-nas-downloader.md) | 子篇 | 非草稿 |
| [qBittorrent 安装与设置](../src/content/posts/2026-10-10-qbittorrent-guide.md) | 子篇 | 非草稿 |
| [Transmission 安装与设置](../src/content/posts/2026-10-10-transmission-guide.md) | 子篇 | 非草稿 |
| [Vertex：下载器接入与 RSS 管理笔记](../src/content/posts/2026-10-10-vertex-guide.md) | 子篇 | 非草稿 |

## 字幕

| 文章 | 类型 | 状态 |
| --- | --- | --- |
| [字幕总篇：流程、软件与教程](../src/content/posts/2026-10-10-subtitle-software.md) | 总篇 | 非草稿 |
| [字幕处理教程：从来源核对到 ASS 与 SUP](../src/content/posts/2026-10-10-subtitle-workflow.md) | 子篇 | 非草稿 |
| [基于 Aegisub 的 ASS 特效字幕制作教程](../src/content/posts/2026-10-11-aegisub-ass-effects.md) | 子篇 | 草稿 |
| [AI 字幕：图形识别、硬字幕提取与翻译校对](../src/content/posts/2026-10-11-ai-subtitles.md) | 子篇 | 草稿 |
| [使用大金 Scenarist BD 制作特效字幕 SUP](../src/content/posts/2026-10-11-scenarist-bd-effects-sup.md) | 子篇 | 草稿 |
| [SUP 图形字幕的修改方法](../src/content/posts/2026-10-11-sup-subtitle-editing.md) | 子篇 | 草稿 |
| [PotPlayer 和 MPC-HC 挂载 VSFilterMod 加载外挂特效字幕](../src/content/posts/2026-10-11-vsfiltermod-external-subtitles.md) | 子篇 | 草稿 |

## 音频

| 文章 | 类型 | 状态 |
| --- | --- | --- |
| [音频总篇：流程、软件与教程](../src/content/posts/2026-10-10-audio-software.md) | 总篇 | 非草稿 |
| [音频处理篇：音轨识别、提取与编码](../src/content/posts/2026-10-11-audio-processing.md) | 子篇 | 非草稿 |
| [音频篇：频谱学习](../src/content/posts/2026-10-11-audio-spectrum-learning.md) | 子篇 | 草稿 |

## DIY

| 文章 | 类型 | 状态 |
| --- | --- | --- |
| [DIY 总篇：流程、软件与教程](../src/content/posts/2026-10-10-media-diy-software.md) | 总篇 | 非草稿 |
| [蓝光原盘 Remux](../src/content/posts/2026-10-10-blu-ray-remux.md) | 子篇 | 非草稿 |
| [章节的处理](../src/content/posts/2026-10-10-media-chapters.md) | 子篇 | 非草稿 |
| [认识蓝光碟片](../src/content/posts/2026-10-10-understanding-blu-ray.md) | 子篇 | 非草稿 |
| [认识 HDR](../src/content/posts/2026-10-10-understanding-hdr.md) | 子篇 | 非草稿 |
| [蓝光加字幕教程：从原盘检查到混流验收](../src/content/posts/2026-10-11-blu-ray-diy-workflow.md) | 子篇 | 草稿 |
| [蓝光原盘 DIY：tsMuxeR、BDFix Pro、KITe UHD 与大金](../src/content/posts/2026-10-11-blu-ray-diy.md) | 子篇 | 草稿 |
| [蓝光原盘菜单修改篇：IG 菜单与 BD-J 菜单](../src/content/posts/2026-10-11-blu-ray-menu-editing.md) | 子篇 | 草稿 |

## 压制

| 文章 | 类型 | 状态 |
| --- | --- | --- |
| [压制总篇：流程、软件与教程](../src/content/posts/2026-10-09-encode-software.md) | 总篇 | 非草稿 |
| [编码篇：x264、x265 与 AV1](../src/content/posts/2026-10-10-encode-codecs.md) | 子篇 | 非草稿 |
| [压制练习：从一段样片到文档查阅](../src/content/posts/2026-10-10-encode-learning.md) | 子篇 | 非草稿 |
| [一键压制篇：用图形工具完成一次转码](../src/content/posts/2026-10-10-encode-one-click.md) | 子篇 | 非草稿 |
| [VapourSynth 压制篇：环境、脚本与输出](../src/content/posts/2026-10-10-encode-vapoursynth.md) | 子篇 | 非草稿 |
| [HandBrake 与 ShanaEncoder：字幕校对用的快速压片教程](../src/content/posts/2026-10-11-handbrake-shanaencoder-subtitle-proxy.md) | 子篇 | 草稿 |
