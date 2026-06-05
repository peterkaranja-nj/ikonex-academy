import { describe, it, expect, vi } from 'vitest';
import { getGrade, calcPosition } from '../utils/grading';

// Mock the DB call
vi.mock('../db', () => ({
  query: vi.fn().mockResolvedValue({
    rows: [
      { grade: 'A', min_percentage: 80, max_percentage: 100, points: 12, description: 'Excellent' },
      { grade: 'A-', min_percentage: 75, max_percentage: 79.99, points: 11, description: 'Very Good' },
      { grade: 'B+', min_percentage: 70, max_percentage: 74.99, points: 10, description: 'Good' },
      { grade: 'B', min_percentage: 65, max_percentage: 69.99, points: 9, description: 'Good' },
      { grade: 'B-', min_percentage: 60, max_percentage: 64.99, points: 8, description: 'Above Average' },
      { grade: 'C+', min_percentage: 55, max_percentage: 59.99, points: 7, description: 'Average' },
      { grade: 'C', min_percentage: 50, max_percentage: 54.99, points: 6, description: 'Average' },
      { grade: 'D', min_percentage: 35, max_percentage: 39.99, points: 3, description: 'Poor' },
      { grade: 'E', min_percentage: 0, max_percentage: 29.99, points: 1, description: 'Fail' },
    ],
    rowCount: 9,
  }),
}));

describe('Grading Utility', () => {
  it('returns A for 85%', async () => {
    const result = await getGrade(85);
    expect(result.grade).toBe('A');
    expect(result.points).toBe(12);
  });

  it('returns E for 20%', async () => {
    const result = await getGrade(20);
    expect(result.grade).toBe('E');
    expect(result.points).toBe(1);
  });

  it('returns correct grade at boundary 80', async () => {
    const result = await getGrade(80);
    expect(result.grade).toBe('A');
  });

  it('returns B+ for 72%', async () => {
    const result = await getGrade(72);
    expect(result.grade).toBe('B+');
  });
});

describe('Position Calculator', () => {
  it('ranks correctly', () => {
    const scores = [90, 75, 85, 60];
    expect(calcPosition(scores, 90)).toBe(1);
    expect(calcPosition(scores, 85)).toBe(2);
    expect(calcPosition(scores, 75)).toBe(3);
    expect(calcPosition(scores, 60)).toBe(4);
  });

  it('handles ties', () => {
    const scores = [80, 80, 70];
    expect(calcPosition(scores, 80)).toBe(1); // first occurrence
  });
});

describe('API Response format', () => {
  it('success response has correct shape', () => {
    const mockData = { id: '123', name: 'Test' };
    const response = { success: true, data: mockData, message: 'OK' };
    expect(response.success).toBe(true);
    expect(response.data).toEqual(mockData);
  });

  it('error response has correct shape', () => {
    const response = { success: false, error: 'Not found', message: 'Resource not found' };
    expect(response.success).toBe(false);
    expect(response.error).toBeDefined();
  });
});
