import { format } from 'date-fns';

export type BudgetCatchUpOption = 'RETROACTIVE' | 'FROM_TODAY';

interface FixedBudgetPeriodInput {
  today: Date;
  renewDay: number;
  catchUpOption: BudgetCatchUpOption;
  advancedMode: boolean;
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
  advancedMode,
}: FixedBudgetPeriodInput): FixedBudgetPeriod {
  const todayDay = today.getDate();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const effectiveOption = !advancedMode && renewDay === todayDay
    ? 'FROM_TODAY'
    : catchUpOption;

  if (effectiveOption === 'RETROACTIVE') {
    if (advancedMode) {
      return {
        startDate: format(new Date(currentYear, currentMonth, 1), 'yyyy-MM-dd'),
        endDate: format(new Date(currentYear, currentMonth + 1, 0), 'yyyy-MM-dd'),
        retroactive: true,
      };
    }

    const cycleStart = renewDay > todayDay
      ? new Date(currentYear, currentMonth - 1, renewDay)
      : new Date(currentYear, currentMonth, renewDay);
    const cycleEnd = new Date(cycleStart);
    cycleEnd.setMonth(cycleEnd.getMonth() + 1);
    cycleEnd.setDate(cycleEnd.getDate() - 1);

    return {
      startDate: format(cycleStart, 'yyyy-MM-dd'),
      endDate: format(cycleEnd, 'yyyy-MM-dd'),
      retroactive: true,
    };
  }

  const nextCycleStart = renewDay > todayDay
    ? new Date(currentYear, currentMonth, renewDay)
    : new Date(currentYear, currentMonth + 1, renewDay);
  const firstCycleEnd = new Date(nextCycleStart);
  firstCycleEnd.setDate(firstCycleEnd.getDate() - 1);

  return {
    startDate: format(today, 'yyyy-MM-dd'),
    endDate: format(firstCycleEnd, 'yyyy-MM-dd'),
    retroactive: false,
  };
}
