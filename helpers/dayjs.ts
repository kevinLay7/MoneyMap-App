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

/**
 * Central function to handle UTC date strings consistently.
 * This is the single source of truth for parsing UTC date strings like '2025-08-15T00:00:00.0000Z'.
 * Parses UTC date strings and converts them to local dates at 00:00:00 to avoid timezone issues.
 *
 * @param {string} dateString - The UTC date string to parse (e.g., '2025-08-15T00:00:00.0000Z')
 * @returns {dayjs.Dayjs} A dayjs object representing the date in local timezone at start of day
 * @example
 * parseUTCDateString('2025-08-15T00:00:00.0000Z') // Returns dayjs object for 2025-08-15
 */
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
    return dayjs(dateOnly, 'YYYY-MM-DD');
  }
}

/**
 * Utility function to parse date strings as dates only.
 * This ensures dates are treated as local calendar dates without timezone conversion.
 * For UTC date strings (ending in Z), we parse in UTC then extract the date.
 *
 * @param {string | Date | null} dateString - The date string, Date object, or null to parse
 * @returns {dayjs.Dayjs | null} A dayjs object representing the date, or null if input is null/empty
 * @example
 * parseDateOnly('2025-08-15') // Returns dayjs object for 2025-08-15
 * parseDateOnly(new Date()) // Returns dayjs object for today
 * parseDateOnly(null) // Returns null
 */
export function parseDateOnly(dateString: string | Date | null): dayjs.Dayjs | null {
  if (!dateString) return null;

  if (typeof dateString === 'string') {
    return parseUTCDateString(dateString);
  }

  // If it's already a Date object, format it as YYYY-MM-DD first
  const dateStr = dayjs(dateString).format('YYYY-MM-DD');
  return dayjs(dateStr, 'YYYY-MM-DD');
}

/**
 * Utility function to format date for display.
 *
 * @param {string | Date | dayjs.Dayjs} date - The date to format
 * @param {string} [format='MM/DD/YYYY'] - The format string (default: 'MM/DD/YYYY')
 * @returns {string} The formatted date string
 * @example
 * formatDate('2025-08-15') // Returns '08/15/2025'
 * formatDate(new Date(), 'YYYY-MM-DD') // Returns current date in YYYY-MM-DD format
 */
export function formatDate(date: string | Date | dayjs.Dayjs, format: string = 'MM/DD/YYYY'): string {
  const dayjsDate = dayjs.isDayjs(date) ? date : parseDateOnly(date as string) || dayjs(date);
  return dayjsDate.format(format);
}

/**
 * Utility function to get current date as date only (start of day).
 *
 * @returns {dayjs.Dayjs} A dayjs object representing today at 00:00:00
 * @example
 * getCurrentDate() // Returns dayjs object for today at start of day
 */
export function getCurrentDate(): dayjs.Dayjs {
  return dayjs().startOf('day');
}

/**
 * Utility function to add time periods to a date.
 *
 * @param {string | Date | dayjs.Dayjs} date - The base date
 * @param {number} amount - The amount to add (can be negative)
 * @param {'day' | 'week' | 'month' | 'year'} unit - The unit of time to add
 * @returns {dayjs.Dayjs} A new dayjs object with the time period added
 * @example
 * addToDate('2025-08-15', 7, 'day') // Returns dayjs object for 2025-08-22
 * addToDate('2025-08-15', 1, 'month') // Returns dayjs object for 2025-09-15
 */
export function addToDate(
  date: string | Date | dayjs.Dayjs,
  amount: number,
  unit: 'day' | 'week' | 'month' | 'year'
): dayjs.Dayjs {
  const dayjsDate = dayjs.isDayjs(date) ? date : parseDateOnly(date as string) || dayjs(date);
  return dayjsDate.add(amount, unit);
}

