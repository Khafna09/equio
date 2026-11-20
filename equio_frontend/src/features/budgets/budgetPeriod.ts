import { format } from 'date-fns';

export type BudgetCatchUpOption = 'RETROACTIVE' | 'FROM_TODAY';

interface FixedBudgetPeriodInput {
  today: Date;
  renewDay: number;
  catchUpOption: BudgetCatchUpOption;
}

interface FixedBudgetPeriod {
  startDate: string;
  endDate: string;
  retroactive: boolean;
}

export function calculateFixedBudgetPeriod({
  today,
  renewDay,
  catchUpOption,
}: FixedBudgetPeriodInput): FixedBudgetPeriod {
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const currentAnchor = anchoredDate(currentYear, currentMonth, renewDay);
  const isRenewalToday = isSameCalendarDay(currentAnchor, today);
  const effectiveOption = isRenewalToday
    ? 'FROM_TODAY'
    : catchUpOption;

  if (effectiveOption === 'RETROACTIVE') {
    const cycleStart = currentAnchor.getTime() > startOfDay(today).getTime()
      ? anchoredDate(currentYear, currentMonth - 1, renewDay)
      : currentAnchor;
    const cycleEnd = addDays(nextAnchoredDate(cycleStart, renewDay), -1);

    return {
      startDate: format(cycleStart, 'yyyy-MM-dd'),
      endDate: format(cycleEnd, 'yyyy-MM-dd'),
      retroactive: true,
    };
  }

  const nextCycleStart = currentAnchor.getTime() > startOfDay(today).getTime()
    ? currentAnchor
    : anchoredDate(currentYear, currentMonth + 1, renewDay);
  const firstCycleEnd = addDays(nextCycleStart, -1);

  return {
    startDate: format(today, 'yyyy-MM-dd'),
    endDate: format(firstCycleEnd, 'yyyy-MM-dd'),
    retroactive: false,
  };
}

function anchoredDate(year: number, month: number, renewDay: number): Date {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(renewDay, lastDay));
}

function nextAnchoredDate(date: Date, renewDay: number): Date {
  return anchoredDate(date.getFullYear(), date.getMonth() + 1, renewDay);
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isSameCalendarDay(left: Date, right: Date): boolean {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}
