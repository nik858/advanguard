/**
 * Index-keyed metadata (hiddenFields, imageSizes) points into repeatable lists
 * by position: "<sectionId>:testimonials.items.3.name". Positions move whenever
 * an item is added, removed or dragged, so the keys have to move with them —
 * otherwise a hidden "…items.3.name" silently re-applies to whatever slid into
 * slot 3, which is how deleting one card blanks out another.
 */

/**
 * Rewrites `key` for a list whose items moved.
 *
 * `indexMap[oldIndex]` is the item's new index, `-1` if it was removed, and
 * `undefined` when the index is out of range — which drops the key and thereby
 * self-heals leftovers from older builds that never remapped at all.
 *
 * Keys that don't address this list are returned unchanged; `null` means drop.
 */
export function remapIndexedKey(key: string, prefix: string, indexMap: number[]): string | null {
  if (!key.startsWith(`${prefix}.`)) return key;
  const m = key.slice(prefix.length + 1).match(/^(\d+)(\..*)?$/);
  if (!m) return key;
  const to = indexMap[Number(m[1])];
  if (to === undefined || to < 0) return null;
  return `${prefix}.${to}${m[2] ?? ""}`;
}

/** `remapIndexedKey` over a list of keys, dropping the ones that die. */
export function remapIndexedKeys(keys: string[], prefix: string, indexMap: number[]): string[] {
  return keys
    .map((k) => remapIndexedKey(k, prefix, indexMap))
    .filter((k): k is string => k !== null);
}

/** `remapIndexedKey` over the keys of a record, dropping the ones that die. */
export function remapIndexedRecord<T>(
  record: Record<string, T>,
  prefix: string,
  indexMap: number[],
): Record<string, T> {
  const out: Record<string, T> = {};
  for (const [k, v] of Object.entries(record)) {
    const nk = remapIndexedKey(k, prefix, indexMap);
    if (nk !== null) out[nk] = v;
  }
  return out;
}

/** Identity map for a list of `length` items — the base of every remap. */
export function identityIndexMap(length: number): number[] {
  return Array.from({ length }, (_, i) => i);
}

/** Old→new indices after dropping item `i`. */
export function removalIndexMap(length: number, i: number): number[] {
  return identityIndexMap(length).map((idx) => (idx === i ? -1 : idx > i ? idx - 1 : idx));
}

/** Old→new indices after moving item `from` to position `to`. */
export function moveIndexMap(length: number, from: number, to: number): number[] {
  const order = identityIndexMap(length);
  const [moved] = order.splice(from, 1);
  order.splice(to, 0, moved);
  const indexMap = identityIndexMap(length);
  order.forEach((oldIdx, newIdx) => { indexMap[oldIdx] = newIdx; });
  return indexMap;
}
