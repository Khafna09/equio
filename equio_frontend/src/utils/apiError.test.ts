import { describe, expect, it } from 'vitest';
import { getApiErrorMessage, getApiErrorMessageAsync } from './apiError';

function axiosError(data: unknown) {
  return {
    isAxiosError: true,
    response: { data },
  };
}

describe('getApiErrorMessage', () => {
  it('uses the translated client fallback for diagnostic server messages', () => {
    expect(getApiErrorMessage(
      axiosError({ message: 'El presupuesto ya está cerrado.' }),
      'The budget operation could not be completed.',
    )).toBe('The budget operation could not be completed.');
  });

  it('accepts a server message only when the API marks it as localized', () => {
    expect(getApiErrorMessage(
      axiosError({ message: 'The budget is already closed.', localized: true }),
      'Fallback',
    )).toBe('The budget is already closed.');
  });

  it('rejects unsafe localized messages', () => {
    expect(getApiErrorMessage(
      axiosError({ message: 'Invalid\u0000message', localized: true }),
      'Fallback',
    )).toBe('Fallback');
  });

  it('translates stable API error codes without exposing diagnostic messages', () => {
    const translate = (key: string) => `translated:${key}`;
    expect(getApiErrorMessage(
      axiosError({
        code: 'BUDGET_INSUFFICIENT_CAPACITY',
        message: 'Internal diagnostic details',
        localized: false,
      }),
      'Fallback',
      translate,
    )).toBe('translated:apiErrors.insufficientBudgetCapacity');
  });

  it('translates network and database timeouts, including PDF error bodies', async () => {
    const translate = (key: string) => `translated:${key}`;
    const expected = 'translated:apiErrors.operationTimeout';
    expect(getApiErrorMessage({ isAxiosError: true, code: 'ECONNABORTED' }, 'Fallback', translate)).toBe(expected);
    expect(getApiErrorMessage(axiosError({ code: 'OPERATION_TIMEOUT' }), 'Fallback', translate)).toBe(expected);
    expect(await getApiErrorMessageAsync(axiosError(new Blob(['{"code":"OPERATION_TIMEOUT"}'])), 'Fallback', translate)).toBe(expected);
  });

  it('explains unsupported session synchronization without exposing internal errors', () => {
    const error = Object.assign(new Error('Private browser diagnostic'), { code: 'SESSION_SYNC_UNAVAILABLE' });
    expect(getApiErrorMessage(error, 'Fallback', (key) => key)).toBe('apiErrors.sessionSyncUnavailable');
  });

  it('explains an unconfirmed logout without exposing diagnostics', () => {
    const error = Object.assign(new Error('Private diagnostic'), { code: 'SESSION_LOGOUT_PENDING' });
    expect(getApiErrorMessage(error, 'Fallback', (key) => key)).toBe('auth.logoutNotConfirmed');
  });
});
