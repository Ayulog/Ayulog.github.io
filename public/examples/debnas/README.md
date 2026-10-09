# DebNAS Compose 示例

公开署名：Ayulog。本文按各项目上游安装说明整理 10 套独立示例，使用默认端口、标准容器目录和待填写变量。宿主机媒体目录、跨栈网络是教程的统一约定，配置不代表某台 NAS 的运行环境。

## 文件与默认入口

| 目录               | 服务                       | 示例发布端口                  | 配套文章              |
| ------------------ | -------------------------- | ----------------------------- | --------------------- |
| `moviepilot`       | MoviePilot V3 基础单容器版 | 3000 / 3001                   | DebNAS 自动观影流程   |
| `qbittorrent`      | qBittorrent                | 8080、6881 TCP / UDP          | DebNAS 自动观影流程   |
| `transmission`     | Transmission               | 9091、51413 TCP / UDP         | DebNAS 自动观影流程   |
| `cloud-media-sync` | CMS                        | 9527 / 9096                   | DebNAS 自动观影流程   |
| `emby`             | Emby                       | 8096 / 8920                   | DebNAS 自动观影流程   |
| `dockge`           | Dockge                     | 5001                          | DebNAS 安装及折腾记录 |
| `portainer`        | Portainer CE               | 9443                          | DebNAS 安装及折腾记录 |
| `mtphotos`         | MT Photos                  | 8063                          | DebNAS 安装及折腾记录 |
| `lucky`            | Lucky                      | host 网络，默认管理端口 16601 | DebNAS 安装及折腾记录 |
| `mihomo`           | Mihomo / MetaCubeXD        | 7890 / 9090；面板 8080        | DebNAS 安装及折腾记录 |

每个目录独立部署，按需选择，不要把所有 YAML 直接拼接。同机运行时先排查端口冲突，例如 qBittorrent 与 MetaCubeXD 都使用宿主端口 8080，Mihomo 控制器的 9090 也可能与 Cockpit 冲突。可以优先修改 MetaCubeXD 的宿主映射，例如 `8081:80`，并同步访问地址。qBittorrent 是需要额外注意的情况：更换 WebUI 端口时，按镜像说明同时修改映射两侧与 `WEBUI_PORT`；BT 端口也要同步 `TORRENTING_PORT` 及 TCP / UDP 映射。

## 示例目录

配置使用每个栈自己的相对路径，如 `./config`、`./data`。同名相对路径在不同栈下互不共享。Dockge 的 `/opt/stacks` 是官方示例中的栈目录，宿主机与容器内必须一致；容器标准目录及 Docker socket 等系统接口路径按镜像说明保留。

媒体栈通过 `.env` 指定跨栈共享目录：

| 变量               | 待替换宿主目录   | 容器内用途                                                                        |
| ------------------ | ---------------- | --------------------------------------------------------------------------------- |
| `MEDIA_ROOT`       | `/path/to/data`  | 下载器与 MoviePilot 的 `/data`；其 `library` 子目录映射为 Emby 的 `/data/library` |
| `CLOUD_MEDIA_ROOT` | `/path/to/cloud` | MoviePilot 的 `/cloud`，须先建立云盘挂载                                          |
| `STRM_ROOT`        | `/path/to/strm`  | CMS 的 `/media`、Emby 的 `/strm`                                                  |

下载器中把下载路径设为 `/data/downloads`，MoviePilot 的本地整理目标设为 `/data/library`。共享挂载是为了保持路径一致、支持同一文件系统内的硬链接；不是各镜像强制的默认下载路径。

CMS 与 Emby 两份 `.env` 的 `STRM_ROOT` 要填写同一真实目录。CMS 刷新通知路径对应 `/media → /strm`，若所用版本支持 `source#target` 格式，可使用 `/media#/strm` 并验证一个条目。

只走本地路线时可删除 MoviePilot 的云盘映射；只走云端路线时可删除 Emby 的本地媒体库映射，并同步移除不再引用的变量。更换路径不会自动迁移已有数据。

## 填写与检查

五个媒体栈均有 `env.example`。仅在没有 `.env` 的新目录中复制，再填写 UID、GID、目录、密码和令牌：

```bash
cp -n env.example .env
# 编辑并填写 .env 后检查
docker compose config --quiet
```

`${VAR:?…}` 表示必填；凭据留空时检查会提示缺失。UID、GID 和附加组按各服务账户与目录权限填写。配置中的时区来自相应上游示例，按自己的时区调整。

媒体服务使用共享 `media` 网络，先检查是否存在，再按需创建：

```bash
docker network inspect media
# 不存在时再执行
docker network create media
```

CMS 通过 `http://emby:8096` 访问 Emby。手机、浏览器和播放器使用 NAS 的可达地址与宿主端口，不能直接套用容器服务名。

Mihomo 的应用配置填写方法见安装篇及同目录的 `config.example.yaml`，复制并填写后再启动。附件不包含代理订阅、节点、真实控制器密钥、网盘会话、域名或证书。

## 按功能补充配置

- MoviePilot V3 使用官方基础方案的 SQLite / cachetools，不预配 PostgreSQL 或 Redis。已有外部数据库的部署应保留其私有配置，不能用本示例直接切换。
- CMS 的 `privileged: true` 来自官方安装模板，按当前版本要求与所用功能确认。其他服务不照搬该权限。
- Dockge、Portainer 挂载 Docker socket 用于容器管理；可访问该接口意味着能操作 Docker。
- Lucky 使用官方示例的 host 网络；额外监听端口由应用内配置决定。
- Mihomo 示例使用普通代理模式，不启用 TUN、host PID / IPC 或全部 capabilities。TUN 按官方文档另行配置。
- Transmission 使用镜像自带 WebUI；Emby 的 8920 端口需要证书和服务设置配合，硬件转码也需按硬件补充配置。

这些文件用于新部署学习与静态检查。填好的 `.env`、应用数据、数据库和授权文件保留在自己的设备上，不能随示例发布。本文未启动容器，实际下载、上传、扫描与播放需在部署环境验证。

## 上游参考

- [MoviePilot 官方安装说明](https://github.com/jxxghp/MoviePilot-Wiki/blob/main/install.md)、[V3 数据与启动说明](https://github.com/jxxghp/MoviePilot/blob/v3/docs/docker-startup.md)
- [qBittorrent 镜像](https://docs.linuxserver.io/images/docker-qbittorrent/)、[Transmission 镜像](https://docs.linuxserver.io/images/docker-transmission/)
- [CMS 安装说明](https://docs.cmscc.cc/install)、[Emby 官方镜像](https://hub.docker.com/r/emby/embyserver)
- [Dockge](https://github.com/louislam/dockge)、[Portainer 安装文档](https://docs.portainer.io/start/install-ce/server/docker/linux)
- [MT Photos](https://mtmt.tech/)、[Lucky](https://lucky666.cn/)
- [Mihomo 文档](https://wiki.metacubex.one/)、[MetaCubeXD](https://github.com/MetaCubeX/metacubexd)
