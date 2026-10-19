import axios from 'axios';

interface ApiErrorBody {
  code?: unknown;
  message?: unknown;
  localized?: unknown;
  params?: unknown;
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

const ERROR_TRANSLATION_KEYS: Record<string, string> = {
  CATEGORY_IN_USE: 'apiErrors.categoryInUse',
  MOVEMENT_CLOSED_PERIOD: 'apiErrors.movementClosedPeriod',
  MOVEMENT_MANAGED_BY_GOAL: 'apiErrors.movementManagedByGoal',
  BUDGET_HAS_POOL_TRANSACTIONS: 'apiErrors.budgetHasPoolTransactions',
  BUDGET_CLOSED_PERIOD_OVERLAP: 'apiErrors.closedPeriodOverlap',
  GOAL_HAS_FUNDS: 'apiErrors.goalHasFunds',
  BUDGET_ADVANCED_MODE_DISABLED: 'apiErrors.advancedBudgetsDisabled',
  BUDGET_ADVANCED_MODE_REQUIRED: 'apiErrors.advancedBudgetModeRequired',
  BUDGET_MODE_INDEPENDENTS_ACTIVE: 'apiErrors.independentBudgetsMustBeResolved',
  BUDGET_GLOBAL_ALREADY_ACTIVE: 'apiErrors.globalBudgetAlreadyActive',
  BUDGET_CATEGORY_ALREADY_ACTIVE: 'apiErrors.categoryBudgetAlreadyActive',
  BUDGET_INSUFFICIENT_CAPACITY: 'apiErrors.insufficientBudgetCapacity',
  BUDGET_PARENT_STALE: 'apiErrors.budgetParentChanged',
  BUDGET_ALREADY_LINKED: 'apiErrors.budgetAlreadyLinked',
  BUDGET_GLOBAL_NOT_ACTIVE: 'apiErrors.globalBudgetNotActive',
  BUDGET_CATEGORY_NOT_ACTIVE: 'apiErrors.categoryBudgetNotActive',
  BUDGET_ADOPTION_STALE: 'apiErrors.budgetAdoptionChanged',
  BUDGET_ADOPTION_DUPLICATE_IDS: 'apiErrors.invalidBudgetSelection',
  BUDGET_CLOSED: 'apiErrors.budgetClosed',
  BUDGET_MODE_CHANGE_NOT_ALLOWED: 'apiErrors.budgetModeChangeNotAllowed',
  BUDGET_SCOPE_CHANGE_NOT_ALLOWED: 'apiErrors.budgetScopeChangeNotAllowed',
  BUDGET_LINKED_PERIOD_MISMATCH: 'apiErrors.linkedPeriodMismatch',
  BUDGET_NOT_STARTED: 'apiErrors.budgetNotStarted',
  CONCURRENT_MODIFICATION: 'apiErrors.concurrentModification',
  DATA_INTEGRITY_CONFLICT: 'apiErrors.dataConflict',
  OPERATION_TIMEOUT: 'apiErrors.operationTimeout',
  REPORT_BUSY: 'apiErrors.reportBusy',
};

type Translator = (key: string, params?: Record<string, string | number>) => string;

function translatedMessage(body: ApiErrorBody | undefined, fallback: string, translate?: Translator): string {
  if (body?.localized === true) return safeMessage(body.message, fallback);
  if (typeof body?.code !== 'string' || !translate) return fallback;
  const key = ERROR_TRANSLATION_KEYS[body.code];
  if (!key) return fallback;
  const params = body.params && typeof body.params === 'object'
    ? Object.fromEntries(Object.entries(body.params as Record<string, unknown>)
        .filter((entry): entry is [string, string | number] =>
          typeof entry[1] === 'string' || typeof entry[1] === 'number'))
    : undefined;
  return translate(key, params);
}

export function getApiErrorMessage(error: unknown, fallback: string, translate?: Translator): string {
  if (translate && error instanceof Error) {
    if ('code' in error && error.code === 'SESSION_SYNC_UNAVAILABLE') return translate('apiErrors.sessionSyncUnavailable');
    if ('code' in error && error.code === 'SESSION_LOGOUT_PENDING') return translate('auth.logoutNotConfirmed');
    if (error.name === 'TimeoutError') return translate('apiErrors.operationTimeout');
  }
  if (!axios.isAxiosError<ApiErrorBody>(error)) {
    return fallback;
  }
  if (translate && (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT')) {
    return translate('apiErrors.operationTimeout');
  }
  const body = error.response?.data;
  return translatedMessage(body, fallback, translate);
}

export async function getApiErrorMessageAsync(error: unknown, fallback: string, translate?: Translator): Promise<string> {
  if (axios.isAxiosError(error) && (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT')) {
    return getApiErrorMessage(error, fallback, translate);
  }
  if (!axios.isAxiosError<ApiErrorBody | Blob>(error)) {
    return fallback;
  }

  const body = error.response?.data;
  if (!(body instanceof Blob)) {
    return translatedMessage(body, fallback, translate);
  }
  if (body.size === 0 || body.size > MAX_ERROR_BODY_BYTES) {
    return fallback;
  }

  try {
    const parsed: unknown = JSON.parse(await body.text());
    if (!parsed || typeof parsed !== 'object') return fallback;
    const parsedBody = parsed as ApiErrorBody;
    return translatedMessage(parsedBody, fallback, translate);
  } catch {
    return fallback;
  }
}
