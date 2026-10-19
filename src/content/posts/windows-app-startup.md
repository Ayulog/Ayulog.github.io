---
title: Windows 设置程序开机自启动的几种方法
description: Windows 程序登录后自动启动的几种做法，从软件开关到任务计划程序与服务，附取消和排查方式。
author: Ayulog
pubDatetime: "2026-10-09T16:50:00+08:00"
draft: false
category: windows
tags:
  - 自启动
---

在 Windows 10 / 11 中设置程序自启动，普通桌面软件优先使用软件内部开关或系统“启动文件夹”；需要延迟启动、以管理员权限静默运行，或在用户登录前后台启动时，则可使用任务计划程序或 Windows 服务。

文中以 `C:\Apps\ExampleApp\ExampleApp.exe` 作为示例路径，实际操作时请替换为目标程序的真实路径。

## 开机启动与登录启动的区别

日常所说的“开机自启”分为两个触发阶段：

- **用户登录后启动**：开机并登录 Windows 账户进入桌面后才运行。软件自带开关、启动文件夹、注册表 `Run` 项均属于此类，适合带界面或系统托盘图标的桌面程序。
- **系统启动时运行（登录前）**：系统开机停留在锁屏登录界面时即在后台启动。可通过任务计划程序的“启动时”触发器、组策略启动脚本或 Windows 系统服务实现，适合无界面的后台服务与同步脚本。

| 配置方式           | 触发阶段               | 适用场景                             |
| ------------------ | ---------------------- | ------------------------------------ |
| 软件或系统启动开关 | 用户登录后             | 软件本身提供自启动开关               |
| 启动文件夹         | 用户登录后             | 普通桌面软件、单文件便携程序         |
| 任务计划程序       | 登录时 / 系统启动时    | 需延迟启动、管理员权限或无人值守运行 |
| 注册表 `Run` 项    | 用户登录后             | 直接通过命令行参数登记登录启动项     |
| 组策略脚本         | 计算机启动 / 用户登录  | 专业版/企业版下统一管理批处理或脚本  |
| Windows 服务       | 系统启动阶段（登录前） | 原生支持注册为系统服务的后台常驻程序 |

同一阶段的多个启动项之间没有固定先后顺序；若程序依赖网络或其它组件就绪，可在任务计划程序中设置延迟启动时间。

## 方法一：软件自带设置与系统启动开关

大多数常用软件在自身的“设置 / 偏好设置”中带有“开机自启”“随 Windows 启动”或“启动后最小化到系统托盘”选项，直接勾选即可。

已向系统注册的启动项，可以在 Windows 中统一开关：

1. 打开 **设置 → 应用 → 启动**（或按 `Ctrl + Shift + Esc` 打开任务管理器，切换到 **启动应用** 标签页）。
2. 在列表中找到目标软件，将状态切换为 **开启** 或 **关闭**。

若列表里没有某个便携软件或自定义程序，可使用下面的启动文件夹或计划任务添加。

## 方法二：启动文件夹

将程序的**快捷方式（`.lnk`）**放入系统的启动文件夹，用户登录时会自动打开该快捷方式（原程序 `.exe` 仍保留在原安装位置，无需把整个软件目录搬进启动文件夹）。

### 仅对当前登录用户生效

1. 按 `Win + R` 打开“运行”，输入 `shell:startup` 并回车。
2. 将目标程序的快捷方式复制到打开的文件夹中（或在空白处右键选择 **新建 → 快捷方式**，指向目标 `.exe`）。
3. 先双击该快捷方式确认能正常启动，再注销并重新登录验证自启效果。

> [!TIP]
> 对于 Microsoft Store 应用或找不到安装路径的 UWP 应用，可按 `Win + R` 输入 `shell:appsfolder` 打开完整应用列表，右键目标应用选择“创建快捷方式”，再将该快捷方式拖入 `shell:startup` 目录。

### 对本机所有用户生效

按 `Win + R` 输入 `shell:common startup` 并回车（写入该目录需管理员权限）。放入此处的快捷方式会在本机任意用户登录时运行。

- **取消方式**：直接从对应的启动文件夹中删除添加的快捷方式。

## 方法三：任务计划程序

