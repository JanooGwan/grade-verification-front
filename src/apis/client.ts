const BASE_URL = import.meta.env.VITE_API_PATH;
const ADMIN_API_KEY = import.meta.env.VITE_ADMIN_API_KEY;

if (!BASE_URL) {
  throw new Error('VITE_API_PATH 환경변수가 설정되지 않았습니다.');
}

export interface ApiErrorResponse {
  code: string;
  message: string;
  fieldErrors: Record<string, string>;
  timestamp: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly response?: ApiErrorResponse;

  constructor(status: number, message: string, response?: ApiErrorResponse) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.response = response;
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

function joinUrl(baseUrl: string, endpoint: string) {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');
  let normalizedEndpoint = endpoint.replace(/^\/+/, '');
  if (normalizedBaseUrl.endsWith('/api') && (normalizedEndpoint === 'api' || normalizedEndpoint.startsWith('api/'))) {
    normalizedEndpoint = normalizedEndpoint.slice(3).replace(/^\/+/, '');
  }
  return normalizedEndpoint ? `${normalizedBaseUrl}/${normalizedEndpoint}` : normalizedBaseUrl;
}

async function parseErrorResponse(response: Response): Promise<ApiErrorResponse | undefined> {
  const contentType = response.headers.get('Content-Type') ?? '';
  if (!contentType.includes('application/json')) {
    return undefined;
  }

  try {
    return (await response.json()) as ApiErrorResponse;
  } catch {
    return undefined;
  }
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, ...requestInit } = options;
  const response = await fetch(joinUrl(BASE_URL, endpoint), {
    ...requestInit,
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(ADMIN_API_KEY ? { 'X-Admin-Key': ADMIN_API_KEY } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    const errorResponse = await parseErrorResponse(response);
    throw new ApiError(response.status, errorResponse?.message ?? 'API 요청에 실패했습니다.', errorResponse);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function requestForm<T>(endpoint: string, formData: FormData): Promise<T> {
  const response = await fetch(joinUrl(BASE_URL, endpoint), {
    method: 'POST',
    headers: ADMIN_API_KEY ? { 'X-Admin-Key': ADMIN_API_KEY } : undefined,
    body: formData,
  });
  if (!response.ok) {
    const errorResponse = await parseErrorResponse(response);
    throw new ApiError(response.status, errorResponse?.message ?? 'API 요청에 실패했습니다.', errorResponse);
  }
  return (await response.json()) as T;
}

export const apiClient = {
  get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, body: unknown) => request<T>(endpoint, { method: 'POST', body }),
  postForm: <T>(endpoint: string, formData: FormData) => requestForm<T>(endpoint, formData),
  put: <T>(endpoint: string, body: unknown) => request<T>(endpoint, { method: 'PUT', body }),
  patch: <T>(endpoint: string, body: unknown) => request<T>(endpoint, { method: 'PATCH', body }),
  delete: (endpoint: string) => request<void>(endpoint, { method: 'DELETE' }),
};
