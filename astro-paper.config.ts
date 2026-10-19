import { defineAstroPaperConfig } from "./src/types/config";

export default defineAstroPaperConfig({
  site: {
    url: "https://ayulog.github.io/",
    title: "Ayulog",
    description: "记录生活、技术、游戏，以及一些慢慢积累的小事。",
    author: "Ayulog",
    profile: "https://github.com/Ayulog",
    ogImage: "default-og.jpg",
    lang: "zh-CN",
    timezone: "Asia/Singapore",
    dir: "ltr",
  },
  posts: {
    perPage: 6,
    perIndex: 6,
    scheduledPostMargin: 15 * 60 * 1000,
  },
  features: {
    lightAndDarkMode: true,
    dynamicOgImage: true,
    showArchives: true,
    showBackButton: true,
    editPost: {
      enabled: true,
      url: "https://github.com/Ayulog/Ayulog.github.io/edit/main/",
    },
    search: "pagefind",
  },
  socials: [{ name: "github", url: "https://github.com/Ayulog" }],
  shareLinks: [],
});
