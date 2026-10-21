export interface SnippetFileItem {
  id?: string;
  snippetId?: string;
  filename: string;
  language: string;
  content: string;
  order?: number;
}

export interface CollectionItem {
  id: string;
  name: string;
  description: string | null;
  iconType: string;
  iconValue: string;
  color: string | null;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    snippets: number;
  };
}

export interface SnippetItem {
  id: string;
  title: string;
  description: string | null;
  visibility?: string;
  shareToken: string;
  isFavorite: boolean;
  tags: string;
  userId?: string | null;
  collectionId?: string | null;
  collection?: CollectionItem | null;
  createdAt: string;
  updatedAt: string;
  files: SnippetFileItem[];
}

export type ViewMode = "grid" | "list";

export type SortOption =
  | "CREATED_DESC"
  | "CREATED_ASC"
  | "UPDATED_DESC"
  | "TITLE_ASC"
  | "TITLE_DESC"
  | "FILES_DESC";

export const SORT_OPTIONS: { id: SortOption; label: string }[] = [
  { id: "CREATED_DESC", label: "Сначала новые" },
  { id: "CREATED_ASC", label: "Сначала старые" },
  { id: "UPDATED_DESC", label: "Недавно обновленные" },
  { id: "TITLE_ASC", label: "По названию (А → Я)" },
  { id: "TITLE_DESC", label: "По названию (Я → А)" },
  { id: "FILES_DESC", label: "По числу файлов" },
];
