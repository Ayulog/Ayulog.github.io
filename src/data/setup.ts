export type SetupCategory = {
  slug: string;
  label: string;
  description: string;
  tags: readonly string[];
};

export const setupCategories: readonly SetupCategory[] = [
  {
    slug: "windows",
    label: "Windows",
    description: "Windows 安装、配置与使用笔记。",
    tags: ["Windows"],
  },
  {
    slug: "debian",
    label: "Debian",
    description: "Debian 安装、配置与日常维护。",
    tags: ["Debian"],
  },
  {
    slug: "nas",
    label: "NAS",
    description: "NAS 搭建、存储与服务配置。",
    tags: ["NAS"],
  },
  {
    slug: "steamos",
    label: "SteamOS",
    description: "SteamOS 安装、配置与游戏体验。",
    tags: ["SteamOS"],
  },
];

export function matchesSetupCategory(
  tags: readonly string[],
  category: SetupCategory
) {
  const categoryTags = category.tags.map(tag => tag.trim().toLowerCase());
  return tags.some(tag => categoryTags.includes(tag.trim().toLowerCase()));
}
