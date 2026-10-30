// Helpers for deletes that can be undone: remember where each removed item was,
// so it can be put back in exactly the same place.

// An item that was removed, and where it was in its array.
export type RemovedItem<T> = { item: T; index: number };

// Puts removed items back at their old positions. Returns a new array.
// Inserting from the lowest old position upward rebuilds the original order exactly,
// as long as nothing else changed in between.
export function reinsert<T>(items: T[], removed: RemovedItem<T>[]): T[] {
  const result = [...items];
  const byPosition = [...removed].sort((a, b) => a.index - b.index);
  for (const { item, index } of byPosition) {
    result.splice(Math.min(index, result.length), 0, item);
  }
  return result;
}
