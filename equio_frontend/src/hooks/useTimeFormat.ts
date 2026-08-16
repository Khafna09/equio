import { format } from 'date-fns';
import { useProfile } from './useProfile';

export type TimeFormat = '12' | '24';

export function useTimeFormat() {
  const { profile } = useProfile();
  const timeFormat: TimeFormat = profile?.timeFormat === '12' ? '12' : '24';

  return {
    timeFormat,
    is24Hour: timeFormat === '24',
    formatTime: (date: Date) => format(date, timeFormat === '24' ? 'HH:mm' : 'h:mm a'),
  };
}
