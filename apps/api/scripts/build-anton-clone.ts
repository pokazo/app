import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { buildSlidev, ensureDeckNodeModules, installDeckLayouts, writeSlides } from "../src/slidev.ts";

const dir = join(process.cwd(), "../../data/decks/anton-clone");

async function main() {
  const md = await readFile(join(dir, "slides.md"), "utf8");
  await writeSlides(dir, md, "default");
  installDeckLayouts(dir);
  ensureDeckNodeModules(dir);
  await buildSlidev(dir, "/p/anton-clone/");
  console.log("built", dir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