/**
 * Utility function to subtract time periods from a date.
 *
 * @param {string | Date | dayjs.Dayjs} date - The base date
 * @param {number} amount - The amount to subtract (can be negative to add)
 * @param {'day' | 'week' | 'month' | 'year'} unit - The unit of time to subtract
 * @returns {dayjs.Dayjs} A new dayjs object with the time period subtracted
 * @example
 * subtractFromDate('2025-08-15', 7, 'day') // Returns dayjs object for 2025-08-08
 * subtractFromDate('2025-08-15', 1, 'month') // Returns dayjs object for 2025-07-15
 */
export function subtractFromDate(
  date: string | Date | dayjs.Dayjs,
  amount: number,
  unit: 'day' | 'week' | 'month' | 'year'
): dayjs.Dayjs {
  const dayjsDate = dayjs.isDayjs(date) ? date : parseDateOnly(date as string) || dayjs(date);
  return dayjsDate.subtract(amount, unit);
}

/**
 * Utility function to check if a date is between two other dates (inclusive).
 *
 * @param {string | Date | dayjs.Dayjs} date - The date to check
 * @param {string | Date | dayjs.Dayjs} start - The start date (inclusive)
 * @param {string | Date | dayjs.Dayjs} end - The end date (inclusive)
 * @returns {boolean} True if the date is between start and end (inclusive), false otherwise
 * @example
 * isDateBetween('2025-08-15', '2025-08-01', '2025-08-31') // Returns true
 * isDateBetween('2025-09-01', '2025-08-01', '2025-08-31') // Returns false
 */
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

/**
 * Utility function to get start of period.
 *
 * @param {string | Date | dayjs.Dayjs} date - The date to get the start of period for
 * @param {'day' | 'week' | 'month' | 'year'} unit - The period unit
 * @returns {dayjs.Dayjs} A dayjs object representing the start of the specified period
 * @example
 * startOfPeriod('2025-08-15', 'month') // Returns dayjs object for 2025-08-01
 * startOfPeriod('2025-08-15', 'year') // Returns dayjs object for 2025-01-01
 */
export function startOfPeriod(date: string | Date | dayjs.Dayjs, unit: 'day' | 'week' | 'month' | 'year'): dayjs.Dayjs {
  const dayjsDate = dayjs.isDayjs(date) ? date : parseDateOnly(date as string) || dayjs(date);
  return dayjsDate.startOf(unit);
}

/**
 * Utility function to get end of period.
 *
 * @param {string | Date | dayjs.Dayjs} date - The date to get the end of period for
 * @param {'day' | 'week' | 'month' | 'year'} unit - The period unit
 * @returns {dayjs.Dayjs} A dayjs object representing the end of the specified period
 * @example
 * endOfPeriod('2025-08-15', 'month') // Returns dayjs object for 2025-08-31
 * endOfPeriod('2025-08-15', 'year') // Returns dayjs object for 2025-12-31
 */
export function endOfPeriod(date: string | Date | dayjs.Dayjs, unit: 'day' | 'week' | 'month' | 'year'): dayjs.Dayjs {
  const dayjsDate = dayjs.isDayjs(date) ? date : parseDateOnly(date as string) || dayjs(date);
  return dayjsDate.endOf(unit);
}

/**
 * Utility function to get a date key for consistent comparison.
 * Returns a numeric timestamp value for the start of the day, useful for sorting and comparison.
 *
 * @param {string | Date | dayjs.Dayjs | null} input - The date input (can be null)
 * @returns {number} A numeric timestamp value for the start of the day, or 0 if input is null
 * @example
 * getDateKey('2025-08-15') // Returns timestamp for 2025-08-15 00:00:00
 * getDateKey(null) // Returns 0
 */
export function getDateKey(input: string | Date | dayjs.Dayjs | null): number {
  const parsed = parseDateOnly(input as string);
  return parsed ? parsed.startOf('day').valueOf() : 0;
}

