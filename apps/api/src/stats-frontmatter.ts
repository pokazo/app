/** Slidev layout `stats.vue` reads `items`; models often emit `stats`. Prefer items. */
export function normalizeStatsFrontmatter(md: string): string {
  return md.replace(
    /^---\n([\s\S]*?)\n---/gm,
    (block, fm: string) => {
      if (!/^layout:\s*stats\s*$/m.test(fm)) return block;
      if (/^items:\s*$/m.test(fm) || /^items:\s*\n/m.test(fm)) return block;
      if (!/^stats:\s*$/m.test(fm) && !/^stats:\s*\n/m.test(fm)) return block;
      return `---\n${fm.replace(/^stats:/m, "items:")}\n---`;
    },
  );
}
