---
title: "qiandao：部署与签到任务"
description: "用 Docker 部署 qiandao，注册账号、按 HAR 制作签到任务，并处理备份、升级与故障。"
pubDatetime: 2026-10-09T12:00:00+08:00
author: "Ayulog"
category: nas
tags:
  - Docker
draft: false
---

站点签到、每日积分领取这类固定流程，可以交给 qiandao 按抓取的 HTTP 请求模板定时执行。本文基于 `a76yyyy/qiandao` 镜像在 Linux Docker 环境下部署。

> 注：[QD 官方文档](https://qd-today.github.io/qd/zh_CN/guide/deployment.html)使用的是 `qdtoday/qd` 镜像，与 `a76yyyy/qiandao` 的版本节奏和环境变量各自独立；切换镜像分支前请先备份配置目录，并避免两个容器同时读写同一份数据库。

## 目录准备与 Docker 部署

部署前先在宿主机创建用于持久化配置和数据库的目录，并从 [a76yyyy/qiandao 标签页](https://hub.docker.com/r/a76yyyy/qiandao/tags)选择一个稳定日期标签（下文以 `20250803` 为例，长期运行建议固定日期标签而非 `latest`）：

```bash
mkdir -p ./qiandao-config
docker pull a76yyyy/qiandao:20250803
```

启动容器并映射 `8923` 端口与配置目录：

```bash
docker run -d \
  --name qiandao \
  --restart unless-stopped \
  -p 8923:80 \
  -v "$(pwd)/qiandao-config:/usr/src/app/config" \
  a76yyyy/qiandao:20250803
```

主要参数说明：

- `-p 8923:80`：将宿主机的 `8923` 端口映射到容器内的 HTTP `80` 端口；若宿主机 `8923` 已占用，可改为 `-p 18080:80` 等未占用端口。
- `-v "$(pwd)/qiandao-config:/usr/src/app/config"`：将数据库与任务配置持久化到宿主机目录，确保容器重建或升级后任务不丢失。

启动后查看容器状态与日志：

```bash
docker ps
docker logs -f qiandao
```

确认无报错后，在浏览器访问 `http://服务器地址:8923`（本机部署可访问 `http://127.0.0.1:8923`）。

## WebUI 初始化与安全设置

首次打开页面时先注册账号。首位注册的用户会自动获得管理员权限；注册完成后重新登录一次，即可看到管理员菜单。

由于签到任务与数据库内保存了各站点的 Cookie、Token 等登录凭据，初始化时建议完成以下设置：

1. **管理员与密钥**：为管理员账号设置独立强密码。若所用镜像标签支持 `DOMAIN`、`AES_KEY`、`COOKIE_SECRET` 等环境变量（可对照对应标签说明与 [QD 官方部署文档](https://qd-today.github.io/qd/zh_CN/guide/deployment.html)），建议将加密密钥与 Cookie 密钥替换为自定义随机值。
2. **访问范围控制**：自用环境建议仅在内网或 VPN 网段访问；若需公网访问，需通过反向代理配置 HTTPS 及访问鉴权。
3. **时区与通知**：确认容器时区与宿主机一致，按需配置执行结果通知渠道（通知内容仅输出任务状态与简要报错，避免在消息中携带完整 Cookie 或响应正文）。

## 制作 HAR 模板与创建签到任务

qiandao 的签到流程分为两部分：描述请求结构与结果判断规则的**模板**，以及填入具体账号凭据与执行时间的**任务实例**。

### 1. 在浏览器中抓取 HAR

HAR（HTTP Archive）用于记录浏览器发起的网络请求。建议使用独立的浏览器配置文件抓取目标站点的签到请求：

1. 打开目标站点并完成登录，进入签到或领取页面。
2. 按 `F12` 打开开发者工具，切换到 **Network（网络）** 面板并清空现有记录。
3. 点击页面上的签到按钮，等待返回成功提示。
4. 在请求列表中定位实际提交签到的那条请求（或连续几条关键请求），右键选择 **Save all as HAR with content（将所有内容另存为 HAR）** 保存到本地（Firefox 为 **Save All As HAR**）。

导出的原始 HAR 文件包含当前账号的明文 Cookie、`Authorization` 请求头及响应正文，仅在本地制作模板时使用，切勿直接公开分享；保存模板前还可在编辑器中剔除无关的图片、统计脚本等冗余请求。

### 2. 导入 HAR 并替换为模板变量

1. 登录 qiandao，进入 **我的模板**，点击右侧 `+` 上传刚保存的 HAR 文件（也可在 **社区模板** 中订阅相近模板后修改）。
2. 在请求编辑器中逐一检查 URL、请求方法、请求头、Cookie 和请求体，将与个人账号绑定的字段替换为 Jinja2 变量：

```text
{{ username }}
{{ password }}
{{ cookie }}
```

变量名称需与后续任务实例中填写的字段保持一致。除常规账号与 Cookie 外，还需留意请求头中的 `Authorization`、URL 查询参数以及前置请求动态返回的 CSRF Token（动态 Token 可通过下方的“变量提取”从前一步响应中获取并传递给下一步）。

### 3. 配置断言与变量提取

为了准确判断签到是否真正成功，需为关键请求设置断言规则（例如校验响应状态码及返回 JSON 中的成功状态字段，避免仅凭 `HTTP 200` 误判成功）。

- **变量提取**：若后续请求依赖前序请求返回的数据，可使用正则表达式提取并存为环境变量（如 `ab(\w+)cd` 仅提取括号内的分组内容）；调试阶段可通过 `__log__` 变量将关键返回值输出到任务日志。
- **正反测试**：在测试面板中分别用有效凭据和错误凭据各测试一次，确认模板能准确区分成功与失败状态，验证无误后点击 **保存**（如需分享模板，可点击 **下载** 导出脱敏后的模板文件）。

### 4. 创建定时签到任务

1. 进入 **我的任务**，点击 `+` 选择刚保存的模板。
2. 填入当前账号的变量值（如实际 Cookie）、任务分组与定时执行时间。同一站点的多个账号建议错开几分钟执行，并安排在站点允许签到的时间窗口内。
3. 先点击 **测试** 手动运行一次，核对执行日志与站点实际签到状态，确认正常后保存并启用定时任务。

## 常见问题与维护

### 备份、升级与回滚

日常维护或升级镜像前，先停止容器并将挂载的 `./qiandao-config` 目录打包备份到安全位置：

```bash
docker stop qiandao
tar -czf qiandao-config-$(date +%F).tar.gz ./qiandao-config
docker start qiandao
```

升级版本时，先从 [Docker Hub 标签页](https://hub.docker.com/r/a76yyyy/qiandao/tags)确认目标标签，拉取新镜像后复用原配置目录重建容器：

```bash
docker pull a76yyyy/qiandao:目标版本
docker stop qiandao
docker rm qiandao
docker run -d \
  --name qiandao \
  --restart unless-stopped \
  -p 8923:80 \
  -v "$(pwd)/qiandao-config:/usr/src/app/config" \
  a76yyyy/qiandao:目标版本
```

启动后查看日志并手动触发一个签到任务测试；若新版本出现兼容问题，停止并删除新容器，恢复备份的配置目录后用原镜像标签重新启动即可。

### 故障排查

| 现象                         | 优先检查                                                                                      |
| ---------------------------- | --------------------------------------------------------------------------------------------- |
| 管理页面无法打开             | 执行 `docker ps -a` 与 `docker logs --tail 100 qiandao` 排查端口冲突、目录权限或防火墙限制    |
| 重建容器后历史任务全部消失   | 检查 `-v` 参数左侧是否指向原先的 `./qiandao-config` 宿主机目录                                |
| 任务报错提示未登录或凭据失效 | 站点 Cookie 或 Token 已过期；在浏览器重新登录站点，更新任务实例中的变量值后手动测试           |
| HAR 回放失败或提示成功未到账 | 导出 HAR 时是否勾选了 `with content`、POST 请求体与 `Content-Type` 是否完整、成功断言是否准确 |
| 遇到验证码或动态签名失败     | 站点引入了人机验证、时间戳或一次性 nonce，静态 HAR 无法直接回放，需补充变量提取或改用其他方案 |
| 定时任务到点未执行           | 任务是否处于暂停状态、容器时区是否与页面显示一致、容器内访问目标站点的 DNS 与网络是否正常     |

## 参考资料

- [qd-today 官方部署文档](https://qd-today.github.io/qd/zh_CN/guide/deployment.html)
- [Docker Hub：a76yyyy/qiandao 标签](https://hub.docker.com/r/a76yyyy/qiandao/tags)
