---
title: 为 Windows RDP 配置 TLS
description: 给远程桌面换一张受信任的证书，消掉连接时的身份警告：证书准备、PFX 导入、私钥权限、绑定和客户端验证。
author: Ayulog
pubDatetime: "2026-10-09T17:25:00+08:00"
draft: false
category: windows
tags:
  - 远程桌面
---

Windows 远程桌面（RDP）默认使用系统自动生成的自签名证书加密连接，因此新设备首次连接时总会弹出“无法验证此计算机的身份”警告。将一张受信任且域名匹配的 TLS 证书绑定到 RDP 侦听器后，客户端即可直接通过身份验证。

本文整理单机 Windows 专业版、企业版及独立 Windows Server 上配置 RDP 证书的完整步骤：准备 PFX 证书、导入本地计算机存储、授予 `NETWORK SERVICE` 私钥读取权限、通过 PowerShell CIM 写入绑定，以及客户端验证与续期维护。

## 证书要求与格式转换

### 1. 证书要求

假设客户端连接远程桌面时使用的域名为 `rdp.example.com`（实际操作时请替换为自己的公网域名或内网 DNS 主机名），所用的服务器证书需满足以下条件：

- **使用者可选名称（SAN）匹配**：证书的 `DNS Name` 中包含客户端连接时填写的完整域名（若直接填 IP 连接，则证书需包含对应的 `IP Address` SAN）。
- **增强型密钥用法（EKU）**：包含“服务器身份验证（Server Authentication）”，对应 OID 为 `1.3.6.1.5.5.7.3.1`。
- **包含完整证书链与私钥**：服务端需同时导入证书、中间 CA 证书链与对应私钥；签名算法建议使用 SHA-256（密钥长度 RSA 2048 位及以上或 ECDSA）。
- **客户端信任根 CA**：若使用公共 CA（如 Let's Encrypt）签发的证书，主流系统已内置根证书信任；若使用自建内网 CA 签发，需提前将内网根 CA 的公钥证书（`.cer` / `.crt`）导入到客户端系统的“受信任的根证书颁发机构”中。

### 2. 将 PEM 证书打包为 PFX

如果手头已是带私钥的 `.pfx` / `.p12` 文件，可直接跳到下一节。若从 ACME 工具导出的是 PEM 格式的证书与私钥，可在本地使用 OpenSSL 合并打包为 PFX：

```shell
openssl pkcs12 -export -out rdp.pfx -inkey rdp.key -in rdp.crt -certfile intermediates.pem
```

- `rdp.crt`：服务器证书文件（若为已包含中间证书的 `fullchain.pem`，可省略 `-certfile` 参数）。
- `rdp.key`：证书对应的私钥文件。
- `intermediates.pem`：中间 CA 证书链文件。
- `rdp.pfx`：生成的 PFX 文件，执行命令时按提示设置导出保护密码。

## 导入证书与配置私钥权限

### 1. 导入到本地计算机个人存储

RDP 服务读取的是**本地计算机（Local Machine）**的个人证书存储（对应 PowerShell 路径 `Cert:\LocalMachine\My`）：

1. 在目标 Windows 主机上，按 `Win + R` 输入 `certlm.msc`，以管理员身份打开“证书 - 本地计算机”管理器。
2. 在左侧展开 **个人 → 证书**，右键空白处选择 **所有任务 → 导入**。
3. 选择打包好的 `rdp.pfx` 文件，输入导出密码（单机 RDP 绑定无需勾选“标志此密钥为可导出”），将证书存入“个人”存储区。
4. 双击导入后的证书，确认面板底部显示“你有一个与该证书对应的私钥”，且“证书路径”标签页中的证书链状态正常。

### 2. 授予 NETWORK SERVICE 私钥读取权限

远程桌面服务默认以 `NETWORK SERVICE` 身份运行，需授予该账户读取新证书私钥的权限：

1. 在 `certlm.msc` 的 **个人 → 证书** 列表中，右键刚才导入的服务器证书，选择 **所有任务 → 管理私钥**。
2. 查看“组或用户名”列表：若没有 `NETWORK SERVICE`，点击 **添加**，输入 `NETWORK SERVICE` 并点击“检查名称”后确定。
3. 选中 `NETWORK SERVICE`，在下方权限框中勾选允许 **读取（Read）**（无需勾选“完全控制”），点击确定保存。

## 使用 PowerShell CIM 绑定证书

配置远程桌面侦听器前，建议确保手头有本地显示器键鼠、虚拟机 VNC 控制台或带外管理入口，以便在重启服务期间或配置有误时直接操作主机。

### 1. 备份原有侦听器配置

以管理员身份打开 PowerShell，查询当前 `RDP-Tcp` 侦听器的证书状态：

