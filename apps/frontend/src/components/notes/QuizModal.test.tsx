import { describe, it, expect } from 'vitest';

interface Question {
  question: string;
  options: string[];
  correct: number;
}

function computeScore(questions: Question[], answers: number[]): number {
  return answers.filter((a, i) => a === questions[i]?.correct).length;
}

describe('quiz score', () => {
  const questions: Question[] = [
    { question: 'Q1', options: ['A', 'B', 'C', 'D'], correct: 0 },
    { question: 'Q2', options: ['A', 'B', 'C', 'D'], correct: 2 },
    { question: 'Q3', options: ['A', 'B', 'C', 'D'], correct: 1 },
  ];

  it('vráti 0 ak sú všetky odpovede nesprávne', () => {
    expect(computeScore(questions, [1, 1, 0])).toBe(0);
  });

  it('vráti 3 ak sú všetky odpovede správne', () => {
    expect(computeScore(questions, [0, 2, 1])).toBe(3);
  });

  it('vráti 1 ak je správna iba prvá odpoveď', () => {
    expect(computeScore(questions, [0, 0, 0])).toBe(1);
  });
});
