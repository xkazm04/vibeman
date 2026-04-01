/**
 * Generic map-reduce aggregation helper for signal data.
 *
 * Groups rows by a derived key, initialises each bucket on first encounter,
 * then accumulates every row into its bucket. Used by the heatmap and
 * temporal signal API routes.
 */
export function aggregateByKey<TRow, TBucket>(
  rows: TRow[],
  getKey: (row: TRow) => string,
  init: (row: TRow) => TBucket,
  accumulate: (bucket: TBucket, row: TRow) => void,
): Map<string, TBucket> {
  const map = new Map<string, TBucket>();
  for (const row of rows) {
    const key = getKey(row);
    let bucket = map.get(key);
    if (!bucket) {
      bucket = init(row);
      map.set(key, bucket);
    }
    accumulate(bucket, row);
  }
  return map;
}

/** Accumulate a { count, weight } entry in a by-type record. */
export function accumulateByType(
  byType: Record<string, { count: number; weight: number }>,
  signalType: string,
  count: number,
  weight: number,
): void {
  if (!byType[signalType]) {
    byType[signalType] = { count: 0, weight: 0 };
  }
  byType[signalType].count += count;
  byType[signalType].weight += weight;
}
