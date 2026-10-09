export type MediaCategory = {
  slug: string;
  label: string;
  description: string;
  tags: readonly string[];
};

export const mediaCategories: readonly MediaCategory[] = [
  {
    slug: "subtitles",
    label: "字幕",
    description: "字幕制作、翻译与整理。",
    tags: ["字幕", "subtitles"],
  },
  {
    slug: "audio",
    label: "音频",
    description: "声音、音乐与音频处理。",
    tags: ["音频", "audio"],
  },
  {
    slug: "diy",
    label: "DIY",
    description: "动手制作，记录想法与过程。",
    tags: ["DIY"],
  },
  {
    slug: "encode",
    label: "Encode",
    description: "视频编码、压制与画质笔记。",
    tags: ["Encode"],
  },
  {
    slug: "other",
    label: "其他",
    description: "其他与媒体有关的小事。",
    tags: ["其他", "other"],
  },
];

export function matchesMediaCategory(
  tags: readonly string[],
  category: MediaCategory
) {
  const categoryTags = category.tags.map(tag => tag.toLowerCase());
  return tags.some(tag => categoryTags.includes(tag.trim().toLowerCase()));
}
