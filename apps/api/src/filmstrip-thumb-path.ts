/** Legacy public path under dist: `/thumbs/3.webp` for Slidev page 3. */
export function filmstripThumbPath(slidevIndex: number): string {
  const n = Math.max(1, Math.floor(slidevIndex));
  return `/thumbs/${n}.webp`;
}

/** v2 filmstrip shot: `/thumbs/v2/3.webp` — new builds write here only. */
export function filmstripThumbPathV2(slidevIndex: number): string {
  const n = Math.max(1, Math.floor(slidevIndex));
  return `/thumbs/v2/${n}.webp`;
}
