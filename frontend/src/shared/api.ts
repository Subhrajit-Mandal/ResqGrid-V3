export const apiBase = import.meta.env.VITE_API_URL;
export async function request<T>(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  if (!apiBase) throw new Error("Live API is not connected");
  const response = await fetch(`${apiBase}/api/v1${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Request failed" }));
    throw new Error(error.message || error.detail || "Request failed");
  }
  return response.json() as Promise<T>;
}
