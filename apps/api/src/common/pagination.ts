/** page/pageSize 정규화. pageSize 상한 100. */
export function normalizePage(page?: number, pageSize?: number, max = 100) {
  const p = Math.max(1, Number(page) || 1);
  const size = Math.min(max, Math.max(1, Number(pageSize) || 20));
  return { page: p, pageSize: size, skip: (p - 1) * size, take: size };
}
