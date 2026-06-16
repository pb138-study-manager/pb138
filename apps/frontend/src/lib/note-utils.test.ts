import { describe, it, expect } from 'vitest';
import { getReadingStats } from './note-utils';

describe('getReadingStats', () => {
  it('returns 0 words and 1 minute for empty string', () => {
    const result = getReadingStats('');
    expect(result.words).toBe(0);
    expect(result.minutes).toBe(1);
  });

  it('returns 0 words for whitespace-only string', () => {
    const result = getReadingStats('   \n\t  ');
    expect(result.words).toBe(0);
    expect(result.minutes).toBe(1);
  });

  it('counts a single word correctly', () => {
    expect(getReadingStats('hello').words).toBe(1);
  });

  it('counts multiple words separated by spaces', () => {
    expect(getReadingStats('one two three').words).toBe(3);
  });

  it('counts words separated by multiple whitespace characters', () => {
    expect(getReadingStats('one  two\tthree\nfour').words).toBe(4);
  });

  it('returns 1 minute minimum even for very short texts', () => {
    expect(getReadingStats('short').minutes).toBe(1);
    expect(getReadingStats('ten words here and some more ok good nice').minutes).toBe(1);
  });

  it('calculates reading time at 200 words per minute', () => {
    const twoHundredWords = Array(200).fill('word').join(' ');
    expect(getReadingStats(twoHundredWords).minutes).toBe(1);

    const fourHundredWords = Array(400).fill('word').join(' ');
    expect(getReadingStats(fourHundredWords).minutes).toBe(2);

    const sixHundredWords = Array(600).fill('word').join(' ');
    expect(getReadingStats(sixHundredWords).minutes).toBe(3);
  });

  it('rounds to nearest minute', () => {
    const threeHundredWords = Array(300).fill('word').join(' ');
    expect(getReadingStats(threeHundredWords).minutes).toBe(2);

    const twoHundredFiftyWords = Array(250).fill('word').join(' ');
    expect(getReadingStats(twoHundredFiftyWords).minutes).toBe(1);
  });

  it('handles text with leading and trailing whitespace', () => {
    const result = getReadingStats('  hello world  ');
    expect(result.words).toBe(2);
  });
});
