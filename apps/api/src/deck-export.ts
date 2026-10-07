import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { exportSlidev, type SlidevExportFormat } from "./slidev.js";

const inflight = new Map<string, Promise<string>>();

export function isExportFormat(raw: string): raw is SlidevExportFormat {
  return raw === "pdf" || raw === "pptx";
}

export function exportArtifactName(format: SlidevExportFormat): string {
  return `export.${format}`;
}

export function exportArtifactPath(workDir: string, format: SlidevExportFormat): string {
  return join(workDir, exportArtifactName(format));
}

/** True when a cached export is newer than slides.md. */
export function isExportFresh(workDir: string, format: SlidevExportFormat): boolean {
  const artifact = exportArtifactPath(workDir, format);
  const slides = join(workDir, "slides.md");
  if (!existsSync(artifact) || !existsSync(slides)) return false;
  return statSync(artifact).mtimeMs >= statSync(slides).mtimeMs;
}

export function downloadBasename(topic: string, format: SlidevExportFormat): string {
  const base =
    topic
      .replace(/[^\p{L}\p{N}\-_ ]+/gu, "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 80) || "presentation";
  return `${base}.${format}`;
}

export function contentDisposition(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "") || `file`;
  const starred = encodeURIComponent(filename);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${starred}`;
}

export async function ensureDeckExport(
  workDir: string,
  format: SlidevExportFormat,
): Promise<string> {
  const key = `${workDir}:${format}`;
  if (isExportFresh(workDir, format)) {
    return exportArtifactPath(workDir, format);
  }
  const pending = inflight.get(key);
  if (pending) return pending;

  const job = exportSlidev(workDir, format, "export")
    .then((path) => path)
    .finally(() => {
      inflight.delete(key);
    });
  inflight.set(key, job);
  return job;
}
