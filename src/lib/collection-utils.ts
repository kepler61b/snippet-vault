/**
 * Client-safe pure collection utilities (no Prisma or DB dependencies).
 */

export interface CollectionPathItem {
  id: string;
  name: string;
  parentId?: string | null;
}

/**
 * Computes full breadcrumb path for a collection (e.g. "Work / Projects / SnippetVault").
 */
export function getCollectionBreadcrumbPath(
  collectionId: string,
  collectionsById: Map<string, CollectionPathItem>
): string {
  const parts: string[] = [];
  let curr: CollectionPathItem | undefined = collectionsById.get(collectionId);
  const visited = new Set<string>();

  while (curr && !visited.has(curr.id)) {
    visited.add(curr.id);
    parts.unshift(curr.name.trim());
    if (curr.parentId) {
      curr = collectionsById.get(curr.parentId);
    } else {
      break;
    }
  }

  return parts.join(" / ");
}
