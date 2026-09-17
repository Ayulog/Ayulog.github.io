import { rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// Astro copies the previous development index from public into dist.
// Remove it before indexing so withdrawn posts leave no stale search files.
const generatedIndex = fileURLToPath(
  new URL("../dist/pagefind/", import.meta.url)
);
await rm(generatedIndex, { recursive: true, force: true });
