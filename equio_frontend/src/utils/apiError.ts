import axios from 'axios';

interface ApiErrorBody {
  message?: unknown;
}

const MAX_ERROR_MESSAGE_LENGTH = 300;
const MAX_ERROR_BODY_BYTES = 64 * 1024;

function safeMessage(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const message = value.trim();
  const hasControlCharacter = Array.from(message)
    .some((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint <= 31 || codePoint === 127;
    });
  if (!message
      || message.length > MAX_ERROR_MESSAGE_LENGTH
      || hasControlCharacter) {
    return fallback;
  }
  return message;
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError<ApiErrorBody>(error)) {
    return fallback;
  }
  return safeMessage(error.response?.data?.message, fallback);
}

export async function getApiErrorMessageAsync(error: unknown, fallback: string): Promise<string> {
  if (!axios.isAxiosError<ApiErrorBody | Blob>(error)) {
    return fallback;
  }

  const body = error.response?.data;
  if (!(body instanceof Blob)) {
    return safeMessage(body?.message, fallback);
  }
  if (body.size === 0 || body.size > MAX_ERROR_BODY_BYTES) {
    return fallback;
  }

  try {
    const parsed: unknown = JSON.parse(await body.text());
    if (!parsed || typeof parsed !== 'object') return fallback;
    return safeMessage((parsed as ApiErrorBody).message, fallback);
  } catch {
    return fallback;
  }
}
