import { query } from '../db';
import { GradingScale } from '../types';

let cachedScales: GradingScale[] | null = null;

export async function getGradingScales(): Promise<GradingScale[]> {
  if (cachedScales) return cachedScales;
  const { rows } = await query<GradingScale>(
    'SELECT * FROM grading_scales ORDER BY min_percentage DESC'
  );
  cachedScales = rows;
  return rows;
}

export async function getGrade(percentage: number): Promise<{ grade: string; points: number; description: string }> {
  const scales = await getGradingScales();
  const scale = scales.find(
    (s) => percentage >= s.min_percentage && percentage <= s.max_percentage
  );
  return scale
    ? { grade: scale.grade, points: parseFloat(String(scale.points)), description: scale.description }
    : { grade: 'E', points: 1, description: 'Fail' };
}

export function calcPosition(scores: number[], score: number): number {
  const sorted = [...scores].sort((a, b) => b - a);
  return sorted.indexOf(score) + 1;
}
