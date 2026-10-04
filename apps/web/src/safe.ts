export function isSafePath(next: string | null): string {
  if (!next) return "/app";
  return /^\/[\w\-/?=&%]*$/.test(next) ? next : "/app";
}

export function apiUrl(path: string) {
  const base = import.meta.env.VITE_API_URL ?? "";
  return `${base}${path}`;
}
