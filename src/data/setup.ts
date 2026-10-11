export const setupCategorySlugs = [
  "windows",
  "games",
  "nas",
  "soft-router",
  "pt",
] as const;

export type SetupCategorySlug = (typeof setupCategorySlugs)[number];

export type SetupCategory = {
  slug: SetupCategorySlug;
  label: string;
  description: string;
};

export const setupCategories: readonly SetupCategory[] = [
  {
    slug: "windows",
    label: "Windows",
    description: "桌面软件、系统设置与虚拟化。",
  },
  {
    slug: "games",
    label: "游戏",
    description: "游戏平台、Mod、修改器、串流与掌机工具。",
  },
  {
    slug: "nas",
    label: "NAS",
    description: "系统与容器、媒体库、网盘、存储和网络服务。",
  },
  {
    slug: "soft-router",
    label: "软路由",
    description: "OpenWrt、iStoreOS、路由设置与家庭网络。",
  },
  {
    slug: "pt",
    label: "PT",
    description: "下载器、订阅、辅种与 Seedbox。",
  },
];

export const legacySetupRedirects = [
  { from: "debian", to: "nas" },
  { from: "home-media-center", to: "nas" },
  { from: "docker", to: "nas" },
  { from: "steamos", to: "" },
] as const;

export const composeArchive = {
  slug: "compose",
  label: "Compose 存档",
  description: "Docker Compose 示例、配置模板与配套教程。",
};
