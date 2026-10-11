export const mediaCategorySlugs = [
  "subtitles",
  "audio",
  "diy",
  "encode",
] as const;

export type MediaCategorySlug = (typeof mediaCategorySlugs)[number];

export type MediaCategory = {
  slug: MediaCategorySlug;
  label: string;
  description: string;
};

export const mediaCategories: readonly MediaCategory[] = [
  {
    slug: "subtitles",
    label: "字幕",
    description: "字幕编辑、识别、翻译、时间轴与字体。",
  },
  {
    slug: "audio",
    label: "音频",
    description: "音轨提取、转换、编码与处理。",
  },
  {
    slug: "diy",
    label: "DIY",
    description: "蓝光分流、封装、章节与 HDR 元数据处理。",
  },
  {
    slug: "encode",
    label: "压制",
    description: "编码器、滤镜、画质处理与学习资料。",
  },
];
