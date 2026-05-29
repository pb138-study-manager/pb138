import { describe, it, expect } from 'vitest';
import { getWeekStart, getWeekDates, isSameDay, shiftDate } from './timeline-utils';

describe('getWeekStart', () => {
  it('returns Monday for a Thursday', () => {
    const thu = new Date(2026, 4, 28); // Thu May 28 2026
    const result = getWeekStart(thu);
    expect(result.getDay()).toBe(1); // Monday
    expect(result.getDate()).toBe(25); // May 25
  });

  it('returns Monday for a Monday', () => {
    const mon = new Date(2026, 4, 25); // Mon May 25 2026
    expect(getWeekStart(mon).getDate()).toBe(25);
  });

  it('returns the previous Monday for a Sunday', () => {
    const sun = new Date(2026, 4, 31); // Sun May 31 2026
    const result = getWeekStart(sun);
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(25); // Mon May 25
  });
});

describe('getWeekDates', () => {
  it('returns 7 consecutive days starting from Monday', () => {
    const mon = new Date(2026, 4, 25);
    mon.setHours(0, 0, 0, 0);
    const dates = getWeekDates(mon);
    expect(dates).toHaveLength(7);
    expect(dates[0].getDate()).toBe(25); // Mon
    expect(dates[6].getDate()).toBe(31); // Sun
  });
});

describe('isSameDay', () => {
  it('returns true for same calendar day, different times', () => {
    const a = new Date(2026, 4, 29, 9, 0);
    const b = new Date(2026, 4, 29, 23, 59);
    expect(isSameDay(a, b)).toBe(true);
  });

  it('returns false for different days', () => {
    const a = new Date(2026, 4, 29);
    const b = new Date(2026, 4, 30);
    expect(isSameDay(a, b)).toBe(false);
  });
});

describe('shiftDate', () => {
  it('shifts forward 7 days (next week navigation)', () => {
    const thu = new Date(2026, 4, 28); // Thu May 28
    const result = shiftDate(thu, 7);
    expect(result.getDate()).toBe(4);   // Thu June 4
    expect(result.getMonth()).toBe(5);  // June
  });

  it('shifts backward 7 days (prev week navigation)', () => {
    const thu = new Date(2026, 4, 28); // Thu May 28
    const result = shiftDate(thu, -7);
    expect(result.getDate()).toBe(21);  // Thu May 21
  });

  it('does not mutate the original date', () => {
    const original = new Date(2026, 4, 28);
    shiftDate(original, 7);
    expect(original.getDate()).toBe(28);
  });
});