import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearPendingUploadFiles,
  getPendingUploadFiles,
  stashPendingUploadFiles,
} from "./pending-uploads";

afterEach(() => {
  clearPendingUploadFiles();
  vi.unstubAllGlobals();
});

describe("pending-uploads", () => {
  it("keeps files across repeated get calls (Strict Mode remount)", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "a.png", { type: "image/png" });
    await stashPendingUploadFiles([file]);
    expect(getPendingUploadFiles()).toHaveLength(1);
    expect(getPendingUploadFiles()[0]?.name).toBe("a.png");
    clearPendingUploadFiles();
    expect(getPendingUploadFiles()).toHaveLength(0);
  });

  it("persists to sessionStorage when FileReader is available", async () => {
    const store = new Map<string, string>();
    vi.stubGlobal("sessionStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
    });
    vi.stubGlobal(
      "FileReader",
      class {
        result: string | null = null;
        onload: ((ev: ProgressEvent<FileReader>) => void) | null = null;
        onerror: ((ev: ProgressEvent<FileReader>) => void) | null = null;
        readAsDataURL(_blob: Blob) {
          this.result = "data:image/webp;base64,CQ==";
          queueMicrotask(() => this.onload?.({} as ProgressEvent<FileReader>));
        }
      },
    );

    const file = new File([new Uint8Array([9])], "b.webp", { type: "image/webp" });
    await stashPendingUploadFiles([file]);
    expect(store.get("pokazo:pending-uploads")).toContain("b.webp");

    clearPendingUploadFiles();
    expect(store.has("pokazo:pending-uploads")).toBe(false);
  });
});
