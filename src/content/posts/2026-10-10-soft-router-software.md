---
title: 软路由常用软件记录
description: OpenWrt、iStoreOS、插件和路由器资料入口，附配网与使用笔记。
author: Ayulog
pubDatetime: "2026-10-10T00:00:00+08:00"
draft: false
setupCategory: soft-router
setupRole: overview
tags:
  - 软路由
  - OpenWrt
  - iStoreOS
  - 家庭网络
  - 软件清单
---

路由系统、插件和设备资料放在这里。具体接线、配网和排错另写成篇，方便以后翻查。

## 路由系统

- **[OpenWrt](https://openwrt.org/)**：可配置路由、防火墙、无线和软件包的 Linux 系统。刷机前先查 [设备表](https://openwrt.org/toh/start)，确认型号与硬件版本。
- **[iStoreOS](https://www.istoreos.com/)**：基于 OpenWrt，提供网络向导和软件中心。[官方文档](https://doc.istoreos.com/zh/guide/istoreos/)里有设备支持、安装与配网说明。

## 配网与使用笔记

- [OpenWrt：路由器配网与插件笔记](/posts/2026-10-09-openwrt-guide/)：固件与备份、LuCI 配网、Wi-Fi、插件和排错。
- [iStoreOS：安装、配网与插件笔记](/posts/2026-10-10-istoreos-guide/)：网络向导、二级路由与旁路由、绿联虚拟机和 iStore 插件。

## 插件

- **[Are-u-ok](https://github.com/AUK9527/Are-u-ok/tree/main/apps)**：iStore 第三方插件包。下载前核对固件和 CPU 架构。

## 设备与社区资料

- **[恩山无线论坛](https://www.right.com.cn/forum/index.php)**：固件、设备和网络配置讨论。
- **[acwifi](https://www.acwifi.net/)**：路由器拆机、评测和选购资料。

NAS 上的网络服务和容器部署见 [NAS 常用软件记录](/posts/2026-10-09-nas-software-websites/)。
