export const composeArchive = {
  slug: "compose",
  label: "Compose 存档",
  description: "Docker Compose 示例、配置模板与配套教程。",
};

export type ComposeEntry = {
  slug: string;
  name: string;
  group: "媒体与下载" | "管理与存储" | "网络与远程";
  description: string;
  files: readonly { name: string; path: string }[];
  guide: { label: string; path: string };
};

export const composeEntries: readonly ComposeEntry[] = [
  {
    slug: "moviepilot",
    name: "MoviePilot V3",
    group: "媒体与下载",
    description: "订阅影视、对接下载器，并将下载完成的文件整理到媒体库。",
    files: [
      {
        name: "compose.yaml",
        path: "/examples/debnas/moviepilot/compose.yaml",
      },
      { name: "env.example", path: "/examples/debnas/moviepilot/env.example" },
    ],
    guide: {
      label: "MoviePilot V3 配置说明",
      path: "/posts/moviepilot-guide/",
    },
  },
  {
    slug: "qbittorrent",
    name: "qBittorrent",
    group: "媒体与下载",
    description: "通过 WebUI 管理下载与做种，与 MoviePilot 共用媒体目录。",
    files: [
      {
        name: "compose.yaml",
        path: "/examples/debnas/qbittorrent/compose.yaml",
      },
      { name: "env.example", path: "/examples/debnas/qbittorrent/env.example" },
    ],
    guide: {
      label: "qBittorrent 配置说明",
      path: "/posts/qbittorrent-guide/",
    },
  },
  {
    slug: "transmission",
    name: "Transmission",
    group: "媒体与下载",
    description:
      "管理下载与做种，使用镜像自带 WebUI，并与媒体服务保持路径一致。",
    files: [
      {
        name: "compose.yaml",
        path: "/examples/debnas/transmission/compose.yaml",
      },
      {
        name: "env.example",
        path: "/examples/debnas/transmission/env.example",
      },
    ],
    guide: {
      label: "Transmission 配置说明",
      path: "/posts/transmission-guide/",
    },
  },
  {
    slug: "cloud-media-sync",
    name: "Cloud Media Sync（CMS）",
    group: "媒体与下载",
    description: "同步云端媒体、生成 STRM 文件，并通知 Emby 更新媒体库。",
    files: [
      {
        name: "compose.yaml",
        path: "/examples/debnas/cloud-media-sync/compose.yaml",
      },
      {
        name: "env.example",
        path: "/examples/debnas/cloud-media-sync/env.example",
      },
    ],
    guide: {
      label: "CMS 配置说明",
      path: "/posts/cloud-media-sync/",
    },
  },
  {
    slug: "emby",
    name: "Emby",
    group: "媒体与下载",
    description: "管理家庭媒体库，为本地媒体与 STRM 提供刮削、浏览和播放入口。",
    files: [
      { name: "compose.yaml", path: "/examples/debnas/emby/compose.yaml" },
      { name: "env.example", path: "/examples/debnas/emby/env.example" },
    ],
    guide: {
      label: "Emby 配置说明",
      path: "/posts/emby-guide/",
    },
  },
  {
    slug: "dockge",
    name: "Dockge",
    group: "管理与存储",
    description: "集中编辑和管理 Compose 项目，查看容器状态与运行日志。",
    files: [
      { name: "compose.yaml", path: "/examples/debnas/dockge/compose.yaml" },
    ],
    guide: {
      label: "Dockge 配置说明",
      path: "/posts/dockge-guide/",
    },
  },
  {
    slug: "portainer",
    name: "Portainer CE",
    group: "管理与存储",
    description: "通过图形界面管理 Docker 容器、镜像、网络与存储卷。",
    files: [
      { name: "compose.yaml", path: "/examples/debnas/portainer/compose.yaml" },
    ],
    guide: {
      label: "Portainer 配置说明",
      path: "/posts/portainer-guide/",
    },
  },
  {
    slug: "mtphotos",
    name: "MT Photos",
    group: "管理与存储",
    description: "搭建家庭照片库，管理已有照片与新上传的照片原件。",
    files: [
      { name: "compose.yaml", path: "/examples/debnas/mtphotos/compose.yaml" },
    ],
    guide: {
      label: "MT Photos 配置说明",
      path: "/posts/mt-photos-guide/",
    },
  },
  {
    slug: "lucky",
    name: "Lucky",
    group: "网络与远程",
    description: "配置 DDNS、反向代理与证书，为 NAS 服务整理访问入口。",
    files: [
      { name: "compose.yaml", path: "/examples/debnas/lucky/compose.yaml" },
    ],
    guide: {
      label: "Lucky 配置说明",
      path: "/posts/lucky-guide/",
    },
  },
  {
    slug: "mihomo",
    name: "Mihomo 与 MetaCubeXD",
    group: "网络与远程",
    description: "部署代理核心与管理面板，附带用于验证连接的直连配置模板。",
    files: [
      { name: "compose.yaml", path: "/examples/debnas/mihomo/compose.yaml" },
      {
        name: "config.example.yaml",
        path: "/examples/debnas/mihomo/config.example.yaml",
      },
    ],
    guide: {
      label: "Mihomo 与 MetaCubeXD 配置说明",
      path: "/posts/mihomo-docker/",
    },
  },
];
