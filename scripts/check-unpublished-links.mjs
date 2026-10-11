import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { unified } from "@astrojs/markdown-remark";
import {
  getUnpublishedPostPaths,
  unpublishedPostLinks,
} from "../src/utils/transformers/unpublishedPostLinks.ts";

test("production hides unpublished article links while development preserves them", async () => {
  const directory = await mkdtemp(join(tmpdir(), "blog-unpublished-links-"));
  const now = Date.parse("2026-10-10T12:00:00Z");
  const postsDirectory = pathToFileURL(directory + "/");
  const options = {
    postsDirectory,
    now,
    scheduledPostMargin: 15 * 60 * 1000,
    redirects: [{ from: "old-draft", to: "draft" }],
  };
  const fixtures = [
    ["draft.md", true, "2026-10-01T00:00:00Z"],
    ["future.md", false, "2026-10-11T00:00:00Z"],
    ["published.md", false, "2026-10-01T00:00:00Z"],
    ["within-margin.md", false, "2026-10-10T12:14:00Z"],
    ["at-margin.md", false, "2026-10-10T12:15:00Z"],
    ["Guides/Hello_World.md", true, "2026-10-01T00:00:00Z"],
    ["Nested/index.md", true, "2026-10-01T00:00:00Z"],
    ["_internal/Visible.md", true, "2026-10-01T00:00:00Z"],
    ["_excluded.md", true, "2026-10-01T00:00:00Z"],
    ["Custom/Original.mdx", true, "2026-10-01T00:00:00Z", "custom-id"],
  ];
  try {
    for (const [filename, draft, date, slug] of fixtures) {
      const filepath = join(directory, filename);
      await mkdir(dirname(filepath), { recursive: true });
      await writeFile(
        filepath,
        `---\ntitle: Example\ndraft: ${draft}\npubDatetime: ${date}\n${slug ? `slug: ${slug}\n` : ""}---\nContent\n`
      );
    }
    const paths = await getUnpublishedPostPaths(options);
    assert.deepEqual([...paths].sort(), [
      "/posts/at-margin",
      "/posts/custom/custom-id",
      "/posts/draft",
      "/posts/future",
      "/posts/guides/hello_world",
      "/posts/nested/nested",
      "/posts/old-draft",
      "/posts/visible",
    ]);

    const input = [
      "[**草稿**](/posts/draft/#part)",
      "[未来](/posts/future?ref=overview)",
      "[旧入口](/posts/old-draft/)",
      "[子目录](/blog/posts/guides/hello_world/)",
      "[已发布](/posts/published/)",
      "[提前量内](/posts/within-margin/)",
      "[外链](https://example.com/posts/draft/)",
      "[协议相对外链](//example.com/posts/draft/)",
      "[目录](#part)",
    ].join("\n\n");
    for (const command of ["build", "dev"]) {
      const processor = unified();
      await unpublishedPostLinks(options).hooks["astro:config:setup"]({
        command,
        config: { base: "/blog", markdown: { processor } },
      });
      const renderer = await processor.createRenderer({
        syntaxHighlight: false,
      });
      const { code } = await renderer.render(input);
      if (command === "build") {
        assert.equal((code.match(/（待发布）/g) ?? []).length, 4);
        assert.ok(code.includes("<strong>草稿</strong>（待发布）</span>"));
        assert.ok(!code.includes('href="/posts/draft/'));
        assert.ok(!code.includes('href="/posts/future'));
        assert.ok(!code.includes('href="/posts/old-draft/'));
      } else {
        assert.ok(code.includes('href="/posts/draft/#part"'));
        assert.ok(code.includes('href="/posts/future?ref=overview"'));
        assert.ok(!code.includes("待发布"));
      }
      for (const href of [
        "/posts/published/",
        "/posts/within-margin/",
        "https://example.com/posts/draft/",
        "//example.com/posts/draft/",
        "#part",
      ]) {
        assert.ok(code.includes(`href="${href}"`), `${command}: ${href}`);
      }
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
