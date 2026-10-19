import type { RehypePlugin } from "@astrojs/markdown-remark";

type MarkdownTree = Parameters<Exclude<ReturnType<RehypePlugin>, void>>[0];
type MarkdownNode = MarkdownTree | MarkdownTree["children"][number];

const EXTERNAL_PROTOCOL_RE = /^(?:https?:)?\/\//i;

export const rehypeExternalLinks: RehypePlugin<[{ siteUrl?: string }?]> =
  function (options = {}) {
    let siteHost = "";
    if (options?.siteUrl) {
      try {
        siteHost = new URL(options.siteUrl).hostname.toLowerCase();
      } catch {
        siteHost = "";
      }
    }

    const isExternalHref = (href: string): boolean => {
      if (!EXTERNAL_PROTOCOL_RE.test(href)) return false;
      if (!siteHost) return true;
      try {
        const parsed = new URL(href, "https://example.invalid");
        return parsed.hostname.toLowerCase() !== siteHost;
      } catch {
        return true;
      }
    };

    return tree => {
      const visit = (node: MarkdownNode) => {
        if (
          node.type === "element" &&
          node.tagName === "a" &&
          typeof node.properties?.href === "string" &&
          isExternalHref(node.properties.href)
        ) {
          node.properties.target = "_blank";
          node.properties.rel = "noopener noreferrer";
        }
        if ("children" in node) {
          node.children.forEach(visit);
        }
      };
      visit(tree);
    };
  };
