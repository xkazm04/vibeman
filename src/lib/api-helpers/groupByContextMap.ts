/**
 * Generic list response shape shared by Questions and Directions APIs.
 *
 * Both endpoints return: a flat items array, a grouped array keyed by context
 * map, and a counts record. This type captures that structure once.
 */
export interface GenericGroupEntry<T> {
  contextMapId: string;
  contextMapTitle: string;
  items: T[];
}

export interface GenericListResponse<T> {
  success: boolean;
  items: T[];
  grouped: GenericGroupEntry<T>[];
  counts: Record<string, number>;
}

/**
 * Groups an array of DB rows by their context_map_id field.
 *
 * @param rows  - flat array of records that have context_map_id / context_map_title
 * @param getId - accessor for context_map_id
 * @param getTitle - accessor for context_map_title
 * @returns array of { contextMapId, contextMapTitle, items }
 */
export function groupByContextMap<T extends { context_map_id: string; context_map_title: string }>(
  rows: T[]
): GenericGroupEntry<T>[] {
  const map: Record<string, GenericGroupEntry<T>> = {};

  for (const row of rows) {
    if (!map[row.context_map_id]) {
      map[row.context_map_id] = {
        contextMapId: row.context_map_id,
        contextMapTitle: row.context_map_title,
        items: [],
      };
    }
    map[row.context_map_id].items.push(row);
  }

  return Object.values(map);
}