```powershell
$rdpQuery = @{
  Namespace = 'root\cimv2\TerminalServices'
  ClassName = 'Win32_TSGeneralSetting'
  Filter = "TerminalName='RDP-Tcp'"
}

Get-CimInstance @rdpQuery |
  Format-List TerminalName, SSLCertificateSHA1Hash, SSLCertificateSHA1HashType
```

记录输出结果。其中只读属性 `SSLCertificateSHA1HashType` 的数值含义如下：

| 数值 | 状态含义                 |
| ---- | ------------------------ |
| `0`  | 无效                     |
| `1`  | 使用系统默认自签名证书   |
| `2`  | 由组策略（GPO）统一指定  |
| `3`  | 使用手动绑定的自定义证书 |

同时可在注册表编辑器（`regedit`）中定位到以下路径并导出 `.reg` 备份，记录原本是否存在 `SSLCertificateSHA1Hash`（`REG_BINARY` 类型）键值：

```text
HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\Terminal Server\WinStations\RDP-Tcp
```

### 2. 查询新证书指纹并写入绑定

在管理员 PowerShell 中列出 `Cert:\LocalMachine\My` 下的证书，找到刚才导入的证书并复制其 40 位 `Thumbprint`（指纹）：

```powershell
Get-ChildItem Cert:\LocalMachine\My |
  Format-List Subject, DnsNameList, NotAfter, HasPrivateKey, Thumbprint
```

将下方脚本第一行的 `PASTE_40_HEX_THUMBPRINT` 替换为复制的证书指纹后执行。该脚本会自动清理复制时可能带入的隐藏字符，校验私钥、有效期与服务器身份验证 EKU，并通过 `Set-CimInstance` 将指纹绑定到 `RDP-Tcp`：

```powershell
$rdpThumbprint = 'PASTE_40_HEX_THUMBPRINT'
$rdpThumbprint = ($rdpThumbprint -replace '[\s\u200e\u200f]', '').ToUpperInvariant()

if ($rdpThumbprint -notmatch '\A[0-9A-F]{40}\z') {
  throw '请填入正确的 40 位证书指纹。'
}

$rdpCertificate = Get-Item -LiteralPath "Cert:\LocalMachine\My\$rdpThumbprint" -ErrorAction Stop
$rdpCheckTime = Get-Date

if (-not $rdpCertificate.HasPrivateKey) {
  throw '证书没有对应私钥。'
}
if ($rdpCertificate.NotBefore -gt $rdpCheckTime -or $rdpCertificate.NotAfter -le $rdpCheckTime) {
  throw '证书当前不在有效期内。'
}
if ($rdpCertificate.EnhancedKeyUsageList.ObjectId -notcontains '1.3.6.1.5.5.7.3.1') {
  throw '证书需要包含服务器身份验证用途。'
}

$rdpQuery = @{
  Namespace = 'root\cimv2\TerminalServices'
  ClassName = 'Win32_TSGeneralSetting'
  Filter = "TerminalName='RDP-Tcp'"
}
$rdpListener = Get-CimInstance @rdpQuery -ErrorAction Stop
if ($null -eq $rdpListener -or @($rdpListener).Count -ne 1) {
  throw '未找到唯一的 RDP-Tcp 侦听器，请先检查远程桌面配置。'
}
if ($rdpListener.SSLCertificateSHA1HashType -eq 2) {
  throw '当前证书由组策略指定，请先处理对应策略。'
}

Set-CimInstance -InputObject $rdpListener -Property @{
  SSLCertificateSHA1Hash = $rdpCertificate.Thumbprint
} -ErrorAction Stop

Get-CimInstance @rdpQuery |
  Format-List TerminalName, SSLCertificateSHA1Hash, SSLCertificateSHA1HashType
```

确认最后输出的 `SSLCertificateSHA1Hash` 已更新为新证书指纹，且 `SSLCertificateSHA1HashType` 变为 `3`（注：WMI/CIM 接口属性名固定为 `SSLCertificateSHA1Hash`，代表使用 40 位 SHA-1 指纹索引证书，证书本身的签名算法仍为 SHA-256）。

## 安全层策略与客户端验证

### 1. 核对 RDP 安全层与 NLA 策略

若需在组策略中显式指定 RDP 使用 TLS 安全层，可按 `Win + R` 输入 `gpedit.msc`，依次展开：

**计算机配置 → 管理模板 → Windows 组件 → 远程桌面服务 → 远程桌面会话主机 → 安全**

