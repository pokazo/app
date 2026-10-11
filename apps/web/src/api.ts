export const apiUrl = (path: string) => {
  const base = import.meta.env.VITE_API_URL ?? "";
  return `${base}${path}`;
};

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData = typeof FormData !== "undefined" && init?.body instanceof FormData;
  const res = await fetch(apiUrl(path), {
    credentials: "include",
    ...init,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = new Error(String(res.status));
    (err as Error & { status: number }).status = res.status;
    throw err;
  }
  return res.json() as Promise<T>;
}

export type Me = { user: { id: string; email: string; name: string } };

export function getMe() {
  return api<Me>("/api/auth/get-session");
}
