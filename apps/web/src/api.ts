export const apiUrl = (path: string) => {
  const base = import.meta.env.VITE_API_URL ?? "";
  return `${base}${path}`;
};

export class ApiError<T = unknown> extends Error {
  constructor(
    public status: number,
    public body: T | null,
  ) {
    super(String(status));
    this.name = "ApiError";
  }
}

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
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body);
  }
  return res.json() as Promise<T>;
}

export type Me = { user: { id: string; email: string; name: string } };

export function getMe() {
  return api<Me>("/api/auth/get-session");
}