- **要求将特定的安全层用于远程（RDP）连接**：设为 **已启用**，安全层选择 **SSL**（部分系统界面显示为 `SSL (TLS 1.0)`，实际握手协议版本由系统 Schannel 协商决定，为保证各平台客户端兼容性建议保持启用 TLS 1.2）。
- **要求使用网络级别身份验证对远程连接的用户进行身份验证（NLA）**：保持 **已启用**，确保在创建远程桌面会话前完成凭据验证。

### 2. 客户端连接与证书核验

1. 打开远程桌面客户端（`mstsc`），填入证书 SAN 中匹配的完整域名（如 `rdp.example.com`）发起连接。
2. 确认连接过程中不再弹出黄色的证书不受信任或名称不匹配警告。
3. 进入远程桌面后，点击顶部连接栏上的**锁形图标**，打开连接安全详情并点击“查看证书”，核对客户端收到的证书颁发者、有效期与指纹与本次绑定的新证书完全一致。

## 证书续期与恢复

### 证书续期后的更新流程

使用 Let's Encrypt 等短期证书时，每次续期生成的新证书都会有新的指纹。更新时需依次完成：

1. 将新生成的 PFX 证书导入 `Cert:\LocalMachine\My`。
2. 为新证书的私钥添加 `NETWORK SERVICE` 读取权限。
3. 执行上方的 PowerShell CIM 脚本，将 `SSLCertificateSHA1Hash` 更新为新证书指纹（若使用 `win-acme` 等自动化工具，可通过安装后脚本自动执行权限授予与 CIM 绑定）。
4. 验证客户端已收到新证书后，再从 `certlm.msc` 中清理已过期的旧证书。

### 回滚恢复默认配置

若配置后需要回退至系统默认的自签名证书：

1. 打开注册表编辑器，定位到 `HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\Terminal Server\WinStations\RDP-Tcp`。
2. 删除右侧的 `SSLCertificateSHA1Hash` 键值（保留整个 `RDP-Tcp` 项及其他键值）。
3. 重启 `Remote Desktop Services`（`TermService`）或重启电脑，再次运行 CIM 查询确认 `SSLCertificateSHA1HashType` 已恢复为 `1`（默认自签名证书存放在 `Cert:\LocalMachine\Remote Desktop` 存储区中，会自动接管）。

## 常见问题

- **执行 `Set-CimInstance` 提示“参数无效（Invalid parameter）”**：检查证书是否确实导入在“本地计算机 → 个人”（`Cert:\LocalMachine\My`）而非“当前用户”，且证书包含私钥与 `Server Authentication`（`1.3.6.1.5.5.7.3.1`）用途。
- **绑定成功但远程桌面连接直接中断或报错**：打开 `certlm.msc`，右键新证书 → **所有任务 → 管理私钥**，确认已添加 `NETWORK SERVICE` 的读取权限。
- **客户端仍提示“证书名称不匹配”**：连接时必须填写证书 SAN 列表中的域名（如 `rdp.example.com`），不能直接使用内网 IP 或未包含在 SAN 中的短主机名连接。
- **客户端仍提示“此证书并非由受信任的颁发机构颁发”**：检查服务端 PFX 导入时是否包含了完整的中间 CA 证书链；若为自建内网 CA，确认客户端已将根 CA 证书安装到“本地计算机 → 受信任的根证书颁发机构”。

## 参考资料

- 阿龙w：[《为 Windows RDP 配置 TLS, Windows Remote Desktop Enable TLS》](https://cloud.tencent.com/developer/article/2375679)，腾讯云开发者社区。
- Microsoft Learn：[Remote Desktop listener certificate configurations](https://learn.microsoft.com/en-us/troubleshoot/windows-server/remote/remote-desktop-listener-certificate-configurations)（侦听器证书配置与私钥权限说明）。
- Microsoft Learn：[Win32_TSGeneralSetting class](https://learn.microsoft.com/en-us/windows/win32/termserv/win32-tsgeneralsetting)、[Set-CimInstance](https://learn.microsoft.com/en-us/powershell/module/cimcmdlets/set-ciminstance)与 [Use certificates in Remote Desktop Services](https://learn.microsoft.com/en-us/windows-server/remote/remote-desktop-services/remote-desktop-services-certificates)。
- Microsoft Learn：[RDP 安全层策略](https://learn.microsoft.com/en-us/windows/client-management/mdm/policy-csp-admx-terminalserver#ts_security_layer_policy)、[RDP 协议中的 TLS 规范](https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-rdpbcgr/857dadbe-f01a-4047-9b63-0d5b681ad306)与 [Schannel TLS 注册表设置](https://learn.microsoft.com/en-us/windows-server/security/tls/tls-registry-settings)。
- OpenSSL 文档：[openssl-pkcs12](https://docs.openssl.org/3.5/man1/openssl-pkcs12/)。
