/** Carry create-form image attachments across landing → login → /app (incl. OAuth). */

const STORAGE_KEY = "pokazo:pending-uploads";
const MAX_FILES = 20;

type StoredUpload = { name: string; type: string; dataUrl: string };

let memoryFiles: File[] = [];
let hydratedFromSession = false;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

function dataUrlToFile(item: StoredUpload): File {
  const comma = item.dataUrl.indexOf(",");
  const b64 = comma >= 0 ? item.dataUrl.slice(comma + 1) : item.dataUrl;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new File([bytes], item.name, { type: item.type || "application/octet-stream" });
}

function hydrateFromSession(): void {
  if (hydratedFromSession || memoryFiles.length) return;
  hydratedFromSession = true;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const items = JSON.parse(raw) as StoredUpload[];
    if (!Array.isArray(items)) return;
    memoryFiles = items.slice(0, MAX_FILES).map(dataUrlToFile);
  } catch {
    memoryFiles = [];
  }
}

export async function stashPendingUploadFiles(files: File[]): Promise<void> {
  memoryFiles = files.slice(0, MAX_FILES);
  hydratedFromSession = true;
  try {
    const payload: StoredUpload[] = await Promise.all(
      memoryFiles.map(async (f) => ({
        name: f.name,
        type: f.type || "application/octet-stream",
        dataUrl: await fileToDataUrl(f),
      })),
    );
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Quota / private mode — in-memory still covers SPA navigations.
  }
}

/** Non-destructive read (safe under React Strict Mode remount). */
export function getPendingUploadFiles(): File[] {
  hydrateFromSession();
  return memoryFiles;
}

/** Call once create has consumed the attachments. */
export function clearPendingUploadFiles(): void {
  memoryFiles = [];
  hydratedFromSession = true;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
