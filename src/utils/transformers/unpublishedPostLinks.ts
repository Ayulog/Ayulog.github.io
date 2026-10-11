import { readFile, readdir } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";
import {
  createMarkdownProcessor,
  isUnifiedProcessor,
  parseFrontmatter,
  type RehypePlugin,
} from "@astrojs/markdown-remark";
import { postRedirects } from "../../data/postRedirects.ts";
import { slugifyStr } from "../slugify.ts";

type PostIndexOptions = {
  postsDirectory: URL;
  scheduledPostMargin: number;
  now?: number;
  redirects?: readonly { from: string; to: string }[];
};

type LinkOptions = { paths: string[]; base: string };
type MarkdownTree = Parameters<Exclude<ReturnType<RehypePlugin>, void>>[0];
type MarkdownNode = MarkdownTree | MarkdownTree["children"][number];

async function articleFiles(directory: string, parent = ""): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const relative = parent ? `${parent}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(
        ...(await articleFiles(join(directory, entry.name), relative))
      );
    } else if (
      entry.isFile() &&
      !entry.name.startsWith("_") &&
      /\.(md|mdx)$/.test(entry.name)
    ) {
      files.push(relative);
    }
  }
  return files;
}

export async function getUnpublishedPostPaths({
  postsDirectory,
  scheduledPostMargin,
  now = Date.now(),
  redirects = postRedirects,
}: PostIndexOptions): Promise<Set<string>> {
  const directory = fileURLToPath(postsDirectory);
  const paths = new Set<string>();
  const hiddenIds = new Set<string>();
  const renderer = await createMarkdownProcessor({
    syntaxHighlight: false,
    smartypants: false,
  });
  const slugCache = new Map<string, string>();

  // Astro's glob loader uses GitHub slugs for IDs. Reuse its public heading
  // renderer so punctuation, Unicode and underscores follow the same rules.
  const loaderSlug = async (segment: string) => {
    if (!slugCache.has(segment)) {
      // Entities keep filenames literal rather than interpreting Markdown.
      const escaped = [...segment]
        .map(character => `&#${character.codePointAt(0)};`)
        .join("");
      const result = await renderer.render(`# ${escaped}`);
      slugCache.set(segment, result.metadata.headings[0].slug);
    }
    return slugCache.get(segment)!;
  };

  for (const relative of await articleFiles(directory)) {
    const { frontmatter } = parseFrontmatter(
      await readFile(join(directory, relative), "utf8")
    );
    const date = frontmatter.pubDatetime;
    const publishedAt =
      date instanceof Date ? date.getTime() : Date.parse(date);
    // Keep the same strict comparison and scheduling margin as postFilter.
    if (!frontmatter.draft && now > publishedAt - scheduledPostMargin) continue;

    const parts = relative.slice(0, -extname(relative).length).split("/");
    const id =
      typeof frontmatter.slug === "string" && frontmatter.slug
        ? frontmatter.slug
        : (await Promise.all(parts.map(loaderSlug)))
            .join("/")
            .replace(/\/index$/, "");
    hiddenIds.add(id);

    // Match getPostPaths: original directory segments use the blog's slugger,
    // underscore directories are omitted, and only the final ID segment is used.
    const parents = parts
      .slice(0, -1)
      .filter(part => !part.startsWith("_"))
      .map(slugifyStr);
    paths.add(`/posts/${[...parents, id.split("/").at(-1)!].join("/")}`);
  }
  for (const redirect of redirects) {
    if (hiddenIds.has(redirect.to)) paths.add(`/posts/${redirect.from}`);
  }
  return paths;
}

export const rehypeUnpublishedPostLinks: RehypePlugin<[LinkOptions]> =
  function ({ paths, base }) {
    const unpublished = new Set(paths);
    const prefix = base.replace(/\/+$/, "");
    const isUnpublished = (href: string) => {
      // The blog's article links use root-relative paths. Keep external links,
      // relative document links and fragments untouched.
      if (!href.startsWith("/") || href.startsWith("//")) return false;
      try {
        let pathname = decodeURIComponent(href.split(/[?#]/)[0]).replace(
          /\/+$/,
          ""
        );
        if (prefix && pathname.startsWith(`${prefix}/`)) {
          pathname = pathname.slice(prefix.length);
        }
        return unpublished.has(pathname);
      } catch {
        return false;
      }
    };

    return tree => {
      const visit = (node: MarkdownNode) => {
        if (
          node.type === "element" &&
          node.tagName === "a" &&
          typeof node.properties.href === "string" &&
          isUnpublished(node.properties.href)
        ) {
          node.tagName = "span";
          node.properties = { className: ["text-muted-foreground"] };
          node.children.push({ type: "text", value: "（待发布）" });
        }
        if ("children" in node) node.children.forEach(visit);
      };
      visit(tree);
    };
  };

export function unpublishedPostLinks(
  options: PostIndexOptions
): AstroIntegration {
  return {
    name: "unpublished-post-links",
    hooks: {
      "astro:config:setup": async ({ command, config }) => {
        if (command !== "build") return;
        const processor = config.markdown.processor;
        if (!isUnifiedProcessor(processor)) {
          throw new Error(
            "unpublished-post-links requires the unified processor"
          );
        }
        const paths = await getUnpublishedPostPaths(options);
        // An array keeps the options serializable for Markdown cache keys.
        processor.options.rehypePlugins.push([
          rehypeUnpublishedPostLinks,
          { paths: [...paths].sort(), base: config.base },
        ]);
      },
    },
  };
}
