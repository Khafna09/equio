import { describe, expect, it } from 'vitest';
import { calculateFixedBudgetPeriod } from './budgetPeriod';

const TODAY = new Date(2026, 7, 16, 12, 0, 0);

describe('calculateFixedBudgetPeriod', () => {
  it('uses the current cycle when the normal renewal day already passed', () => {
    expect(calculateFixedBudgetPeriod({
      today: TODAY,
      renewDay: 10,
      catchUpOption: 'RETROACTIVE',
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
    })).toEqual({
      startDate: '2026-07-20',
      endDate: '2026-08-19',
      retroactive: true,
    });
  });

  it('uses the selected monthly day in advanced retroactive mode too', () => {
    expect(calculateFixedBudgetPeriod({
      today: TODAY,
      renewDay: 20,
      catchUpOption: 'RETROACTIVE',
    })).toEqual({
      startDate: '2026-07-20',
      endDate: '2026-08-19',
      retroactive: true,
    });
  });

  it('starts today and ends before the next renewal day', () => {
    expect(calculateFixedBudgetPeriod({
      today: TODAY,
      renewDay: 20,
      catchUpOption: 'FROM_TODAY',
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
    })).toEqual({
      startDate: '2026-08-16',
      endDate: '2026-09-15',
      retroactive: false,
    });
  });

  it('clamps day 31 to non-leap February and restores it in March', () => {
    expect(calculateFixedBudgetPeriod({
      today: new Date(2026, 1, 28, 12),
      renewDay: 31,
      catchUpOption: 'RETROACTIVE',
    })).toEqual({
      startDate: '2026-02-28',
      endDate: '2026-03-30',
      retroactive: false,
    });

    expect(calculateFixedBudgetPeriod({
      today: new Date(2026, 2, 31, 12),
      renewDay: 31,
      catchUpOption: 'RETROACTIVE',
    })).toEqual({
      startDate: '2026-03-31',
      endDate: '2026-04-29',
      retroactive: false,
    });
  });

  it('uses leap day for anchors 29 through 31', () => {
    expect(calculateFixedBudgetPeriod({
      today: new Date(2028, 1, 20, 12),
      renewDay: 31,
      catchUpOption: 'FROM_TODAY',
    })).toEqual({
      startDate: '2028-02-20',
      endDate: '2028-02-28',
      retroactive: false,
    });
  });

  it('keeps a retroactive day-31 cycle contiguous across a short month', () => {
    expect(calculateFixedBudgetPeriod({
      today: new Date(2026, 1, 20, 12),
      renewDay: 31,
      catchUpOption: 'RETROACTIVE',
    })).toEqual({
      startDate: '2026-01-31',
      endDate: '2026-02-27',
      retroactive: true,
    });
  });
});
