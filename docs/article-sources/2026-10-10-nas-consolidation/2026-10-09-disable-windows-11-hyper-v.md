---
setupCategory: windows
setupRole: guide
title: 禁用 Windows 11 Hyper-V 虚拟机管理程序的方法
description: 以 VMware Workstation 的 ULM/CPL0 模式为背景，整理 Windows 11 Hyper-V 的状态检查、禁用、VBS 与 Credential Guard 排查，以及恢复 WSL 2 和安全功能的方法。
author: Ayulog
pubDatetime: "2026-10-09T17:10:00+08:00"
draft: true
tags:
  - Windows
  - 装机
  - 虚拟化
  - VMware
---

Windows 11 没有勾选 Hyper-V，VMware 仍可能通过 Windows 虚拟化平台运行。VBS、内存完整性等功能也会启动底层虚拟机管理程序。

需要让 VMware 改用自己的虚拟化引擎时，先检查运行状态，再修改启动项。每次重启后验证结果，生效就不用继续关其他功能。WSL 2、Windows 沙盒和 VBS 的影响及恢复方法见后文。

## 目录

- [先确认是否需要禁用](#先确认是否需要禁用)
- [第一步：查看当前状态](#第一步查看当前状态)
- [第二步：禁止当前启动项加载 Hyper-V](#第二步禁止当前启动项加载-hyper-v)
- [第三步：按需关闭相关 Windows 功能](#第三步按需关闭相关-windows-功能)
- [第四步：排查 VBS 与 Credential Guard](#第四步排查-vbs-与-credential-guard)
- [如何确认禁用成功](#如何确认禁用成功)
- [如何恢复原来的配置](#如何恢复原来的配置)
- [常见误区](#常见误区)
- [参考资料](#参考资料)

## 先确认是否需要禁用

VMware 并非一定要关闭 Hyper-V 才能运行。Workstation 从 **15.5.5** 起就加入了通过 Windows Hypervisor Platform 共存的支持，并不是到 17 才首次支持。是否需要禁用，要结合所用版本、虚拟机功能需求和实际运行情况判断。

在 Workstation 17 相关讨论中，常用虚拟机目录里的 `vmware.log` 判断运行模式：

- **ULM（User Level Monitor）**：使用与 Windows 虚拟化平台共存的运行路径。
- **CPL0**：VMware 使用自身虚拟化引擎的运行路径。

如果正在排查性能问题，或需要当前共存模式不支持的嵌套虚拟化功能，可以切换后用相同虚拟机和任务做对比。看到 ULM 本身不代表故障，也不能据此推断固定的性能损失比例。

例如，Broadcom 文档说明，宿主启用 Hyper-V 时，Workstation 虚拟机内的 VBS、WSL 2 等嵌套虚拟化用途存在限制；另有知识库专门记录 Windows 11 24H2 与 Workstation 17.x 组合下的性能问题。这些都需要结合具体版本判断。

禁用前需要了解几项影响：

- **WSL 2、Windows 沙盒和 Hyper-V 虚拟机**依赖 Windows 虚拟化平台，停用底层虚拟机管理程序后无法正常使用。采用 WSL 2 或 Hyper-V 后端的 Docker Desktop 也会受影响；WSL 1 使用不同架构。
- **内存完整性、Credential Guard 等 VBS 安全功能**依赖这层平台，禁用后相应保护无法运行。
- 修改启动配置前，记录原设置；如果电脑启用了 BitLocker 或设备加密，先确认能够取得恢复密钥，以便应对启动配置变化触发的恢复提示。

CPU 的 **Intel VT-x / AMD-V / SVM** 仍应保持开启，VMware 自身也需要硬件虚拟化能力。

## 第一步：查看当前状态

### 查看系统信息

按 `Win + R`，输入 `msinfo32`，回车，在“系统摘要”中查看以下内容：

- **是否出现检测到虚拟机监控程序的提示**。英文系统通常显示 `A hypervisor has been detected. Features required for Hyper-V will not be displayed.`。这表明当前系统检测到了正在运行的 hypervisor。
- **基于虚拟化的安全性**是否正在运行，以及“基于虚拟化的安全性服务正在运行”中列出了哪些功能。

这两个检查不是一回事：VBS 没有运行，不能单独证明 Hyper-V 底层已停止，其他虚拟化功能仍可能使用它。

### 进一步查看 VBS 状态

以管理员身份打开 PowerShell，执行只读查询：

```powershell
Get-CimInstance -Namespace "root\Microsoft\Windows\DeviceGuard" -ClassName Win32_DeviceGuard |
  Select-Object VirtualizationBasedSecurityStatus, SecurityServicesConfigured, SecurityServicesRunning
```

`VirtualizationBasedSecurityStatus` 的含义是：

| 值  | 含义                         |
| --- | ---------------------------- |
| `0` | VBS 未启用                   |
| `1` | VBS 已配置启用，但当前未运行 |
| `2` | VBS 已启用且正在运行         |

`SecurityServicesConfigured` 和 `SecurityServicesRunning` 是多值列表，分别表示配置与实际运行的安全功能。其中，`1` 表示 Credential Guard，`2` 表示内存完整性；例如 `{1, 2}` 代表两者，单独 `{2}` 不能理解成 Credential Guard 的“状态 2”。其他数值还可能对应 Secure Launch 等功能。

### 查看 VMware 日志

启动一次目标虚拟机，打开该虚拟机目录中本次运行生成的 `vmware.log`，搜索：

```text
Monitor Mode:
```

记录看到的是 `ULM` 还是 `CPL0`。不同版本的日志格式可能变化，后续对比要使用同一版本、本次新启动的日志，避免误读旧文件。

## 第二步：禁止当前启动项加载 Hyper-V

如果主要目的是切换 VMware 的运行模式，可以先通过启动配置禁止加载 Windows hypervisor，而不急着卸载所有相关功能。

以管理员身份打开 PowerShell 或命令提示符，先查看当前启动项，并保存输出：

```powershell
bcdedit.exe /enum "{current}"
```

然后执行：

```powershell
bcdedit.exe /set "{current}" hypervisorlaunchtype off
```

保存工作并**重启 Windows**，再检查系统信息和 VMware 的新日志。

这里的 `"{current}"` 指当前运行的 Windows 启动项，双引号也兼容 PowerShell 的参数解析。设置会持续生效，直到再次修改；命令不会立即卸载已经运行的 hypervisor，也不会卸载 Windows 功能。

如果重启后已经不再检测到 hypervisor，且 VMware 已按预期使用 CPL0 模式，就可以停止在这里。若仍在运行，再检查后面的功能和安全策略。

## 第三步：按需关闭相关 Windows 功能

对于准备停用 Windows 虚拟化组件的电脑，可以按 `Win + R` 输入 `optionalfeatures`，打开“启用或关闭 Windows 功能”。根据实际使用情况处理以下项目：

- **Hyper-V**：可展开到“Hyper-V 平台”，取消“Hyper-V 虚拟机监控程序”；如果整套功能都不再使用，也可以取消整个 Hyper-V 项。
- **虚拟机平台（Virtual Machine Platform）**：WSL 2 等功能使用的组件。
- **Windows 虚拟机监控程序平台（Windows Hypervisor Platform）**：向第三方虚拟化软件提供接口的组件。
- **Windows 沙盒（Windows Sandbox）**：不再使用时可以一并关闭。

名称可能随系统语言略有差异。有些 Windows 版本没有完整的 Hyper-V 功能项，不能因此认定系统没有使用 VBS 或底层虚拟化平台。

也可以在管理员 PowerShell 中，仅禁用 Hyper-V 的虚拟机监控程序组件：

```powershell
Disable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V-Hypervisor
```

图形界面与这条命令是针对该组件的替代操作，无需重复执行。如果系统没有这个可选功能，跳过即可。完成后按提示重启，再检查实际运行状态；只看复选框是否取消还不够。

## 第四步：排查 VBS 与 Credential Guard

这一部分用于处理仍在运行、或需要明确关闭配置的安全功能。不要仅因系统是 Windows 11，就假定每一项都已启用。

### 关闭内存完整性

打开：

**Windows 安全中心 → 设备安全性 → 内核隔离详细信息 → 内存完整性**

关闭开关并重启。内存完整性又称 HVCI，是使用 VBS 的一种功能；关闭它不等于 Credential Guard 等其他功能也已关闭。

如果开关由组织管理，或者关闭后又恢复，应检查实际生效的组策略、Intune 或 App Control 配置，从原配置来源调整。反复改本地值可能被管理策略覆盖。

### 检查启用 VBS 的组策略

具备本地组策略编辑器的版本，可以按 `Win + R` 输入 `gpedit.msc`，进入：

**计算机配置 → 管理模板 → 系统 → Device Guard → 启用基于虚拟化的安全性**

英文策略名是 `Turn On Virtualization Based Security`。如果 VBS 由这项策略启用、且没有 UEFI 锁，将其设为 **已禁用**，应用后重启。

“未配置”只表示该项策略没有明确设置，不能保证功能最终关闭。Windows 家庭版不提供本地组策略编辑器；受组织管理的设备则应调整实际生效的策略。

### Credential Guard：没有 UEFI 锁的情况

如果检查发现 Credential Guard 正在运行，先确定启用来源。通过组策略或 Intune 启用的，优先修改对应策略。

对于**没有 UEFI 锁、也不是通过组策略或 Intune 管理**的情况，微软提供了注册表关闭方法。先记录原值并备份相关键，然后在注册表编辑器中，将下面两处的 `LsaCfgFlags` 都设为 **DWORD（32 位）值 `0`**；不存在时按同名新建：

```text
HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\Lsa
    LsaCfgFlags = 0

HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Windows\DeviceGuard
    LsaCfgFlags = 0
```

这里的 `LsaCfgFlags` 是键下的值名。即使系统是 64 位，也使用 DWORD（32 位）。修改后重启并重新查询。

微软特别说明，单纯删除这些值不一定能关闭 Credential Guard，需要明确设置为 `0`。这一步只针对 Credential Guard，不能代替对整个 hypervisor 状态的验证。

### 已启用 UEFI 锁的情况

UEFI 锁属于特殊配置，不能套用普通注册表关闭方法：

- **Credential Guard 的 UEFI 锁**：配置保存在 EFI 固件变量中。微软的处理流程使用系统自带 `SecConfig.efi` 和一次性启动项清除相关变量，重启时需要有人在电脑前按提示确认。按[官方的 UEFI 锁解除流程](https://learn.microsoft.com/en-us/windows/security/identity-protection/credential-guard/configure#disable-credential-guard-with-uefi-lock)核对执行。
- **内存完整性的 UEFI 锁**：使用它对应的[配置与恢复文档](https://learn.microsoft.com/en-us/windows/security/hardware-security/enable-virtualization-based-protection-of-code-integrity)。该情况的恢复可能涉及 UEFI 中的 Secure Boot 设置，与 Credential Guard 的解除流程不能混用。

参考帖第三阶段使用了旧版 `DG_Readiness_Tool`。它可以作为历史排查线索，但涉及 EFI 变量、启动配置与脚本执行策略，不应作为每台 Windows 11 电脑都要执行的固定步骤。确认是哪一种锁之后，按当前官方文档处理。

## 如何确认禁用成功

完成修改后，用“重启”让启动配置重新生效，然后依次检查：

1. **系统信息**：物理机宿主系统不再出现检测到 hypervisor 的提示。
2. **VBS 状态**：确认相关安全功能是否仍在运行，区分“配置启用”与“实际运行”。如果只修改了启动加载开关，可能仍保留启用配置，但无法运行。
3. **VMware 日志**：关闭并重新启动目标虚拟机后，查看本次 `vmware.log` 中的运行模式；Workstation 17 场景下预期看到 `Monitor Mode: CPL0`。
4. **实际功能**：用原来的虚拟机任务验证性能或嵌套虚拟化需求是否得到改善。

任务管理器里 CPU 的“虚拟化：已启用”，通常是在说明固件提供了硬件虚拟化能力，不代表 Windows hypervisor 一定仍在运行。为了让 VMware 工作，这项硬件能力本来就应保留。

## 如何恢复原来的配置

如果只改过当前启动项的加载开关，以管理员身份执行：

```powershell
bcdedit.exe /set "{current}" hypervisorlaunchtype auto
```

然后重启。它只是恢复允许自动加载，不会重新安装已关闭的可选功能，也不会自动恢复被手动禁用的安全策略。

如果希望精确回到修改前的 BCD 状态，并且原先没有显式设置 `hypervisorlaunchtype`，可移除本次设置的覆盖值：

```powershell
bcdedit.exe /deletevalue "{current}" hypervisorlaunchtype
```

根据修改前记录，选择恢复 `auto` 或移除覆盖值，不需要把两条恢复命令都执行一遍。

其他配置按实际改动逐项恢复：

- **Windows 可选功能**：重新启用原先使用的虚拟机平台、Windows Hypervisor Platform、Hyper-V 或沙盒，再按提示重启。
- **内存完整性**：恢复原来的开关状态，处理驱动兼容性提示后重启检查。
- **组策略与 Intune**：恢复修改前的策略配置，并确认策略已生效。
- **Credential Guard 注册表值**：恢复先前记录的状态；`LsaCfgFlags = 1` 表示带 UEFI 锁启用，`2` 表示无锁启用，不要为了“恢复”就统一写成 `1`。已经解除 UEFI 锁的情况，按官方启用流程恢复所需配置。

最后再用 `msinfo32`、VBS 查询和实际应用验证。恢复 Windows hypervisor 后，VMware 重新使用 ULM 共存模式可能是预期结果。

## 常见误区

- **没有勾选 Hyper-V，就认为已经完全关闭。** 可选功能与 VBS、底层虚拟化平台需要分别检查。
- **VBS 显示未运行，就认为 hypervisor 不存在。** 还要看系统信息中的检测结果。
- **为了禁用 Hyper-V，连 CPU 虚拟化一起关闭。** 这会影响 VMware 自身使用 VT-x / AMD-V。
- **只停止或禁用某个 Hyper-V 服务。** 服务状态不能替代启动配置和实际 hypervisor 检测。
- **把关闭 Secure Boot、TPM 当作统一前置步骤。** 普通禁用流程不需要先改这些设置；遇到明确的 UEFI 锁，再按对应官方流程处理。
- **照搬旧帖的一整套脚本。** 先核对系统版本、当前状态和配置来源，避免把不同机器上的个别解决办法叠加到一起。

## 参考资料

- svenmerget：[Disabling Hyper-V hypervisor on Windows 11 Pro host (to get VMWare 17's CPL0 vs. ULM monitor mode)](https://community.broadcom.com/vmware-cloud-foundation/discussion/disabling-hyper-v-hypervisor-on-windows-11-pro-host-to-get-vmware-17s-cpl0-vs-ulm-monitor-mode)，Broadcom 社区，首帖发表于 2023 年 10 月 3 日。本文以其问题和排查思路为起点，结合官方文档重新整理。
- VMware：[VMware Workstation Now Supports Hyper-V Mode](https://blogs.vmware.com/cloud-foundation/2020/05/28/vmware-workstation-now-supports-hyper-v-mode/)，用于核对共存支持的起始版本。
- Broadcom：[嵌套虚拟化支持说明（KB 313547）](https://knowledge.broadcom.com/external/article/313547)、[运行模式与 VT-x/EPT 排查（KB 389469）](https://knowledge.broadcom.com/external/article/389469/virtualized-intel-vtxept-is-not-supporte.html)、[Windows 11 24H2 与 Workstation 17.x 性能问题（KB 417896）](https://knowledge.broadcom.com/external/article/417896/after-the-host-os-upgrade-to-version-win.html)。
- Microsoft Learn：[BCDEdit /set](https://learn.microsoft.com/en-us/windows-hardware/drivers/devtest/bcdedit--set)。
- Microsoft Learn：[Virtualization applications don't work together with Hyper-V and Hyper-V-based features](https://learn.microsoft.com/en-us/troubleshoot/windows-client/application-management/virtualization-apps-not-work-with-hyper-v)，用于核对禁用入口和状态检查；VMware 的具体共存支持另以其版本文档为准。
- Microsoft Learn：[Enable memory integrity](https://learn.microsoft.com/en-us/windows/security/hardware-security/enable-virtualization-based-protection-of-code-integrity)，包含 VBS 状态值、内存完整性配置与恢复说明。
- Microsoft Learn：[Configure Credential Guard](https://learn.microsoft.com/en-us/windows/security/identity-protection/credential-guard/configure)，包含无锁与 UEFI 锁两种禁用流程。
- Microsoft Learn：[Windows Subsystem for Linux FAQ](https://learn.microsoft.com/en-us/windows/wsl/faq)，用于核对 WSL 2 的虚拟化依赖和第三方共存支持。
