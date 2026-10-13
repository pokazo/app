/** Public path under dist: `/thumbs/3.webp` for Slidev page 3. */
export function filmstripThumbPath(slidevIndex: number): string {
  const n = Math.max(1, Math.floor(slidevIndex));
  return `/thumbs/${n}.webp`;
}
