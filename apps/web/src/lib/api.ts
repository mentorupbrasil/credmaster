'use client';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api';
const BASE = `${API_URL}/v1`;

const ACCESS_KEY = 'cm_access';
const USER_KEY = 'cm_user';

export interface SessionUser {
  id: string;
  email: string;
  nome: string;
  role: 'ADMIN' | 'ANALISTA' | 'CLIENTE';
  clienteId: string | null;
}

/**
 * O refresh token é mantido em cookie httpOnly (definido pela API) e NUNCA
 * é exposto ao JavaScript. Aqui guardamos apenas o access token (curta
 * duração) e os dados públicos do usuário.
 */
export const tokenStore = {
  get access() {
    return typeof window !== 'undefined' ? localStorage.getItem(ACCESS_KEY) : null;
  },
  get user(): SessionUser | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  },
  save(access: string, user: SessionUser) {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  const access = tokenStore.access;
  if (access) headers.Authorization = `Bearer ${access}`;

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (res.status === 401 && retry) {
    const refreshed = await tryRefresh();
    if (refreshed) return request<T>(path, options, false);
  }

  const text = await res.text();
  const body = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const msg = body?.message
      ? Array.isArray(body.message)
        ? body.message.join(', ')
        : body.message
      : `Erro ${res.status}`;
    throw new ApiError(res.status, msg);
  }
  return body as T;
}

let refreshing: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  // Coalesce múltiplos refreshes concorrentes em uma só chamada.
  if (refreshing) return refreshing;
  refreshing = (async () => {
    try {
      const res = await fetch(`${BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        credentials: 'include',
      });
      if (!res.ok) {
        tokenStore.clear();
        return false;
      }
      const data = await res.json();
      tokenStore.save(data.accessToken, data.user);
      return true;
    } catch {
      tokenStore.clear();
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),

  /** Simulação pública (não requer autenticação). */
  async simularPublico(payload: {
    valorPrincipal: number;
    taxaJurosMes: number;
    tipoAmortizacao: string;
    prazoMeses: number;
    diaVencimento: number;
  }) {
    const res = await fetch(`${BASE}/emprestimos/simular-publico`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok)
      throw new ApiError(res.status, data?.message ?? 'Falha na simulação');
    return data;
  },

  async login(email: string, senha: string) {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha }),
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new ApiError(res.status, data?.message ?? 'Falha no login');
    tokenStore.save(data.accessToken, data.user);
    return data.user as SessionUser;
  },

  async register(payload: {
    nome: string;
    email: string;
    senha: string;
    cpf: string;
    telefone: string;
  }) {
    const res = await fetch(`${BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new ApiError(res.status, data?.message ?? 'Falha no cadastro');
    tokenStore.save(data.accessToken, data.user);
    return data.user as SessionUser;
  },

  async esqueciSenha(email: string) {
    const res = await fetch(`${BASE}/auth/esqueci-senha`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok)
      throw new ApiError(res.status, data?.message ?? 'Falha na solicitação');
    return data;
  },

  logout() {
    void request('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({}),
    }).catch(() => undefined);
    tokenStore.clear();
  },
};
