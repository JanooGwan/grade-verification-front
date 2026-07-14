const BASE_URL = import.meta.env.VITE_API_PATH;

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
  return `${baseUrl.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`;
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

export const apiClient = {
  get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, body: unknown) => request<T>(endpoint, { method: 'POST', body }),
  put: <T>(endpoint: string, body: unknown) => request<T>(endpoint, { method: 'PUT', body }),
  delete: (endpoint: string) => request<void>(endpoint, { method: 'DELETE' }),
};
