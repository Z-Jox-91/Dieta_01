/**
 * Distribuisce `total` (un intero, es. kcal) tra le parti secondo i pesi forniti,
 * garantendo che la somma dei risultati sia esattamente `total` (metodo del resto più grande),
 * evitando gli scarti che nascerebbero arrotondando ogni parte per conto suo.
 */
export const distributeExact = (total: number, weights: number[]): number[] => {
  const n = weights.length;
  if (n === 0) return [];

  const weightSum = weights.reduce((a, b) => a + b, 0);
  if (weightSum <= 0) return weights.map(() => 0);

  const roundedTotal = Math.round(total);
  const raw = weights.map(w => (roundedTotal * w) / weightSum);
  const floors = raw.map(Math.floor);
  const flooredSum = floors.reduce((a, b) => a + b, 0);
  const remainder = Math.round(roundedTotal - flooredSum);

  const order = raw
    .map((r, i) => ({ i, frac: r - floors[i] }))
    .sort((a, b) => b.frac - a.frac);

  const result = [...floors];
  for (let k = 0; k < remainder && k < n; k++) {
    result[order[k].i] += 1;
  }
  return result;
};
