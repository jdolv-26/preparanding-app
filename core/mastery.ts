// E4/D5: mastery = 0.7 × ejecutables + 0.3 × tarjetas. Si solo hay un componente,
// se usa ese y la confianza es baja. Sin datos: 0 y "sin datos aún".
export interface Mastery { value: number; confidence: 'none' | 'low' | 'normal' }

export function mastery(executables: number | null, cards: number | null): Mastery {
  if (executables == null && cards == null) return { value: 0, confidence: 'none' };
  if (executables == null) return { value: cards!, confidence: 'low' };
  if (cards == null) return { value: executables, confidence: 'low' };
  return { value: 0.7 * executables + 0.3 * cards, confidence: 'normal' };
}
