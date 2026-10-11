import { describe, it, expect } from 'vitest';

describe('Web Application Core Unit Tests', () => {
  it('Validates duration formatting math', () => {
    const formatDuration = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      if (mins >= 60) {
        const hours = Math.floor(mins / 60);
        const remMins = mins % 60;
        return `${hours}h ${remMins}m`;
      }
      return `${mins}m ${secs}s`;
    };

    expect(formatDuration(0)).toBe('0m 0s');
    expect(formatDuration(45)).toBe('0m 45s');
    expect(formatDuration(185)).toBe('3m 5s');
    expect(formatDuration(3665)).toBe('1h 1m');
  });

  it('Validates phone number masking rules', () => {
    const maskPhoneNumber = (raw: string) => {
      if (raw.length < 7) return raw;
      return raw.slice(0, 3) + '****' + raw.slice(-4);
    };

    expect(maskPhoneNumber('+919822011223')).toBe('+91****1223');
    expect(maskPhoneNumber('12345')).toBe('12345');
  });

  it('Verifies answer rate calculation', () => {
    const calculateAnswerRate = (total: number, answered: number) => {
      if (total === 0) return 0;
      return Math.round((answered / total) * 100);
    };

    expect(calculateAnswerRate(10, 8)).toBe(80);
    expect(calculateAnswerRate(0, 0)).toBe(0);
    expect(calculateAnswerRate(3, 1)).toBe(33);
  });
});
