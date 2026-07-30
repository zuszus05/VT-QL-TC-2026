export function upsertById<T>(
  items: T[],
  item: T,
  getId: (item: T) => string
): T[] {
  const targetId = getId(item);
  const index = items.findIndex((i) => getId(i) === targetId);
  if (index >= 0) {
    const next = [...items];
    next[index] = item;
    return next;
  }
  return [...items, item];
}

export function upsertManyById<T>(
  items: T[],
  newItems: T[],
  getId: (item: T) => string
): T[] {
  if (!newItems || newItems.length === 0) return items;
  const itemMap = new Map<string, T>();
  for (const item of items) {
    itemMap.set(getId(item), item);
  }
  for (const newItem of newItems) {
    itemMap.set(getId(newItem), newItem);
  }
  return Array.from(itemMap.values());
}

export function removeById<T>(
  items: T[],
  id: string,
  getId: (item: T) => string
): T[] {
  return items.filter((item) => getId(item) !== id);
}
