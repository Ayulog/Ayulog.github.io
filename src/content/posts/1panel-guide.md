---
title: 1Panel：直接安装与 Docker 部署
description: 在 Linux 上直接装 1Panel V2，或用社区 Docker 镜像部署；含管理命令、数据路径、应用商店与备份。
author: Ayulog
pubDatetime: "2026-10-10T10:00:00+08:00"
draft: false
category: nas
tags:
  - Debian
  - Docker
---

1Panel 提供了可视化的 Linux 服务器管理、应用商店、容器编排、网站反代与定时备份功能。在 NAS 上部署 1Panel V2 有两种常见路径：自建 Debian 等标准 Linux 系统可直接使用官方脚本安装在宿主机；绿联、极空间、飞牛等不便改动底层系统的品牌 NAS，则可使用社区维护的 Docker 镜像 `moelin/1panel` 部署。

同类容器面板的对比见 [NAS 服务清单](/posts/nas-software-websites/)，通用的容器备份与升级原则见 [Docker 应用维护](/posts/docker-management/)。

## 方式一：Linux 宿主机直接安装

### 运行官方安装脚本

在 Debian 等 Linux 主机上以 `root` 权限执行以下命令（普通管理员可先执行 `sudo -i`），安装基础下载工具并运行 [1Panel 官方 V2 在线安装脚本][panel-install]：

```bash
apt update && apt install -y curl ca-certificates
curl -fL https://resource.fit2cloud.com/1panel/package/v2/quick_start.sh -o 1panel-quick-start.sh
bash 1panel-quick-start.sh
```

跟随终端交互提示依次设置安装目录（默认 `/opt`，面板数据存放在 `/opt/1panel/`）、监听端口、安全入口（Entrance）以及管理员账号密码。安装完成后，终端会输出面板访问地址：

```text
http://NAS_IP:实际端口/实际安全入口
```

### 常用 `1pctl` 命令行操作

宿主机直接安装后，可在终端通过 [1pctl 命令行工具][panel-cli] 查看运行状态、找回安全入口或修改登录信息：

```bash
# 查看核心服务、Agent 状态与面板版本
1pctl status core
1pctl status agent
1pctl version

# 查看面板访问地址与账户信息
1pctl user-info

# 交互式修改管理员用户名、密码或监听端口
1pctl update username
1pctl update password
1pctl update port

# 重启全部面板服务
1pctl restart all
```

### 宿主机安装注意事项

- **环境与硬件要求**：官方安装脚本支持主流 Debian / RedHat 系发行版（含 `x86_64`、`aarch64` 等架构），建议可用内存大于 1 GB。
- **已有 Docker 环境处理**：若宿主机已按 [Docker 官方 Debian 文档][docker-debian] 安装了 Docker Engine，运行安装脚本时保留现有 Docker 配置与 `/etc/docker/daemon.json`，无需重复安装。
- **访问范围控制**：1Panel 具备完整的宿主机管理权限，建议仅在局域网或私有组网中访问对应端口。

## 方式二：Docker 容器部署（社区镜像）

### 编写 Compose 与启动容器

在不便直接运行宿主机安装脚本的 NAS 上，可使用 [okxlin/docker-1panel][panel-image] 维护的社区镜像 `moelin/1panel`。在 NAS 上创建项目目录与数据目录（以下以 `/volume1/docker/1panel/data` 为例），保存 `compose.yaml`：

```yaml
services:
  1panel:
    image: moelin/1panel:v2.2.2
    container_name: 1panel-v2
    restart: unless-stopped
    network_mode: host
    environment:
      TZ: Asia/Shanghai
      BASE_DIR: /volume1/docker/1panel/data
      PORT: "10086"
      USERNAME: paneladmin
      PASSWORD: ""
      ENTRANCE: nas-panel-entry
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /volume1/docker/1panel/data:/volume1/docker/1panel/data
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```

在项目目录启动容器，并从启动日志中获取初始密码：

```bash
docker compose up -d
docker compose logs --tail=100 1panel
```

初始化完成后，浏览器访问 `http://NAS_IP:10086/nas-panel-entry` 登录。后续如需在终端调用 `1pctl`，可通过 `docker exec` 执行：

