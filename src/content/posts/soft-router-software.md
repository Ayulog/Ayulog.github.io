---
title: 软路由系统与插件清单
description: OpenWrt、iStoreOS 的系统资料、设备与常用插件。
author: Ayulog
pubDatetime: "2026-10-10T00:00:00+08:00"
modDatetime: "2026-10-11T00:00:00+08:00"
draft: false
category: network
tags:
  - 软路由
  - OpenWrt
  - iStoreOS
  - 家庭网络
  - 软件清单
---

软路由先确定设备和它在网络里的位置，再选系统、接线配网和安装插件。OpenWrt 与 iStoreOS 的操作各自成篇，这里是系统、设备和插件的入口。

## 流程概览

1. **核对设备。** 确认型号、硬件版本、CPU 架构与系统支持范围，再准备固件；设备资料见下方清单。
2. **准备安装与恢复。** 按对应系统教程备份已有配置，确认刷写或虚拟机安装方式。
3. **接线和配网。** 分清主路由、二级路由或旁路由用途，核对 WAN、LAN、地址、网关和 DHCP。
4. **逐项加入功能。** 基础上网可用后，再设置 Wi-Fi 或安装所需插件；插件包要与固件和架构匹配。
5. **验证并留存配置。** 按实际网络检查客户端联网、DNS 和管理入口，记录修改与排错结果。

## 教程入口

| 选择的系统 | 独立教程                                                  | 主要内容                                             |
| ---------- | --------------------------------------------------------- | ---------------------------------------------------- |
| OpenWrt    | [路由器配网与插件笔记](/posts/openwrt-guide/)  | 固件与备份、LuCI 配网、Wi-Fi、插件和排错             |
| iStoreOS   | [安装、配网与插件笔记](/posts/istoreos-guide/) | 网络向导、二级路由与旁路由、绿联虚拟机和 iStore 插件 |

## 路由系统

- **[OpenWrt](https://openwrt.org/)**：可配置路由、防火墙、无线和软件包的 Linux 系统。刷机前先查 [设备表](https://openwrt.org/toh/start)，确认型号与硬件版本。
- **[iStoreOS](https://www.istoreos.com/)**：基于 OpenWrt，提供网络向导和软件中心。[官方文档](https://doc.istoreos.com/zh/guide/istoreos/)里有设备支持、安装与配网说明。

<span id="配网与使用笔记"></span>

具体操作见上方 [教程入口](#教程入口)。接线、地址与插件配置跟随所选系统，不混用不同系统或版本的截图与参数。

## 插件

- **[Are-u-ok](https://github.com/AUK9527/Are-u-ok/tree/main/apps)**：iStore 第三方插件包。下载前核对固件和 CPU 架构。

## 设备与社区资料

- **[恩山无线论坛](https://www.right.com.cn/forum/index.php)**：固件、设备和网络配置讨论。
- **[acwifi](https://www.acwifi.net/)**：路由器拆机、评测和选购资料。

NAS 上的网络服务和容器部署见 [NAS 服务清单](/posts/nas-software-websites/)。
