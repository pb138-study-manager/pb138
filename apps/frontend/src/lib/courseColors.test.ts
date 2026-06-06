import { describe, it, expect } from 'vitest';
import { getCourseColor } from './courseColors';

describe('getCourseColor', () => {
  it('vráti vždy rovnakú farbu pre rovnaké ID', () => {
    expect(getCourseColor(1)).toStrictEqual(getCourseColor(1));
    expect(getCourseColor(5)).toStrictEqual(getCourseColor(5));
  });

  it('vráti objekt s bg, text, border, accent triedami', () => {
    const color = getCourseColor(1);
    expect(color).toHaveProperty('bg');
    expect(color).toHaveProperty('text');
    expect(color).toHaveProperty('border');
    expect(color).toHaveProperty('accent');
    expect(color.bg).toMatch(/^bg-/);
    expect(color.accent).toMatch(/^bg-/);
  });

  it('7 po sebe idúcich ID má aspoň 2 rôzne farby', () => {
    const bgs = [1, 2, 3, 4, 5, 6, 7].map((id) => getCourseColor(id).bg);
    expect(new Set(bgs).size).toBeGreaterThan(1);
  });

  it('paleta je cyklická — ID 0 a ID 7 majú rovnakú farbu', () => {
    expect(getCourseColor(0)).toStrictEqual(getCourseColor(7));
  });
});
