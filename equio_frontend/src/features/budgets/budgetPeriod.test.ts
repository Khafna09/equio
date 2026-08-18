import { describe, expect, it } from 'vitest';
import { calculateFixedBudgetPeriod } from './budgetPeriod';

const TODAY = new Date(2026, 7, 16, 12, 0, 0);

describe('calculateFixedBudgetPeriod', () => {
  it('uses the current cycle when the normal renewal day already passed', () => {
    expect(calculateFixedBudgetPeriod({
      today: TODAY,
      renewDay: 10,
      catchUpOption: 'RETROACTIVE',
      advancedMode: false,
    })).toEqual({
      startDate: '2026-08-10',
      endDate: '2026-09-09',
      retroactive: true,
    });
  });

  it('uses the previous cycle when the normal renewal day is still ahead', () => {
    expect(calculateFixedBudgetPeriod({
      today: TODAY,
      renewDay: 20,
      catchUpOption: 'RETROACTIVE',
      advancedMode: false,
    })).toEqual({
      startDate: '2026-07-20',
      endDate: '2026-08-19',
      retroactive: true,
    });
  });

  it('uses the complete calendar month in advanced retroactive mode', () => {
    expect(calculateFixedBudgetPeriod({
      today: TODAY,
      renewDay: 20,
      catchUpOption: 'RETROACTIVE',
      advancedMode: true,
    })).toEqual({
      startDate: '2026-08-01',
      endDate: '2026-08-31',
      retroactive: true,
    });
  });

  it('starts today and ends before the next renewal day', () => {
    expect(calculateFixedBudgetPeriod({
      today: TODAY,
      renewDay: 20,
      catchUpOption: 'FROM_TODAY',
      advancedMode: false,
    })).toEqual({
      startDate: '2026-08-16',
      endDate: '2026-08-19',
      retroactive: false,
    });
  });

  it('avoids a retroactive cycle when renewal is today in normal mode', () => {
    expect(calculateFixedBudgetPeriod({
      today: TODAY,
      renewDay: 16,
      catchUpOption: 'RETROACTIVE',
      advancedMode: false,
    })).toEqual({
      startDate: '2026-08-16',
      endDate: '2026-09-15',
      retroactive: false,
    });
  });
});
