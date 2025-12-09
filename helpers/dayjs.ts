import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isBetween from 'dayjs/plugin/isBetween';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isBetween);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

// Configure dayjs to parse dates as dates only (no time)
dayjs.prototype.toDateOnly = function () {
  return this.format('YYYY-MM-DD');
};

// Central function to handle UTC date strings consistently
// This is the single source of truth for parsing UTC date strings like '2025-08-15T00:00:00.0000Z'
export function parseUTCDateString(dateString: string): dayjs.Dayjs {
  if (!dateString) {
    return dayjs();
  }

  // Check if it's a UTC date string (contains Z or timezone offset)
  const hasTimezoneInfo = dateString.includes('Z') || /[+-]\d{2}:?\d{2}$/.test(dateString);

  if (hasTimezoneInfo) {
    // Parse as UTC and keep it as UTC, then convert to local date at 00:00:00
    const utcDate = dayjs.utc(dateString);
    // Get the UTC date components to construct a local date
    const year = utcDate.year();
    const month = utcDate.month();
    const date = utcDate.date();
    return dayjs().year(year).month(month).date(date).startOf('day');
  } else {
    // Extract just the date part to avoid timezone issues
    const dateOnly = dateString.split('T')[0];
    return dayjs(dateString, 'YYYY-MM-DD');
  }
}

// Utility function to parse date strings as dates only
// This ensures dates are treated as local calendar dates without timezone conversion
// For UTC date strings (ending in Z), we parse in UTC then extract the date
export function parseDateOnly(dateString: string | Date | null): dayjs.Dayjs | null {
  if (!dateString) return null;

  if (typeof dateString === 'string') {
    return parseUTCDateString(dateString);
  }

  // If it's already a Date object, format it as YYYY-MM-DD first
  const dateStr = dayjs(dateString).format('YYYY-MM-DD');
  return dayjs(dateStr, 'YYYY-MM-DD');
}

// Utility function to format date for display
export function formatDate(date: string | Date | dayjs.Dayjs, format: string = 'MM/DD/YYYY'): string {
  const dayjsDate = dayjs.isDayjs(date) ? date : parseDateOnly(date as string) || dayjs(date);
  return dayjsDate.format(format);
}

// Utility function to get current date as date only
export function getCurrentDate(): dayjs.Dayjs {
  return dayjs().startOf('day');
}

// Utility function to add time periods to a date
export function addToDate(
  date: string | Date | dayjs.Dayjs,
  amount: number,
  unit: 'day' | 'week' | 'month' | 'year'
): dayjs.Dayjs {
  const dayjsDate = dayjs.isDayjs(date) ? date : parseDateOnly(date as string) || dayjs(date);
  return dayjsDate.add(amount, unit);
}

// Utility function to subtract time periods from a date
export function subtractFromDate(
  date: string | Date | dayjs.Dayjs,
  amount: number,
  unit: 'day' | 'week' | 'month' | 'year'
): dayjs.Dayjs {
  const dayjsDate = dayjs.isDayjs(date) ? date : parseDateOnly(date as string) || dayjs(date);
  return dayjsDate.subtract(amount, unit);
}

// Utility function to check if a date is between two other dates (inclusive)
export function isDateBetween(
  date: string | Date | dayjs.Dayjs,
  start: string | Date | dayjs.Dayjs,
  end: string | Date | dayjs.Dayjs
): boolean {
  const dayjsDate = dayjs.isDayjs(date) ? date : parseDateOnly(date as string) || dayjs(date);
  const startDate = dayjs.isDayjs(start) ? start : parseDateOnly(start as string) || dayjs(start);
  const endDate = dayjs.isDayjs(end) ? end : parseDateOnly(end as string) || dayjs(end);
  return dayjsDate.isBetween(startDate, endDate, 'day', '[]'); // '[]' makes it inclusive
}

// Utility function to get start of period
export function startOfPeriod(date: string | Date | dayjs.Dayjs, unit: 'day' | 'week' | 'month' | 'year'): dayjs.Dayjs {
  const dayjsDate = dayjs.isDayjs(date) ? date : parseDateOnly(date as string) || dayjs(date);
  return dayjsDate.startOf(unit);
}

// Utility function to get end of period
export function endOfPeriod(date: string | Date | dayjs.Dayjs, unit: 'day' | 'week' | 'month' | 'year'): dayjs.Dayjs {
  const dayjsDate = dayjs.isDayjs(date) ? date : parseDateOnly(date as string) || dayjs(date);
  return dayjsDate.endOf(unit);
}

// Utility function to get a date key for consistent comparison
export function getDateKey(input: string | Date | dayjs.Dayjs | null): number {
  const parsed = parseDateOnly(input as string);
  return parsed ? parsed.startOf('day').valueOf() : 0;
}

// Utility function to check if two dates are the same calendar date
export function isSameDate(
  date1: string | Date | dayjs.Dayjs | null,
  date2: string | Date | dayjs.Dayjs | null
): boolean {
  if (!date1 || !date2) return false;

  const parsed1 = parseDateOnly(date1 as string);
  const parsed2 = parseDateOnly(date2 as string);

  return parsed1?.isSame(parsed2, 'day') || false;
}

export default dayjs;
