export const categorySlugs = [
  "windows",
  "nas",
  "network",
  "pt",
  "library",
  "subtitles",
  "audio",
  "diy",
  "encode",
  "life",
] as const;

export type CategorySlug = (typeof categorySlugs)[number];

export const sectionSlugs = ["setup", "media", "notes"] as const;

export type SectionSlug = (typeof sectionSlugs)[number];

export type Category = {
  slug: CategorySlug;
  label: string;
  description: string;
  section: SectionSlug;
};

export type Section = {
  slug: SectionSlug;
  label: string;
  description: string;
  categories: readonly CategorySlug[];
};

export const categories: readonly Category[] = [
  {
    slug: "windows",
    label: "Windows",
    description: "桌面软件、系统设置、远程桌面与虚拟化。",
    section: "setup",
  },
  {
    slug: "nas",
    label: "NAS",
    description: "系统安装、容器维护、存储与网盘服务。",
    section: "setup",
  },
  {
    slug: "network",
    label: "网络",
    description: "软路由、代理、远程访问与域名。",
    section: "setup",
  },
  {
    slug: "pt",
    label: "PT",
    description: "下载器、做种、辅种与 Seedbox。",
    section: "setup",
  },
  {
    slug: "library",
    label: "媒体库",
    description: "媒体服务器、订阅整理、直播与资源命名。",
    section: "media",
  },
  {
    slug: "subtitles",
    label: "字幕",
    description: "字幕编辑、识别、翻译、时间轴与字体。",
    section: "media",
  },
  {
    slug: "audio",
    label: "音频",
    description: "音轨提取、转换、编码与处理。",
    section: "media",
  },
  {
    slug: "diy",
    label: "DIY",
    description: "蓝光分流、封装、章节与 HDR 元数据处理。",
    section: "media",
  },
  {
    slug: "encode",
    label: "压制",
    description: "编码器、滤镜、画质处理与学习资料。",
    section: "media",
  },
  {
    slug: "life",
    label: "随笔",
    description: "生活、阅读和其他零散记录。",
    section: "notes",
  },
];

export const sections: readonly Section[] = [
  {
    slug: "setup",
    label: "折腾",
    description: "Windows、NAS、软路由、容器部署与 PT 下载。",
    categories: ["windows", "nas", "network", "pt"],
  },
  {
    slug: "media",
    label: "影音",
    description: "媒体库、字幕、音轨、蓝光原盘 DIY 与视频压制。",
    categories: ["library", "subtitles", "audio", "diy", "encode"],
  },
  {
    slug: "notes",
    label: "随笔",
    description: "平时生活、阅读和其他零散记录。",
    categories: ["life"],
  },
];

export function getCategory(slug: string | undefined): Category | undefined {
  return categories.find(category => category.slug === slug);
}

export function getSection(slug: string | undefined): Section | undefined {
  return sections.find(section => section.slug === slug);
}

export function getSectionOfCategory(
  slug: string | undefined
): Section | undefined {
  const category = getCategory(slug);
  return category ? getSection(category.section) : undefined;
}

export function getSectionCategories(
  section: SectionSlug
): readonly Category[] {
  const entry = getSection(section);
  return entry
    ? entry.categories
        .map(slug => getCategory(slug))
        .filter((category): category is Category => Boolean(category))
    : [];
}

// 旧分类地址；在对应板块的路由里生成跳转。
export const legacyCategoryRedirects = [
  { from: "games", to: "windows" },
  { from: "soft-router", to: "network" },
  { from: "debian", to: "nas" },
  { from: "docker", to: "nas" },
  { from: "home-media-center", to: "nas" },
  { from: "steamos", to: "windows" },
] as const;
