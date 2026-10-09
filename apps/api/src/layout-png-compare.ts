import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

/** Max fraction of differing pixels allowed (anti-alias / font). */
export const LAYOUT_SHOT_MAX_DIFF = 0.012;

export function comparePngBuffers(
  actual: Buffer,
  expected: Buffer,
): { ok: boolean; diffRatio: number; width: number; height: number } {
  const imgA = PNG.sync.read(actual);
  const imgB = PNG.sync.read(expected);
  if (imgA.width !== imgB.width || imgA.height !== imgB.height) {
    return {
      ok: false,
      diffRatio: 1,
      width: imgA.width,
      height: imgA.height,
    };
  }
  const { width, height } = imgA;
  const diff = new PNG({ width, height });
  const mismatched = pixelmatch(imgA.data, imgB.data, diff.data, width, height, {
    threshold: 0.15,
  });
  const diffRatio = mismatched / (width * height);
  return { ok: diffRatio <= LAYOUT_SHOT_MAX_DIFF, diffRatio, width, height };
}
