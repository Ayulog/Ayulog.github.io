---
title: Portainer CE：安装与日常管理
description: 用 Compose 起一个 Portainer CE，通过 9443 管理容器、Stack 与卷，并把配置备份下来。
author: Ayulog
pubDatetime: "2026-10-10T10:00:00+08:00"
draft: false
category: nas
tags:
  - Debian
  - Docker
---

当 NAS 上的容器、镜像、自定义网络与命名卷逐渐增多，或者需要同时管理多台主机上的 Docker 环境时，Portainer CE 适合作为集中查看和巡检的图形面板。以下基于 [Portainer CE 官方安装文档][portainer-install]，使用长期支持标签 `lts` 与默认 HTTPS `9443` 端口部署。

同类容器面板的对比见 [NAS 服务清单](/posts/nas-software-websites/)，通用的容器迁移与升级流程见 [Docker 应用维护](/posts/docker-management/)。

## Compose 部署与初始化

确保宿主机已安装 [Docker Engine](https://docs.docker.com/engine/install/) 与 Compose V2。为 Portainer 单独创建一个项目目录，保存以下 `compose.yaml`（可直接[下载 Portainer Compose](/examples/debnas/portainer/compose.yaml)）：

```yaml
services:
  portainer:
    image: portainer/portainer-ce:lts
    restart: always
    ports:
      - "9443:9443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data

volumes:
  portainer_data:
```

在项目目录启动服务并查看初始化日志：

```bash
docker compose up -d
docker compose logs --tail=100 portainer
```

浏览器访问 `https://NAS_IP:9443`（将 `NAS_IP` 替换为设备局域网地址）。新版本首次初始化需验证 **Setup Token**：从上方容器日志中找到 `setup_token=` 对应的值填入页面表单，即可创建管理员账号（详见官方 [Setup Token 说明][portainer-token]）。

部署与访问时的注意事项：

- **端口说明**：`9443` 为默认 HTTPS 管理端口，首次打开时浏览器会提示自签名证书，确认 IP 无误后继续访问即可（按需可在后台替换为自有可信证书）。示例未映射旧版 HTTP `9000` 端口；若后续需要接入远程 Edge Agent，再额外添加 `8000:8000` 映射。
- **权限与持久化**：挂载 `/var/run/docker.sock` 赋予了面板操作宿主机 Docker 的完整权限，建议仅在可信局域网或私有组网内访问。命名卷 `portainer_data` 保存了面板自身的数据库与账户信息，切勿随意清理。

## 日常管理与 Stack 维护边界

进入控制台后，选择本地 `local` 环境即可查看容器状态、实时日志、资源占用、网络拓扑与命名卷。在使用 Portainer 维护服务时，建议遵循以下分工：

- **新建 Stack**：直接在 Portainer 的 **Stacks** 页面编写 Compose 配置并部署，后续修改端口、环境变量或升级版本也都在该 Stack 页面内完成。
- **外部已有项目**：由宿主机命令行、Dockge 或品牌 NAS 自带面板创建的容器，在 Portainer 的 Stacks 列表中会显示为 `Limited`（受限控制）。这类服务可以在 Portainer 中查看日志或临时重启，但修改配置与升级镜像仍应回到原 `compose.yaml` 所在目录操作，避免在面板里单拆容器重建导致多服务网络或环境变量丢失。

## 版本升级与数据备份

参考 [官方 Docker 升级说明][portainer-upgrade]，升级前先在 Portainer 后台（Settings → General → Back up Portainer）导出面板配置备份，随后进入原 Compose 项目目录拉取最新 `lts` 镜像并重建：

```bash
docker compose pull portainer
docker compose up -d portainer
docker compose logs --tail=100 portainer
```

升级与恢复时的要点：

- **保持项目目录名不变**：Docker Compose 会以项目目录名作为命名卷前缀（如 `<目录名>_portainer_data`）。在原目录执行升级会自动挂载原有数据卷；若更换了目录名，Compose 会新建一个空卷，导致面板进入全新初始化界面。
- **同步升级 Agent**：如果通过 Portainer Server 连接了其他主机上的 Portainer Agent，升级 Server 时需同步将各节点 Agent 更新至相同版本。
- **区分面板备份与业务备份**：Portainer 导出的备份仅包含面板自身的账户、Stack 定义与环境设置，各业务容器的数据库与挂载目录仍需按 [Docker 应用维护](/posts/docker-management/) 独立备份。

## 参考资料

- [Portainer CE 安装文档][portainer-install]
- [首次设置 token][portainer-token]
- [Docker 环境升级][portainer-upgrade]

[portainer-install]: https://docs.portainer.io/start/install-ce/server/docker/linux
[portainer-token]: https://docs.portainer.io/faqs/installing/setup-token
[portainer-upgrade]: https://docs.portainer.io/start/upgrade/docker
