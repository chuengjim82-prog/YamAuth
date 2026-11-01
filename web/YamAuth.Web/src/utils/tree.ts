/**
 * Convert a flat list (each item has `id` + `parentId`) into a tree
 * where each node has a `children` array.
 *
 * Root nodes are items whose `parentId` is 0, null, undefined, or
 * points to an id not present in the list.
 */
export function buildTree<T extends { id: number; parentId: number }>(
  flat: T[]
): T[] {
  const map = new Map<number, T & { children: T[] }>();
  flat.forEach(item =>
    map.set(item.id, { ...item, children: [] } as T & { children: T[] })
  );
  const roots: T[] = [];
  map.forEach(node => {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

/**
 * Recursively find a node in a tree by its `id` value.
 * Returns the node (with `children` intact) or `undefined`.
 */
export function findInTree<T extends { id: number; children?: T[] }>(
  tree: T[],
  id: number
): T | undefined {
  for (const node of tree) {
    if (node.id === id) return node;
    if (node.children?.length) {
      const found = findInTree(node.children, id);
      if (found) return found;
    }
  }
  return undefined;
}
