# Blog 项目协作规则

## 项目与事实来源

- 本仓库为 `Ayulog/Ayulog.github.io`，使用 AstroPaper、Astro、TypeScript、Tailwind CSS 和 Pagefind，发布到 GitHub Pages。
- 以实际源码、`package.json`、`pnpm-lock.yaml`、`src/content.config.ts` 和 `.github/workflows/` 为准；README 含上游主题说明，部署信息可能与本博客不同。
- 说明、文章和交接默认使用中文；保留作者原有语气，事实、引用和图片来源需要核实。
- 本文件保存长期协作约定；一次性任务进度另行记录，避免在这里累积工作日志。

## 环境与常用命令

- 从本仓库根目录执行命令，优先使用 Node.js 24 和 pnpm 11.3.0，与当前 CI 对齐；`package.json` 声明 Node.js `>=22.12.0`。
- 依赖管理沿用 pnpm 和现有锁文件；不要混入 npm/yarn 锁文件，也不要为普通内容修改顺带升级依赖。
- `pnpm install --frozen-lockfile`：按锁文件安装依赖；依赖变更时再有意更新锁文件。
- `pnpm dev`：本地开发；`pnpm preview`：预览已构建站点。
- `pnpm sync`：同步 Astro 类型；`pnpm astro check`：检查 Astro/TypeScript。
- `pnpm lint`：ESLint 检查；`pnpm format:check`：检查当前配置覆盖的文件格式。
- `pnpm build`：依次检查、构建、生成 Pagefind 索引，并将索引复制到 `public/pagefind/`。
- build 在 Pagefind 运行前通过 `scripts/clean-pagefind.mjs` 清理 Astro 从 public 复制来的旧索引，避免删除或转回草稿的文章留下旧搜索文件。结尾通过 `scripts/sync-pagefind.mjs` 使用 Node.js 文件 API 同步索引，支持 Windows、macOS 和 Linux，无需配置 Unix shell。同步前先确认新索引存在，再替换生成目录 `public/pagefind/`。
- 不为局部修改执行全库 `pnpm format`；需要格式化时仅处理本次修改文件。
- 文本换行遵循 `.gitattributes` 的 LF 规则，与 Prettier 一致；不要通过修改全局 Git 配置解决本仓库格式问题。

## 目录与配置

- `src/content/posts/`：文章 `.md` / `.mdx`；`src/content/pages/`：About 等内容页面。
- `src/content.config.ts`：文章与页面字段校验；修改字段前先核对此处。
- `astro-paper.config.ts`：站点身份、语言、时区和主题功能；`astro.config.ts`：Astro 集成与构建配置。
- `src/components/`、`src/layouts/`、`src/pages/`：组件、布局与路由；`src/styles/`：样式。
- `src/assets/images/`：需要导入并由 Astro 处理的图片；`public/`：按原路径发布的静态文件，引用时不带 `public/` 前缀。
- `dist/`、`.astro/`、`public/pagefind/` 为生成内容，不手工维护或提交；`node_modules/` 不提交。

## 写作与内容维护

- 新文章默认 `draft: true`；用户已经要求发布的文章按发布任务处理。草稿会被当前 `postFilter` 过滤，本地开发也不展示；预览正文时可临时改为 `false`，交付前核对最终状态。
- 文章 frontmatter 必填 `title`、`description`、`pubDatetime`；`author` 与 `tags` 有默认值，但文章应填写有意义的标签。
- `pubDatetime` 使用带时区的 ISO 日期时间；更新已发布文章时保留原发布日期，按需设置 `modDatetime`。
- 日期字段兼容 YAML Date 与带时区 ISO 字符串；`modDatetime` 可以留空，非法日期仍报错。修改日期校验后运行 `node --test scripts/check-content-dates.mjs`。
- 可选字段包括 `featured`、`draft`、`ogImage`、`canonicalURL`、`hideEditPost`、`timezone`，不要自行添加 schema 未定义的约定。
- 当前站点语言为 `zh-CN`，时区为 `Asia/Singapore`；保持现有设置，时区需求变更时再一起调整。
- 生产构建按发布时间及配置的提前量过滤文章；未来日期不会自行触发重新部署，需要后续构建才会更新线上内容。
- 文章子目录会参与 URL；调整已发布文件名、目录或路由前检查已有链接，并处理必要的兼容跳转。
- 内容加载器排除文件名以 `_` 开头的文章；新建文件应遵循现有命名习惯。
- 图片补充有意义的替代文本，按实际展示尺寸压缩；引用图片、代码或资料时保留必要署名和来源。

## 修改与验证

- 先查看 Git 状态和相关实现，保留已有未提交改动；只修改当前任务相关文件。
- 普通文字修改检查 frontmatter、链接和格式；涉及新文章、MDX、图片或页面时再预览对应页面。
- 涉及组件、样式、路由或构建配置时，按影响范围运行检查与构建，并检查移动端、桌面端及明暗主题。
- 涉及搜索时完成构建后验证 Pagefind；仅运行开发服务器不能证明最新搜索索引可用。
- 当前 CI 对 PR 执行 lint、format:check 和 build；准备提交 PR 的代码变更应满足这些检查。
- `.prettierignore` 有白名单并忽略 MDX，格式检查通过不代表所有文件都被检查；必要时单独核验修改文件。
- 本项目没有 `test` 脚本；不要假定存在自动化单测。交付时说明实际完成的检查、结果及未验证项。

## GitHub 与发布

- 提交围绕单一目的组织，保留 pnpm 锁文件与依赖声明的一致性；避免夹带生成物和无关格式化。
- `.github/workflows/deploy.yml` 在推送到 `main` 或手动触发时部署 GitHub Pages，推送 `main` 属于发布操作。
- 按用户本次任务已授权的范围执行提交、推送和发布；仅要求本地修改时，交付本地结果。
- 发布前核对目标分支、文章草稿状态、最终页面、资源路径与站点 URL；发布后检查工作流结果和线上页面。
- 归档以项目 `Blog` 为单位增加日期时间快照，记录对应 Git 提交；归档内容保存在仓库外，避免回写成站点内容。
