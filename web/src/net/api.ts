export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    credentials: 'same-origin',
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = res.headers.get('content-type')?.includes('json') ? await res.json() : null;
  if (!res.ok) throw new ApiError(res.status, data?.error ?? `Ошибка сервера (${res.status})`);
  return data as T;
}

export const api = {
  get: <T>(url: string) => request<T>('GET', url),
  post: <T>(url: string, body?: unknown) => request<T>('POST', url, body ?? {}),
  put: <T>(url: string, body: unknown) => request<T>('PUT', url, body),
  patch: <T>(url: string, body: unknown) => request<T>('PATCH', url, body),
  del: <T>(url: string, body?: unknown) => request<T>('DELETE', url, body ?? {}),
};

export interface Me {
  id: number;
  email: string;
  name: string;
  tz: string;
  remindHour: number;
  tier: number;
  pushEnabled: boolean;
}

export interface LeagueRow {
  name: string;
  xp: number;
  me: boolean;
}

export interface League {
  week: string;
  tier: number;
  tierName: string;
  endsAt: string;
  joined: boolean;
  zones: { up: number; down: number };
  rows: LeagueRow[];
}
