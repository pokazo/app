import { copyFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { tool } from "ai";
import { z } from "zod";
import { safePublicPath } from "./assets-stock.js";
import { resolveUploadFilePath } from "./upload-images-catalog.js";
import { timedTool } from "./timing.js";

export type UploadToolAttribution = {
  source: "upload";
  path: string;
  id: string;
  originalName: string;
  photographer: string;
  attributionUrl: string;
};

export function createUploadImageUseTools(
  workDir: string,
  uploadDir: string,
  opts?: {
    onAttribution?: (entry: UploadToolAttribution) => void;
  },
): Record<string, unknown> {
  return {
    "upload-image-use": tool({
      description:
        "Copy a user-uploaded image into deck public/ for Slidev image:. Pass id from upload-image-search suggestedId (or upload-image-list). filename basename like slide-2.jpg. REQUIRED before yandex/stock when upload-image-search returned suggestedId — vague captions are OK if originalName fits.",
      parameters: z.object({
        id: z.string().describe("Upload image id, e.g. up-001"),
        filename: z.string().describe("Basename under public/, e.g. slide-2.jpg"),
      }),
      execute: async ({ id, filename }) =>
        timedTool("upload-image-use", async () => {
          const resolved = await resolveUploadFilePath(uploadDir, id);
          if (!resolved) {
            return { error: `unknown upload id ${id}`, hint: "upload-image-search again or yandex-image-search" };
          }
          try {
            const target = safePublicPath(workDir, filename);
            await mkdir(dirname(target), { recursive: true });
            await copyFile(resolved.absPath, target);
            const rel = `/${filename.replace(/^\//, "")}`;
            opts?.onAttribution?.({
              source: "upload",
              path: rel,
              id: resolved.entry.id,
              originalName: resolved.entry.originalName,
              photographer: "user upload",
              attributionUrl: "",
            });
            return {
              path: rel,
              file: filename,
              id: resolved.entry.id,
              originalName: resolved.entry.originalName,
              caption: resolved.entry.caption,
            };
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            return { error: message, hint: "try another upload id or yandex-image-search" };
          }
        }, { id, filename }),
    }),
  };
}
