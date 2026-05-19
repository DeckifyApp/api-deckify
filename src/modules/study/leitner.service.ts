import { ReviewResult } from '@prisma/client';
import { addDays } from '../../shared/utils/dates';

export const LEITNER_MAX_BOX = 5;

export function nextBox(previousBox: number, result: ReviewResult): number {
  if (result === ReviewResult.AGAIN) {
    return 1;
  }

  return Math.min(LEITNER_MAX_BOX, previousBox + 1);
}

export function dueDateForBox(box: number): Date {
  const now = new Date();

  if (box <= 1) return now;
  if (box === 2) return addDays(now, 1);
  if (box === 3) return addDays(now, 3);
  if (box === 4) return addDays(now, 7);

  return addDays(now, 14);
}
