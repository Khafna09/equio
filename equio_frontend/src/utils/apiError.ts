import axios from 'axios';

interface ApiErrorBody {
  message?: unknown;
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError<ApiErrorBody>(error)) {
    return fallback;
  }
  const message = error.response?.data?.message;
  return typeof message === 'string' && message.trim() ? message : fallback;
}
