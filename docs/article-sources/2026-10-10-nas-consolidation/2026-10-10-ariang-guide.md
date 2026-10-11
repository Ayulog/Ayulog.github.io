---
title: AriaNg：连接 Aria2 与发送下载任务
description: 配置 AriaNg 的 RPC 地址和密钥，设置下载目录，再通过浏览器扩展或 AList 把下载任务交给 Aria2。
author: Ayulog
pubDatetime: "2026-10-10T14:15:00+08:00"
draft: true
setupCategory: debian
tags:
  - AriaNg
  - Aria2
  - Debian
  - 下载器
  - AList
---

AriaNg 是 Aria2 的网页管理界面，本身不下载文件。先运行 Aria2，再把前端连到它的 RPC 接口，才能看到任务和速度。

这里接着 [Aria2 Docker 部署](/posts/2026-10-10-aria2-guide/)使用：镜像已经包含 AriaNg，网页映射为 `18080`，RPC 映射为 `16800`。如果使用现有 Aria2 服务，替换为自己的地址、端口和密钥即可。

## 连接 RPC

打开 `http://NAS_IP:18080`，在 **AriaNg 设置 → RPC** 中填写：

| 字段     | 本文示例                           |
| -------- | ---------------------------------- |
| 协议     | HTTP                               |
| 主机地址 | NAS 局域网 IP，不含 `http://`      |
| 端口     | `16800`                            |
| 接口路径 | `jsonrpc`，组成地址后为 `/jsonrpc` |
| RPC 密钥 | `.env` 中 `ARIA2_SECRET` 的原始值  |

密钥不加引号或 `token:` 前缀，前端会处理请求格式。看到已连接状态后，再检查全局速度和任务列表。

**RPC 请求由浏览器发出**。电脑浏览器里的 `127.0.0.1` 指向电脑，Docker 服务名 `aria2` 通常也不能由局域网浏览器解析。更换电脑或浏览器后，可能需要重新保存连接信息。

如果使用 HTTPS 域名打开 AriaNg，RPC 也应提供浏览器允许的安全连接，例如正确配置的 HTTPS / WSS 代理；HTTPS 页面直接调用 HTTP RPC 可能被混合内容策略拦截。

在 **Aria2 设置 → 基本设置** 中，把下载目录设为 `/downloads`，或任务需要的 `/downloads/software` 等子目录。这是容器路径，不填 NAS 原始路径或电脑盘符。先下载一个有权访问的小文件，确认能在 NAS 找到，再增加大任务。

## 添加任务

新建任务时粘贴真实文件直链或 `magnet:` 链接，种子文件通过打开 `.torrent` 添加。核对保存路径与文件选择，完成后在 NAS 上检查结果。网页或网盘分享页面通常不是实际下载地址，需要认证的资源还可能要求 Cookie、Referer 等请求头。

磁力链接需要先取得元数据；没有进度时检查在线节点、DHT 和 Tracker，不必反复修改网页设置。Aria2 的端口、预分配与配置持久化见[后端设置](/posts/2026-10-10-aria2-guide/)。

## 浏览器扩展发送下载

[Aria2 Explorer][explorer-repo] 可把浏览器下载交给 Aria2，并提供内置 AriaNg。安装入口使用项目 README 中的 Chrome / Edge 官方商店链接。

1. 添加 RPC 服务 `http://NAS_IP:16800/jsonrpc`，填入同一密钥。
2. 先手工发送或右键提交一个小文件，核对 NAS 中的结果。
3. 有需要再开启自动接管，并配置域名、文件类型等过滤条件。

扩展可能需要把下载请求的 Cookie 交给 Aria2。只连接自己信任的服务，包含凭据的配置不要公开分享。

## 通过 AList 下载网盘文件

AList 已能正常浏览和下载文件时，可提供可用地址并把任务交给 Aria2。按 [AList 前端设置文档][alist-settings]：

1. 在文件列表右下角设置中填写 Aria2 RPC 链接 `http://NAS_IP:16800/jsonrpc` 和密钥。
2. 开启复选框，选择文件或文件夹，在下载菜单中选择 **发送到 Aria2**。
3. 回 AriaNg 查看任务，完成后在 NAS 核对文件。

这会把网盘已有文件下载到 Aria2 所在设备。“发送成功”只表示提交成功；实际下载还受地址过期、认证头、出口 IP 和网盘限流影响，先测试单个文件。

AList 后台的[离线下载][alist-offline]是另一条流程：提交外部链接，先下载到临时目录，再转移到选定存储。它需要 AList 读取下载结果，并正确共享临时目录和权限，不能只填写 RPC 就认为配置完成。本文这里只配置文件列表的“发送到 Aria2”。网盘挂载与管理继续参考[AList 设置](/posts/2026-10-10-alist-guide/)。

## 连接问题

| 现象                         | 检查位置                                               |
| ---------------------------- | ------------------------------------------------------ |
| 网页打不开                   | Web 端口、容器状态、防火墙和 18080:8080 映射           |
| 页面正常但未连接             | NAS 地址、16800、jsonrpc 路径和原始密钥                |
| HTTPS 页面连接失败           | RPC 是否提供 HTTPS / WSS，是否被混合内容策略拦截       |
| 换浏览器后任务不见           | 当前 RPC 配置是否仍连接同一后端                        |
| 完成后找不到文件             | Aria2 的容器路径和 /downloads 挂载，不是浏览器电脑目录 |
| AList 显示发送成功但下载失败 | Aria2 任务错误、地址时效、认证头和来源 IP              |

## 参考资料

- [AriaNg 项目][ariang-repo]与 [Aria2 RPC 手册][aria2-manual]。
- [Aria2 Explorer][explorer-repo]。
- AList：[其他设置][alist-settings]与[离线下载][alist-offline]。

[aria2-manual]: https://aria2.github.io/manual/en/html/aria2c.html
[ariang-repo]: https://github.com/mayswind/AriaNg
[explorer-repo]: https://github.com/alexhua/Aria2-Explorer
[alist-settings]: https://alistgo.com/zh/config/other.html
[alist-offline]: https://alistgo.com/zh/guide/advanced/offline-download.html
