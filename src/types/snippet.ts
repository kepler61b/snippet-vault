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
  visibility: "PUBLIC" | "UNLISTED" | "PRIVATE";
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