当程序需要管理员权限（避免每次登录弹出 UAC 提示框）、需要延迟几十秒启动，或需要在用户登录前运行脚本时，可使用任务计划程序。

### 创建登录自启任务（适合桌面程序）

1. 按 `Win + R` 输入 `taskschd.msc` 并回车，在右侧点击 **创建任务**（不要选功能受限的“创建基本任务”）。
2. **常规**：填写任务名称（如 `ExampleApp 登录启动`），选择 **只在用户登录时运行**；若程序确实需要管理员权限，勾选 **使用最高权限运行**。
3. **触发器**：点击“新建”，将“开始任务”设为 **登录时**，可指定“特定用户”；如需等待桌面与网络加载完成，勾选“延迟任务时间”并设为 `30 秒`。
4. **操作**：点击“新建”，操作选 **启动程序**，分开填写以下三个字段：
   - **程序或脚本**：`"C:\Apps\ExampleApp\ExampleApp.exe"`
   - **添加参数**：按需填写启动参数（如 `--minimized`），无参数则留空。
   - **起始于**：`C:\Apps\ExampleApp`（填写程序所在目录且**不加引号**，确保程序能用相对路径读取同目录配置文件）。
5. **条件与设置**：
   - 在 **条件** 标签页中，笔记本用户建议取消勾选“只有在计算机使用交流电源时才启动此任务”，确保用电池开机时也能启动。
   - 在 **设置** 标签页中，常驻后台的程序需取消勾选“如果任务运行时间超过以下时间，停止任务”（默认 3 天）。

保存后，先在列表中右键该任务点击 **运行**，验证程序能否正常打开；随后注销并重新登录 Windows，确认触发器生效。

### 配置登录前后台运行（适合无界面脚本）

若希望开机停留在锁屏界面时即在后台运行脚本或命令行工具：

- 在 **常规** 中选择 **不管用户是否登录都要运行**（或指定 `SYSTEM` 账户）。
- 在 **触发器** 中选择 **启动时（At startup）**。
- 注意：采用“不管用户是否登录都要运行”时，程序运行在非交互式会话（Session 0）中，无法在用户桌面上显示窗口或托盘图标。

- **取消方式**：在任务计划程序库中右键目标任务，选择 **禁用** 或 **删除**。

## 方法四：注册表 Run 项

Windows 会在用户登录时读取注册表 `Run` 键下的命令。日常个人配置修改当前用户的 `HKEY_CURRENT_USER` 即可：

1. 按 `Win + R` 输入 `regedit` 打开注册表编辑器，定位到：

```text
HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Run
```

2. 在右侧空白处右键选择 **新建 → 字符串值（REG_SZ）**，命名为 `ExampleApp`。
3. 双击该值，在“数值数据”中填入带英文双引号的程序完整路径（如需附加启动参数，写在闭合双引号外侧）：

```text
"C:\Apps\ExampleApp\ExampleApp.exe" --minimized
```

若需对本机所有用户生效，对应的注册表路径为 `HKEY_LOCAL_MACHINE\Software\Microsoft\Windows\CurrentVersion\Run`（需管理员权限）。同目录下的 `RunOnce` 键仅在下次登录时执行一次并自动清除，日常长期自启动请使用 `Run`。

- **取消方式**：在 `Run` 键右侧删除刚才新建的字符串值。

## 方法五：本地组策略脚本

在 Windows 专业版、企业版中，可通过本地组策略编辑器（`gpedit.msc`）配置开机启动脚本或用户登录脚本（家庭版默认无此组件，直接使用启动文件夹或计划任务即可）：

- **用户登录脚本**：位于 **用户配置 → Windows 设置 → 脚本（登录/注销）→ 登录**，以当前登录用户身份运行。
- **计算机启动脚本**：位于 **计算机配置 → Windows 设置 → 脚本（启动/关机）→ 启动**，在开机阶段以本地 `SYSTEM` 权限运行，适合无界面的系统初始化操作。

若通过登录脚本拉起桌面程序，为避免批处理窗口一直挂起等待程序退出，应在 `.cmd` 脚本中使用 `start` 命令：