```bash
docker exec -it 1panel-v2 1pctl version
docker exec -it 1panel-v2 1pctl user-info
```

### 容器部署关键参数说明

- **`BASE_DIR` 与路径一致性**：`BASE_DIR` 环境变量与 `volumes` 挂载的左右两侧必须填写**完全相同的宿主机绝对路径**（如 `/volume1/docker/1panel/data:/volume1/docker/1panel/data`）。因为 1Panel 通过宿主机 `/var/run/docker.sock` 创建应用商店容器，保持内外路径一致才能让子容器准确挂载到宿主机数据目录。
- **初始凭据与安全入口**：`ENTRANCE` 仅填写路径字符（不带前后 `/`）；首次启动时若 `PASSWORD` 留空，容器会自动生成随机密码并打印在日志中。容器完成初始化落盘后，再次修改 YAML 中的账号、密码或入口变量不会覆盖已有数据库，需在面板设置中或通过 `docker exec -it 1panel-v2 1pctl update ...` 修改。
- **网络与端口**：示例采用 `host` 网络模式，面板监听端口直接由 `PORT` 变量控制（默认 `10086`），修改前确认宿主机该端口未被占用。

## 应用商店与本地应用模板导入

在 1Panel 应用商店安装软件时，确认应用的外部端口、数据库依赖及挂载目录后再提交部署。需要注意：宿主机原有的其他 Docker 容器虽然会显示在 1Panel 的“容器”列表中，但并不属于“已安装应用”，仍应通过原 Compose 目录维护。

如需补充第三方应用商店模板，可导入 [okxlin/appstore 的 `localApps` 分支][panel-appstore]：

1. 定位本地应用模板目录：宿主机默认安装路径为 `/opt/1panel/resource/apps/local/`，上方 Docker 部署路径为 `/volume1/docker/1panel/data/1panel/resource/apps/local/`。
2. 下载 `localApps` 分支压缩包并解压，将其中 `apps/` 目录下的各个应用文件夹直接放入 `local/` 目录内（结构为 `local/<应用名>/...`）。
3. 进入 1Panel 应用商店点击“更新应用列表”，即可在“本地”分类下查看并安装导入的模板。

## 版本升级、备份与登录排错

### 升级面板版本

- **宿主机直接安装**：在 1Panel Web 控制台右下角或系统设置中点击“检查更新”直接升级。
- **Docker 容器部署**：社区镜像推荐通过更换镜像标签并重建容器的方式升级（不要在容器内直接升级二进制文件）。先备份面板目录与应用数据，将 `compose.yaml` 中的镜像版本号修改为目标版本后执行：

```bash
docker compose pull 1panel
docker compose up -d 1panel
docker compose logs --tail=100 1panel
```

### 数据备份与登录排错

- **备份范围**：除备份 `1panel/` 面板自身数据外，还需一并备份应用商店所创建容器的数据库与外部挂载卷。注意停止 `1panel-v2` 容器并不会停止由它部署的业务容器，备份数据库前应单独暂停对应业务服务或使用面板自带的应用备份功能。
- **登录排错**：若面板页面无法打开，依次核对 URL 末尾是否带上了正确的 `ENTRANCE` 安全入口、HTTP/HTTPS 协议是否匹配、宿主机防火墙是否放行端口。若容器版忘记登录信息且需要强制重置为环境变量配置，可临时添加环境变量 `RESET=true` 启动一次，重置生效后立即移除该变量。

## 参考资料

- [1Panel 官方原生安装][panel-install]
- [1pctl 命令行工具][panel-cli]
- [okxlin/docker-1panel 社区镜像][panel-image]
- [okxlin/appstore 本地应用模板][panel-appstore]
- [Docker Engine 在 Debian 上的安装说明][docker-debian]
- 磕巴白菜：[绿联 NAS 部署 1Panel 笔记](https://hi.keba.host/archives/ugreen-1panel)

[panel-install]: https://docs.fit2cloud.com/1panel/installation/online-installation
[panel-cli]: https://docs.fit2cloud.com/1panel/installation/cli
[panel-image]: https://github.com/okxlin/docker-1panel
[panel-appstore]: https://github.com/okxlin/appstore/tree/localApps
[docker-debian]: https://docs.docker.com/engine/install/debian/
