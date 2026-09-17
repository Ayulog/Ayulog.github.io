import { access, cp, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const source = new URL("../dist/pagefind/", import.meta.url);
const destination = fileURLToPath(
  new URL("../public/pagefind/", import.meta.url)
);

// Check the generated index before replacing the development copy.
await access(new URL("pagefind.js", source));
await rm(destination, { recursive: true, force: true });
await cp(source, destination, { recursive: true });