```bat
@echo off
start "" /D "C:\Apps\ExampleApp" "C:\Apps\ExampleApp\ExampleApp.exe"
```

其中 `""` 为窗口标题占位符，`/D` 指定工作目录。注意 Windows 默认可能启用登录脚本延迟策略（详见 [微软登录脚本延迟说明](https://learn.microsoft.com/en-us/troubleshoot/windows-client/group-policy/logon-scripts-not-run-for-long-time)），进入桌面后脚本可能延后数分钟执行。

- **取消方式**：在对应的组策略脚本属性窗口中移除添加的脚本条目。

## 方法六：软件原生提供的 Windows 服务

数据库、内网穿透（如 frp）、同步工具或代理核心等后台程序，部分在安装器或命令行中自带了“注册为系统服务”功能。注册为 Windows 服务后，程序可在开机阶段随系统自动运行，无需用户登录。

1. 按软件官方文档执行服务安装命令或在安装向导中勾选安装服务。
2. 按 `Win + R` 输入 `services.msc` 打开服务管理器，找到对应服务，将“启动类型”设为 **自动** 或 **自动（延迟启动）**。

普通桌面 GUI 程序未实现 Windows 服务控制接口（Service Control Handler），不能直接用 `sc.exe create` 强行注册为服务；若需将普通命令行程序或无服务接口的工具放入后台自启，请使用任务计划程序（方法三）或 NSSM、WinSW 等服务包装工具。

## 常见排查要点

设置完成后如果程序没有按预期自启，可按以下顺序检查：

1. **确认测试方式与触发时机匹配**：测试“登录时启动”需执行**注销并重新登录**（仅 `Win + L` 锁屏再解锁不会触发登录启动项）；测试“系统启动时”需执行**重启**。
2. **手动验证启动入口与工作目录**：双击启动文件夹里的快捷方式，或在任务计划程序中右键点击“运行”。若程序报错找不到配置文件，检查快捷方式的“起始位置”或计划任务的“起始于”是否已填写程序所在目录。
3. **检查 UAC 权限拦截**：需要管理员权限的程序若直接放进启动文件夹或注册表 `Run` 项，登录时可能会被系统静默拦截；应改用**任务计划程序**并勾选“使用最高权限运行”。
4. **检查计划任务电源与禁用状态**：笔记本未插电源时，计划任务默认的“仅在交流电源下启动”会阻止任务运行；同时可在计划任务的“上次运行结果”列查看返回码（`0x0` 表示执行成功）。
5. **清理重复登记**：同一款软件如果在自身设置里开了自启，又手动加了启动文件夹或计划任务，会导致登录后弹出两个实例，保留其中一种方式即可。

## 参考资料

- jluo123：[《Windows设置程序开机自启动的几种方法》](https://www.cnblogs.com/jluo/p/17352119.html)，博客园。
- Microsoft Support：[在 Windows 中配置启动应用程序](https://support.microsoft.com/en-us/windows/experience/startup-boot/configure-startup-applications-in-windows)与 [系统配置工具说明](https://support.microsoft.com/zh-cn/windows/experience/system-configuration-tools-in-windows)。
- Microsoft Learn：[Run and RunOnce Registry Keys](https://learn.microsoft.com/en-us/windows/win32/setupapi/run-and-runonce-registry-keys)。
- Microsoft Learn：任务计划程序文档（[Security Contexts](https://learn.microsoft.com/en-us/windows/win32/taskschd/security-contexts-for-running-tasks)、[BootTrigger](https://learn.microsoft.com/en-us/windows/win32/taskschd/boottrigger)、[LogonTrigger](https://learn.microsoft.com/en-us/windows/win32/taskschd/logontrigger)、[ExecAction](https://learn.microsoft.com/en-us/windows/win32/taskschd/execaction)）。
- Microsoft Learn：[使用本地组策略管理启动与登录脚本](<https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-server-2012-r2-and-2012/dn789190(v=ws.11)>)与 [start 命令说明](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/start)。
- Microsoft Learn：[Windows 服务入口（Service Entry Point）](https://learn.microsoft.com/en-us/windows/win32/services/service-entry-point)与 [交互式服务说明](https://learn.microsoft.com/en-us/windows/win32/services/interactive-services)。
