import { expect, test } from 'vitest';
import { mastery } from './mastery.ts';

test('mastery según los componentes con datos', () => {
  expect(mastery(null, null)).toEqual({ value: 0, confidence: 'none' });
  expect(mastery(null, 1)).toEqual({ value: 1, confidence: 'low' });
  expect(mastery(0.5, null)).toEqual({ value: 0.5, confidence: 'low' });
  expect(mastery(1, 0).value).toBeCloseTo(0.7);
});
