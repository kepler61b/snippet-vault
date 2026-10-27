import prisma from "./db";
import { SmartFilterRule } from "../types/snippet";

/**
 * Returns all descendant collection IDs (including rootId).
 */
export async function getAllDescendantCollectionIds(
  rootId: string,
  userId?: string | null
): Promise<string[]> {
  const allCollections = await prisma.collection.findMany({
    where: userId
      ? { OR: [{ userId }, { userId: null }] }
      : undefined,
    select: { id: true, parentId: true },
  });

  const descendantIds: string[] = [rootId];
  const toProcess: string[] = [rootId];

  while (toProcess.length > 0) {
    const currentId = toProcess.pop()!;
    const directChildren = allCollections.filter((c) => c.parentId === currentId);
    for (const child of directChildren) {
      if (!descendantIds.includes(child.id)) {
        descendantIds.push(child.id);
        toProcess.push(child.id);
      }
    }
  }

  return descendantIds;
}

/**
 * Checks if proposedParentId would cause a circular hierarchy loop.
 */
export async function wouldCauseCycle(
  collectionId: string,
  proposedParentId: string | null
): Promise<boolean> {
  if (!proposedParentId) return false;
  if (collectionId === proposedParentId) return true;

  // If proposedParentId is a descendant of collectionId -> cycle
  const descendants = await getAllDescendantCollectionIds(collectionId);
  return descendants.includes(proposedParentId);
}

/**
 * Builds Prisma where conditions for a smart collection rule.
 */
export function buildSmartCollectionWhere(rule: SmartFilterRule): any {
  const andConditions: any[] = [];

  if (rule.timeRange && rule.timeRange !== "all") {
    const now = new Date();
    if (rule.timeRange === "today") {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      andConditions.push({ createdAt: { gte: startOfDay } });
    } else if (rule.timeRange === "7days") {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      andConditions.push({ createdAt: { gte: sevenDaysAgo } });
    } else if (rule.timeRange === "30days") {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      andConditions.push({ createdAt: { gte: thirtyDaysAgo } });
    }
  }

  if (rule.favoritesOnly) {
    andConditions.push({ isFavorite: true });
  }

  if (rule.untaggedOnly) {
    andConditions.push({
      OR: [{ tags: "" }, { tags: null }],
    });
  } else if (rule.tag && rule.tag.trim()) {
    const cleanTag = rule.tag.trim().toLowerCase().replace(/^#/, "");
    andConditions.push({
      tags: { contains: cleanTag },
    });
  }

  if (rule.language && rule.language.trim()) {
    andConditions.push({
      files: {
        some: {
          language: rule.language.trim().toLowerCase(),
        },
      },
    });
  }

  if (rule.query && rule.query.trim()) {
    const q = rule.query.trim().toLowerCase();
    andConditions.push({
      OR: [
        { title: { contains: q } },
        { description: { contains: q } },
        { tags: { contains: q } },
        {
          files: {
            some: {
              OR: [
                { filename: { contains: q } },
                { content: { contains: q } },
              ],
            },
          },
        },
      ],
    });
  }

  return andConditions;
}

/**
 * Counts snippets matching a smart collection's filter rule.
 */
export async function getSmartCollectionSnippetCount(
  filterRuleJson: string | null,
  userId?: string | null
): Promise<number> {
  if (!filterRuleJson) return 0;

  try {
    const rule: SmartFilterRule = JSON.parse(filterRuleJson);
    const andConditions = buildSmartCollectionWhere(rule);

    if (userId) {
      andConditions.push({
        OR: [{ userId }, { userId: null }],
      });
    }

    return await prisma.snippet.count({
      where: andConditions.length > 0 ? { AND: andConditions } : undefined,
    });
  } catch {
    return 0;
  }
}