/**
 * Utility function to check if two dates are the same calendar date.
 *
 * @param {string | Date | dayjs.Dayjs | null} date1 - The first date to compare
 * @param {string | Date | dayjs.Dayjs | null} date2 - The second date to compare
 * @returns {boolean} True if both dates represent the same calendar day, false otherwise (or if either is null)
 * @example
 * isSameDate('2025-08-15', '2025-08-15') // Returns true
 * isSameDate('2025-08-15', '2025-08-16') // Returns false
 * isSameDate('2025-08-15', null) // Returns false
 */
export function isSameDate(
  date1: string | Date | dayjs.Dayjs | null,
  date2: string | Date | dayjs.Dayjs | null
): boolean {
  if (!date1 || !date2) return false;

  const parsed1 = parseDateOnly(date1 as string);
  const parsed2 = parseDateOnly(date2 as string);

  return parsed1?.isSame(parsed2, 'day') || false;
}

/**
 * Utility function to get month range (start and end dates).
 * Returns an object with start and end dayjs objects for a month.
 *
 * @param {string | Date | dayjs.Dayjs} date - The base date
 * @param {number} [offset=0] - Number of months to offset from the given date (0 = current month, -1 = previous month, etc.)
 * @returns {{ start: dayjs.Dayjs; end: dayjs.Dayjs }} An object with start and end dayjs objects for the month
 * @example
 * getMonthRange('2025-08-15') // Returns { start: 2025-08-01, end: 2025-08-31 }
 * getMonthRange('2025-08-15', -1) // Returns { start: 2025-07-01, end: 2025-07-31 }
 */
export function getMonthRange(
  date: string | Date | dayjs.Dayjs,
  offset: number = 0
): { start: dayjs.Dayjs; end: dayjs.Dayjs } {
  const dayjsDate = dayjs.isDayjs(date) ? date : parseDateOnly(date as string) || dayjs(date);
  const targetMonth = offset === 0 ? dayjsDate : dayjsDate.add(offset, 'month');
  return {
    start: targetMonth.startOf('month'),
    end: targetMonth.endOf('month'),
  };
}

/**
 * Utility function to get month information.
 * Returns an object with month (0-11), daysInMonth, and year for a month.
 *
 * @param {string | Date | dayjs.Dayjs} date - The base date
 * @param {number} [offset=0] - Number of months to offset from the given date (0 = current month, -1 = previous month, etc.)
 * @returns {{ month: number; daysInMonth: number; year: number }} An object with month (0-11), daysInMonth, and year
 * @example
 * getMonthInfo('2025-08-15') // Returns { month: 7, daysInMonth: 31, year: 2025 }
 * getMonthInfo('2025-08-15', -1) // Returns { month: 6, daysInMonth: 31, year: 2025 }
 */
export function getMonthInfo(
  date: string | Date | dayjs.Dayjs,
  offset: number = 0
): { month: number; daysInMonth: number; year: number } {
  const dayjsDate = dayjs.isDayjs(date) ? date : parseDateOnly(date as string) || dayjs(date);
  const targetMonth = offset === 0 ? dayjsDate : dayjsDate.add(offset, 'month');
  return {
    month: targetMonth.month(),
    daysInMonth: targetMonth.daysInMonth(),
    year: targetMonth.year(),
  };
}

/**
 * Utility function to format a date as 'YYYY-MM-DD' string.
 * This is a convenience function for consistently formatting dates in ISO date format.
 *
 * @param {string | Date | dayjs.Dayjs} date - The date to format
 * @returns {string} The formatted date string in 'YYYY-MM-DD' format
 * @example
 * formatDateOnly('2025-08-15T10:30:00Z') // Returns '2025-08-15'
 * formatDateOnly(new Date()) // Returns current date in 'YYYY-MM-DD' format
 */
export function formatDateOnly(date: string | Date | dayjs.Dayjs): string {
  const dayjsDate = dayjs.isDayjs(date) ? date : parseDateOnly(date as string) || dayjs(date);
  return dayjsDate.format('YYYY-MM-DD');
}

export default dayjs;
