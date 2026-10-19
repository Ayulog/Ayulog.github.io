---
title: 软路由系统与插件清单
description: 软路由从设备、系统到配网和插件的顺序，附 OpenWrt 与 iStoreOS 的资料入口。
author: Ayulog
pubDatetime: "2026-10-10T00:00:00+08:00"
modDatetime: "2026-10-17T21:00:00+08:00"
draft: false
category: network
tags:
  - OpenWrt
  - iStoreOS
---

折腾软路由或刷机路由时，通常按“确认硬件与网络角色 → 刷入系统与备份 → 接线配网 → 按需安装插件”的顺序推进。本文汇总常用的路由系统、插件仓库与硬件检索入口。

## 配置流程概览

1. **核对设备与架构**：确认完整型号、硬件修订版、CPU 架构与网口数量，查阅支持列表后再下载对应固件。
2. **备份与准备恢复方案**：导出原系统配置，离线保存当前机型的救砖说明与恢复镜像。
3. **接线与基础配网**：明确主路由、二级路由或旁路由拓扑，配好 WAN、LAN、网关与 DHCP 并验证基础联网。
4. **按需安装插件**：基础网络稳定后再配置 Wi-Fi 或安装插件，确认插件包与固件分支及 CPU 架构一致。

<span id="教程入口"></span>
<span id="配网与使用笔记"></span>

## 路由系统与配网笔记

| 系统     | 官网与文档                                                                                               | 站内配网笔记                                   | 主要内容                                             |
| -------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------- |
| OpenWrt  | [OpenWrt 官网](https://openwrt.org/) · [设备支持表](https://openwrt.org/toh/start)                       | [路由器配网与插件笔记](/posts/openwrt-guide/)  | 固件区分与备份、LuCI 二级路由配网、Wi-Fi、插件与排错 |
| iStoreOS | [iStoreOS 官网](https://www.istoreos.com/) · [快速上手文档](https://doc.istoreos.com/zh/guide/istoreos/) | [安装、配网与插件笔记](/posts/istoreos-guide/) | 网络向导、二级路由与旁路由、绿联虚拟机及 iStore 插件 |

## 插件与硬件社区资料

- **[Are-u-ok](https://github.com/AUK9527/Are-u-ok/tree/main/apps)**：面向 iStoreOS / OpenWrt 的第三方插件仓库，下载前需按固件版本和 CPU 架构进入对应目录。
- **[恩山无线论坛](https://www.right.com.cn/forum/index.php)**：路由器刷机、第三方固件发布、硬件改装与网络排错讨论社区。
- **[acwifi](https://www.acwifi.net/)**：路由器拆机、功放芯片分析、无线吞吐测试与选购参考。

NAS 上的容器代理与远程访问工具另见 [NAS 服务清单](/posts/nas-software-websites/)。
